// Muestra un GIF guardado. Con onRemove aparece la ✕ para quitarlo (vista previa antes de enviar).
export default function GifView({ gif, onRemove, size = "md" }) {
  if (!gif?.url) return null;

  const proporcion = gif.ancho && gif.alto ? `${gif.ancho} / ${gif.alto}` : undefined;

  return (
    <div className={`gif-view gif-${size}`}>
      <img src={gif.url} alt={gif.titulo || "GIF"} loading="lazy" style={proporcion ? { aspectRatio: proporcion } : undefined} />
      <span className="gif-badge">GIF</span>
      {onRemove && (
        <button type="button" className="gif-remove" onClick={onRemove} aria-label="Quitar GIF" title="Quitar GIF">
          ×
        </button>
      )}
    </div>
  );
}
