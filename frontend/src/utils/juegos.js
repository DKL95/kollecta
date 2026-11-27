// Minijuegos. Los ids deben coincidir con JUEGOS de models/Marcador.js.
export const JUEGOS = {
  snake: {
    nombre: "Lightstick Snake",
    emoji: "🌟",
    color: "#ffd166",
    descripcion: "Guía tu fila de lightsticks, junta álbumes y no choques con las paredes ni contigo.",
    instrucciones: "Flechas o WASD en computadora; desliza o usa los botones en el celular. Espacio pausa.",
    unidad: "puntos",
  },
  tiendita: {
    nombre: "K-Style Boutique",
    emoji: "👗",
    color: "#ff8fc7",
    descripcion: "Atiende tu tiendita de ropa K-pop: dale a cada cliente lo que pide antes de que se desespere.",
    instrucciones: "Toca la prenda que pide un cliente para vendérsela. Si se acaba, tócala para resurtir (cuesta dinero).",
    unidad: "pesos",
  },
  memorama: {
    nombre: "Memorama de estampitas",
    emoji: "🃏",
    color: "#4fd8ff",
    descripcion: "Encuentra los pares de estampitas con los menos movimientos y en el menor tiempo.",
    instrucciones: "Voltea dos cartas por turno. Si son iguales se quedan descubiertas.",
    unidad: "puntos",
  },
};

export function formatearPuntaje(juego, puntos) {
  return juego === "tiendita" ? `$${Number(puntos).toLocaleString("es-MX")}` : `${puntos} pts`;
}
