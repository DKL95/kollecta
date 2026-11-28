import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import EmptyState from "../components/EmptyState";
import Icon from "../components/Icon";
import Photo from "../components/Photo";
import GaleriaEscena from "../components/galeria/GaleriaEscena";
import { formatMoney } from "../utils/format";
import {
  LUCES_GALERIA,
  MARCOS_GALERIA,
  MAX_TITULO_GALERIA,
  PARTICULAS_GALERIA,
  TEMAS_GALERIA,
  hexCss,
} from "../utils/galeria";

/**
 * Galería 3D de la colección. /galeria = la mía (con "Decorar"), /galeria/:username = la de alguien más.
 * Se puede recorrer con el mouse o el dedo, con el teclado, o pieza por pieza con los botones.
 * Sin WebGL (o con "Ver como lista") se muestran las piezas en una lista normal.
 */
export default function GaleriaPage() {
  const { username: delParametro } = useParams();
  const { user } = useAuth();
  const username = delParametro || user?.username;

  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [config, setConfig] = useState(null); // decoración que se ve (la guardada o la que se está probando)
  const [seleccion, setSeleccion] = useState(null); // índice en piezas, -1 = destacada, null = ninguna
  const [modoLista, setModoLista] = useState(false);
  const [sinWebgl, setSinWebgl] = useState(false);
  const [decorando, setDecorando] = useState(false);
  const escena = useRef(null);
  const seleccionActual = useRef(null);
  seleccionActual.current = seleccion;

  useEffect(() => {
    let cancelado = false;
    setDatos(null);
    setError("");
    setSeleccion(null);
    setDecorando(false);
    apiRequest(`/coleccion/galeria/${encodeURIComponent(username)}`)
      .then((respuesta) => {
        if (cancelado) return;
        setDatos(respuesta);
        setConfig(respuesta.galeria);
      })
      .catch((err) => !cancelado && setError(err.message));
    return () => {
      cancelado = true;
    };
  }, [username]);

  // La destacada que se ve puede cambiar mientras se decora (vista previa).
  const todas = useMemo(() => (datos ? [...(datos.destacada ? [datos.destacada] : []), ...datos.piezas] : []), [datos]);
  const destacada = useMemo(() => todas.find((p) => String(p.id) === String(config?.destacada)) || null, [todas, config?.destacada]);
  const piezas = useMemo(() => todas.filter((p) => p !== destacada), [todas, destacada]);
  const configEscena = useMemo(
    () => (config ? { tema: config.tema, marco: config.marco, luz: config.luz, particulas: config.particulas } : null),
    [config?.tema, config?.marco, config?.luz, config?.particulas]
  );

  // Si cambia qué piezas hay en las paredes (p. ej. otra destacada), la ficha abierta ya no corresponde.
  useEffect(() => setSeleccion(null), [destacada]);

  const alSinWebgl = useCallback(() => setSinWebgl(true), []);
  const alSeleccionar = useCallback((indice) => setSeleccion(indice), []);

  // Recorrido pieza por pieza: destacada (si hay) y luego las paredes.
  const orden = useMemo(() => [...(destacada ? [-1] : []), ...piezas.map((_, i) => i)], [destacada, piezas]);
  function recorrer(paso) {
    if (!orden.length) return;
    const actual = orden.indexOf(seleccionActual.current);
    const siguiente = actual === -1 && paso < 0 ? orden[orden.length - 1] : orden[(actual + paso + orden.length) % orden.length] ?? orden[0];
    seleccionActual.current = siguiente;
    setSeleccion(siguiente);
    escena.current?.irA(siguiente);
  }
  function volverEntrada() {
    setSeleccion(null);
    escena.current?.irA(null);
  }

  if (error) {
    return (
      <main className="page">
        <EmptyState icon="close">{error}</EmptyState>
      </main>
    );
  }
  if (!datos || !config) {
    return (
      <main className="page">
        <EmptyState icon="frame">Preparando la galería…</EmptyState>
      </main>
    );
  }

  const nombre = datos.usuario.nombre || datos.usuario.username;
  const titulo = config.titulo || `Galería de ${nombre}`;
  const pieza = seleccion === -1 ? destacada : seleccion !== null ? piezas[seleccion] : null;
  const vacia = todas.length === 0;
  const verLista = modoLista || sinWebgl;
  const posicion = orden.indexOf(seleccion);

  return (
    <main className="page galeria-page">
      <div className="galeria-cabeza">
        <div>
          <h2>{titulo}</h2>
          <div className="sub">
            {datos.esMia ? "Tu colección en 3D" : (
              <>Colección de <Link to={`/perfil/${encodeURIComponent(datos.usuario.username)}`}>@{datos.usuario.username}</Link></>
            )}
            {" · "}
            {datos.totalPiezas} {datos.totalPiezas === 1 ? "pieza" : "piezas"}
            {datos.totalPiezas > datos.maxPiezas + (datos.destacada ? 1 : 0) && ` (se muestran las ${datos.maxPiezas} más nuevas)`}
          </div>
        </div>
        <div className="galeria-botones">
          {!sinWebgl && !vacia && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setModoLista((m) => !m)} aria-pressed={modoLista}>
              <Icon name={modoLista ? "frame" : "folder"} size={15} /> {modoLista ? "Ver en 3D" : "Ver como lista"}
            </button>
          )}
          {datos.esMia && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setDecorando((d) => !d)} aria-expanded={decorando}>
              <Icon name="wand" size={15} /> Decorar
            </button>
          )}
        </div>
      </div>

      {sinWebgl && <p className="galeria-aviso">Tu navegador no puede mostrar 3D, así que te enseñamos la colección como lista.</p>}

      {vacia ? (
        <EmptyState icon="frame">
          {datos.esMia ? (
            <>Tu galería está vacía. <Link to="/coleccion/agregar">Agrega piezas a tu colección</Link> y aparecerán colgadas aquí.</>
          ) : (
            `${nombre} todavía no tiene piezas en su colección.`
          )}
        </EmptyState>
      ) : verLista ? (
        <ListaGaleria destacada={destacada} piezas={piezas} />
      ) : (
        <div className="galeria-marco">
          <GaleriaEscena ref={escena} piezas={piezas} destacada={destacada} config={configEscena} onSeleccion={alSeleccionar} onError={alSinWebgl} />

          <p className="galeria-ayuda">
            <Icon name="eye" size={13} /> Arrastra para mirar · WASD o flechas para caminar · toca un cuadro
          </p>

          <div className="galeria-caminar" aria-label="Caminar">
            <button type="button" className="adelante" onPointerDown={() => escena.current?.mover(1)} onPointerUp={() => escena.current?.mover(0)} onPointerLeave={() => escena.current?.mover(0)} aria-label="Caminar hacia adelante">
              <Icon name="chevronLeft" size={20} />
            </button>
            <button type="button" className="atras" onPointerDown={() => escena.current?.mover(-1)} onPointerUp={() => escena.current?.mover(0)} onPointerLeave={() => escena.current?.mover(0)} aria-label="Caminar hacia atrás">
              <Icon name="chevronLeft" size={20} />
            </button>
          </div>

          <div className="galeria-recorrido">
            <button type="button" className="icon-btn" onClick={() => recorrer(-1)} aria-label="Pieza anterior">
              <Icon name="chevronLeft" size={18} />
            </button>
            <span aria-live="polite">{posicion >= 0 ? `${posicion + 1} de ${orden.length}` : "Recorrido"}</span>
            <button type="button" className="icon-btn" onClick={() => recorrer(1)} aria-label="Pieza siguiente">
              <Icon name="chevronRight" size={18} />
            </button>
            <button type="button" className="icon-btn" onClick={volverEntrada} aria-label="Volver a la entrada" title="Volver a la entrada">
              <Icon name="home" size={16} />
            </button>
          </div>

          {pieza && (
            <aside className="galeria-ficha" aria-live="polite">
              <button type="button" className="icon-btn galeria-ficha-cerrar" onClick={() => setSeleccion(null)} aria-label="Cerrar ficha">
                <Icon name="close" size={14} />
              </button>
              {seleccion === -1 && <span className="galeria-ficha-etiqueta">Pieza destacada</span>}
              <strong>{pieza.titulo}</strong>
              <span className="galeria-ficha-sub">{pieza.grupo} · {pieza.categoria} · {pieza.estado}</span>
              {pieza.descripcion && <p>{pieza.descripcion}</p>}
              <div className="galeria-ficha-pie">
                {pieza.valorEstimado > 0 && <span className="galeria-ficha-valor">{formatMoney(pieza.valorEstimado)}</span>}
                <Link to={`/articulo/${pieza.id}`} className="btn btn-secondary btn-sm">Ver pieza</Link>
              </div>
            </aside>
          )}
        </div>
      )}

      {decorando && (
        <PanelDecorar
          config={config}
          piezas={todas}
          nombre={nombre}
          onCambio={setConfig}
          onCerrar={(guardada) => {
            setDecorando(false);
            if (guardada) setDatos((d) => ({ ...d, galeria: guardada }));
            else setConfig(datos.galeria);
          }}
        />
      )}
    </main>
  );
}

