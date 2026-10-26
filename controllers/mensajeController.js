const mongoose = require("mongoose");
const Conversacion = require("../models/Conversacion");
const Mensaje = require("../models/Mensaje");
const Usuario = require("../models/Usuario");

// Obtener las conversaciones del usuario autenticado
async function obtenerConversaciones(req, res) {
    try {
        const usuarioId = req.usuario.id;

        const conversaciones = await Conversacion.find({
            participantes: usuarioId
        })
            .populate("participantes", "nombre username fotoPerfil")
            .populate({
                path: "ultimoMensaje",
                populate: {
                    path: "remitente",
                    select: "nombre username"
                }
            })
            .sort({ fechaActividad: -1 });

        res.json(conversaciones);
    } catch (error) {
        console.error("Error al obtener conversaciones:", error);
        res.status(500).json({
            mensaje: "Error al obtener las conversaciones"
        });
    }
}

// Abrir o crear una conversación con otro usuario
async function obtenerOCrearConversacion(req, res) {
    try {
        const usuarioId = req.usuario.id;
        const otroUsuarioId = req.params.usuarioId;

        if (!mongoose.isValidObjectId(otroUsuarioId)) {
            return res.status(400).json({
                mensaje: "El identificador del usuario no es válido"
            });
        }

        if (String(usuarioId) === String(otroUsuarioId)) {
            return res.status(400).json({
                mensaje: "No puedes iniciar una conversación contigo mismo"
            });
        }

        const otroUsuario = await Usuario.findById(otroUsuarioId);

        if (!otroUsuario || otroUsuario.activo === false) {
            return res.status(404).json({
                mensaje: "Usuario no encontrado"
            });
        }

        let conversacion = await Conversacion.findOne({
            participantes: {
                $all: [usuarioId, otroUsuarioId]
            },
            $expr: {
                $eq: [{ $size: "$participantes" }, 2]
            }
        });

        if (!conversacion) {
            conversacion = await Conversacion.create({
                participantes: [usuarioId, otroUsuarioId]
            });
        }

        await conversacion.populate(
            "participantes",
            "nombre username fotoPerfil"
        );

        res.json(conversacion);
    } catch (error) {
        console.error("Error al abrir conversación:", error);
        res.status(500).json({
            mensaje: "Error al abrir la conversación"
        });
    }
}

// Obtener los mensajes de una conversación
async function obtenerMensajes(req, res) {
    try {
        const { conversacionId } = req.params;
        const usuarioId = req.usuario.id;

        if (!mongoose.isValidObjectId(conversacionId)) {
            return res.status(400).json({
                mensaje: "El identificador de la conversación no es válido"
            });
        }

        const conversacion = await Conversacion.findOne({
            _id: conversacionId,
            participantes: usuarioId
        });

        if (!conversacion) {
            return res.status(404).json({
                mensaje: "Conversación no encontrada"
            });
        }

        const mensajes = await Mensaje.find({
            conversacion: conversacionId
        })
            .populate("remitente", "nombre username fotoPerfil")
            .sort({ createdAt: 1 });

        // Marcar como leídos los mensajes de la otra persona
        await Mensaje.updateMany(
            {
                conversacion: conversacionId,
                remitente: { $ne: usuarioId },
                leido: false
            },
            {
                $set: { leido: true }
            }
        );

        res.json(mensajes);
    } catch (error) {
        console.error("Error al obtener mensajes:", error);
        res.status(500).json({
            mensaje: "Error al obtener los mensajes"
        });
    }
}

// Obtener la cantidad de mensajes sin leer del usuario autenticado
async function obtenerMensajesNoLeidos(req, res) {
    try {
        const usuarioId = req.usuario.id;

        const total = await Mensaje.countDocuments({
            remitente: { $ne: usuarioId },
            leido: false,
            conversacion: {
                $in: await Conversacion.find({
                    participantes: usuarioId
                }).distinct("_id")
            }
        });

        res.json({ noLeidos: total });
    } catch (error) {
        console.error("Error al contar mensajes sin leer:", error);

        res.status(500).json({
            mensaje: "Error al obtener los mensajes sin leer"
        });
    }
}

// Enviar un mensaje de texto
async function enviarMensaje(req, res) {
    try {
        const { conversacionId } = req.params;
        const usuarioId = req.usuario.id;
        const texto = typeof req.body.texto === "string"
            ? req.body.texto.trim()
            : "";

        if (!mongoose.isValidObjectId(conversacionId)) {
            return res.status(400).json({
                mensaje: "El identificador de la conversación no es válido"
            });
        }

        if (!texto) {
            return res.status(400).json({
                mensaje: "Escribe un mensaje antes de enviarlo"
            });
        }

        if (texto.length > 5000) {
            return res.status(400).json({
                mensaje: "El mensaje no puede superar los 5000 caracteres"
            });
        }

        const conversacion = await Conversacion.findOne({
            _id: conversacionId,
            participantes: usuarioId
        });

        if (!conversacion) {
            return res.status(404).json({
                mensaje: "Conversación no encontrada"
            });
        }

        const mensaje = await Mensaje.create({
            conversacion: conversacionId,
            remitente: usuarioId,
            texto
        });

        conversacion.ultimoMensaje = mensaje._id;
        conversacion.fechaActividad = new Date();

        await conversacion.save();

        await mensaje.populate(
            "remitente",
            "nombre username fotoPerfil"
        );

        // Notificar a los participantes mediante Socket.IO.
        const io = req.app.get("io");

        if (io) {
            // Actualizar el chat de quienes estén dentro de la conversación.
            io.to(`conversacion:${conversacionId}`).emit(
                "mensaje:nuevo",
                mensaje
            );

            // Avisar al destinatario para que actualice su contador.
            for (const participanteId of conversacion.participantes) {
                if (String(participanteId) !== String(usuarioId)) {
                    io.to(`usuario:${participanteId}`).emit(
                        "mensajes:contador-actualizar"
                    );
                }
            }
        }

        res.status(201).json(mensaje);
    } catch (error) {
        console.error("Error al enviar mensaje:", error);
        res.status(500).json({
            mensaje: "Error al enviar el mensaje"
        });
    }
}

module.exports = {
    obtenerConversaciones,
    obtenerOCrearConversacion,
    obtenerMensajes,
    enviarMensaje,
    obtenerMensajesNoLeidos
};