const express = require("express");

const { registrar, iniciarSesion, usuarioActual } = require("../controllers/authController");
const { requiereAuth } = require("../middleware/auth");
const { upload, validarFotoPerfil } = require("../middleware/upload");
const { registrarOperacion } = require("../middleware/registrarOperacion");

const router = express.Router();

router.post("/register", registrarOperacion("registro"), upload.single("fotoPerfil"), validarFotoPerfil, registrar);
router.post("/login", registrarOperacion("login"), iniciarSesion);
router.get("/me", requiereAuth, usuarioActual);

module.exports = router;
