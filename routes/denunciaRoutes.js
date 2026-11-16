const express = require("express");

const {
    crearDenuncia,
    listarMisDenuncias,
    listarDenuncias,
    actualizarDenuncia
} = require("../controllers/moderacionController");
const { requiereAuth } = require("../middleware/auth");
const { requiereRol } = require("../middleware/roles");
const { registrarOperacion } = require("../middleware/registrarOperacion");

const router = express.Router();

router.use(requiereAuth);

// Cualquier usuario
router.post("/", registrarOperacion("crear denuncia"), crearDenuncia);
router.get("/mias", listarMisDenuncias);

// Moderación
router.get("/", requiereRol("moderador"), listarDenuncias);
router.patch("/:id", requiereRol("moderador"), registrarOperacion("atender denuncia"), actualizarDenuncia);

module.exports = router;
