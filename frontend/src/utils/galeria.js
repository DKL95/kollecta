/* ==========================================================================
   Opciones de la galería 3D (deben coincidir con models/galeria.js).
   Los colores son números hexadecimales para three.js.
   ========================================================================== */

export const TEMAS_GALERIA = [
  { id: "museo", nombre: "Museo", descripcion: "Paredes claras y piso de mármol", pared: 0xf1ede6, piso: 0xd9d4cb, techo: 0xfbfaf7, acento: 0xc9a14a, niebla: 0xe9e4dc, pisoBrillo: 0.35 },
  { id: "neon", nombre: "Neón", descripcion: "Sala oscura con tiras de luz", pared: 0x1a1430, piso: 0x0d0a1c, techo: 0x0b0817, acento: 0xff4fa3, niebla: 0x0b0817, pisoBrillo: 0.6, tiras: true },
  { id: "concierto", nombre: "Concierto", descripcion: "Como un escenario en plena gira", pared: 0x221a2e, piso: 0x141018, techo: 0x09070d, acento: 0x9b5cff, niebla: 0x100c16, pisoBrillo: 0.5, tiras: true },
  { id: "pastel", nombre: "Pastel", descripcion: "Rosa, lila y menta", pared: 0xf6d6e8, piso: 0xd9f2e6, techo: 0xfdf3fa, acento: 0xb48cff, niebla: 0xf7e6f0, pisoBrillo: 0.2 },
  { id: "estrellas", nombre: "Noche estrellada", descripcion: "Techo de estrellas", pared: 0x1b2250, piso: 0x141a3d, techo: 0x070a1f, acento: 0xffd166, niebla: 0x0a0e26, pisoBrillo: 0.45, cielo: true },
  { id: "madera", nombre: "Madera", descripcion: "Cálida, como una cafetería", pared: 0xe8d9c4, piso: 0x8a5a36, techo: 0xf3e9dc, acento: 0x6b3f22, niebla: 0xe3d3bd, pisoBrillo: 0.15 },
];

export const MARCOS_GALERIA = [
  { id: "dorado", nombre: "Dorado", color: 0xc9a14a, metal: 0.85, rugosidad: 0.3 },
  { id: "negro", nombre: "Negro", color: 0x1c1c1f, metal: 0.2, rugosidad: 0.5 },
  { id: "neon", nombre: "Neón", color: 0xff4fa3, metal: 0, rugosidad: 0.4, brillo: true },
  { id: "madera", nombre: "Madera", color: 0x7a4b2a, metal: 0, rugosidad: 0.8 },
  { id: "ninguno", nombre: "Sin marco", color: 0xffffff, metal: 0, rugosidad: 1, sinMarco: true },
];

export const LUCES_GALERIA = [
  { id: "calida", nombre: "Cálida", color: 0xffe2b8, ambiente: 0.75, foco: 1.1 },
  { id: "fria", nombre: "Fría", color: 0xd6e6ff, ambiente: 0.8, foco: 1.0 },
  { id: "escenario", nombre: "Escenario", color: 0xffffff, ambiente: 0.35, foco: 1.4, colores: [0xff4fa3, 0x4fd8ff, 0x9b5cff] },
];

export const PARTICULAS_GALERIA = [
  { id: "ninguna", nombre: "Ninguno" },
  { id: "estrellas", nombre: "Estrellas" },
  { id: "corazones", nombre: "Corazones" },
  { id: "confeti", nombre: "Confeti" },
];

export const MAX_TITULO_GALERIA = 40;

const buscar = (lista, id) => lista.find((o) => o.id === id) || lista[0];
export const temaGaleria = (id) => buscar(TEMAS_GALERIA, id);
export const marcoGaleria = (id) => buscar(MARCOS_GALERIA, id);
export const luzGaleria = (id) => buscar(LUCES_GALERIA, id);

export function hexCss(numero) {
  return `#${numero.toString(16).padStart(6, "0")}`;
}

// Posiciones de las piezas en las 4 paredes de una sala cuadrada.
// Regresa { lado, lugares: [{ x, z, angulo }] } (angulo: hacia dónde mira el cuadro).
export function distribuirPiezas(total, separacion = 3) {
  const porPared = Math.max(2, Math.ceil(total / 4));
  const lado = Math.max(12, porPared * separacion + 3);
  const mitad = lado / 2;
  const pared = [
    // fondo, derecha, frente, izquierda (en el sentido del reloj visto desde arriba)
    { fijo: -mitad, eje: "z", angulo: 0 },
    { fijo: mitad, eje: "x", angulo: -Math.PI / 2 },
    { fijo: mitad, eje: "z", angulo: Math.PI },
    { fijo: -mitad, eje: "x", angulo: Math.PI / 2 },
  ];
  const lugares = [];
  for (let i = 0; i < total; i++) {
    const p = pared[i % 4];
    const indice = Math.floor(i / 4);
    const enPared = Math.min(porPared, Math.ceil((total - (i % 4)) / 4));
    const desplazamiento = (indice - (enPared - 1) / 2) * separacion;
    const separado = 0.06; // un poco despegado de la pared
    if (p.eje === "z") {
      lugares.push({ x: p.angulo === 0 ? desplazamiento : -desplazamiento, z: p.fijo + (p.fijo < 0 ? separado : -separado), angulo: p.angulo });
    } else {
      lugares.push({ x: p.fijo + (p.fijo < 0 ? separado : -separado), z: p.angulo < 0 ? desplazamiento : -desplazamiento, angulo: p.angulo });
    }
  }
  return { lado, lugares };
}
