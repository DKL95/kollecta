import { useState } from "react";

const COVER_STYLE = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" };

// Foto que se oculta sola si el archivo no existe (queda el ícono / degradado de fondo).
// Se guarda qué src falló para que, si cambia la foto (p. ej. al editar el perfil), se vuelva a intentar.
export default function Photo({ src, alt = "", className = "thumb-photo", cover = false }) {
  const [failedSrc, setFailedSrc] = useState(null);
  if (!src || failedSrc === src) return null;
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailedSrc(src)}
      style={cover ? COVER_STYLE : undefined}
    />
  );
}
