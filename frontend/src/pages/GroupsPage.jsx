import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import Avatar from "../components/Avatar";
import EmptyState from "../components/EmptyState";
import GroupCard from "../components/GroupCard";
import GroupRequestDialog from "../components/GroupRequestDialog";
import Icon from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import useFollowedGroups from "../hooks/useFollowedGroups";
import useGrupos from "../hooks/useGrupos";
import { timeAgo } from "../utils/format";
import { ESTADO_SOLICITUD_GRUPO, esModerador } from "../utils/roles";

const VISTAS = ["todos", "siguiendo", "solicitudes"];

function MisSolicitudes({ solicitudes, cargando, error, onCancelar }) {
  if (cargando) return <EmptyState icon="star">Cargando tus solicitudes…</EmptyState>;
  if (error) return <EmptyState icon="close">{error}</EmptyState>;
  if (solicitudes.length === 0) {
    return <EmptyState icon="star">No has solicitado grupos. Si falta el tuyo, usa "Solicitar grupo".</EmptyState>;
  }

  return (
    <div className="mod-list" style={{ maxWidth: 720 }}>
      {solicitudes.map((s) => {
        const estado = ESTADO_SOLICITUD_GRUPO[s.estado];
        return (
          <article key={s._id} className="card mod-card group-request-card">
            <header className="mod-card-head">
              <Avatar initials={s.iniciales} src={s.imagen} alt={s.nombre} background={s.color} size={36} fontSize={12} />
              <strong>{s.nombre}</strong>
              <span className={`pill ${estado.clase}`}>{estado.etiqueta}</span>
              <span className="mod-card-time">Enviada {timeAgo(s.fechaCreacion)}</span>
            </header>
            <div className="mod-hint">
              {[s.fandom && `Fandom: ${s.fandom}`, s.agencia, s.debut && `debut ${s.debut}`].filter(Boolean).join(" · ") || "Sin más datos"}
            </div>
            {s.estado === "rechazado" && s.motivoRechazo && <p className="group-request-reason">Motivo: {s.motivoRechazo}</p>}
            {s.estado === "pendiente" && (
              <div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onCancelar(s)}>
                  Cancelar solicitud
                </button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

export default function GroupsPage() {
  const { user } = useAuth();
  const directo = esModerador(user);
  const { followed, isFollowing, toggleFollow } = useFollowedGroups();
  const { grupos, cargando } = useGrupos();
  const [params, setParams] = useSearchParams();
  const vista = VISTAS.includes(params.get("vista")) ? params.get("vista") : "todos";
  const [dialogo, setDialogo] = useState(false);

  const [solicitudes, setSolicitudes] = useState([]);
  const [cargandoSolicitudes, setCargandoSolicitudes] = useState(true);
  const [errorSolicitudes, setErrorSolicitudes] = useState("");

  const cargarSolicitudes = useCallback(() => {
    setErrorSolicitudes("");
    return apiRequest("/grupos/solicitudes/mias")
      .then((data) => setSolicitudes(data.solicitudes))
      .catch((err) => setErrorSolicitudes(err.message))
      .finally(() => setCargandoSolicitudes(false));
  }, []);

  useEffect(() => {
    cargarSolicitudes();
  }, [cargarSolicitudes]);

  async function cancelar(solicitud) {
    try {
      await apiRequest(`/grupos/solicitudes/${solicitud._id}`, { method: "DELETE" });
      setSolicitudes((actuales) => actuales.filter((s) => s._id !== solicitud._id));
    } catch (err) {
      setErrorSolicitudes(err.message);
      cargarSolicitudes();
    }
  }

  // Los moderadores crean directo: su pestaña de solicitudes solo aparece si alguna vez pidieron uno.
  const verSolicitudes = !directo || solicitudes.length > 0;
  const pendientes = solicitudes.filter((s) => s.estado === "pendiente").length;
  const tabs = [
    { id: "todos", etiqueta: "Todos" },
    { id: "siguiendo", etiqueta: `Siguiendo (${followed.length})` },
    ...(verSolicitudes ? [{ id: "solicitudes", etiqueta: `Mis solicitudes${pendientes ? ` (${pendientes})` : ""}` }] : []),
  ];
  const lista = vista === "siguiendo" ? grupos.filter((group) => isFollowing(group.name)) : grupos;

  return (
    <main className="page">
      <div className="groups-toolbar">
        <div className="tabs" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={vista === tab.id}
              className={`tab ${vista === tab.id ? "active" : ""}`}
              onClick={() => setParams(tab.id === "todos" ? {} : { vista: tab.id }, { replace: true })}
            >
              {tab.etiqueta}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setDialogo(true)}>
          <Icon name="plus" size={14} /> {directo ? "Agregar grupo" : "Solicitar grupo"}
        </button>
      </div>

      {vista === "solicitudes" ? (
        <MisSolicitudes solicitudes={solicitudes} cargando={cargandoSolicitudes} error={errorSolicitudes} onCancelar={cancelar} />
      ) : (
        <div className="grid grid-4">
          {lista.map((group) => (
            <GroupCard key={group.id} group={group} following={isFollowing(group.name)} onToggleFollow={() => toggleFollow(group.name)} />
          ))}
          {cargando && <EmptyState icon="star">Cargando grupos…</EmptyState>}
          {!cargando && lista.length === 0 && (
            <EmptyState icon="star">{vista === "siguiendo" ? "Todavía no sigues a ningún grupo." : "No se pudieron cargar los grupos."}</EmptyState>
          )}
        </div>
      )}

      {dialogo && (
        <GroupRequestDialog
          directo={directo}
          onClose={() => setDialogo(false)}
          onCreated={(grupo) => {
            if (grupo.estado === "pendiente") setSolicitudes((actuales) => [grupo, ...actuales]);
          }}
        />
      )}
    </main>
  );
}
