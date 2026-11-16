import { useState } from "react";
import { apiRequest } from "../api/client";
import { DENUNCIAS_ACTUALIZADAS } from "../hooks/useDenunciasPendientes";
import { timeAgo } from "../utils/format";
import { ETIQUETA_MOTIVO_DISPUTA, RESOLUCIONES_DISPUTA, etiquetaEstado } from "../utils/ordenes";
import { esAdmin, esModerador } from "../utils/roles";
import Icon from "./Icon";
import ModActionDialog from "./ModActionDialog";

// Quién puede resolver (lo mismo valida el backend): moderación que no participe en
// la orden; si participa alguien del equipo, solo un administrador.
export function puedeResolverDisputa(orden, user) {
  if (!esModerador(user) || orden.disputa?.estado !== "abierta") return { puede: false };
  const partes = [orden.comprador, orden.vendedor];
  if (partes.some((p) => String(p?._id) === String(user.id))) {
    return { puede: false, razon: "Participas en esta orden: la resuelve otra persona del equipo." };
  }
  if (partes.some((p) => p?.rol && p.rol !== "usuario") && !esAdmin(user)) {
    return { puede: false, razon: "Participa alguien del equipo: solo un administrador la resuelve." };
  }
  return { puede: true };
}

// Muestra la disputa de una orden y, a moderación, los botones para resolverla.
export default function DisputePanel({ orden, user, onResolved }) {
  const [accion, setAccion] = useState(null);
  const disputa = orden.disputa;
  if (!disputa) return null;

  const abierta = disputa.estado === "abierta";
  const { puede, razon } = puedeResolverDisputa(orden, user);
  const resolucion = RESOLUCIONES_DISPUTA[disputa.resolucion?.accion];

  async function resolver({ motivo }) {
    const data = await apiRequest(`/ordenes/${orden._id}/disputa`, {
      method: "PATCH",
      body: { accion, nota: motivo },
    });
    window.dispatchEvent(new Event(DENUNCIAS_ACTUALIZADAS));
    onResolved?.(data.orden);
  }

  return (
    <div className={`dispute-box ${abierta ? "open" : ""}`}>
      <div className="dispute-head">
        <Icon name={abierta ? "flag" : "checkCircle"} size={16} />
        <strong>{abierta ? "Orden en disputa" : "Disputa resuelta"}</strong>
        <span className="pill pink">{ETIQUETA_MOTIVO_DISPUTA[disputa.motivo]}</span>
        <span className="dispute-time">{timeAgo(disputa.fecha)}</span>
      </div>

      <p className="dispute-text">
        Abierta por <strong>@{disputa.abiertaPor?.username || "?"}</strong> cuando la orden estaba{" "}
        {etiquetaEstado(disputa.estadoPrevio).toLowerCase()}.
        {abierta && orden.miRol && " Moderación la está revisando; mientras tanto la orden queda en pausa."}
      </p>
      {disputa.detalle && <blockquote className="report-quote">{disputa.detalle}</blockquote>}

      {!abierta && resolucion && (
        <p className="dispute-text">
          <strong>Resolución:</strong> {resolucion.corta.toLowerCase()}
          {disputa.moderador?.username && esModerador(user) ? ` por @${disputa.moderador.username}` : ""}
          {disputa.resolucion.nota ? ` — “${disputa.resolucion.nota}”` : ""}
        </p>
      )}

      {abierta && esModerador(user) && !puede && razon && <p className="mod-hint">{razon}</p>}

      {abierta && puede && (
        <div className="mod-actions">
          {Object.entries(RESOLUCIONES_DISPUTA).map(([valor, r]) => (
            <button
              key={valor}
              type="button"
              className={`btn btn-sm ${r.peligro ? "btn-danger" : "btn-secondary"}`}
              onClick={() => setAccion(valor)}
            >
              {r.etiqueta}
            </button>
          ))}
        </div>
      )}

      {accion && (
        <ModActionDialog
          titulo={RESOLUCIONES_DISPUTA[accion].etiqueta}
          descripcion={`${RESOLUCIONES_DISPUTA[accion].descripcion} La nota la verán las dos partes y queda en la bitácora.`}
          confirmar="Resolver disputa"
          peligro={RESOLUCIONES_DISPUTA[accion].peligro}
          onConfirm={resolver}
          onClose={() => setAccion(null)}
        />
      )}
    </div>
  );
}
