/* ==========================================================================
   Avatar personalizable: nombres y colores de cada opción.
   Los ids deben coincidir con OPCIONES_AVATAR, EXPRESIONES y GESTOS de
   models/avatar.js (lo revisa tests/frontend.test.mjs). El dibujo está en
   components/AvatarKpop.jsx.
   ========================================================================== */

export const PIEL = {
  porcelana: { etiqueta: "Porcelana", color: "#ffe9dc" },
  clara: { etiqueta: "Clara", color: "#f9d6bf" },
  miel: { etiqueta: "Miel", color: "#eebf95" },
  canela: { etiqueta: "Canela", color: "#d9a074" },
  morena: { etiqueta: "Morena", color: "#b97b52" },
  caoba: { etiqueta: "Caoba", color: "#8f5a3a" },
  ebano: { etiqueta: "Ébano", color: "#5e3b26" },
  lila: { etiqueta: "Fantasía", color: "#d9c6ff" },
};

export const COLOR_OJOS = {
  cafe: { etiqueta: "Café", color: "#6b3f24" },
  negro: { etiqueta: "Negro", color: "#1f1a2b" },
  miel: { etiqueta: "Miel", color: "#b7791f" },
  verde: { etiqueta: "Verde", color: "#2f855a" },
  azul: { etiqueta: "Azul", color: "#2b6cb0" },
  violeta: { etiqueta: "Violeta", color: "#7c3aed" },
  rosa: { etiqueta: "Rosa", color: "#db2777" },
};

export const COLOR_CABELLO = {
  negro: { etiqueta: "Negro", color: "#1f1b2e" },
  castano: { etiqueta: "Castaño", color: "#6b4226" },
  rubio: { etiqueta: "Rubio", color: "#f2c86b" },
  rosa: { etiqueta: "Rosa", color: "#ff8fc7" },
  lila: { etiqueta: "Lila", color: "#b69cff" },
  azul: { etiqueta: "Azul", color: "#5aa9ff" },
  rojo: { etiqueta: "Rojo", color: "#e0474c" },
  platino: { etiqueta: "Platino", color: "#e8e6f0" },
  menta: { etiqueta: "Menta", color: "#7fe0c4" },
  naranja: { etiqueta: "Naranja", color: "#ff9f43" },
};

export const COLOR_ROPA = {
  rosa: { etiqueta: "Rosa", color: "#ff4fa3" },
  morado: { etiqueta: "Morado", color: "#9b5cff" },
  azul: { etiqueta: "Azul", color: "#4f8cff" },
  menta: { etiqueta: "Menta", color: "#3ddc97" },
  amarillo: { etiqueta: "Amarillo", color: "#ffd166" },
  negro: { etiqueta: "Negro", color: "#2a2340" },
  blanco: { etiqueta: "Blanco", color: "#f4f1fa" },
  rojo: { etiqueta: "Rojo", color: "#ff5c72" },
};

export const FONDOS = {
  kollecta: { etiqueta: "KollectA", colores: ["#ff4fa3", "#9b5cff", "#4fd8ff"] },
  atardecer: { etiqueta: "Atardecer", colores: ["#ff7a59", "#ff4fa3", "#9b5cff"] },
  oceano: { etiqueta: "Océano", colores: ["#0ea5e9", "#4f46e5"] },
  menta: { etiqueta: "Menta", colores: ["#34d399", "#06b6d4"] },
  noche: { etiqueta: "Noche", colores: ["#0f172a", "#312e81", "#7c3aed"] },
  dorado: { etiqueta: "Dorado", colores: ["#b45309", "#f59e0b", "#fde68a"] },
  cereza: { etiqueta: "Cereza", colores: ["#881337", "#e11d48", "#fb7185"] },
};

const etiquetas = (pares) => Object.fromEntries(pares.map(([id, etiqueta]) => [id, { etiqueta }]));

export const OJOS = etiquetas([
  ["redondos", "Redondos"],
  ["brillantes", "Brillantes"],
  ["almendrados", "Almendrados"],
  ["pestanas", "Con pestañas"],
  ["dormilones", "Dormilones"],
]);

export const CEJAS = etiquetas([
  ["suaves", "Suaves"],
  ["rectas", "Rectas"],
  ["arqueadas", "Arqueadas"],
  ["gruesas", "Gruesas"],
]);

export const BOCAS = etiquetas([
  ["sonrisa", "Sonrisa"],
  ["gatuna", "Gatuna :3"],
  ["abierta", "Abierta"],
  ["tranquila", "Tranquila"],
  ["lengua", "Lengüita"],
]);

export const CABELLOS = etiquetas([
  ["corto", "Corto"],
  ["cortina", "Fleco de cortina"],
  ["flequillo", "Flequillo recto"],
  ["largo", "Largo"],
  ["coletas", "Coletas"],
  ["chongo", "Chongo"],
  ["ondulado", "Rizado"],
  ["bob", "Bob"],
  ["rapado", "Rapado"],
]);

