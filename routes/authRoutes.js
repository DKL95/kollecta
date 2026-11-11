const express = require("express");

const { registrar, iniciarSesion, usuarioActual } = require("../controllers/authController");
const { requiereAuth } = require("../middleware/auth");
const { upload, validarFotoPerfil } = require("../middleware/upload");

const router = express.Router();

router.post("/register", upload.single("fotoPerfil"), validarFotoPerfil, registrar);
router.post("/login", iniciarSesion);
router.get("/me", requiereAuth, usuarioActual);

module.exports = router;
