import Icon from "./Icon";
import Photo from "./Photo";
import { categoryClass, categoryIcon } from "../utils/categories";
import { formatMoney } from "../utils/format";

export default function CollectionItem({ item }) {
  return (
    <div className="card collection-item product-card">
      <div className={`thumb ${categoryClass(item.type)}`}>
        <span className="category-icon">
          <Icon name={categoryIcon(item.type)} size={28} />
        </span>
        <Photo src={item.img} alt={item.title} />
      </div>
      <div className="body">
        <div className="meta" style={{ textTransform: "uppercase", fontSize: 10.5, color: "var(--text-faint)", fontWeight: 800 }}>
          {item.group}
        </div>
        <div className="title">{item.title}</div>
        <div className="meta">Valor estimado {formatMoney(item.value)}</div>
      </div>
    </div>
  );
}
