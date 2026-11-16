const mongoose = require("mongoose");

const Imagen = require("../models/Imagen");
const logger = require("../config/logger");

// GET /api/imagenes/:id  (token de sesión o cookie de imágenes, ver middleware/auth.js)
async function obtenerImagen(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ mensaje: "Imagen no encontrada" });
        }

        const imagen = await Imagen.findById(req.params.id);

        if (!imagen) {
            return res.status(404).json({ mensaje: "Imagen no encontrada" });
        }

        // Una imagen nunca cambia (si el usuario sube otra, se crea con otro id)
        res.set("Content-Type", imagen.tipo);
        res.set("Cache-Control", "private, max-age=31536000, immutable");
        res.send(imagen.datos);
    } catch (error) {
        logger.error("Error al obtener imagen:", error);
        res.status(500).json({ mensaje: "Error al obtener la imagen" });
    }
}

module.exports = { obtenerImagen };
