import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import { UserAvatar } from "../components/Avatar";
import DisputePanel from "../components/DisputePanel";
import EmptyState from "../components/EmptyState";
import Icon from "../components/Icon";
import ModActionDialog from "../components/ModActionDialog";
import RoleBadge from "../components/RoleBadge";
import { useAuth } from "../context/AuthContext";
import { DENUNCIAS_ACTUALIZADAS } from "../hooks/useDenunciasPendientes";
import { formatMoney, timeAgo } from "../utils/format";
import { etiquetaEstado } from "../utils/ordenes";
import {
  ETIQUETA_ACCION,
  ETIQUETA_MOTIVO,
  ETIQUETA_ROL,
  ETIQUETA_TIPO_DENUNCIA,
  ROLES,
  esAdmin,
  esModerador,
} from "../utils/roles";

const OCULTABLES = ["publicacion", "comentario", "producto"];

const FILTROS_ESTADO = [
  { valor: "pendientes", etiqueta: "Pendientes" },
  { valor: "resuelta", etiqueta: "Resueltas" },
  { valor: "descartada", etiqueta: "Descartadas" },
  { valor: "todas", etiqueta: "Todas" },
];

const ETIQUETA_ESTADO = {
  abierta: { texto: "Abierta", clase: "pink" },
  en_revision: { texto: "En revisión", clase: "gold" },
  resuelta: { texto: "Resuelta", clase: "green" },
  descartada: { texto: "Descartada", clase: "" },
};

const avisarContador = () => window.dispatchEvent(new Event(DENUNCIAS_ACTUALIZADAS));

function estadoCuenta(persona) {
  if (!persona) return null;
  if (persona.activo === false) return { texto: "Baneada", clase: "red" };
  if (persona.suspendidoHasta && new Date(persona.suspendidoHasta) > new Date()) {
    return { texto: `Suspendida hasta ${new Date(persona.suspendidoHasta).toLocaleDateString("es-MX")}`, clase: "gold" };
  }
  return null;
}

/* --------------------------------------------------------------------------
   Pestaña: cola de denuncias
   -------------------------------------------------------------------------- */
