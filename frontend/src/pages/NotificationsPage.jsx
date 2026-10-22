import { useState } from "react";
import Icon from "../components/Icon";
import { NOTIFICATIONS } from "../data/mockData";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(NOTIFICATIONS);

  function markAllAsRead() {
    setNotifications(notifications.map((notification) => ({ ...notification, unread: false })));
  }

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h2>Notificaciones</h2>
          <div className="sub">Actividad reciente de tu comunidad</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={markAllAsRead}>
          Marcar todo como leído
        </button>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        {notifications.map((notification) => (
          <div key={notification.id} className={`notif-row ${notification.unread ? "unread" : ""}`}>
            <div className="ic-badge">
              <Icon name={notification.icon} size={18} />
            </div>
            <div>
              <div className="txt">
                <b>{notification.actor}</b> {notification.text}
              </div>
              <div className="time">{notification.time}</div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
