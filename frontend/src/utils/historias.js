/* ==========================================================================
   Historias y Klips: límites (los mismos que valida el backend), fondos de las
   historias de texto y ayudantes para leer la duración de un video y pedir la
   URL temporal de reproducción.
   ========================================================================== */

import { apiRequest } from "../api/client.js";

export const MAX_SEGUNDOS_HISTORIA = 15;
export const MAX_SEGUNDOS_KLIP = 60;
export const MAX_MB_IMAGEN_HISTORIA = 5;
export const MAX_MB_VIDEO_HISTORIA = 10;
export const MAX_MB_KLIP = 15;
export const MAX_TEXTO_HISTORIA = 200;
export const MAX_TEXTO_KLIP = 300;
export const SEGUNDOS_HISTORIA_FOTO = 6;

// Fondos de las historias de texto (deben coincidir con models/Historia.js).
export const FONDOS_HISTORIA = [
  { id: "kollecta", nombre: "KollectA", css: "linear-gradient(150deg, #ff4fa3 0%, #9b5cff 55%, #4fd8ff 100%)" },
  { id: "atardecer", nombre: "Atardecer", css: "linear-gradient(160deg, #ff9a5a 0%, #ff4f7b 60%, #8a2be2 100%)" },
  { id: "oceano", nombre: "Océano", css: "linear-gradient(160deg, #1fd1f9 0%, #2a5bd7 60%, #1b1464 100%)" },
  { id: "menta", nombre: "Menta", css: "linear-gradient(160deg, #a8ffcf 0%, #3ddc97 50%, #12806a 100%)" },
  { id: "noche", nombre: "Noche", css: "radial-gradient(circle at 30% 20%, #3b2a6b 0%, #150f28 60%, #07040f 100%)" },
  { id: "chicle", nombre: "Chicle", css: "linear-gradient(160deg, #ffd1ec 0%, #ff8fd0 50%, #c86bff 100%)" },
];

export function fondoCss(id) {
  return (FONDOS_HISTORIA.find((f) => f.id === id) || FONDOS_HISTORIA[0]).css;
}

export function megas(bytes) {
  return bytes / (1024 * 1024);
}

// Lee la duración de un archivo de video en el navegador (segundos, o null si no se puede).
export function leerDuracionVideo(archivo) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(archivo);
    const video = document.createElement("video");
    let listo = false;

    const terminar = (valor) => {
      if (listo) return;
      listo = true;
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
      resolve(valor);
    };

    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () => {
      // Los WebM grabados en el navegador dicen "Infinity" hasta que se adelantan al final.
      if (Number.isFinite(video.duration)) return terminar(video.duration);
      video.currentTime = 1e7;
      video.ontimeupdate = () => {
        video.ontimeupdate = null;
        terminar(Number.isFinite(video.duration) ? video.duration : null);
      };
    };
    video.onerror = () => terminar(null);
    setTimeout(() => terminar(null), 8000);
    video.src = url;
  });
}

// Revisa un video antes de subirlo; regresa { duracion } o { error }.
export async function revisarVideo(archivo, { maxSegundos, maxMb, nombre }) {
  if (!archivo.type.startsWith("video/")) return { error: "Elige un archivo de video." };
  if (megas(archivo.size) > maxMb) return { error: `${nombre} puede pesar como máximo ${maxMb} MB.` };

  const duracion = await leerDuracionVideo(archivo);
  if (duracion === null) return { duracion: null };
  if (duracion > maxSegundos + 0.5) {
    return { error: `${nombre} puede durar como máximo ${maxSegundos} segundos (el tuyo dura ${Math.round(duracion)} s).` };
  }
  return { duracion };
}

// "/api/videos/<id>" → URL temporal para <video src> (el permiso dura unos minutos).
export async function urlDeVideo(video) {
  const id = String(video || "").split("/").filter(Boolean).pop();
  const datos = await apiRequest(`/videos/${encodeURIComponent(id)}/playback-url`);
  if (!datos.url) throw new Error("El servidor no devolvió la URL del video");
  return datos.url;
}

export function formatoConteo(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")} M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")} mil`;
  return String(n);
}
