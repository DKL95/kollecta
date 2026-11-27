import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";

// Cuántas tareas terminadas faltan por reclamar. La barra lateral y la superior
// lo muestran; comparten una sola petición si se montan al mismo tiempo.
let enCurso = null;

function pedir() {
  if (!enCurso) {
    enCurso = apiRequest("/tareas").finally(() => {
      setTimeout(() => (enCurso = null), 500);
    });
  }
  return enCurso;
}

export default function useTareasPendientes() {
  const { user } = useAuth();
  const usuarioId = user?.id || user?._id;
  const [pendientes, setPendientes] = useState(0);

  const cargar = useCallback(async () => {
    if (!usuarioId) return setPendientes(0);
    try {
      const data = await pedir();
      setPendientes(data.porReclamar || 0);
    } catch {
      // sin conexión: se queda el último valor
    }
  }, [usuarioId]);

  useEffect(() => {
    cargar();
    const cadaRato = setInterval(cargar, 120_000);
    window.addEventListener("tareas-actualizadas", cargar);
    return () => {
      clearInterval(cadaRato);
      window.removeEventListener("tareas-actualizadas", cargar);
    };
  }, [cargar]);

  return pendientes;
}
