const mongoose = require("mongoose");

const notificacionSchema = new mongoose.Schema(
    {
        destinatario: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Usuario",
            required: true,
            index: true
        },
        emisor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Usuario",
            default: null
        },
        tipo: {
            type: String,
            enum: [
                "like",
                "comentario",
                "seguidor",
                "sistema",
                "solicitud_amistad",
                "mencion"
            ],
            required: true
        },
        mensaje: {
            type: String,
            required: true,
            trim: true
        },
        enlace: {
            type: String,
            default: ""
        },
        leida: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true, collection: "notificaciones" }
);

notificacionSchema.index({ destinatario: 1, createdAt: -1 });

module.exports = mongoose.model("Notificacion", notificacionSchema);