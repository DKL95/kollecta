const mongoose = require("mongoose");

// Las imágenes subidas se guardan en la base de datos (y no en el disco del servidor)
// para que todo el equipo las vea y sigan existiendo al subir la app a un hosting.
const imagenSchema = new mongoose.Schema(
    {
        datos: {
            type: Buffer,
            required: true
        },

        tipo: {
            type: String,
            required: true
        },

        tamano: {
            type: Number,
            required: true
        },

        subidaPor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Usuario",
            default: null
        }
    },
    {
        collection: "imagenes",
        timestamps: { createdAt: "fechaSubida", updatedAt: false }
    }
);

module.exports = mongoose.model("Imagen", imagenSchema);
