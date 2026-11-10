const mongoose = require("mongoose");

const solicitudAmistadSchema = new mongoose.Schema(
    {
        solicitante: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Usuario",
            required: true
        },

        destinatario: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Usuario",
            required: true
        },

        estado: {
            type: String,
            enum: ["pendiente", "aceptada", "rechazada", "finalizada"],
            default: "pendiente",
            required: true
        }
    },
    {
        collection: "solicitudes_amistad",
        timestamps: true
    }
);

// Impide que existan dos solicitudes iguales entre los mismos usuarios.
solicitudAmistadSchema.index(
    {
        solicitante: 1,
        destinatario: 1
    },
    {
        unique: true
    }
);

module.exports = mongoose.model(
    "SolicitudAmistad",
    solicitudAmistadSchema
);