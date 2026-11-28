import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../../api/client";
import Icon from "../Icon";
import {
  FONDOS_HISTORIA,
  MAX_MB_IMAGEN_HISTORIA,
  MAX_MB_VIDEO_HISTORIA,
  MAX_SEGUNDOS_HISTORIA,
  MAX_TEXTO_HISTORIA,
  fondoCss,
  megas,
  revisarVideo,
} from "../../utils/historias";

/**
 * Subir una historia: foto, video (máx. 15 s) o texto sobre un fondo de color.
 * onCreada(historia) se llama cuando el servidor la guarda.
 */
export default function NuevaHistoriaDialog({ onCerrar, onCreada }) {
  const [modo, setModo] = useState("medio"); // medio | texto
  const [archivo, setArchivo] = useState(null);
  const [vista, setVista] = useState("");
  const [duracion, setDuracion] = useState(null);
  const [texto, setTexto] = useState("");
  const [fondo, setFondo] = useState(FONDOS_HISTORIA[0].id);
  const [error, setError] = useState("");
  const [revisando, setRevisando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const entrada = useRef(null);

  useEffect(() => {
    const conEscape = (event) => event.key === "Escape" && !enviando && onCerrar();
    window.addEventListener("keydown", conEscape);
    return () => window.removeEventListener("keydown", conEscape);
  }, [onCerrar, enviando]);

  useEffect(() => () => vista && URL.revokeObjectURL(vista), [vista]);

  async function elegirArchivo(event) {
    const elegido = event.target.files?.[0];
    event.target.value = "";
    if (!elegido) return;
    setError("");

    if (elegido.type.startsWith("image/")) {
      if (megas(elegido.size) > MAX_MB_IMAGEN_HISTORIA) {
        setError(`La foto puede pesar como máximo ${MAX_MB_IMAGEN_HISTORIA} MB.`);
        return;
      }
      setDuracion(null);
    } else {
      setRevisando(true);
      const revision = await revisarVideo(elegido, {
        maxSegundos: MAX_SEGUNDOS_HISTORIA,
        maxMb: MAX_MB_VIDEO_HISTORIA,
        nombre: "El video de una historia",
      });
      setRevisando(false);
      if (revision.error) {
        setError(revision.error);
        return;
      }
      setDuracion(revision.duracion);
    }

    setArchivo(elegido);
    setVista(URL.createObjectURL(elegido));
  }

  function quitarArchivo() {
    setArchivo(null);
    setVista("");
    setDuracion(null);
  }

  async function publicar(event) {
    event.preventDefault();
    const limpio = texto.trim();
    if (modo === "medio" && !archivo) return setError("Elige una foto o un video.");
    if (modo === "texto" && !limpio) return setError("Escribe algo para tu historia.");

    const datos = new FormData();
    if (modo === "medio") datos.append("medio", archivo);
    if (limpio) datos.append("texto", limpio);
    if (modo === "texto") datos.append("fondo", fondo);
    if (duracion) datos.append("duracion", String(Math.round(duracion * 10) / 10));

    setEnviando(true);
    setError("");
    try {
      const { historia } = await apiRequest("/historias", { method: "POST", body: datos });
      onCreada(historia);
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  const esVideo = archivo?.type.startsWith("video/");

  return (
    <div className="historia-dialog-backdrop" role="dialog" aria-modal="true" aria-label="Nueva historia" onMouseDown={(e) => e.target === e.currentTarget && !enviando && onCerrar()}>
      <form className="historia-dialog" onSubmit={publicar}>
        <header className="historia-dialog-head">
          <h3>Nueva historia</h3>
          <button type="button" className="icon-btn" onClick={onCerrar} disabled={enviando} aria-label="Cerrar">
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="segmentado" role="tablist">
          <button type="button" role="tab" aria-selected={modo === "medio"} className={modo === "medio" ? "activo" : ""} onClick={() => setModo("medio")}>
            <Icon name="camera" size={15} /> Foto o video
          </button>
          <button type="button" role="tab" aria-selected={modo === "texto"} className={modo === "texto" ? "activo" : ""} onClick={() => setModo("texto")}>
            <Icon name="pencil" size={15} /> Texto
          </button>
        </div>

        <div className="historia-lienzo" style={modo === "texto" ? { background: fondoCss(fondo) } : undefined}>
          {modo === "texto" ? (
            <textarea
              className="historia-lienzo-texto"
              placeholder="¿Qué está pasando en tu fandom?"
              maxLength={MAX_TEXTO_HISTORIA}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              autoFocus
            />
          ) : vista ? (
            <>
              {esVideo ? (
                <video src={vista} className="historia-medio" autoPlay muted loop playsInline />
              ) : (
                <img src={vista} alt="Vista previa" className="historia-medio" />
              )}
              <button type="button" className="historia-quitar" onClick={quitarArchivo} aria-label="Quitar archivo">
                <Icon name="close" size={16} />
              </button>
              {texto.trim() && <p className="historia-pie">{texto.trim()}</p>}
            </>
          ) : (
            <button type="button" className="historia-elegir" onClick={() => entrada.current?.click()} disabled={revisando}>
              <Icon name="upload" size={30} />
              <strong>{revisando ? "Revisando video…" : "Elige una foto o un video"}</strong>
              <span>
                Foto hasta {MAX_MB_IMAGEN_HISTORIA} MB · video hasta {MAX_SEGUNDOS_HISTORIA} s y {MAX_MB_VIDEO_HISTORIA} MB
              </span>
            </button>
          )}
          <input ref={entrada} type="file" accept="image/*,video/mp4,video/webm,video/quicktime" hidden onChange={elegirArchivo} />
        </div>

        {modo === "texto" ? (
          <div className="historia-fondos" role="radiogroup" aria-label="Fondo">
            {FONDOS_HISTORIA.map((f) => (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={fondo === f.id}
                aria-label={f.nombre}
                title={f.nombre}
                className={`historia-fondo ${fondo === f.id ? "activo" : ""}`}
                style={{ background: f.css }}
                onClick={() => setFondo(f.id)}
              />
            ))}
          </div>
        ) : (
          <div className="field" style={{ marginBottom: 0 }}>
            <input
              aria-label="Pie de la historia"
              placeholder="Agrega un pie (opcional)"
              maxLength={MAX_TEXTO_HISTORIA}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </div>
        )}

        {error && <p className="form-error" role="alert">{error}</p>}

        <p className="historia-nota">
          <Icon name="eye" size={14} /> Se borra sola en 24 horas. Podrás ver quién la vio.
        </p>

        <button type="submit" className="btn btn-primary" disabled={enviando || revisando}>
          {enviando ? "Subiendo…" : "Compartir historia"}
        </button>
      </form>
    </div>
  );
}
