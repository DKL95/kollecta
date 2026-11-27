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

/* --------------------------------------------------------------------------
   Fechas del chat: separadores por día y fecha corta en la lista de chats.
   -------------------------------------------------------------------------- */

function aFecha(valor) {
  const fecha = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function inicioDelDia(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

// Días completos entre la fecha y hoy (0 = hoy, 1 = ayer...).
function diasDesde(fecha, ahora = new Date()) {
  return Math.round((inicioDelDia(ahora) - inicioDelDia(fecha)) / 86400000);
}

function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function mismoDia(a, b) {
  const fechaA = aFecha(a);
  const fechaB = aFecha(b);
  if (!fechaA || !fechaB) return false;
  return inicioDelDia(fechaA).getTime() === inicioDelDia(fechaB).getTime();
}

export function horaCorta(valor) {
  const fecha = aFecha(valor);
  if (!fecha) return "";
  return fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

// Separador dentro del chat: "Hoy", "Ayer", "Lunes", "12 de noviembre" o "12 de noviembre de 2025".
export function etiquetaDia(valor, ahora = new Date()) {
  const fecha = aFecha(valor);
  if (!fecha) return "";

  const dias = diasDesde(fecha, ahora);
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Ayer";
  if (dias > 1 && dias < 7) {
    return capitalizar(fecha.toLocaleDateString("es-MX", { weekday: "long" }));
  }

  const opciones = { day: "numeric", month: "long" };
  if (fecha.getFullYear() !== ahora.getFullYear()) opciones.year = "numeric";
  return fecha.toLocaleDateString("es-MX", opciones);
}

// Lista de chats: hora si es de hoy, "Ayer", día de la semana o fecha corta.
export function fechaCortaChat(valor, ahora = new Date()) {
  const fecha = aFecha(valor);
  if (!fecha) return "";

  const dias = diasDesde(fecha, ahora);
  if (dias <= 0) return horaCorta(fecha);
  if (dias === 1) return "Ayer";
  if (dias < 7) return capitalizar(fecha.toLocaleDateString("es-MX", { weekday: "short" }).replace(".", ""));
  return fecha.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

// Fecha y hora completas para el texto de ayuda (title) de un mensaje.
export function fechaHoraCompleta(valor) {
  const fecha = aFecha(valor);
  if (!fecha) return "";
  return fecha.toLocaleString("es-MX", { dateStyle: "full", timeStyle: "short" });
}
