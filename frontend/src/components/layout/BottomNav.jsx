import { NavLink } from "react-router-dom";
import Icon from "../Icon";
import { BOTTOM_NAV_ITEMS } from "./navItems";

export default function BottomNav({ mensajesNoLeidos = 0 }) {
  return (
    <nav className="bottom-nav">
      {BOTTOM_NAV_ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="bottom-nav-icon">
            <Icon name={item.icon} size={18} />
            {item.to === "/mensajes" && mensajesNoLeidos > 0 && (
              <span className="bottom-nav-count" aria-label={`${mensajesNoLeidos} mensajes sin leer`}>
                {mensajesNoLeidos > 9 ? "9+" : mensajesNoLeidos}
              </span>
            )}
          </span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
