import { Link } from "react-router-dom";
import Avatar from "./Avatar";
import Icon from "./Icon";

export default function GroupCard({ group, following, onToggleFollow }) {
  return (
    <div className="card group-card">
      <Link to={`/grupos/${encodeURIComponent(group.name)}`}>
        <Avatar initials={group.initials} src={group.img} alt={group.name} size={68} fontSize={16} background={group.color} />
        <h4>{group.name}</h4>
      </Link>
      <div className="meta">
        {group.fandom} · debut {group.debut}
      </div>
      <button className={`btn ${following ? "btn-secondary" : "btn-primary"} btn-sm follow-btn`} onClick={onToggleFollow}>
        <Icon name={following ? "checkCircle" : "plus"} size={14} /> {following ? "Siguiendo" : "Seguir"}
      </button>
    </div>
  );
}
