/* ==========================================================================
   Sonido corto al pasar el cursor sobre las piezas de la colección.
   Se genera con Web Audio (no hay archivo de audio). Los navegadores no dejan
   sonar nada hasta que la persona hace clic o toca la página una vez, así que
   el primer hover antes de cualquier clic queda en silencio.
   ========================================================================== */

import { useEffect, useState } from "react";

const CLAVE = "kollecta_sonido";
const EVENTO = "kollecta:sonido-cambio";
const VOLUMEN = 0.05;
const ESPERA_MINIMA_MS = 70;

let contexto = null;
let ultimoSonido = 0;

function leerActivo() {
  try {
    return localStorage.getItem(CLAVE) !== "off";
  } catch {
    return true;
  }
}

function obtenerContexto() {
  if (contexto) return contexto;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  contexto = new Ctx();
  return contexto;
}

// Desbloquear el audio con la primera interacción de la persona.
if (typeof window !== "undefined") {
  const desbloquear = () => {
    obtenerContexto()?.resume?.().catch(() => {});
    window.removeEventListener("pointerdown", desbloquear);
    window.removeEventListener("keydown", desbloquear);
  };
  window.addEventListener("pointerdown", desbloquear);
  window.addEventListener("keydown", desbloquear);
}

export function reproducirHover() {
  if (!leerActivo()) return;

  const ahora = performance.now();
  if (ahora - ultimoSonido < ESPERA_MINIMA_MS) return;
  ultimoSonido = ahora;

  const ctx = obtenerContexto();
  if (!ctx || ctx.state !== "running") return;

  // "Pop" suave: un tono que sube un poco y se apaga en ~90 ms.
  const t = ctx.currentTime;
  const oscilador = ctx.createOscillator();
  const ganancia = ctx.createGain();

  oscilador.type = "sine";
  oscilador.frequency.setValueAtTime(660, t);
  oscilador.frequency.exponentialRampToValueAtTime(990, t + 0.06);

  ganancia.gain.setValueAtTime(0.0001, t);
  ganancia.gain.exponentialRampToValueAtTime(VOLUMEN, t + 0.012);
  ganancia.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

  oscilador.connect(ganancia).connect(ctx.destination);
  oscilador.start(t);
  oscilador.stop(t + 0.1);
}

// Estado del interruptor de sonido, compartido entre pantallas.
export function useSonidoActivo() {
  const [activo, setActivo] = useState(leerActivo);

  useEffect(() => {
    const actualizar = () => setActivo(leerActivo());
    window.addEventListener(EVENTO, actualizar);
    return () => window.removeEventListener(EVENTO, actualizar);
  }, []);

  function alternar() {
    try {
      localStorage.setItem(CLAVE, activo ? "off" : "on");
    } catch {
      /* sin almacenamiento: solo dura esta visita */
    }
    setActivo(!activo);
    window.dispatchEvent(new Event(EVENTO));
    if (!activo) {
      obtenerContexto()?.resume?.().catch(() => {});
    }
  }

  return [activo, alternar];
}
