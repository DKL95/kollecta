import { Link, useNavigate, useParams } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import Icon from "../components/Icon";
import Photo from "../components/Photo";
import { PRODUCTS } from "../data/mockData";
import { categoryClass, categoryIcon } from "../utils/categories";
import { formatMoney } from "../utils/format";

export default function ProductDetailPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const product = PRODUCTS.find((item) => item.id === productId);

  if (!product) {
    return (
      <main className="page">
        <EmptyState icon="search">Este artículo no existe o ya no está disponible.</EmptyState>
      </main>
    );
  }

  const isTrade = product.mode === "Intercambio";

  return (
    <main className="page">
      <Link to="/marketplace" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
        ← Volver al marketplace
      </Link>

      <div className="detail-grid">
        <div>
          <div className={`gallery-main ${categoryClass(product.type)}`} style={{ position: "relative" }}>
            <span className="category-icon">
              <Icon name={categoryIcon(product.type)} size={56} />
            </span>
            <Photo src={product.img} alt={product.title} />
          </div>
          <div className="gallery-thumbs">
            {[categoryIcon(product.type), "package", "tag"].map((iconName, index) => (
              <div key={iconName} className={`thumb-sm card ${categoryClass(product.type)} ${index === 0 ? "active" : ""}`}>
                <Icon name={iconName} size={20} />
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="group-name" style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {product.group}
          </div>
          <h2 style={{ fontSize: 22, marginTop: 6 }}>{product.title}</h2>
          <div className="badges-row" style={{ marginTop: 10 }}>
            <span className="pill pink">{product.tag}</span>
            <span className="pill purple">{product.type}</span>
          </div>

          <div className="price-block">
            {isTrade ? (
              <span className="amount" style={{ color: "var(--cyan)", fontSize: 22, display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Icon name="repeat" size={20} /> Disponible para intercambio
              </span>
            ) : (
              <>
                <span className="amount">{formatMoney(product.price)}</span>
                <span style={{ color: "var(--text-faint)", fontSize: 13 }}>MXN</span>
              </>
            )}
          </div>

          <div className="trade-toggle">
            <div className={`opt ${!isTrade ? "active" : ""}`}>Compra directa</div>
            <div className={`opt ${isTrade ? "active" : ""}`}>Propuesta de intercambio</div>
          </div>

          <p style={{ color: "var(--text-dim)", fontSize: 13.5, lineHeight: 1.6 }}>
            Pieza {product.tag.toLowerCase()} de {product.group}.{" "}
            {isTrade ? "El vendedor busca intercambiarla por otra pieza equivalente." : "Venta directa con envío a todo México."} Consulta con @
            {product.seller} para más fotos o detalles de autenticidad.
          </p>

          <div className="spec-list">
            <div className="spec-row"><span>Categoría</span><span>{product.type}</span></div>
            <div className="spec-row"><span>Estado</span><span>{product.tag}</span></div>
            <div className="spec-row"><span>Envío</span><span>Nacional, 3-5 días hábiles</span></div>
            <div className="spec-row"><span>Publicado</span><span>hace 3 días</span></div>
          </div>

          <div className="detail-actions">
            <button className="btn btn-primary" onClick={() => navigate("/mensajes")}>
              <Icon name={isTrade ? "repeat" : "chat"} size={16} /> {isTrade ? "Proponer intercambio" : "Contactar al vendedor"}
            </button>
            <button className="icon-btn" title="Guardar">
              <Icon name="heart" size={16} />
            </button>
          </div>

          <div className="card seller-card">
            <span className="avatar">{product.sellerInit}</span>
            <div className="info">
              <div className="n">@{product.seller}</div>
              <div className="s">
                <Icon name="starFilled" size={12} /> 4.8 · 56 ventas completadas
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
