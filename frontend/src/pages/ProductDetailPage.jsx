import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import { UserAvatar } from "../components/Avatar";
import EmptyState from "../components/EmptyState";
import Icon from "../components/Icon";
import OrderDialog from "../components/OrderDialog";
import Photo from "../components/Photo";
import { categoryClass, categoryIcon } from "../utils/categories";
import { modalidad } from "../utils/coleccion";
import { formatMoney } from "../utils/format";

// Galería de fotos reutilizada por el detalle de producto y el de pieza de colección.
export function Galeria({ imagenes, titulo, categoria }) {
  const [seleccionada, setSeleccionada] = useState(0);
  const fotos = (imagenes || []).filter(Boolean);
  const principal = fotos[seleccionada] || fotos[0] || "";

  return (
    <>
      <div className={`gallery-main detail-gallery-main ${categoryClass(categoria)}`}>
        {principal ? (
          <Photo key={principal} src={principal} alt={titulo} />
        ) : (
          <div className="detail-image-placeholder">
            <Icon name={categoryIcon(categoria)} size={58} />
            <span>Sin fotografía</span>
          </div>
        )}
        <span className="gallery-counter">{principal ? `${seleccionada + 1} / ${fotos.length}` : "Sin fotos"}</span>
      </div>

      {fotos.length > 1 && (
        <div className="gallery-thumbs detail-gallery-thumbs" aria-label="Seleccionar fotografía">
          {fotos.map((foto, index) => (
            <button
              key={`${foto}-${index}`}
              type="button"
              className={`thumb-sm detail-thumb ${seleccionada === index ? "active" : ""}`}
              onClick={() => setSeleccionada(index)}
              aria-label={`Ver fotografía ${index + 1}`}
              aria-pressed={seleccionada === index}
            >
              <Photo src={foto} alt={`${titulo}, foto ${index + 1}`} />
            </button>
          ))}
        </div>
      )}
    </>
  );
}

const ETIQUETA_ESTADO = { reservado: "Apartado", vendido: "Vendido", retirado: "Retirado" };

