import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import { UserAvatar } from "../components/Avatar";
import SnakeJuego from "../components/juegos/SnakeJuego";
import TienditaJuego from "../components/juegos/TienditaJuego";
import MemoramaJuego from "../components/juegos/MemoramaJuego";
import NotFoundPage from "./NotFoundPage";
import { JUEGOS, formatearPuntaje } from "../utils/juegos";

const COMPONENTES = { snake: SnakeJuego, tiendita: TienditaJuego, memorama: MemoramaJuego };

function Ranking({ juego, datos }) {
  if (!datos) return <p className="avatar-hint">Cargando ranking…</p>;
  return (
    <div className="ranking">
      {datos.ranking.length === 0 ? (
        <p className="avatar-hint">Nadie ha jugado todavía. ¡Sé la primera persona!</p>
      ) : (
        <ol>
          {datos.ranking.map((r, i) => (
            <li key={r.usuario.id}>
              <span className={`ranking-lugar l${i + 1}`}>{i + 1}</span>
              <UserAvatar user={r.usuario} size={28} fontSize={10} />
              <Link to={`/perfil/${r.usuario.username}`} className="ranking-nombre">{r.usuario.nombre || r.usuario.username}</Link>
              <b>{formatearPuntaje(juego, r.mejor)}</b>
            </li>
          ))}
        </ol>
      )}
      <p className="ranking-mio">
        Tu récord: <b>{formatearPuntaje(juego, datos.mio.mejor)}</b>
        {datos.mio.lugar && ` · lugar #${datos.mio.lugar}`} · {datos.mio.partidas} {datos.mio.partidas === 1 ? "partida" : "partidas"}
      </p>
    </div>
  );
}

function useRanking(juego) {
  const [datos, setDatos] = useState(null);
  const cargar = useCallback(() => {
    apiRequest(`/juegos/${juego}/ranking`).then(setDatos).catch(() => setDatos({ ranking: [], mio: { mejor: 0, partidas: 0, lugar: null } }));
  }, [juego]);
  useEffect(() => {
    cargar();
  }, [cargar]);
  return [datos, cargar];
}

// Pantalla de un juego: el juego, el resultado guardado y el ranking.
function PantallaJuego({ juego }) {
  const info = JUEGOS[juego];
  const Juego = COMPONENTES[juego];
  const [ranking, recargar] = useRanking(juego);
  const [resultado, setResultado] = useState(null);

  async function alTerminar(puntos) {
    setResultado({ guardando: true, puntos });
    try {
      const data = await apiRequest(`/juegos/${juego}/partidas`, { method: "POST", body: { puntos } });
      setResultado({ ...data });
      window.dispatchEvent(new Event("tareas-actualizadas"));
      recargar();
    } catch (err) {
      setResultado({ error: err.message, puntos });
    }
  }

  return (
    <main className="page juego-page">
      <div className="juego-cabecera">
        <Link to="/juegos" className="btn btn-ghost btn-sm">← Juegos</Link>
        <div>
          <h2>{info.emoji} {info.nombre}</h2>
          <p>{info.instrucciones}</p>
        </div>
      </div>

      <div className="juego-layout">
        <section className="juego-area" aria-label={info.nombre}>
          <Juego onTerminar={alTerminar} onReiniciar={() => setResultado(null)} />
          {resultado && (
            <p className={`juego-resultado ${resultado.error ? "error" : ""}`} role="status">
              {resultado.guardando && "Guardando tu partida…"}
              {resultado.error && `No se guardó la partida: ${resultado.error}`}
              {!resultado.guardando && !resultado.error && (
                <>
                  {resultado.nuevoRecord ? "🏆 ¡Nuevo récord! " : "Partida guardada. "}
                  {formatearPuntaje(juego, resultado.puntos)} · récord {formatearPuntaje(juego, resultado.mejor)} ·{" "}
                  <Link to="/tareas">ver tareas</Link>
                </>
              )}
            </p>
          )}
        </section>

        <aside className="card juego-ranking">
          <h3>🏆 Ranking</h3>
          <Ranking juego={juego} datos={ranking} />
        </aside>
      </div>
    </main>
  );
}

function TarjetaJuego({ id }) {
  const info = JUEGOS[id];
  const [ranking] = useRanking(id);
  return (
    <Link to={`/juegos/${id}`} className="juego-tarjeta" style={{ "--juego": info.color }}>
      <span className="juego-tarjeta-emoji" aria-hidden="true">{info.emoji}</span>
      <h3>{info.nombre}</h3>
      <p>{info.descripcion}</p>
      <span className="juego-tarjeta-pie">
        {ranking ? `Tu récord: ${formatearPuntaje(id, ranking.mio.mejor)}` : "…"}
        <span className="btn btn-primary btn-sm">Jugar</span>
      </span>
    </Link>
  );
}

// /juegos (lista) y /juegos/:juego (un juego)
export default function JuegosPage() {
  const { juego } = useParams();

  if (juego) {
    if (!JUEGOS[juego]) return <NotFoundPage />;
    return <PantallaJuego key={juego} juego={juego} />;
  }

  return (
    <main className="page">
      <section className="tareas-hero">
        <div>
          <h2>Minijuegos</h2>
          <p>Juega, rompe tu récord y completa tareas para ganar estampitas.</p>
        </div>
        <Link to="/tareas" className="btn btn-secondary btn-sm">🎯 Tareas</Link>
      </section>
      <div className="juegos-grid">
        {Object.keys(JUEGOS).map((id) => <TarjetaJuego key={id} id={id} />)}
      </div>
    </main>
  );
}
