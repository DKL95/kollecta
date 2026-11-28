import { useCallback, useEffect, useState } from "react";
import { urlDeVideo } from "../utils/historias";

/**
 * URL temporal de reproducción para un video guardado en GridFS.
 * activo = false: todavía no se pide (p. ej. un Klip que está lejos en el feed).
 * renovar(): pide una URL nueva (el permiso caduca a los 3 min; se usa en onError).
 */
export default function useVideoUrl(video, activo = true) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!video || !activo) return undefined;
    let cancelado = false;
    setError("");
    urlDeVideo(video)
      .then((nueva) => !cancelado && setUrl(nueva))
      .catch((err) => !cancelado && setError(err.message));
    return () => {
      cancelado = true;
    };
  }, [video, activo, intento]);

  const renovar = useCallback(() => setIntento((n) => (n < 3 ? n + 1 : n)), []);

  return { url, error, renovar };
}
