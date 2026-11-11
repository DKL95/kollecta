
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
            tipo: { $ne: "grupo" },
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

        if (conversacion.tipo === "grupo") {
            await marcarLeidosEnGrupo(conversacion, usuarioId, io);
        }

        // Marcar como leídos los mensajes recibidos que aún no se han leído.
        const mensajesActualizados = conversacion.tipo === "grupo" ? [] : await Mensaje.find({
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
        }).select("_id tipo");

        const idsDirectas = conversaciones
            .filter((conversacion) => conversacion.tipo !== "grupo")
            .map((conversacion) => conversacion._id);

        const idsGrupos = conversaciones
            .filter((conversacion) => conversacion.tipo === "grupo")
            .map((conversacion) => conversacion._id);

        // En chats directos basta "leido"; en grupos cada quien lleva su lectura.
        const [directos, grupos] = await Promise.all([
            Mensaje.countDocuments({
                conversacion: { $in: idsDirectas },
                remitente: { $ne: usuarioId },
                leido: false
            }),
            Mensaje.countDocuments({
                conversacion: { $in: idsGrupos },
                remitente: { $ne: usuarioId },
                leidoPor: { $ne: usuarioId }
            })
        ]);

        const total = directos + grupos;

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

/* ==========================================================================
   Chats grupales
   ========================================================================== */

const CAMPOS_USUARIO = "nombre username fotoPerfil";
const MAX_NOMBRE_GRUPO = 60;

function esAdministrador(conversacion, usuarioId) {
    return (conversacion.administradores || []).some(
        (id) => String(id) === String(usuarioId)
    );
}

// Valida una lista de IDs y regresa solo los usuarios activos que existen.
async function validarUsuarios(ids) {
    if (!Array.isArray(ids)) {
        return { error: "Debes indicar una lista de participantes" };
    }

    const unicos = [...new Set(ids.map(String))];

    if (unicos.some((id) => !mongoose.isValidObjectId(id))) {
        return { error: "Algún participante tiene un identificador no válido" };
    }

    const usuarios = await Usuario.find({
        _id: { $in: unicos },
        activo: { $ne: false }
    }).select("_id");

    if (usuarios.length !== unicos.length) {
        return { error: "Algún participante no existe o ya no está activo" };
    }

    return { ids: usuarios.map((usuario) => usuario._id) };
}

function validarNombreGrupo(nombre) {
    const limpio = typeof nombre === "string" ? nombre.trim() : "";

    if (!limpio) return { error: "El grupo necesita un nombre" };

    if (limpio.length > MAX_NOMBRE_GRUPO) {
        return { error: `El nombre no puede superar los ${MAX_NOMBRE_GRUPO} caracteres` };
    }

    return { nombre: limpio };
}

// Busca un grupo del que el usuario forme parte.
async function buscarGrupo(conversacionId, usuarioId) {
    if (!mongoose.isValidObjectId(conversacionId)) return null;

    return Conversacion.findOne({
        _id: conversacionId,
        tipo: "grupo",
        participantes: usuarioId
    });
}

// Avisa a los usuarios indicados que su lista de chats cambió.
function avisarCambioConversaciones(req, usuarioIds) {
    const io = req.app.get("io");
    if (!io) return;

    for (const id of usuarioIds) {
        io.to(`usuario:${id}`).emit("conversaciones:actualizar");
    }
}

async function responderGrupo(res, conversacion, status = 200) {
    await conversacion.populate("participantes", CAMPOS_USUARIO);
    res.status(status).json(conversacion);
}

