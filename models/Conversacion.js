const mongoose = require("mongoose");

const conversacionSchema = new mongoose.Schema(
    {
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
                    return participantes.length === 2 &&
                        !participantes[0].equals(participantes[1]);
                },
                message: "Una conversación debe tener dos participantes diferentes"
            }
        },

        ultimoMensaje: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Mensaje",
            default: null
        },

        fechaActividad: {
            type: Date,
            default: Date.now
        }
    },
    {
        collection: "conversaciones",
        timestamps: true
    }
);

conversacionSchema.index({ participantes: 1 });

module.exports = mongoose.model("Conversacion", conversacionSchema);