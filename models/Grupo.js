const mongoose = require("mongoose");

// Catálogo de grupos K-pop. Un usuario solicita uno (pendiente) y un moderador o
// administrador lo aprueba o rechaza; ellos pueden crearlo ya aprobado y editar cualquiera.
// Los grupos fijos de la app (data/gruposBase.js) también se guardan aquí.
const ESTADOS_GRUPO = ["pendiente", "aprobado", "rechazado"];

const grupoSchema = new mongoose.Schema(
    {
        nombre: { type: String, required: true, trim: true, maxlength: 40 },

        // Nombre en minúsculas y sin espacios repetidos, para no repetir grupos.
        clave: { type: String, required: true },

        fandom: { type: String, default: "", trim: true, maxlength: 40 },
        agencia: { type: String, default: "", trim: true, maxlength: 60 },
        integrantes: { type: Number, default: null, min: 1, max: 50 },
        debut: { type: Number, default: null, min: 1990, max: 2100 },
        descripcion: { type: String, default: "", trim: true, maxlength: 500 },
        imagen: { type: String, default: "" },
        // Imagen ancha de la página del grupo.
        portada: { type: String, default: "" },
        color: { type: String, default: "" },
        iniciales: { type: String, default: "", maxlength: 6 },

        // Grupos fijos de la app (data/gruposBase.js): se guardan aquí la primera vez que se
        // piden para poder editarlos. claveBase no cambia aunque se renombre; orden = su lugar.
        base: { type: Boolean, default: false },
        claveBase: { type: String, default: "" },
        orden: { type: Number, default: null },

        estado: { type: String, enum: ESTADOS_GRUPO, default: "pendiente" },
        // null en los grupos fijos (nadie los solicitó).
        solicitante: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", default: null },
        revisadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", default: null },
        fechaRevision: { type: Date, default: null },
        motivoRechazo: { type: String, default: "", maxlength: 300 }
    },
    {
        collection: "grupos",
        timestamps: { createdAt: "fechaCreacion", updatedAt: "fechaActualizacion" }
    }
);

// Un nombre solo puede estar una vez pendiente o aprobado; los rechazados se pueden
// volver a pedir, por eso no es índice único (lo revisa controllers/grupoController.js).
grupoSchema.index({ clave: 1, estado: 1 });
grupoSchema.index({ estado: 1, fechaCreacion: -1 });
grupoSchema.index({ solicitante: 1, fechaCreacion: -1 });
grupoSchema.index({ claveBase: 1 });

module.exports = mongoose.model("Grupo", grupoSchema);
module.exports.ESTADOS_GRUPO = ESTADOS_GRUPO;
