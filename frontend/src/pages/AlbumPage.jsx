import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import Estampita from "../components/Estampita";
import { ESTAMPITAS, ESTAMPITA_POR_ID, RAREZAS, SERIES, numeroDe } from "../utils/estampitas";

// Álbum de estampitas: el propio (/estampitas) o el de otra persona (/estampitas/:username).
export default function AlbumPage() {
  const { username } = useParams();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [detalle, setDetalle] = useState(null);

  useEffect(() => {
    let cancelado = false;
    setDatos(null);
    setError("");
    apiRequest(username ? `/estampitas/${encodeURIComponent(username)}` : "/estampitas")
      .then((data) => !cancelado && setDatos(data))
      .catch((err) => !cancelado && setError(err.message || "No se pudo cargar el álbum"));
    return () => {
      cancelado = true;
    };
  }, [username]);

  useEffect(() => {
    if (!detalle) return undefined;
    const conEscape = (event) => event.key === "Escape" && setDetalle(null);
    window.addEventListener("keydown", conEscape);
    return () => window.removeEventListener("keydown", conEscape);
  }, [detalle]);

  const cantidades = Object.fromEntries((datos?.album || []).map((e) => [e.id, e.cantidad]));
  const porcentaje = datos ? Math.round((datos.distintas / datos.total) * 100) : 0;

  return (
    <main className="page album-page">
      <section className="tareas-hero">
        <div>
          <h2>{username ? `Álbum de @${username}` : "Mi álbum de estampitas"}</h2>
          <p>
            {datos ? `${datos.distintas} de ${datos.total} estampitas · ${datos.repetidas} repetidas` : "Cargando…"}
          </p>
          {datos && (
            <div className="tarea-barra grande" role="progressbar" aria-valuemin={0} aria-valuemax={datos.total} aria-valuenow={datos.distintas} aria-label="Avance del álbum">
              <span style={{ width: `${porcentaje}%` }} />
            </div>
          )}
        </div>
        {!username && <Link to="/tareas" className="btn btn-primary btn-sm">🎯 Ganar estampitas</Link>}
      </section>

      {error && <p className="avatar-aviso error" role="alert">{error}</p>}

      {datos &&
        Object.entries(SERIES).map(([id, serie]) => {
          const deSerie = ESTAMPITAS.filter((e) => e.serie === id);
          const tengo = deSerie.filter((e) => cantidades[e.id]).length;
          const completa = datos.seriesCompletas.includes(id);
          return (
            <section key={id} className={`album-serie ${completa ? "completa" : ""}`}>
              <h3>
                <span aria-hidden="true">{serie.emoji}</span> {serie.nombre}
                <small>{completa ? "✓ ¡Completa!" : `${tengo}/${deSerie.length}`}</small>
              </h3>
              <div className="album-grid">
                {deSerie.map((e) => (
                  <Estampita
                    key={e.id}
                    id={e.id}
                    bloqueada={!cantidades[e.id]}
                    cantidad={cantidades[e.id] || 0}
                    onClick={cantidades[e.id] ? () => setDetalle(e.id) : undefined}
                  />
                ))}
              </div>
            </section>
          );
        })}

      {detalle && (
        <div className="sobre-backdrop" role="dialog" aria-modal="true" aria-label={ESTAMPITA_POR_ID[detalle].nombre} onMouseDown={(ev) => ev.target === ev.currentTarget && setDetalle(null)}>
          <div className="sobre-dialog album-detalle">
            <Estampita id={detalle} cantidad={cantidades[detalle]} tamano="lg" />
            <div>
              <p className="album-detalle-meta">
                #{String(numeroDe(detalle)).padStart(2, "0")} · {SERIES[ESTAMPITA_POR_ID[detalle].serie].nombre} ·{" "}
                <b style={{ color: RAREZAS[ESTAMPITA_POR_ID[detalle].rareza].color }}>{RAREZAS[ESTAMPITA_POR_ID[detalle].rareza].nombre}</b>
              </p>
              <h3>{ESTAMPITA_POR_ID[detalle].nombre}</h3>
              <p>{ESTAMPITA_POR_ID[detalle].descripcion}</p>
              {cantidades[detalle] > 1 && <p className="avatar-hint">Tienes {cantidades[detalle]} de esta estampita.</p>}
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setDetalle(null)} autoFocus>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
