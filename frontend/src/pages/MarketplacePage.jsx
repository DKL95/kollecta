import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";
import EmptyState from "../components/EmptyState";
import FilterChips from "../components/FilterChips";
import ProductCard from "../components/ProductCard";
import { GROUP_NAMES } from "../data/mockData";
import { adaptarArticuloMarketplace } from "../utils/coleccion";

const MODE_TABS = [
  { value: "todos", label: "Todo" },
  { value: "venta", label: "En venta" },
  { value: "intercambio", label: "Para intercambio" },
];

export default function MarketplacePage() {
  const [activeGroup, setActiveGroup] = useState("Todos");
  const [activeMode, setActiveMode] = useState("todos");
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelado = false;
    const params = new URLSearchParams({ tipo: activeMode });
    if (activeGroup !== "Todos") params.set("grupo", activeGroup);

    setCargando(true);
    setError("");
    apiRequest(`/coleccion/marketplace?${params}`)
      .then((data) => {
        if (!cancelado) setItems(data.articulos.map(adaptarArticuloMarketplace));
      })
      .catch((err) => {
        if (!cancelado) {
          setItems([]);
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [activeGroup, activeMode]);

  const plural = items.length === 1 ? "" : "s";

  return (
    <main className="page">
      <div className="tabs">
        {MODE_TABS.map((tab) => (
          <span key={tab.value} className={`tab ${activeMode === tab.value ? "active" : ""}`} onClick={() => setActiveMode(tab.value)}>
            {tab.label}
          </span>
        ))}
      </div>

      <FilterChips options={GROUP_NAMES} active={activeGroup} onChange={setActiveGroup} allLabel="Todos los grupos" />

      <div className="page-header" style={{ marginBottom: 16 }}>
        <div className="sub">
          {cargando ? "Cargando artículos..." : `${items.length} artículo${plural} encontrado${plural}`}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link to="/ordenes" className="btn btn-secondary btn-sm">
            Mis órdenes
          </Link>
          <Link to="/vender" className="btn btn-primary btn-sm">
            + Publicar merch
          </Link>
        </div>
      </div>

      <div className="grid grid-4">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
        {!cargando && items.length === 0 && (
          <EmptyState icon="search">
            {error || "Todavía no hay artículos con estos filtros. ¡Publica uno desde tu colección!"}
          </EmptyState>
        )}
      </div>
    </main>
  );
}
