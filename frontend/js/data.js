/* ==========================================================================
   KollectA — Mock data
   Datos de ejemplo usados únicamente para visualizar el maquetado (no hay
   backend todavía: todo vive en este archivo y/o localStorage).
   ========================================================================== */

const KOLLECTA_DATA = {
  currentUser: {
    name: "Renata Cavazos",
    handle: "@rena.bias",
    initials: "RC",
    bio: "Coleccionista de photocards desde 2019 · ARMY & MIDZY · Monterrey, MX",
    followers: 482,
    following: 213,
    items: 76,
    trades: 34,
  },

  groups: [
    { name: "BTS", fandom: "ARMY", agency: "HYBE / BIGHIT MUSIC", members: 7, debut: 2013, color: "linear-gradient(135deg,#7c3aed,#a78bfa)", initials: "BTS" },
    { name: "BLACKPINK", fandom: "BLINK", agency: "YG Entertainment", members: 4, debut: 2016, color: "linear-gradient(135deg,#ff5da2,#111827)", initials: "BP" },
    { name: "TWICE", fandom: "ONCE", agency: "JYP Entertainment", members: 9, debut: 2015, color: "linear-gradient(135deg,#ff9ecb,#ffe066)", initials: "TW" },
    { name: "Stray Kids", fandom: "STAY", agency: "JYP Entertainment", members: 8, debut: 2018, color: "linear-gradient(135deg,#ef4444,#171717)", initials: "SKZ" },
    { name: "SEVENTEEN", fandom: "CARAT", agency: "PLEDIS Entertainment", members: 13, debut: 2015, color: "linear-gradient(135deg,#fb923c,#fbbf24)", initials: "SVT" },
    { name: "NewJeans", fandom: "Bunnies", agency: "ADOR / HYBE", members: 5, debut: 2022, color: "linear-gradient(135deg,#60a5fa,#e0f2fe)", initials: "NJ" },
    { name: "aespa", fandom: "MY", agency: "SM Entertainment", members: 4, debut: 2020, color: "linear-gradient(135deg,#22d3ee,#4338ca)", initials: "AE" },
    { name: "ATEEZ", fandom: "ATINY", agency: "KQ Entertainment", members: 8, debut: 2018, color: "linear-gradient(135deg,#f43f5e,#1e293b)", initials: "ATZ" },
    { name: "ITZY", fandom: "MIDZY", agency: "JYP Entertainment", members: 5, debut: 2019, color: "linear-gradient(135deg,#facc15,#ef4444)", initials: "ITZY" },
    { name: "TXT", fandom: "MOA", agency: "HYBE / BIGHIT MUSIC", members: 5, debut: 2019, color: "linear-gradient(135deg,#34d399,#0ea5e9)", initials: "TXT" },
  ],

  products: [
    { id: "p1", title: "Photocard Jimin — 'Face' PC Album", group: "BTS", type: "Photocard", price: 280, mode: "Venta", emoji: "🃏", tag: "Oficial", seller: "mina.cards", sellerInit: "MC" },
    { id: "p2", title: "Lightstick Ver.3 'Bomb' + funda", group: "BTS", type: "Lightstick", price: 950, mode: "Venta", emoji: "🔮", tag: "Como nuevo", seller: "army_mty", sellerInit: "AM" },
    { id: "p3", title: "Photocard Set Jennie — 'Born Pink'", group: "BLACKPINK", type: "Photocard", price: 0, mode: "Intercambio", emoji: "🖤", tag: "Busco: Rosé", seller: "blinknena", sellerInit: "BN" },
    { id: "p4", title: "Álbum 'Born Pink' (sellado)", group: "BLACKPINK", type: "Álbum", price: 620, mode: "Venta", emoji: "💿", tag: "Sellado", seller: "pink.vault", sellerInit: "PV" },
    { id: "p5", title: "Hoodie Oficial 'Ready to Be' Tour", group: "TWICE", type: "Ropa", price: 1150, mode: "Venta", emoji: "🧥", tag: "Talla M", seller: "onceforever", sellerInit: "OF" },
    { id: "p6", title: "Photocard Felix — 'Rock-Star'", group: "Stray Kids", type: "Photocard", price: 190, mode: "Venta", emoji: "🃏", tag: "Oficial", seller: "stay_norte", sellerInit: "SN" },
    { id: "p7", title: "Keyring acrílico set 8pcs", group: "Stray Kids", type: "Accesorio", price: 340, mode: "Venta", emoji: "🔑", tag: "Fanmade", seller: "chan.shop", sellerInit: "CS" },
    { id: "p8", title: "Poster oficial 'God of Music'", group: "SEVENTEEN", type: "Poster", price: 260, mode: "Venta", emoji: "🖼️", tag: "Edición limitada", seller: "caratmx", sellerInit: "CX" },
    { id: "p9", title: "Photocard Hoshi — busco Wonwoo", group: "SEVENTEEN", type: "Photocard", price: 0, mode: "Intercambio", emoji: "🃏", tag: "Busco: Wonwoo", seller: "svt.trades", sellerInit: "ST" },
    { id: "p10", title: "Álbum 'Get Up' + photobook", group: "NewJeans", type: "Álbum", price: 540, mode: "Venta", emoji: "💿", tag: "Con extras", seller: "bunny.dept", sellerInit: "BD" },
    { id: "p11", title: "Lightstick oficial aespa", group: "aespa", type: "Lightstick", price: 890, mode: "Venta", emoji: "🔮", tag: "Nuevo", seller: "myworld_mx", sellerInit: "MW" },
    { id: "p12", title: "Photocard set completo — 'Golden Hour'", group: "ATEEZ", type: "Photocard", price: 420, mode: "Venta", emoji: "🃏", tag: "Set completo (8)", seller: "atiny.station", sellerInit: "AS" },
  ],

  myCollection: [
    { title: "Photocard Suga — 'Proof'", group: "BTS", emoji: "🃏", value: 210 },
    { title: "Álbum 'Born Pink' Box Set", group: "BLACKPINK", emoji: "💿", value: 680 },
    { title: "Lightstick Ver.3", group: "BTS", emoji: "🔮", value: 950 },
    { title: "Photocard Ryujin — 'Cheshire'", group: "ITZY", emoji: "🃏", value: 175 },
    { title: "Hoodie 'Maniac' Tour", group: "Stray Kids", emoji: "🧥", value: 1100 },
    { title: "Poster 'Attacca' edición limitada", group: "SEVENTEEN", emoji: "🖼️", value: 240 },
    { title: "Keyring set Bang Chan", group: "Stray Kids", emoji: "🔑", value: 150 },
    { title: "Photocard Karina — 'Drama'", group: "aespa", emoji: "🃏", value: 300 },
  ],

  posts: [
    {
      user: "mina.cards", initials: "MC", handle: "@mina.cards", time: "hace 12 min",
      text: "¡Por fin completé mi set de photocards de 'Face'! 🥹💜 6 meses buscando la de Jimin versión B. Gracias a todos los que me ayudaron con el intercambio 🙏",
      media: "🃏🃏🃏", tag: "BTS", likes: 128, comments: 24, shares: 6, liked: true,
    },
    {
      user: "blinknena", initials: "BN", handle: "@blinknena", time: "hace 40 min",
      text: "Buscando activamente photocard de Rosé 'Born Pink' versión japonesa. Ofrezco intercambio o compra 👀 alguien de MTY que tenga??",
      media: null, tag: "BLACKPINK", likes: 34, comments: 11, shares: 2, liked: false,
    },
    {
      user: "stay_norte", initials: "SN", handle: "@stay_norte", time: "hace 2 h",
      text: "Mi rincón STAY creciendo poquito a poquito 🐰🖤 ya llevo 42 piezas en mi colección de Stray Kids, meta es llegar a 100 antes del comeback.",
      media: "📦✨", tag: "Stray Kids", likes: 256, comments: 38, shares: 14, liked: true,
    },
    {
      user: "caratmx", initials: "CX", handle: "@caratmx", time: "hace 5 h",
      text: "Reunión de CARATs este sábado en el centro para intercambiar merch de SEVENTEEN 🍊 ¡Todos son bienvenidos, lleven su colección para presumir!",
      media: "🖼️🃏🔑", tag: "SEVENTEEN", likes: 89, comments: 19, shares: 22, liked: false,
    },
  ],

  friends: [
    { name: "Mina Cardona", handle: "@mina.cards", initials: "MC", mutual: 12, online: true },
    { name: "Sofía Nena", handle: "@blinknena", initials: "BN", mutual: 8, online: false },
    { name: "Diego Norte", handle: "@stay_norte", initials: "SN", mutual: 21, online: true },
    { name: "Caro Ximénez", handle: "@caratmx", initials: "CX", mutual: 5, online: false },
    { name: "Ale Bunny", handle: "@bunny.dept", initials: "AB", mutual: 3, online: true },
  ],

  threads: [
    { name: "Mina Cardona", handle: "@mina.cards", initials: "MC", preview: "¿Sigue disponible la photocard de Jimin?", time: "10:32", unread: 2, online: true },
    { name: "Diego Norte", handle: "@stay_norte", initials: "SN", preview: "Va el intercambio, te mando la mía primero", time: "09:15", unread: 0, online: true },
    { name: "Caro Ximénez", handle: "@caratmx", initials: "CX", preview: "Nos vemos el sábado en la reunión 🍊", time: "Ayer", unread: 0, online: false },
    { name: "Sofía Nena", handle: "@blinknena", initials: "BN", preview: "Gracias! ya llegó el paquete 📦", time: "Ayer", unread: 0, online: false },
    { name: "Ale Bunny", handle: "@bunny.dept", initials: "AB", preview: "Escribiendo…", time: "Lun", unread: 1, online: true },
  ],

  notifications: [
    { icon: "❤️", text: "<b>Mina Cardona</b> le dio like a tu publicación de Photocard Suga.", time: "hace 5 min", unread: true },
    { icon: "🔁", text: "<b>Diego Norte</b> propuso un intercambio por tu Lightstick Ver.3.", time: "hace 22 min", unread: true },
    { icon: "👥", text: "<b>Caro Ximénez</b> te empezó a seguir.", time: "hace 1 h", unread: true },
    { icon: "💬", text: "<b>Sofía Nena</b> te envió un mensaje nuevo.", time: "hace 3 h", unread: false },
    { icon: "🛍️", text: "Tu pedido <b>#KA-2291</b> fue marcado como enviado.", time: "hace 1 día", unread: false },
    { icon: "⭐", text: "<b>ATEEZ</b> publicó nuevo merch oficial que podría interesarte.", time: "hace 2 días", unread: false },
  ],
};
