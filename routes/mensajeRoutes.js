
const express = require("express");
const router = express.Router();

const { requiereAuth } = require("../middleware/auth");

const {
    obtenerConversaciones,
    obtenerOCrearConversacion,
    obtenerMensajes,
    enviarMensaje,
    obtenerMensajesNoLeidos,
    alternarSilencioConversacion,
    eliminarConversacion
} = require("../controllers/mensajeController");

router.use(requiereAuth);

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

// Obtener los mensajes de una conversación
router.get("/:conversacionId", obtenerMensajes);

// Enviar un mensaje de texto
router.post("/:conversacionId", enviarMensaje);

module.exports = router;
