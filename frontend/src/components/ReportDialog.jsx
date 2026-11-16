import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import { ETIQUETA_TIPO_DENUNCIA, MOTIVOS_DENUNCIA } from "../utils/roles";

// Ventana para denunciar una publicación, comentario, cuenta, producto o mensaje.
export default function ReportDialog({ tipo, objetivo, resumen, onClose }) {
  const [motivo, setMotivo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState("");

  useEffect(() => {
    function alPresionarTecla(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", alPresionarTecla);
    return () => document.removeEventListener("keydown", alPresionarTecla);
  }, [onClose]);

  async function enviar(event) {
    event.preventDefault();
    if (!motivo) {
      setError("Elige un motivo.");
      return;
    }
    if (motivo === "otro" && !detalle.trim()) {
      setError("Cuéntanos qué pasa.");
      return;
    }

    setEnviando(true);
    setError("");
    try {
      const respuesta = await apiRequest("/denuncias", {
        method: "POST",
        body: { tipo, objetivo, motivo, detalle: detalle.trim() },
      });
      setListo(respuesta.mensaje);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="group-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="group-dialog" role="dialog" aria-modal="true" aria-labelledby="report-dialog-title">
        <div className="group-dialog-head">
          <h3 id="report-dialog-title">Denunciar {ETIQUETA_TIPO_DENUNCIA[tipo]?.toLowerCase()}</h3>
          <button type="button" className="group-dialog-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        {listo ? (
          <div className="group-dialog-body">
            <p className="report-done">{listo}</p>
            <p className="report-hint">Te avisaremos en tus notificaciones cuando la moderación la revise. Nadie más sabrá que fuiste tú.</p>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Entendido
            </button>
          </div>
        ) : (
          <form className="group-dialog-body" onSubmit={enviar}>
            {resumen && <blockquote className="report-quote">{resumen}</blockquote>}

            <fieldset className="report-motivos">
              <legend>¿Qué está pasando?</legend>
              {MOTIVOS_DENUNCIA.map((m) => (
                <label key={m.valor} className={`report-motivo ${motivo === m.valor ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="motivo"
                    value={m.valor}
                    checked={motivo === m.valor}
                    onChange={() => setMotivo(m.valor)}
                  />
                  {m.etiqueta}
                </label>
              ))}
            </fieldset>

            <div className="field">
              <label htmlFor="report-detalle">Detalles {motivo === "otro" ? "" : "(opcional)"}</label>
              <textarea
                id="report-detalle"
                maxLength={500}
                value={detalle}
                onChange={(event) => setDetalle(event.target.value)}
                placeholder="Ayuda a la moderación con contexto: enlaces, qué viste, desde cuándo…"
              />
              <span className="hint">{detalle.length}/500</span>
            </div>

            {error && <p className="form-error">{error}</p>}

            <div className="report-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={enviando}>
                {enviando ? "Enviando…" : "Enviar denuncia"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
