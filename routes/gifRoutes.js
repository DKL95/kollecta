const express = require("express");

const { requiereAuth } = require("../middleware/auth");
const { buscarGifs } = require("../services/gifs");
const logger = require("../config/logger");

const router = express.Router();

// GET /api/gifs?q=texto   (sin q: tendencias)
router.get("/", requiereAuth, async (req, res) => {
    try {
        const q = String(req.query.q || "").trim();
        const gifs = await buscarGifs(q, req.query.limite);
        res.json({ gifs });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ mensaje: error.message });
        logger.error("Error al buscar GIFs", error);
        res.status(500).json({ mensaje: "No se pudieron cargar los GIFs" });
    }
});

module.exports = router;
