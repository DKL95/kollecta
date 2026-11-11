import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";
import Photo from "./Photo";

// Elegir una pieza de mi colección que todavía no esté a la venta ni apartada.
export default function CollectionPickerDialog({ onClose, onPick }) {
  const [articulos, setArticulos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    apiRequest("/coleccion")
      .then((data) =>
        setArticulos(
          (data.articulos || []).filter(
            (a) => !a.reservadoPor && !a.disponibleCompra && !a.disponibleIntercambio
          )
        )
      )
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    function alPresionarTecla(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", alPresionarTecla);
    return () => document.removeEventListener("keydown", alPresionarTecla);
  }, [onClose]);

  const texto = filtro.trim().toLowerCase();
  const visibles = texto
    ? articulos.filter((a) => `${a.titulo} ${a.grupo} ${a.categoria}`.toLowerCase().includes(texto))
    : articulos;

  return (
    <div className="group-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="group-dialog order-dialog" role="dialog" aria-modal="true" aria-labelledby="picker-title">
        <div className="group-dialog-head">
          <h3 id="picker-title">Añadir artículo de la colección</h3>
          <button type="button" className="group-dialog-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        <div className="group-dialog-body">
          <p className="order-disclaimer">
            Elige una pieza: sus datos y fotos se pasan al formulario y, al publicar, esa misma pieza se pone a la venta
            (no se crea una copia).
          </p>

          {articulos.length > 6 && (
            <label className="group-field">
              <input
                type="search"
                placeholder="Buscar en mi colección..."
                value={filtro}
                onChange={(event) => setFiltro(event.target.value)}
                autoFocus
              />
            </label>
          )}

          {cargando ? (
            <p className="messages-search-status">Cargando tu colección...</p>
          ) : error ? (
            <p className="form-error">{error}</p>
          ) : articulos.length === 0 ? (
            <p className="messages-search-status">
              No tienes piezas disponibles: todas ya están a la venta o tu colección está vacía.{" "}
              <Link to="/coleccion/agregar" onClick={onClose}>
                Agregar una pieza
              </Link>
            </p>
          ) : (
            <div className="order-offer-grid">
              {visibles.map((articulo) => (
                <button
                  type="button"
                  key={articulo._id}
                  className="order-offer"
                  onClick={() => onPick(articulo)}
                >
                  <span className="order-offer-thumb">
                    <Photo src={articulo.imagenes?.[0]} alt={articulo.titulo} cover />
                  </span>
                  <span className="order-offer-title">{articulo.titulo}</span>
                  <small className="picker-group">{articulo.grupo}</small>
                </button>
              ))}
              {visibles.length === 0 && <p className="messages-search-status">Nada coincide con "{filtro}".</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
