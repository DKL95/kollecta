import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { apiRequest } from "../api/client";
import AvatarKpop from "../components/AvatarKpop";
import { useAuth } from "../context/AuthContext";
import {
  ACCESORIOS,
  BOCAS,
  CABELLOS,
  CEJAS,
  COLOR_CABELLO,
  COLOR_OJOS,
  COLOR_ROPA,
  EXPRESIONES,
  FONDOS,
  GESTOS,
  MAX_TEXTO_STICKER,
  MEJILLAS,
  OJOS,
  PIEL,
  ROPAS,
  STICKERS_BASE,
  avatarAleatorio,
  completarAvatar,
} from "../utils/avatar";

// Pestañas del editor. "tipo: color" pinta muestras; "estilo" pinta el avatar con esa opción.
const PESTANAS = [
  {
    id: "cara",
    etiqueta: "Cara",
    grupos: [
      { clave: "piel", titulo: "Tono de piel", opciones: PIEL, tipo: "color" },
      { clave: "ojos", titulo: "Ojos", opciones: OJOS, tipo: "estilo", zoom: true },
      { clave: "colorOjos", titulo: "Color de ojos", opciones: COLOR_OJOS, tipo: "color" },
      { clave: "cejas", titulo: "Cejas", opciones: CEJAS, tipo: "estilo", zoom: true },
      { clave: "boca", titulo: "Boca", opciones: BOCAS, tipo: "estilo", zoom: true },
      { clave: "mejillas", titulo: "Detalles", opciones: MEJILLAS, tipo: "estilo", zoom: true },
    ],
  },
  {
    id: "cabello",
    etiqueta: "Cabello",
    grupos: [
      { clave: "cabello", titulo: "Peinado", opciones: CABELLOS, tipo: "estilo" },
      { clave: "colorCabello", titulo: "Color", opciones: COLOR_CABELLO, tipo: "color" },
    ],
  },
  {
    id: "ropa",
    etiqueta: "Ropa",
    grupos: [
      { clave: "ropa", titulo: "Prenda", opciones: ROPAS, tipo: "estilo" },
      { clave: "colorRopa", titulo: "Color", opciones: COLOR_ROPA, tipo: "color" },
    ],
  },
  {
    id: "accesorios",
    etiqueta: "Accesorios",
    grupos: [{ clave: "accesorio", titulo: "Accesorio", opciones: ACCESORIOS, tipo: "estilo" }],
  },
  {
    id: "fondo",
    etiqueta: "Fondo",
    grupos: [{ clave: "fondo", titulo: "Fondo", opciones: FONDOS, tipo: "fondo" }],
  },
];

const iguales = (a, b) => JSON.stringify(completarAvatar(a)) === JSON.stringify(completarAvatar(b));

