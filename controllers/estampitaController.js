const Usuario = require("../models/Usuario");
const logger = require("../config/logger");
const { ESTAMPITAS } = require("../models/estampitas");
const { seriesCompletas } = require("../services/estampitas");

function resumen(album) {
    return {
        album: album.map(({ id, cantidad }) => ({ id, cantidad })),
        distintas: album.length,
        total: ESTAMPITAS.length,
        repetidas: album.reduce((suma, e) => suma + e.cantidad - 1, 0),
        seriesCompletas: seriesCompletas(album)
    };
}

// GET /api/estampitas  → mi álbum
async function miAlbum(req, res) {
    try {
        const usuario = await Usuario.findById(req.usuario.id).select("estampitas");
        if (!usuario) return res.status(401).json({ mensaje: "Tu sesión ya no es válida, inicia sesión de nuevo" });
        res.json(resumen(usuario.estampitas));
    } catch (error) {
        logger.error("Error al cargar el álbum:", error);
        res.status(500).json({ mensaje: "No se pudo cargar el álbum" });
    }
}

// GET /api/estampitas/:username  → álbum de otra persona (solo lectura)
async function albumDe(req, res) {
    try {
        const usuario = await Usuario.findOne({ username: String(req.params.username), activo: { $ne: false } }).select("username estampitas");
        if (!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado" });
        res.json({ username: usuario.username, ...resumen(usuario.estampitas) });
    } catch (error) {
        logger.error("Error al cargar el álbum:", error);
        res.status(500).json({ mensaje: "No se pudo cargar el álbum" });
    }
}

module.exports = { miAlbum, albumDe };
