import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CollectionItem from "../components/CollectionItem";
import FilterChips from "../components/FilterChips";
import Icon from "../components/Icon";
import { apiRequest } from "../api/client";
import { formatMoney } from "../utils/format";

function adaptarArticulo(articulo) {
  return {
    id: articulo._id,
    title: articulo.titulo,
    group: articulo.grupo,
    type: articulo.categoria,
    img: articulo.imagenes?.[0] || "",
    value: Number(articulo.valorEstimado) || 0,
  };
}

export default function CollectionPage() {
  const [articulos, setArticulos] = useState([]);
  const [filter, setFilter] = useState("Todos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelado = false;

    async function cargarColeccion() {
      try {
        setLoading(true);
        setError("");

        const respuesta = await apiRequest("/coleccion");

        const lista = (respuesta.articulos || []).map(adaptarArticulo);

        if (!cancelado) {
          setArticulos(lista);
        }
      } catch (err) {
        if (!cancelado) {
          setError(err.message || "No se pudo cargar tu colección.");
        }
      } finally {
        if (!cancelado) {
          setLoading(false);
        }
      }
    }

    cargarColeccion();

    return () => {
      cancelado = true;
    };
  }, []);

  const collectionGroups = [
    ...new Set(articulos.map((item) => item.group).filter(Boolean)),
  ];

  const items = articulos.filter(
    (item) => filter === "Todos" || item.group === filter
  );

  const totalValue = articulos.reduce(
    (total, item) => total + item.value,
    0
  );

  const stats = [
    { label: "Piezas", value: articulos.length },
    { label: "Grupos distintos", value: collectionGroups.length },
    { label: "Intercambios hechos", value: 0},
    {
      label: "Valor estimado",
      value: formatMoney(totalValue),
      highlight: true,
    },
  ];

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h2>Mi colección</h2>
          <div className="sub">
            Tu vitrina personal — visible para tus seguidores en tu perfil
          </div>
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
          <div
            className="card side-card"
            style={{ textAlign: "center" }}
            key={stat.label}
          >
            <div className="eyebrow">{stat.label}</div>

            <h3
              style={{ fontSize: 26, marginTop: 6 }}
              className={stat.highlight ? "gradient-text" : ""}
            >
              {stat.value}
            </h3>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="card side-card">
          <p>Cargando tu colección...</p>
        </div>
      ) : error ? (
        <div className="card side-card">
          <p role="alert">{error}</p>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => window.location.reload()}
          >
            Volver a intentar
          </button>
        </div>
      ) : articulos.length === 0 ? (
        <div className="card side-card" style={{ textAlign: "center" }}>
          <Icon name="package" size={32} />

          <h3 style={{ marginTop: 12 }}>Tu colección está vacía</h3>

          <p className="sub" style={{ marginTop: 8 }}>
            Agrega tus álbumes, photocards y otros artículos para crear tu
            vitrina personal.
          </p>

          <div style={{ marginTop: 18 }}>
            <Link to="/vender" className="btn btn-primary btn-sm">
              <Icon name="plus" size={14} /> Agregar pieza
            </Link>
          </div>
        </div>
      ) : (
        <>
          <FilterChips
            options={collectionGroups}
            active={filter}
            onChange={setFilter}
          />

          {items.length > 0 ? (
            <div className="grid grid-4">
              {items.map((item) => (
                <CollectionItem key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="card side-card">
              No hay artículos de este grupo.
            </div>
          )}
        </>
      )}
    </main>
  );
}