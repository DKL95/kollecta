const mongoose = require("mongoose");

const mensajeSchema = new mongoose.Schema(
    {
        conversacion: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Conversacion",
            required: true
        },

        remitente: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Usuario",
            required: true
        },

        texto: {
            type: String,
            default: "",
            maxlength: 5000,
            trim: true
        },

        imagenes: {
            type: [String],
            default: []
        },

        // Estado de entrega
        entregado: {
            type: Boolean,
            default: false
        },

        entregadoEn: {
            type: Date,
            default: null
        },

        // Estado de lectura
        leido: {
            type: Boolean,
            default: false
        },

        leidoEn: {
            type: Date,
            default: null
        }
    },
    {
        collection: "mensajes",
        timestamps: true
    }
);

mensajeSchema.index({
    conversacion: 1,
    createdAt: 1
});

module.exports = mongoose.model("Mensaje", mensajeSchema);