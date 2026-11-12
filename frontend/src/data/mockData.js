/* ==========================================================================
   Datos de ejemplo para las secciones que todavía no tienen backend
   (catálogo de grupos). El marketplace y la colección ya
   vienen de la base de datos.
   Usuarios y publicaciones ya vienen de la base de datos.
   ========================================================================== */

export const GROUPS = [
  { name: "BTS", fandom: "ARMY", agency: "HYBE / BIGHIT MUSIC", members: 7, debut: 2013, color: "linear-gradient(135deg,#7c3aed,#a78bfa)", initials: "BTS", img: "/assets/img/groups/bts.jpg" },
  { name: "BLACKPINK", fandom: "BLINK", agency: "YG Entertainment", members: 4, debut: 2016, color: "linear-gradient(135deg,#ff5da2,#111827)", initials: "BP", img: "/assets/img/groups/blackpink.jpg" },
  { name: "TWICE", fandom: "ONCE", agency: "JYP Entertainment", members: 9, debut: 2015, color: "linear-gradient(135deg,#ff9ecb,#ffe066)", initials: "TW", img: "/assets/img/groups/twice.jpg" },
  { name: "Stray Kids", fandom: "STAY", agency: "JYP Entertainment", members: 8, debut: 2018, color: "linear-gradient(135deg,#ef4444,#171717)", initials: "SKZ", img: "/assets/img/groups/stray-kids.jpg" },
  { name: "SEVENTEEN", fandom: "CARAT", agency: "PLEDIS Entertainment", members: 13, debut: 2015, color: "linear-gradient(135deg,#fb923c,#fbbf24)", initials: "SVT", img: "/assets/img/groups/seventeen.jpg" },
  { name: "NewJeans", fandom: "Bunnies", agency: "ADOR / HYBE", members: 5, debut: 2022, color: "linear-gradient(135deg,#60a5fa,#e0f2fe)", initials: "NJ", img: "/assets/img/groups/newjeans.jpg" },
  { name: "aespa", fandom: "MY", agency: "SM Entertainment", members: 4, debut: 2020, color: "linear-gradient(135deg,#22d3ee,#4338ca)", initials: "AE", img: "/assets/img/groups/aespa.jpg" },
  { name: "ATEEZ", fandom: "ATINY", agency: "KQ Entertainment", members: 8, debut: 2018, color: "linear-gradient(135deg,#f43f5e,#1e293b)", initials: "ATZ", img: "/assets/img/groups/ateez.jpg" },
  { name: "ITZY", fandom: "MIDZY", agency: "JYP Entertainment", members: 5, debut: 2019, color: "linear-gradient(135deg,#facc15,#ef4444)", initials: "ITZY", img: "/assets/img/groups/itzy.jpg" },
  { name: "TXT", fandom: "MOA", agency: "HYBE / BIGHIT MUSIC", members: 5, debut: 2019, color: "linear-gradient(135deg,#34d399,#0ea5e9)", initials: "TXT", img: "/assets/img/groups/txt.jpg" },
  { name: "ILLIT", fandom: "GLLIT", agency: "BELIFT LAB", members: 5, debut: 2024, color: "linear-gradient(135deg, #f472b6, #a78bfa)", initials: "ILLIT", img: "/assets/img/groups/illit.jpg"},
  // Sin foto todavía: se ven con sus iniciales sobre el degradado (Photo oculta la imagen que no existe).
  { name: "LE SSERAFIM", fandom: "FEARNOT", agency: "SOURCE MUSIC / HYBE", members: 5, debut: 2022, color: "linear-gradient(135deg, #1e293b, #e2e8f0)", initials: "LSF", img: "/assets/img/groups/le-sserafim.jpg" },
  { name: "BABYMONSTER", fandom: "MONSTIEZ", agency: "YG Entertainment", members: 7, debut: 2024, color: "linear-gradient(135deg, #111827, #ef4444)", initials: "BM", img: "/assets/img/groups/babymonster.jpg" },
];

export const GROUP_NAMES = GROUPS.map((group) => group.name);

// Deben coincidir con el enum "categoria" de models/Coleccion.js.
export const CATEGORIES = ["Photocard", "Álbum", "Lightstick", "Merch", "Poster", "Otro"];

export const THREADS = [
  {
    name: "Mina Cardona", initials: "MC", time: "10:32", unread: 2, online: true,
    messages: [
      { mine: false, text: "Hola, vi tu photocard de Jimin, ¿sigue disponible?" },
      { mine: true, text: "¡Hola! Sí, todavía la tengo." },
      { mine: false, text: "¿Aceptas $250 en vez de $280?" },
      { mine: true, text: "Te la dejo en $265 y va con funda protectora." },
    ],
  },
  {
    name: "Diego Norte", initials: "SN", time: "09:15", unread: 0, online: true,
    messages: [
      { mine: false, text: "Va el intercambio, te mando la mía primero." },
      { mine: true, text: "Perfecto, en cuanto la reciba te mando la mía." },
    ],
  },
  {
    name: "Caro Ximénez", initials: "CX", time: "Ayer", unread: 0, online: false,
    messages: [
      { mine: false, text: "Nos vemos el sábado en la reunión." },
      { mine: true, text: "Ahí estaré, llevo mi colección de SEVENTEEN." },
    ],
  },
  {
    name: "Sofía Nena", initials: "BN", time: "Ayer", unread: 0, online: false,
    messages: [
      { mine: false, text: "Gracias, ya llegó el paquete." },
      { mine: true, text: "Qué bueno, espero disfrutes tu photocard." },
    ],
  },
  {
    name: "Ale Bunny", initials: "AB", time: "Lun", unread: 1, online: true,
    messages: [{ mine: false, text: "Escribiendo…" }],
  },
];

export const NOTIFICATIONS = [
  { id: 1, icon: "heart", actor: "Mina Cardona", text: "le dio like a tu publicación de Photocard Suga.", time: "hace 5 min", unread: true },
  { id: 2, icon: "repeat", actor: "Diego Norte", text: "propuso un intercambio por tu Lightstick Ver.3.", time: "hace 22 min", unread: true },
  { id: 3, icon: "users", actor: "Caro Ximénez", text: "te empezó a seguir.", time: "hace 1 h", unread: true },
  { id: 4, icon: "chat", actor: "Sofía Nena", text: "te envió un mensaje nuevo.", time: "hace 3 h", unread: false },
  { id: 5, icon: "package", actor: "Tu pedido #KA-2291", text: "fue marcado como enviado.", time: "hace 1 día", unread: false },
  { id: 6, icon: "star", actor: "ATEEZ", text: "publicó nuevo merch oficial que podría interesarte.", time: "hace 2 días", unread: false },
];
