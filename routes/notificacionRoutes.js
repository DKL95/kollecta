const express = require("express");

const {
    listarNotificaciones,
    marcarNotificacionLeida,
    marcarTodasLeidas,
    eliminarNotificacion
} = require("../controllers/notificacionController");
const { requiereAuth } = require("../middleware/auth");
const { registrarOperacion } = require("../middleware/registrarOperacion");

const router = express.Router();

router.use(requiereAuth);

// Las notificaciones las crea el sistema (likes, comentarios, órdenes...): no hay POST.
router.get("/", listarNotificaciones);
router.patch("/leidas/todas", marcarTodasLeidas);
router.patch("/:id/leida", marcarNotificacionLeida);
router.delete("/:id", registrarOperacion("borrar notificación"), eliminarNotificacion);

module.exports = router;
