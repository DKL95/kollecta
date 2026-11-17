
const express = require("express");
const router = express.Router();

const { requiereAuth } = require("../middleware/auth");

const {
    obtenerConversaciones,
    obtenerOCrearConversacion,
    obtenerMensajes,
    enviarMensaje,
    editarMensaje,
    eliminarMensaje,
    marcarConversacionLeida,
    obtenerMensajesNoLeidos,
    alternarSilencioConversacion,
    eliminarConversacion,
    crearGrupo,
    actualizarGrupo,
    agregarParticipantes,
    quitarParticipante
} = require("../controllers/mensajeController");
const { registrarOperacion } = require("../middleware/registrarOperacion");

router.use(requiereAuth);

// Chats grupales (van antes de "/:conversacionId" para que no los capture).
router.post("/grupos", registrarOperacion("crear grupo"), crearGrupo);
router.patch("/grupos/:conversacionId", registrarOperacion("editar grupo"), actualizarGrupo);
router.post("/grupos/:conversacionId/participantes", agregarParticipantes);
router.delete("/grupos/:conversacionId/participantes/:usuarioId", quitarParticipante);

// Obtener las conversaciones del usuario
router.get("/conversaciones", obtenerConversaciones);

// Abrir o crear una conversación con otro usuario
router.post("/conversaciones/:usuarioId", obtenerOCrearConversacion);

// Obtener el contador de mensajes sin leer
router.get("/no-leidos", obtenerMensajesNoLeidos);

// Silenciar o activar las notificaciones de una conversación
router.patch(
    "/:conversacionId/silenciar",
    alternarSilencioConversacion
);

// Eliminar una conversación de la lista del usuario actual
router.delete(
    "/:conversacionId",
    eliminarConversacion
);

// Marcar como leído lo recibido en un chat abierto
router.patch("/:conversacionId/leidos", marcarConversacionLeida);

// Editar o borrar un mensaje propio
router.patch("/:conversacionId/mensajes/:mensajeId", registrarOperacion("editar mensaje"), editarMensaje);
router.delete("/:conversacionId/mensajes/:mensajeId", registrarOperacion("borrar mensaje"), eliminarMensaje);

// Obtener los mensajes de una conversación
router.get("/:conversacionId", obtenerMensajes);

// Enviar un mensaje de texto
router.post("/:conversacionId", enviarMensaje);

module.exports = router;
