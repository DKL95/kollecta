import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { UserAvatar } from "../Avatar";
import Icon from "../Icon";
import { NAV_SECTIONS } from "./navItems";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <aside className="sidebar">
      <Link className="brand-lockup" to="/inicio">
        <span className="mark">K</span>
        <span>
          Kollect<span className="gradient-text">A</span>
        </span>
      </Link>

      {NAV_SECTIONS.map((section) => (
        <div className="nav-group" key={section.label}>
          <div className="nav-label">{section.label}</div>
          {section.items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <span className="ic">
                <Icon name={item.icon} size={18} />
              </span>
              <span>{item.label}</span>
              {item.count && <span className="count">{item.count}</span>}
            </NavLink>
          ))}
        </div>
      ))}

      <div className="sidebar-cta">
        <h4>¿Nueva pieza en tu colección?</h4>
        <p>Publícala en segundos y encuentra comprador o intercambio.</p>
        <Link className="btn btn-primary btn-sm btn-block" to="/vender">
          Publicar merch
        </Link>
      </div>

      <div className="sidebar-user">
        <UserAvatar user={user} size={38} fontSize={13} />
        <div className="info">
          <div className="name">{user.nombre || user.username}</div>
          <div className="handle">@{user.username}</div>
        </div>
        <button id="logout-btn" title="Cerrar sesión" onClick={handleLogout}>
          <Icon name="power" size={16} />
        </button>
      </div>
    </aside>
  );
}
