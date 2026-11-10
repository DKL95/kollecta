import Icon from "./Icon";

export default function EmptyState({ icon = "folder", children }) {
  return (
    <div className="empty-state">
      <Icon name={icon} size={32} />
      <p>{children}</p>
    </div>
  );
}
