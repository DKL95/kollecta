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
const { registrarOperacion } = require("../middleware/registrarOperacion");

const router = express.Router();

router.use(requiereAuth, requiereRol("moderador"));

router.get("/resumen", resumenModeracion);
router.get("/usuarios", buscarUsuariosModeracion);
router.post("/usuarios/:id/suspension", registrarOperacion("suspender cuenta"), suspenderUsuario);
router.delete("/usuarios/:id/suspension", registrarOperacion("levantar suspensión"), quitarSuspension);
router.patch("/contenido/:tipo/:id", registrarOperacion("ocultar/mostrar contenido"), cambiarVisibilidadContenido);
router.get("/bitacora", listarBitacora);

module.exports = router;
