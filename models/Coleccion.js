const mongoose = require("mongoose");

const articuloColeccionSchema = new mongoose.Schema(
    {
        titulo: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150
        },

        grupo: {
            type: String,
            required: true,
            trim: true
        },

        categoria: {
            type: String,
            required: true,
            enum: [
                "Photocard",
                "Álbum",
                "Lightstick",
                "Merch",
                "Poster",
                "Otro"
            ]
        },

        imagenes: {
            type: [String],
            default: []
        },

        descripcion: {
            type: String,
            default: "",
            maxlength: 2000,
            trim: true
        },

        valorEstimado: {
            type: Number,
            default: 0,
            min: 0
        },

        estado: {
            type: String,
            enum: [
                "Nuevo / sellado",
                "Como nuevo",
                "Buen estado",
                "Con detalles"
            ],
            default: "Buen estado"
        },

        disponibleIntercambio: {
            type: Boolean,
            default: false
        },

        disponibleCompra: {
            type: Boolean,
            default: false
        }
    },
    {
        _id: true
    }
);

const coleccionSchema = new mongoose.Schema(
    {
        usuario: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Usuario",
            required: true
        },

        articulos: {
            type: [articuloColeccionSchema],
            default: []
        }
    },
    {
        collection: "colecciones",
        timestamps: true
    }
);

// Cada usuario tendrá un único documento de colección personal.
coleccionSchema.index(
    { usuario: 1 },
    { unique: true }
);

module.exports = mongoose.model("Coleccion", coleccionSchema);