const mongoose = require("mongoose");

const Usuario = require("../models/Usuario");
const Publicacion = require("../models/Publicacion");
const {
    formatearPublicacion,
    CAMPOS_AUTOR
} = require("./publicacionController");
const {
    guardarImagen,
    eliminarImagen
} = require("../middleware/upload");
const SolicitudAmistad = require("../models/SolicitudAmistad");
const { crearNotificacion } = require("./notificacionController");

// GET /api/usuarios
async function buscarUsuarios(req, res) {
    try {
        const texto = (req.query.q || "").trim();
        const escapado = texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        const filtro = texto
            ? {
                $or: [
                    { username: new RegExp(escapado, "i") },
                    { nombre: new RegExp(escapado, "i") }
                ]
            }
            : {};

        const usuarios = await Usuario.find(filtro)
            .sort({ fechaRegistro: -1 })
            .limit(20);

        return res.json({
            usuarios: usuarios.map((u) => ({
                ...u.aPublico(),
                email: undefined
            }))
        });
    } catch (error) {
        console.error("Error al buscar usuarios:", error);

        return res.status(500).json({
            mensaje: "Error al buscar usuarios"
        });
    }
}

// GET /api/usuarios/:username
async function obtenerPerfil(req, res) {
    try {
        const usuario = await Usuario.findOne({
            username: req.params.username
        });

        if (!usuario) {
            return res.status(404).json({
                mensaje: "Usuario no encontrado"
            });
        }

        const totalPublicaciones = await Publicacion.countDocuments({
            autor: usuario._id
        });

        return res.json({
            usuario: {
                ...usuario.aPublico(),
                email: undefined,
                totalPublicaciones,
                totalAmigos: usuario.amigos.length
            }
        });
    } catch (error) {
        console.error("Error al obtener perfil:", error);

        return res.status(500).json({
            mensaje: "Error al obtener el perfil"
        });
    }
}

// GET /api/usuarios/:username/publicaciones
async function obtenerPublicacionesDeUsuario(req, res) {
    try {
        const usuario = await Usuario.findOne({
            username: req.params.username
        });

        if (!usuario) {
            return res.status(404).json({
                mensaje: "Usuario no encontrado"
            });
        }

        const publicaciones = await Publicacion.find({
            autor: usuario._id
        })
            .sort({ fechaCreacion: -1 })
            .populate("autor", CAMPOS_AUTOR);

        const publicacionesFormateadas = await Promise.all(
            publicaciones.map((publicacion) =>
                formatearPublicacion(
                    publicacion,
                    req.usuario?.id
                )
            )
        );

        return res.json({
            publicaciones: publicacionesFormateadas
        });
    } catch (error) {
        console.error(
            "Error al obtener publicaciones del usuario:",
            error
        );

        return res.status(500).json({
            mensaje: "Error al obtener las publicaciones"
        });
    }
}

// PUT /api/usuarios/me
async function actualizarPerfil(req, res) {
    try {
        const usuario = await Usuario.findById(req.usuario.id);

        if (!usuario) {
            return res.status(401).json({
                mensaje: "Tu sesión ya no es válida, inicia sesión de nuevo"
            });
        }

        const { nombre, descripcion, gruposFavoritos } = req.body || {};

        if (nombre !== undefined) {
            usuario.nombre = nombre.trim();
        }

        if (descripcion !== undefined) {
            usuario.descripcion = descripcion.trim();
        }

        if (Array.isArray(gruposFavoritos)) {
            usuario.gruposFavoritos = gruposFavoritos.map(String);
        }

        if (req.file) {
            const fotoAnterior = usuario.fotoPerfil;
            usuario.fotoPerfil = await guardarImagen(req.file, usuario._id);
            await eliminarImagen(fotoAnterior);
        }

        await usuario.save();

        return res.json({
            mensaje: "Perfil actualizado",
            usuario: usuario.aPublico()
        });
    } catch (error) {
        console.error("Error al actualizar perfil:", error);

        return res.status(500).json({
            mensaje: "Error al actualizar el perfil"
        });
    }
}

