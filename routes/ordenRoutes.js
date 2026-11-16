const express = require("express");

const {
    crearOrden,
    listarOrdenes,
    obtenerOrden,
    cambiarEstado,
    cancelarOrden,
    calificarOrden,
    resumenVendedor,
    abrirDisputa,
    listarDisputas,
    resolverDisputa
} = require("../controllers/ordenController");
const { requiereAuth } = require("../middleware/auth");
const { requiereRol } = require("../middleware/roles");

const router = express.Router();

router.use(requiereAuth);

router.get("/", listarOrdenes);
router.post("/", crearOrden);
router.get("/resumen/:username", resumenVendedor);
router.get("/disputas", requiereRol("moderador"), listarDisputas);
router.get("/:id", obtenerOrden);
router.patch("/:id/estado", cambiarEstado);
router.post("/:id/calificacion", calificarOrden);
router.post("/:id/disputa", abrirDisputa);
router.patch("/:id/disputa", requiereRol("moderador"), resolverDisputa);
router.delete("/:id", cancelarOrden);

module.exports = router;
