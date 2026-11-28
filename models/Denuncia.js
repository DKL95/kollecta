const mongoose = require("mongoose");

// Denuncia que hace cualquier persona sobre contenido o una cuenta.
// La revisa la moderación desde /moderacion. (Se llama "denuncia" para no
// confundirla con la sección "Reportes" de métricas.)
const TIPOS_DENUNCIA = ["publicacion", "comentario", "usuario", "producto", "mensaje", "klip"];
const MOTIVOS_DENUNCIA = ["spam", "acoso", "falsificacion", "estafa", "contenido_inapropiado", "otro"];
const ESTADOS_DENUNCIA = ["abierta", "en_revision", "resuelta", "descartada"];
const ACCIONES_RESOLUCION = ["ninguna", "ocultar", "suspender", "banear"];

const denunciaSchema = new mongoose.Schema(
    {
        reportante: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
        tipo: { type: String, enum: TIPOS_DENUNCIA, required: true },
        objetivo: { type: mongoose.Schema.Types.ObjectId, required: true },

        // Dueño del contenido denunciado (o la propia cuenta si tipo = usuario).
        usuarioDenunciado: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },

        // Copia corta del contenido al momento de denunciar, por si lo editan o borran.
        resumen: { type: String, default: "", maxlength: 300 },

        motivo: { type: String, enum: MOTIVOS_DENUNCIA, required: true },
        detalle: { type: String, default: "", maxlength: 500, trim: true },

        estado: { type: String, enum: ESTADOS_DENUNCIA, default: "abierta" },
        moderador: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", default: null },

        resolucion: {
            accion: { type: String, enum: ACCIONES_RESOLUCION, default: null },
            nota: { type: String, default: "", maxlength: 500, trim: true },
            fecha: { type: Date, default: null }
        }
    },
    {
        collection: "denuncias",
        timestamps: true
    }
);

// Una persona no puede denunciar dos veces lo mismo.
denunciaSchema.index({ reportante: 1, tipo: 1, objetivo: 1 }, { unique: true });
denunciaSchema.index({ estado: 1, createdAt: -1 });
denunciaSchema.index({ usuarioDenunciado: 1 });

module.exports = mongoose.model("Denuncia", denunciaSchema);
module.exports.TIPOS_DENUNCIA = TIPOS_DENUNCIA;
module.exports.MOTIVOS_DENUNCIA = MOTIVOS_DENUNCIA;
module.exports.ESTADOS_DENUNCIA = ESTADOS_DENUNCIA;
module.exports.ACCIONES_RESOLUCION = ACCIONES_RESOLUCION;