// POST /api/usuarios/:username/solicitud
// Enviar una solicitud de amistad.
async function enviarSolicitud(req, res) {
    try {
        const solicitanteId = req.usuario.id;
        const { username } = req.params;

        const destinatario = await Usuario.findOne({
            username,
            activo: true
        });

        if (!destinatario) {
            return res.status(404).json({
                mensaje: "Usuario no encontrado"
            });
        }

        if (String(solicitanteId) === String(destinatario._id)) {
            return res.status(400).json({
                mensaje: "No puedes enviarte una solicitud a ti mismo"
            });
        }

        const solicitante = await Usuario.findById(solicitanteId);

        if (!solicitante) {
            return res.status(401).json({
                mensaje: "Tu sesión ya no es válida"
            });
        }

        const yaSonAmigos =
            solicitante.amigos.some(
                (id) => String(id) === String(destinatario._id)
            ) ||
            destinatario.amigos.some(
                (id) => String(id) === String(solicitante._id)
            );

        if (yaSonAmigos) {
            return res.status(400).json({
                mensaje: "Ya son amigos"
            });
        }

        // Buscar solicitudes pendientes en ambas direcciones.
        const solicitudPendiente = await SolicitudAmistad.findOne({
            estado: "pendiente",
            $or: [
                {
                    solicitante: solicitante._id,
                    destinatario: destinatario._id
                },
                {
                    solicitante: destinatario._id,
                    destinatario: solicitante._id
                }
            ]
        });

        if (solicitudPendiente) {
            const laEnvioUsuarioActual =
                String(solicitudPendiente.solicitante) ===
                String(solicitante._id);

            return res.status(409).json({
                mensaje: laEnvioUsuarioActual
                    ? "Ya enviaste una solicitud a este usuario"
                    : "Este usuario ya te envió una solicitud",
                solicitud: {
                    id: solicitudPendiente._id,
                    estado: solicitudPendiente.estado,
                    eresSolicitante: laEnvioUsuarioActual
                }
            });
        }

        // Buscar un registro anterior para respetar el índice único.
        const solicitudAnterior = await SolicitudAmistad.findOne({
            $or: [
                {
                    solicitante: solicitante._id,
                    destinatario: destinatario._id
                },
                {
                    solicitante: destinatario._id,
                    destinatario: solicitante._id
                }
            ]
        });

        let solicitud;

        if (solicitudAnterior) {
            solicitudAnterior.solicitante = solicitante._id;
            solicitudAnterior.destinatario = destinatario._id;
            solicitudAnterior.estado = "pendiente";

            solicitud = await solicitudAnterior.save();
        } else {
            solicitud = await SolicitudAmistad.create({
                solicitante: solicitante._id,
                destinatario: destinatario._id,
                estado: "pendiente"
            });
        }

        // Crear una notificación para el destinatario.
        try {
            await crearNotificacion({
                destinatario: destinatario._id,
                emisor: solicitante._id,
                tipo: "solicitud_amistad",
                mensaje: `@${solicitante.username} te envió una solicitud de amistad`,
                enlace: `/perfil/${solicitante.username}`
            });
        } catch (errorNotificacion) {
            console.error(
                "Error al crear la notificación de solicitud de amistad:",
                errorNotificacion
            );
        }

        return res.status(201).json({
            mensaje: "Solicitud de amistad enviada",
            solicitud: {
                id: solicitud._id,
                estado: solicitud.estado
            }
        });
    } catch (error) {
        console.error("Error al enviar solicitud:", error);

        if (error.code === 11000) {
            return res.status(409).json({
                mensaje: "Ya existe una solicitud entre estos usuarios"
            });
        }

        return res.status(500).json({
            mensaje: "Error al enviar la solicitud"
        });
    }
}
// GET /api/usuarios/solicitudes/recibidas
// Consultar las solicitudes que recibiste.

async function listarSolicitudesRecibidas(req, res) {
    try {
        const solicitudes = await SolicitudAmistad.find({
            destinatario: req.usuario.id,
            estado: "pendiente"
        })
            .populate(
                "solicitante",
                "nombre username fotoPerfil fechaRegistro"
            )
            .sort({ createdAt: -1 });

        return res.json({
            solicitudes: solicitudes.map((solicitud) => ({
                id: solicitud._id,
                fecha: solicitud.createdAt,
                usuario: solicitud.solicitante
                    ? {
                        id: solicitud.solicitante._id,
                        nombre: solicitud.solicitante.nombre,
                        username: solicitud.solicitante.username,
                        fotoPerfil: solicitud.solicitante.fotoPerfil
                    }
                    : null
            }))
        });
    } catch (error) {
        console.error("Error al listar solicitudes recibidas:", error);

        return res.status(500).json({
            mensaje: "Error al consultar las solicitudes recibidas"
        });
    }
}


// GET /api/usuarios/solicitudes/enviadas
// Consultar las solicitudes que enviaste.

