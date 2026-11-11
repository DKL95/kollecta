// Textos y colores de cada estado de una orden.
export const ESTADOS = {
  pendiente: { label: "Pendiente", pill: "" },
  aceptada: { label: "Aceptada", pill: "purple" },
  enviada: { label: "Enviada", pill: "cyan" },
  recibida: { label: "Recibida", pill: "cyan" },
  completada: { label: "Completada", pill: "green" },
  rechazada: { label: "Rechazada", pill: "red" },
  cancelada: { label: "Cancelada", pill: "red" },
};

export const PASOS = ["pendiente", "aceptada", "enviada", "recibida", "completada"];

export function etiquetaEstado(estado) {
  return ESTADOS[estado]?.label || estado;
}

// Acciones que puede hacer quien ve la orden, según su rol y el estado actual.
// Debe coincidir con TRANSICIONES de controllers/ordenController.js.
export function accionesDisponibles(orden) {
  const { estado, miRol, entrega } = orden;
  const acciones = [];

  if (miRol === "vendedor") {
    if (estado === "pendiente") {
      acciones.push({ estado: "aceptada", label: "Aceptar", primaria: true });
      acciones.push({ estado: "rechazada", label: "Rechazar", peligro: true });
    }
    if (estado === "aceptada" && entrega === "envio") {
      acciones.push({ estado: "enviada", label: "Marcar como enviada", primaria: true });
    }
    if (estado === "recibida") {
      acciones.push({ estado: "completada", label: "Confirmar y completar", primaria: true });
    }
    if (estado === "aceptada") acciones.push({ estado: "cancelada", label: "Cancelar operación", peligro: true });
  }

  if (miRol === "comprador") {
    if (estado === "pendiente") acciones.push({ estado: "retirar", label: "Retirar solicitud", peligro: true });
    if (estado === "enviada" || (estado === "aceptada" && entrega === "en_persona")) {
      acciones.push({ estado: "recibida", label: "Ya lo recibí", primaria: true });
    }
    if (estado === "aceptada") acciones.push({ estado: "cancelada", label: "Cancelar operación", peligro: true });
  }

  return acciones;
}

// Qué sigue, explicado en una línea para quien ve la orden.
export function siguientePaso(orden) {
  const { estado, miRol, entrega } = orden;
  const vende = miRol === "vendedor";
  switch (estado) {
    case "pendiente":
      return vende ? "Revisa la solicitud y acéptala o recházala." : "Esperando a que la otra persona responda.";
    case "aceptada":
      if (entrega === "envio") return vende ? "Envía el artículo y márcalo como enviado." : "Esperando el envío.";
      return vende
        ? "Pónganse de acuerdo en el chat para verse."
        : "Pónganse de acuerdo en el chat y confirma cuando lo tengas.";
    case "enviada":
      return vende ? "Esperando a que confirmen que lo recibieron." : "Cuando te llegue, confirma que lo recibiste.";
    case "recibida":
      return vende ? "Confirma que todo salió bien para completar la operación." : "Esperando la confirmación final.";
    case "completada":
      return "Operación completada. El artículo ya está en la colección de quien lo recibió.";
    case "rechazada":
      return "La solicitud fue rechazada.";
    case "cancelada":
      return "La operación se canceló.";
    default:
      return "";
  }
}
