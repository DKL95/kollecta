const express = require("express");

const { obtenerImagen } = require("../controllers/imagenController");

const router = express.Router();

router.get("/:id", obtenerImagen);

module.exports = router;
