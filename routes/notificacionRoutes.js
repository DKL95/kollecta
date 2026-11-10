
const express = require("express");
const Notificacion = require("../models/Notificacion");
const { requiereAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requiereAuth);

// Obtener las notificaciones del usuario
router.get("/", async (req, res) => {
    try {
        const notificaciones = await Notificacion.find({
            destinatario: req.usuario.id
        })
            .populate("emisor", "username nombre fotoPerfil")
            .sort({ createdAt: -1 })
            .limit(50);

        const noLeidas = await Notificacion.countDocuments({
            destinatario: req.usuario.id,
            leida: false
        });

        res.json({ notificaciones, noLeidas });
    } catch (error) {
        console.error("Error al obtener notificaciones:", error);
        res.status(500).json({
            mensaje: "Error al obtener las notificaciones"
        });
    }
});

// Marcar una notificación como leída
router.patch("/:id/leida", async (req, res) => {
    try {
        const notificacion = await Notificacion.findOneAndUpdate(
            {
                _id: req.params.id,
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

        res.json({ notificacion });
    } catch (error) {
        console.error("Error al marcar notificación:", error);
        res.status(500).json({
            mensaje: "Error al actualizar la notificación"
        });
    }
});

// Marcar todas como leídas
router.patch("/leidas/todas", async (req, res) => {
    try {
        await Notificacion.updateMany(
            { destinatario: req.usuario.id, leida: false },
            { leida: true }
        );

        res.json({ mensaje: "Notificaciones marcadas como leídas" });
    } catch (error) {
        console.error("Error al marcar notificaciones:", error);
        res.status(500).json({
            mensaje: "Error al actualizar las notificaciones"
        });
    }
});

module.exports = router;
