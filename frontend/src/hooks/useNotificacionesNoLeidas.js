import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";

// La barra lateral y la superior muestran el mismo contador. Si las dos lo piden
// al mismo tiempo, comparten una sola petición a /api/notificaciones.
let peticionEnCurso = null;

function pedirContador() {
  if (!peticionEnCurso) {
    peticionEnCurso = apiRequest("/notificaciones")
      .then((data) => data.noLeidas || 0)
      .finally(() => {
        peticionEnCurso = null;
      });
  }
  return peticionEnCurso;
}

export default function useNotificacionesNoLeidas() {
  const { user } = useAuth();
  const usuarioId = user?.id || user?._id || null;
  const [noLeidas, setNoLeidas] = useState(0);

  const cargar = useCallback(async () => {
    if (!usuarioId) {
      setNoLeidas(0);
      return;
    }
    try {
      setNoLeidas(await pedirContador());
    } catch (error) {
      console.error("Error al consultar notificaciones:", error);
    }
  }, [usuarioId]);

  useEffect(() => {
    cargar();
    window.addEventListener("notificaciones-actualizadas", cargar);
    return () => window.removeEventListener("notificaciones-actualizadas", cargar);
  }, [cargar]);

  return noLeidas;
}
