export function formatMoney(amount) {
  return "$" + Number(amount).toLocaleString("es-MX");
}

export function getInitials(user) {
  const base = (user && (user.username || user.nombre)) || "U";
  return base.substring(0, 2).toUpperCase();
}

export function timeAgo(dateValue) {
  const seconds = Math.floor((Date.now() - new Date(dateValue).getTime()) / 1000);
  if (seconds < 60) return "justo ahora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} día${days === 1 ? "" : "s"}`;
  return new Date(dateValue).toLocaleDateString("es-MX");
}