// Convierte el SVG del avatar en un PNG cuadrado para usarlo como foto de perfil.
async function svgAPng(svg, lado = 512) {
  const copia = svg.cloneNode(true);
  copia.setAttribute("width", lado);
  copia.setAttribute("height", lado);
  const texto = new XMLSerializer().serializeToString(copia);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(texto)}`;

  const imagen = new Image();
  await new Promise((resolver, rechazar) => {
    imagen.onload = resolver;
    imagen.onerror = () => rechazar(new Error("No se pudo dibujar el avatar"));
    imagen.src = url;
  });

  const lienzo = document.createElement("canvas");
  lienzo.width = lado;
  lienzo.height = lado;
  lienzo.getContext("2d").drawImage(imagen, 0, 0, lado, lado);

  return new Promise((resolver, rechazar) =>
    lienzo.toBlob((blob) => (blob ? resolver(blob) : rechazar(new Error("No se pudo crear la imagen"))), "image/png")
  );
}

export default function AvatarPage() {
  const { user, saveUser } = useAuth();
  const location = useLocation();
  const [avatar, setAvatar] = useState(() => completarAvatar(user?.avatar));
  const [pestana, setPestana] = useState(PESTANAS[0].id);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState(null); // { tipo: "ok" | "error", texto }
  const [pose, setPose] = useState({ expresion: "feliz", gesto: "saludo", texto: "" });
  const [guardandoSticker, setGuardandoSticker] = useState(false);
  const vistaFoto = useRef(null);
  const seccionStickers = useRef(null);

  const tieneAvatar = Boolean(user?.avatar);
  const sinGuardar = !tieneAvatar || !iguales(avatar, user?.avatar);
  const grupos = useMemo(() => PESTANAS.find((p) => p.id === pestana).grupos, [pestana]);

  useEffect(() => {
    if (location.hash !== "#stickers") return undefined;
    // Esperar a que se pinte la página antes de bajar a la sección.
    const espera = setTimeout(() => seccionStickers.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    return () => clearTimeout(espera);
  }, [location.hash]);

  useEffect(() => {
    if (!aviso) return undefined;
    const espera = setTimeout(() => setAviso(null), 4000);
    return () => clearTimeout(espera);
  }, [aviso]);

  function cambiar(clave, valor) {
    setAvatar((actual) => ({ ...actual, [clave]: valor }));
  }

  async function guardar() {
    setGuardando(true);
    try {
      const data = await apiRequest("/usuarios/me/avatar", { method: "PUT", body: { avatar } });
      saveUser(data.usuario);
      setAviso({ tipo: "ok", texto: "¡Avatar guardado! Ya puedes mandar stickers." });
    } catch (err) {
      setAviso({ tipo: "error", texto: err.message });
    } finally {
      setGuardando(false);
    }
  }

  async function usarComoFoto() {
    if (!vistaFoto.current) return;
    setGuardando(true);
    try {
      const png = await svgAPng(vistaFoto.current);
      const form = new FormData();
      form.append("fotoPerfil", png, "avatar.png");
      const data = await apiRequest("/usuarios/me", { method: "PUT", body: form });
      saveUser(data.usuario);
      setAviso({ tipo: "ok", texto: "Tu avatar ahora es tu foto de perfil." });
    } catch (err) {
      setAviso({ tipo: "error", texto: err.message });
    } finally {
      setGuardando(false);
    }
  }

  async function guardarSticker(event) {
    event.preventDefault();
    setGuardandoSticker(true);
    try {
      const data = await apiRequest("/usuarios/me/stickers", { method: "POST", body: pose });
      saveUser(data.usuario);
      setPose((actual) => ({ ...actual, texto: "" }));
      setAviso({ tipo: "ok", texto: "Sticker guardado en «Mis stickers»." });
    } catch (err) {
      setAviso({ tipo: "error", texto: err.message });
    } finally {
      setGuardandoSticker(false);
    }
  }

  async function borrarSticker(id) {
    try {
      const data = await apiRequest(`/usuarios/me/stickers/${id}`, { method: "DELETE" });
      saveUser(data.usuario);
    } catch (err) {
      setAviso({ tipo: "error", texto: err.message });
    }
  }

  return (
    <main className="page avatar-page">
      <section className="avatar-editor">
        <div className="avatar-preview">
          <div className="avatar-preview-frame">
            <AvatarKpop ref={vistaFoto} avatar={avatar} fondo size={240} titulo="Vista previa de tu avatar" />
          </div>

          <div className="avatar-preview-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAvatar(avatarAleatorio())}>
              🎲 Aleatorio
            </button>
            {tieneAvatar && sinGuardar && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAvatar(completarAvatar(user.avatar))}>
                Deshacer cambios
              </button>
            )}
          </div>

          <button type="button" className="btn btn-primary btn-block" onClick={guardar} disabled={guardando || !sinGuardar}>
            {guardando ? "Guardando…" : sinGuardar ? (tieneAvatar ? "Guardar cambios" : "Crear mi avatar") : "Avatar guardado ✓"}
          </button>
          <button type="button" className="btn btn-secondary btn-block" onClick={usarComoFoto} disabled={guardando}>
            Usar como foto de perfil
          </button>

          {aviso && (
            <p className={`avatar-aviso ${aviso.tipo}`} role={aviso.tipo === "error" ? "alert" : "status"}>
              {aviso.texto}
            </p>
          )}
        </div>

        <div className="avatar-options">
          <div className="avatar-tabs" role="tablist" aria-label="Partes del avatar">
            {PESTANAS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={pestana === p.id}
                className={pestana === p.id ? "active" : ""}
                onClick={() => setPestana(p.id)}
              >
                {p.etiqueta}
              </button>
            ))}
          </div>

          {grupos.map((grupo) => (
            <fieldset key={grupo.clave} className="avatar-group">
              <legend>{grupo.titulo}</legend>
              <div className={`avatar-choices ${grupo.tipo}`}>
                {Object.entries(grupo.opciones).map(([id, opcion]) => {
                  const activo = avatar[grupo.clave] === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`avatar-choice ${activo ? "active" : ""}`}
                      onClick={() => cambiar(grupo.clave, id)}
                      aria-pressed={activo}
                      title={opcion.etiqueta}
                    >
                      {grupo.tipo === "color" && <span className="avatar-swatch" style={{ background: opcion.color }} />}
                      {grupo.tipo === "fondo" && (
                        <span className="avatar-swatch fondo" style={{ background: `linear-gradient(135deg, ${opcion.colores.join(", ")})` }} />
                      )}
                      {grupo.tipo === "estilo" && (
                        <span className={`avatar-choice-art ${grupo.zoom ? "zoom" : ""}`}>
                          <AvatarKpop avatar={{ ...avatar, [grupo.clave]: id }} size={grupo.zoom ? 120 : 64} titulo={opcion.etiqueta} />
                        </span>
                      )}
                      <span className="avatar-choice-label">{opcion.etiqueta}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      </section>

      <section className="avatar-stickers" id="stickers" ref={seccionStickers}>
        <div className="page-header">
          <div>
            <h2>Mis stickers</h2>
            <p className="sub">Arma stickers con tu avatar para mandarlos en el chat y en tus publicaciones.</p>
          </div>
        </div>

        {!tieneAvatar ? (
          <p className="avatar-hint">Primero guarda tu avatar para poder hacer stickers.</p>
        ) : (
          <div className="sticker-maker">
            <form className="sticker-maker-form" onSubmit={guardarSticker}>
              <div className="sticker-maker-preview">
                <AvatarKpop avatar={user.avatar} expresion={pose.expresion} gesto={pose.gesto} texto={pose.texto} sticker size={180} />
              </div>

              <fieldset className="avatar-group">
                <legend>Expresión</legend>
                <div className="chip-row">
                  {Object.entries(EXPRESIONES).map(([id, { etiqueta }]) => (
                    <button key={id} type="button" className={`chip ${pose.expresion === id ? "active" : ""}`} aria-pressed={pose.expresion === id} onClick={() => setPose({ ...pose, expresion: id })}>
                      {etiqueta}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="avatar-group">
                <legend>Gesto</legend>
                <div className="chip-row">
                  {Object.entries(GESTOS).map(([id, { etiqueta }]) => (
                    <button key={id} type="button" className={`chip ${pose.gesto === id ? "active" : ""}`} aria-pressed={pose.gesto === id} onClick={() => setPose({ ...pose, gesto: id })}>
                      {etiqueta}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="avatar-group sticker-text">
                <span>Texto (opcional)</span>
                <input
                  type="text"
                  value={pose.texto}
                  maxLength={MAX_TEXTO_STICKER}
                  placeholder="Ej. ¡Saranghae!"
                  onChange={(event) => setPose({ ...pose, texto: event.target.value })}
                />
                <small>{pose.texto.length}/{MAX_TEXTO_STICKER}</small>
              </label>

              <button type="submit" className="btn btn-primary" disabled={guardandoSticker || (user.stickers || []).length >= 30}>
                {guardandoSticker ? "Guardando…" : "Guardar sticker"}
              </button>
            </form>

            <div className="sticker-collection">
              <h3>Guardados ({(user.stickers || []).length}/30)</h3>
              {(user.stickers || []).length === 0 ? (
                <p className="avatar-hint">Aquí aparecerán los stickers que guardes.</p>
              ) : (
                <div className="sticker-grid grande">
                  {user.stickers.map((s) => (
                    <div key={s._id} className="sticker-saved">
                      <AvatarKpop avatar={user.avatar} expresion={s.expresion} gesto={s.gesto} texto={s.texto} sticker size={96} />
                      <button type="button" className="gif-remove" onClick={() => borrarSticker(s._id)} aria-label={`Borrar sticker ${s.texto || ""}`} title="Borrar">
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <h3>Básicos (siempre disponibles)</h3>
              <div className="sticker-grid grande">
                {STICKERS_BASE.map((s) => (
                  <div key={s.id} className="sticker-saved">
                    <AvatarKpop avatar={user.avatar} expresion={s.expresion} gesto={s.gesto} texto={s.texto} sticker size={96} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