async function listarSolicitudesEnviadas(req, res) {
    try {
        const solicitudes = await SolicitudAmistad.find({
            solicitante: req.usuario.id,
            estado: "pendiente"
        })
            .populate(
                "destinatario",
                "nombre username fotoPerfil fechaRegistro"
            )
            .sort({ createdAt: -1 });

        return res.json({
            solicitudes: solicitudes.map((solicitud) => ({
                id: solicitud._id,
                fecha: solicitud.createdAt,
                usuario: solicitud.destinatario
                    ? {
                        id: solicitud.destinatario._id,
                        nombre: solicitud.destinatario.nombre,
                        username: solicitud.destinatario.username,
                        fotoPerfil: solicitud.destinatario.fotoPerfil
                    }
                    : null
            }))
        });
    } catch (error) {
        console.error("Error al listar solicitudes enviadas:", error);

        return res.status(500).json({
            mensaje: "Error al consultar las solicitudes enviadas"
        });
    }
}


// POST /api/usuarios/solicitudes/:id/aceptar
// Aceptar una solicitud recibida.

async function aceptarSolicitud(req, res) {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                mensaje: "El identificador de la solicitud no es válido"
            });
        }

        const solicitud = await SolicitudAmistad.findOne({
            _id: id,
            destinatario: req.usuario.id,
            estado: "pendiente"
        });

        if (!solicitud) {
            return res.status(404).json({
                mensaje: "Solicitud no encontrada o ya procesada"
            });
        }

        const solicitante = await Usuario.findById(
            solicitud.solicitante
        );

        const destinatario = await Usuario.findById(
            solicitud.destinatario
        );

        if (!solicitante || !destinatario) {
            return res.status(404).json({
                mensaje: "No se encontraron ambos usuarios"
            });
        }

        // Agregar al destinatario a la lista de amigos del solicitante.
        await Usuario.updateOne(
            { _id: solicitante._id },
            {
                $addToSet: {
                    amigos: destinatario._id
                }
            }
        );

        // Agregar al solicitante a la lista de amigos del destinatario.
        await Usuario.updateOne(
            { _id: destinatario._id },
            {
                $addToSet: {
                    amigos: solicitante._id
                }
            }
        );

        solicitud.estado = "aceptada";
        await solicitud.save();

        return res.json({
            mensaje: "Solicitud aceptada. ¡Ahora son amigos!",
            amistad: {
                usuario1: String(solicitante._id),
                usuario2: String(destinatario._id)
            }
        });
    } catch (error) {
        console.error("Error al aceptar solicitud:", error);

        return res.status(500).json({
            mensaje: "Error al aceptar la solicitud"
        });
    }
}


// POST /api/usuarios/solicitudes/:id/rechazar
// Rechazar una solicitud recibida.

async function rechazarSolicitud(req, res) {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                mensaje: "El identificador de la solicitud no es válido"
            });
        }

        const solicitud = await SolicitudAmistad.findOne({
            _id: id,
            destinatario: req.usuario.id,
            estado: "pendiente"
        });

        if (!solicitud) {
            return res.status(404).json({
                mensaje: "Solicitud no encontrada o ya procesada"
            });
        }

        solicitud.estado = "rechazada";
        await solicitud.save();

        return res.json({
            mensaje: "Solicitud rechazada"
        });
    } catch (error) {
        console.error("Error al rechazar solicitud:", error);

        return res.status(500).json({
            mensaje: "Error al rechazar la solicitud"
        });
    }
}


// DELETE /api/usuarios/solicitudes/:id
// Cancelar una solicitud que tú enviaste.

async function cancelarSolicitud(req, res) {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                mensaje: "El identificador de la solicitud no es válido"
            });
        }

        const solicitud = await SolicitudAmistad.findOneAndDelete({
            _id: id,
            solicitante: req.usuario.id,
            estado: "pendiente"
        });

        if (!solicitud) {
            return res.status(404).json({
                mensaje: "Solicitud no encontrada o ya procesada"
            });
        }

        return res.json({
            mensaje: "Solicitud cancelada"
        });
    } catch (error) {
        console.error("Error al cancelar solicitud:", error);

        return res.status(500).json({
            mensaje: "Error al cancelar la solicitud"
        });
    }
}


// GET /api/usuarios/:username/amistad
// Consultar el estado de amistad entre el usuario actual y otro perfil.

