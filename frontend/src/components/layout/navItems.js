export const NAV_SECTIONS = [
  {
    label: "Menú",
    items: [
      { label: "Inicio", icon: "home", to: "/inicio" },
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
    ],
  },
  {
    label: "Comunidad",
    items: [
      { label: "Mi colección", icon: "folder", to: "/coleccion" },
      { label: "Grupos", icon: "star", to: "/grupos" },
      { label: "Mi perfil", icon: "user", to: "/perfil", end: true },
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
