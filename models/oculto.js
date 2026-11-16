const mongoose = require("mongoose");

// Marca de "ocultado por moderación". Se usa en publicaciones, comentarios y
// productos: en lugar de borrar, la moderación oculta el contenido y queda
// registro de quién, cuándo y por qué. null = visible.
const ocultoSchema = new mongoose.Schema(
    {
        por: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
        motivo: { type: String, default: "", maxlength: 300, trim: true },
        fecha: { type: Date, default: Date.now }
    },
    { _id: false }
);

const campoOculto = { type: ocultoSchema, default: null };

module.exports = { ocultoSchema, campoOculto };
