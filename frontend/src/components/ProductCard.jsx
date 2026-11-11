import { Link } from "react-router-dom";
import { UserAvatar } from "./Avatar";
import Icon from "./Icon";
import Photo from "./Photo";
import { categoryClass, categoryIcon } from "../utils/categories";
import { formatMoney } from "../utils/format";

export default function ProductCard({ product }) {
  const isTrade = product.mode === "Intercambio";
  const isBoth = product.mode === "Ambos";

  return (
    <Link className="card product-card" to={`/marketplace/${product.id}`}>
      <div className={`thumb ${categoryClass(product.type)}`}>
        <span className="category-icon">
          <Icon name={categoryIcon(product.type)} size={32} />
        </span>
        <Photo src={product.img} alt={product.title} />
        {product.tag && <span className={`tag pill ${isTrade ? "cyan" : "pink"}`}>{product.tag}</span>}
        {product.esMio && <span className="fav product-mine">Tuyo</span>}
      </div>
      <div className="body">
        <div className="group-name">{product.group}</div>
        <div className="title">{product.title}</div>
        <div className="price-row">
          {isTrade ? (
            <span className="price price--trade">
              <Icon name="repeat" size={14} /> Intercambio
            </span>
          ) : (
            <span className="price">
              {formatMoney(product.price)} <small>MXN</small>
              {isBoth && (
                <span className="price-also" title="También acepta intercambio">
                  <Icon name="repeat" size={12} />
                </span>
              )}
            </span>
          )}
        </div>
        <div className="seller">
          {product.sellerUser ? (
            <UserAvatar user={product.sellerUser} />
          ) : (
            <span className="avatar">{product.sellerInit}</span>
          )}
          <span>@{product.seller}</span>
        </div>
      </div>
    </Link>
  );
}
