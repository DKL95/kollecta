import { useCallback, useEffect, useRef, useState } from "react";
import AvatarKpop from "../AvatarKpop";
import { COLOR_ROPA, avatarAleatorio } from "../../utils/avatar";

/* ==========================================================================
   K-Style Boutique: atiende una tiendita de ropa durante un día (90 s).
   Cada cliente pide una prenda; si se la das a tiempo paga y deja propina.
   Si una prenda se acaba, tócala para resurtir (cuesta dinero y tarda un poco).
   El puntaje es la ganancia del día.
   ========================================================================== */

const DURACION = 90_000;
const CAJA_INICIAL = 150;
const TIPOS = [
  { id: "camiseta", nombre: "Camiseta", precio: 50 },
  { id: "sudadera", nombre: "Sudadera", precio: 90 },
  { id: "sueter", nombre: "Suéter", precio: 80 },
  { id: "escenario", nombre: "Saco de escenario", precio: 150 },
];
const COLORES = ["rosa", "morado", "azul", "menta"];
const NOMBRE_COLOR = { rosa: "rosa", morado: "morado", azul: "azul", menta: "menta" };
const STOCK_INICIAL = 3;
const RESURTIDO = 3;
const ESPERA_RESURTIR = 1800;
const MAX_CLIENTES = 3;

const clave = (tipo, color) => `${tipo}-${color}`;
const tipoDe = (id) => TIPOS.find((t) => t.id === id);
const costoResurtir = (tipo) => Math.round(tipoDe(tipo).precio * 0.4) * RESURTIDO;

// Dibujito de la prenda para el pedido y el anaquel.
export function PrendaIcono({ tipo, color, size = 44 }) {
  const relleno = COLOR_ROPA[color]?.color || "#c9c4d6";
  const L = { stroke: "#2a1f3d", strokeWidth: 2.4, strokeLinejoin: "round", strokeLinecap: "round" };
  const base = "M14 18 L26 10 Q32 16 38 10 L50 18 L56 32 L46 36 L46 56 L18 56 L18 36 L8 32 Z";
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <path d={base} fill={relleno} {...L} />
      {tipo === "camiseta" && <path d="M26 10 Q32 18 38 10" fill="#ffffff" opacity="0.6" />}
      {tipo === "sudadera" && (
        <g>
          <path d="M24 11 Q32 26 40 11" fill="rgba(0,0,0,0.2)" {...L} strokeWidth="1.8" />
          <path d="M29 20 L28 30 M35 20 L36 30" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          <path d="M24 56 L24 46 Q32 42 40 46 L40 56" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
        </g>
      )}
      {tipo === "sueter" && (
        <g stroke="rgba(255,255,255,0.7)" strokeWidth="2">
          <path d="M18 44 L46 44 M18 49 L46 49" />
          <path d="M27 12 L28 15 M32 13 L32 16 M37 12 L36 15" strokeLinecap="round" />
        </g>
      )}
      {tipo === "escenario" && (
        <g>
          <path d="M26 10 L32 30 L38 10" fill="#2a1f3d" />
          <path d="M26 10 L22 18 L31 40 M38 10 L42 18 L33 40" fill="none" stroke="#ffd166" strokeWidth="2.6" />
          <circle cx="24" cy="48" r="1.4" fill="#ffffff" />
          <circle cx="40" cy="50" r="1.4" fill="#ffffff" />
        </g>
      )}
    </svg>
  );
}

function nuevoCliente(id, ahora, progreso) {
  const tipo = TIPOS[Math.floor(Math.random() * TIPOS.length)].id;
  const color = COLORES[Math.floor(Math.random() * COLORES.length)];
  const avatar = { ...avatarAleatorio(), ropa: "camiseta", colorRopa: "blanco" };
  // La paciencia baja de 13 s a 7 s conforme avanza el día.
  const paciencia = 13000 - progreso * 6000;
  return { id, avatar, pedido: { tipo, color }, llega: ahora, paciencia, sale: null, estado: "esperando" };
}

function estadoInicial() {
  const stock = {};
  TIPOS.forEach((t) => COLORES.forEach((c) => (stock[clave(t.id, c)] = STOCK_INICIAL)));
  return {
    inicio: 0,
    dinero: CAJA_INICIAL,
    stock,
    resurtiendo: {},
    clientes: [],
    siguienteId: 1,
    proximoCliente: 0,
    vendidas: 0,
    propinas: 0,
    perdidos: 0,
    gastado: 0,
    racha: 0,
    aviso: null,
  };
}

