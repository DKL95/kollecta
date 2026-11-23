import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import useGrupos from "../hooks/useGrupos";
import { COLORES_BANNER, TEXTURAS_BANNER, normalizarBanner } from "../utils/banner";
import ProfileBanner from "./ProfileBanner";

// Ventana para personalizar el banner del perfil propio, con vista previa en vivo.
export default function BannerDialog({ user, onClose, onSaved }) {
  const inicial = normalizarBanner(user.banner);
  const { grupos } = useGrupos();
  const [color, setColor] = useState(inicial.color);
  const [textura, setTextura] = useState(inicial.textura);
  const [logo, setLogo] = useState(inicial.logo);
  const [animado, setAnimado] = useState(inicial.animado);
  const [foto, setFoto] = useState(null);
  const [vistaFoto, setVistaFoto] = useState("");
  const [quitarImagen, setQuitarImagen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function alPresionarTecla(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", alPresionarTecla);
    return () => document.removeEventListener("keydown", alPresionarTecla);
  }, [onClose]);

  useEffect(() => {
    if (!foto) {
      setVistaFoto("");
      return undefined;
    }
    const url = URL.createObjectURL(foto);
    setVistaFoto(url);
    return () => URL.revokeObjectURL(url);
  }, [foto]);

  const imagenActual = vistaFoto || (quitarImagen ? "" : inicial.imagen);
  const seguidos = user.gruposFavoritos || [];
  const otros = grupos.filter((g) => !seguidos.includes(g.name));

  function elegirFoto(event) {
    const archivo = event.target.files?.[0] || null;
    if (archivo && archivo.size > 5 * 1024 * 1024) {
      setError("La imagen no puede pesar más de 5 MB.");
      event.target.value = "";
      return;
    }
    setError("");
    setFoto(archivo);
    if (archivo) setQuitarImagen(false);
  }

  function usarDiseno() {
    setFoto(null);
    setQuitarImagen(true);
    const input = document.getElementById("banner-foto");
    if (input) input.value = "";
  }

  async function guardar() {
    const datos = new FormData();
    datos.append("color", color);
    datos.append("textura", textura);
    datos.append("logo", logo);
    datos.append("animado", String(animado));
    if (foto) datos.append("portada", foto);
    else if (quitarImagen) datos.append("quitarImagen", "true");

    setGuardando(true);
    setError("");
    try {
      const respuesta = await apiRequest("/usuarios/me/banner", { method: "PUT", body: datos });
      onSaved(respuesta.usuario);
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  }

  return (
    <div className="group-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="group-dialog banner-dialog" role="dialog" aria-modal="true" aria-labelledby="banner-dialog-title">
        <div className="group-dialog-head">
          <h3 id="banner-dialog-title">Personalizar banner</h3>
          <button type="button" className="group-dialog-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        <div className="group-dialog-body">
          <ProfileBanner banner={{ color, textura, logo, animado, imagen: imagenActual }} className="banner-preview" />

          <fieldset className="banner-section">
            <legend>Imagen propia</legend>
            <p className="report-hint">
              Si subes una imagen, se muestra en lugar del diseño. Se ve mejor ancha (por ejemplo 1500 × 400). También puedes subir un GIF
              o WebP animado; el WebP pesa menos. Máximo 5 MB.
            </p>
            <div className="banner-image-row">
              <label className="btn btn-secondary btn-sm" htmlFor="banner-foto">
                {imagenActual ? "Cambiar imagen" : "Subir imagen"}
              </label>
              <input id="banner-foto" type="file" accept="image/*,.gif,.webp" onChange={elegirFoto} className="visually-hidden" />
              {imagenActual && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={usarDiseno}>
                  Quitar imagen y usar el diseño
                </button>
              )}
            </div>
          </fieldset>

          <fieldset className="banner-section" disabled={Boolean(imagenActual)}>
            <legend>Movimiento</legend>
            <label className="banner-toggle">
              <input type="checkbox" checked={animado} onChange={(event) => setAnimado(event.target.checked)} />
              Animar banner (el color, la textura y el logo se mueven)
            </label>
          </fieldset>

          <fieldset className="banner-section" disabled={Boolean(imagenActual)}>
            <legend>Color</legend>
            <div className="banner-swatches">
              {Object.entries(COLORES_BANNER).map(([id, opcion]) => (
                <button
                  key={id}
                  type="button"
                  className={`banner-swatch ${color === id ? "active" : ""}`}
                  style={{ background: opcion.fondo }}
                  onClick={() => setColor(id)}
                  aria-pressed={color === id}
                  title={opcion.etiqueta}
                >
                  <span className="visually-hidden">{opcion.etiqueta}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="banner-section" disabled={Boolean(imagenActual)}>
            <legend>Textura</legend>
            <div className="banner-textures">
              {Object.entries(TEXTURAS_BANNER).map(([id, opcion]) => (
                <button
                  key={id}
                  type="button"
                  className={`banner-texture ${textura === id ? "active" : ""}`}
                  onClick={() => setTextura(id)}
                  aria-pressed={textura === id}
                >
                  <span
                    className={`banner-texture-sample ${animado ? "animado" : ""}`}
                    style={{ background: COLORES_BANNER[color].fondo }}
                  >
                    {opcion.imagen !== "none" && (
                      <span style={{ backgroundImage: opcion.imagen, backgroundSize: opcion.tamano, "--banner-mover": opcion.mover }} />
                    )}
                  </span>
                  {opcion.etiqueta}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="banner-section" disabled={Boolean(imagenActual)}>
            <legend>Logo de un grupo</legend>
            <div className="field" style={{ margin: 0 }}>
              <select value={logo} onChange={(event) => setLogo(event.target.value)} aria-label="Logo de un grupo">
                <option value="">Sin logo</option>
                {seguidos.length > 0 && (
                  <optgroup label="Grupos que sigues">
                    {seguidos.map((nombre) => (
                      <option key={nombre} value={nombre}>
                        {nombre}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label={seguidos.length ? "Otros grupos" : "Grupos"}>
                  {otros.map((g) => (
                    <option key={g.id} value={g.name}>
                      {g.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </fieldset>

          {error && <p className="form-error">{error}</p>}

          <div className="report-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="btn btn-primary" onClick={guardar} disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar banner"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
