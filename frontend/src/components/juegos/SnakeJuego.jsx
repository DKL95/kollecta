import { useCallback, useEffect, useRef, useState } from "react";

/* ==========================================================================
   Lightstick Snake: una fila de lightsticks que crece al juntar álbumes.
   La photocard dorada aparece de vez en cuando, vale 5 y desaparece pronto.
   ========================================================================== */

const CELDAS = 18;
const VEL_INICIAL = 150; // ms por paso
const VEL_MINIMA = 70;
const DIRECCIONES = {
  arriba: { x: 0, y: -1 },
  abajo: { x: 0, y: 1 },
  izquierda: { x: -1, y: 0 },
  derecha: { x: 1, y: 0 },
};
const TECLAS = {
  ArrowUp: "arriba", KeyW: "arriba",
  ArrowDown: "abajo", KeyS: "abajo",
  ArrowLeft: "izquierda", KeyA: "izquierda",
  ArrowRight: "derecha", KeyD: "derecha",
};

function celdaLibre(ocupadas) {
  const libres = [];
  for (let x = 0; x < CELDAS; x++) {
    for (let y = 0; y < CELDAS; y++) {
      if (!ocupadas.some((c) => c.x === x && c.y === y)) libres.push({ x, y });
    }
  }
  return libres[Math.floor(Math.random() * libres.length)];
}

function estadoInicial() {
  const fila = [{ x: 8, y: 9 }, { x: 7, y: 9 }, { x: 6, y: 9 }];
  return {
    fila,
    dir: DIRECCIONES.derecha,
    cola: [],
    album: celdaLibre(fila),
    dorada: null,
    puntos: 0,
    albumes: 0,
    velocidad: VEL_INICIAL,
  };
}

function dibujarEstrella(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    ctx.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a));
  }
  ctx.closePath();
}

