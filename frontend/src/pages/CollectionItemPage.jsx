import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import { UserAvatar } from "../components/Avatar";
import EmptyState from "../components/EmptyState";
import Icon from "../components/Icon";
import { formatMoney } from "../utils/format";
import { Galeria } from "./ProductDetailPage";

// Detalle de una pieza de colección (/articulo/:id). La colección es solo la vitrina:
// aquí no se compra nada. El dueño puede publicar una copia en el marketplace.
export default function CollectionItemPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [articulo, setArticulo] = useState(null);
  const [propietario, setPropietario] = useState(null);
  const [esMio, setEsMio] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    apiRequest(`/coleccion/articulos/${productId}`)
      .then((data) => {
        if (cancelado) return;
        setArticulo(data.articulo);
        setPropietario(data.propietario || null);
        setEsMio(data.esMio === true);
      })
      .catch((err) => !cancelado && setError(err.message || "No se pudo cargar la pieza."))
      .finally(() => !cancelado && setCargando(false));
    return () => {
      cancelado = true;
    };
  }, [productId]);

  if (cargando) {
    return (
      <main className="page">
        <div className="detail-loading">
          <span className="detail-loading-dot" />
          Cargando pieza...
        </div>
      </main>
    );
  }

  if (error || !articulo) {
    return (
      <main className="page">
        <EmptyState icon="search">{error || "Esta pieza no existe."}</EmptyState>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate("/coleccion")} style={{ marginTop: 16 }}>
          Volver
        </button>
      </main>
    );
  }

  const volverA = esMio || !propietario ? "/coleccion" : `/perfil/${encodeURIComponent(propietario.username)}`;
  const volverTexto = esMio || !propietario ? "mi colección" : `la colección de @${propietario.username}`;

  return (
    <main className="page product-detail-page">
      <Link to={volverA} className="detail-back">
        <span aria-hidden="true">←</span> Volver a {volverTexto}
      </Link>

      <div className="detail-grid">
        <section className="detail-gallery" aria-label="Fotos de la pieza">
          <Galeria imagenes={articulo.imagenes} titulo={articulo.titulo} categoria={articulo.categoria} />

          {propietario && (
            <Link to={esMio ? "/perfil" : `/perfil/${encodeURIComponent(propietario.username)}`} className="gallery-note detail-owner">
              <UserAvatar user={propietario} size={28} fontSize={11} />
              <span>{esMio ? "En tu colección" : `En la colección de @${propietario.username}`}</span>
            </Link>
          )}
        </section>

        <section className="detail-information">
          <div className="detail-heading">
            <span className="detail-group">{articulo.grupo}</span>
            <h1 className="detail-title">{articulo.titulo}</h1>
            <div className="badges-row detail-badges">
              <span className="pill pink">{articulo.estado}</span>
              <span className="pill purple">{articulo.categoria}</span>
              <span className="pill">Colección</span>
            </div>
          </div>

          <div className="detail-price-card">
            <span className="detail-price-label">Valor estimado</span>
            <div className="price-block detail-price-block">
              <span className="amount">{formatMoney(articulo.valorEstimado || 0)}</span>
              <span className="detail-currency">MXN</span>
            </div>
          </div>

          <div className="detail-description">
            <h3>Descripción</h3>
            <p>{articulo.descripcion || "No se agregó una descripción."}</p>
          </div>

          <div className="detail-owner-actions">
            <p className="detail-availability">
              Las piezas de la colección no están a la venta.
              {esMio && " Si quieres venderla, publica un anuncio con sus datos:"}
            </p>
            {esMio && (
              <Link to={`/vender?desde=${articulo._id}`} className="btn btn-primary btn-sm">
                <Icon name="tag" size={14} /> Publicar en el marketplace
              </Link>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
