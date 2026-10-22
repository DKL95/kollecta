const express = require("express");

const {
    buscarUsuarios,
    obtenerPerfil,
    obtenerPublicacionesDeUsuario,
    actualizarPerfil
} = require("../controllers/usuarioController");
const { requiereAuth } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

const router = express.Router();

router.use(requiereAuth);

router.get("/", buscarUsuarios);
router.put("/me",upload.single("fotoPerfil"), actualizarPerfil);
router.get("/:username", obtenerPerfil);
router.get("/:username/publicaciones", obtenerPublicacionesDeUsuario);

module.exports = router;
