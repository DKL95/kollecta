const express = require("express");

const {
    crearDenuncia,
    listarMisDenuncias,
    listarDenuncias,
    actualizarDenuncia
} = require("../controllers/moderacionController");
const { requiereAuth } = require("../middleware/auth");
const { requiereRol } = require("../middleware/roles");

const router = express.Router();

router.use(requiereAuth);

// Cualquier usuario
router.post("/", crearDenuncia);
router.get("/mias", listarMisDenuncias);

// Moderación
router.get("/", requiereRol("moderador"), listarDenuncias);
router.patch("/:id", requiereRol("moderador"), actualizarDenuncia);

module.exports = router;
