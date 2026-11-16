const express = require("express");

const { listarReportes, obtenerReporte } = require("../controllers/reporteController");
const { requiereAuth } = require("../middleware/auth");

const router = express.Router();

// Cada reporte valida su rol mínimo en el controlador (usuario, moderador o administrador).
router.use(requiereAuth);

router.get("/", listarReportes);
router.get("/:id", obtenerReporte);

module.exports = router;
