import { useEffect, useRef, useState } from "react";
import { CATEGORIAS_EMOJI } from "../utils/emojis";

// Botón 😊 que abre un panel de emojis. onSelect(emoji) agrega el emoji al texto.
export default function EmojiPicker({ onSelect, disabled = false, align = "left" }) {
  const [abierto, setAbierto] = useState(false);
  const [categoria, setCategoria] = useState(CATEGORIAS_EMOJI[0].id);
  const contenedor = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;
    const cerrar = (event) => {
      if (!contenedor.current?.contains(event.target)) setAbierto(false);
    };
    const conEscape = (event) => event.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", cerrar);
    document.addEventListener("keydown", conEscape);
    return () => {
      document.removeEventListener("mousedown", cerrar);
      document.removeEventListener("keydown", conEscape);
    };
  }, [abierto]);

  const actual = CATEGORIAS_EMOJI.find((c) => c.id === categoria) || CATEGORIAS_EMOJI[0];

  return (
    <div className="picker" ref={contenedor}>
      <button
        type="button"
        className="picker-toggle"
        onClick={() => setAbierto((valor) => !valor)}
        disabled={disabled}
        aria-label="Agregar emoji"
        aria-expanded={abierto}
        title="Emojis"
      >
        😊
      </button>

      {abierto && (
        <div className={`picker-panel emoji-panel ${align === "right" ? "align-right" : ""}`} role="dialog" aria-label="Emojis">
          <div className="emoji-tabs" role="tablist">
            {CATEGORIAS_EMOJI.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={c.id === categoria}
                className={c.id === categoria ? "active" : ""}
                onClick={() => setCategoria(c.id)}
                title={c.nombre}
              >
                {c.icono}
              </button>
            ))}
          </div>
          <div className="emoji-grid">
            {actual.emojis.map((emoji) => (
              <button key={emoji} type="button" onClick={() => onSelect(emoji)} aria-label={emoji}>
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