// Marca como leídos por este usuario los mensajes del grupo y, cuando ya los
// leyeron todos los demás, avisa al remitente con el mismo evento que los chats directos.
async function marcarLeidosEnGrupo(conversacion, usuarioId, io) {
    const pendientes = await Mensaje.find({
        conversacion: conversacion._id,
        remitente: { $ne: usuarioId },
        leidoPor: { $ne: usuarioId }
    }).select("_id remitente leidoPor");

    if (pendientes.length === 0) return;

    const fecha = new Date();

    await Mensaje.updateMany(
        { _id: { $in: pendientes.map((mensaje) => mensaje._id) } },
        { $addToSet: { leidoPor: usuarioId }, $set: { entregado: true } }
    );

    const participantes = conversacion.participantes.map(String);

    for (const mensaje of pendientes) {
        const lectores = new Set([...mensaje.leidoPor.map(String), String(usuarioId)]);
        const faltan = participantes.filter(
            (id) => id !== String(mensaje.remitente) && !lectores.has(id)
        );

        if (faltan.length > 0) continue;

        await Mensaje.updateOne(
            { _id: mensaje._id },
            { $set: { leido: true, leidoEn: fecha, entregadoEn: fecha } }
        );

        if (io) {
            io.to(`usuario:${mensaje.remitente}`).emit("mensaje:estado", {
                _id: mensaje._id,
                conversacion: conversacion._id,
                entregado: true,
                entregadoEn: fecha,
                leido: true,
                leidoEn: fecha
            });
        }
    }
}

// Crear un chat grupal. El creador queda como administrador.
async function crearGrupo(req, res) {
    try {
        const usuarioId = req.usuario.id;

        const { nombre, error: errorNombre } = validarNombreGrupo(req.body?.nombre);
        if (errorNombre) return res.status(400).json({ mensaje: errorNombre });

        const otros = (Array.isArray(req.body?.participantes) ? req.body.participantes : [])
            .map(String)
            .filter((id) => id !== String(usuarioId));

        if (otros.length < 2) {
            return res.status(400).json({
                mensaje: "Agrega al menos a dos personas para crear un grupo"
            });
        }

        if (otros.length + 1 > Conversacion.MAX_PARTICIPANTES_GRUPO) {
            return res.status(400).json({
                mensaje: `Un grupo puede tener hasta ${Conversacion.MAX_PARTICIPANTES_GRUPO} participantes`
            });
        }

        const { ids, error } = await validarUsuarios(otros);
        if (error) return res.status(400).json({ mensaje: error });

        const conversacion = await Conversacion.create({
            tipo: "grupo",
            nombre,
            creador: usuarioId,
            administradores: [usuarioId],
            participantes: [usuarioId, ...ids]
        });

        avisarCambioConversaciones(req, ids);

        await responderGrupo(res, conversacion, 201);
    } catch (error) {
        console.error("Error al crear grupo:", error);
        res.status(500).json({ mensaje: "No se pudo crear el grupo" });
    }
}

// Cambiar el nombre del grupo (solo administradores).
async function actualizarGrupo(req, res) {
    try {
        const usuarioId = req.usuario.id;
        const conversacion = await buscarGrupo(req.params.conversacionId, usuarioId);

        if (!conversacion) {
            return res.status(404).json({ mensaje: "Grupo no encontrado" });
        }

        if (!esAdministrador(conversacion, usuarioId)) {
            return res.status(403).json({
                mensaje: "Solo los administradores pueden editar el grupo"
            });
        }

        const { nombre, error } = validarNombreGrupo(req.body?.nombre);
        if (error) return res.status(400).json({ mensaje: error });

        conversacion.nombre = nombre;
        await conversacion.save();

        avisarCambioConversaciones(req, conversacion.participantes);

        await responderGrupo(res, conversacion);
    } catch (error) {
        console.error("Error al actualizar grupo:", error);
        res.status(500).json({ mensaje: "No se pudo actualizar el grupo" });
    }
}

