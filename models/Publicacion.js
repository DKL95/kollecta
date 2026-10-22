const mongoose = require("mongoose");

const comentarioSchema = new mongoose.Schema(
    {
        autor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Usuario",
            required: true
        },

        texto: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500
        }
    },
    {
        timestamps: { createdAt: "fecha", updatedAt: false }
    }
);

const publicacionSchema = new mongoose.Schema(
    {
        autor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Usuario",
            required: true
        },

        texto: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1000
        },

        grupo: {
            type: String,
            default: ""
        },

        imagen: {
            type: String,
            default: ""
        },

        likes: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: "Usuario",
            default: []
        },

        comentarios: {
            type: [comentarioSchema],
            default: []
        }
    },
    {
        collection: "publicaciones",
        timestamps: { createdAt: "fechaCreacion", updatedAt: "fechaActualizacion" }
    }
);

module.exports = mongoose.model("Publicacion", publicacionSchema);