function ListaGaleria({ destacada, piezas }) {
  return (
    <ul className="galeria-lista">
      {[...(destacada ? [destacada] : []), ...piezas].map((p) => (
        <li key={p.id}>
          <Link to={`/articulo/${p.id}`} className="card galeria-lista-pieza">
            <span className="galeria-lista-foto">
              <Icon name="frame" size={22} />
              <Photo src={p.imagen} alt={p.titulo} className="" cover />
            </span>
            <span className="galeria-lista-texto">
              {p === destacada && <span className="galeria-ficha-etiqueta">Destacada</span>}
              <strong>{p.titulo}</strong>
              <small>{p.grupo} · {p.categoria}</small>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function PanelDecorar({ config, piezas, nombre, onCambio, onCerrar }) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const conEscape = (e) => e.key === "Escape" && onCerrar(null);
    window.addEventListener("keydown", conEscape);
    return () => window.removeEventListener("keydown", conEscape);
  }, [onCerrar]);

  const cambiar = (campo, valor) => onCambio({ ...config, [campo]: valor });

  async function guardar() {
    setGuardando(true);
    setError("");
    try {
      const { galeria } = await apiRequest("/coleccion/galeria", {
        method: "PUT",
        body: {
          tema: config.tema,
          marco: config.marco,
          luz: config.luz,
          particulas: config.particulas,
          titulo: config.titulo.trim(),
          destacada: config.destacada || null,
        },
      });
      onCambio(galeria);
      onCerrar(galeria);
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  }

  return (
    <aside className="galeria-decorar card" aria-label="Decorar la galería">
      <header>
        <strong>Decorar</strong>
        <button type="button" className="icon-btn" onClick={() => onCerrar(null)} aria-label="Cerrar sin guardar">
          <Icon name="close" size={16} />
        </button>
      </header>

      <div className="field">
        <label htmlFor="galeria-titulo">Nombre de la sala</label>
        <input id="galeria-titulo" value={config.titulo} maxLength={MAX_TITULO_GALERIA} placeholder={`Galería de ${nombre}`} onChange={(e) => cambiar("titulo", e.target.value)} />
      </div>

      <fieldset className="galeria-opciones">
        <legend>Sala</legend>
        <div className="galeria-temas">
          {TEMAS_GALERIA.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`galeria-tema ${config.tema === t.id ? "activo" : ""}`}
              onClick={() => cambiar("tema", t.id)}
              aria-pressed={config.tema === t.id}
              title={t.descripcion}
            >
              <span className="galeria-tema-muestra" style={{ background: `linear-gradient(180deg, ${hexCss(t.pared)} 0 62%, ${hexCss(t.acento)} 62% 68%, ${hexCss(t.piso)} 68%)` }} />
              {t.nombre}
            </button>
          ))}
        </div>
      </fieldset>

      <Opciones titulo="Marcos" lista={MARCOS_GALERIA} valor={config.marco} onCambio={(v) => cambiar("marco", v)} conColor />
      <Opciones titulo="Iluminación" lista={LUCES_GALERIA} valor={config.luz} onCambio={(v) => cambiar("luz", v)} />
      <Opciones titulo="Efectos" lista={PARTICULAS_GALERIA} valor={config.particulas} onCambio={(v) => cambiar("particulas", v)} />

      <div className="field">
        <label htmlFor="galeria-destacada">Pieza en el pedestal</label>
        <select id="galeria-destacada" value={config.destacada || ""} onChange={(e) => cambiar("destacada", e.target.value || null)}>
          <option value="">Ninguna</option>
          {piezas.map((p) => (
            <option key={p.id} value={p.id}>{p.titulo} · {p.grupo}</option>
          ))}
        </select>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="galeria-decorar-pie">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onCerrar(null)}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={guardar} disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </aside>
  );
}

function Opciones({ titulo, lista, valor, onCambio, conColor = false }) {
  return (
    <fieldset className="galeria-opciones">
      <legend>{titulo}</legend>
      <div className="chip-row">
        {lista.map((o) => (
          <button key={o.id} type="button" className={`chip ${valor === o.id ? "active" : ""}`} onClick={() => onCambio(o.id)} aria-pressed={valor === o.id}>
            {conColor && !o.sinMarco && <span className="galeria-punto" style={{ background: hexCss(o.color) }} />}
            {o.nombre}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
