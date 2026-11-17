const mongoose = require("mongoose");
const { campoGif } = require("./gif");

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

        gif: campoGif,

        // Mensaje de la misma conversación al que responde (null si no responde a ninguno)
        respondeA: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Mensaje",
            default: null
        },

        // Fecha de la última edición del texto (null si nunca se editó)
        editadoEn: {
            type: Date,
            default: null
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
        },

        // En grupos, quién ya leyó el mensaje. "leido" se vuelve true
        // cuando todos los demás participantes lo leyeron.
        leidoPor: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Usuario"
            }],
            default: []
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