export default function TienditaJuego({ onTerminar, onReiniciar }) {
  const juego = useRef(estadoInicial());
  const [fase, setFase] = useState("inicio"); // inicio | jugando | fin
  const [, setCuadro] = useState(0);
  const faseRef = useRef(fase);
  faseRef.current = fase;

  const empezar = useCallback(() => {
    const ahora = performance.now();
    juego.current = { ...estadoInicial(), inicio: ahora, proximoCliente: ahora + 600 };
    setFase("jugando");
    onReiniciar?.();
  }, [onReiniciar]);

  const terminar = useCallback(() => {
    if (faseRef.current !== "jugando") return;
    faseRef.current = "fin";
    setFase("fin");
    onTerminar?.(Math.max(0, juego.current.dinero - CAJA_INICIAL));
  }, [onTerminar]);

  // Reloj del juego: 10 veces por segundo.
  useEffect(() => {
    if (fase !== "jugando") return undefined;
    const reloj = setInterval(() => {
      const s = juego.current;
      const ahora = performance.now();
      const transcurrido = ahora - s.inicio;
      const progreso = Math.min(1, transcurrido / DURACION);

      if (transcurrido >= DURACION) {
        terminar();
        return;
      }

      // Clientes que se desesperan o que ya se fueron
      s.clientes = s.clientes.filter((c) => !(c.sale && ahora > c.sale));
      s.clientes.forEach((c) => {
        if (c.estado === "esperando" && ahora - c.llega > c.paciencia) {
          c.estado = "enojado";
          c.sale = ahora + 1200;
          s.perdidos += 1;
          s.racha = 0;
        }
      });

      // Llega alguien nuevo (más seguido conforme avanza el día)
      if (ahora >= s.proximoCliente && s.clientes.filter((c) => c.estado === "esperando").length < MAX_CLIENTES && s.clientes.length < MAX_CLIENTES + 1) {
        s.clientes.push(nuevoCliente(s.siguienteId++, ahora, progreso));
        s.proximoCliente = ahora + 3400 - progreso * 1700 + Math.random() * 800;
      }

      // Resurtidos que ya llegaron
      Object.entries(s.resurtiendo).forEach(([k, listo]) => {
        if (ahora >= listo) {
          s.stock[k] += RESURTIDO;
          delete s.resurtiendo[k];
        }
      });

      if (s.aviso && ahora > s.aviso.hasta) s.aviso = null;
      setCuadro((n) => n + 1);
    }, 100);
    return () => clearInterval(reloj);
  }, [fase, terminar]);

  function avisar(texto, tipo = "info") {
    juego.current.aviso = { texto, tipo, hasta: performance.now() + 1400 };
    setCuadro((n) => n + 1);
  }

  function tocarPrenda(tipo, color) {
    if (faseRef.current !== "jugando") return;
    const s = juego.current;
    const k = clave(tipo, color);
    const ahora = performance.now();

    if (s.resurtiendo[k]) return;

    if (s.stock[k] <= 0) {
      const costo = costoResurtir(tipo);
      if (s.dinero < costo) {
        avisar(`Te faltan $${costo - s.dinero} para resurtir`, "error");
        return;
      }
      s.dinero -= costo;
      s.gastado += costo;
      s.resurtiendo[k] = ahora + ESPERA_RESURTIR;
      avisar(`Resurtiendo (−$${costo})`);
      return;
    }

    const cliente = s.clientes.find((c) => c.estado === "esperando" && c.pedido.tipo === tipo && c.pedido.color === color);
    if (!cliente) {
      s.racha = 0;
      avisar("Nadie pidió esa prenda", "error");
      return;
    }

    const precio = tipoDe(tipo).precio;
    const restante = Math.max(0, 1 - (ahora - cliente.llega) / cliente.paciencia);
    const propina = Math.round(precio * 0.3 * restante) + Math.min(s.racha, 10) * 2;
    s.stock[k] -= 1;
    s.dinero += precio + propina;
    s.vendidas += 1;
    s.propinas += propina;
    s.racha += 1;
    cliente.estado = "feliz";
    cliente.avatar = { ...cliente.avatar, ropa: tipo, colorRopa: color };
    cliente.sale = ahora + 1000;
    avisar(`+$${precio + propina}${s.racha > 2 ? ` · racha ×${s.racha}` : ""}`, "ok");
  }

  const s = juego.current;
  const ahora = performance.now();
  const restanteDia = fase === "jugando" ? Math.max(0, Math.ceil((DURACION - (ahora - s.inicio)) / 1000)) : 90;

  return (
    <div className="tiendita">
      <div className="juego-marcador">
        <span>💰 ${s.dinero}</span>
        <span>⏱ {restanteDia}s</span>
        <span>🛍 {s.vendidas}</span>
      </div>

      <div className="tiendita-mostrador" aria-live="polite">
        {fase === "jugando" && s.clientes.length === 0 && <p className="tiendita-vacio">Esperando clientes…</p>}
        {s.clientes.map((c) => {
          const paciencia = c.estado === "esperando" ? Math.max(0, 1 - (ahora - c.llega) / c.paciencia) : 0;
          const tipo = tipoDe(c.pedido.tipo);
          return (
            <div key={c.id} className={`tiendita-cliente ${c.estado}`}>
              {c.estado === "esperando" && (
                <div className="tiendita-pedido">
                  <PrendaIcono tipo={c.pedido.tipo} color={c.pedido.color} size={34} />
                  <span>{tipo.nombre} {NOMBRE_COLOR[c.pedido.color]}</span>
                </div>
              )}
              {c.estado === "feliz" && <div className="tiendita-pedido ok">¡Gracias! 💕</div>}
              {c.estado === "enojado" && <div className="tiendita-pedido mal">¡Me voy! 😤</div>}
              <AvatarKpop
                avatar={c.avatar}
                expresion={c.estado === "feliz" ? "feliz" : c.estado === "enojado" ? "enojo" : paciencia < 0.35 ? "pena" : "normal"}
                gesto={c.estado === "feliz" ? "corazon" : "ninguno"}
                size={78}
              />
              {c.estado === "esperando" && (
                <div className="tiendita-paciencia" aria-hidden="true">
                  <span style={{ width: `${paciencia * 100}%`, background: paciencia < 0.35 ? "var(--red)" : paciencia < 0.6 ? "var(--gold)" : "var(--green)" }} />
                </div>
              )}
            </div>
          );
        })}
        {s.aviso && <div className={`tiendita-aviso ${s.aviso.tipo}`}>{s.aviso.texto}</div>}
      </div>

      <div className="tiendita-anaquel" role="group" aria-label="Prendas a la venta">
        {TIPOS.map((t) =>
          COLORES.map((color) => {
            const k = clave(t.id, color);
            const stock = s.stock[k];
            const resurtiendo = Boolean(s.resurtiendo[k]);
            return (
              <button
                key={k}
                type="button"
                className={`tiendita-prenda ${stock <= 0 ? "agotada" : ""} ${resurtiendo ? "resurtiendo" : ""}`}
                onClick={() => tocarPrenda(t.id, color)}
                disabled={fase !== "jugando"}
                aria-label={`${t.nombre} ${NOMBRE_COLOR[color]}, $${t.precio}, ${resurtiendo ? "resurtiendo" : stock > 0 ? `quedan ${stock}` : `agotada, resurtir cuesta $${costoResurtir(t.id)}`}`}
              >
                <PrendaIcono tipo={t.id} color={color} size={40} />
                <span className="tiendita-stock">{resurtiendo ? "…" : stock > 0 ? stock : `↻$${costoResurtir(t.id)}`}</span>
              </button>
            );
          })
        )}
      </div>

      {fase !== "jugando" && (
        <div className="juego-overlay tiendita-overlay">
          {fase === "inicio" ? (
            <>
              <p className="juego-overlay-titulo">👗 K-Style Boutique</p>
              <p>Tienes 90 segundos y ${CAJA_INICIAL} en caja. Vende rápido para ganar propinas.</p>
              <button type="button" className="btn btn-primary" onClick={empezar} autoFocus>Abrir la tienda</button>
            </>
          ) : (
            <>
              <p className="juego-overlay-titulo">¡Cerramos por hoy!</p>
              <p className="juego-overlay-puntos">Ganancia: ${Math.max(0, s.dinero - CAJA_INICIAL)}</p>
              <p>
                {s.vendidas} ventas · ${s.propinas} de propinas · {s.perdidos} clientes perdidos · ${s.gastado} en resurtir
              </p>
              <button type="button" className="btn btn-primary" onClick={empezar} autoFocus>Otro día</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
