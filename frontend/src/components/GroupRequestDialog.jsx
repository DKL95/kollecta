import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import { refrescarGrupos } from "../hooks/useGrupos";

const VACIO = { nombre: "", fandom: "", agencia: "", integrantes: "", debut: "", descripcion: "" };
const ANIO_MAXIMO = new Date().getFullYear() + 1;

// Ventana para pedir un grupo nuevo. Si quien la usa es moderador o administrador,
// el grupo entra al catálogo de una vez (lo decide el backend).
export default function GroupRequestDialog({ directo, onClose, onCreated }) {
  const [form, setForm] = useState(VACIO);
  const [foto, setFoto] = useState(null);
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

  function actualizar(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function enviar(event) {
    event.preventDefault();
    if (!form.nombre.trim()) {
      setError("Escribe el nombre del grupo.");
      return;
    }
    if (foto && foto.size > 5 * 1024 * 1024) {
      setError("La foto no puede pesar más de 5 MB.");
      return;
    }

    const datos = new FormData();
    Object.entries(form).forEach(([campo, valor]) => datos.append(campo, valor.trim()));
    if (foto) datos.append("imagenes", foto);

    setEnviando(true);
    setError("");
    try {
      const respuesta = await apiRequest("/grupos", { method: "POST", body: datos });
      if (respuesta.grupo.estado === "aprobado") await refrescarGrupos().catch(() => {});
      setListo(respuesta.mensaje);
      onCreated?.(respuesta.grupo);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="group-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="group-dialog" role="dialog" aria-modal="true" aria-labelledby="group-request-title">
        <div className="group-dialog-head">
          <h3 id="group-request-title">{directo ? "Agregar grupo" : "Solicitar un grupo nuevo"}</h3>
          <button type="button" className="group-dialog-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        {listo ? (
          <div className="group-dialog-body">
            <p className="report-done">{listo}</p>
            {!directo && (
              <p className="report-hint">Puedes ver cómo va en la pestaña "Mis solicitudes". Te llegará una notificación con la respuesta.</p>
            )}
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Entendido
            </button>
          </div>
        ) : (
          <form className="group-dialog-body" onSubmit={enviar}>
            <p className="report-hint" style={{ margin: 0 }}>
              {directo
                ? "Como parte de la moderación, el grupo aparece en el catálogo en cuanto lo guardes."
                : "¿Falta tu grupo? Pídelo y la moderación lo revisará. Mientras más datos pongas, más fácil es aprobarlo."}
            </p>

            <div className="field">
              <label htmlFor="g-nombre">Nombre del grupo *</label>
              <input id="g-nombre" name="nombre" maxLength={40} value={form.nombre} onChange={actualizar} placeholder="Ej. KISS OF LIFE" autoFocus required />
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="g-fandom">Fandom</label>
                <input id="g-fandom" name="fandom" maxLength={40} value={form.fandom} onChange={actualizar} placeholder="Ej. KISSY" />
              </div>
              <div className="field">
                <label htmlFor="g-agencia">Agencia</label>
                <input id="g-agencia" name="agencia" maxLength={60} value={form.agencia} onChange={actualizar} placeholder="Ej. S2 Entertainment" />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="g-integrantes">Integrantes</label>
                <input id="g-integrantes" name="integrantes" type="number" min={1} max={50} value={form.integrantes} onChange={actualizar} />
              </div>
              <div className="field">
                <label htmlFor="g-debut">Año de debut</label>
                <input id="g-debut" name="debut" type="number" min={1990} max={ANIO_MAXIMO} value={form.debut} onChange={actualizar} />
              </div>
            </div>

            <div className="field">
              <label htmlFor="g-descripcion">Descripción (opcional)</label>
              <textarea
                id="g-descripcion"
                name="descripcion"
                maxLength={500}
                rows={3}
                value={form.descripcion}
                onChange={actualizar}
                placeholder="Algo que ayude a la moderación: canción de debut, redes oficiales…"
              />
              <span className="hint">{form.descripcion.length}/500</span>
            </div>

            <div className="field">
              <label htmlFor="g-foto">Foto del grupo (opcional, máx. 5 MB)</label>
              <input id="g-foto" type="file" accept="image/*" onChange={(event) => setFoto(event.target.files[0] || null)} />
            </div>

            {error && <p className="form-error">{error}</p>}

            <div className="report-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={enviando}>
                {enviando ? "Enviando…" : directo ? "Agregar al catálogo" : "Enviar solicitud"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
