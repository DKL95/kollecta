const express = require("express");

const { registrar, iniciarSesion, usuarioActual } = require("../controllers/authController");
const { requiereAuth } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

const router = express.Router();

router.post("/register", upload.single("fotoPerfil"), registrar);
router.post("/login", iniciarSesion);
router.get("/me", requiereAuth, usuarioActual);

module.exports = router;
