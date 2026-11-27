import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";
import SobreDialog from "../components/SobreDialog";
import { RAREZAS } from "../utils/estampitas";

const PESTANAS = [
  { id: "diaria", etiqueta: "Diarias", reinicio: "diaria" },
  { id: "semanal", etiqueta: "Semanales", reinicio: "semanal" },
  { id: "logro", etiqueta: "Logros" },
];

// A dónde ir para avanzar cada tarea.
const ENLACES = {
  d_publicar: "/inicio",
  d_comentar: "/inicio",
  d_like: "/inicio",
  d_sticker: "/mensajes",
  d_jugar: "/juegos",
  s_snake: "/juegos/snake",
  s_tiendita: "/juegos/tiendita",
  s_memorama: "/juegos/memorama",
  s_mensajes: "/mensajes",
  s_coleccion: "/coleccion/agregar",
  l_avatar: "/avatar",
  l_sticker: "/avatar#stickers",
  l_publicaciones: "/inicio",
  l_snake: "/juegos/snake",
  l_tiendita: "/juegos/tiendita",
  l_serie: "/estampitas",
};

function tiempoRestante(segundos) {
  if (!segundos || segundos <= 0) return "";
  const dias = Math.floor(segundos / 86400);
  const horas = Math.floor((segundos % 86400) / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  if (dias > 0) return `${dias} d ${horas} h`;
  if (horas > 0) return `${horas} h ${minutos} min`;
  return `${Math.max(1, minutos)} min`;
}

export default function TareasPage() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [pestana, setPestana] = useState("diaria");
  const [reclamando, setReclamando] = useState(null);
  const [sobre, setSobre] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setError("");
      setDatos(await apiRequest("/tareas"));
    } catch (err) {
      setError(err.message || "No se pudieron cargar las tareas");
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function reclamar(tarea) {
    setReclamando(tarea.id);
    try {
      const data = await apiRequest(`/tareas/${tarea.id}/reclamar`, { method: "POST" });
      setSobre({ titulo: `«${tarea.titulo}» completada`, estampitas: data.estampitas, seriesNuevas: data.seriesNuevas });
      window.dispatchEvent(new Event("tareas-actualizadas"));
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setReclamando(null);
    }
  }

  const lista = (datos?.tareas || []).filter((t) => t.tipo === pestana);
  const pendientesDe = (tipo) => (datos?.tareas || []).filter((t) => t.tipo === tipo && t.completada && !t.reclamada).length;
  const info = PESTANAS.find((p) => p.id === pestana);

  return (
    <main className="page tareas-page">
      <section className="tareas-hero">
        <div>
          <h2>Tareas</h2>
          <p>Completa tareas para ganar sobres de estampitas y llenar tu álbum.</p>
        </div>
        <Link to="/estampitas" className="btn btn-secondary btn-sm">📒 Mi álbum</Link>
      </section>

      <div className="avatar-tabs" role="tablist" aria-label="Tipo de tarea">
        {PESTANAS.map((p) => (
          <button key={p.id} type="button" role="tab" aria-selected={pestana === p.id} className={pestana === p.id ? "active" : ""} onClick={() => setPestana(p.id)}>
            {p.etiqueta}
            {pendientesDe(p.id) > 0 && <span className="tareas-punto">{pendientesDe(p.id)}</span>}
          </button>
        ))}
      </div>

      {info?.reinicio && datos?.reinicioEn && (
        <p className="tareas-reinicio">Se renuevan en {tiempoRestante(datos.reinicioEn[info.reinicio])}</p>
      )}

      {error && <p className="avatar-aviso error" role="alert">{error}</p>}
      {!datos && !error && <p className="avatar-hint">Cargando tareas…</p>}

      <ul className="tareas-lista">
        {lista.map((t) => {
          const porcentaje = Math.round((t.progreso / t.meta) * 100);
          const rareza = RAREZAS[t.recompensa.minRareza];
          return (
            <li key={t.id} className={`tarea ${t.reclamada ? "reclamada" : t.completada ? "lista" : ""}`}>
              <div className="tarea-info">
                <h3>{t.titulo}</h3>
                <p>{t.descripcion}</p>
                <div className="tarea-barra" role="progressbar" aria-valuemin={0} aria-valuemax={t.meta} aria-valuenow={t.progreso} aria-label={`${t.progreso} de ${t.meta}`}>
                  <span style={{ width: `${porcentaje}%` }} />
                </div>
                <small>
                  {t.progreso}/{t.meta}
                  <span className="tarea-premio">
                    · 🎴 {t.recompensa.cantidad} {t.recompensa.cantidad === 1 ? "estampita" : "estampitas"}
                    {t.recompensa.minRareza !== "comun" && <b style={{ color: rareza.color }}> ({rareza.nombre} o mejor)</b>}
                  </span>
                </small>
              </div>

              {t.reclamada ? (
                <span className="tarea-hecha">✓ Reclamada</span>
              ) : t.completada ? (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => reclamar(t)} disabled={reclamando === t.id}>
                  {reclamando === t.id ? "Abriendo…" : "Reclamar"}
                </button>
              ) : ENLACES[t.id] ? (
                <Link to={ENLACES[t.id]} className="btn btn-ghost btn-sm">Ir</Link>
              ) : null}
            </li>
          );
        })}
      </ul>

      {sobre && <SobreDialog {...sobre} onCerrar={() => setSobre(null)} />}
    </main>
  );
}
