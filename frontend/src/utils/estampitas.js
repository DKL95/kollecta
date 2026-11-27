/* ==========================================================================
   Estampitas coleccionables: nombres, descripciones y colores.
   id, serie y rareza deben coincidir con models/estampitas.js (lo revisa
   tests/frontend.test.mjs). El dibujo está en components/EstampitaArte.jsx.
   ========================================================================== */

export const SERIES = {
  lightsticks: { nombre: "Lightsticks", emoji: "🔦", colores: ["#2b1a55", "#6d3bd6"], acento: "#b69cff" },
  albumes: { nombre: "Álbumes", emoji: "💿", colores: ["#3a1236", "#c2357f"], acento: "#ff8fc7" },
  escenario: { nombre: "Escenario", emoji: "🎤", colores: ["#0f1b3d", "#2f5bd3"], acento: "#7fb2ff" },
  fandom: { nombre: "Fandom", emoji: "💌", colores: ["#3d1a1a", "#d9573b"], acento: "#ffb08a" },
  snacks: { nombre: "Snacks coreanos", emoji: "🍜", colores: ["#3b2a0c", "#d9902b"], acento: "#ffd166" },
  seul: { nombre: "Seúl", emoji: "🏙️", colores: ["#0d2e2a", "#1f9a7f"], acento: "#7fe0c4" },
};

export const RAREZAS = {
  comun: { nombre: "Común", estrellas: 1, color: "#c9c4d6" },
  rara: { nombre: "Rara", estrellas: 2, color: "#4fd8ff" },
  epica: { nombre: "Épica", estrellas: 3, color: "#c084fc" },
  legendaria: { nombre: "Legendaria", estrellas: 4, color: "#ffd166" },
};

const e = (id, serie, rareza, nombre, descripcion) => ({ id, serie, rareza, nombre, descripcion });

export const ESTAMPITAS = [
  e("ls_estrella", "lightsticks", "comun", "Lightstick estrella", "Brilla amarillo cuando empieza tu canción favorita."),
  e("ls_corazon", "lightsticks", "comun", "Lightstick corazón", "Para mandar amor desde la última fila."),
  e("ls_luna", "lightsticks", "rara", "Lightstick luna", "Ilumina los conciertos que terminan de noche."),
  e("ls_diamante", "lightsticks", "rara", "Lightstick diamante", "Cada cara refleja un color distinto."),
  e("ls_corona", "lightsticks", "epica", "Lightstick corona", "Solo para la realeza del fandom."),
  e("ls_arcoiris", "lightsticks", "legendaria", "Lightstick arcoíris", "Cambia de color con el ritmo del estadio entero."),

  e("al_debut", "albumes", "comun", "Álbum debut", "El primer paso de todo grupo."),
  e("al_verano", "albumes", "comun", "Álbum de verano", "Huele a playa y canciones alegres."),
  e("al_invierno", "albumes", "rara", "Álbum de invierno", "Baladas para escuchar con chocolate caliente."),
  e("al_retro", "albumes", "rara", "Álbum retro", "Estilo de los noventa, con todo y casete."),
  e("al_holo", "albumes", "epica", "Álbum holográfico", "La portada cambia de color según la luz."),
  e("al_firmado", "albumes", "legendaria", "Álbum firmado", "Con firma y corazón dibujado a mano."),

  e("es_micro", "escenario", "comun", "Micrófono", "Listo para el primer verso."),
  e("es_inear", "escenario", "comun", "Monitores in-ear", "Así se escuchan entre los gritos del público."),
  e("es_reflector", "escenario", "rara", "Reflector", "Todas las miradas en el centro del escenario."),
  e("es_confeti", "escenario", "rara", "Lluvia de confeti", "El final perfecto de un encore."),
  e("es_setlist", "escenario", "epica", "Setlist", "La lista secreta de canciones del concierto."),
  e("es_trofeo", "escenario", "legendaria", "Trofeo del primer lugar", "Ganar en un programa musical: el sueño de todo fandom."),

  e("fa_photocard", "fandom", "comun", "Photocard", "La tarjeta que todos quieren intercambiar."),
  e("fa_boleto", "fandom", "comun", "Boleto de concierto", "Fila VIP, asiento soñado."),
  e("fa_pancarta", "fandom", "rara", "Pancarta", "Hecha a mano para que te vean desde el escenario."),
  e("fa_binder", "fandom", "rara", "Binder", "Donde viven las photocards bien protegidas."),
  e("fa_megafono", "fandom", "epica", "Fanchant", "El fandom grita los nombres al mismo tiempo."),
  e("fa_firma", "fandom", "legendaria", "Evento de firmas", "Ese momento de verse frente a frente."),

  e("sn_tteokbokki", "snacks", "comun", "Tteokbokki", "Pasteles de arroz en salsa picosita."),
  e("sn_ramyeon", "snacks", "comun", "Ramyeon", "Se come directo de la ollita."),
  e("sn_bungeoppang", "snacks", "rara", "Bungeoppang", "Pancito con forma de pez y relleno dulce."),
  e("sn_kimbap", "snacks", "rara", "Kimbap", "Rollitos para llevar al concierto."),
  e("sn_bingsu", "snacks", "epica", "Bingsu", "Hielo raspado con fruta para el calor."),
  e("sn_pollo", "snacks", "legendaria", "Pollo frito coreano", "Crujiente, para ver el comeback con amigos."),

  e("se_torre", "seul", "comun", "Torre de Seúl", "Desde arriba se ve toda la ciudad."),
  e("se_hanok", "seul", "comun", "Casa hanok", "Techos curvos de la arquitectura tradicional."),
  e("se_rio", "seul", "rara", "Río Han", "Picnic de noche con vista a los puentes."),
  e("se_metro", "seul", "rara", "Metro de Seúl", "La línea verde lleva a todas partes."),
  e("se_palacio", "seul", "epica", "Palacio", "Puertas antiguas y techos de colores."),
  e("se_cerezos", "seul", "legendaria", "Cerezos en flor", "Solo florecen unos días en primavera."),
];

export const ESTAMPITA_POR_ID = Object.fromEntries(ESTAMPITAS.map((x) => [x.id, x]));

export function numeroDe(id) {
  return ESTAMPITAS.findIndex((x) => x.id === id) + 1;
}
