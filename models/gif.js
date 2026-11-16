const mongoose = require("mongoose");

// GIF animado elegido del buscador (GIPHY). Se guarda solo la dirección del
// archivo y su tamaño; null = sin GIF. Se usa en publicaciones, comentarios,
// respuestas y mensajes.
const gifSchema = new mongoose.Schema(
    {
        url: { type: String, required: true, maxlength: 500 },
        ancho: { type: Number, min: 0, default: 0 },
        alto: { type: Number, min: 0, default: 0 },
        titulo: { type: String, default: "", maxlength: 200, trim: true }
    },
    { _id: false }
);

const campoGif = { type: gifSchema, default: null };

module.exports = { gifSchema, campoGif };
