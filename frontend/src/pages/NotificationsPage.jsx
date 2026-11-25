import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";
import Icon from "../components/Icon";

function tiempoTranscurrido(fecha) {
  const segundos = Math.max(
    0,
    Math.floor((Date.now() - new Date(fecha).getTime()) / 1000)
  );

  if (segundos < 60) return "Ahora mismo";
  if (segundos < 3600) return `Hace ${Math.floor(segundos / 60)} min`;
  if (segundos < 86400) return `Hace ${Math.floor(segundos / 3600)} h`;
  return `Hace ${Math.floor(segundos / 86400)} días`;
}

function iconoPorTipo(tipo) {
  const iconos = {
    like: "heart",
    comentario: "message-circle",
    seguidor: "user-plus",
    sistema: "bell",
    orden: "bag",
  };

  return iconos[tipo] || "bell";
}

export default function NotificationsPage() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const cargarNotificaciones = useCallback(async () => {
    try {
      setError("");
      const data = await apiRequest("/notificaciones");
      const recibidas = data.notificaciones || [];
      setNotifications((actuales) => {
        const idsRecibidos = new Set(
          recibidas.map((n) => String(n._id))
        );
        const llegadasEnTiempoReal = actuales.filter(
          (n) => !idsRecibidos.has(String(n._id))
        );

        return [...llegadasEnTiempoReal, ...recibidas]
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 50);
      });
    } catch (err) {
      setError(err.message || "No se pudieron cargar las notificaciones");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarNotificaciones();
  }, [cargarNotificaciones]);

  // Insertar notificaciones nuevas sin recargar la página.
  useEffect(() => {
    function alRecibirNotificacion(event) {
      const nueva = event.detail;
      if (!nueva?._id) return;

      setNotifications((actuales) => {
        if (actuales.some((n) => String(n._id) === String(nueva._id))) {
          return actuales;
        }
        return [nueva, ...actuales].slice(0, 50);
      });
    }

    function alActualizarNotificacion(event) {
      const actualizada = event.detail?.notificacion;
      if (!actualizada?._id) return;

      setNotifications((actuales) =>
        actuales.map((n) =>
          String(n._id) === String(actualizada._id)
            ? { ...n, ...actualizada }
            : n
        )
      );
    }

    function alMarcarTodasLeidas() {
      setNotifications((actuales) =>
        actuales.map((n) => ({ ...n, leida: true }))
      );
    }

    function alEliminarNotificacion(event) {
      const id = event.detail?.id;
      if (!id) return;
      setNotifications((actuales) =>
        actuales.filter((n) => String(n._id) !== String(id))
      );
    }

    window.addEventListener("notificacion:nueva", alRecibirNotificacion);
    window.addEventListener("notificacion:actualizada", alActualizarNotificacion);
    window.addEventListener("notificaciones:leidas-todas", alMarcarTodasLeidas);
    window.addEventListener("notificacion:eliminada", alEliminarNotificacion);

    return () => {
      window.removeEventListener("notificacion:nueva", alRecibirNotificacion);
      window.removeEventListener("notificacion:actualizada", alActualizarNotificacion);
      window.removeEventListener("notificaciones:leidas-todas", alMarcarTodasLeidas);
      window.removeEventListener("notificacion:eliminada", alEliminarNotificacion);
    };
  }, []);

  async function marcarComoLeida(id) {
    try {
      await apiRequest(`/notificaciones/${id}/leida`, {
        method: "PATCH",
      });

      setNotifications((actuales) =>
        actuales.map((n) =>
          n._id === id ? { ...n, leida: true } : n
        )
      );

      window.dispatchEvent(new Event("notificaciones-actualizadas"));
    } catch (err) {
      setError(err.message || "No se pudo marcar como leída");
      throw err;
    }
  }

  async function abrirNotificacion(notification) {
    if (!notification.leida) {
      try {
        await marcarComoLeida(notification._id);
      } catch {
        // Si falla al marcarla como leída, todavía intentamos abrir el enlace.
      }
    }

    if (notification.enlace) {
      navigate(notification.enlace);
    }
  }

  async function borrarNotificacion(event, id) {
    event.stopPropagation();
    try {
      await apiRequest(`/notificaciones/${id}`, { method: "DELETE" });
      setNotifications((actuales) => actuales.filter((n) => n._id !== id));
      window.dispatchEvent(new Event("notificaciones-actualizadas"));
    } catch (err) {
      setError(err.message || "No se pudo borrar la notificación");
    }
  }

  async function marcarTodasComoLeidas() {
    try {
      setSaving(true);
      setError("");

      await apiRequest("/notificaciones/leidas/todas", {
        method: "PATCH",
      });

      setNotifications((actuales) =>
        actuales.map((n) => ({ ...n, leida: true }))
      );

      window.dispatchEvent(new Event("notificaciones-actualizadas"));
    } catch (err) {
      setError(err.message || "No se pudieron marcar como leídas");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h2>Notificaciones</h2>
          <div className="sub">Actividad reciente de tu comunidad</div>
        </div>

        <button
          className="btn btn-ghost btn-sm"
          onClick={marcarTodasComoLeidas}
          disabled={saving || notifications.every((n) => n.leida)}
        >
          {saving ? "Guardando..." : "Marcar todo como leído"}
        </button>
      </div>

      {error && (
        <div role="alert" className="sub notif-error">
          {error}
          <button
            className="btn btn-ghost btn-sm"
            onClick={cargarNotificaciones}
          >
            Reintentar
          </button>
        </div>
      )}

      <div className="card notif-list">
        {loading ? (
          <div className="notif-row">Cargando notificaciones...</div>
        ) : notifications.length === 0 ? (
          <div className="notif-row">
            Todavía no tienes notificaciones.
          </div>
        ) : (
          notifications.map((notification) => {
            const emisor = notification.emisor;
            const nombre =
              emisor?.nombre || emisor?.username || "Alguien";

            return (
              <div
                key={notification._id}
                className={`notif-row ${!notification.leida ? "unread" : ""} ${notification.enlace ? "con-enlace" : ""}`}
                onClick={() => abrirNotificacion(notification)}
                role={notification.enlace ? "link" : undefined}
                tabIndex={notification.enlace ? 0 : undefined}
                onKeyDown={(event) => {
                  if (
                    notification.enlace &&
                    (event.key === "Enter" || event.key === " ")
                  ) {
                    event.preventDefault();
                    abrirNotificacion(notification);
                  }
                }}
              >
                <div className="ic-badge">
                  <Icon name={iconoPorTipo(notification.tipo)} size={18} />
                </div>

                <div className="notif-body">
                  <div className="txt">
                    <b>{nombre}</b>{" "}
                    {notification.mensaje}
                  </div>

                  <div className="time">
                    {tiempoTranscurrido(notification.createdAt)}
                    {!notification.leida && " · Sin leer"}
                  </div>
                </div>

                <button
                  type="button"
                  className="icon-btn notif-delete"
                  title="Borrar notificación"
                  aria-label="Borrar notificación"
                  onClick={(event) => borrarNotificacion(event, notification._id)}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}