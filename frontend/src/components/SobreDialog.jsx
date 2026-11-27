import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Estampita from "./Estampita";
import { SERIES } from "../utils/estampitas";

/**
 * Sobre de estampitas: primero se ve cerrado; al tocarlo se abre y las
 * estampitas se voltean una por una.
 * estampitas: [{ id, nueva }]   seriesNuevas: ["snacks", ...]
 */
export default function SobreDialog({ titulo = "¡Ganaste un sobre!", estampitas, seriesNuevas = [], onCerrar }) {
  const [abierto, setAbierto] = useState(false);
  const [volteadas, setVolteadas] = useState(0);

  useEffect(() => {
    const conEscape = (event) => event.key === "Escape" && onCerrar();
    window.addEventListener("keydown", conEscape);
    return () => window.removeEventListener("keydown", conEscape);
  }, [onCerrar]);

  // Voltea una estampita cada 450 ms (o todas juntas si se pide menos movimiento).
  useEffect(() => {
    if (!abierto || volteadas >= estampitas.length) return undefined;
    const reducir = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reducir) {
      setVolteadas(estampitas.length);
      return undefined;
    }
    const espera = setTimeout(() => setVolteadas((n) => n + 1), volteadas === 0 ? 250 : 450);
    return () => clearTimeout(espera);
  }, [abierto, volteadas, estampitas.length]);

  const terminado = abierto && volteadas >= estampitas.length;

  return (
    <div className="sobre-backdrop" role="dialog" aria-modal="true" aria-label={titulo} onMouseDown={(e) => e.target === e.currentTarget && terminado && onCerrar()}>
      <div className="sobre-dialog">
        <h3>{abierto ? (terminado ? "¡Mira lo que salió!" : "Abriendo…") : titulo}</h3>

        {!abierto ? (
          <button type="button" className="sobre-cerrado" onClick={() => setAbierto(true)} autoFocus>
            <span className="sobre-brillo" aria-hidden="true" />
            <span className="sobre-logo">K</span>
            <span className="sobre-texto">{estampitas.length} {estampitas.length === 1 ? "estampita" : "estampitas"}</span>
            <span className="sobre-accion">Toca para abrir</span>
          </button>
        ) : (
          <div className="sobre-cartas">
            {estampitas.map((e, i) => (
              <div key={`${e.id}-${i}`} className={`sobre-carta ${i < volteadas ? "volteada" : ""}`}>
                <div className="sobre-carta-dorso" aria-hidden="true">
                  <span>K</span>
                </div>
                <div className="sobre-carta-frente">
                  <Estampita id={e.id} nueva={e.nueva} tamano="md" />
                </div>
              </div>
            ))}
          </div>
        )}

        {terminado && seriesNuevas.length > 0 && (
          <p className="sobre-serie" role="status">
            🎉 ¡Completaste la serie {seriesNuevas.map((s) => SERIES[s]?.nombre || s).join(" y ")}!
          </p>
        )}

        {terminado && (
          <div className="sobre-acciones">
            <Link to="/estampitas" className="btn btn-secondary btn-sm" onClick={onCerrar}>
              Ver mi álbum
            </Link>
            <button type="button" className="btn btn-primary btn-sm" onClick={onCerrar} autoFocus>
              ¡Genial!
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
