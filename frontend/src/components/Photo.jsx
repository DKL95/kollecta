import { useState } from "react";

const COVER_STYLE = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" };

// Foto que se oculta sola si el archivo no existe (queda el ícono / degradado de fondo)
export default function Photo({ src, alt = "", className = "thumb-photo", cover = false }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      style={cover ? COVER_STYLE : undefined}
    />
  );
}
