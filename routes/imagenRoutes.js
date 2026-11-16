const express = require("express");

const { obtenerImagen } = require("../controllers/imagenController");
const { requiereAuthMedios } = require("../middleware/auth");

const router = express.Router();

router.get("/:id", requiereAuthMedios, obtenerImagen);

module.exports = router;
