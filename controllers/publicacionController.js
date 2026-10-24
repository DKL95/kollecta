
const mongoose = require("mongoose");

const Publicacion = require("../models/Publicacion");
const {
    guardarImagen,
    eliminarImagen
} = require("../middleware/upload");

const Comentario = require("../models/Comentario");
const Respuesta = require("../models/Respuesta");

const Notificacion = require("../models/Notificacion");
const Usuario = require("../models/Usuario");

const CAMPOS_AUTOR = "nombre username fotoPerfil";

// Detectar menciones y crear sus notificaciones.
async function notificarMenciones(texto, emisorId, enlace, contexto) {
    try {
        console.log("🔎 Texto recibido:", texto);
        console.log("👤 ID del emisor:", String(emisorId));

        // Detectar menciones como @cgl, incluso después de signos de puntuación.
        const coincidencias = [
            ...String(texto || "").matchAll(
                /@([a-zA-Z0-9_.-]+)/g
            )
        ];

        const usernames = [
            ...new Set(
                coincidencias.map((coincidencia) =>
                    coincidencia[1].toLowerCase()
                )
            )
        ];

        console.log("🏷️ Usuarios detectados:", usernames);

        if (usernames.length === 0) {
            console.log("⚠️ No se detectaron menciones.");
            return;
        }

        // Buscar usuarios sin distinguir entre mayúsculas y minúsculas.
        const usuarios = await Usuario.find({
            activo: true,
            username: {
                $in: usernames.map(
                    (username) => new RegExp(
                        "^" + username.replace(
                            /[.*+?^${}()|[\]\\]/g,
                            "\\$&"
                        ) + "$",
                        "i"
                    )
                )
            }
        }).select("_id username");

        console.log(
            "👥 Usuarios encontrados:",
            usuarios.map((usuario) => ({
                id: String(usuario._id),
                username: usuario.username
            }))
        );

        for (const usuario of usuarios) {
            if (String(usuario._id) === String(emisorId)) {
                console.log(
                    "⏭️ Se omite la notificación al propio usuario:",
                    usuario.username
                );
                continue;
            }

            const notificacion = await Notificacion.create({
                destinatario: usuario._id,
                emisor: emisorId,
                tipo: "mencion",
                mensaje: `Te mencionaron en ${contexto}.`,
                enlace
            });

            console.log(
                "✅ Notificación creada:",
                String(notificacion._id),
                "para @",
                usuario.username
            );
        }
    } catch (error) {
        console.error(
            "❌ Error al notificar menciones:",
            error
        );
    }
}

// Cuenta comentarios principales y todas sus respuestas como interacciones.
async function contarInteracciones(publicacionId) {
    const [totalComentarios, totalRespuestas] = await Promise.all([
        Comentario.countDocuments({ publicacion: publicacionId }),
        Respuesta.countDocuments({ publicacion: publicacionId })
    ]);

    return totalComentarios + totalRespuestas;
}

// Da forma a una publicación para el frontend.
async function formatearPublicacion(publicacion, idUsuarioActual) {
    const autor = publicacion.autor || {};

    const imagenes = publicacion.imagenes?.length
        ? publicacion.imagenes
        : (publicacion.imagen ? [publicacion.imagen] : []);

    // El contador incluye comentarios principales y respuestas.
    const totalComentarios = await contarInteracciones(publicacion._id);

    const likes = publicacion.likes || [];

    return {
        id: publicacion._id,
        texto: publicacion.texto,
        grupo: publicacion.grupo,
        imagenes,
        imagen: imagenes[0] || "",
        fechaCreacion: publicacion.fechaCreacion,

        autor: {
            id: autor._id,
            nombre: autor.nombre,
            username: autor.username,
            fotoPerfil: autor.fotoPerfil
        },

        totalLikes: likes.length,
        totalComentarios,

        meGusta: idUsuarioActual
            ? likes.some(
                (id) => String(id) === String(idUsuarioActual)
            )
            : false,

        esMia: idUsuarioActual
            ? String(autor._id) === String(idUsuarioActual)
            : false
    };
}

async function buscarPorId(id) {
    if (!mongoose.isValidObjectId(id)) return null;

    return Publicacion.findById(id).populate("autor", CAMPOS_AUTOR);
}

// GET /api/publicaciones
async function listarPublicaciones(req, res) {
    try {
        const filtro = req.query.grupo
            ? { grupo: req.query.grupo }
            : {};

        const publicaciones = await Publicacion.find(filtro)
            .sort({ fechaCreacion: -1 })
            .limit(50)
            .populate("autor", CAMPOS_AUTOR);

        const publicacionesFormateadas = await Promise.all(
            publicaciones.map((publicacion) =>
                formatearPublicacion(publicacion, req.usuario.id)
            )
        );

        return res.json({
            publicaciones: publicacionesFormateadas
        });
    } catch (error) {
        console.error("Error al listar publicaciones:", error);

        return res.status(500).json({
            mensaje: "Error al obtener las publicaciones"
        });
    }
}

