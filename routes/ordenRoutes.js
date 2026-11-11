const express = require("express");

const {
    crearOrden,
    listarOrdenes,
    obtenerOrden,
    cambiarEstado,
    cancelarOrden,
    calificarOrden,
    resumenVendedor
} = require("../controllers/ordenController");
const { requiereAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requiereAuth);

router.get("/", listarOrdenes);
router.post("/", crearOrden);
router.get("/resumen/:username", resumenVendedor);
router.get("/:id", obtenerOrden);
router.patch("/:id/estado", cambiarEstado);
router.post("/:id/calificacion", calificarOrden);
router.delete("/:id", cancelarOrden);

module.exports = router;
