const mongoose = require("mongoose");

// Historia de 24 horas: una foto, un video corto (máx. 15 s) o un texto sobre un fondo de color.
// No usa índice TTL a propósito: si Mongo borrara el documento solo, el archivo
// (imagen o video en GridFS) se quedaría huérfano ocupando espacio en Atlas. En su lugar,
// services/historias.js barre las vencidas cada pocos minutos y borra documento y archivo.
// Las consultas siempre filtran expiraEn > ahora, así que una vencida nunca se ve.
const TIPOS_HISTORIA = ["imagen", "video", "texto"];
const FONDOS_HISTORIA = ["kollecta", "atardecer", "oceano", "menta", "noche", "chicle"];
const DURACION_HISTORIA_HORAS = 24;
const MAX_TEXTO_HISTORIA = 200;

const vistaSchema = new mongoose.Schema(
    {
        usuario: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
        fecha: { type: Date, default: Date.now }
    },
    { _id: false }
);

const historiaSchema = new mongoose.Schema(
    {
        autor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Usuario",
            required: true
        },

        tipo: {
            type: String,
            enum: TIPOS_HISTORIA,
            required: true
        },

        // /api/imagenes/<id> o /api/videos/<id>; vacío en las de texto
        medio: {
            type: String,
            default: ""
        },

        // Texto de la historia (las de texto) o pie de foto/video
        texto: {
            type: String,
            default: "",
            trim: true,
            maxlength: MAX_TEXTO_HISTORIA
        },

        fondo: {
            type: String,
            enum: FONDOS_HISTORIA,
            default: "kollecta"
        },

        // Segundos (solo videos)
        duracion: {
            type: Number,
            default: 0,
            min: 0
        },

        vistas: {
            type: [vistaSchema],
            default: []
        },

        expiraEn: {
            type: Date,
            required: true
        }
    },
    {
        collection: "historias",
        timestamps: { createdAt: "fecha", updatedAt: false }
    }
);

historiaSchema.index({ expiraEn: 1 });
historiaSchema.index({ autor: 1, fecha: -1 });

module.exports = mongoose.model("Historia", historiaSchema);
module.exports.TIPOS_HISTORIA = TIPOS_HISTORIA;
module.exports.FONDOS_HISTORIA = FONDOS_HISTORIA;
module.exports.DURACION_HISTORIA_HORAS = DURACION_HISTORIA_HORAS;
module.exports.MAX_TEXTO_HISTORIA = MAX_TEXTO_HISTORIA;
