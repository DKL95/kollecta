const mongoose = require("mongoose");

// Anuncio del marketplace. Es independiente de la colección: la colección es la
// vitrina personal y los productos son lo que alguien pone a la venta o para
// intercambio. Al crear un producto "desde la colección" solo se copian los datos.
const CATEGORIAS = ["Photocard", "Álbum", "Lightstick", "Merch", "Poster", "Otro"];
const CONDICIONES = ["Nuevo / sellado", "Como nuevo", "Buen estado", "Con detalles"];

// activo → reservado (orden aceptada) → vendido
//        ↘ retirado (el vendedor lo quita)
const ESTADOS_PRODUCTO = ["activo", "reservado", "vendido", "retirado"];

const productoSchema = new mongoose.Schema(
    {
        vendedor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Usuario",
            required: true
        },

        titulo: { type: String, required: true, trim: true, maxlength: 150 },
        grupo: { type: String, required: true, trim: true },
        categoria: { type: String, required: true, enum: CATEGORIAS },
        imagenes: { type: [String], default: [] },
        descripcion: { type: String, default: "", maxlength: 2000, trim: true },
        condicion: { type: String, enum: CONDICIONES, default: "Buen estado" },

        disponibleCompra: { type: Boolean, default: true },
        disponibleIntercambio: { type: Boolean, default: false },

        // Precio en MXN. Obligatorio (> 0) si está disponible para compra.
        precio: { type: Number, min: 0, default: 0 },

        // Qué busca a cambio (solo informativo, para intercambios).
        busca: { type: String, default: "", maxlength: 200, trim: true },

        // Pieza de la colección de la que se copiaron los datos (si aplica).
        articuloOrigen: { type: mongoose.Schema.Types.ObjectId, default: null },

        estado: { type: String, enum: ESTADOS_PRODUCTO, default: "activo" },

        // Orden aceptada que tiene apartado el producto.
        reservadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "Orden", default: null }
    },
    {
        collection: "productos",
        timestamps: true
    }
);

productoSchema.index({ estado: 1, createdAt: -1 });
productoSchema.index({ vendedor: 1, createdAt: -1 });
productoSchema.index({ grupo: 1, estado: 1 });

module.exports = mongoose.model("Producto", productoSchema);
module.exports.CATEGORIAS = CATEGORIAS;
module.exports.CONDICIONES = CONDICIONES;
module.exports.ESTADOS_PRODUCTO = ESTADOS_PRODUCTO;
