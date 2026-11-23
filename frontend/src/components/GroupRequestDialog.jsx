import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import { refrescarGrupos } from "../hooks/useGrupos";
import Avatar from "./Avatar";
import Photo from "./Photo";

const VACIO = { nombre: "", fandom: "", agencia: "", integrantes: "", debut: "", descripcion: "" };
const ANIO_MAXIMO = new Date().getFullYear() + 1;
const MAX_FOTO = 5 * 1024 * 1024;

function formDesde(grupo) {
  if (!grupo) return VACIO;
  return {
    nombre: grupo.name || "",
    fandom: grupo.fandom || "",
    agencia: grupo.agency || "",
    integrantes: grupo.members ?? "",
    debut: grupo.debut ?? "",
    descripcion: grupo.description || "",
  };
}

// Vista previa de un archivo elegido (URL temporal que se libera al cambiarlo).
function useVistaPrevia(archivo) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!archivo) {
      setUrl("");
      return undefined;
    }
    const temporal = URL.createObjectURL(archivo);
    setUrl(temporal);
    return () => URL.revokeObjectURL(temporal);
  }, [archivo]);
  return url;
}

/* Ventana para pedir un grupo nuevo o, con `grupo`, para editarlo (solo moderación).
   Si quien pide es moderador o administrador (`directo`), el grupo entra al catálogo
   de una vez (lo decide el backend). */
export default function GroupRequestDialog({ grupo = null, directo, onClose, onCreated, onSaved }) {
  const editando = Boolean(grupo);
  const [form, setForm] = useState(() => formDesde(grupo));
  const [logo, setLogo] = useState(null);
  const [portada, setPortada] = useState(null);
  const [quitarLogo, setQuitarLogo] = useState(false);
  const [quitarPortada, setQuitarPortada] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState("");
  const vistaLogo = useVistaPrevia(logo);
  const vistaPortada = useVistaPrevia(portada);

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

  function elegir(setArchivo, setQuitar) {
    return (event) => {
      const archivo = event.target.files?.[0] || null;
      if (archivo && archivo.size > MAX_FOTO) {
        setError("Cada foto puede pesar como máximo 5 MB.");
        event.target.value = "";
        return;
      }
      setError("");
      setArchivo(archivo);
      if (archivo) setQuitar(false);
    };
  }

  async function enviar(event) {
    event.preventDefault();
    if (!form.nombre.trim()) {
      setError("Escribe el nombre del grupo.");
      return;
    }

    const datos = new FormData();
    Object.entries(form).forEach(([campo, valor]) => datos.append(campo, String(valor).trim()));
    if (logo) datos.append("imagenes", logo);
    if (portada) datos.append("portada", portada);
    if (editando && quitarLogo && !logo) datos.append("quitarImagen", "true");
    if (editando && quitarPortada && !portada) datos.append("quitarPortada", "true");

    setEnviando(true);
    setError("");
    try {
      const respuesta = editando
        ? await apiRequest(`/grupos/${grupo.id}`, { method: "PUT", body: datos })
        : await apiRequest("/grupos", { method: "POST", body: datos });

      if (editando || respuesta.grupo.estado === "aprobado") await refrescarGrupos().catch(() => {});
      if (editando) {
        onSaved?.(respuesta.grupo);
        onClose();
        return;
      }
      setListo(respuesta.mensaje);
      onCreated?.(respuesta.grupo);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  const titulo = editando ? `Editar ${grupo.name}` : directo ? "Agregar grupo" : "Solicitar un grupo nuevo";
  const logoActual = vistaLogo || (quitarLogo ? "" : grupo?.img || "");
  const portadaActual = vistaPortada || (quitarPortada ? "" : grupo?.cover || "");
  const color = grupo?.color || "var(--gradient-brand)";

  return (
    <div className="group-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="group-dialog" role="dialog" aria-modal="true" aria-labelledby="group-request-title">
        <div className="group-dialog-head">
          <h3 id="group-request-title">{titulo}</h3>
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
            {!editando && (
              <p className="report-hint" style={{ margin: 0 }}>
                {directo
                  ? "Como parte de la moderación, el grupo aparece en el catálogo en cuanto lo guardes."
                  : "¿Falta tu grupo? Pídelo y la moderación lo revisará. Mientras más datos pongas, más fácil es aprobarlo."}
              </p>
            )}
            {editando && grupo.name !== form.nombre.trim() && form.nombre.trim() && (
              <p className="report-hint" style={{ margin: 0 }}>
                Al cambiar el nombre también se actualizan las publicaciones, el merch y a quienes siguen al grupo.
              </p>
            )}

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
                placeholder={editando ? "Se muestra en la página del grupo." : "Algo que ayude a la moderación: canción de debut, redes oficiales…"}
              />
              <span className="hint">{form.descripcion.length}/500</span>
            </div>

            <div className="group-photo-row">
              <Avatar initials={grupo?.initials || form.nombre.slice(0, 3).toUpperCase()} src={logoActual} alt="" background={color} size={64} fontSize={16} />
              <div className="field">
                <label htmlFor="g-logo">Logo o foto del grupo (máx. 5 MB)</label>
                <input id="g-logo" type="file" accept="image/*" onChange={elegir(setLogo, setQuitarLogo)} />
                {editando && logoActual && !logo && (
                  <button type="button" className="btn btn-ghost btn-sm group-photo-remove" onClick={() => setQuitarLogo(true)}>
                    Quitar foto (se verán las iniciales)
                  </button>
                )}
              </div>
            </div>

            <div className="field">
              <label htmlFor="g-portada">Portada de la página del grupo (ancha, máx. 5 MB)</label>
              <div className="group-cover-preview" style={{ background: color }}>
                <Photo src={portadaActual} alt="" className="cover-photo" cover />
              </div>
              <input id="g-portada" type="file" accept="image/*" onChange={elegir(setPortada, setQuitarPortada)} />
              {editando && portadaActual && !portada && (
                <button type="button" className="btn btn-ghost btn-sm group-photo-remove" onClick={() => setQuitarPortada(true)}>
                  Quitar portada (se verá el degradado)
                </button>
              )}
            </div>

            {error && <p className="form-error">{error}</p>}

            <div className="report-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={enviando}>
                {enviando ? "Guardando…" : editando ? "Guardar cambios" : directo ? "Agregar al catálogo" : "Enviar solicitud"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
