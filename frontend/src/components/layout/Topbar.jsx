
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useNotificacionesNoLeidas from "../../hooks/useNotificacionesNoLeidas";
import { useAuth } from "../../context/AuthContext";
import useDenunciasPendientes from "../../hooks/useDenunciasPendientes";
import useTareasPendientes from "../../hooks/useTareasPendientes";
import { esModerador } from "../../utils/roles";
import { UserAvatar } from "../Avatar";
import Icon from "../Icon";

export default function Topbar({ title, subtitle }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const noLeidas = useNotificacionesNoLeidas();
  const pendientes = useDenunciasPendientes();
  const tareas = useTareasPendientes();

  function handleSearch(event) {
    event.preventDefault();
    navigate(`/buscar?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        {subtitle && <div className="subtitle">{subtitle}</div>}
      </div>

      <form className="search-box" onSubmit={handleSearch}>
        <span>
          <Icon name="search" size={16} />
        </span>
        <input
          type="text"
          placeholder="Buscar grupos, merch o personas…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </form>

      <div className="topbar-actions">
        <Link className="icon-btn topbar-mobile-only" to="/klips" title="Klips">
          <Icon name="klip" size={18} />
        </Link>

        <Link
          className="icon-btn topbar-mobile-only"
          to="/juegos"
          title={tareas > 0 ? `Diversión: ${tareas} tareas por reclamar` : "Tareas, álbum y minijuegos"}
          style={{ position: "relative" }}
        >
          <Icon name="gamepad" size={18} />
          {tareas > 0 && <span className="badge-dot">{tareas > 9 ? "9+" : tareas}</span>}
        </Link>

        <Link className="icon-btn topbar-mobile-only" to="/reportes" title="Reportes">
          <Icon name="chart" size={18} />
        </Link>

        {esModerador(user) && (
          <Link
            className="icon-btn topbar-mobile-only"
            to="/moderacion"
            title={pendientes > 0 ? `${pendientes} denuncias pendientes` : "Moderación"}
            style={{ position: "relative" }}
          >
            <Icon name="shield" size={18} />
            {pendientes > 0 && <span className="badge-dot">{pendientes > 9 ? "9+" : pendientes}</span>}
          </Link>
        )}
        <Link
          className="icon-btn"
          to="/notificaciones"
          title={
            noLeidas > 0
              ? `${noLeidas} notificaciones sin leer`
              : "Notificaciones"
          }
          style={{ position: "relative" }}
        >
          <Icon name="bell" size={18} />

          {noLeidas > 0 && (
            <span className="badge-dot">
              {noLeidas > 9 ? "9+" : noLeidas}
            </span>
          )}
        </Link>

        <Link to="/perfil">
          <UserAvatar user={user} size={38} fontSize={13} />
        </Link>
      </div>
    </header>
  );
}
