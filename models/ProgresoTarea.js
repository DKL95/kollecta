const mongoose = require("mongoose");

// Avance de una persona en una tarea durante un periodo.
// periodo: "2026-11-26" (diaria), "2026-S48" (semanal) o "siempre" (logro).
// Las diarias y semanales se borran solas un mes después (índice TTL en expiraEn),
// así la colección no crece sin límite.
const progresoTareaSchema = new mongoose.Schema(
    {
        usuario: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Usuario",
            required: true
        },

        // id de la tarea en services/tareas.js
        tarea: {
            type: String,
            required: true,
            maxlength: 40
        },

        periodo: {
            type: String,
            required: true,
            maxlength: 20
        },

        progreso: {
            type: Number,
            default: 0,
            min: 0
        },

        reclamada: {
            type: Boolean,
            default: false
        },

        reclamadaEn: {
            type: Date,
            default: null
        },

        // null en los logros (no caducan)
        expiraEn: {
            type: Date,
            default: null
        }
    },
    {
        collection: "progreso_tareas",
        timestamps: true
    }
);

progresoTareaSchema.index({ usuario: 1, tarea: 1, periodo: 1 }, { unique: true });
progresoTareaSchema.index({ expiraEn: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("ProgresoTarea", progresoTareaSchema);
