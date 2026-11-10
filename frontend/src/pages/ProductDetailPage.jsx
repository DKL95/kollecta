import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import Icon from "../components/Icon";
import Photo from "../components/Photo";
import { PRODUCTS } from "../data/mockData";
import { apiRequest } from "../api/client";
import { categoryClass, categoryIcon } from "../utils/categories";
import { formatMoney } from "../utils/format";

export default function ProductDetailPage() {
  const { productId } = useParams();
  const navigate = useNavigate();

  const esColeccion = window.location.pathname.startsWith("/articulo/");

  const [articuloColeccion, setArticuloColeccion] = useState(null);
  const [cargando, setCargando] = useState(esColeccion);
  const [error, setError] = useState("");
  const [imagenSeleccionada, setImagenSeleccionada] = useState(0);

  useEffect(() => {
    if (!esColeccion) return;

    let cancelado = false;

    async function cargarArticulo() {
      try {
        setCargando(true);
        setError("");

        const respuesta = await apiRequest(
          `/coleccion/articulos/${productId}`
        );

        if (!cancelado) {
          setArticuloColeccion(respuesta.articulo);
          setImagenSeleccionada(0);
        }
      } catch (err) {
        if (!cancelado) {
          setError(err.message || "No se pudo cargar el artículo.");
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargarArticulo();

    return () => {
      cancelado = true;
    };
  }, [productId, esColeccion]);

  const productoMarketplace = !esColeccion
    ? PRODUCTS.find((item) => String(item.id) === productId)
    : null;

  if (cargando) {
    return (
      <main className="page">
        <div className="detail-loading">
          <span className="detail-loading-dot" />
          Cargando detalles del artículo...
        </div>
      </main>
    );
  }

  if (
    error ||
    (esColeccion && !articuloColeccion) ||
    (!esColeccion && !productoMarketplace)
  ) {
    return (
      <main className="page">
        <EmptyState icon="search">
          {error || "Este artículo no existe o ya no está disponible."}
        </EmptyState>

        <button
          className="btn btn-secondary btn-sm"
          onClick={() =>
            navigate(esColeccion ? "/coleccion" : "/marketplace")
          }
          style={{ marginTop: 16 }}
        >
          Volver
        </button>
      </main>
    );
  }

  const product = esColeccion
    ? {
        id: articuloColeccion._id,
        title: articuloColeccion.titulo,
        group: articuloColeccion.grupo,
        type: articuloColeccion.categoria,
        images: articuloColeccion.imagenes || [],
        img: articuloColeccion.imagenes?.[0] || "",
        description: articuloColeccion.descripcion || "",
        price: Number(articuloColeccion.valorEstimado) || 0,
        tag: articuloColeccion.estado || "Sin especificar",
        mode:
          articuloColeccion.disponibleCompra &&
          articuloColeccion.disponibleIntercambio
            ? "Ambos"
            : articuloColeccion.disponibleIntercambio
              ? "Intercambio"
              : "Venta",
        disponibleCompra: articuloColeccion.disponibleCompra,
        disponibleIntercambio: articuloColeccion.disponibleIntercambio,
      }
    : {
        ...productoMarketplace,
        images: productoMarketplace.img ? [productoMarketplace.img] : [],
      };

  const isTrade = product.mode === "Intercambio";
  const isBoth = product.mode === "Ambos";
  const imagenes = product.images.length ? product.images : [""];

  const imagenPrincipal =
    imagenes[imagenSeleccionada] || imagenes[0] || "";

  return (
    <main className="page product-detail-page">
      <Link
        to={esColeccion ? "/coleccion" : "/marketplace"}
        className="detail-back"
      >
        <span aria-hidden="true">←</span>
        Volver a {esColeccion ? "mi colección" : "marketplace"}
      </Link>

      <div className="detail-grid">
        {/* Galería */}
        <section className="detail-gallery" aria-label="Fotos del artículo">
          <div
            className={`gallery-main detail-gallery-main ${categoryClass(
              product.type
            )}`}
          >
            {imagenPrincipal ? (
              <Photo
                key={imagenPrincipal}
                src={imagenPrincipal}
                alt={product.title}
              />
            ) : (
              <div className="detail-image-placeholder">
                <Icon name={categoryIcon(product.type)} size={58} />
                <span>Sin fotografía</span>
              </div>
            )}

            <span className="gallery-counter">
              {imagenPrincipal ? `${imagenSeleccionada + 1} / ${imagenes.filter(Boolean).length}` : "Sin fotos"}
            </span>
          </div>

          {imagenes.filter(Boolean).length > 1 && (
            <div
              className="gallery-thumbs detail-gallery-thumbs"
              aria-label="Seleccionar fotografía"
            >
              {imagenes.map((imagen, index) => {
                if (!imagen) return null;

                return (
                  <button
                    key={`${imagen}-${index}`}
                    type="button"
                    className={`thumb-sm detail-thumb ${
                      imagenSeleccionada === index ? "active" : ""
                    }`}
                    onClick={() => setImagenSeleccionada(index)}
                    aria-label={`Ver fotografía ${index + 1}`}
                    aria-pressed={imagenSeleccionada === index}
                  >
                    <Photo
                      src={imagen}
                      alt={`${product.title}, foto ${index + 1}`}
                    />
                  </button>
                );
              })}
            </div>
          )}

          {esColeccion && (
            <div className="gallery-note">
              <Icon name="check" size={16} />
              <span>Artículo guardado en tu colección</span>
            </div>
          )}
        </section>

        {/* Información */}
        <section className="detail-information">
          <div className="detail-heading">
            <span className="detail-group">{product.group}</span>

            <h1 className="detail-title">{product.title}</h1>

            <div className="badges-row detail-badges">
              <span className="pill pink">{product.tag}</span>
              <span className="pill purple">{product.type}</span>
              <span className="pill cyan">{product.mode}</span>
            </div>
          </div>

          <div className="detail-price-card">
            {isTrade && !isBoth ? (
              <div className="detail-trade-price">
                <Icon name="repeat" size={22} />
                <span>Disponible para intercambio</span>
              </div>
            ) : (
              <>
                <span className="detail-price-label">
                  {esColeccion ? "Valor estimado" : "Precio"}
                </span>
                <div className="price-block detail-price-block">
                  <span className="amount">
                    {formatMoney(product.price)}
                  </span>
                  <span className="detail-currency">MXN</span>
                </div>
              </>
            )}

            {isBoth && (
              <p className="detail-availability">
                Disponible para compra e intercambio.
              </p>
            )}
          </div>

          {!esColeccion && (
            <div className="trade-toggle detail-trade-toggle">
              <div
                className={`opt ${
                  !isTrade || isBoth ? "active" : ""
                }`}
              >
                Compra directa
              </div>
              <div
                className={`opt ${
                  isTrade || isBoth ? "active" : ""
                }`}
              >
                Propuesta de intercambio
              </div>
            </div>
          )}

          <div className="detail-description">
            <h3>Descripción</h3>
            <p>
              {esColeccion
                ? product.description ||
                  "No se agregó una descripción para este artículo."
                : `Pieza ${String(product.tag || "").toLowerCase()} de ${product.group}.`}
            </p>
          </div>

          <div className="detail-spec-card">
            <h3>Detalles del artículo</h3>

            <div className="spec-list detail-spec-list">
              <div className="spec-row">
                <span>Categoría</span>
                <strong>{product.type}</strong>
              </div>

              <div className="spec-row">
                <span>Estado</span>
                <strong>{product.tag}</strong>
              </div>

              {esColeccion && (
                <>
                  <div className="spec-row">
                    <span>Disponible para compra</span>
                    <strong
                      className={
                        product.disponibleCompra
                          ? "detail-status-yes"
                          : "detail-status-no"
                      }
                    >
                      {product.disponibleCompra ? "Sí" : "No"}
                    </strong>
                  </div>

                  <div className="spec-row">
                    <span>Disponible para intercambio</span>
                    <strong
                      className={
                        product.disponibleIntercambio
                          ? "detail-status-yes"
                          : "detail-status-no"
                      }
                    >
                      {product.disponibleIntercambio ? "Sí" : "No"}
                    </strong>
                  </div>
                </>
              )}
            </div>
          </div>

          {!esColeccion && (
            <div className="detail-actions detail-market-actions">
              <button
                className="btn btn-primary"
                onClick={() => navigate("/mensajes")}
              >
                <Icon name={isTrade ? "repeat" : "chat"} size={16} />
                {isTrade
                  ? "Proponer intercambio"
                  : "Contactar al vendedor"}
              </button>

              <button className="icon-btn" title="Guardar">
                <Icon name="heart" size={16} />
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}