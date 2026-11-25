import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import { socket } from "../api/socket";

// Contador global de mensajes pendientes. AppLayout lo monta una sola vez y
// comparte el resultado entre la barra lateral y la navegación inferior.
export default function useMensajesNoLeidos(user) {
  const [noLeidos, setNoLeidos] = useState(0);
  const usuarioId = user?._id || user?.id;

  const cargar = useCallback(async () => {
    if (!usuarioId) {
      setNoLeidos(0);
      return;
    }

    try {
      const data = await apiRequest("/mensajes/no-leidos");
      setNoLeidos(Number(data?.noLeidos) || 0);
    } catch (error) {
      console.error("Error al cargar mensajes sin leer:", error);
    }
  }, [usuarioId]);

  useEffect(() => {
    if (!usuarioId) {
      setNoLeidos(0);
      return undefined;
    }

    function alActualizarContador(payload = {}) {
      if (typeof payload.noLeidos === "number") {
        setNoLeidos(payload.noLeidos);
      } else {
        // Compatibilidad con emisiones antiguas que no incluyen el total.
        cargar();
      }
    }

    socket.on("mensajes:contador-actualizar", alActualizarContador);
    socket.on("connect", cargar);
    window.addEventListener("mensajes-actualizados", cargar);

    // Socket.IO también lo utiliza el sistema de notificaciones y mensajes.
    // Este hook NO desconecta el socket al desmontarse.
    if (!socket.connected) socket.connect();
    cargar();

    return () => {
      socket.off("mensajes:contador-actualizar", alActualizarContador);
      socket.off("connect", cargar);
      window.removeEventListener("mensajes-actualizados", cargar);
    };
  }, [usuarioId, cargar]);

  return noLeidos;
}
