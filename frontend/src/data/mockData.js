/* ==========================================================================
   Datos de ejemplo para las secciones que todavía no tienen backend
   (marketplace, colección, grupos, mensajes, notificaciones).
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
];

export const GROUP_NAMES = GROUPS.map((group) => group.name);

export const CATEGORIES = ["Photocard", "Álbum", "Lightstick", "Ropa", "Poster", "Accesorio"];

export const PRODUCTS = [
  { id: "p1", title: "Photocard Jimin — 'Face' PC Album", group: "BTS", type: "Photocard", price: 280, mode: "Venta", tag: "Oficial", seller: "mina.cards", sellerInit: "MC", img: "/assets/img/products/p1.jpg" },
  { id: "p2", title: "Lightstick Ver.3 'Bomb' + funda", group: "BTS", type: "Lightstick", price: 950, mode: "Venta", tag: "Como nuevo", seller: "army_mty", sellerInit: "AM", img: "/assets/img/products/p2.jpg" },
  { id: "p3", title: "Photocard Set Jennie — 'Born Pink'", group: "BLACKPINK", type: "Photocard", price: 0, mode: "Intercambio", tag: "Busco: Rosé", seller: "blinknena", sellerInit: "BN", img: "/assets/img/products/p3.jpg" },
  { id: "p4", title: "Álbum 'Born Pink' (sellado)", group: "BLACKPINK", type: "Álbum", price: 620, mode: "Venta", tag: "Sellado", seller: "pink.vault", sellerInit: "PV", img: "/assets/img/products/p4.jpg" },
  { id: "p5", title: "Hoodie Oficial 'Ready to Be' Tour", group: "TWICE", type: "Ropa", price: 1150, mode: "Venta", tag: "Talla M", seller: "onceforever", sellerInit: "OF", img: "/assets/img/products/p5.jpg" },
  { id: "p6", title: "Photocard Felix — 'Rock-Star'", group: "Stray Kids", type: "Photocard", price: 190, mode: "Venta", tag: "Oficial", seller: "stay_norte", sellerInit: "SN", img: "/assets/img/products/p6.jpg" },
  { id: "p7", title: "Keyring acrílico set 8pcs", group: "Stray Kids", type: "Accesorio", price: 340, mode: "Venta", tag: "Fanmade", seller: "chan.shop", sellerInit: "CS", img: "/assets/img/products/p7.jpg" },
  { id: "p8", title: "Poster oficial 'God of Music'", group: "SEVENTEEN", type: "Poster", price: 260, mode: "Venta", tag: "Edición limitada", seller: "caratmx", sellerInit: "CX", img: "/assets/img/products/p8.jpg" },
  { id: "p9", title: "Photocard Hoshi — busco Wonwoo", group: "SEVENTEEN", type: "Photocard", price: 0, mode: "Intercambio", tag: "Busco: Wonwoo", seller: "svt.trades", sellerInit: "ST", img: "/assets/img/products/p9.jpg" },
  { id: "p10", title: "Álbum 'Get Up' + photobook", group: "NewJeans", type: "Álbum", price: 540, mode: "Venta", tag: "Con extras", seller: "bunny.dept", sellerInit: "BD", img: "/assets/img/products/p10.jpg" },
  { id: "p11", title: "Lightstick oficial aespa", group: "aespa", type: "Lightstick", price: 890, mode: "Venta", tag: "Nuevo", seller: "myworld_mx", sellerInit: "MW", img: "/assets/img/products/p11.jpg" },
  { id: "p12", title: "Photocard set completo — 'Golden Hour'", group: "ATEEZ", type: "Photocard", price: 420, mode: "Venta", tag: "Set completo (8)", seller: "atiny.station", sellerInit: "AS", img: "/assets/img/products/p12.jpg" },
];

export const MY_COLLECTION = [
  { id: "c1", title: "Photocard Chaeyoung — 'Ready to Be'", group: "TWICE", type: "Photocard", value: 230, img: "/assets/img/collection/1.jpg" },
  { id: "c2", title: "Álbum 'With YOU-th' (sellado)", group: "TWICE", type: "Álbum", value: 550, img: "/assets/img/collection/2.jpg" },
  { id: "c3", title: "Lightstick Candy Bong Ver.3", group: "TWICE", type: "Lightstick", value: 900, img: "/assets/img/collection/3.jpg" },
  { id: "c4", title: "Photocard Nayeon — 'Fancy You'", group: "TWICE", type: "Photocard", value: 195, img: "/assets/img/collection/4.jpeg" },
  { id: "c5", title: "Álbum 'The Story Goes On'", group: "TWICE", type: "Álbum", value: 480, img: "/assets/img/collection/5.jpg" },
  { id: "c6", title: "Poster 'Formula of Love' edición limitada", group: "TWICE", type: "Poster", value: 220, img: "/assets/img/collection/6.jpg" },
  { id: "c7", title: "Álbum 'Feel Special' — portada Momo", group: "TWICE", type: "Álbum", value: 460, img: "/assets/img/collection/7.jpg" },
  { id: "c8", title: "Álbum 'Drama' — portada Karina", group: "aespa", type: "Álbum", value: 350, img: "/assets/img/collection/8.jpg" },
];

export const FRIENDS = [
  { name: "Mina Cardona", handle: "@mina.cards", initials: "MC", mutual: 12, online: true },
  { name: "Sofía Nena", handle: "@blinknena", initials: "BN", mutual: 8, online: false },
  { name: "Diego Norte", handle: "@stay_norte", initials: "SN", mutual: 21, online: true },
  { name: "Caro Ximénez", handle: "@caratmx", initials: "CX", mutual: 5, online: false },
  { name: "Ale Bunny", handle: "@bunny.dept", initials: "AB", mutual: 3, online: true },
];

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
