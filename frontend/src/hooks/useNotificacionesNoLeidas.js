import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { socket } from "../api/socket";

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
    if (!usuarioId) {
      setNoLeidas(0);
      if (socket.connected) socket.disconnect();
      return undefined;
    }

    function alRecibirNotificacion(payload = {}) {
      if (typeof payload.noLeidas === "number") {
        setNoLeidas(payload.noLeidas);
      } else {
        cargar();
      }

      // La página de notificaciones escucha este evento para insertar la tarjeta.
      if (payload.notificacion) {
        window.dispatchEvent(
          new CustomEvent("notificacion:nueva", {
            detail: payload.notificacion
          })
        );
      }
    }

    function alActualizarContador(payload = {}) {
      if (typeof payload.noLeidas === "number") {
        setNoLeidas(payload.noLeidas);
      } else {
        cargar();
      }
    }

    function reenviarEvento(evento, payload) {
      window.dispatchEvent(new CustomEvent(evento, { detail: payload }));
    }

    const alActualizarNotificacion = (payload) =>
      reenviarEvento("notificacion:actualizada", payload);
    const alMarcarTodasLeidas = () =>
      reenviarEvento("notificaciones:leidas-todas");
    const alEliminarNotificacion = (payload) =>
      reenviarEvento("notificacion:eliminada", payload);

    cargar();
    window.addEventListener("notificaciones-actualizadas", cargar);
    socket.on("notificacion:nueva", alRecibirNotificacion);
    socket.on("notificaciones:contador-actualizar", alActualizarContador);
    socket.on("notificacion:actualizada", alActualizarNotificacion);
    socket.on("notificaciones:leidas-todas", alMarcarTodasLeidas);
    socket.on("notificacion:eliminada", alEliminarNotificacion);

    // Sidebar vive durante la navegación autenticada: mantiene el socket activo
    // aunque el usuario no esté dentro de la pantalla de mensajes.
    if (!socket.connected) socket.connect();

    return () => {
      window.removeEventListener("notificaciones-actualizadas", cargar);
      socket.off("notificacion:nueva", alRecibirNotificacion);
      socket.off("notificaciones:contador-actualizar", alActualizarContador);
      socket.off("notificacion:actualizada", alActualizarNotificacion);
      socket.off("notificaciones:leidas-todas", alMarcarTodasLeidas);
      socket.off("notificacion:eliminada", alEliminarNotificacion);
    };
  }, [cargar, usuarioId]);

  return noLeidas;
}