// Detalle de un producto del marketplace (/marketplace/:id).
export default function ProductDetailPage() {
  const { productId } = useParams();
  const navigate = useNavigate();

  const [producto, setProducto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [dialogo, setDialogo] = useState(null); // "compra" | "intercambio" | null
  const [reputacion, setReputacion] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [errorAccion, setErrorAccion] = useState("");

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError("");
    apiRequest(`/productos/${productId}`)
      .then((data) => !cancelado && setProducto(data.producto))
      .catch((err) => !cancelado && setError(err.message || "No se pudo cargar el producto."))
      .finally(() => !cancelado && setCargando(false));
    return () => {
      cancelado = true;
    };
  }, [productId]);

  useEffect(() => {
    if (!producto?.vendedor?.username || producto.esMio) return;
    apiRequest(`/ordenes/resumen/${encodeURIComponent(producto.vendedor.username)}`)
      .then(setReputacion)
      .catch(() => setReputacion(null));
  }, [producto]);

  async function retirar() {
    setGuardando(true);
    setErrorAccion("");
    try {
      await apiRequest(`/productos/${producto._id}`, { method: "DELETE" });
      setProducto((actual) => ({ ...actual, estado: "retirado" }));
    } catch (err) {
      setErrorAccion(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function reactivar() {
    setGuardando(true);
    setErrorAccion("");
    try {
      const data = await apiRequest(`/productos/${producto._id}`, { method: "PUT", body: { reactivar: true } });
      setProducto(data.producto);
    } catch (err) {
      setErrorAccion(err.message);
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <main className="page">
        <div className="detail-loading">
          <span className="detail-loading-dot" />
          Cargando producto...
        </div>
      </main>
    );
  }

  if (error || !producto) {
    return (
      <main className="page">
        <EmptyState icon="search">{error || "Este producto no existe o ya no está disponible."}</EmptyState>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate("/marketplace")} style={{ marginTop: 16 }}>
          Volver al marketplace
        </button>
      </main>
    );
  }

  const mode = modalidad(producto);
  const activo = producto.estado === "activo";
  const vendedor = producto.vendedor;

  return (
    <main className="page product-detail-page">
      <Link to="/marketplace" className="detail-back">
        <span aria-hidden="true">←</span> Volver al marketplace
      </Link>

      <div className="detail-grid">
        <section className="detail-gallery" aria-label="Fotos del producto">
          <Galeria imagenes={producto.imagenes} titulo={producto.titulo} categoria={producto.categoria} />

          {vendedor && (
            <Link
              to={producto.esMio ? "/perfil" : `/perfil/${encodeURIComponent(vendedor.username)}`}
              className="gallery-note detail-owner"
            >
              <UserAvatar user={vendedor} size={28} fontSize={11} />
              <span>
                {producto.esMio ? "Publicado por ti" : `Lo vende @${vendedor.username}`}
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

        <section className="detail-information">
          <div className="detail-heading">
            <span className="detail-group">{producto.grupo}</span>
            <h1 className="detail-title">{producto.titulo}</h1>
            <div className="badges-row detail-badges">
              <span className="pill pink">{producto.condicion}</span>
              <span className="pill purple">{producto.categoria}</span>
              <span className="pill cyan">{mode}</span>
              {!activo && <span className="pill">{ETIQUETA_ESTADO[producto.estado]}</span>}
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
                <span className="detail-price-label">Precio</span>
                <div className="price-block detail-price-block">
                  <span className="amount">{formatMoney(producto.precio)}</span>
                  <span className="detail-currency">MXN</span>
                </div>
              </>
            )}
            {mode === "Ambos" && <p className="detail-availability">También acepta intercambio.</p>}
            {producto.busca && <p className="detail-availability">Busca a cambio: {producto.busca}</p>}
          </div>

          <div className="detail-description">
            <h3>Descripción</h3>
            <p>{producto.descripcion || "El vendedor no agregó una descripción."}</p>
          </div>

          <div className="detail-spec-card">
            <h3>Detalles</h3>
            <div className="spec-list detail-spec-list">
              <div className="spec-row">
                <span>Categoría</span>
                <strong>{producto.categoria}</strong>
              </div>
              <div className="spec-row">
                <span>Condición</span>
                <strong>{producto.condicion}</strong>
              </div>
              <div className="spec-row">
                <span>Publicado</span>
                <strong>{new Date(producto.createdAt).toLocaleDateString("es-MX")}</strong>
              </div>
            </div>
          </div>

          {!producto.esMio && (
            <div className="detail-actions detail-market-actions">
              {activo ? (
                <>
                  {producto.disponibleCompra && (
                    <button className="btn btn-primary" onClick={() => setDialogo("compra")}>
                      <Icon name="bag" size={16} />
                      Comprar por {formatMoney(producto.precio)}
                    </button>
                  )}
                  {producto.disponibleIntercambio && (
                    <button
                      className={`btn ${producto.disponibleCompra ? "btn-secondary" : "btn-primary"}`}
                      onClick={() => setDialogo("intercambio")}
                    >
                      <Icon name="repeat" size={16} />
                      Proponer intercambio
                    </button>
                  )}
                </>
              ) : (
                <p className="detail-availability">
                  {producto.estado === "reservado"
                    ? "Está apartado en otra operación. Vuelve más tarde por si se libera."
                    : "Este producto ya no está disponible."}
                </p>
              )}
            </div>
          )}

          {producto.esMio && (
            <div className="detail-owner-actions">
              {producto.estado === "activo" && (
                <>
                  <p className="detail-availability">
                    Está publicado. Las solicitudes llegan a <Link to="/ordenes?vista=ventas">Mis órdenes</Link>.
                  </p>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={retirar} disabled={guardando}>
                    {guardando ? "Guardando..." : "Retirar del marketplace"}
                  </button>
                </>
              )}
              {producto.estado === "reservado" && (
                <p className="detail-availability">
                  Está apartado en una operación. Síguela en <Link to="/ordenes?vista=ventas">Mis órdenes</Link>.
                </p>
              )}
              {producto.estado === "retirado" && (
                <>
                  <p className="detail-availability">Lo retiraste; nadie más lo ve.</p>
                  <button type="button" className="btn btn-primary btn-sm" onClick={reactivar} disabled={guardando}>
                    {guardando ? "Guardando..." : "Volver a publicar"}
                  </button>
                </>
              )}
              {producto.estado === "vendido" && <p className="detail-availability">Vendido. ¡Felicidades!</p>}
            </div>
          )}

          {errorAccion && <p className="form-error">{errorAccion}</p>}
        </section>
      </div>

      {dialogo && (
        <OrderDialog
          tipo={dialogo}
          producto={producto}
          onClose={() => setDialogo(null)}
          onCreated={(orden) => navigate(`/ordenes/${orden._id}`)}
        />
      )}
    </main>
  );
}
