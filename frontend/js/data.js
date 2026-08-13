/* ==========================================================================
   KollectA — Mock data
   Datos de ejemplo usados únicamente para visualizar el maquetado (no hay
   backend todavía: todo vive en este archivo y/o localStorage).
   ========================================================================== */

const KOLLECTA_DATA = {
  currentUser: {
    name: "Derek Luna",
    handle: "@derek.once",
    initials: "DL",
    avatarImg: "assets/img/avatars/pfpic.jpeg", // [ AQUI VA UNA IMAGEN ]
    bannerImg: "assets/img/banners/derek-luna.jpg", // [ AQUI VA UNA IMAGEN ] (banner del perfil, formato ancho ~1200x300)
    bio: "Fiel creyente de la iglesia de las dos veces · ONCE · Monterrey, MX",
    followers: 482,
    following: 213,
    items: 76,
    trades: 34,
  },

  groups: [
    { name: "BTS", fandom: "ARMY", agency: "HYBE / BIGHIT MUSIC", members: 7, debut: 2013, color: "linear-gradient(135deg,#7c3aed,#a78bfa)", initials: "BTS", img: "assets/img/groups/bts.jpg" /* [ AQUI VA UNA IMAGEN ] */ },
    { name: "BLACKPINK", fandom: "BLINK", agency: "YG Entertainment", members: 4, debut: 2016, color: "linear-gradient(135deg,#ff5da2,#111827)", initials: "BP", img: "assets/img/groups/blackpink.jpg" /* [ AQUI VA UNA IMAGEN ] */ },
    { name: "TWICE", fandom: "ONCE", agency: "JYP Entertainment", members: 9, debut: 2015, color: "linear-gradient(135deg,#ff9ecb,#ffe066)", initials: "TW", img: "assets/img/groups/twice.jpg" /* [ AQUI VA UNA IMAGEN ] */ },
    { name: "Stray Kids", fandom: "STAY", agency: "JYP Entertainment", members: 8, debut: 2018, color: "linear-gradient(135deg,#ef4444,#171717)", initials: "SKZ", img: "assets/img/groups/stray-kids.jpg" /* [ AQUI VA UNA IMAGEN ] */ },
    { name: "SEVENTEEN", fandom: "CARAT", agency: "PLEDIS Entertainment", members: 13, debut: 2015, color: "linear-gradient(135deg,#fb923c,#fbbf24)", initials: "SVT", img: "assets/img/groups/seventeen.jpg" /* [ AQUI VA UNA IMAGEN ] */ },
    { name: "NewJeans", fandom: "Bunnies", agency: "ADOR / HYBE", members: 5, debut: 2022, color: "linear-gradient(135deg,#60a5fa,#e0f2fe)", initials: "NJ", img: "assets/img/groups/newjeans.jpg" /* [ AQUI VA UNA IMAGEN ] */ },
    { name: "aespa", fandom: "MY", agency: "SM Entertainment", members: 4, debut: 2020, color: "linear-gradient(135deg,#22d3ee,#4338ca)", initials: "AE", img: "assets/img/groups/aespa.jpg" /* [ AQUI VA UNA IMAGEN ] */ },
    { name: "ATEEZ", fandom: "ATINY", agency: "KQ Entertainment", members: 8, debut: 2018, color: "linear-gradient(135deg,#f43f5e,#1e293b)", initials: "ATZ", img: "assets/img/groups/ateez.jpg" /* [ AQUI VA UNA IMAGEN ] */ },
    { name: "ITZY", fandom: "MIDZY", agency: "JYP Entertainment", members: 5, debut: 2019, color: "linear-gradient(135deg,#facc15,#ef4444)", initials: "ITZY", img: "assets/img/groups/itzy.jpg" /* [ AQUI VA UNA IMAGEN ] */ },
    { name: "TXT", fandom: "MOA", agency: "HYBE / BIGHIT MUSIC", members: 5, debut: 2019, color: "linear-gradient(135deg,#34d399,#0ea5e9)", initials: "TXT", img: "assets/img/groups/txt.jpg" /* [ AQUI VA UNA IMAGEN ] */ },
  ],

  products: [
    { id: "p1", title: "Photocard Jimin — 'Face' PC Album", group: "BTS", type: "Photocard", price: 280, mode: "Venta", tag: "Oficial", seller: "mina.cards", sellerInit: "MC", img: "assets/img/products/p1.jpg" /* [ AQUI VA UNA IMAGEN ] */ },
    { id: "p2", title: "Lightstick Ver.3 'Bomb' + funda", group: "BTS", type: "Lightstick", price: 950, mode: "Venta", tag: "Como nuevo", seller: "army_mty", sellerInit: "AM", img: "assets/img/products/p2.jpg" /* [ AQUI VA UNA IMAGEN ] */ },
    { id: "p3", title: "Photocard Set Jennie — 'Born Pink'", group: "BLACKPINK", type: "Photocard", price: 0, mode: "Intercambio", tag: "Busco: Rosé", seller: "blinknena", sellerInit: "BN", img: "assets/img/products/p3.jpg" /* [ AQUI VA UNA IMAGEN ] */ },
    { id: "p4", title: "Álbum 'Born Pink' (sellado)", group: "BLACKPINK", type: "Álbum", price: 620, mode: "Venta", tag: "Sellado", seller: "pink.vault", sellerInit: "PV", img: "assets/img/products/p4.jpg" /* [ AQUI VA UNA IMAGEN ] */ },
    { id: "p5", title: "Hoodie Oficial 'Ready to Be' Tour", group: "TWICE", type: "Ropa", price: 1150, mode: "Venta", tag: "Talla M", seller: "onceforever", sellerInit: "OF", img: "assets/img/products/p5.jpg" /* [ AQUI VA UNA IMAGEN ] */ },
    { id: "p6", title: "Photocard Felix — 'Rock-Star'", group: "Stray Kids", type: "Photocard", price: 190, mode: "Venta", tag: "Oficial", seller: "stay_norte", sellerInit: "SN", img: "assets/img/products/p6.jpg" /* [ AQUI VA UNA IMAGEN ] */ },
    { id: "p7", title: "Keyring acrílico set 8pcs", group: "Stray Kids", type: "Accesorio", price: 340, mode: "Venta", tag: "Fanmade", seller: "chan.shop", sellerInit: "CS", img: "assets/img/products/p7.jpg" /* [ AQUI VA UNA IMAGEN ] */ },
    { id: "p8", title: "Poster oficial 'God of Music'", group: "SEVENTEEN", type: "Poster", price: 260, mode: "Venta", tag: "Edición limitada", seller: "caratmx", sellerInit: "CX", img: "assets/img/products/p8.jpg" /* [ AQUI VA UNA IMAGEN ] */ },
    { id: "p9", title: "Photocard Hoshi — busco Wonwoo", group: "SEVENTEEN", type: "Photocard", price: 0, mode: "Intercambio", tag: "Busco: Wonwoo", seller: "svt.trades", sellerInit: "ST", img: "assets/img/products/p9.jpg" /* [ AQUI VA UNA IMAGEN ] */ },
    { id: "p10", title: "Álbum 'Get Up' + photobook", group: "NewJeans", type: "Álbum", price: 540, mode: "Venta", tag: "Con extras", seller: "bunny.dept", sellerInit: "BD", img: "assets/img/products/p10.jpg" /* [ AQUI VA UNA IMAGEN ] */ },
    { id: "p11", title: "Lightstick oficial aespa", group: "aespa", type: "Lightstick", price: 890, mode: "Venta", tag: "Nuevo", seller: "myworld_mx", sellerInit: "MW", img: "assets/img/products/p11.jpg" /* [ AQUI VA UNA IMAGEN ] */ },
    { id: "p12", title: "Photocard set completo — 'Golden Hour'", group: "ATEEZ", type: "Photocard", price: 420, mode: "Venta", tag: "Set completo (8)", seller: "atiny.station", sellerInit: "AS", img: "assets/img/products/p12.jpg" /* [ AQUI VA UNA IMAGEN ] */ },
  ],

  myCollection: [
    { title: "Photocard Chaeyoung — 'Ready to Be'", group: "TWICE", type: "Photocard", value: 230, img: "assets/img/collection/1.jpg" /* [ AQUI VA UNA IMAGEN ] */ },
    { title: "Álbum 'With YOU-th' (sellado)", group: "TWICE", type: "Álbum", value: 550, img: "assets/img/collection/2.jpg" /* [ AQUI VA UNA IMAGEN ] */ },
    { title: "Lightstick Candy Bong Ver.3", group: "TWICE", type: "Lightstick", value: 900, img: "assets/img/collection/3.jpg" /* [ AQUI VA UNA IMAGEN ] */ },
    { title: "Photocard Nayeon — 'Fancy You'", group: "TWICE", type: "Photocard", value: 195, img: "assets/img/collection/4.jpeg" /* [ AQUI VA UNA IMAGEN ] */ },
    { title: "Álbum 'The Story Goes On'", group: "TWICE", type: "Álbum", value: 480, img: "assets/img/collection/5.jpg" /* [ AQUI VA UNA IMAGEN ] */ },
    { title: "Poster 'Formula of Love' edición limitada", group: "TWICE", type: "Poster", value: 220, img: "assets/img/collection/6.jpg" /* [ AQUI VA UNA IMAGEN ] */ },
    { title: "Álbum 'Feel Special' — portada Momo", group: "TWICE", type: "Álbum", value: 460, img: "assets/img/collection/7.jpg" /* [ AQUI VA UNA IMAGEN ] */ },
    { title: "Álbum 'Drama' — portada Karina", group: "aespa", type: "Álbum", value: 350, img: "assets/img/collection/8.jpg" /* [ AQUI VA UNA IMAGEN ] */ },
  ],

  posts: [
    {
      user: "mina.cards", initials: "MC", handle: "@mina.cards", time: "hace 12 min",
      text: "Por fin completé mi set de photocards de 'Face'. 6 meses buscando la de Jimin versión B. Gracias a todos los que me ayudaron con el intercambio.",
      media: true, mediaType: "Photocard", tag: "BTS", img: "assets/img/posts/bts-jimin-face.jpg", likes: 128, comments: 24, shares: 6, liked: true,
    },
    {
      user: "army_mty", initials: "AM", handle: "@army_mty", time: "hace 28 min",
      text: "Encontré esta foto de Jungkook de la era 'Golden' guardada en mi celular y no puedo dejar de verla. ¿Alguien más contando los días para el comeback con el resto de BTS?",
      media: true, mediaType: "Photocard", tag: "BTS", img: "assets/img/posts/bts-jungkook.jpeg", likes: 174, comments: 31, shares: 9, liked: false,
    },
    {
      user: "onceforever", initials: "OF", handle: "@onceforever", time: "hace 55 min",
      text: "Dahyun brillando como siempre en 'Strategy'. Ya tengo su photocard enmarcada en el escritorio, la mejor compra del año.",
      media: true, mediaType: "Photocard", tag: "TWICE", img: "assets/img/posts/twice-dahyun.jpeg", likes: 142, comments: 27, shares: 8, liked: true,
    },
    {
      user: "mina.wave", initials: "MN", handle: "@mina.wave", time: "hace 2 h",
      text: "Mina volvió a demostrar por qué es mi bias wrecker con este look. Busco su photocard de 'With YOU-th' para intercambio, tengo varias de Chaeyoung disponibles.",
      media: true, mediaType: "Photocard", tag: "TWICE", img: "assets/img/posts/twice-mina.jpeg", likes: 98, comments: 15, shares: 4, liked: false,
    },
    {
      user: "myworld_mx", initials: "MW", handle: "@myworld_mx", time: "hace 6 h",
      text: "Karina rompiendo internet otra vez con este concept photo de 'Drama'. Ya reservé mi álbum firmado, llega la próxima semana.",
      media: true, mediaType: "Álbum", tag: "aespa", img: "assets/img/posts/aespa-karina.jpeg", likes: 211, comments: 42, shares: 17, liked: true,
    },
    {
      user: "midzy.travels", initials: "MT", handle: "@midzy.travels", time: "hace 8 h",
      text: "¡Las vi en Barcelona el fin de semana y siguen sonando increíble en vivo! Traje merch exclusivo del tour para intercambiar con otras MIDZY de por acá.",
      media: true, mediaType: "Accesorio", tag: "ITZY", img: "assets/img/posts/itzy-barcelona.jpeg", likes: 76, comments: 13, shares: 5, liked: false,
    },
    {
      user: "blinknena", initials: "BN", handle: "@blinknena", time: "hace 40 min",
      text: "Buscando activamente photocard de Rosé 'Born Pink' versión japonesa. Ofrezco intercambio o compra, ¿alguien de MTY que tenga?",
      media: false, tag: "BLACKPINK", likes: 34, comments: 11, shares: 2, liked: false,
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
    { name: "Caro Ximénez", handle: "@caratmx", initials: "CX", preview: "Nos vemos el sábado en la reunión", time: "Ayer", unread: 0, online: false },
    { name: "Sofía Nena", handle: "@blinknena", initials: "BN", preview: "Gracias, ya llegó el paquete", time: "Ayer", unread: 0, online: false },
    { name: "Ale Bunny", handle: "@bunny.dept", initials: "AB", preview: "Escribiendo…", time: "Lun", unread: 1, online: true },
  ],

  notifications: [
    { icon: "heart", text: "<b>Mina Cardona</b> le dio like a tu publicación de Photocard Suga.", time: "hace 5 min", unread: true },
    { icon: "repeat", text: "<b>Diego Norte</b> propuso un intercambio por tu Lightstick Ver.3.", time: "hace 22 min", unread: true },
    { icon: "users", text: "<b>Caro Ximénez</b> te empezó a seguir.", time: "hace 1 h", unread: true },
    { icon: "chat", text: "<b>Sofía Nena</b> te envió un mensaje nuevo.", time: "hace 3 h", unread: false },
    { icon: "package", text: "Tu pedido <b>#KA-2291</b> fue marcado como enviado.", time: "hace 1 día", unread: false },
    { icon: "star", text: "<b>ATEEZ</b> publicó nuevo merch oficial que podría interesarte.", time: "hace 2 días", unread: false },
  ],
};
