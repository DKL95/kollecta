import { Link } from "react-router-dom";
import Icon from "./Icon";
import Photo from "./Photo";
import { categoryClass, categoryIcon } from "../utils/categories";
import { formatMoney } from "../utils/format";

export default function ProductCard({ product }) {
  const isTrade = product.mode === "Intercambio";

  return (
    <Link className="card product-card" to={`/marketplace/${product.id}`}>
      <div className={`thumb ${categoryClass(product.type)}`}>
        <span className="category-icon">
          <Icon name={categoryIcon(product.type)} size={32} />
        </span>
        <Photo src={product.img} alt={product.title} />
        <span className={`tag pill ${isTrade ? "cyan" : "pink"}`}>{product.tag}</span>
        <span className="fav">
          <Icon name="heart" size={14} />
        </span>
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
            </span>
          )}
        </div>
        <div className="seller">
          <span className="avatar">{product.sellerInit}</span>
          <span>@{product.seller}</span>
        </div>
      </div>
    </Link>
  );
}
