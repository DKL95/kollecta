// Grupo de la API (GET /api/grupos) → formato que usan las tarjetas y pantallas.
export function adaptarGrupo(grupo) {
  return {
    id: grupo._id || grupo.nombre,
    name: grupo.nombre,
    fandom: grupo.fandom,
    agency: grupo.agencia,
    members: grupo.integrantes,
    debut: grupo.debut,
    description: grupo.descripcion || "",
    color: grupo.color,
    initials: grupo.iniciales,
    img: grupo.imagen,
    cover: grupo.portada,
    base: Boolean(grupo.base),
  };
}
