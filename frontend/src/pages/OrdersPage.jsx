import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import { UserAvatar } from "../components/Avatar";
import EmptyState from "../components/EmptyState";
import Icon from "../components/Icon";
import Photo from "../components/Photo";
import { formatMoney, timeAgo } from "../utils/format";
import { ESTADOS, etiquetaEstado } from "../utils/ordenes";

const VISTAS = [
  { value: "compras", label: "Mis compras", rol: "comprador" },
  { value: "ventas", label: "Mis ventas", rol: "vendedor" },
];

const FILTROS = [
  { value: "activas", label: "En curso" },
  { value: "", label: "Todas" },
  { value: "completada", label: "Completadas" },
];

export default function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const vista = searchParams.get("vista") === "ventas" ? "ventas" : "compras";
  const [filtro, setFiltro] = useState("activas");
  const [ordenes, setOrdenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelado = false;
    const rol = VISTAS.find((v) => v.value === vista).rol;
    const params = new URLSearchParams({ rol });
    if (filtro) params.set("estado", filtro);

    setCargando(true);
    setError("");
    apiRequest(`/ordenes?${params}`)
      .then((data) => !cancelado && setOrdenes(data.ordenes))
      .catch((err) => !cancelado && setError(err.message))
      .finally(() => !cancelado && setCargando(false));

    return () => {
      cancelado = true;
    };
  }, [vista, filtro]);

  return (
    <main className="page">
      <div className="tabs">
        {VISTAS.map((v) => (
          <span
            key={v.value}
            className={`tab ${vista === v.value ? "active" : ""}`}
            onClick={() => setSearchParams(v.value === "ventas" ? { vista: "ventas" } : {})}
          >
            {v.label}
          </span>
        ))}
      </div>

      <div className="filter-row">
        {FILTROS.map((f) => (
          <span key={f.value} className={`chip ${filtro === f.value ? "active" : ""}`} onClick={() => setFiltro(f.value)}>
            {f.label}
          </span>
        ))}
      </div>

      {cargando ? (
        <p className="sub">Cargando órdenes...</p>
      ) : error ? (
        <EmptyState icon="bag">{error}</EmptyState>
      ) : ordenes.length === 0 ? (
        <EmptyState icon="bag">
          {vista === "compras" ? (
            <>
              No tienes compras aquí. <Link to="/marketplace">Explora el marketplace</Link>.
            </>
          ) : (
            <>
              Aún no recibes solicitudes. Marca piezas de <Link to="/coleccion">tu colección</Link> como disponibles.
            </>
          )}
        </EmptyState>
      ) : (
        <div className="order-list">
          {ordenes.map((orden) => {
            const otra = orden.miRol === "comprador" ? orden.vendedor : orden.comprador;
            return (
              <Link key={orden._id} to={`/ordenes/${orden._id}`} className="card order-row">
                <span className="order-row-thumb">
                  <Photo src={orden.articulo.imagen} alt={orden.articulo.titulo} cover />
                </span>
                <span className="order-row-main">
                  <strong>{orden.articulo.titulo}</strong>
                  <small>
                    <Icon name={orden.tipo === "compra" ? "bag" : "repeat"} size={12} />{" "}
                    {orden.tipo === "compra" ? formatMoney(orden.precio) + " MXN" : "Intercambio"} ·{" "}
                    {timeAgo(orden.updatedAt)}
                  </small>
                </span>
                <span className="order-row-user">
                  <UserAvatar user={otra} size={26} fontSize={10} />
                  <span>@{otra?.username}</span>
                </span>
                <span className={`pill ${ESTADOS[orden.estado]?.pill || ""}`}>{etiquetaEstado(orden.estado)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
