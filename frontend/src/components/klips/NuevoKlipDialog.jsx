import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../../api/client";
import useGrupos from "../../hooks/useGrupos";
import Icon from "../Icon";
import { MAX_MB_KLIP, MAX_SEGUNDOS_KLIP, MAX_TEXTO_KLIP, revisarVideo } from "../../utils/historias";

// Subir un Klip: video vertical de hasta 60 s y 15 MB, descripción y grupo opcional.
export default function NuevoKlipDialog({ onCerrar, onCreado }) {
  const { nombres: GRUPOS } = useGrupos();
  const [archivo, setArchivo] = useState(null);
  const [vista, setVista] = useState("");
  const [duracion, setDuracion] = useState(null);
  const [texto, setTexto] = useState("");
  const [grupo, setGrupo] = useState("");
  const [revisando, setRevisando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const entrada = useRef(null);

  useEffect(() => {
    const conEscape = (event) => event.key === "Escape" && !enviando && onCerrar();
    window.addEventListener("keydown", conEscape);
    return () => window.removeEventListener("keydown", conEscape);
  }, [onCerrar, enviando]);

  useEffect(() => () => vista && URL.revokeObjectURL(vista), [vista]);

  async function elegir(event) {
    const elegido = event.target.files?.[0];
    event.target.value = "";
    if (!elegido) return;
    setError("");
    setRevisando(true);
    const revision = await revisarVideo(elegido, { maxSegundos: MAX_SEGUNDOS_KLIP, maxMb: MAX_MB_KLIP, nombre: "Un Klip" });
    setRevisando(false);
    if (revision.error) return setError(revision.error);
    setArchivo(elegido);
    setDuracion(revision.duracion);
    setVista(URL.createObjectURL(elegido));
  }

  async function publicar(event) {
    event.preventDefault();
    if (!archivo) return setError("Elige un video.");
    const datos = new FormData();
    datos.append("video", archivo);
    if (texto.trim()) datos.append("texto", texto.trim());
    if (grupo) datos.append("grupo", grupo);
    if (duracion) datos.append("duracion", String(Math.round(duracion * 10) / 10));

    setEnviando(true);
    setError("");
    try {
      const { klip } = await apiRequest("/klips", { method: "POST", body: datos });
      onCreado(klip);
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <div className="historia-dialog-backdrop" role="dialog" aria-modal="true" aria-label="Nuevo Klip" onMouseDown={(e) => e.target === e.currentTarget && !enviando && onCerrar()}>
      <form className="historia-dialog klip-dialog" onSubmit={publicar}>
        <header className="historia-dialog-head">
          <h3>Nuevo Klip</h3>
          <button type="button" className="icon-btn" onClick={onCerrar} disabled={enviando} aria-label="Cerrar">
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="klip-dialog-cuerpo">
          <div className="historia-lienzo">
            {vista ? (
              <>
                <video src={vista} className="historia-medio" autoPlay muted loop playsInline />
                <button type="button" className="historia-quitar" onClick={() => { setArchivo(null); setVista(""); }} aria-label="Quitar video">
                  <Icon name="close" size={16} />
                </button>
                {duracion && <span className="klip-duracion">{Math.round(duracion)} s</span>}
              </>
            ) : (
              <button type="button" className="historia-elegir" onClick={() => entrada.current?.click()} disabled={revisando}>
                <Icon name="klip" size={34} />
                <strong>{revisando ? "Revisando video…" : "Elige un video"}</strong>
                <span>Vertical de preferencia · hasta {MAX_SEGUNDOS_KLIP} s y {MAX_MB_KLIP} MB</span>
              </button>
            )}
            <input ref={entrada} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={elegir} />
          </div>

          <div className="klip-dialog-campos">
            <div className="field">
              <label htmlFor="klip-texto">Descripción</label>
              <textarea
                id="klip-texto"
                value={texto}
                maxLength={MAX_TEXTO_KLIP}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Cuenta de qué va tu Klip"
              />
              <span className="hint">{texto.length}/{MAX_TEXTO_KLIP}</span>
            </div>
            <div className="field">
              <label htmlFor="klip-grupo">Grupo (opcional)</label>
              <select id="klip-grupo" value={grupo} onChange={(e) => setGrupo(e.target.value)}>
                <option value="">Sin grupo</option>
                {GRUPOS.filter((n) => n !== "Todos").map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            {error && <p className="form-error" role="alert">{error}</p>}

            <button type="submit" className="btn btn-primary" disabled={enviando || revisando || !archivo}>
              {enviando ? "Subiendo…" : "Publicar Klip"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