// GET /api/publicaciones/:id
async function obtenerPublicacion(req, res) {
    try {
        
        const publicacion = await buscarPorId(req.params.id);

        if (!publicacion) {
            console.log("No se encontró la publicación.");

            return res.status(404).json({
                mensaje: "Publicación no encontrada"
            });
        }

        const resultado = await formatearPublicacion(
            publicacion,
            req.usuario.id
        );

        return res.json({
            publicacion: resultado
        });
    } catch (error) {
        console.error("Error al obtener publicación:", error);

        return res.status(500).json({
            mensaje: "Error al obtener la publicación"
        });
    }
}

// POST /api/publicaciones
// Crear publicación con hasta 10 imágenes.
async function crearPublicacion(req, res) {
    const imagenesGuardadas = [];

    try {
        const cuerpo = req.body || {};
        const texto = (cuerpo.texto || "").trim();

        if (!texto) {
            return res.status(400).json({
                mensaje: "La publicación no puede estar vacía"
            });
        }

        if (texto.length > 1000) {
            return res.status(400).json({
                mensaje: "La publicación no puede pasar de 1000 caracteres"
            });
        }

        // upload.array() coloca los archivos en req.files.
        const archivos = req.files || [];

        if (archivos.length > 10) {
            return res.status(400).json({
                mensaje: "Una publicación puede tener máximo 10 imágenes"
            });
        }

        for (const archivo of archivos) {
            const imagen = await guardarImagen(
                archivo,
                req.usuario.id
            );

            imagenesGuardadas.push(imagen);
        }

        const nuevaPublicacion = await Publicacion.create({
            autor: req.usuario.id,
            texto,
            grupo: cuerpo.grupo || "",
            imagenes: imagenesGuardadas
        });

        await nuevaPublicacion.populate("autor", CAMPOS_AUTOR);

        await notificarMenciones(
            texto,
            req.usuario.id,
            `/publicaciones/${nuevaPublicacion._id}`,
            "una publicación"
        );

        return res.status(201).json({
            mensaje: "Publicación creada",
            publicacion: formatearPublicacion(
                nuevaPublicacion,
                req.usuario.id
            )
        });
    } catch (error) {
        for (const imagen of imagenesGuardadas) {
            await eliminarImagen(imagen).catch((errorLimpieza) => {
                console.error(
                    "No se pudo limpiar una imagen:",
                    errorLimpieza
                );
            });
        }

        console.error("Error al crear publicación:", error);

        return res.status(500).json({
            mensaje: "Error al crear la publicación"
        });
    }
}

// PUT /api/publicaciones/:id
// Editar publicación y sus imágenes.
async function actualizarPublicacion(req, res) {
    const imagenesNuevas = [];

    try {
        const publicacion = await buscarPorId(req.params.id);

        if (!publicacion) {
            return res.status(404).json({
                mensaje: "Publicación no encontrada"
            });
        }

        if (String(publicacion.autor._id) !== String(req.usuario.id)) {
            return res.status(403).json({
                mensaje: "Solo el autor puede editar esta publicación"
            });
        }

        const {
            texto,
            grupo,
            imagenesEliminadas
        } = req.body || {};

        if (texto !== undefined) {
            if (typeof texto !== "string" || !texto.trim()) {
                return res.status(400).json({
                    mensaje: "La publicación no puede estar vacía"
                });
            }

            if (texto.trim().length > 1000) {
                return res.status(400).json({
                    mensaje: "La publicación no puede pasar de 1000 caracteres"
                });
            }

            publicacion.texto = texto.trim();
        }

        if (grupo !== undefined) {
            publicacion.grupo = grupo;
        }

        // Compatibilidad con publicaciones antiguas.
        const actuales = publicacion.imagenes?.length
            ? [...publicacion.imagenes]
            : (publicacion.imagen ? [publicacion.imagen] : []);

        let eliminadas = [];

        if (imagenesEliminadas !== undefined) {
            try {
                eliminadas = JSON.parse(imagenesEliminadas);

                if (
                    !Array.isArray(eliminadas) ||
                    !eliminadas.every(
                        (imagen) => typeof imagen === "string"
                    )
                ) {
                    return res.status(400).json({
                        mensaje: "La lista de imágenes eliminadas no es válida"
                    });
                }
            } catch {
                return res.status(400).json({
                    mensaje: "La lista de imágenes eliminadas no es válida"
                });
            }
        }

        const restantes = actuales.filter(
            (imagen) => !eliminadas.includes(imagen)
        );

        const archivos = req.files || [];

        // Comprobar el límite antes de guardar archivos.
        if (restantes.length + archivos.length > 10) {
            return res.status(400).json({
                mensaje: "Una publicación puede tener máximo 10 imágenes"
            });
        }

        for (const archivo of archivos) {
            const imagen = await guardarImagen(
                archivo,
                req.usuario.id
            );

            imagenesNuevas.push(imagen);
        }

        const resultado = [...restantes, ...imagenesNuevas];

        const anterioresEliminadas = actuales.filter(
            (imagen) => eliminadas.includes(imagen)
        );

        try {
            publicacion.imagenes = resultado;
            publicacion.imagen = "";

            await publicacion.save();
        } catch (error) {
            for (const imagen of imagenesNuevas) {
                await eliminarImagen(imagen).catch(() => {});
            }

            throw error;
        }

        for (const imagen of anterioresEliminadas) {
            await eliminarImagen(imagen).catch((error) => {
                console.error(
                    "No se pudo eliminar una imagen:",
                    error
                );
            });
        }

        await publicacion.populate("autor", CAMPOS_AUTOR);

        return res.json({
            mensaje: "Publicación actualizada",
            publicacion: formatearPublicacion(
                publicacion,
                req.usuario.id
            )
        });
    } catch (error) {
        console.error("Error al actualizar publicación:", error);

        return res.status(500).json({
            mensaje: "Error al actualizar la publicación"
        });
    }
}

