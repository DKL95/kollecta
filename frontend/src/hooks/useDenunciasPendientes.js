import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { esModerador } from "../utils/roles";

export const DENUNCIAS_ACTUALIZADAS = "kollecta:denuncias-actualizadas";

// Denuncias abiertas o en revisión (solo para moderación). Se refresca cada 2 minutos
// y cuando la pantalla de moderación avisa que atendió alguna.
export default function useDenunciasPendientes() {
  const { user } = useAuth();
  const puede = esModerador(user);
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    if (!puede) {
      setPendientes(0);
      return undefined;
    }

    let cancelado = false;
    const cargar = () =>
      apiRequest("/moderacion/resumen")
        .then((data) => !cancelado && setPendientes(data.pendientes || 0))
        .catch(() => {});

    cargar();
    const intervalo = setInterval(cargar, 120000);
    window.addEventListener(DENUNCIAS_ACTUALIZADAS, cargar);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
      window.removeEventListener(DENUNCIAS_ACTUALIZADAS, cargar);
    };
  }, [puede]);

  return pendientes;
}
