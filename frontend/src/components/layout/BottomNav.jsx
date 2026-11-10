import { NavLink } from "react-router-dom";
import Icon from "../Icon";
import { BOTTOM_NAV_ITEMS } from "./navItems";

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {BOTTOM_NAV_ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? "active" : "")}>
          <Icon name={item.icon} size={18} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
