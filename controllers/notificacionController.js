const mongoose = require("mongoose");
const Notificacion = require("../models/Notificacion");
const logger = require("../config/logger");

// Mantiene sincronizado el contador en todas las pestañas/dispositivos conectados.
async function emitirContadorNotificaciones(io, destinatario) {
    if (!io || !destinatario) return;

    const noLeidas = await Notificacion.countDocuments({
        destinatario,
        leida: false
    });

    io.to(`usuario:${destinatario}`).emit(
        "notificaciones:contador-actualizar",
        { noLeidas }
    );
}

// Obtener las notificaciones del usuario autenticado.
async function listarNotificaciones(req, res) {
    try {
        const destinatario = req.usuario.id;

        const notificaciones = await Notificacion.find({ destinatario })
            .populate("emisor", "username nombre fotoPerfil")
            .sort({ createdAt: -1 })
            .limit(50);

        const noLeidas = await Notificacion.countDocuments({
            destinatario,
            leida: false
        });

        return res.json({ notificaciones, noLeidas });
    } catch (error) {
        logger.error("Error al obtener notificaciones:", error);

        return res.status(500).json({
            mensaje: "Error al obtener las notificaciones"
        });
    }
}

// Marcar una notificación como leída.
async function marcarNotificacionLeida(req, res) {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                mensaje: "El ID de la notificación no es válido"
            });
        }

        const notificacion = await Notificacion.findOneAndUpdate(
            {
                _id: id,
                destinatario: req.usuario.id
            },
            { leida: true },
            { new: true, runValidators: true }
        );

        if (!notificacion) {
            return res.status(404).json({
                mensaje: "Notificación no encontrada"
            });
        }

        const io = req.app.get("io");
        if (io) {
            io.to(`usuario:${req.usuario.id}`).emit("notificacion:actualizada", {
                notificacion
            });
        }
        await emitirContadorNotificaciones(io, req.usuario.id);

        return res.json({ notificacion });
    } catch (error) {
        logger.error("Error al marcar notificación:", error);

        return res.status(500).json({
            mensaje: "Error al actualizar la notificación"
        });
    }
}

// Marcar todas las notificaciones del usuario como leídas.
async function marcarTodasLeidas(req, res) {
    try {
        await Notificacion.updateMany(
            {
                destinatario: req.usuario.id,
                leida: false
            },
            { leida: true }
        );

        const io = req.app.get("io");
        if (io) {
            io.to(`usuario:${req.usuario.id}`).emit("notificaciones:leidas-todas");
        }
        await emitirContadorNotificaciones(io, req.usuario.id);

        return res.json({
            mensaje: "Notificaciones marcadas como leídas"
        });
    } catch (error) {
        logger.error("Error al marcar notificaciones:", error);

        return res.status(500).json({
            mensaje: "Error al actualizar las notificaciones"
        });
    }
}

// Borrar una notificación propia.
async function eliminarNotificacion(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ mensaje: "El ID de la notificación no es válido" });
        }

        const notificacion = await Notificacion.findOneAndDelete({
            _id: req.params.id,
            destinatario: req.usuario.id
        });

        if (!notificacion) {
            return res.status(404).json({ mensaje: "Notificación no encontrada" });
        }

        const io = req.app.get("io");
        if (io) {
            io.to(`usuario:${req.usuario.id}`).emit("notificacion:eliminada", {
                id: String(notificacion._id)
            });
        }
        await emitirContadorNotificaciones(io, req.usuario.id);

        return res.json({ mensaje: "Notificación eliminada" });
    } catch (error) {
        logger.error("Error al borrar notificación:", error);
        return res.status(500).json({ mensaje: "Error al borrar la notificación" });
    }
}

// Crear y persistir una notificación; después emitirla al usuario conectado.
async function crearNotificacion({
    destinatario,
    emisor = null,
    tipo,
    mensaje,
    enlace = "",
    io = null
}) {
    if (!destinatario) {
        throw new Error("El destinatario de la notificación es obligatorio");
    }

    if (emisor && destinatario.toString() === emisor.toString()) {
        return null;
    }

    const tiposPermitidos = [
        "like",
        "comentario",
        "seguidor",
        "sistema",
        "solicitud_amistad",
        "mencion",
        "orden",
        "moderacion"
    ];

    if (!tiposPermitidos.includes(tipo)) {
        throw new Error("El tipo de notificación no es válido");
    }

    const notificacion = await Notificacion.create({
        destinatario,
        emisor,
        tipo,
        mensaje,
        enlace
    });

    await notificacion.populate("emisor", "username nombre fotoPerfil");

    if (io) {
        const noLeidas = await Notificacion.countDocuments({
            destinatario,
            leida: false
        });

        io.to(`usuario:${destinatario}`).emit("notificacion:nueva", {
            notificacion,
            noLeidas
        });
    }

    return notificacion;
}

module.exports = {
    listarNotificaciones,
    marcarNotificacionLeida,
    marcarTodasLeidas,
    eliminarNotificacion,
    crearNotificacion,
    emitirContadorNotificaciones
};