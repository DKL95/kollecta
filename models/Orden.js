const mongoose = require("mongoose");

// Estados de una orden y quién puede mover cada transición.
// pendiente → aceptada → enviada → recibida → completada
//          ↘ rechazada   (vendedor)
//          ↘ cancelada   (comprador mientras siga pendiente, o cualquiera de los dos antes de enviarse)
const ESTADOS_ORDEN = [
    "pendiente",
    "aceptada",
    "enviada",
    "recibida",
    "completada",
    "rechazada",
    "cancelada"
];

const ESTADOS_ACTIVOS = ["pendiente", "aceptada", "enviada", "recibida"];

// Copia del artículo al momento de crear la orden, por si después lo editan o lo borran.
const articuloOrdenSchema = new mongoose.Schema(
    {
        articuloId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        titulo: { type: String, required: true },
        grupo: { type: String, default: "" },
        categoria: { type: String, default: "" },
        imagen: { type: String, default: "" }
    },
    { _id: false }
);

const historialSchema = new mongoose.Schema(
    {
        estado: { type: String, enum: ESTADOS_ORDEN, required: true },
        fecha: { type: Date, default: Date.now },
        por: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Usuario",
            default: null
        },
        nota: { type: String, default: "", maxlength: 300 }
    },
    { _id: false }
);

const ordenSchema = new mongoose.Schema(
    {
        comprador: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Usuario",
            required: true
        },

        vendedor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Usuario",
            required: true
        },

        articulo: {
            type: articuloOrdenSchema,
            required: true
        },

        tipo: {
            type: String,
            enum: ["compra", "intercambio"],
            required: true
        },

        // Solo en compras. Precio en MXN acordado al crear la orden.
        precio: {
            type: Number,
            min: 0,
            default: 0
        },

        // Solo en intercambios: artículos de la colección del comprador que ofrece a cambio.
        ofrecidos: {
            type: [articuloOrdenSchema],
            default: []
        },

        entrega: {
            type: String,
            enum: ["envio", "en_persona"],
            default: "en_persona"
        },

        nota: {
            type: String,
            default: "",
            maxlength: 500,
            trim: true
        },

        estado: {
            type: String,
            enum: ESTADOS_ORDEN,
            default: "pendiente"
        },

        historial: {
            type: [historialSchema],
            default: []
        },

        conversacion: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Conversacion",
            default: null
        },

        calificacion: {
            estrellas: { type: Number, min: 1, max: 5, default: null },
            comentario: { type: String, default: "", maxlength: 500, trim: true },
            fecha: { type: Date, default: null }
        }
    },
    {
        collection: "ordenes",
        timestamps: true
    }
);

ordenSchema.index({ comprador: 1, createdAt: -1 });
ordenSchema.index({ vendedor: 1, createdAt: -1 });
ordenSchema.index({ "articulo.articuloId": 1, estado: 1 });

module.exports = mongoose.model("Orden", ordenSchema);
module.exports.ESTADOS_ORDEN = ESTADOS_ORDEN;
module.exports.ESTADOS_ACTIVOS = ESTADOS_ACTIVOS;
