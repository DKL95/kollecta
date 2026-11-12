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

        // OBSOLETOS: disponibleIntercambio, disponibleCompra y precio quedaron de cuando
        // el marketplace leía la colección. Ahora la venta vive en el modelo Producto;
        // se conservan para no romper documentos viejos, pero ya no se leen ni se escriben.
        disponibleIntercambio: {
            type: Boolean,
            default: false
        },

        disponibleCompra: {
            type: Boolean,
            default: false
        },

        // Precio de venta en el marketplace (MXN). Si es null se usa valorEstimado,
        // así los artículos que ya existían siguen teniendo precio.
        precio: {
            type: Number,
            min: 0,
            default: null
        },

        // Orden aceptada en la que esta pieza se ofreció a cambio (intercambio).
        // Mientras exista, no se puede ofrecer en otro intercambio ni borrar.
        reservadoPor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Orden",
            default: null
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

// Para abrir un artículo por su id sin saber de quién es.
coleccionSchema.index({ "articulos._id": 1 });

module.exports = mongoose.model("Coleccion", coleccionSchema);