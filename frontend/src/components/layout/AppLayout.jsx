import { useEffect } from "react";
import { Navigate, Outlet, useLocation, useMatches } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BottomNav from "./BottomNav";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

// Estructura de las pantallas internas. Si no hay sesión, manda al login.
export default function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const matches = useMatches();
  const handle = [...matches].reverse().find((match) => match.handle)?.handle || {};

  useEffect(() => {
    document.title = handle.title ? `KollectA — ${handle.title}` : "KollectA";
  }, [handle.title]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-col">
        <Topbar title={handle.title} subtitle={handle.subtitle} />
        <Outlet />
        <BottomNav />
      </div>
    </div>
  );
}
