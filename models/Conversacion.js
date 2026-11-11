const mongoose = require("mongoose");

const MAX_PARTICIPANTES_GRUPO = 50;

const conversacionSchema = new mongoose.Schema(
    {
        // "directa": chat entre dos personas. "grupo": chat de varias personas.
        tipo: {
            type: String,
            enum: ["directa", "grupo"],
            default: "directa"
        },

        participantes: {
            type: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Usuario",
                    required: true
                }
            ],
            validate: {
                validator: function (participantes) {
                    const unicos = new Set(participantes.map(String));

                    if (unicos.size !== participantes.length) return false;

                    if (this.tipo === "grupo") {
                        return participantes.length >= 1 &&
                            participantes.length <= MAX_PARTICIPANTES_GRUPO;
                    }

                    return participantes.length === 2;
                },
                message: function () {
                    return this.tipo === "grupo"
                        ? `Un grupo puede tener hasta ${MAX_PARTICIPANTES_GRUPO} participantes sin repetir`
                        : "Una conversación debe tener dos participantes diferentes";
                }
            }
        },

        // Solo para grupos.
        nombre: {
            type: String,
            trim: true,
            maxlength: 60,
            default: ""
        },

        creador: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Usuario",
            default: null
        },

        administradores: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Usuario"
            }],
            default: []
        },

        ultimoMensaje: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Mensaje",
            default: null
        },

        fechaActividad: {
            type: Date,
            default: Date.now
        },

        ocultasPor: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Usuario"
            }],
            default: []
        },

        silenciadosPor: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Usuario"
            }],
            default: []
        }
    },
    {
        collection: "conversaciones",
        timestamps: true
    }
);

conversacionSchema.index({ participantes: 1 });

module.exports = mongoose.model("Conversacion", conversacionSchema);
module.exports.MAX_PARTICIPANTES_GRUPO = MAX_PARTICIPANTES_GRUPO;