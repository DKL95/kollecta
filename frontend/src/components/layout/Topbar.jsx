import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { UserAvatar } from "../Avatar";
import Icon from "../Icon";

export default function Topbar({ title, subtitle }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

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
        <input type="text" placeholder="Buscar grupos, merch o personas…" value={query} onChange={(event) => setQuery(event.target.value)} />
      </form>
      <div className="topbar-actions">
        <Link className="icon-btn" to="/notificaciones" title="Notificaciones">
          <Icon name="bell" size={18} />
          <span className="badge-dot"></span>
        </Link>
        <Link to="/perfil">
          <UserAvatar user={user} size={38} fontSize={13} />
        </Link>
      </div>
    </header>
  );
}
