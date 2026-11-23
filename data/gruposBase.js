/* ==========================================================================
   Grupos fijos de KollectA (los que trae la app desde el inicio, con foto en
   frontend/public/assets/img/groups/). No se guardan en la base: GET /api/grupos
   los junta con los que la comunidad solicitó y la moderación aprobó (models/Grupo.js).
   ========================================================================== */

const GRUPOS_BASE = [
    { nombre: "BTS", fandom: "ARMY", agencia: "HYBE / BIGHIT MUSIC", integrantes: 7, debut: 2013, color: "linear-gradient(135deg,#7c3aed,#a78bfa)", iniciales: "BTS", imagen: "/assets/img/groups/bts.jpg" },
    { nombre: "BLACKPINK", fandom: "BLINK", agencia: "YG Entertainment", integrantes: 4, debut: 2016, color: "linear-gradient(135deg,#ff5da2,#111827)", iniciales: "BP", imagen: "/assets/img/groups/blackpink.jpg" },
    { nombre: "TWICE", fandom: "ONCE", agencia: "JYP Entertainment", integrantes: 9, debut: 2015, color: "linear-gradient(135deg,#ff9ecb,#ffe066)", iniciales: "TW", imagen: "/assets/img/groups/twice.jpg" },
    { nombre: "Stray Kids", fandom: "STAY", agencia: "JYP Entertainment", integrantes: 8, debut: 2018, color: "linear-gradient(135deg,#ef4444,#171717)", iniciales: "SKZ", imagen: "/assets/img/groups/stray-kids.jpg" },
    { nombre: "SEVENTEEN", fandom: "CARAT", agencia: "PLEDIS Entertainment", integrantes: 13, debut: 2015, color: "linear-gradient(135deg,#fb923c,#fbbf24)", iniciales: "SVT", imagen: "/assets/img/groups/seventeen.jpg" },
    { nombre: "NewJeans", fandom: "Bunnies", agencia: "ADOR / HYBE", integrantes: 5, debut: 2022, color: "linear-gradient(135deg,#60a5fa,#e0f2fe)", iniciales: "NJ", imagen: "/assets/img/groups/newjeans.jpg" },
    { nombre: "aespa", fandom: "MY", agencia: "SM Entertainment", integrantes: 4, debut: 2020, color: "linear-gradient(135deg,#22d3ee,#4338ca)", iniciales: "AE", imagen: "/assets/img/groups/aespa.jpg" },
    { nombre: "ATEEZ", fandom: "ATINY", agencia: "KQ Entertainment", integrantes: 8, debut: 2018, color: "linear-gradient(135deg,#f43f5e,#1e293b)", iniciales: "ATZ", imagen: "/assets/img/groups/ateez.jpg" },
    { nombre: "ITZY", fandom: "MIDZY", agencia: "JYP Entertainment", integrantes: 5, debut: 2019, color: "linear-gradient(135deg,#facc15,#ef4444)", iniciales: "ITZY", imagen: "/assets/img/groups/itzy.jpg" },
    { nombre: "TXT", fandom: "MOA", agencia: "HYBE / BIGHIT MUSIC", integrantes: 5, debut: 2019, color: "linear-gradient(135deg,#34d399,#0ea5e9)", iniciales: "TXT", imagen: "/assets/img/groups/txt.jpg" },
    { nombre: "ILLIT", fandom: "GLLIT", agencia: "BELIFT LAB", integrantes: 5, debut: 2024, color: "linear-gradient(135deg, #f472b6, #a78bfa)", iniciales: "ILLIT", imagen: "/assets/img/groups/illit.jpg" },
    // Sin foto todavía: se ven con sus iniciales sobre el degradado (Photo oculta la imagen que no existe).
    { nombre: "LE SSERAFIM", fandom: "FEARNOT", agencia: "SOURCE MUSIC / HYBE", integrantes: 5, debut: 2022, color: "linear-gradient(135deg, #1e293b, #e2e8f0)", iniciales: "LSF", imagen: "/assets/img/groups/le-sserafim.jpg" },
    { nombre: "BABYMONSTER", fandom: "MONSTIEZ", agencia: "YG Entertainment", integrantes: 7, debut: 2024, color: "linear-gradient(135deg, #111827, #ef4444)", iniciales: "BM", imagen: "/assets/img/groups/babymonster.jpg" }
].map((grupo) => ({ ...grupo, base: true, portada: grupo.imagen.replace("/groups/", "/covers/") }));

module.exports = { GRUPOS_BASE };
