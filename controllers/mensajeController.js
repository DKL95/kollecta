
const mongoose = require("mongoose");
const Conversacion = require("../models/Conversacion");
const Mensaje = require("../models/Mensaje");
const Usuario = require("../models/Usuario");

// Obtener las conversaciones del usuario autenticado
async function obtenerConversaciones(req, res) {
    try {
        const usuarioId = req.usuario.id;

        const conversaciones = await Conversacion.find({
            participantes: usuarioId,
            ocultasPor: { $ne: usuarioId }
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

        // Si el usuario había eliminado el chat de su lista,
        // volver a mostrarlo cuando lo abra.
        conversacion.ocultasPor = (
            conversacion.ocultasPor || []
        ).filter(
            (id) => String(id) !== String(usuarioId)
        );

        await conversacion.save();

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

// Silenciar o activar las notificaciones de una conversación
async function alternarSilencioConversacion(req, res) {
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

        const silenciadosPor = conversacion.silenciadosPor || [];

        const yaSilenciada = silenciadosPor.some(
            (id) => String(id) === String(usuarioId)
        );

        if (yaSilenciada) {
            conversacion.silenciadosPor.pull(usuarioId);
        } else {
            conversacion.silenciadosPor.addToSet(usuarioId);
        }

        await conversacion.save();

        res.json({
            silenciada: !yaSilenciada,
            mensaje: yaSilenciada
                ? "Notificaciones activadas"
                : "Conversación silenciada"
        });

    } catch (error) {
        console.error("Error al cambiar silencio:", error);

        res.status(500).json({
            mensaje: "No se pudo cambiar el silencio"
        });
    }
}

// Eliminar una conversación solamente de la lista del usuario actual
async function eliminarConversacion(req, res) {
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

        conversacion.ocultasPor.addToSet(usuarioId);

        await conversacion.save();

        res.json({
            mensaje: "Conversación eliminada de tu lista"
        });

    } catch (error) {
        console.error("Error al eliminar conversación:", error);

        res.status(500).json({
            mensaje: "No se pudo eliminar la conversación"
        });
    }
}

// Obtener los mensajes de una conversación y marcar los recibidos como leídos.
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

        const io = req.app.get("io");

        // Marcar como leídos los mensajes recibidos que aún no se han leído.
        const mensajesActualizados = await Mensaje.find({
            conversacion: conversacionId,
            remitente: { $ne: usuarioId },
            leido: false
        }).select("_id remitente");

        const idsActualizados = mensajesActualizados.map(
            (mensaje) => mensaje._id
        );

        if (idsActualizados.length > 0) {
            const fechaLectura = new Date();

            await Mensaje.updateMany(
                { _id: { $in: idsActualizados } },
                {
                    $set: {
                        leido: true,
                        leidoEn: fechaLectura,
                        entregado: true,
                        entregadoEn: fechaLectura
                    }
                }
            );

            // Avisar a cada remitente de que sus mensajes fueron leídos.
            if (io) {
                for (const mensaje of mensajesActualizados) {
                    io.to(`usuario:${mensaje.remitente}`).emit(
                        "mensaje:estado",
                        {
                            _id: mensaje._id,
                            conversacion: conversacionId,
                            entregado: true,
                            entregadoEn: fechaLectura,
                            leido: true,
                            leidoEn: fechaLectura
                        }
                    );
                }
            }
        }

        const mensajes = await Mensaje.find({
            conversacion: conversacionId
        })
            .populate("remitente", "nombre username fotoPerfil")
            .sort({ createdAt: 1 });

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

        const conversaciones = await Conversacion.find({
            participantes: usuarioId,
            ocultasPor: { $ne: usuarioId }
        }).distinct("_id");

        const total = await Mensaje.countDocuments({
            remitente: { $ne: usuarioId },
            leido: false,
            conversacion: {
                $in: conversaciones
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

        // Si el usuario vuelve a enviar un mensaje,
        // el chat deja de estar oculto para él.
        conversacion.ocultasPor = (
            conversacion.ocultasPor || []
        ).filter(
            (id) => String(id) !== String(usuarioId)
        );

        const mensaje = await Mensaje.create({
            conversacion: conversacionId,
            remitente: usuarioId,
            texto,
            entregado: false,
            entregadoEn: null,
            leido: false,
            leidoEn: null
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
            console.log(
                "📨 Emitiendo mensaje a la conversación:",
                String(conversacionId)
            );

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

// Notificar al remitente cuando cambia el estado de un mensaje.
function notificarEstadoMensaje(io, mensaje) {
    if (!io || !mensaje) return;

    io.to(`usuario:${mensaje.remitente}`).emit(
        "mensaje:estado",
        {
            _id: mensaje._id,
            conversacion: mensaje.conversacion,
            entregado: mensaje.entregado,
            entregadoEn: mensaje.entregadoEn,
            leido: mensaje.leido,
            leidoEn: mensaje.leidoEn
        }
    );
}

module.exports = {
    obtenerConversaciones,
    obtenerOCrearConversacion,
    obtenerMensajes,
    enviarMensaje,
    obtenerMensajesNoLeidos,
    alternarSilencioConversacion,
    eliminarConversacion
};