// DELETE /api/publicaciones/:id
async function eliminarPublicacion(req, res) {
    try {
        const publicacion = await buscarPorId(req.params.id);

        if (!publicacion) {
            return res.status(404).json({
                mensaje: "Publicación no encontrada"
            });
        }

        if (String(publicacion.autor._id) !== String(req.usuario.id)) {
            return res.status(403).json({
                mensaje: "Solo el autor puede eliminar esta publicación"
            });
        }

        const imagenes = publicacion.imagenes?.length
            ? [...publicacion.imagenes]
            : (publicacion.imagen ? [publicacion.imagen] : []);

        await publicacion.deleteOne();

        for (const imagen of imagenes) {
            await eliminarImagen(imagen).catch((error) => {
                console.error(
                    "No se pudo eliminar una imagen:",
                    error
                );
            });
        }

        return res.json({
            mensaje: "Publicación eliminada"
        });
    } catch (error) {
        console.error("Error al eliminar publicación:", error);

        return res.status(500).json({
            mensaje: "Error al eliminar la publicación"
        });
    }
}

// POST /api/publicaciones/:id/like
async function alternarLike(req, res) {
    try {
        const publicacion = await buscarPorId(req.params.id);

        if (!publicacion) {
            return res.status(404).json({
                mensaje: "Publicación no encontrada"
            });
        }

        const idUsuario = String(req.usuario.id);
        const idAutor = String(publicacion.autor._id);

        const yaTieneLike = publicacion.likes.some(
            (id) => String(id) === idUsuario
        );

        if (yaTieneLike) {
            publicacion.likes.pull(req.usuario.id);
        } else {
            publicacion.likes.push(req.usuario.id);
        }

        await publicacion.save();

        // Notificar solo cuando alguien da like a otra persona.
        if (!yaTieneLike && idUsuario !== idAutor) {
            try {
                await Notificacion.create({
                    destinatario: publicacion.autor._id,
                    emisor: req.usuario.id,
                    tipo: "like",
                    mensaje: "Le dio me gusta a tu publicación.",
                    enlace: `/publicaciones/${publicacion._id}`
                });
            } catch (error) {
                console.error(
                    "Error al crear notificación:",
                    error
                );
            }
        }

        await publicacion.populate("autor", CAMPOS_AUTOR);

        return res.json({
            publicacion: formatearPublicacion(
                publicacion,
                req.usuario.id
            )
        });
    } catch (error) {
        console.error("Error al dar like:", error);

        return res.status(500).json({
            mensaje: "Error al dar like"
        });
    }
}

