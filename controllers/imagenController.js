const mongoose = require("mongoose");

const Imagen = require("../models/Imagen");

// GET /api/imagenes/:id  (pública, para poder usarla en <img src>)
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
        res.set("Cache-Control", "public, max-age=31536000, immutable");
        res.send(imagen.datos);
    } catch (error) {
        console.error("Error al obtener imagen:", error);
        res.status(500).json({ mensaje: "Error al obtener la imagen" });
    }
}

module.exports = { obtenerImagen };
