
const mongoose = require("mongoose");

const Publicacion = require("../models/Publicacion");
const {
    guardarImagen,
    eliminarImagen
} = require("../middleware/upload");

const Comentario = require("../models/Comentario");
const Respuesta = require("../models/Respuesta");

const Notificacion = require("../models/Notificacion");

const CAMPOS_AUTOR = "nombre username fotoPerfil";

// Da forma a una publicación para el frontend.
function formatearPublicacion(publicacion, idUsuarioActual) {
    const autor = publicacion.autor || {};

    const imagenes = publicacion.imagenes?.length
        ? publicacion.imagenes
        : (publicacion.imagen ? [publicacion.imagen] : []);

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
        totalLikes: publicacion.likes.length,
        totalComentarios: publicacion.comentarios.length,
        meGusta: idUsuarioActual
            ? publicacion.likes.some(
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

        return res.json({
            publicaciones: publicaciones.map((publicacion) =>
                formatearPublicacion(publicacion, req.usuario.id)
            )
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
            return res.status(404).json({
                mensaje: "Publicación no encontrada"
            });
        }

        return res.json({
            publicacion: formatearPublicacion(
                publicacion,
                req.usuario.id
            )
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
        const publicacion = await Publicacion.findById(req.params.id);

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

        const comentario = await Comentario.create({
            publicacion: publicacion._id,
            autor: req.usuario.id,
            texto
        });

        await comentario.populate("autor", CAMPOS_AUTOR);

        const autor = comentario.autor;

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

            totalComentarios: await Comentario.countDocuments({
                publicacion: publicacion._id
            })
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
            totalComentarios: comentarios.length
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
            }
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

        if (yaTieneLike) {
            respuesta.likes.pull(req.usuario.id);
        } else {
            respuesta.likes.push(req.usuario.id);
        }

        await respuesta.save();

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
        console.error("Error al dar like a la respuesta:", error);

        return res.status(500).json({
            mensaje: "Error al dar like a la respuesta"
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
    alternarLikeRespuesta
};