// POST /api/publicaciones/:id/comentarios
async function agregarComentario(req, res) {
    try {
        const publicacion = await buscarPorId(req.params.id);

        if (!publicacion) {
            return res.status(404).json({
                mensaje: "Publicación no encontrada"
            });
        }

        const texto = (req.body.texto || "").trim();

        if (!texto) {
            return res.status(400).json({
                mensaje: "El comentario no puede estar vacío"
            });
        }

        if (texto.length > 500) {
            return res.status(400).json({
                mensaje: "El comentario no puede superar los 500 caracteres"
            });
        }

        // Crear el comentario con el sistema actual.
        const comentario = await Comentario.create({
            publicacion: publicacion._id,
            autor: req.usuario.id,
            texto
        });

        await comentario.populate("autor", CAMPOS_AUTOR);

        const autor = comentario.autor;

        // Crear una notificación si el comentario es de otra persona.
        const idAutorPublicacion = String(publicacion.autor._id);
        const idAutorComentario = String(req.usuario.id);

        if (idAutorPublicacion !== idAutorComentario) {
            try {
                const textoNotificacion =
                    texto.length > 100
                        ? `${texto.slice(0, 100)}...`
                        : texto;

                await Notificacion.create({
                    destinatario: publicacion.autor._id,
                    emisor: req.usuario.id,
                    tipo: "comentario",
                    mensaje: `comentó tu publicación: "${textoNotificacion}"`,
                    enlace: `/publicaciones/${publicacion._id}`
                });
            } catch (error) {
                // Un error de notificación no debe impedir publicar.
                console.error(
                    "Error al crear notificación de comentario:",
                    error
                );
            }
        }

        // NUEVO: detectar menciones y notificar a los usuarios mencionados.
        await notificarMenciones(
            texto,
            req.usuario.id,
            `/publicaciones/${publicacion._id}`,
            "un comentario"
        );

        return res.status(201).json({
            mensaje: "Comentario publicado",

            comentario: {
                id: String(comentario._id),
                texto: comentario.texto,
                fecha: comentario.fecha,

                autor: {
                    id: String(autor._id),
                    nombre: autor.nombre,
                    username: autor.username,
                    fotoPerfil: autor.fotoPerfil
                },

                likes: [],
                totalLikes: 0,
                meGusta: false,
                respuestas: []
            },

            totalComentarios: await contarInteracciones(publicacion._id)
        });

    } catch (error) {
        console.error("Error al agregar comentario:", error);

        return res.status(500).json({
            mensaje: "Error al publicar el comentario"
        });
    }
}

// GET /api/publicaciones/:id/comentarios
async function listarComentarios(req, res) {
    try {
        const publicacion = await Publicacion.findById(req.params.id)
            .select("_id");

        if (!publicacion) {
            return res.status(404).json({
                mensaje: "Publicación no encontrada"
            });
        }

        const idUsuarioActual = String(req.usuario.id);

        const comentariosDB = await Comentario.find({
            publicacion: publicacion._id
        })
            .sort({ fecha: 1 })
            .populate("autor", CAMPOS_AUTOR);

        const idsComentarios = comentariosDB.map(
            (comentario) => comentario._id
        );

        const respuestasDB = await Respuesta.find({
            comentario: { $in: idsComentarios }
        })
            .sort({ fecha: 1 })
            .populate("autor", CAMPOS_AUTOR)
            .populate("mencionado", CAMPOS_AUTOR);

        const formatearAutor = (autor) => {
            if (!autor) return null;

            return {
                id: String(autor._id),
                nombre: autor.nombre,
                username: autor.username,
                fotoPerfil: autor.fotoPerfil
            };
        };

        const respuestasPorComentario = new Map();

        for (const respuesta of respuestasDB) {
            const idComentario = String(respuesta.comentario);

            if (!respuestasPorComentario.has(idComentario)) {
                respuestasPorComentario.set(idComentario, []);
            }

            const likes = respuesta.likes || [];

            respuestasPorComentario.get(idComentario).push({
                id: String(respuesta._id),
                texto: respuesta.texto,
                fecha: respuesta.fecha,
                autor: formatearAutor(respuesta.autor),

                responderA: respuesta.responderA
                    ? String(respuesta.responderA)
                    : null,

                mencionado: formatearAutor(respuesta.mencionado),

                likes: likes.map((id) => String(id)),
                totalLikes: likes.length,

                meGusta: likes.some(
                    (id) => String(id) === idUsuarioActual
                )
            });
        }

        const comentarios = comentariosDB.map((comentario) => {
            const likes = comentario.likes || [];

            return {
                id: String(comentario._id),
                texto: comentario.texto,
                fecha: comentario.fecha,
                autor: formatearAutor(comentario.autor),

                likes: likes.map((id) => String(id)),
                totalLikes: likes.length,

                meGusta: likes.some(
                    (id) => String(id) === idUsuarioActual
                ),

                respuestas:
                    respuestasPorComentario.get(
                        String(comentario._id)
                    ) || []
            };
        });

        return res.json({
            comentarios,
            totalComentarios: await contarInteracciones(publicacion._id)
        });

    } catch (error) {
        console.error("Error al listar comentarios:", error);

        return res.status(500).json({
            mensaje: "Error al obtener los comentarios"
        });
    }
}

