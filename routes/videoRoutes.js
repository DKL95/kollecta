const express = require("express");

const { urlReproduccion, transmitirVideo } = require("../controllers/videoController");
const { requiereAuth, requiereAuthVideo } = require("../middleware/auth");

const router = express.Router();

// URL temporal de reproducción (exige el JWT normal del usuario)
router.get("/:id/playback-url", requiereAuth, urlReproduccion);

// Transmitir el video: JWT normal o el permiso temporal de la URL
router.get("/:id", requiereAuthVideo, transmitirVideo);

module.exports = router;
