import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import { apiRequest } from "../api/client";
import { getInitials } from "../utils/format";

const MAX_NOMBRE = 60;

function idDe(usuario) {
  return String(usuario?._id || usuario?.id || usuario);
}

function nombreDe(usuario) {
  return usuario?.nombre || usuario?.username || "Usuario";
}

// Buscador de usuarios con selección múltiple (se usa al crear y al agregar).
function SelectorUsuarios({ excluir, seleccionados, onCambiar }) {
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const temporizador = useRef(null);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  function buscar(valor) {
    setTexto(valor);
    clearTimeout(temporizador.current);

    if (!valor.trim()) {
      setResultados([]);
      setBuscando(false);
      return;
    }

    setBuscando(true);
    temporizador.current = setTimeout(async () => {
      try {
        const data = await apiRequest(`/usuarios/?q=${encodeURIComponent(valor.trim())}`);
        setResultados(data.usuarios || []);
      } catch {
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    }, 300);
  }

  const idsExcluidos = new Set(excluir.map(idDe));
  const idsSeleccionados = new Set(seleccionados.map(idDe));
  const visibles = resultados.filter((usuario) => !idsExcluidos.has(idDe(usuario)));

  function alternar(usuario) {
    onCambiar(
      idsSeleccionados.has(idDe(usuario))
        ? seleccionados.filter((item) => idDe(item) !== idDe(usuario))
        : [...seleccionados, usuario]
    );
  }

  return (
    <div className="group-picker">
      {seleccionados.length > 0 && (
        <div className="group-chips">
          {seleccionados.map((usuario) => (
            <button
              type="button"
              key={idDe(usuario)}
              className="group-chip"
              onClick={() => alternar(usuario)}
              aria-label={`Quitar a ${nombreDe(usuario)}`}
            >
              {nombreDe(usuario)} <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}

      <input
        type="search"
        placeholder="Buscar personas por nombre o usuario..."
        value={texto}
        onChange={(event) => buscar(event.target.value)}
      />

      {buscando && <p className="messages-search-status">Buscando...</p>}
      {!buscando && texto.trim() && visibles.length === 0 && (
        <p className="messages-search-status">No se encontraron personas.</p>
      )}

      <div className="group-picker-results">
        {visibles.map((usuario) => {
          const marcado = idsSeleccionados.has(idDe(usuario));
          return (
            <button
              type="button"
              key={idDe(usuario)}
              className={`message-search-result ${marcado ? "is-selected" : ""}`}
              onClick={() => alternar(usuario)}
              aria-pressed={marcado}
            >
              <Avatar initials={getInitials(usuario)} src={usuario.fotoPerfil} alt={nombreDe(usuario)} />
              <span className="message-search-user">
                <strong>{nombreDe(usuario)}</strong>
                <small>@{usuario.username}</small>
              </span>
              <span className="message-search-action">{marcado ? "✓ Agregado" : "Agregar"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/*
  Diálogo de chats grupales.
  - Sin "grupo": formulario para crear uno nuevo.
  - Con "grupo": ver participantes, renombrar, agregar/quitar (admins) y salir.
*/
export default function GroupChatDialog({ grupo, usuarioActual, onCerrar, onGuardado, onSalir }) {
  const miId = idDe(usuarioActual);
  const esNuevo = !grupo;
  const soyAdmin = !esNuevo && (grupo.administradores || []).some((id) => idDe(id) === miId);

  const [nombre, setNombre] = useState(grupo?.nombre || "");
  const [seleccionados, setSeleccionados] = useState([]);
  const [agregando, setAgregando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function alPresionar(event) {
      if (event.key === "Escape") onCerrar();
    }
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [onCerrar]);

  async function ejecutar(accion) {
    setGuardando(true);
    setError("");
    try {
      await accion();
    } catch (err) {
      setError(err.message || "Algo salió mal, inténtalo de nuevo");
    } finally {
      setGuardando(false);
    }
  }

  function crear(event) {
    event.preventDefault();

    if (!nombre.trim()) return setError("El grupo necesita un nombre");
    if (seleccionados.length < 2) return setError("Agrega al menos a dos personas");

    ejecutar(async () => {
      const creado = await apiRequest("/mensajes/grupos", {
        method: "POST",
        body: { nombre: nombre.trim(), participantes: seleccionados.map(idDe) },
      });
      onGuardado(creado);
    });
  }

  function renombrar(event) {
    event.preventDefault();
    if (!nombre.trim() || nombre.trim() === grupo.nombre) return;

    ejecutar(async () => {
      const actualizado = await apiRequest(`/mensajes/grupos/${grupo._id}`, {
        method: "PATCH",
        body: { nombre: nombre.trim() },
      });
      onGuardado(actualizado, { cerrar: false });
    });
  }

  function agregar() {
    if (seleccionados.length === 0) return;

    ejecutar(async () => {
      const actualizado = await apiRequest(`/mensajes/grupos/${grupo._id}/participantes`, {
        method: "POST",
        body: { usuarios: seleccionados.map(idDe) },
      });
      setSeleccionados([]);
      setAgregando(false);
      onGuardado(actualizado, { cerrar: false });
    });
  }

  function quitar(usuario) {
    if (!window.confirm(`¿Quitar a ${nombreDe(usuario)} del grupo?`)) return;

    ejecutar(async () => {
      const actualizado = await apiRequest(
        `/mensajes/grupos/${grupo._id}/participantes/${idDe(usuario)}`,
        { method: "DELETE" }
      );
      onGuardado(actualizado, { cerrar: false });
    });
  }

  function salir() {
    if (!window.confirm("¿Seguro que quieres salir del grupo?")) return;

    ejecutar(async () => {
      await apiRequest(`/mensajes/grupos/${grupo._id}/participantes/${miId}`, { method: "DELETE" });
      onSalir(grupo._id);
    });
  }

  return (
    <div className="group-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onCerrar()}>
      <div className="group-dialog" role="dialog" aria-modal="true" aria-labelledby="group-dialog-title">
        <div className="group-dialog-head">
          <h3 id="group-dialog-title">{esNuevo ? "Nuevo grupo" : "Información del grupo"}</h3>
          <button type="button" className="group-dialog-close" onClick={onCerrar} aria-label="Cerrar">×</button>
        </div>

        {esNuevo ? (
          <form className="group-dialog-body" onSubmit={crear}>
            <label className="group-field">
              <span>Nombre del grupo</span>
              <input
                type="text"
                value={nombre}
                maxLength={MAX_NOMBRE}
                onChange={(event) => setNombre(event.target.value)}
                placeholder="Ej. Intercambios TWICE MTY"
                autoFocus
              />
            </label>

            <div className="group-field">
              <span>Participantes ({seleccionados.length}) · mínimo 2</span>
              <SelectorUsuarios excluir={[usuarioActual]} seleccionados={seleccionados} onCambiar={setSeleccionados} />
            </div>

            {error && <p className="form-error">{error}</p>}

            <div className="group-dialog-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={onCerrar}>Cancelar</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={guardando}>
                {guardando ? "Creando..." : "Crear grupo"}
              </button>
            </div>
          </form>
        ) : (
          <div className="group-dialog-body">
            {soyAdmin ? (
              <form className="group-field group-rename" onSubmit={renombrar}>
                <span>Nombre del grupo</span>
                <div>
                  <input
                    type="text"
                    value={nombre}
                    maxLength={MAX_NOMBRE}
                    onChange={(event) => setNombre(event.target.value)}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={guardando || !nombre.trim() || nombre.trim() === grupo.nombre}
                  >
                    Guardar
                  </button>
                </div>
              </form>
            ) : (
              <p className="group-name-readonly">{grupo.nombre}</p>
            )}

            <div className="group-field">
              <span>{grupo.participantes.length} participantes</span>
              <ul className="group-members">
                {grupo.participantes.map((usuario) => {
                  const esAdminMiembro = (grupo.administradores || []).some((id) => idDe(id) === idDe(usuario));
                  const soyYo = idDe(usuario) === miId;
                  return (
                    <li key={idDe(usuario)}>
                      <Avatar initials={getInitials(usuario)} src={usuario.fotoPerfil} alt={nombreDe(usuario)} size={32} fontSize={11} />
                      <span className="message-search-user">
                        <strong>{soyYo ? "Tú" : nombreDe(usuario)}</strong>
                        <small>@{usuario.username}</small>
                      </span>
                      {esAdminMiembro && <span className="group-admin-badge">Admin</span>}
                      {soyAdmin && !soyYo && (
                        <button type="button" className="group-member-remove" onClick={() => quitar(usuario)} disabled={guardando}>
                          Quitar
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            {soyAdmin && (
              agregando ? (
                <div className="group-field">
                  <span>Agregar personas</span>
                  <SelectorUsuarios excluir={grupo.participantes} seleccionados={seleccionados} onCambiar={setSeleccionados} />
                  <div className="group-dialog-actions">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setAgregando(false); setSeleccionados([]); }}>
                      Cancelar
                    </button>
                    <button type="button" className="btn btn-primary btn-sm" onClick={agregar} disabled={guardando || seleccionados.length === 0}>
                      Agregar ({seleccionados.length})
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="btn btn-ghost btn-sm group-add-btn" onClick={() => setAgregando(true)}>
                  + Agregar personas
                </button>
              )
            )}

            {error && <p className="form-error">{error}</p>}

            <button type="button" className="group-leave-btn" onClick={salir} disabled={guardando}>
              Salir del grupo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
