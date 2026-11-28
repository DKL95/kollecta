import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { UserAvatar } from "../Avatar";
import Icon from "../Icon";
import HistoriaViewer from "./HistoriaViewer";
import NuevaHistoriaDialog from "./NuevaHistoriaDialog";

/**
 * Fila de historias de Inicio. El aro de color indica historias sin ver;
 * gris, que ya las viste. "Tu historia" abre la ventana para subir una.
 */
export default function HistoriasBar() {
  const { user } = useAuth();
  const [grupos, setGrupos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState(null); // índice del grupo en el visor
  const [subiendo, setSubiendo] = useState(false);

  const cargar = useCallback(() => {
    apiRequest("/historias")
      .then((datos) => setGrupos(datos.grupos || []))
      .catch(() => setGrupos([]))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Cada 2 minutos aparecen las nuevas y se van las que vencieron
  // (no mientras el visor está abierto, para que no cambie el orden).
  useEffect(() => {
    if (abierto !== null) return undefined;
    const intervalo = setInterval(cargar, 120000);
    return () => clearInterval(intervalo);
  }, [cargar, abierto]);

  const miId = String(user?.id || user?._id || "");
  const mio = grupos.find((g) => String(g.autor.id) === miId);
  const otros = grupos.filter((g) => g !== mio);

  const marcarVista = useCallback((idHistoria) => {
    setGrupos((actual) =>
      actual.map((g) => {
        if (!g.historias.some((h) => h.id === idHistoria)) return g;
        const historias = g.historias.map((h) => (h.id === idHistoria ? { ...h, vista: true } : h));
        return { ...g, historias, todasVistas: historias.every((h) => h.vista) };
      })
    );
  }, []);

  const quitar = useCallback((idHistoria) => {
    setGrupos((actual) =>
      actual
        .map((g) => ({ ...g, historias: g.historias.filter((h) => h.id !== idHistoria) }))
        .filter((g) => g.historias.length > 0)
    );
    setAbierto(null);
  }, []);

  const cerrarVisor = useCallback(() => setAbierto(null), []);

  function alCrear() {
    setSubiendo(false);
    cargar();
  }

  // El visor recorre la misma lista que se ve en la barra (la mía primero).
  const enOrden = mio ? [mio, ...otros] : otros;

  return (
    <section className="historias-bar card" aria-label="Historias">
      <div className="historias-fila">
        <div className="historia-burbuja">
          <button
            type="button"
            className={`historia-aro ${mio ? (mio.todasVistas ? "vista" : "nueva") : "sin"}`}
            onClick={() => (mio ? setAbierto(0) : setSubiendo(true))}
            aria-label={mio ? "Ver tu historia" : "Subir una historia"}
          >
            <UserAvatar user={user} size={58} fontSize={18} />
          </button>
          <button type="button" className="historia-mas" onClick={() => setSubiendo(true)} aria-label="Subir una historia">
            <Icon name="plus" size={13} />
          </button>
          <span className="historia-nombre">Tu historia</span>
        </div>

        {cargando &&
          [0, 1, 2, 3].map((i) => (
            <div className="historia-burbuja esqueleto" key={i} aria-hidden="true">
              <span className="historia-aro sin" />
              <span className="historia-nombre" />
            </div>
          ))}

        {otros.map((g, i) => (
          <div className="historia-burbuja" key={g.autor.id}>
            <button
              type="button"
              className={`historia-aro ${g.todasVistas ? "vista" : "nueva"}`}
              onClick={() => setAbierto(mio ? i + 1 : i)}
              aria-label={`Ver historias de ${g.autor.nombre || g.autor.username}${g.todasVistas ? " (vistas)" : ""}`}
            >
              <UserAvatar user={g.autor} size={58} fontSize={18} />
            </button>
            <span className="historia-nombre">{g.autor.nombre || g.autor.username}</span>
          </div>
        ))}

        {!cargando && otros.length === 0 && (
          <p className="historias-vacio">Aún no hay historias de la comunidad. ¡Sube la primera!</p>
        )}
      </div>

      {abierto !== null && enOrden[abierto] && (
        <HistoriaViewer grupos={enOrden} inicio={abierto} onCerrar={cerrarVisor} onVista={marcarVista} onBorrada={quitar} />
      )}
      {subiendo && <NuevaHistoriaDialog onCerrar={() => setSubiendo(false)} onCreada={alCrear} />}
    </section>
  );
}
