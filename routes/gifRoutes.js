const express = require("express");

const { requiereAuth } = require("../middleware/auth");
const { listarGifs } = require("../controllers/gifController");

const router = express.Router();

// GET /api/gifs?q=texto   (sin q: tendencias)
router.get("/", requiereAuth, listarGifs);

module.exports = router;
