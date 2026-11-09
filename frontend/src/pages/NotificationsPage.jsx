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
      setNotifications(data.notificaciones || []);
    } catch (err) {
      setError(err.message || "No se pudieron cargar las notificaciones");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarNotificaciones();
  }, [cargarNotificaciones]);

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
        <div role="alert" className="sub" style={{ marginBottom: 16 }}>
          {error}
          <button
            className="btn btn-ghost btn-sm"
            onClick={cargarNotificaciones}
          >
            Reintentar
          </button>
        </div>
      )}

      <div className="card" style={{ overflow: "hidden" }}>
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
                className={`notif-row ${!notification.leida ? "unread" : ""}`}
                onClick={() => abrirNotificacion(notification)}
                style={{
                  cursor: notification.enlace ? "pointer" : "default",
                }}
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

                <div>
                  <div className="txt">
                    <b>{nombre}</b>{" "}
                    {notification.mensaje}
                  </div>

                  <div className="time">
                    {tiempoTranscurrido(notification.createdAt)}
                    {!notification.leida && " · Sin leer"}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}