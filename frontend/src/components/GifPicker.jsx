import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../api/client";

// Botón "GIF" que abre un buscador (GIPHY a través del back end).
// onSelect({ url, ancho, alto, titulo }) recibe el GIF elegido.
export default function GifPicker({ onSelect, disabled = false, align = "left" }) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [gifs, setGifs] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
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

  // Busca 350 ms después de dejar de escribir (vacío = tendencias).
  useEffect(() => {
    if (!abierto) return undefined;
    let cancelado = false;
    const espera = setTimeout(async () => {
      setCargando(true);
      setError("");
      try {
        const q = busqueda.trim();
        const data = await apiRequest(`/gifs?limite=24${q ? `&q=${encodeURIComponent(q)}` : ""}`);
        if (!cancelado) setGifs(data.gifs || []);
      } catch (err) {
        if (!cancelado) {
          setGifs([]);
          setError(err.message || "No se pudieron cargar los GIFs");
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }, 350);
    return () => {
      cancelado = true;
      clearTimeout(espera);
    };
  }, [busqueda, abierto]);

  function elegir(gif) {
    onSelect({ url: gif.url, ancho: gif.ancho, alto: gif.alto, titulo: gif.titulo });
    setAbierto(false);
    setBusqueda("");
  }

  return (
    <div className="picker" ref={contenedor}>
      <button
        type="button"
        className="picker-toggle gif-toggle"
        onClick={() => setAbierto((valor) => !valor)}
        disabled={disabled}
        aria-label="Agregar GIF"
        aria-expanded={abierto}
        title="GIFs"
      >
        GIF
      </button>

      {abierto && (
        <div className={`picker-panel gif-panel ${align === "right" ? "align-right" : ""}`} role="dialog" aria-label="Buscar GIF">
          <input
            type="search"
            className="gif-search"
            placeholder="Buscar GIFs…"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            autoFocus
          />

          <div className="gif-grid">
            {gifs.map((gif) => (
              <button key={gif.id} type="button" onClick={() => elegir(gif)} title={gif.titulo}>
                <img src={gif.preview} alt={gif.titulo || "GIF"} loading="lazy" />
              </button>
            ))}
          </div>

          {cargando && gifs.length === 0 && <p className="picker-status">Cargando…</p>}
          {!cargando && error && <p className="picker-status">{error}</p>}
          {!cargando && !error && gifs.length === 0 && <p className="picker-status">Sin resultados.</p>}

          <p className="gif-credit">Powered by GIPHY</p>
        </div>
      )}
    </div>
  );
}