// POST /api/publicaciones/:id/comentarios/:comentarioId/like
async function alternarLikeComentario(req, res) {
    try {
        const { id, comentarioId } = req.params;

        const comentario = await Comentario.findOne({
            _id: comentarioId,
            publicacion: id
        });

        if (!comentario) {
            return res.status(404).json({
                mensaje: "Comentario no encontrado"
            });
        }

        const idUsuario = String(req.usuario.id);

        const yaTieneLike = comentario.likes.some(
            (id) => String(id) === idUsuario
        );

        if (yaTieneLike) {
            comentario.likes.pull(req.usuario.id);
        } else {
            comentario.likes.push(req.usuario.id);
        }

        await comentario.save();

        return res.json({
            mensaje: yaTieneLike
                ? "Like eliminado"
                : "Like agregado",

            comentario: {
                id: String(comentario._id),
                totalLikes: comentario.likes.length,
                meGusta: !yaTieneLike
            }
        });

    } catch (error) {
        console.error("Error al dar like al comentario:", error);

        return res.status(500).json({
            mensaje: "Error al dar like al comentario"
        });
    }
}

// POST /api/publicaciones/:id/comentarios/:comentarioId/like
async function alternarLikeComentario(req, res) {
    try {
        const { id, comentarioId } = req.params;

        const comentario = await Comentario.findOne({
            _id: comentarioId,
            publicacion: id
        });

        if (!comentario) {
            return res.status(404).json({
                mensaje: "Comentario no encontrado"
            });
        }

        const idUsuario = String(req.usuario.id);

        const yaTieneLike = comentario.likes.some(
            (id) => String(id) === idUsuario
        );

        // Agregar o quitar el like.
        if (yaTieneLike) {
            comentario.likes.pull(req.usuario.id);
        } else {
            comentario.likes.push(req.usuario.id);
        }

        await comentario.save();

        // Crear una notificación únicamente al agregar el like.
        // No notificar cuando el usuario da like a su propio comentario.
        if (
            !yaTieneLike &&
            String(comentario.autor) !== idUsuario
        ) {
            try {
                await Notificacion.create({
                    destinatario: comentario.autor,
                    emisor: req.usuario.id,
                    tipo: "like",
                    mensaje: "Le dio me gusta a tu comentario.",
                    enlace: `/publicaciones/${id}`
                });
            } catch (errorNotificacion) {
                // Un error en la notificación no debe impedir el like.
                console.error(
                    "Error al crear notificación de like al comentario:",
                    errorNotificacion
                );
            }
        }

        return res.json({
            mensaje: yaTieneLike
                ? "Like eliminado"
                : "Like agregado",

            comentario: {
                id: String(comentario._id),
                totalLikes: comentario.likes.length,
                meGusta: !yaTieneLike
            }
        });

    } catch (error) {
        console.error(
            "Error al dar like al comentario:",
            error
        );

        return res.status(500).json({
            mensaje: "Error al dar like al comentario"
        });
    }
}

// POST /api/publicaciones/:id/comentarios/:comentarioId/respuestas
async function agregarRespuesta(req, res) {
    try {
        const { id, comentarioId } = req.params;

        const publicacion = await Publicacion.findById(id).select("_id");

        if (!publicacion) {
            return res.status(404).json({
                mensaje: "Publicación no encontrada"
            });
        }

        const comentario = await Comentario.findOne({
            _id: comentarioId,
            publicacion: publicacion._id
        });

        if (!comentario) {
            return res.status(404).json({
                mensaje: "Comentario no encontrado"
            });
        }

        const texto = (req.body.texto || "").trim();

        if (!texto) {
            return res.status(400).json({
                mensaje: "La respuesta no puede estar vacía"
            });
        }

        if (texto.length > 500) {
            return res.status(400).json({
                mensaje: "La respuesta no puede superar los 500 caracteres"
            });
        }

        const responderA = req.body.responderA || null;

        let mencionado = comentario.autor;

        if (responderA) {
            const respuestaObjetivo = await Respuesta.findOne({
                _id: responderA,
                comentario: comentario._id
            });

            if (!respuestaObjetivo) {
                return res.status(404).json({
                    mensaje: "La respuesta a la que intentas contestar no existe"
                });
            }

            mencionado = respuestaObjetivo.autor;
        }

        const respuesta = await Respuesta.create({
            comentario: comentario._id,
            publicacion: publicacion._id,
            autor: req.usuario.id,
            texto,
            responderA,
            mencionado
        });

        await respuesta.populate([
            {
                path: "autor",
                select: CAMPOS_AUTOR
            },
            {
                path: "mencionado",
                select: CAMPOS_AUTOR
            }
        ]);

        // Detectar menciones y notificar a los usuarios mencionados.
        await notificarMenciones(
            texto,
            req.usuario.id,
            `/publicaciones/${publicacion._id}`,
            "una respuesta"
        );

        const formatearAutor = (autor) => {
            if (!autor) return null;

            return {
                id: String(autor._id),
                nombre: autor.nombre,
                username: autor.username,
                fotoPerfil: autor.fotoPerfil
            };
        };

        return res.status(201).json({
            mensaje: "Respuesta publicada",

            respuesta: {
                id: String(respuesta._id),
                texto: respuesta.texto,
                fecha: respuesta.fecha,
                autor: formatearAutor(respuesta.autor),

                responderA: respuesta.responderA
                    ? String(respuesta.responderA)
                    : null,

                mencionado: formatearAutor(respuesta.mencionado),

                likes: [],
                totalLikes: 0,
                meGusta: false
            },

            totalComentarios: await contarInteracciones(publicacion._id)
        });

    } catch (error) {
        console.error("Error al agregar respuesta:", error);

        return res.status(500).json({
            mensaje: "Error al publicar la respuesta"
        });
    }
}

