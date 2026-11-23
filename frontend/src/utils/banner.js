/* Banner del perfil: degradado + textura opcional + logo de un grupo, o una imagen propia
   (que puede ser un GIF o WebP animado). Con "animado", el degradado, la textura y el logo
   se mueven (se apaga si el sistema pide reducir el movimiento).
   Los ids deben coincidir con BANNER_COLORES y BANNER_TEXTURAS de models/Usuario.js.
   "mover" = cuánto se desliza la textura en cada vuelta (un mosaico completo, para que no se note el corte). */

export const COLORES_BANNER = {
  kollecta: { etiqueta: "KollectA", fondo: "var(--gradient-brand)" },
  atardecer: { etiqueta: "Atardecer", fondo: "linear-gradient(135deg, #ff7a59, #ff4fa3 55%, #9b5cff)" },
  oceano: { etiqueta: "Océano", fondo: "linear-gradient(135deg, #0ea5e9, #4f46e5)" },
  menta: { etiqueta: "Menta", fondo: "linear-gradient(135deg, #34d399, #06b6d4)" },
  noche: { etiqueta: "Noche", fondo: "linear-gradient(135deg, #0f172a, #312e81 60%, #7c3aed)" },
  dorado: { etiqueta: "Dorado", fondo: "linear-gradient(135deg, #b45309, #f59e0b 50%, #fde68a)" },
  cereza: { etiqueta: "Cereza", fondo: "linear-gradient(135deg, #881337, #e11d48 55%, #fb7185)" },
};

const svg = (contenido, ancho, alto) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${ancho}' height='${alto}' viewBox='0 0 ${ancho} ${alto}'>${contenido}</svg>`
  )}")`;

const BLANCO = "rgba(255,255,255,0.22)";

export const TEXTURAS_BANNER = {
  ninguna: { etiqueta: "Sin textura", imagen: "none", tamano: "auto", mover: "0 0" },
  puntos: { etiqueta: "Puntos", imagen: `radial-gradient(${BLANCO} 1.8px, transparent 2px)`, tamano: "18px 18px", mover: "18px 18px" },
  rayas: {
    etiqueta: "Rayas",
    imagen: svg(
      "<path stroke='rgba(255,255,255,0.14)' stroke-width='8' d='M-8 8l16-16M0 32L32 0M24 40l16-16'/>",
      32,
      32
    ),
    tamano: "32px 32px",
    mover: "32px 0",
  },
  cuadricula: {
    etiqueta: "Cuadrícula",
    imagen: "linear-gradient(rgba(255,255,255,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.16) 1px, transparent 1px)",
    tamano: "26px 26px",
    mover: "26px 26px",
  },
  corazones: {
    etiqueta: "Corazones",
    imagen: svg(`<path fill='${BLANCO}' d='M22 34s-11-6.6-11-14a6 6 0 0 1 11-3.3A6 6 0 0 1 33 20c0 7.4-11 14-11 14z'/>`, 44, 44),
    tamano: "44px 44px",
    mover: "0 -44px",
  },
  estrellas: {
    etiqueta: "Estrellas",
    imagen: svg(
      `<path fill='${BLANCO}' d='M14 4l2.6 5.6 6 .6-4.5 4 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.5-4 6-.6z'/><circle cx='38' cy='36' r='1.6' fill='${BLANCO}'/>`,
      52,
      52
    ),
    tamano: "52px 52px",
    mover: "-52px 52px",
  },
  ondas: {
    etiqueta: "Ondas",
    imagen: svg(`<path fill='none' stroke='${BLANCO}' stroke-width='2' d='M0 12c10 0 10-8 20-8s10 8 20 8 10-8 20-8 10 8 20 8'/>`, 80, 24),
    tamano: "80px 24px",
    mover: "80px 0",
  },
};

export const BANNER_POR_DEFECTO = { color: "kollecta", textura: "ninguna", logo: "", imagen: "", animado: false };

export function normalizarBanner(banner) {
  const actual = { ...BANNER_POR_DEFECTO, ...(banner || {}) };
  if (!COLORES_BANNER[actual.color]) actual.color = BANNER_POR_DEFECTO.color;
  if (!TEXTURAS_BANNER[actual.textura]) actual.textura = BANNER_POR_DEFECTO.textura;
  actual.animado = Boolean(actual.animado);
  return actual;
}
