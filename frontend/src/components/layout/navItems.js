export const NAV_SECTIONS = [
  {
    label: "Menú",
    items: [
      { label: "Inicio", icon: "home", to: "/inicio" },
      { label: "Klips", icon: "klip", to: "/klips" },
      { label: "Buscar", icon: "search", to: "/buscar" },
      { label: "Notificaciones", icon: "bell", to: "/notificaciones", count: 3 },
      { label: "Mensajes", icon: "chat", to: "/mensajes", count: 3 },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { label: "Explorar merch", icon: "bag", to: "/marketplace" },
      { label: "Vender / Intercambiar", icon: "plus", to: "/vender" },
      { label: "Mis órdenes", icon: "package", to: "/ordenes" },
    ],
  },
  {
    label: "Comunidad",
    items: [
      { label: "Mi colección", icon: "folder", to: "/coleccion" },
      { label: "Galería 3D", icon: "frame", to: "/galeria", end: true },
      { label: "Grupos", icon: "star", to: "/grupos" },
      { label: "Mi perfil", icon: "user", to: "/perfil", end: true },
      { label: "Ajustes", icon: "settings", to: "/ajustes" },
    ],
  },
  {
    label: "Diversión",
    items: [
      { label: "Tareas", icon: "target", to: "/tareas" },
      { label: "Álbum de estampitas", icon: "card", to: "/estampitas" },
      { label: "Minijuegos", icon: "gamepad", to: "/juegos" },
    ],
  },
  {
    // minRol: solo se muestra a ese rol o superior (el backend valida igual)
    label: "Gestión",
    items: [
      { label: "Reportes", icon: "chart", to: "/reportes" },
      { label: "Moderación", icon: "shield", to: "/moderacion", minRol: "moderador" },
    ],
  },
];

export const BOTTOM_NAV_ITEMS = [
  { label: "Inicio", icon: "home", to: "/inicio" },
  { label: "Tienda", icon: "bag", to: "/marketplace" },
  { label: "Vender", icon: "plus", to: "/vender" },
  { label: "Chats", icon: "chat", to: "/mensajes" },
  { label: "Perfil", icon: "user", to: "/perfil", end: true },
];