// POST /api/publicaciones/:id/comentarios/:comentarioId/respuestas/:respuestaId/like
async function alternarLikeRespuesta(req, res) {
    try {
        const {
            id,
            comentarioId,
            respuestaId
        } = req.params;

        const respuesta = await Respuesta.findOne({
            _id: respuestaId,
            comentario: comentarioId,
            publicacion: id
        });

        if (!respuesta) {
            return res.status(404).json({
                mensaje: "Respuesta no encontrada"
            });
        }

        const idUsuario = String(req.usuario.id);

        const yaTieneLike = respuesta.likes.some(
            (id) => String(id) === idUsuario
        );

        // Agregar o quitar el like.
        if (yaTieneLike) {
            respuesta.likes.pull(req.usuario.id);
        } else {
            respuesta.likes.push(req.usuario.id);
        }

        await respuesta.save();

        // Notificar al autor cuando alguien da like a su respuesta.
        // No crear notificaciones al quitar un like ni al darse
        // like a uno mismo.
        if (
            !yaTieneLike &&
            String(respuesta.autor) !== idUsuario
        ) {
            try {
                await Notificacion.create({
                    destinatario: respuesta.autor,
                    emisor: req.usuario.id,
                    tipo: "like",
                    mensaje: "Le dio me gusta a tu respuesta.",
                    enlace: `/publicaciones/${id}`
                });
            } catch (errorNotificacion) {
                // La notificación no debe impedir que funcione el like.
                console.error(
                    "Error al crear notificación de like a la respuesta:",
                    errorNotificacion
                );
            }
        }

        return res.json({
            mensaje: yaTieneLike
                ? "Like eliminado"
                : "Like agregado",

            respuesta: {
                id: String(respuesta._id),
                totalLikes: respuesta.likes.length,
                meGusta: !yaTieneLike
            }
        });

    } catch (error) {
        console.error(
            "Error al dar like a la respuesta:",
            error
        );

        return res.status(500).json({
            mensaje: "Error al dar like a la respuesta"
        });
    }
}


// DELETE /api/publicaciones/:id/comentarios/:comentarioId
async function eliminarComentario(req, res) {
    try {
        const { id, comentarioId } = req.params;
        const idUsuario = String(req.usuario.id);

        // Validar los identificadores.
        if (
            !mongoose.isValidObjectId(id) ||
            !mongoose.isValidObjectId(comentarioId)
        ) {
            return res.status(400).json({
                mensaje: "Los identificadores no son válidos"
            });
        }

        // Buscar la publicación.
        const publicacion = await Publicacion.findById(id)
            .select("autor");

        if (!publicacion) {
            return res.status(404).json({
                mensaje: "Publicación no encontrada"
            });
        }

        // Buscar el comentario dentro de esa publicación.
        const comentario = await Comentario.findOne({
            _id: comentarioId,
            publicacion: publicacion._id
        });

        if (!comentario) {
            return res.status(404).json({
                mensaje: "Comentario no encontrado"
            });
        }

        const esDuenioPublicacion =
            String(publicacion.autor) === idUsuario;

        const esAutorComentario =
            String(comentario.autor) === idUsuario;

        // El dueño de la publicación o el autor del comentario
        // pueden eliminarlo.
        if (!esDuenioPublicacion && !esAutorComentario) {
            return res.status(403).json({
                mensaje: "No tienes permiso para eliminar este comentario"
            });
        }

        // Eliminar todas las respuestas del comentario,
        // incluidas las respuestas a otras respuestas.
        const respuestas = await Respuesta.find({
            comentario: comentario._id,
            publicacion: publicacion._id
        }).select("_id responderA");

        const idsRespuestas = new Set(
            respuestas.map((respuesta) => String(respuesta._id))
        );

        // Eliminar el comentario y todas sus respuestas.
        await Respuesta.deleteMany({
            comentario: comentario._id,
            publicacion: publicacion._id
        });

        await comentario.deleteOne();

        return res.json({
            mensaje: "Comentario eliminado correctamente",
            comentarioId: String(comentario._id),
            respuestasEliminadas: idsRespuestas.size,
            totalComentarios: await contarInteracciones(publicacion._id)
        });

    } catch (error) {
        console.error("Error al eliminar comentario:", error);

        return res.status(500).json({
            mensaje: "Error al eliminar el comentario"
        });
    }
}

