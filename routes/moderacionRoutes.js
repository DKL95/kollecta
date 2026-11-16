const express = require("express");

const {
    cambiarVisibilidadContenido,
    suspenderUsuario,
    quitarSuspension,
    buscarUsuariosModeracion,
    listarBitacora,
    resumenModeracion
} = require("../controllers/moderacionController");
const { requiereAuth } = require("../middleware/auth");
const { requiereRol } = require("../middleware/roles");

const router = express.Router();

router.use(requiereAuth, requiereRol("moderador"));

router.get("/resumen", resumenModeracion);
router.get("/usuarios", buscarUsuariosModeracion);
router.post("/usuarios/:id/suspension", suspenderUsuario);
router.delete("/usuarios/:id/suspension", quitarSuspension);
router.patch("/contenido/:tipo/:id", cambiarVisibilidadContenido);
router.get("/bitacora", listarBitacora);

module.exports = router;
