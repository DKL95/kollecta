import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState";

export default function NotFoundPage() {
  return (
    <main className="page">
      <EmptyState icon="search">Esta página no existe.</EmptyState>
      <div style={{ textAlign: "center" }}>
        <Link to="/inicio" className="btn btn-primary">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