async function obtenerEstadoAmistad(req, res) {
    try {
        const usuarioActualId = req.usuario.id;
        const { username } = req.params;

        const usuarioPerfil = await Usuario.findOne({
            username,
            activo: true
        });

        if (!usuarioPerfil) {
            return res.status(404).json({
                mensaje: "Usuario no encontrado"
            });
        }

        if (String(usuarioActualId) === String(usuarioPerfil._id)) {
            return res.json({
                estado: "self"
            });
        }

        const usuarioActual = await Usuario.findById(
            usuarioActualId
        );

        if (!usuarioActual) {
            return res.status(401).json({
                mensaje: "Tu sesión ya no es válida"
            });
        }

        const sonAmigos =
            usuarioActual.amigos.some(
                (id) => String(id) === String(usuarioPerfil._id)
            ) ||
            usuarioPerfil.amigos.some(
                (id) => String(id) === String(usuarioActual._id)
            );

        if (sonAmigos) {
            return res.json({
                estado: "friends"
            });
        }

        const solicitud = await SolicitudAmistad.findOne({
            estado: "pendiente",
            $or: [
                {
                    solicitante: usuarioActual._id,
                    destinatario: usuarioPerfil._id
                },
                {
                    solicitante: usuarioPerfil._id,
                    destinatario: usuarioActual._id
                }
            ]
        });

        if (!solicitud) {
            return res.json({
                estado: "none"
            });
        }

        const solicitudEnviadaPorUsuarioActual =
            String(solicitud.solicitante) ===
            String(usuarioActual._id);

        return res.json({
            estado: solicitudEnviadaPorUsuarioActual
                ? "sent"
                : "received",
            solicitudId: String(solicitud._id)
        });
    } catch (error) {
        console.error(
            "Error al consultar el estado de amistad:",
            error
        );

        return res.status(500).json({
            mensaje: "Error al consultar el estado de amistad"
        });
    }
}


// DELETE /api/usuarios/:id/amigo
// Eliminar una amistad entre dos usuarios.

async function eliminarAmigo(req, res) {
    try {
        const { id } = req.params;
        const usuarioActualId = req.usuario.id;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                mensaje: "El identificador del usuario no es válido"
            });
        }

        if (String(usuarioActualId) === String(id)) {
            return res.status(400).json({
                mensaje: "No puedes eliminarte a ti mismo de tus amigos"
            });
        }

        const usuarioActual = await Usuario.findById(
            usuarioActualId
        );

        const otroUsuario = await Usuario.findById(id);

        if (!usuarioActual || !otroUsuario) {
            return res.status(404).json({
                mensaje: "Usuario no encontrado"
            });
        }

        const eranAmigos =
            usuarioActual.amigos.some(
                (amigoId) => String(amigoId) === String(id)
            ) ||
            otroUsuario.amigos.some(
                (amigoId) =>
                    String(amigoId) === String(usuarioActualId)
            );

        if (!eranAmigos) {
            return res.status(400).json({
                mensaje: "Estos usuarios no son amigos"
            });
        }

        // Quitar a cada usuario de la lista de amigos del otro.
        await Usuario.updateOne(
            { _id: usuarioActualId },
            {
                $pull: {
                    amigos: id
                }
            }
        );

        await Usuario.updateOne(
            { _id: id },
            {
                $pull: {
                    amigos: usuarioActualId
                }
            }
        );

        // Finalizar las solicitudes aceptadas entre ambos usuarios.
        // Esto permite reutilizar el registro cuando vuelvan a ser amigos.
        await SolicitudAmistad.updateMany(
            {
                estado: "aceptada",
                $or: [
                    {
                        solicitante: usuarioActualId,
                        destinatario: id
                    },
                    {
                        solicitante: id,
                        destinatario: usuarioActualId
                    }
                ]
            },
            {
                $set: {
                    estado: "finalizada"
                }
            }
        );

        return res.json({
            mensaje: "Amistad eliminada correctamente"
        });
    } catch (error) {
        console.error("Error al eliminar amistad:", error);

        return res.status(500).json({
            mensaje: "Error al eliminar la amistad"
        });
    }
}


// Exportar todas las funciones del controlador.

module.exports = {
    buscarUsuarios,
    obtenerPerfil,
    obtenerPublicacionesDeUsuario,
    actualizarPerfil,
    enviarSolicitud,
    listarSolicitudesRecibidas,
    listarSolicitudesEnviadas,
    aceptarSolicitud,
    rechazarSolicitud,
    cancelarSolicitud,
    obtenerEstadoAmistad,
    eliminarAmigo
};