export const ROPAS = etiquetas([
  ["camiseta", "Camiseta"],
  ["sudadera", "Sudadera"],
  ["mezclilla", "Chamarra de mezclilla"],
  ["uniforme", "Uniforme escolar"],
  ["sueter", "Suéter"],
  ["escenario", "Saco de escenario"],
]);

export const ACCESORIOS = etiquetas([
  ["ninguno", "Ninguno"],
  ["lentes", "Lentes"],
  ["gorra", "Gorra"],
  ["gato", "Orejas de gato"],
  ["mono", "Moño"],
  ["audifonos", "Audífonos"],
  ["pescador", "Gorro de pescador"],
  ["estrellas", "Pinzas de estrella"],
  ["corona", "Corona"],
]);

export const MEJILLAS = etiquetas([
  ["ninguno", "Nada"],
  ["rubor", "Rubor"],
  ["lunar", "Lunar"],
  ["curita", "Curita"],
  ["pecas", "Pecas"],
  ["brillos", "Brillitos"],
]);

// Cada categoría del editor: qué clave del avatar cambia y con qué opciones.
export const OPCIONES_AVATAR = {
  piel: PIEL,
  ojos: OJOS,
  colorOjos: COLOR_OJOS,
  cejas: CEJAS,
  boca: BOCAS,
  cabello: CABELLOS,
  colorCabello: COLOR_CABELLO,
  ropa: ROPAS,
  colorRopa: COLOR_ROPA,
  accesorio: ACCESORIOS,
  mejillas: MEJILLAS,
  fondo: FONDOS,
};

export const AVATAR_INICIAL = {
  piel: "clara",
  ojos: "redondos",
  colorOjos: "cafe",
  cejas: "suaves",
  boca: "sonrisa",
  cabello: "cortina",
  colorCabello: "negro",
  ropa: "sudadera",
  colorRopa: "rosa",
  accesorio: "ninguno",
  mejillas: "rubor",
  fondo: "kollecta",
};

export const EXPRESIONES = etiquetas([
  ["normal", "Normal"],
  ["feliz", "Feliz"],
  ["amor", "Enamorado"],
  ["risa", "Risa"],
  ["guino", "Guiño"],
  ["sorpresa", "Sorpresa"],
  ["llorar", "Llorando"],
  ["enojo", "Enojado"],
  ["dormir", "Dormido"],
  ["pena", "Apenado"],
]);

export const GESTOS = etiquetas([
  ["ninguno", "Sin gesto"],
  ["saludo", "Saludo"],
  ["corazon", "Corazón con dedos"],
  ["fighting", "¡Fighting!"],
  ["paz", "Amor y paz"],
  ["mejillas", "Manos en la cara"],
]);

export const MAX_TEXTO_STICKER = 20;

// Stickers listos para usar con cualquier avatar.
export const STICKERS_BASE = [
  { id: "hola", expresion: "feliz", gesto: "saludo", texto: "¡Hola!" },
  { id: "saranghae", expresion: "amor", gesto: "corazon", texto: "Saranghae" },
  { id: "hwaiting", expresion: "feliz", gesto: "fighting", texto: "Hwaiting!" },
  { id: "jaja", expresion: "risa", gesto: "ninguno", texto: "Jajaja" },
  { id: "daebak", expresion: "sorpresa", gesto: "mejillas", texto: "Daebak!" },
  { id: "gracias", expresion: "guino", gesto: "paz", texto: "¡Gracias!" },
  { id: "llorar", expresion: "llorar", gesto: "ninguno", texto: "Noooo" },
  { id: "enojo", expresion: "enojo", gesto: "ninguno", texto: "Grr" },
  { id: "pena", expresion: "pena", gesto: "mejillas", texto: "Ay, qué pena" },
  { id: "noches", expresion: "dormir", gesto: "ninguno", texto: "Buenas noches" },
  { id: "bias", expresion: "amor", gesto: "mejillas", texto: "Mi bias" },
  { id: "paz", expresion: "guino", gesto: "paz", texto: "" },
];

// Avatar completo a partir de lo guardado (lo que falte o no exista toma el valor inicial).
export function completarAvatar(avatar) {
  const resultado = {};
  for (const [clave, opciones] of Object.entries(OPCIONES_AVATAR)) {
    const valor = avatar?.[clave];
    resultado[clave] = valor && opciones[valor] ? valor : AVATAR_INICIAL[clave];
  }
  return resultado;
}

export function avatarAleatorio(azar = Math.random) {
  const resultado = {};
  for (const [clave, opciones] of Object.entries(OPCIONES_AVATAR)) {
    const ids = Object.keys(opciones);
    resultado[clave] = ids[Math.floor(azar() * ids.length)];
  }
  return resultado;
}

// Mezcla dos colores hex (t = 0 → a, t = 1 → b). Sirve para sombras y brillos.
export function mezclar(a, b, t) {
  const leer = (hex) => {
    const limpio = hex.replace("#", "");
    return [0, 2, 4].map((i) => parseInt(limpio.slice(i, i + 2), 16));
  };
  const [r1, g1, b1] = leer(a);
  const [r2, g2, b2] = leer(b);
  const canal = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return `#${canal(r1, r2)}${canal(g1, g2)}${canal(b1, b2)}`;
}
