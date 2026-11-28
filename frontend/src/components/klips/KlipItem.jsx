import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../api/client";
import useVideoUrl from "../../hooks/useVideoUrl";
import { timeAgo } from "../../utils/format";
import { formatoConteo, MAX_TEXTO_KLIP } from "../../utils/historias";
import { UserAvatar } from "../Avatar";
import Icon from "../Icon";
import ReportDialog from "../ReportDialog";

/**
 * Un Klip del feed. Solo se reproduce cuando está en pantalla (activo);
 * la URL del video se pide cuando está cerca (cercano) para que arranque rápido.
 * Toque: pausa/reanuda. Doble toque: me gusta.
 */
export default function KlipItem({ klip, activo, cercano, silencio, onSilencio, onCambio, onBorrado, onComentarios }) {
  const { url, error, renovar } = useVideoUrl(klip.video, cercano);
  const videoRef = useRef(null);
  const [pausado, setPausado] = useState(false);
  const [corazon, setCorazon] = useState(0);
  const [menu, setMenu] = useState(false);
  const [panel, setPanel] = useState(null); // null | "editar" | "borrar" | "denunciar"
  const [texto, setTexto] = useState(klip.texto);
  const [aviso, setAviso] = useState("");
  const [avance, setAvance] = useState(0);
  const toqueTimer = useRef(null);
  const contada = useRef(false);

  // Reproducir solo el que está en pantalla.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (activo && !pausado) {
      video.play().catch(() => {
        // Sin interacción previa el navegador solo deja reproducir en silencio.
        if (!silencio) onSilencio(true);
      });
    } else {
      video.pause();
    }
  }, [activo, pausado, url, silencio, onSilencio]);

  // Al salir de pantalla se regresa al inicio y se quita la pausa.
  useEffect(() => {
    if (activo) return;
    setPausado(false);
    if (videoRef.current) videoRef.current.currentTime = 0;
  }, [activo]);

  useEffect(() => {
    if (!aviso) return undefined;
    const t = setTimeout(() => setAviso(""), 2200);
    return () => clearTimeout(t);
  }, [aviso]);

  function alAvanzar(event) {
    const v = event.currentTarget;
    if (v.duration) setAvance(v.currentTime / v.duration);
    // Cuenta una reproducción después de 2 s (una vez por visita).
    if (!contada.current && v.currentTime >= 2 && !klip.esMio) {
      contada.current = true;
      apiRequest(`/klips/${klip.id}/reproduccion`, { method: "POST" }).catch(() => {});
    }
  }

  async function alternarLike(soloDar = false) {
    if (soloDar && klip.meGusta) return;
    const previo = klip;
    onCambio({ ...klip, meGusta: !klip.meGusta, totalLikes: klip.totalLikes + (klip.meGusta ? -1 : 1) });
    try {
      const datos = await apiRequest(`/klips/${klip.id}/like`, { method: "POST" });
      onCambio({ ...previo, ...datos });
    } catch (err) {
      onCambio(previo);
      setAviso(err.message);
    }
  }

  function alTocar(event) {
    if (event.target.closest("button, a")) return;
    if (toqueTimer.current) {
      // Doble toque
      clearTimeout(toqueTimer.current);
      toqueTimer.current = null;
      setCorazon((n) => n + 1);
      alternarLike(true);
      return;
    }
    toqueTimer.current = setTimeout(() => {
      toqueTimer.current = null;
      setPausado((p) => !p);
    }, 260);
  }

  async function compartir() {
    const enlace = `${window.location.origin}/klips/${klip.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Klip en KollectA", text: klip.texto || "Mira este Klip", url: enlace });
      } else {
        await navigator.clipboard.writeText(enlace);
        setAviso("Enlace copiado");
      }
    } catch {
      // cancelado
    }
  }

  async function guardarTexto(event) {
    event.preventDefault();
    try {
      const datos = await apiRequest(`/klips/${klip.id}`, { method: "PUT", body: { texto: texto.trim(), grupo: klip.grupo } });
      onCambio(datos.klip);
      setPanel(null);
    } catch (err) {
      setAviso(err.message);
    }
  }

  async function borrar() {
    try {
      await apiRequest(`/klips/${klip.id}`, { method: "DELETE" });
      onBorrado(klip.id);
    } catch (err) {
      setAviso(err.message);
      setPanel(null);
    }
  }

  return (
    <article className="klip" aria-label={`Klip de ${klip.autor.nombre || klip.autor.username}`}>
      <div className="klip-video" onClick={alTocar}>
        {url && (
          <video
            ref={videoRef}
            src={url}
            loop
            playsInline
            muted={silencio}
            preload={activo ? "auto" : "metadata"}
            onTimeUpdate={alAvanzar}
            onError={renovar}
          />
        )}
        {!url && !error && <span className="historia-cargando" aria-label="Cargando video" />}
        {error && <p className="klip-error">No se pudo cargar el video</p>}

        {pausado && (
          <span className="klip-pausa" aria-hidden="true">
            <Icon name="play" size={44} />
          </span>
        )}
        {corazon > 0 && (
          <span key={corazon} className="klip-corazon" aria-hidden="true">
            <Icon name="heartFilled" size={92} />
          </span>
        )}
        {klip.oculta && <span className="klip-oculto">Oculto por moderación{klip.motivoOculto ? `: ${klip.motivoOculto}` : ""}</span>}

        <div className="klip-info">
          <Link to={`/perfil/${encodeURIComponent(klip.autor.username)}`} className="klip-autor">
            <UserAvatar user={klip.autor} size={32} fontSize={12} />
            <strong>{klip.autor.nombre || klip.autor.username}</strong>
            <small>· {timeAgo(klip.fecha)}</small>
          </Link>
          {klip.texto && <p className="klip-texto">{klip.texto}</p>}
          <div className="klip-meta">
            {klip.grupo && (
              <Link to={`/klips?grupo=${encodeURIComponent(klip.grupo)}`} className="klip-grupo">
                <Icon name="star" size={12} /> {klip.grupo}
              </Link>
            )}
            <span>
              <Icon name="eye" size={12} /> {formatoConteo(klip.reproducciones)}
            </span>
          </div>
        </div>

        <div className="klip-avance" aria-hidden="true">
          <span style={{ transform: `scaleX(${avance})` }} />
        </div>
      </div>

      <div className="klip-acciones">
        <button type="button" className={`klip-accion ${klip.meGusta ? "activa" : ""}`} onClick={() => alternarLike()} aria-pressed={klip.meGusta} aria-label="Me gusta">
          <Icon name={klip.meGusta ? "heartFilled" : "heart"} size={26} />
          <span>{formatoConteo(klip.totalLikes)}</span>
        </button>
        <button type="button" className="klip-accion" onClick={() => onComentarios(klip)} aria-label="Comentarios">
          <Icon name="comment" size={26} />
          <span>{formatoConteo(klip.totalComentarios)}</span>
        </button>
        <button type="button" className="klip-accion" onClick={compartir} aria-label="Compartir">
          <Icon name="share" size={24} />
          <span>Compartir</span>
        </button>
        <button type="button" className="klip-accion" onClick={() => onSilencio(!silencio)} aria-label={silencio ? "Activar sonido" : "Silenciar"}>
          <Icon name={silencio ? "volumeOff" : "volume"} size={24} />
        </button>
        <div className="klip-menu-wrap">
          <button type="button" className="klip-accion" onClick={() => setMenu((m) => !m)} aria-label="Más opciones" aria-expanded={menu}>
            <Icon name="dots" size={24} />
          </button>
          {menu && (
            <div className="klip-menu" role="menu" onMouseLeave={() => setMenu(false)}>
              {klip.esMio ? (
                <>
                  <button type="button" role="menuitem" onClick={() => { setMenu(false); setTexto(klip.texto); setPanel("editar"); }}>
                    <Icon name="pencil" size={15} /> Editar descripción
                  </button>
                  <button type="button" role="menuitem" className="peligro" onClick={() => { setMenu(false); setPanel("borrar"); }}>
                    <Icon name="trash" size={15} /> Borrar Klip
                  </button>
                </>
              ) : (
                <button type="button" role="menuitem" onClick={() => { setMenu(false); setPanel("denunciar"); }}>
                  <Icon name="flag" size={15} /> Denunciar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {aviso && <div className="klip-aviso" role="status">{aviso}</div>}

      {panel === "editar" && (
        <form className="historia-panel klip-panel" onSubmit={guardarTexto}>
          <strong>Editar descripción</strong>
          <div className="field" style={{ margin: 0 }}>
            <textarea value={texto} maxLength={MAX_TEXTO_KLIP} onChange={(e) => setTexto(e.target.value)} autoFocus aria-label="Descripción" />
          </div>
          <div className="historia-panel-botones">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPanel(null)}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm">Guardar</button>
          </div>
        </form>
      )}
      {panel === "borrar" && (
        <div className="historia-panel klip-panel" role="alertdialog" aria-label="Borrar Klip">
          <strong>¿Borrar este Klip?</strong>
          <p className="sub">Se borra el video, sus me gusta y comentarios.</p>
          <div className="historia-panel-botones">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPanel(null)}>Cancelar</button>
            <button type="button" className="btn btn-danger btn-sm" onClick={borrar}>Borrar</button>
          </div>
        </div>
      )}
      {panel === "denunciar" && (
        <ReportDialog tipo="klip" objetivo={klip.id} resumen={klip.texto || "Klip"} onClose={() => setPanel(null)} />
      )}
    </article>
  );
}
