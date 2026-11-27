const mongoose = require("mongoose");

const JUEGOS = ["snake", "tiendita", "memorama"];

// Mejor puntaje de una persona en un minijuego (un documento por persona y juego).
// Con esto se arma el ranking sin guardar cada partida.
const marcadorSchema = new mongoose.Schema(
    {
        usuario: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Usuario",
            required: true
        },

        juego: {
            type: String,
            enum: JUEGOS,
            required: true
        },

        mejor: {
            type: Number,
            default: 0,
            min: 0
        },

        partidas: {
            type: Number,
            default: 0,
            min: 0
        },

        ultimaPartida: {
            type: Date,
            default: null
        }
    },
    {
        collection: "marcadores",
        timestamps: true
    }
);

marcadorSchema.index({ usuario: 1, juego: 1 }, { unique: true });
marcadorSchema.index({ juego: 1, mejor: -1 });

module.exports = mongoose.model("Marcador", marcadorSchema);
module.exports.JUEGOS = JUEGOS;
