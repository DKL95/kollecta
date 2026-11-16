const { buscarGifs } = require("../services/gifs");
const logger = require("../config/logger");

// GET /api/gifs?q=texto   (sin q: tendencias). La llave de GIPHY se queda en el servidor.
async function listarGifs(req, res) {
    try {
        const q = String(req.query.q || "").trim();
        const gifs = await buscarGifs(q, req.query.limite);
        res.json({ gifs });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ mensaje: error.message });
        logger.error("Error al buscar GIFs", error);
        res.status(500).json({ mensaje: "No se pudieron cargar los GIFs" });
    }
}

module.exports = { listarGifs };
