import { useEffect, useState } from "react";

// Guarda el aviso de instalación del navegador (Chrome/Edge/Android) para mostrar
// nuestro propio botón "Instalar app". En iPhone no existe ese aviso: se indica
// cómo agregarla desde Safari (Compartir → Agregar a inicio).
let avisoGuardado = null;
const oyentes = new Set();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    avisoGuardado = event;
    oyentes.forEach((fn) => fn());
  });
  window.addEventListener("appinstalled", () => {
    avisoGuardado = null;
    oyentes.forEach((fn) => fn());
  });
}

const enModoApp = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true);

const esIphone = () => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

export default function useInstalarApp() {
  const [, refrescar] = useState(0);

  useEffect(() => {
    const fn = () => refrescar((n) => n + 1);
    oyentes.add(fn);
    return () => oyentes.delete(fn);
  }, []);

  async function instalar() {
    if (!avisoGuardado) return false;
    avisoGuardado.prompt();
    const { outcome } = await avisoGuardado.userChoice;
    avisoGuardado = null;
    oyentes.forEach((fn) => fn());
    return outcome === "accepted";
  }

  const instalada = enModoApp();
  return {
    instalada,
    puedeInstalar: !instalada && Boolean(avisoGuardado),
    instruccionesIphone: !instalada && !avisoGuardado && esIphone(),
    instalar,
  };
}