// DELETE /api/publicaciones/:id/comentarios/:comentarioId/respuestas/:respuestaId
async function eliminarRespuesta(req, res) {
    try {
        const { id, comentarioId, respuestaId } = req.params;
        const idUsuario = String(req.usuario.id);

        // Validar los identificadores.
        if (
            !mongoose.isValidObjectId(id) ||
            !mongoose.isValidObjectId(comentarioId) ||
            !mongoose.isValidObjectId(respuestaId)
        ) {
            return res.status(400).json({
                mensaje: "Los identificadores no son válidos"
            });
        }

        // Buscar la publicación.
        const publicacion = await Publicacion.findById(id)
            .select("autor");

        if (!publicacion) {
            return res.status(404).json({
                mensaje: "Publicación no encontrada"
            });
        }

        // Comprobar que el comentario pertenece a la publicación.
        const comentario = await Comentario.findOne({
            _id: comentarioId,
            publicacion: publicacion._id
        }).select("_id");

        if (!comentario) {
            return res.status(404).json({
                mensaje: "Comentario no encontrado"
            });
        }

        // Comprobar que la respuesta pertenece al comentario
        // y a la publicación indicada.
        const respuesta = await Respuesta.findOne({
            _id: respuestaId,
            comentario: comentario._id,
            publicacion: publicacion._id
        });

        if (!respuesta) {
            return res.status(404).json({
                mensaje: "Respuesta no encontrada"
            });
        }

        const esDuenioPublicacion =
            String(publicacion.autor) === idUsuario;

        const esAutorRespuesta =
            String(respuesta.autor) === idUsuario;

        // El dueño de la publicación o el autor de la respuesta
        // pueden eliminarla.
        if (!esDuenioPublicacion && !esAutorRespuesta) {
            return res.status(403).json({
                mensaje: "No tienes permiso para eliminar esta respuesta"
            });
        }

        // Obtener todas las respuestas de este comentario.
        const respuestas = await Respuesta.find({
            comentario: comentario._id,
            publicacion: publicacion._id
        }).select("_id responderA");

        // Empezar con la respuesta que queremos eliminar.
        const idsEliminar = new Set([String(respuesta._id)]);

        // Encontrar recursivamente las respuestas que dependen
        // de la respuesta seleccionada.
        let huboCambios = true;

        while (huboCambios) {
            huboCambios = false;

            for (const item of respuestas) {
                const idActual = String(item._id);
                const idPadre = item.responderA
                    ? String(item.responderA)
                    : null;

                if (
                    idPadre &&
                    idsEliminar.has(idPadre) &&
                    !idsEliminar.has(idActual)
                ) {
                    idsEliminar.add(idActual);
                    huboCambios = true;
                }
            }
        }

        // Eliminar solamente la respuesta seleccionada
        // y sus respuestas dependientes.
        const resultado = await Respuesta.deleteMany({
            _id: {
                $in: [...idsEliminar]
            },
            comentario: comentario._id,
            publicacion: publicacion._id
        });

        return res.json({
            mensaje: "Respuesta eliminada correctamente",
            respuestaId: String(respuesta._id),
            respuestasEliminadas: resultado.deletedCount,
            totalComentarios: await contarInteracciones(publicacion._id)
        });

    } catch (error) {
        console.error("Error al eliminar respuesta:", error);

        return res.status(500).json({
            mensaje: "Error al eliminar la respuesta"
        });
    }
}

// PUT /api/publicaciones/:id/comentarios/:comentarioId
async function actualizarComentario(req, res) {
    try {
        const { id, comentarioId } = req.params;
        const idUsuario = String(req.usuario.id);

        // Validar los identificadores.
        if (
            !mongoose.isValidObjectId(id) ||
            !mongoose.isValidObjectId(comentarioId)
        ) {
            return res.status(400).json({
                mensaje: "Los identificadores no son válidos"
            });
        }

        // Comprobar que existe la publicación.
        const publicacion = await Publicacion.findById(id).select("_id");

        if (!publicacion) {
            return res.status(404).json({
                mensaje: "Publicación no encontrada"
            });
        }

        // Buscar el comentario dentro de esa publicación.
        const comentario = await Comentario.findOne({
            _id: comentarioId,
            publicacion: publicacion._id
        });

        if (!comentario) {
            return res.status(404).json({
                mensaje: "Comentario no encontrado"
            });
        }

        // Solo el autor puede editar su comentario.
        if (String(comentario.autor) !== idUsuario) {
            return res.status(403).json({
                mensaje: "Solo puedes editar tus propios comentarios"
            });
        }

        // Validar el texto.
        if (typeof req.body.texto !== "string") {
            return res.status(400).json({
                mensaje: "El texto del comentario no es válido"
            });
        }

        const texto = req.body.texto.trim();

        if (!texto) {
            return res.status(400).json({
                mensaje: "El comentario no puede estar vacío"
            });
        }

        if (texto.length > 500) {
            return res.status(400).json({
                mensaje: "El comentario no puede superar los 500 caracteres"
            });
        }

        comentario.texto = texto;
        await comentario.save();
        await comentario.populate("autor", CAMPOS_AUTOR);

        return res.json({
            mensaje: "Comentario actualizado correctamente",
            comentario: {
                id: String(comentario._id),
                texto: comentario.texto,
                fecha: comentario.fecha,
                autor: {
                    id: String(comentario.autor._id),
                    nombre: comentario.autor.nombre,
                    username: comentario.autor.username,
                    fotoPerfil: comentario.autor.fotoPerfil
                }
            }
        });
    } catch (error) {
        console.error("Error al actualizar comentario:", error);

        return res.status(500).json({
            mensaje: "Error al actualizar el comentario"
        });
    }
}