// Agregar personas al grupo (solo administradores).
async function agregarParticipantes(req, res) {
    try {
        const usuarioId = req.usuario.id;
        const conversacion = await buscarGrupo(req.params.conversacionId, usuarioId);

        if (!conversacion) {
            return res.status(404).json({ mensaje: "Grupo no encontrado" });
        }

        if (!esAdministrador(conversacion, usuarioId)) {
            return res.status(403).json({
                mensaje: "Solo los administradores pueden agregar personas"
            });
        }

        const actuales = new Set(conversacion.participantes.map(String));
        const nuevos = (Array.isArray(req.body?.usuarios) ? req.body.usuarios : [])
            .map(String)
            .filter((id) => !actuales.has(id));

        if (nuevos.length === 0) {
            return res.status(400).json({
                mensaje: "Selecciona al menos a una persona que no esté en el grupo"
            });
        }

        if (actuales.size + nuevos.length > Conversacion.MAX_PARTICIPANTES_GRUPO) {
            return res.status(400).json({
                mensaje: `Un grupo puede tener hasta ${Conversacion.MAX_PARTICIPANTES_GRUPO} participantes`
            });
        }

        const { ids, error } = await validarUsuarios(nuevos);
        if (error) return res.status(400).json({ mensaje: error });

        conversacion.participantes.push(...ids);
        await conversacion.save();

        avisarCambioConversaciones(req, conversacion.participantes);

        await responderGrupo(res, conversacion);
    } catch (error) {
        console.error("Error al agregar participantes:", error);
        res.status(500).json({ mensaje: "No se pudieron agregar las personas" });
    }
}

// Quitar a alguien del grupo. Un administrador puede quitar a cualquiera;
// cualquier participante puede quitarse a sí mismo (salir del grupo).
async function quitarParticipante(req, res) {
    try {
        const usuarioId = req.usuario.id;
        const objetivoId = req.params.usuarioId;

        if (!mongoose.isValidObjectId(objetivoId)) {
            return res.status(400).json({ mensaje: "El identificador del usuario no es válido" });
        }

        const conversacion = await buscarGrupo(req.params.conversacionId, usuarioId);

        if (!conversacion) {
            return res.status(404).json({ mensaje: "Grupo no encontrado" });
        }

        const esSalida = String(objetivoId) === String(usuarioId);

        if (!esSalida && !esAdministrador(conversacion, usuarioId)) {
            return res.status(403).json({
                mensaje: "Solo los administradores pueden quitar personas"
            });
        }

        const estaEnGrupo = conversacion.participantes.some(
            (id) => String(id) === String(objetivoId)
        );

        if (!estaEnGrupo) {
            return res.status(404).json({ mensaje: "Esa persona no está en el grupo" });
        }

        const avisarA = conversacion.participantes.map(String);

        conversacion.participantes.pull(objetivoId);
        conversacion.administradores.pull(objetivoId);
        conversacion.ocultasPor.pull(objetivoId);
        conversacion.silenciadosPor.pull(objetivoId);

        // Si el grupo se queda vacío se borra junto con sus mensajes.
        if (conversacion.participantes.length === 0) {
            await Mensaje.deleteMany({ conversacion: conversacion._id });
            await conversacion.deleteOne();

            return res.json({ mensaje: "Saliste del grupo" });
        }

        // El grupo nunca se queda sin administrador.
        if (conversacion.administradores.length === 0) {
            conversacion.administradores.push(conversacion.participantes[0]);
        }

        await conversacion.save();

        // Sacar a la persona de la sala en tiempo real.
        const io = req.app.get("io");
        if (io) {
            io.in(`usuario:${objetivoId}`).socketsLeave(`conversacion:${conversacion._id}`);
        }

        avisarCambioConversaciones(req, avisarA);

        if (esSalida) {
            return res.json({ mensaje: "Saliste del grupo" });
        }

        await responderGrupo(res, conversacion);
    } catch (error) {
        console.error("Error al quitar participante:", error);
        res.status(500).json({ mensaje: "No se pudo quitar a la persona del grupo" });
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
    eliminarConversacion,
    crearGrupo,
    actualizarGrupo,
    agregarParticipantes,
    quitarParticipante
};
