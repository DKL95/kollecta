/* ==========================================================================
   Catálogo de endpoints para el documento técnico (docs/KollectA-documento-tecnico.pdf).

   generarDocumento.js compara esta lista con las rutas reales de routes/*.js y
   falla si falta o sobra alguna, así que no se puede desfasar del código.

   acceso: "publico" | "token" | "moderador" | "administrador" | "firmado"
   ========================================================================== */

const E = (metodo, ruta, acceso, descripcion, entrada = "—", respuesta = "—") => ({
    metodo,
    ruta,
    acceso,
    descripcion,
    entrada,
    respuesta
});

module.exports = [
    {
        grupo: "Autenticación",
        base: "/api/auth",
        archivo: "authRoutes.js",
        endpoints: [
            E("POST", "/register", "publico", "Crea una cuenta y abre sesión.",
                "multipart: name, username, email, password, bias?, descripcion?, fotoPerfil?",
                "201 { token, usuario }"),
            E("POST", "/login", "publico", "Inicia sesión. Rechaza cuentas baneadas o suspendidas.",
                "{ email, password }", "{ token, usuario }"),
            E("GET", "/me", "token", "Datos del usuario de la sesión.", "—", "{ usuario }")
        ]
    },
    {
        grupo: "Usuarios y amistades",
        base: "/api/usuarios",
        archivo: "usuarioRoutes.js",
        endpoints: [
            E("GET", "/", "token", "Busca usuarios por nombre o username.", "query: q", "{ usuarios }"),
            E("PUT", "/me", "token", "Edita el perfil propio.",
                "multipart: nombre?, descripcion?, gruposFavoritos?, fotoPerfil?", "{ mensaje, usuario }"),
            E("GET", "/me/amigos", "token", "Lista de amigos de la sesión.", "—", "{ amigos }"),
            E("GET", "/:username", "token", "Perfil público de un usuario.", "—", "{ usuario }"),
            E("GET", "/:username/publicaciones", "token", "Publicaciones de un usuario.", "—", "{ publicaciones }"),
            E("GET", "/:username/amistad", "token", "Estado de amistad con ese usuario (ninguna, enviada, recibida, amigos).", "—", "{ estado: self|none|friends|…, solicitudId? }"),
            E("POST", "/:username/solicitud", "token", "Envía una solicitud de amistad.", "—", "201 { mensaje, solicitud }"),
            E("GET", "/solicitudes/recibidas", "token", "Solicitudes de amistad pendientes que recibí.", "—", "{ solicitudes }"),
            E("GET", "/solicitudes/enviadas", "token", "Solicitudes de amistad pendientes que envié.", "—", "{ solicitudes }"),
            E("POST", "/solicitudes/:id/aceptar", "token", "Acepta una solicitud (solo el destinatario).", "—", "{ mensaje, amistad }"),
            E("POST", "/solicitudes/:id/rechazar", "token", "Rechaza una solicitud (solo el destinatario).", "—", "{ mensaje }"),
            E("DELETE", "/solicitudes/:id", "token", "Cancela una solicitud que envié.", "—", "{ mensaje }"),
            E("DELETE", "/:id/amigo", "token", "Elimina a un amigo.", "—", "{ mensaje }")
        ]
    },
    {
        grupo: "Publicaciones, comentarios y respuestas",
        base: "/api/publicaciones",
        archivo: "publicacionRoutes.js",
        endpoints: [
            E("GET", "/", "token", "Feed de publicaciones visibles.", "query: grupo?", "{ publicaciones }"),
            E("POST", "/", "token", "Crea una publicación con texto, imágenes y videos.",
                "multipart: texto (≤1000), grupo?, imagenes[] (≤10), videos[] (≤5)", "201 { mensaje, publicacion }"),
            E("GET", "/:id", "token", "Una publicación.", "—", "{ publicacion }"),
            E("PUT", "/:id", "token", "Edita una publicación (solo el autor).",
                "multipart: texto?, grupo?, imagenesEliminadas?, videosEliminados?, imagenes[]?, videos[]?", "{ mensaje, publicacion }"),
            E("DELETE", "/:id", "token", "Borra una publicación con sus comentarios y archivos (solo el autor).", "—", "{ mensaje }"),
            E("POST", "/:id/like", "token", "Da o quita like.", "—", "{ publicacion }"),
            E("GET", "/:id/comentarios", "token", "Comentarios de la publicación con sus respuestas.", "—", "{ comentarios, totalComentarios }"),
            E("POST", "/:id/comentarios", "token", "Comenta una publicación.", "{ texto }", "201 { mensaje, comentario, totalComentarios }"),
            E("PUT", "/:id/comentarios/:comentarioId", "token", "Edita un comentario propio.", "{ texto }", "{ mensaje, comentario }"),
            E("DELETE", "/:id/comentarios/:comentarioId", "token", "Borra un comentario (autor del comentario o de la publicación).", "—", "{ mensaje }"),
            E("POST", "/:id/comentarios/:comentarioId/like", "token", "Da o quita like a un comentario.", "—", "{ mensaje, comentario: { totalLikes, meGusta } }"),
            E("POST", "/:id/comentarios/:comentarioId/respuestas", "token", "Responde a un comentario.", "{ texto, responderA? }", "201 { mensaje, respuesta, totalComentarios }"),
            E("PUT", "/:id/comentarios/:comentarioId/respuestas/:respuestaId", "token", "Edita una respuesta propia.", "{ texto }", "{ mensaje, respuesta }"),
            E("DELETE", "/:id/comentarios/:comentarioId/respuestas/:respuestaId", "token", "Borra una respuesta.", "—", "{ mensaje }"),
            E("POST", "/:id/comentarios/:comentarioId/respuestas/:respuestaId/like", "token", "Da o quita like a una respuesta.", "—", "{ mensaje, respuesta: { totalLikes, meGusta } }")
        ]
    },
    {
        grupo: "Colección personal",
        base: "/api/coleccion",
        archivo: "coleccionRoutes.js",
        endpoints: [
            E("GET", "/", "token", "Mi colección.", "—", "documento coleccion { usuario, articulos[] }"),
            E("GET", "/usuario/:usuarioId", "token", "Colección de otro usuario.", "—", "{ usuario, articulos }"),
            E("GET", "/articulos/:articuloId", "token", "Una pieza de colección y su dueño.", "—", "{ articulo, esMio, propietario }"),
            E("POST", "/articulos", "token", "Agrega una pieza a mi colección.",
                "multipart: titulo, grupo, categoria, descripcion?, valorEstimado?, estado?, imagenes[] (≤10)", "201 { mensaje, coleccion, articulo }"),
            E("POST", "/articulos/:articuloId/imagenes", "token", "Agrega fotos a una pieza propia.", "multipart: imagenes[] (≤10 en total)", "201 { mensaje, articulo }"),
            E("PUT", "/articulos/:articuloId", "token", "Edita los datos de una pieza propia.",
                "{ titulo?, grupo?, categoria?, descripcion?, valorEstimado?, estado? }", "{ mensaje, articulo }"),
            E("DELETE", "/articulos/:articuloId", "token", "Borra una pieza propia.", "—", "{ mensaje }")
        ]
    },
    {
        grupo: "Archivos",
        base: "/api",
        archivo: "imagenRoutes.js / videoRoutes.js",
        endpoints: [
            E("GET", "/imagenes/:id", "publico", "Devuelve una imagen guardada en MongoDB (ver nota de seguridad).", "—", "binario (image/*)"),
            E("GET", "/videos/:id/playback-url", "token", "Genera una URL firmada y temporal para reproducir un video.", "—", "{ url }"),
            E("GET", "/videos/:id", "firmado", "Transmite el video por rangos (HTTP 206).", "query: token (firmado) o header Bearer", "binario (video/*)")
        ]
    },
    {
        grupo: "Mensajes y chats grupales",
        base: "/api/mensajes",
        archivo: "mensajeRoutes.js",
        endpoints: [
            E("GET", "/conversaciones", "token", "Mis conversaciones con su último mensaje.", "—", "[ conversacion ]"),
            E("POST", "/conversaciones/:usuarioId", "token", "Abre (o crea) el chat directo con un usuario.", "—", "conversacion"),
            E("GET", "/no-leidos", "token", "Total de mensajes sin leer.", "—", "{ noLeidos }"),
            E("GET", "/:conversacionId", "token", "Mensajes de una conversación (y los marca como leídos).", "—", "[ mensaje ]"),
            E("POST", "/:conversacionId", "token", "Envía un mensaje. También se emite por Socket.IO.", "{ texto }", "201 mensaje"),
            E("PATCH", "/:conversacionId/silenciar", "token", "Silencia o reactiva las notificaciones de un chat.", "—", "{ silenciada, mensaje }"),
            E("DELETE", "/:conversacionId", "token", "Quita la conversación de mi lista.", "—", "{ mensaje }"),
            E("POST", "/grupos", "token", "Crea un chat grupal.", "{ nombre, participantes[] }", "201 conversacion"),
            E("PATCH", "/grupos/:conversacionId", "token", "Renombra un chat grupal.", "{ nombre }", "conversacion"),
            E("POST", "/grupos/:conversacionId/participantes", "token", "Agrega personas al grupo.", "{ usuarios[] }", "conversacion"),
            E("DELETE", "/grupos/:conversacionId/participantes/:usuarioId", "token", "Saca a alguien del grupo o sale de él.", "—", "{ mensaje }")
        ]
    },
    {
        grupo: "Notificaciones",
        base: "/api/notificaciones",
        archivo: "notificacionRoutes.js",
        endpoints: [
            E("GET", "/", "token", "Mis notificaciones.", "—", "{ notificaciones, noLeidas }"),
            E("PATCH", "/:id/leida", "token", "Marca una notificación como leída.", "—", "{ notificacion }"),
            E("PATCH", "/leidas/todas", "token", "Marca todas como leídas.", "—", "{ mensaje }")
        ]
    },
    {
        grupo: "Marketplace (productos)",
        base: "/api/productos",
        archivo: "productoRoutes.js",
        endpoints: [
            E("GET", "/", "token", "Productos activos del marketplace.", "query: tipo?, grupo?, categoria?, q?, vendedor=yo?", "{ productos }"),
            E("POST", "/", "token", "Publica un producto en venta o intercambio.",
                "multipart: titulo, grupo, categoria, condicion, precio?, disponibleCompra, disponibleIntercambio, busca?, imagenes[]; desdeColeccion?, fotosCopiadas?",
                "201 { mensaje, producto }"),
            E("GET", "/:id", "token", "Detalle de un producto.", "—", "{ producto }"),
            E("PUT", "/:id", "token", "Edita mi producto; reactivar: true lo vuelve a publicar.", "{ campos a cambiar, reactivar? }", "{ mensaje, producto }"),
            E("DELETE", "/:id", "token", "Retira mi producto y cierra sus solicitudes pendientes.", "—", "{ mensaje }")
        ]
    },
    {
        grupo: "Órdenes y disputas",
        base: "/api/ordenes",
        archivo: "ordenRoutes.js",
        endpoints: [
            E("GET", "/", "token", "Mis compras o mis ventas.", "query: rol=comprador|vendedor, estado?", "{ ordenes }"),
            E("POST", "/", "token", "Solicita una compra o propone un intercambio.",
                "{ productoId, tipo: compra|intercambio, entrega: envio|en_persona, nota?, ofrecidos[]? }", "201 { mensaje, orden }"),
            E("GET", "/resumen/:username", "token", "Reputación del vendedor: operaciones, promedio, distribución y reseñas.", "—", "{ operaciones, calificaciones, promedio, distribucion, resenas }"),
            E("GET", "/disputas", "moderador", "Cola de disputas.", "query: estado=abiertas|resueltas", "{ disputas }"),
            E("GET", "/:id", "token", "Detalle de una orden (participantes o moderación).", "—", "{ orden }"),
            E("PATCH", "/:id/estado", "token", "Avanza la orden: aceptada, rechazada, enviada, recibida, completada o cancelada (según quién la pide). Bloqueado si hay disputa abierta.",
                "{ estado, nota? }", "{ mensaje, orden }"),
            E("DELETE", "/:id", "token", "El comprador retira su solicitud pendiente.", "—", "{ mensaje }"),
            E("POST", "/:id/calificacion", "token", "El comprador califica al vendedor (orden completada).", "{ estrellas: 1-5, comentario? }", "{ mensaje, orden }"),
            E("POST", "/:id/disputa", "token", "Abre una disputa y congela la orden.",
                "{ motivo: no_llego|no_corresponde|falsificacion|no_responde|otro, detalle }", "201 { mensaje, orden }"),
            E("PATCH", "/:id/disputa", "moderador", "Resuelve la disputa (sin conflicto de interés).",
                "{ accion: cancelar|completar|continuar, nota }", "{ mensaje, orden }")
        ]
    },
    {
        grupo: "Denuncias",
        base: "/api/denuncias",
        archivo: "denunciaRoutes.js",
        endpoints: [
            E("POST", "/", "token", "Denuncia una publicación, comentario, respuesta, mensaje, producto o cuenta.",
                "{ tipo, objetivo, motivo, detalle? }", "201 { mensaje, denuncia }"),
            E("GET", "/mias", "token", "Mis denuncias y su estado.", "—", "{ denuncias }"),
            E("GET", "/", "moderador", "Cola de denuncias.", "query: estado?, tipo?, motivo?", "{ denuncias, pendientes }"),
            E("PATCH", "/:id", "moderador", "Toma o resuelve una denuncia y aplica la sanción.",
                "{ estado, accion?, nota?, dias? }", "{ mensaje, denuncia | cerradas }")
        ]
    },
    {
        grupo: "Moderación",
        base: "/api/moderacion",
        archivo: "moderacionRoutes.js",
        endpoints: [
            E("GET", "/resumen", "moderador", "Pendientes para el menú (denuncias + disputas).", "—", "{ pendientes, denuncias, disputas }"),
            E("GET", "/usuarios", "moderador", "Busca cuentas para moderar.", "query: q?, estado=suspendidos|baneados?, rol?", "{ usuarios }"),
            E("POST", "/usuarios/:id/suspension", "moderador", "Suspende una cuenta de 1 a 30 días.", "{ dias, motivo }", "{ mensaje, hasta }"),
            E("DELETE", "/usuarios/:id/suspension", "moderador", "Levanta una suspensión.", "{ motivo? }", "{ mensaje }"),
            E("PATCH", "/contenido/:tipo/:id", "moderador", "Oculta o vuelve a mostrar contenido.", "{ oculto, motivo }", "{ mensaje }"),
            E("GET", "/bitacora", "moderador", "Bitácora de acciones de moderación.", "query: moderador?, accion?", "{ registros }")
        ]
    },
    {
        grupo: "Administración",
        base: "/api/admin",
        archivo: "adminRoutes.js",
        endpoints: [
            E("GET", "/usuarios", "administrador", "Lista usuarios con su rol.", "query: q?, rol?", "{ usuarios }"),
            E("PATCH", "/usuarios/:id/rol", "administrador", "Cambia el rol de una cuenta.", "{ rol: usuario|moderador|administrador }", "{ mensaje, usuario }"),
            E("PATCH", "/usuarios/:id/estado", "administrador", "Banea o reactiva una cuenta.", "{ activo, motivo }", "{ mensaje }")
        ]
    },
    {
        grupo: "Reportes",
        base: "/api/reportes",
        archivo: "reporteRoutes.js",
        endpoints: [
            E("GET", "/", "token", "Reportes disponibles según el rol de la sesión.", "—", "{ rol, reportes }"),
            E("GET", "/:id", "token", "Ejecuta un reporte (agregaciones con $lookup entre colecciones).", "query: desde?, hasta? o meses?", "{ reporte, generado }")
        ]
    }
];