function ColaDenuncias({ user }) {
  const [estado, setEstado] = useState("pendientes");
  const [tipo, setTipo] = useState("");
  const [denuncias, setDenuncias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [accion, setAccion] = useState(null); // { denuncia, tipo }

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const params = new URLSearchParams({ estado });
      if (tipo) params.set("tipo", tipo);
      const data = await apiRequest(`/denuncias?${params}`);
      setDenuncias(data.denuncias);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [estado, tipo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function tomar(denuncia) {
    try {
      await apiRequest(`/denuncias/${denuncia._id}`, { method: "PATCH", body: { estado: "en_revision" } });
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function ejecutar({ motivo, dias }) {
    const { denuncia, tipo: tipoAccion } = accion;
    const body =
      tipoAccion === "descartar"
        ? { estado: "descartada", nota: motivo }
        : { estado: "resuelta", accion: tipoAccion, nota: motivo, dias };
    await apiRequest(`/denuncias/${denuncia._id}`, { method: "PATCH", body });
    avisarContador();
    await cargar();
  }

  const CONFIG_ACCION = {
    ninguna: { titulo: "Cerrar sin sanción", confirmar: "Cerrar denuncia", motivoObligatorio: false,
      descripcion: "Revisaste y no hay falta a las normas. Quien denunció recibe un aviso." },
    descartar: { titulo: "Descartar denuncia", confirmar: "Descartar",
      descripcion: "La denuncia no procede (es falsa, repetida o un malentendido)." },
    ocultar: { titulo: "Ocultar contenido", confirmar: "Ocultar", peligro: true,
      descripcion: "Deja de verse para todos menos su autor. Se cierran todas las denuncias sobre este contenido." },
    suspender: { titulo: "Suspender la cuenta", confirmar: "Suspender", peligro: true, pedirDias: true,
      descripcion: "La persona no podrá entrar durante esos días." },
    banear: { titulo: "Banear la cuenta", confirmar: "Banear", peligro: true,
      descripcion: "Baja permanente. Sus publicaciones y anuncios dejan de verse. Solo un administrador puede revertirlo." },
  };

  return (
    <>
      <div className="filter-row">
        {FILTROS_ESTADO.map((f) => (
          <button key={f.valor} className={`chip ${estado === f.valor ? "active" : ""}`} onClick={() => setEstado(f.valor)}>
            {f.etiqueta}
          </button>
        ))}
        <select className="mod-select" value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo de contenido">
          <option value="">Todo el contenido</option>
          {Object.entries(ETIQUETA_TIPO_DENUNCIA).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="form-error">{error}</p>}

      {cargando ? (
        <EmptyState icon="shield">Cargando denuncias…</EmptyState>
      ) : denuncias.length === 0 ? (
        <EmptyState icon="checkCircle">
          {estado === "pendientes" ? "No hay denuncias pendientes. ¡La comunidad está en paz!" : "No hay denuncias con este filtro."}
        </EmptyState>
      ) : (
        <div className="mod-list">
          {denuncias.map((d) => {
            const denunciado = d.usuarioDenunciado;
            const pendiente = ["abierta", "en_revision"].includes(d.estado);
            const esSobreMi = denunciado && String(denunciado._id) === String(user.id);
            // Conflicto de interés: lo mismo valida el backend.
            const puedeSancionar = denunciado && !esSobreMi && (denunciado.rol === "usuario" || esAdmin(user));
            const etiquetaEstado = ETIQUETA_ESTADO[d.estado];
            const cuenta = estadoCuenta(denunciado);

            return (
              <article key={d._id} className="card mod-card">
                <header className="mod-card-head">
                  <span className="pill purple">{ETIQUETA_TIPO_DENUNCIA[d.tipo]}</span>
                  <span className="pill pink">{ETIQUETA_MOTIVO[d.motivo]}</span>
                  <span className={`pill ${etiquetaEstado.clase}`}>{etiquetaEstado.texto}</span>
                  {d.totalDenuncias > 1 && (
                    <span className="pill gold" title="Personas distintas que denunciaron lo mismo">
                      <Icon name="flag" size={12} /> {d.totalDenuncias} denuncias
                    </span>
                  )}
                  {d.contenidoOculto && (
                    <span className="pill">
                      <Icon name="eyeOff" size={12} /> Ya oculto
                    </span>
                  )}
                  {d.contenidoExiste === false && <span className="pill">El contenido ya no existe</span>}
                  <span className="mod-card-time">{timeAgo(d.createdAt)}</span>
                </header>

                <blockquote className="report-quote">
                  {d.resumen || "(sin texto)"}
                  {d.enlace && (
                    <Link to={d.enlace} className="mod-open-link">
                      Abrir →
                    </Link>
                  )}
                </blockquote>

                {d.detalle && (
                  <p className="mod-detail">
                    <strong>Detalle:</strong> {d.detalle}
                  </p>
                )}

                <div className="mod-people">
                  {denunciado && (
                    <Link to={`/perfil/${denunciado.username}`} className="mod-person">
                      <UserAvatar user={denunciado} size={28} fontSize={11} />
                      <span>
                        <small>Denunciado</small>
                        @{denunciado.username} <RoleBadge rol={denunciado.rol} />
                      </span>
                      {cuenta && <span className={`pill ${cuenta.clase}`}>{cuenta.texto}</span>}
                    </Link>
                  )}
                  {d.reportante && (
                    <span className="mod-person">
                      <UserAvatar user={d.reportante} size={28} fontSize={11} />
                      <span>
                        <small>Denunció</small>@{d.reportante.username}
                      </span>
                    </span>
                  )}
                  {d.moderador && (
                    <span className="mod-person">
                      <Icon name="shield" size={16} />
                      <span>
                        <small>Atiende</small>@{d.moderador.username}
                      </span>
                    </span>
                  )}
                </div>

                {d.resolucion?.fecha && (
                  <p className="mod-detail">
                    <strong>Resolución:</strong> {d.resolucion.accion === "ninguna" ? "sin sanción" : d.resolucion.accion}
                    {d.resolucion.nota ? ` — ${d.resolucion.nota}` : ""}
                  </p>
                )}

                {pendiente && !puedeSancionar && (
                  <div className="mod-actions">
                    <span className="mod-hint">
                      {esSobreMi
                        ? "Esta denuncia es sobre ti: la atiende otra persona del equipo."
                        : "Solo un administrador atiende denuncias contra moderadores o administradores."}
                    </span>
                  </div>
                )}

                {pendiente && puedeSancionar && (
                  <div className="mod-actions">
                    {d.estado === "abierta" && (
                      <button className="btn btn-secondary btn-sm" onClick={() => tomar(d)}>
                        Tomar
                      </button>
                    )}
                    {OCULTABLES.includes(d.tipo) && !d.contenidoOculto && d.contenidoExiste !== false && puedeSancionar && (
                      <button className="btn btn-danger btn-sm" onClick={() => setAccion({ denuncia: d, tipo: "ocultar" })}>
                        <Icon name="eyeOff" size={13} /> Ocultar
                      </button>
                    )}
                    {puedeSancionar && !cuenta && (
                      <button className="btn btn-danger btn-sm" onClick={() => setAccion({ denuncia: d, tipo: "suspender" })}>
                        Suspender
                      </button>
                    )}
                    {puedeSancionar && esAdmin(user) && denunciado?.activo !== false && (
                      <button className="btn btn-danger btn-sm" onClick={() => setAccion({ denuncia: d, tipo: "banear" })}>
                        Banear
                      </button>
                    )}
                    <button className="btn btn-secondary btn-sm" onClick={() => setAccion({ denuncia: d, tipo: "ninguna" })}>
                      Sin falta
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setAccion({ denuncia: d, tipo: "descartar" })}>
                      Descartar
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {accion && (
        <ModActionDialog
          {...CONFIG_ACCION[accion.tipo]}
          onConfirm={ejecutar}
          onClose={() => setAccion(null)}
        />
      )}
    </>
  );
}

/* --------------------------------------------------------------------------
   Pestaña: disputas de órdenes
   -------------------------------------------------------------------------- */
const FILTROS_DISPUTA = [
  { valor: "abiertas", etiqueta: "Abiertas" },
  { valor: "resueltas", etiqueta: "Resueltas" },
  { valor: "todas", etiqueta: "Todas" },
];

function Disputas({ user }) {
  const [estado, setEstado] = useState("abiertas");
  const [disputas, setDisputas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const data = await apiRequest(`/ordenes/disputas?estado=${estado}`);
      setDisputas(data.disputas);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [estado]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <>
      <div className="filter-row">
        {FILTROS_DISPUTA.map((f) => (
          <button key={f.valor} className={`chip ${estado === f.valor ? "active" : ""}`} onClick={() => setEstado(f.valor)}>
            {f.etiqueta}
          </button>
        ))}
      </div>

      {error && <p className="form-error">{error}</p>}

      {cargando ? (
        <EmptyState icon="bag">Cargando disputas…</EmptyState>
      ) : disputas.length === 0 ? (
        <EmptyState icon="checkCircle">
          {estado === "abiertas" ? "No hay disputas abiertas. Todas las operaciones van bien." : "No hay disputas con este filtro."}
        </EmptyState>
      ) : (
        <div className="mod-list">
          {disputas.map((orden) => (
            <article key={orden._id} className="card mod-card">
              <header className="mod-card-head">
                <span className="pill purple">{orden.tipo === "compra" ? "Compra" : "Intercambio"}</span>
                <span className="pill">{etiquetaEstado(orden.estado)}</span>
                {orden.tipo === "compra" && <span className="pill">{formatMoney(orden.precio)} MXN</span>}
                <Link to={`/ordenes/${orden._id}`} className="mod-open-link">
                  {orden.articulo.titulo} →
                </Link>
              </header>

              <div className="mod-people">
                {[
                  ["Comprador", orden.comprador],
                  ["Vendedor", orden.vendedor],
                ].map(([etiqueta, persona]) => (
                  <Link key={etiqueta} to={`/perfil/${persona.username}`} className="mod-person">
                    <UserAvatar user={persona} size={28} fontSize={11} />
                    <span>
                      <small>{etiqueta}</small>@{persona.username} <RoleBadge rol={persona.rol} />
                    </span>
                  </Link>
                ))}
              </div>

              <DisputePanel
                orden={orden}
                user={user}
                onResolved={() => {
                  avisarContador();
                  cargar();
                }}
              />
            </article>
          ))}
        </div>
      )}
    </>
  );
}

/* --------------------------------------------------------------------------
   Pestaña: usuarios (suspender, banear, cambiar rol)
   -------------------------------------------------------------------------- */
const FILTROS_USUARIO = [
  { valor: "", etiqueta: "Todos" },
  { valor: "suspendidos", etiqueta: "Suspendidos" },
  { valor: "baneados", etiqueta: "Baneados" },
  { valor: "rol:moderador", etiqueta: "Moderadores" },
  { valor: "rol:administrador", etiqueta: "Administradores" },
];

function Usuarios({ user }) {
  const [texto, setTexto] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("");
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [accion, setAccion] = useState(null); // { persona, tipo: "suspender" | "banear" }

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (busqueda) params.set("q", busqueda);
      if (filtro.startsWith("rol:")) params.set("rol", filtro.slice(4));
      else if (filtro) params.set("estado", filtro);
      const data = await apiRequest(`/moderacion/usuarios?${params}`);
      setUsuarios(data.usuarios);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [busqueda, filtro]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function correr(promesa) {
    setError("");
    setMensaje("");
    try {
      const data = await promesa;
      setMensaje(data.mensaje || "Listo");
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  function cambiarRol(persona, rol) {
    if (rol === persona.rol) return;
    correr(apiRequest(`/admin/usuarios/${persona.id}/rol`, { method: "PATCH", body: { rol } }));
  }

  async function ejecutar({ motivo, dias }) {
    const { persona, tipo } = accion;
    const data =
      tipo === "suspender"
        ? await apiRequest(`/moderacion/usuarios/${persona.id}/suspension`, { method: "POST", body: { dias, motivo } })
        : await apiRequest(`/admin/usuarios/${persona.id}/estado`, { method: "PATCH", body: { activo: false, motivo } });
    setMensaje(data.mensaje);
    await cargar();
  }

  return (
    <>
      <form
        className="mod-search"
        onSubmit={(e) => {
          e.preventDefault();
          setBusqueda(texto.trim());
        }}
      >
        <input
          type="search"
          placeholder="Buscar por nombre o @usuario"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          aria-label="Buscar usuarios"
        />
        <button className="btn btn-secondary btn-sm" type="submit">
          <Icon name="search" size={14} /> Buscar
        </button>
      </form>

      <div className="filter-row">
        {FILTROS_USUARIO.map((f) => (
          <button key={f.valor} className={`chip ${filtro === f.valor ? "active" : ""}`} onClick={() => setFiltro(f.valor)}>
            {f.etiqueta}
          </button>
        ))}
      </div>

      {error && <p className="form-error">{error}</p>}
      {mensaje && <p className="mod-ok">{mensaje}</p>}

      {cargando ? (
        <EmptyState icon="users">Cargando usuarios…</EmptyState>
      ) : usuarios.length === 0 ? (
        <EmptyState icon="users">No hay usuarios con este filtro.</EmptyState>
      ) : (
        <div className="mod-table-wrap">
          <table className="mod-table">
            <thead>
              <tr>
                <th>Persona</th>
                <th>Rol</th>
                <th>Estado</th>
                <th className="num">Denuncias</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((p) => {
                const soyYo = String(p.id) === String(user.id);
                const puedeSancionar = !soyYo && (p.rol === "usuario" || esAdmin(user));
                const cuenta = estadoCuenta(p);
                return (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/perfil/${p.username}`} className="mod-person">
                        <UserAvatar user={p} size={30} fontSize={11} />
                        <span>
                          {p.nombre || p.username}
                          <small>@{p.username}</small>
                        </span>
                      </Link>
                    </td>
                    <td>
                      {esAdmin(user) && !soyYo ? (
                        <select
                          className="mod-select"
                          value={p.rol}
                          onChange={(e) => cambiarRol(p, e.target.value)}
                          aria-label={`Rol de @${p.username}`}
                        >
                          {ROLES.map((rol) => (
                            <option key={rol} value={rol}>
                              {ETIQUETA_ROL[rol]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span>
                          {ETIQUETA_ROL[p.rol]} {soyYo && <small className="mod-hint">(tú)</small>}
                        </span>
                      )}
                    </td>
                    <td>
                      {cuenta ? <span className={`pill ${cuenta.clase}`}>{cuenta.texto}</span> : <span className="pill green">Activa</span>}
                    </td>
                    <td className="num">{p.denunciasRecibidas}</td>
                    <td>
                      <div className="mod-actions compact">
                        {puedeSancionar && p.suspendido && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => correr(apiRequest(`/moderacion/usuarios/${p.id}/suspension`, { method: "DELETE" }))}
                          >
                            Levantar suspensión
                          </button>
                        )}
                        {puedeSancionar && !p.suspendido && p.activo && (
                          <button className="btn btn-danger btn-sm" onClick={() => setAccion({ persona: p, tipo: "suspender" })}>
                            Suspender
                          </button>
                        )}
                        {puedeSancionar && esAdmin(user) && p.activo && (
                          <button className="btn btn-danger btn-sm" onClick={() => setAccion({ persona: p, tipo: "banear" })}>
                            Banear
                          </button>
                        )}
                        {puedeSancionar && esAdmin(user) && !p.activo && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => correr(apiRequest(`/admin/usuarios/${p.id}/estado`, { method: "PATCH", body: { activo: true } }))}
                          >
                            Reactivar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {accion && (
        <ModActionDialog
          titulo={accion.tipo === "suspender" ? `Suspender a @${accion.persona.username}` : `Banear a @${accion.persona.username}`}
          descripcion={
            accion.tipo === "suspender"
              ? "No podrá entrar a KollectA durante esos días."
              : "Baja permanente; un administrador puede reactivarla después."
          }
          confirmar={accion.tipo === "suspender" ? "Suspender" : "Banear"}
          peligro
          pedirDias={accion.tipo === "suspender"}
          onConfirm={ejecutar}
          onClose={() => setAccion(null)}
        />
      )}
    </>
  );
}

/* --------------------------------------------------------------------------
   Pestaña: bitácora
   -------------------------------------------------------------------------- */
function Bitacora({ user }) {
  const [accion, setAccion] = useState("");
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setCargando(true);
    apiRequest(`/moderacion/bitacora${accion ? `?accion=${accion}` : ""}`)
      .then((data) => setRegistros(data.registros))
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, [accion]);

  return (
    <>
      <div className="filter-row">
        <span className="mod-hint">
          {esAdmin(user) ? "Ves las acciones de todo el equipo." : "Ves solo tus acciones."}
        </span>
        <select className="mod-select" value={accion} onChange={(e) => setAccion(e.target.value)} aria-label="Filtrar por acción">
          <option value="">Todas las acciones</option>
          {Object.entries(ETIQUETA_ACCION).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="form-error">{error}</p>}

      {cargando ? (
        <EmptyState icon="shield">Cargando bitácora…</EmptyState>
      ) : registros.length === 0 ? (
        <EmptyState icon="shield">Todavía no hay acciones registradas.</EmptyState>
      ) : (
        <ol className="mod-log">
          {registros.map((r) => (
            <li key={r._id}>
              <span className="mod-log-time" title={new Date(r.fecha).toLocaleString("es-MX")}>
                {timeAgo(r.fecha)}
              </span>
              <span>
                <strong>@{r.moderador?.username}</strong> <RoleBadge rol={r.moderador?.rol} /> {ETIQUETA_ACCION[r.accion]?.toLowerCase()}
                {r.usuarioAfectado && (
                  <>
                    {" "}
                    · <Link to={`/perfil/${r.usuarioAfectado.username}`}>@{r.usuarioAfectado.username}</Link>
                  </>
                )}
                {r.motivo && <span className="mod-log-reason">“{r.motivo}”</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

const PESTANAS = [
  { id: "denuncias", etiqueta: "Denuncias" },
  { id: "disputas", etiqueta: "Disputas" },
  { id: "usuarios", etiqueta: "Usuarios" },
  { id: "bitacora", etiqueta: "Bitácora" },
];

export default function ModerationPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const pestana = PESTANAS.some((p) => p.id === params.get("vista")) ? params.get("vista") : "denuncias";

  if (!esModerador(user)) return <Navigate to="/inicio" replace />;

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h2>Moderación</h2>
          <div className="sub">
            Eres {ETIQUETA_ROL[user.rol].toLowerCase()}. Revisa denuncias y disputas de órdenes, oculta contenido y aplica sanciones. Todo queda en la
            bitácora.
          </div>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={pestana === p.id}
            className={`tab ${pestana === p.id ? "active" : ""}`}
            onClick={() => setParams({ vista: p.id }, { replace: true })}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      {pestana === "denuncias" && <ColaDenuncias user={user} />}
      {pestana === "disputas" && <Disputas user={user} />}
      {pestana === "usuarios" && <Usuarios user={user} />}
      {pestana === "bitacora" && <Bitacora user={user} />}
    </main>
  );
}
