const mongoose = require("mongoose");
const { campoOculto } = require("./oculto");

// Klip: video vertical corto (máx. 60 s y 15 MB) al estilo reels.
// El video vive en GridFS (bucket "videos"); aquí solo va su URL.
// Los comentarios van embebidos porque son cortos y se leen siempre junto al Klip.
const MAX_TEXTO_KLIP = 300;
const MAX_COMENTARIO_KLIP = 300;
const MAX_COMENTARIOS_KLIP = 500;

const comentarioKlipSchema = new mongoose.Schema(
    {
        autor: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
        texto: { type: String, required: true, trim: true, maxlength: MAX_COMENTARIO_KLIP },
        fecha: { type: Date, default: Date.now }
    }
);

const klipSchema = new mongoose.Schema(
    {
        autor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Usuario",
            required: true
        },

        video: {
            type: String,
            required: true
        },

        texto: {
            type: String,
            default: "",
            trim: true,
            maxlength: MAX_TEXTO_KLIP
        },

        // Grupo K-pop del Klip (opcional)
        grupo: {
            type: String,
            default: "",
            trim: true,
            maxlength: 60
        },

        duracion: {
            type: Number,
            default: 0,
            min: 0
        },

        likes: {
            type: [mongoose.Schema.Types.ObjectId],
            default: []
        },

        comentarios: {
            type: [comentarioKlipSchema],
            default: []
        },

        reproducciones: {
            type: Number,
            default: 0,
            min: 0
        },

        oculto: campoOculto
    },
    {
        collection: "klips",
        timestamps: { createdAt: "fecha", updatedAt: "editadoEn" }
    }
);

klipSchema.index({ fecha: -1 });
klipSchema.index({ autor: 1, fecha: -1 });

module.exports = mongoose.model("Klip", klipSchema);
module.exports.MAX_TEXTO_KLIP = MAX_TEXTO_KLIP;
module.exports.MAX_COMENTARIO_KLIP = MAX_COMENTARIO_KLIP;
module.exports.MAX_COMENTARIOS_KLIP = MAX_COMENTARIOS_KLIP;
