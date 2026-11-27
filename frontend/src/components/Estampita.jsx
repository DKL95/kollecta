import EstampitaArte from "./EstampitaArte";
import { ESTAMPITA_POR_ID, RAREZAS, SERIES, numeroDe } from "../utils/estampitas";

/**
 * Tarjeta de una estampita.
 * - bloqueada: todavía no la tienes (silueta y "?").
 * - cantidad: si tienes repetidas, aparece "×2".
 * - nueva: etiqueta "¡Nueva!" (al abrir un sobre).
 * - tamano: "sm" | "md" | "lg".
 */
export default function Estampita({ id, bloqueada = false, cantidad = 0, nueva = false, tamano = "md", onClick }) {
  const datos = ESTAMPITA_POR_ID[id];
  if (!datos) return null;

  const serie = SERIES[datos.serie];
  const rareza = RAREZAS[datos.rareza];
  const numero = String(numeroDe(id)).padStart(2, "0");
  const Etiqueta = onClick ? "button" : "div";

  return (
    <Etiqueta
      type={onClick ? "button" : undefined}
      className={`estampita tam-${tamano} rareza-${datos.rareza} ${bloqueada ? "bloqueada" : ""}`}
      style={{ "--serie-a": serie.colores[0], "--serie-b": serie.colores[1], "--acento": serie.acento, "--rareza": rareza.color }}
      onClick={onClick}
      aria-label={bloqueada ? `Estampita #${numero} (no la tienes)` : `${datos.nombre}, ${rareza.nombre}${cantidad > 1 ? `, tienes ${cantidad}` : ""}`}
    >
      <span className="estampita-num">#{numero}</span>
      {cantidad > 1 && !bloqueada && <span className="estampita-cantidad">×{cantidad}</span>}
      {nueva && <span className="estampita-nueva">¡Nueva!</span>}

      <span className="estampita-arte">
        <EstampitaArte id={id} titulo={bloqueada ? "Estampita bloqueada" : datos.nombre} />
        {bloqueada && <span className="estampita-candado" aria-hidden="true">?</span>}
      </span>

      <span className="estampita-pie">
        <span className="estampita-nombre">{bloqueada ? "???" : datos.nombre}</span>
        <span className="estampita-estrellas" aria-hidden="true">
          {"★".repeat(rareza.estrellas)}
        </span>
      </span>
    </Etiqueta>
  );
}
