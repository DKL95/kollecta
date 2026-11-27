const mongoose = require("mongoose");
const Marcador = require("../models/Marcador");
const logger = require("../config/logger");
const { registrarEvento } = require("../services/tareas");

// Puntaje máximo creíble de cada juego (el cálculo se hace en el navegador,
// así que el servidor solo descarta valores imposibles).
const LIMITES = {
    snake: 400,
    tiendita: 30000,
    memorama: 1000
};

const ESPERA_MINIMA_MS = 3000;

// POST /api/juegos/:juego/partidas  { puntos }
async function guardarPartida(req, res) {
    try {
        const { juego } = req.params;
        if (!Object.hasOwn(LIMITES, juego)) return res.status(404).json({ mensaje: "Ese juego no existe" });

        const puntos = req.body?.puntos;
        if (typeof puntos !== "number" || !Number.isInteger(puntos) || puntos < 0 || puntos > LIMITES[juego]) {
            return res.status(400).json({ mensaje: "El puntaje no es válido" });
        }

        const usuario = new mongoose.Types.ObjectId(String(req.usuario.id));
        const anterior = await Marcador.findOne({ usuario, juego }).lean();
        if (anterior?.ultimaPartida && Date.now() - new Date(anterior.ultimaPartida).getTime() < ESPERA_MINIMA_MS) {
            return res.status(429).json({ mensaje: "Espera un momento antes de guardar otra partida" });
        }

        const marcador = await Marcador.findOneAndUpdate(
            { usuario, juego },
            { $max: { mejor: puntos }, $inc: { partidas: 1 }, $set: { ultimaPartida: new Date() } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        await registrarEvento(req.usuario.id, "partida");
        if (juego === "memorama") await registrarEvento(req.usuario.id, "memorama");
        else await registrarEvento(req.usuario.id, `puntos_${juego}`, { valor: puntos });

        res.status(201).json({
            mensaje: "Partida guardada",
            puntos,
            mejor: marcador.mejor,
            nuevoRecord: puntos > 0 && puntos > (anterior?.mejor ?? 0),
            partidas: marcador.partidas
        });
    } catch (error) {
        logger.error("Error al guardar la partida:", error);
        res.status(500).json({ mensaje: "No se pudo guardar la partida" });
    }
}

// GET /api/juegos/:juego/ranking  → los 10 mejores y mi lugar
async function ranking(req, res) {
    try {
        const { juego } = req.params;
        if (!Object.hasOwn(LIMITES, juego)) return res.status(404).json({ mensaje: "Ese juego no existe" });

        const mejores = await Marcador.find({ juego, mejor: { $gt: 0 } })
            .sort({ mejor: -1, updatedAt: 1 })
            .limit(10)
            .populate("usuario", "username nombre fotoPerfil activo")
            .lean();

        const mio = await Marcador.findOne({ juego, usuario: req.usuario.id }).lean();
        const lugar = mio?.mejor > 0 ? (await Marcador.countDocuments({ juego, mejor: { $gt: mio.mejor } })) + 1 : null;

        res.json({
            ranking: mejores
                .filter((m) => m.usuario && m.usuario.activo !== false)
                .map((m) => ({
                    usuario: { id: m.usuario._id, username: m.usuario.username, nombre: m.usuario.nombre, fotoPerfil: m.usuario.fotoPerfil },
                    mejor: m.mejor
                })),
            mio: { mejor: mio?.mejor || 0, partidas: mio?.partidas || 0, lugar }
        });
    } catch (error) {
        logger.error("Error al cargar el ranking:", error);
        res.status(500).json({ mensaje: "No se pudo cargar el ranking" });
    }
}

module.exports = { guardarPartida, ranking, LIMITES };
