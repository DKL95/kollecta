import { useCallback, useEffect, useRef, useState } from "react";
import EstampitaArte from "../EstampitaArte";
import { ESTAMPITAS, ESTAMPITA_POR_ID, SERIES } from "../../utils/estampitas";

/* ==========================================================================
   Memorama de estampitas: 8 pares en un tablero de 4 × 4.
   Puntaje = 1000 − 25 por cada movimiento extra − 4 por segundo (mínimo 50).
   ========================================================================== */

const PARES = 8;

function barajar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function nuevoTablero() {
  const elegidas = barajar(ESTAMPITAS).slice(0, PARES).map((e) => e.id);
  return barajar([...elegidas, ...elegidas]).map((id, i) => ({ clave: i, id, encontrada: false }));
}

export function calcularPuntaje(movimientos, segundos) {
  return Math.min(1000, Math.max(50, Math.round(1000 - Math.max(0, movimientos - PARES) * 25 - segundos * 4)));
}

export default function MemoramaJuego({ onTerminar, onReiniciar }) {
  const [cartas, setCartas] = useState(nuevoTablero);
  const [abiertas, setAbiertas] = useState([]);
  const [movimientos, setMovimientos] = useState(0);
  const [inicio, setInicio] = useState(null);
  const [segundos, setSegundos] = useState(0);
  const [fin, setFin] = useState(null);
  const bloqueado = useRef(false);

  useEffect(() => {
    if (!inicio || fin) return undefined;
    const reloj = setInterval(() => setSegundos(Math.floor((Date.now() - inicio) / 1000)), 250);
    return () => clearInterval(reloj);
  }, [inicio, fin]);

  const reiniciar = useCallback(() => {
    setCartas(nuevoTablero());
    setAbiertas([]);
    setMovimientos(0);
    setInicio(null);
    setSegundos(0);
    setFin(null);
    bloqueado.current = false;
    onReiniciar?.();
  }, [onReiniciar]);

  function voltear(indice) {
    if (bloqueado.current || fin) return;
    const carta = cartas[indice];
    if (carta.encontrada || abiertas.includes(indice)) return;
    if (!inicio) setInicio(Date.now());

    const nuevas = [...abiertas, indice];
    setAbiertas(nuevas);
    if (nuevas.length < 2) return;

    const [a, b] = nuevas;
    const totalMovimientos = movimientos + 1;
    setMovimientos(totalMovimientos);
    bloqueado.current = true;

    if (cartas[a].id === cartas[b].id) {
      const actualizadas = cartas.map((c, i) => (i === a || i === b ? { ...c, encontrada: true } : c));
      setTimeout(() => {
        setCartas(actualizadas);
        setAbiertas([]);
        bloqueado.current = false;
        if (actualizadas.every((c) => c.encontrada)) {
          const tiempo = Math.floor((Date.now() - (inicio || Date.now())) / 1000);
          const puntos = calcularPuntaje(totalMovimientos, tiempo);
          setSegundos(tiempo);
          setFin({ puntos, tiempo });
          onTerminar?.(puntos);
        }
      }, 350);
    } else {
      setTimeout(() => {
        setAbiertas([]);
        bloqueado.current = false;
      }, 800);
    }
  }

  return (
    <div className="memorama">
      <div className="juego-marcador">
        <span>🔁 {movimientos} movimientos</span>
        <span>⏱ {segundos}s</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={reiniciar}>Revolver</button>
      </div>

      <div className="memorama-tablero">
        {cartas.map((c, i) => {
          const visible = c.encontrada || abiertas.includes(i);
          const serie = SERIES[ESTAMPITA_POR_ID[c.id].serie];
          return (
            <button
              key={c.clave}
              type="button"
              className={`memorama-carta ${visible ? "visible" : ""} ${c.encontrada ? "encontrada" : ""}`}
              onClick={() => voltear(i)}
              aria-label={visible ? ESTAMPITA_POR_ID[c.id].nombre : `Carta ${i + 1} boca abajo`}
              aria-pressed={visible}
            >
              <span className="memorama-dorso" aria-hidden="true">K</span>
              <span className="memorama-frente" style={{ background: `linear-gradient(160deg, ${serie.colores[0]}, ${serie.colores[1]})` }}>
                <EstampitaArte id={c.id} titulo={ESTAMPITA_POR_ID[c.id].nombre} />
              </span>
            </button>
          );
        })}

        {fin && (
          <div className="juego-overlay">
            <p className="juego-overlay-titulo">¡Lo lograste!</p>
            <p className="juego-overlay-puntos">{fin.puntos} puntos</p>
            <p>{movimientos} movimientos en {fin.tiempo} segundos</p>
            <button type="button" className="btn btn-primary" onClick={reiniciar} autoFocus>Jugar otra vez</button>
          </div>
        )}
      </div>
    </div>
  );
}
