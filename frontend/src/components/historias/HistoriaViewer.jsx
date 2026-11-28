import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../api/client";
import useVideoUrl from "../../hooks/useVideoUrl";
import { timeAgo } from "../../utils/format";
import { SEGUNDOS_HISTORIA_FOTO, fondoCss } from "../../utils/historias";
import { UserAvatar } from "../Avatar";
import Icon from "../Icon";
import Photo from "../Photo";

/**
 * Visor de historias a pantalla completa, como en Instagram:
 * barras de avance arriba, toca a la derecha o izquierda para avanzar o regresar,
 * mantén presionado para pausar. Al terminar las de una persona pasa a la siguiente.
 *
 * grupos: [{ autor, historias: [...] }]   inicio: índice de la persona con la que abre
 */
export default function HistoriaViewer({ grupos, inicio = 0, onCerrar, onVista, onBorrada }) {
  const [grupoIdx, setGrupoIdx] = useState(inicio);
  const [historiaIdx, setHistoriaIdx] = useState(() => primeraSinVer(grupos[inicio]));
  const [progreso, setProgreso] = useState(0);
  const [presionado, setPresionado] = useState(false);
  const [panel, setPanel] = useState(null); // null | "vistas" | "borrar"
  const [silencio, setSilencio] = useState(false);
  const [vistas, setVistas] = useState(null);
  const [error, setError] = useState("");
  const videoRef = useRef(null);
  const presionTimer = useRef(null);
  const fuePresion = useRef(false);

  const grupo = grupos[grupoIdx];
  const historia = grupo?.historias[historiaIdx];
  const pausado = presionado || panel !== null;

  const siguiente = useCallback(() => {
    setProgreso(0);
    setPanel(null);
    if (!grupo) return;
    if (historiaIdx < grupo.historias.length - 1) {
      setHistoriaIdx((i) => i + 1);
    } else if (grupoIdx < grupos.length - 1) {
      setGrupoIdx(grupoIdx + 1);
      setHistoriaIdx(primeraSinVer(grupos[grupoIdx + 1]));
    } else {
      onCerrar();
    }
  }, [grupo, grupoIdx, historiaIdx, grupos, onCerrar]);

  const anterior = useCallback(() => {
    setProgreso(0);
    setPanel(null);
    if (historiaIdx > 0) {
      setHistoriaIdx((i) => i - 1);
    } else if (grupoIdx > 0) {
      setGrupoIdx(grupoIdx - 1);
      setHistoriaIdx(grupos[grupoIdx - 1].historias.length - 1);
    } else if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  }, [grupoIdx, historiaIdx, grupos]);

  // Si la lista cambió (p. ej. se borró una historia) y el índice ya no existe, se cierra.
  useEffect(() => {
    if (!historia) onCerrar();
  }, [historia, onCerrar]);

  // Marcar como vista al mostrarla.
  useEffect(() => {
    if (!historia || historia.esMia || historia.vista) return;
    apiRequest(`/historias/${historia.id}/vista`, { method: "POST" })
      .then(() => onVista?.(historia.id))
      .catch(() => {});
  }, [historia, onVista]);

  // Fotos y textos: avanzan con el reloj.
  useEffect(() => {
    if (!historia || historia.tipo === "video" || pausado) return undefined;
    const total = SEGUNDOS_HISTORIA_FOTO * 1000;
    let anteriorTiempo = performance.now();
    let cuadro;
    const avanzar = (ahora) => {
      const delta = ahora - anteriorTiempo;
      anteriorTiempo = ahora;
      let terminado = false;
      setProgreso((p) => {
        const nuevo = Math.min(1, p + delta / total);
        if (nuevo >= 1) terminado = true;
        return nuevo;
      });
      if (terminado) siguiente();
      else cuadro = requestAnimationFrame(avanzar);
    };
    cuadro = requestAnimationFrame(avanzar);
    return () => cancelAnimationFrame(cuadro);
  }, [historia, pausado, siguiente]);

  // Teclado: flechas y Escape.
  useEffect(() => {
    function alPresionar(event) {
      if (event.key === "Escape") {
        if (panel) setPanel(null);
        else onCerrar();
      } else if (event.key === "ArrowRight") siguiente();
      else if (event.key === "ArrowLeft") anterior();
    }
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [siguiente, anterior, onCerrar, panel]);

  // Sin scroll de la página mientras está abierto.
  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previo;
    };
  }, []);

  function alBajar() {
    fuePresion.current = false;
    presionTimer.current = setTimeout(() => {
      fuePresion.current = true;
      setPresionado(true);
    }, 220);
  }

  function alSoltar(event) {
    clearTimeout(presionTimer.current);
    setPresionado(false);
    if (fuePresion.current || panel) return;
    const caja = event.currentTarget.getBoundingClientRect();
    if (event.clientX - caja.left < caja.width * 0.33) anterior();
    else siguiente();
  }

  async function abrirVistas() {
    setPanel("vistas");
    setVistas(null);
    try {
      const datos = await apiRequest(`/historias/${historia.id}/vistas`);
      setVistas(datos.vistas);
    } catch (err) {
      setError(err.message);
      setVistas([]);
    }
  }

  async function borrar() {
    try {
      await apiRequest(`/historias/${historia.id}`, { method: "DELETE" });
      setPanel(null);
      onBorrada?.(historia.id);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!historia) return null;

  return (
    <div className="historia-viewer" role="dialog" aria-modal="true" aria-label={`Historias de ${grupo.autor.nombre || grupo.autor.username}`}>
      <div className="historia-viewer-marco">
        <div className="historia-barras" aria-hidden="true">
          {grupo.historias.map((h, i) => (
            <span key={h.id} className="historia-barra">
              <span style={{ transform: `scaleX(${i < historiaIdx ? 1 : i === historiaIdx ? progreso : 0})` }} />
            </span>
          ))}
        </div>

        <header className="historia-viewer-head">
          <Link to={`/perfil/${encodeURIComponent(grupo.autor.username)}`} className="historia-viewer-autor" onClick={onCerrar}>
            <UserAvatar user={grupo.autor} size={34} fontSize={12} />
            <span>
              <strong>{grupo.autor.nombre || grupo.autor.username}</strong>
              <small>{timeAgo(historia.fecha)}</small>
            </span>
          </Link>
          <div className="historia-viewer-acciones">
            {historia.tipo === "video" && (
              <button type="button" className="historia-btn" onClick={() => setSilencio((s) => !s)} aria-label={silencio ? "Activar sonido" : "Silenciar"}>
                <Icon name={silencio ? "volumeOff" : "volume"} size={18} />
              </button>
            )}
            {historia.esMia && (
              <button type="button" className="historia-btn" onClick={() => setPanel("borrar")} aria-label="Borrar historia">
                <Icon name="trash" size={18} />
              </button>
            )}
            <button type="button" className="historia-btn" onClick={onCerrar} aria-label="Cerrar">
              <Icon name="close" size={20} />
            </button>
          </div>
        </header>

        <div
          className="historia-contenido"
          style={historia.tipo === "texto" ? { background: fondoCss(historia.fondo) } : undefined}
          onPointerDown={alBajar}
          onPointerUp={alSoltar}
          onPointerLeave={() => {
            clearTimeout(presionTimer.current);
            setPresionado(false);
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {historia.tipo === "texto" && <p className="historia-texto-grande">{historia.texto}</p>}
          {historia.tipo === "imagen" && <Photo src={historia.medio} alt={historia.texto || "Historia"} className="historia-medio" />}
          {historia.tipo === "video" && (
            <VideoHistoria
              key={historia.id}
              historia={historia}
              videoRef={videoRef}
              pausado={pausado}
              silencio={silencio}
              onSilencio={setSilencio}
              onAvance={setProgreso}
              onFin={siguiente}
            />
          )}
          {historia.tipo !== "texto" && historia.texto && <p className="historia-pie">{historia.texto}</p>}
        </div>

        {historia.esMia && (
          <button type="button" className="historia-vistas-btn" onClick={abrirVistas}>
            <Icon name="eye" size={16} /> {historia.totalVistas || 0} {historia.totalVistas === 1 ? "vista" : "vistas"}
          </button>
        )}

        {grupoIdx > 0 || historiaIdx > 0 ? (
          <button type="button" className="historia-flecha izq" onClick={anterior} aria-label="Anterior">
            <Icon name="chevronLeft" size={22} />
          </button>
        ) : null}
        <button type="button" className="historia-flecha der" onClick={siguiente} aria-label="Siguiente">
          <Icon name="chevronRight" size={22} />
        </button>

        {panel === "vistas" && (
          <div className="historia-panel" role="dialog" aria-label="Quién vio tu historia">
            <header>
              <strong>Quién la vio</strong>
              <button type="button" className="icon-btn" onClick={() => setPanel(null)} aria-label="Cerrar">
                <Icon name="close" size={16} />
              </button>
            </header>
            {vistas === null ? (
              <p className="sub">Cargando…</p>
            ) : vistas.length === 0 ? (
              <p className="sub">Nadie la ha visto todavía.</p>
            ) : (
              <ul>
                {vistas.map((v) => (
                  <li key={v.usuario.id}>
                    <UserAvatar user={v.usuario} size={30} fontSize={11} />
                    <span>{v.usuario.nombre || v.usuario.username}</span>
                    <small>{timeAgo(v.fecha)}</small>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {panel === "borrar" && (
          <div className="historia-panel" role="alertdialog" aria-label="Borrar historia">
            <strong>¿Borrar esta historia?</strong>
            <p className="sub">Se borra para todos y no se puede deshacer.</p>
            {error && <p className="form-error">{error}</p>}
            <div className="historia-panel-botones">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPanel(null)}>Cancelar</button>
              <button type="button" className="btn btn-danger btn-sm" onClick={borrar}>Borrar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function primeraSinVer(grupo) {
  if (!grupo) return 0;
  const i = grupo.historias.findIndex((h) => !h.vista);
  return i === -1 ? 0 : i;
}

function VideoHistoria({ historia, videoRef, pausado, silencio, onSilencio, onAvance, onFin }) {
  const { url, error, renovar } = useVideoUrl(historia.medio);

  // Pausar y reanudar junto con el visor. Se repite cuando llega la URL del video.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (pausado) {
      video.pause();
      return;
    }
    video.play().catch(() => {
      // El navegador no dejó reproducir con sonido: se intenta en silencio.
      video.muted = true;
      onSilencio(true);
      video.play().catch(() => {});
    });
  }, [pausado, url, videoRef, onSilencio]);

  if (error) return <p className="historia-texto-grande">No se pudo cargar el video</p>;
  if (!url) return <span className="historia-cargando" aria-label="Cargando video" />;

  return (
    <video
      ref={videoRef}
      src={url}
      className="historia-medio"
      playsInline
      muted={silencio}
      onTimeUpdate={(e) => {
        const v = e.currentTarget;
        if (v.duration) onAvance(Math.min(1, v.currentTime / v.duration));
      }}
      onEnded={onFin}
      onError={renovar}
    />
  );
}
