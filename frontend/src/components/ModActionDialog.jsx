import { useEffect, useState } from "react";

// Pide el motivo (y los días, si es suspensión) antes de una acción de moderación.
// onConfirm({ motivo, dias }) debe regresar una promesa; si falla se muestra el error.
export default function ModActionDialog({
  titulo,
  descripcion,
  confirmar = "Confirmar",
  peligro = false,
  pedirDias = false,
  motivoObligatorio = true,
  onConfirm,
  onClose,
}) {
  const [motivo, setMotivo] = useState("");
  const [dias, setDias] = useState(3);
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
    if (motivoObligatorio && !motivo.trim()) {
      setError("Escribe el motivo. Queda en la bitácora y se le muestra a la persona.");
      return;
    }
    setEnviando(true);
    setError("");
    try {
      await onConfirm({ motivo: motivo.trim(), dias: Number(dias) });
      onClose();
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <div className="group-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="group-dialog" role="dialog" aria-modal="true" aria-labelledby="mod-dialog-title">
        <div className="group-dialog-head">
          <h3 id="mod-dialog-title">{titulo}</h3>
          <button type="button" className="group-dialog-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        <form className="group-dialog-body" onSubmit={enviar}>
          {descripcion && <p className="report-hint">{descripcion}</p>}

          {pedirDias && (
            <div className="field">
              <label htmlFor="mod-dias">Días de suspensión (1 a 30)</label>
              <input
                id="mod-dias"
                type="number"
                min={1}
                max={30}
                value={dias}
                onChange={(event) => setDias(event.target.value)}
              />
            </div>
          )}

          <div className="field">
            <label htmlFor="mod-motivo">Motivo{motivoObligatorio ? "" : " (opcional)"}</label>
            <textarea
              id="mod-motivo"
              maxLength={300}
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              placeholder="Ej.: Vende photocards falsas"
              autoFocus
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="report-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className={`btn ${peligro ? "btn-danger" : "btn-primary"}`} disabled={enviando}>
              {enviando ? "Guardando…" : confirmar}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
