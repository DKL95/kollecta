import { useState } from "react";
import { Link } from "react-router-dom";
import CollectionItem from "../components/CollectionItem";
import FilterChips from "../components/FilterChips";
import Icon from "../components/Icon";
import { MY_COLLECTION } from "../data/mockData";
import { formatMoney } from "../utils/format";

export default function CollectionPage() {
  const [filter, setFilter] = useState("Todos");

  const collectionGroups = [...new Set(MY_COLLECTION.map((item) => item.group))];
  const items = MY_COLLECTION.filter((item) => filter === "Todos" || item.group === filter);
  const totalValue = MY_COLLECTION.reduce((total, item) => total + item.value, 0);

  const stats = [
    { label: "Piezas", value: MY_COLLECTION.length },
    { label: "Grupos distintos", value: collectionGroups.length },
    { label: "Intercambios hechos", value: 34 },
    { label: "Valor estimado", value: formatMoney(totalValue), highlight: true },
  ];

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h2>Mi colección</h2>
          <div className="sub">Tu vitrina personal — visible para tus seguidores en tu perfil</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary btn-sm">
            <Icon name="package" size={14} /> Ver estadísticas
          </button>
          <Link to="/vender" className="btn btn-primary btn-sm">
            <Icon name="plus" size={14} /> Agregar pieza
          </Link>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 26 }}>
        {stats.map((stat) => (
          <div className="card side-card" style={{ textAlign: "center" }} key={stat.label}>
            <div className="eyebrow">{stat.label}</div>
            <h3 style={{ fontSize: 26, marginTop: 6 }} className={stat.highlight ? "gradient-text" : ""}>
              {stat.value}
            </h3>
          </div>
        ))}
      </div>

      <FilterChips options={collectionGroups} active={filter} onChange={setFilter} />

      <div className="grid grid-4">
        {items.map((item) => (
          <CollectionItem key={item.id} item={item} />
        ))}
      </div>
    </main>
  );
}
