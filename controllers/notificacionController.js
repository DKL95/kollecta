const mongoose = require("mongoose");
const Notificacion = require("../models/Notificacion");

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
        console.error("Error al obtener notificaciones:", error);

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

        return res.json({ notificacion });
    } catch (error) {
        console.error("Error al marcar notificación:", error);

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

        return res.json({
            mensaje: "Notificaciones marcadas como leídas"
        });
    } catch (error) {
        console.error("Error al marcar notificaciones:", error);

        return res.status(500).json({
            mensaje: "Error al actualizar las notificaciones"
        });
    }
}

// Crear una notificación desde otros controladores.
async function crearNotificacion({
    destinatario,
    emisor = null,
    tipo,
    mensaje,
    enlace = ""
}) {
    if (!destinatario) {
        throw new Error("El destinatario de la notificación es obligatorio");
    }

    // No notificar a un usuario sobre su propia actividad.
    if (
        emisor &&
        destinatario.toString() === emisor.toString()
    ) {
        return null;
    }

    const tiposPermitidos = [
        "like",
        "comentario",
        "seguidor",
        "sistema",
        "solicitud_amistad"
    ];

    if (!tiposPermitidos.includes(tipo)) {
        throw new Error("El tipo de notificación no es válido");
    }

    return Notificacion.create({
        destinatario,
        emisor,
        tipo,
        mensaje,
        enlace
    });
}

module.exports = {
    listarNotificaciones,
    marcarNotificacionLeida,
    marcarTodasLeidas,
    crearNotificacion
};