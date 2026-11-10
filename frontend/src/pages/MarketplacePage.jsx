import { useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import FilterChips from "../components/FilterChips";
import ProductCard from "../components/ProductCard";
import { PRODUCTS } from "../data/mockData";

const MODE_TABS = [
  { value: "Todos", label: "Todo" },
  { value: "Venta", label: "En venta" },
  { value: "Intercambio", label: "Para intercambio" },
];

const MARKET_GROUPS = ["BTS", "BLACKPINK", "TWICE", "Stray Kids", "SEVENTEEN", "NewJeans", "aespa", "ATEEZ"];

export default function MarketplacePage() {
  const [activeGroup, setActiveGroup] = useState("Todos");
  const [activeMode, setActiveMode] = useState("Todos");

  const items = PRODUCTS.filter(
    (product) =>
      (activeGroup === "Todos" || product.group === activeGroup) && (activeMode === "Todos" || product.mode === activeMode)
  );
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

      <FilterChips options={MARKET_GROUPS} active={activeGroup} onChange={setActiveGroup} allLabel="Todos los grupos" />

      <div className="page-header" style={{ marginBottom: 16 }}>
        <div className="sub">
          {items.length} artículo{plural} encontrado{plural}
        </div>
        <Link to="/vender" className="btn btn-primary btn-sm">
          + Publicar merch
        </Link>
      </div>

      <div className="grid grid-4">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
        {items.length === 0 && <EmptyState icon="search">Sin resultados con estos filtros.</EmptyState>}
      </div>
    </main>
  );
}
