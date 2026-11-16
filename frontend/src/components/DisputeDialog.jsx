import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import { MOTIVOS_DISPUTA } from "../utils/ordenes";

// Abre una disputa sobre una orden. onDone(orden) recibe la orden actualizada.
export default function DisputeDialog({ orden, onDone, onClose }) {
  const [motivo, setMotivo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

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
    if (!detalle.trim()) {
      setError("Cuéntale a la moderación qué pasó.");
      return;
    }

    setEnviando(true);
    setError("");
    try {
      const data = await apiRequest(`/ordenes/${orden._id}/disputa`, {
        method: "POST",
        body: { motivo, detalle: detalle.trim() },
      });
      onDone(data.orden);
      onClose();
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <div className="group-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="group-dialog" role="dialog" aria-modal="true" aria-labelledby="dispute-dialog-title">
        <div className="group-dialog-head">
          <h3 id="dispute-dialog-title">Abrir una disputa</h3>
          <button type="button" className="group-dialog-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        <form className="group-dialog-body" onSubmit={enviar}>
          <p className="report-hint">
            Moderación revisará la operación de <strong>"{orden.articulo.titulo}"</strong> y el chat. Mientras tanto la
            orden queda en pausa. Intenta primero resolverlo en el chat.
          </p>

          <fieldset className="report-motivos">
            <legend>¿Qué pasó?</legend>
            {MOTIVOS_DISPUTA.map((m) => (
              <label key={m.valor} className={`report-motivo ${motivo === m.valor ? "active" : ""}`}>
                <input type="radio" name="motivo-disputa" value={m.valor} checked={motivo === m.valor} onChange={() => setMotivo(m.valor)} />
                {m.etiqueta}
              </label>
            ))}
          </fieldset>

          <div className="field">
            <label htmlFor="dispute-detalle">Detalles</label>
            <textarea
              id="dispute-detalle"
              maxLength={500}
              value={detalle}
              onChange={(event) => setDetalle(event.target.value)}
              placeholder="Fechas, número de guía, qué acordaron en el chat…"
            />
            <span className="hint">{detalle.length}/500</span>
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="report-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-danger" disabled={enviando}>
              {enviando ? "Enviando…" : "Abrir disputa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