function dibujar(ctx, lado, s, ahora) {
  const c = lado / CELDAS;

  const fondo = ctx.createLinearGradient(0, 0, lado, lado);
  fondo.addColorStop(0, "#1a1033");
  fondo.addColorStop(1, "#0c1a33");
  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, lado, lado);

  ctx.fillStyle = "rgba(255,255,255,0.06)";
  for (let x = 0; x < CELDAS; x++) {
    for (let y = 0; y < CELDAS; y++) {
      ctx.beginPath();
      ctx.arc(x * c + c / 2, y * c + c / 2, Math.max(1, c * 0.06), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Álbum
  const a = s.album;
  ctx.save();
  ctx.translate(a.x * c + c / 2, a.y * c + c / 2);
  ctx.rotate(-0.12);
  ctx.fillStyle = "#e8e6f0";
  ctx.beginPath();
  ctx.arc(c * 0.18, 0, c * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ff4fa3";
  ctx.fillRect(-c * 0.38, -c * 0.38, c * 0.62, c * 0.76);
  ctx.fillStyle = "#ffffff";
  dibujarEstrella(ctx, -c * 0.07, 0, c * 0.18);
  ctx.fill();
  ctx.restore();

  // Photocard dorada (parpadea cuando está por desaparecer)
  if (s.dorada) {
    const restante = s.dorada.expira - ahora;
    if (restante > 1500 || Math.floor(ahora / 150) % 2 === 0) {
      const d = s.dorada;
      ctx.save();
      ctx.translate(d.x * c + c / 2, d.y * c + c / 2);
      ctx.shadowColor = "#ffd166";
      ctx.shadowBlur = c * 0.6;
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.roundRect(-c * 0.3, -c * 0.4, c * 0.6, c * 0.8, c * 0.1);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff3b0";
      dibujarEstrella(ctx, 0, -c * 0.05, c * 0.2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Fila de lightsticks: cola con colores del arcoíris y cabeza de estrella
  for (let i = s.fila.length - 1; i >= 0; i--) {
    const seg = s.fila[i];
    const x = seg.x * c + c / 2;
    const y = seg.y * c + c / 2;
    if (i === 0) {
      ctx.save();
      ctx.shadowColor = "#ffd166";
      ctx.shadowBlur = c * 0.8;
      ctx.fillStyle = "#ffe48a";
      dibujarEstrella(ctx, x, y, c * 0.52);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = "#2a1f3d";
      ctx.lineWidth = Math.max(1.5, c * 0.07);
      dibujarEstrella(ctx, x, y, c * 0.52);
      ctx.stroke();
    } else {
      const tono = (i * 24 + ahora / 20) % 360;
      ctx.save();
      ctx.shadowColor = `hsl(${tono} 95% 65%)`;
      ctx.shadowBlur = c * 0.5;
      ctx.fillStyle = `hsl(${tono} 95% 68%)`;
      ctx.beginPath();
      ctx.arc(x, y, c * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.arc(x - c * 0.1, y - c * 0.1, c * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export default function SnakeJuego({ onTerminar, onReiniciar }) {
  const lienzo = useRef(null);
  const contenedor = useRef(null);
  const estado = useRef(estadoInicial());
  const [fase, setFase] = useState("inicio"); // inicio | jugando | pausa | fin
  const [puntos, setPuntos] = useState(0);
  const [lado, setLado] = useState(360);
  const faseRef = useRef(fase);
  faseRef.current = fase;
  const toque = useRef(null);

  // Tamaño del tablero según el ancho disponible (múltiplo de las celdas para que se vea nítido).
  useEffect(() => {
    const medir = () => {
      const ancho = Math.min(contenedor.current?.clientWidth || 360, 460);
      setLado(Math.floor(ancho / CELDAS) * CELDAS);
    };
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

  const girar = useCallback((nombre) => {
    const s = estado.current;
    const nueva = DIRECCIONES[nombre];
    const ultima = s.cola.length ? s.cola[s.cola.length - 1] : s.dir;
    if (nueva.x === -ultima.x && nueva.y === -ultima.y) return;
    if (nueva.x === ultima.x && nueva.y === ultima.y) return;
    if (s.cola.length < 3) s.cola.push(nueva);
  }, []);

  const empezar = useCallback(() => {
    estado.current = estadoInicial();
    setPuntos(0);
    setFase("jugando");
    onReiniciar?.();
  }, [onReiniciar]);

  const terminar = useCallback(() => {
    if (faseRef.current === "fin") return;
    faseRef.current = "fin";
    setFase("fin");
    onTerminar?.(estado.current.puntos);
  }, [onTerminar]);

  // Bucle del juego
  useEffect(() => {
    const ctx = lienzo.current?.getContext("2d");
    if (!ctx) return undefined;
    const escala = window.devicePixelRatio || 1;
    lienzo.current.width = lado * escala;
    lienzo.current.height = lado * escala;
    ctx.setTransform(escala, 0, 0, escala, 0, 0);

    let cuadro;
    let ultimoPaso = performance.now();

    function paso(ahora) {
      const s = estado.current;
      if (faseRef.current === "jugando" && ahora - ultimoPaso >= s.velocidad) {
        ultimoPaso = ahora;
        if (s.cola.length) s.dir = s.cola.shift();
        const cabeza = { x: s.fila[0].x + s.dir.x, y: s.fila[0].y + s.dir.y };
        const come = cabeza.x === s.album.x && cabeza.y === s.album.y;
        const cuerpo = come ? s.fila : s.fila.slice(0, -1);
        const choca =
          cabeza.x < 0 || cabeza.y < 0 || cabeza.x >= CELDAS || cabeza.y >= CELDAS ||
          cuerpo.some((c) => c.x === cabeza.x && c.y === cabeza.y);

        if (choca) {
          terminar();
        } else {
          s.fila = [cabeza, ...cuerpo];
          if (come) {
            s.puntos += 1;
            s.albumes += 1;
            s.velocidad = Math.max(VEL_MINIMA, VEL_INICIAL - s.albumes * 4);
            s.album = celdaLibre(s.dorada ? [...s.fila, s.dorada] : s.fila);
            if (!s.dorada && s.albumes % 6 === 0) {
              s.dorada = { ...celdaLibre([...s.fila, s.album]), expira: ahora + 6000 };
            }
            setPuntos(s.puntos);
          }
          if (s.dorada && cabeza.x === s.dorada.x && cabeza.y === s.dorada.y) {
            s.puntos += 5;
            s.dorada = null;
            setPuntos(s.puntos);
          }
          if (s.dorada && ahora > s.dorada.expira) s.dorada = null;
        }
      }
      dibujar(ctx, lado, estado.current, ahora);
      cuadro = requestAnimationFrame(paso);
    }

    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [lado, terminar]);

  // Teclado
  useEffect(() => {
    function alTeclear(event) {
      const nombre = TECLAS[event.code];
      if (nombre && faseRef.current === "jugando") {
        event.preventDefault();
        girar(nombre);
      } else if (event.code === "Space") {
        event.preventDefault();
        if (faseRef.current === "jugando") setFase("pausa");
        else if (faseRef.current === "pausa") setFase("jugando");
        else empezar();
      }
    }
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [girar, empezar]);

  // Pausa automática al cambiar de pestaña
  useEffect(() => {
    const alOcultar = () => document.hidden && faseRef.current === "jugando" && setFase("pausa");
    document.addEventListener("visibilitychange", alOcultar);
    return () => document.removeEventListener("visibilitychange", alOcultar);
  }, []);

  function alTocar(event) {
    const t = event.touches[0];
    toque.current = { x: t.clientX, y: t.clientY };
  }

  function alSoltar(event) {
    if (!toque.current) return;
    const t = event.changedTouches[0];
    const dx = t.clientX - toque.current.x;
    const dy = t.clientY - toque.current.y;
    toque.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    girar(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "derecha" : "izquierda") : dy > 0 ? "abajo" : "arriba");
  }

  return (
    <div className="snake" ref={contenedor}>
      <div className="juego-marcador">
        <span>⭐ {puntos} pts</span>
        {fase === "jugando" && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFase("pausa")}>Pausa</button>
        )}
      </div>

      <div className="snake-tablero" style={{ width: lado, height: lado }} onTouchStart={alTocar} onTouchEnd={alSoltar}>
        <canvas ref={lienzo} style={{ width: lado, height: lado }} aria-label={`Tablero de juego, ${puntos} puntos`} role="img" />
        {fase !== "jugando" && (
          <div className="juego-overlay">
            {fase === "inicio" && (
              <>
                <p className="juego-overlay-titulo">🌟 Lightstick Snake</p>
                <p>Junta álbumes 💿 (+1) y photocards doradas (+5).</p>
                <button type="button" className="btn btn-primary" onClick={empezar} autoFocus>Empezar</button>
              </>
            )}
            {fase === "pausa" && (
              <>
                <p className="juego-overlay-titulo">En pausa</p>
                <button type="button" className="btn btn-primary" onClick={() => setFase("jugando")} autoFocus>Seguir</button>
              </>
            )}
            {fase === "fin" && (
              <>
                <p className="juego-overlay-titulo">¡Se acabó!</p>
                <p className="juego-overlay-puntos">{puntos} puntos</p>
                <button type="button" className="btn btn-primary" onClick={empezar} autoFocus>Jugar otra vez</button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="snake-pad" aria-label="Controles">
        <button type="button" className="arriba" onClick={() => girar("arriba")} aria-label="Arriba">▲</button>
        <button type="button" className="izquierda" onClick={() => girar("izquierda")} aria-label="Izquierda">◀</button>
        <button type="button" className="derecha" onClick={() => girar("derecha")} aria-label="Derecha">▶</button>
        <button type="button" className="abajo" onClick={() => girar("abajo")} aria-label="Abajo">▼</button>
      </div>
    </div>
  );
}
