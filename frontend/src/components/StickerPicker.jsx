import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { STICKERS_BASE } from "../utils/avatar";
import AvatarKpop from "./AvatarKpop";

// Botón de stickers: abre los stickers básicos y "Mis stickers", dibujados con
// el avatar de la persona. onSelect({ expresion, gesto, texto }) recibe el elegido.
export default function StickerPicker({ onSelect, disabled = false, align = "left" }) {
  const { user } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const [pestana, setPestana] = useState("base");
  const contenedor = useRef(null);
  const propios = user?.stickers || [];

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

  function elegir({ expresion, gesto, texto }) {
    onSelect({ expresion, gesto, texto });
    setAbierto(false);
  }

  const lista = pestana === "base" ? STICKERS_BASE : propios;

  return (
    <div className="picker" ref={contenedor}>
      <button
        type="button"
        className="picker-toggle sticker-toggle"
        onClick={() => setAbierto((valor) => !valor)}
        disabled={disabled}
        aria-label="Agregar sticker"
        aria-expanded={abierto}
        title="Stickers de tu avatar"
      >
        <AvatarKpop avatar={user?.avatar} expresion="feliz" size={22} titulo="Stickers" />
      </button>

      {abierto && (
        <div className={`picker-panel sticker-panel ${align === "right" ? "align-right" : ""}`} role="dialog" aria-label="Elegir sticker">
          {!user?.avatar ? (
            <div className="sticker-empty">
              <AvatarKpop avatar={null} expresion="guino" gesto="saludo" sticker size={96} />
              <p>Crea tu avatar para mandar stickers con tu propia cara.</p>
              <Link to="/avatar" className="btn btn-primary btn-sm" onClick={() => setAbierto(false)}>
                Crear mi avatar
              </Link>
            </div>
          ) : (
            <>
              <div className="sticker-tabs" role="tablist">
                <button type="button" role="tab" aria-selected={pestana === "base"} className={pestana === "base" ? "active" : ""} onClick={() => setPestana("base")}>
                  Básicos
                </button>
                <button type="button" role="tab" aria-selected={pestana === "mios"} className={pestana === "mios" ? "active" : ""} onClick={() => setPestana("mios")}>
                  Mis stickers ({propios.length})
                </button>
              </div>

              <div className="sticker-grid">
                {lista.map((item) => (
                  <button key={item.id || item._id} type="button" onClick={() => elegir(item)} title={item.texto || "Sticker"}>
                    <AvatarKpop avatar={user.avatar} expresion={item.expresion} gesto={item.gesto} texto={item.texto} sticker size={76} />
                  </button>
                ))}
              </div>

              {pestana === "mios" && propios.length === 0 && <p className="picker-status">Todavía no haces stickers.</p>}

              <Link to="/avatar#stickers" className="sticker-create" onClick={() => setAbierto(false)}>
                + Crear un sticker
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
