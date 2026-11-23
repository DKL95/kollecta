const mongoose = require("mongoose");

// Bitácora de moderación: quién hizo qué, sobre qué, cuándo y por qué.
// Los moderadores ven sus propias acciones; los administradores, todas.
const ACCIONES_MODERACION = [
    "ocultar",
    "mostrar",
    "suspender",
    "levantar_suspension",
    "banear",
    "reactivar",
    "cambiar_rol",
    "resolver_denuncia",
    "descartar_denuncia",
    "resolver_disputa",
    "crear_grupo",
    "aprobar_grupo",
    "rechazar_grupo",
    "editar_grupo"
];

const moderacionSchema = new mongoose.Schema(
    {
        moderador: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
        accion: { type: String, enum: ACCIONES_MODERACION, required: true },

        // Sobre qué se actuó: publicacion, comentario, producto, usuario, denuncia, orden o grupo.
        tipoObjetivo: { type: String, required: true },
        objetivo: { type: mongoose.Schema.Types.ObjectId, required: true },

        // Persona afectada (autor del contenido o la cuenta sancionada).
        usuarioAfectado: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", default: null },

        motivo: { type: String, default: "", maxlength: 500 },
        detalle: { type: mongoose.Schema.Types.Mixed, default: null },
        denuncia: { type: mongoose.Schema.Types.ObjectId, ref: "Denuncia", default: null }
    },
    {
        collection: "moderaciones",
        timestamps: { createdAt: "fecha", updatedAt: false }
    }
);

moderacionSchema.index({ moderador: 1, fecha: -1 });
moderacionSchema.index({ fecha: -1 });

module.exports = mongoose.model("Moderacion", moderacionSchema);
module.exports.ACCIONES_MODERACION = ACCIONES_MODERACION;
