import AvatarKpop from "./AvatarKpop";

// Muestra un sticker guardado (con la copia del avatar de quien lo mandó).
// Con onRemove aparece la ✕ para quitarlo (vista previa antes de enviar).
export default function StickerView({ sticker, size = 140, onRemove }) {
  if (!sticker?.avatar) return null;

  return (
    <div className="sticker-view">
      <AvatarKpop
        avatar={sticker.avatar}
        expresion={sticker.expresion}
        gesto={sticker.gesto}
        texto={sticker.texto}
        sticker
        size={size}
      />
      {onRemove && (
        <button type="button" className="gif-remove" onClick={onRemove} aria-label="Quitar sticker" title="Quitar sticker">
          ×
        </button>
      )}
    </div>
  );
}