// PUT /api/publicaciones/:id/comentarios/:comentarioId/respuestas/:respuestaId
async function actualizarRespuesta(req, res) {
    try {
        const { id, comentarioId, respuestaId } = req.params;
        const idUsuario = String(req.usuario.id);

        // Validar los identificadores.
        if (
            !mongoose.isValidObjectId(id) ||
            !mongoose.isValidObjectId(comentarioId) ||
            !mongoose.isValidObjectId(respuestaId)
        ) {
            return res.status(400).json({
                mensaje: "Los identificadores no son válidos"
            });
        }

        // Comprobar que existe la publicación.
        const publicacion = await Publicacion.findById(id).select("_id");

        if (!publicacion) {
            return res.status(404).json({
                mensaje: "Publicación no encontrada"
            });
        }

        // Comprobar que el comentario pertenece a la publicación.
        const comentario = await Comentario.findOne({
            _id: comentarioId,
            publicacion: publicacion._id
        }).select("_id");

        if (!comentario) {
            return res.status(404).json({
                mensaje: "Comentario no encontrado"
            });
        }

        // Buscar la respuesta dentro del comentario y la publicación.
        const respuesta = await Respuesta.findOne({
            _id: respuestaId,
            comentario: comentario._id,
            publicacion: publicacion._id
        });

        if (!respuesta) {
            return res.status(404).json({
                mensaje: "Respuesta no encontrada"
            });
        }

        // Solo el autor puede editar su respuesta.
        if (String(respuesta.autor) !== idUsuario) {
            return res.status(403).json({
                mensaje: "Solo puedes editar tus propias respuestas"
            });
        }

        // Validar el texto.
        if (typeof req.body.texto !== "string") {
            return res.status(400).json({
                mensaje: "El texto de la respuesta no es válido"
            });
        }

        const texto = req.body.texto.trim();

        if (!texto) {
            return res.status(400).json({
                mensaje: "La respuesta no puede estar vacía"
            });
        }

        if (texto.length > 500) {
            return res.status(400).json({
                mensaje: "La respuesta no puede superar los 500 caracteres"
            });
        }

        respuesta.texto = texto;
        await respuesta.save();

        await respuesta.populate([
            {
                path: "autor",
                select: CAMPOS_AUTOR
            },
            {
                path: "mencionado",
                select: CAMPOS_AUTOR
            }
        ]);

        const formatearAutor = (autor) => {
            if (!autor) return null;

            return {
                id: String(autor._id),
                nombre: autor.nombre,
                username: autor.username,
                fotoPerfil: autor.fotoPerfil
            };
        };

        return res.json({
            mensaje: "Respuesta actualizada correctamente",
            respuesta: {
                id: String(respuesta._id),
                texto: respuesta.texto,
                fecha: respuesta.fecha,
                autor: formatearAutor(respuesta.autor),
                responderA: respuesta.responderA
                    ? String(respuesta.responderA)
                    : null,
                mencionado: formatearAutor(respuesta.mencionado),
                likes: (respuesta.likes || []).map(
                    (like) => String(like)
                ),
                totalLikes: (respuesta.likes || []).length,
                meGusta: (respuesta.likes || []).some(
                    (like) => String(like) === idUsuario
                )
            }
        });
    } catch (error) {
        console.error("Error al actualizar respuesta:", error);

        return res.status(500).json({
            mensaje: "Error al actualizar la respuesta"
        });
    }
}


module.exports = {
    CAMPOS_AUTOR,
    formatearPublicacion,
    listarPublicaciones,
    obtenerPublicacion,
    crearPublicacion,
    actualizarPublicacion,
    eliminarPublicacion,
    alternarLike,
    listarComentarios,
    agregarComentario,
    agregarRespuesta,
    alternarLikeComentario,
    alternarLikeRespuesta,
    eliminarComentario,
    eliminarRespuesta,
    actualizarComentario,
    actualizarRespuesta
};
