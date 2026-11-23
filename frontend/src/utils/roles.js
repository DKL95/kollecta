// Roles acumulativos: usuario < moderador < administrador (igual que middleware/roles.js).
// El front solo los usa para mostrar u ocultar opciones; el backend valida todo.
export const ROLES = ["usuario", "moderador", "administrador"];

export const ETIQUETA_ROL = {
  usuario: "Usuario",
  moderador: "Moderador",
  administrador: "Administrador",
};

export function alcanza(rol, minimo) {
  return ROLES.indexOf(rol || "usuario") >= ROLES.indexOf(minimo);
}

export const esModerador = (user) => alcanza(user?.rol, "moderador");
export const esAdmin = (user) => alcanza(user?.rol, "administrador");

export const MOTIVOS_DENUNCIA = [
  { valor: "spam", etiqueta: "Spam o publicidad" },
  { valor: "acoso", etiqueta: "Acoso u ofensas" },
  { valor: "falsificacion", etiqueta: "Merch falsa o no oficial" },
  { valor: "estafa", etiqueta: "Estafa o fraude" },
  { valor: "contenido_inapropiado", etiqueta: "Contenido inapropiado" },
  { valor: "otro", etiqueta: "Otro" },
];

export const ETIQUETA_MOTIVO = Object.fromEntries(MOTIVOS_DENUNCIA.map((m) => [m.valor, m.etiqueta]));

export const ETIQUETA_TIPO_DENUNCIA = {
  publicacion: "Publicación",
  comentario: "Comentario",
  usuario: "Cuenta",
  producto: "Artículo del marketplace",
  mensaje: "Mensaje",
};

export const ETIQUETA_ACCION = {
  ocultar: "Ocultó contenido",
  mostrar: "Volvió a mostrar contenido",
  suspender: "Suspendió una cuenta",
  levantar_suspension: "Levantó una suspensión",
  banear: "Baneó una cuenta",
  reactivar: "Reactivó una cuenta",
  cambiar_rol: "Cambió un rol",
  resolver_denuncia: "Resolvió una denuncia",
  descartar_denuncia: "Descartó una denuncia",
  resolver_disputa: "Resolvió una disputa",
  crear_grupo: "Agregó un grupo",
  aprobar_grupo: "Aprobó un grupo",
  rechazar_grupo: "Rechazó un grupo",
};

// Solicitudes de grupos nuevos (models/Grupo.js).
export const ESTADO_SOLICITUD_GRUPO = {
  pendiente: { etiqueta: "En revisión", clase: "gold" },
  aprobado: { etiqueta: "Aprobado", clase: "green" },
  rechazado: { etiqueta: "Rechazado", clase: "pink" },
};
