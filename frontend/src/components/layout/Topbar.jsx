
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { UserAvatar } from "../Avatar";
import Icon from "../Icon";

export default function Topbar({ title, subtitle }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [noLeidas, setNoLeidas] = useState(0);

  const cargarContador = useCallback(async () => {
    if (!user) {
      setNoLeidas(0);
      return;
    }

    try {
      const data = await apiRequest("/notificaciones");
      setNoLeidas(data.noLeidas || 0);
    } catch (error) {
      console.error("Error al consultar notificaciones:", error);
    }
  }, [user]);

  useEffect(() => {
    cargarContador();

    function actualizar() {
      cargarContador();
    }

    window.addEventListener("notificaciones-actualizadas", actualizar);

    return () => {
      window.removeEventListener(
        "notificaciones-actualizadas",
        actualizar
      );
    };
  }, [cargarContador]);

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
