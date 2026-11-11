import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import { UserAvatar } from "../components/Avatar";
import EmptyState from "../components/EmptyState";
import Icon from "../components/Icon";
import OrderDialog from "../components/OrderDialog";
import Photo from "../components/Photo";
import { categoryClass, categoryIcon } from "../utils/categories";
import { modalidad } from "../utils/coleccion";
import { formatMoney } from "../utils/format";

// Detalle de un artículo real de una colección. Se llega desde el marketplace
// (/marketplace/:id) o desde una colección (/articulo/:id); cambia solo el "volver".
export default function ProductDetailPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const desdeMarketplace = location.pathname.startsWith("/marketplace/");

  const [articulo, setArticulo] = useState(null);
  const [propietario, setPropietario] = useState(null);
  const [esMio, setEsMio] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [imagenSeleccionada, setImagenSeleccionada] = useState(0);
  const [dialogo, setDialogo] = useState(null); // "compra" | "intercambio" | null
  const [reputacion, setReputacion] = useState(null);
  const [guardandoVenta, setGuardandoVenta] = useState(false);
  const [errorVenta, setErrorVenta] = useState("");

  async function quitarDeLaVenta() {
    setGuardandoVenta(true);
    setErrorVenta("");
    try {
      const data = await apiRequest(`/coleccion/articulos/${articulo._id}`, {
        method: "PUT",
        body: { disponibleCompra: false, disponibleIntercambio: false },
      });
      setArticulo((actual) => ({ ...actual, ...data.articulo, precioVenta: actual.precioVenta }));
    } catch (err) {
      setErrorVenta(err.message);
    } finally {
      setGuardandoVenta(false);
    }
  }

  useEffect(() => {
    let cancelado = false;

    async function cargarArticulo() {
      try {
        setCargando(true);
        setError("");
        const respuesta = await apiRequest(`/coleccion/articulos/${productId}`);
        if (cancelado) return;
        setArticulo(respuesta.articulo);
        setPropietario(respuesta.propietario || null);
        setEsMio(respuesta.esMio === true);
        setImagenSeleccionada(0);
      } catch (err) {
        if (!cancelado) setError(err.message || "No se pudo cargar el artículo.");
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargarArticulo();
    return () => {
      cancelado = true;
    };
  }, [productId]);

  // Reputación del vendedor (solo si el artículo está a la venta o para intercambio).
  useEffect(() => {
    if (!propietario?.username || esMio) return;
    apiRequest(`/ordenes/resumen/${encodeURIComponent(propietario.username)}`)
      .then(setReputacion)
      .catch(() => setReputacion(null));
  }, [propietario, esMio]);

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

  if (error || !articulo) {
    return (
      <main className="page">
        <EmptyState icon="search">{error || "Este artículo no existe o ya no está disponible."}</EmptyState>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => navigate(desdeMarketplace ? "/marketplace" : "/coleccion")}
          style={{ marginTop: 16 }}
        >
          Volver
        </button>
      </main>
    );
  }

  const mode = modalidad(articulo);
  const enMercado = articulo.disponibleCompra || articulo.disponibleIntercambio;
  const precio = Number(articulo.precioVenta ?? articulo.valorEstimado) || 0;
  const coleccionAjena = !esMio && propietario;

  const volverA = desdeMarketplace
    ? "/marketplace"
    : coleccionAjena
      ? `/perfil/${encodeURIComponent(propietario.username)}`
      : "/coleccion";
  const volverTexto = desdeMarketplace
    ? "marketplace"
    : coleccionAjena
      ? `la colección de @${propietario.username}`
      : "mi colección";

  const imagenes = (articulo.imagenes || []).filter(Boolean);
  const imagenPrincipal = imagenes[imagenSeleccionada] || imagenes[0] || "";

  return (
    <main className="page product-detail-page">
      <Link to={volverA} className="detail-back">
        <span aria-hidden="true">←</span>
        Volver a {volverTexto}
      </Link>

      <div className="detail-grid">
        {/* Galería */}
        <section className="detail-gallery" aria-label="Fotos del artículo">
          <div className={`gallery-main detail-gallery-main ${categoryClass(articulo.categoria)}`}>
            {imagenPrincipal ? (
              <Photo key={imagenPrincipal} src={imagenPrincipal} alt={articulo.titulo} />
            ) : (
              <div className="detail-image-placeholder">
                <Icon name={categoryIcon(articulo.categoria)} size={58} />
                <span>Sin fotografía</span>
              </div>
            )}

            <span className="gallery-counter">
              {imagenPrincipal ? `${imagenSeleccionada + 1} / ${imagenes.length}` : "Sin fotos"}
            </span>
          </div>

          {imagenes.length > 1 && (
            <div className="gallery-thumbs detail-gallery-thumbs" aria-label="Seleccionar fotografía">
              {imagenes.map((imagen, index) => (
                <button
                  key={`${imagen}-${index}`}
                  type="button"
                  className={`thumb-sm detail-thumb ${imagenSeleccionada === index ? "active" : ""}`}
                  onClick={() => setImagenSeleccionada(index)}
                  aria-label={`Ver fotografía ${index + 1}`}
                  aria-pressed={imagenSeleccionada === index}
                >
                  <Photo src={imagen} alt={`${articulo.titulo}, foto ${index + 1}`} />
                </button>
              ))}
            </div>
          )}

          {propietario && (
            <Link
              to={esMio ? "/perfil" : `/perfil/${encodeURIComponent(propietario.username)}`}
              className="gallery-note detail-owner"
            >
              <UserAvatar user={propietario} size={28} fontSize={11} />
              <span>
                {esMio ? "En tu colección" : `En la colección de @${propietario.username}`}
                {reputacion?.operaciones > 0 && (
                  <small className="detail-reputation">
                    {reputacion.promedio ? ` · ★ ${reputacion.promedio}` : ""} · {reputacion.operaciones} operación
                    {reputacion.operaciones === 1 ? "" : "es"}
                  </small>
                )}
              </span>
            </Link>
          )}
        </section>

        {/* Información */}
        <section className="detail-information">
          <div className="detail-heading">
            <span className="detail-group">{articulo.grupo}</span>
            <h1 className="detail-title">{articulo.titulo}</h1>
            <div className="badges-row detail-badges">
              <span className="pill pink">{articulo.estado || "Sin especificar"}</span>
              <span className="pill purple">{articulo.categoria}</span>
              {enMercado && <span className="pill cyan">{mode}</span>}
              {articulo.reservado && <span className="pill">Apartado</span>}
            </div>
          </div>

          <div className="detail-price-card">
            {mode === "Intercambio" ? (
              <div className="detail-trade-price">
                <Icon name="repeat" size={22} />
                <span>Disponible para intercambio</span>
              </div>
            ) : (
              <>
                <span className="detail-price-label">
                  {articulo.disponibleCompra ? "Precio" : "Valor estimado"}
                </span>
                <div className="price-block detail-price-block">
                  <span className="amount">{formatMoney(articulo.disponibleCompra ? precio : articulo.valorEstimado || 0)}</span>
                  <span className="detail-currency">MXN</span>
                </div>
              </>
            )}

            {mode === "Ambos" && <p className="detail-availability">Disponible para compra e intercambio.</p>}
          </div>

          <div className="detail-description">
            <h3>Descripción</h3>
            <p>{articulo.descripcion || "No se agregó una descripción para este artículo."}</p>
          </div>

          <div className="detail-spec-card">
            <h3>Detalles del artículo</h3>
            <div className="spec-list detail-spec-list">
              <div className="spec-row">
                <span>Categoría</span>
                <strong>{articulo.categoria}</strong>
              </div>
              <div className="spec-row">
                <span>Estado</span>
                <strong>{articulo.estado}</strong>
              </div>
              <div className="spec-row">
                <span>Disponible para compra</span>
                <strong className={articulo.disponibleCompra ? "detail-status-yes" : "detail-status-no"}>
                  {articulo.disponibleCompra ? "Sí" : "No"}
                </strong>
              </div>
              <div className="spec-row">
                <span>Disponible para intercambio</span>
                <strong className={articulo.disponibleIntercambio ? "detail-status-yes" : "detail-status-no"}>
                  {articulo.disponibleIntercambio ? "Sí" : "No"}
                </strong>
              </div>
            </div>
          </div>

          {!esMio && enMercado && (
            <div className="detail-actions detail-market-actions">
              {articulo.reservado ? (
                <p className="detail-availability">
                  Este artículo está apartado en otra operación. Vuelve más tarde por si se libera.
                </p>
              ) : (
                <>
                  {articulo.disponibleCompra && (
                    <button className="btn btn-primary" onClick={() => setDialogo("compra")}>
                      <Icon name="bag" size={16} />
                      Comprar por {formatMoney(precio)}
                    </button>
                  )}
                  {articulo.disponibleIntercambio && (
                    <button
                      className={`btn ${articulo.disponibleCompra ? "btn-secondary" : "btn-primary"}`}
                      onClick={() => setDialogo("intercambio")}
                    >
                      <Icon name="repeat" size={16} />
                      Proponer intercambio
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {esMio && enMercado && (
            <div className="detail-owner-actions">
              <p className="detail-availability">
                {articulo.reservado
                  ? "Está apartado en una operación. Síguela en "
                  : "Este artículo aparece en el marketplace. Las solicitudes llegan a "}
                <Link to="/ordenes?vista=ventas">Mis órdenes</Link>.
              </p>
              {!articulo.reservado && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={quitarDeLaVenta} disabled={guardandoVenta}>
                  {guardandoVenta ? "Guardando..." : "Quitar de la venta"}
                </button>
              )}
            </div>
          )}

          {esMio && !enMercado && (
            <div className="detail-owner-actions">
              <p className="detail-availability">Esta pieza está solo en tu colección; nadie puede comprarla.</p>
              <Link to={`/vender?articulo=${articulo._id}`} className="btn btn-primary btn-sm">
                <Icon name="tag" size={14} /> Poner a la venta
              </Link>
            </div>
          )}

          {errorVenta && <p className="form-error">{errorVenta}</p>}
        </section>
      </div>

      {dialogo && (
        <OrderDialog
          tipo={dialogo}
          articulo={articulo}
          precio={precio}
          vendedor={propietario}
          onClose={() => setDialogo(null)}
          onCreated={(orden) => navigate(`/ordenes/${orden._id}`)}
        />
      )}
    </main>
  );
}
