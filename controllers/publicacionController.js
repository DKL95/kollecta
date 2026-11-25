
const mongoose = require("mongoose");

const Publicacion = require("../models/Publicacion");
const {
    guardarImagen,
    eliminarImagen
} = require("../middleware/upload");

const {
    guardarVideo,
    eliminarVideo
} = require("../services/videoStorage");

const fs = require("fs");

const Comentario = require("../models/Comentario");
const Respuesta = require("../models/Respuesta");

const { crearNotificacion } = require("./notificacionController");
const Usuario = require("../models/Usuario");

const CAMPOS_AUTOR = "nombre username fotoPerfil rol activo";
const { alcanza } = require("../middleware/roles");
const logger = require("../config/logger");
const { normalizarGif, ErrorGif } = require("../services/gifs");

// Lee el GIF del cuerpo; responde 400 si no es válido (regresa undefined en ese caso).
function leerGif(req, res) {
    try {
        return { gif: normalizarGif(req.body?.gif) };
    } catch (error) {
        if (!(error instanceof ErrorGif)) throw error;
        res.status(400).json({ mensaje: error.message });
        return undefined;
    }
}

// La moderación (moderador+) puede ver contenido oculto; el resto solo el suyo.
function esModeracion(req) {
    return alcanza(req.usuario?.rol, "moderador");
}

// Filtro de Mongo: lo visible para todos más lo propio (aunque esté oculto).
function filtroVisible(idUsuarioActual, campoAutor = "autor") {
    return { $or: [{ oculto: null }, { [campoAutor]: idUsuarioActual }] };
}

// Detectar menciones y crear sus notificaciones.
async function notificarMenciones(texto, emisorId, enlace, contexto, io) {
    try {
        logger.debug("🔎 Texto recibido:", texto);
        logger.debug("👤 ID del emisor:", String(emisorId));

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

        logger.debug("🏷️ Usuarios detectados:", usernames);

        if (usernames.length === 0) {
            logger.debug("⚠️ No se detectaron menciones.");
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

        logger.debug(
            "👥 Usuarios encontrados:",
            usuarios.map((usuario) => ({
                id: String(usuario._id),
                username: usuario.username
            }))
        );

        for (const usuario of usuarios) {
            if (String(usuario._id) === String(emisorId)) {
                logger.debug(
                    "⏭️ Se omite la notificación al propio usuario:",
                    usuario.username
                );
                continue;
            }

            const notificacion = await crearNotificacion({
                destinatario: usuario._id,
                emisor: emisorId,
                tipo: "mencion",
                mensaje: `Te mencionaron en ${contexto}.`,
                enlace,
                io
            });

            logger.debug(
                "✅ Notificación creada:",
                String(notificacion._id),
                "para @",
                usuario.username
            );
        }
    } catch (error) {
        logger.error(
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
        videos: publicacion.videos || [],
        gif: publicacion.gif || null,
        fechaCreacion: publicacion.fechaCreacion,

        autor: {
            id: autor._id,
            nombre: autor.nombre,
            username: autor.username,
            fotoPerfil: autor.fotoPerfil,
            rol: autor.rol || "usuario"
        },

        totalLikes: likes.length,
        totalComentarios,

        // Ocultada por moderación: solo llega a su autor o a la moderación.
        oculta: Boolean(publicacion.oculto),
        motivoOculto: publicacion.oculto?.motivo || "",

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
        const filtro = {
            ...(req.query.grupo ? { grupo: req.query.grupo } : {}),
            ...filtroVisible(req.usuario.id)
        };

        const publicaciones = await Publicacion.find(filtro)
            .sort({ fechaCreacion: -1 })
            .limit(50)
            .populate("autor", CAMPOS_AUTOR);

        // Las cuentas baneadas desaparecen del feed.
        const publicacionesFormateadas = await Promise.all(
            publicaciones.filter((p) => p.autor?.activo !== false).map((publicacion) =>
                formatearPublicacion(publicacion, req.usuario.id)
            )
        );

        return res.json({
            publicaciones: publicacionesFormateadas
        });
    } catch (error) {
        logger.error("Error al listar publicaciones:", error);

        return res.status(500).json({
            mensaje: "Error al obtener las publicaciones"
        });
    }
}

// GET /api/publicaciones/:id
async function obtenerPublicacion(req, res) {
    try {
        
        const publicacion = await buscarPorId(req.params.id);

        const esAutor = publicacion && String(publicacion.autor?._id) === String(req.usuario.id);
        const ocultaParaMi = publicacion && !esAutor && !esModeracion(req) &&
            (publicacion.oculto || publicacion.autor?.activo === false);

        if (!publicacion || ocultaParaMi) {
            logger.debug("No se encontró la publicación.");

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
        logger.error("Error al obtener publicación:", error);

        return res.status(500).json({
            mensaje: "Error al obtener la publicación"
        });
    }
}

// POST /api/publicaciones
// Crear publicación con hasta 10 imágenes.
async function crearPublicacion(req, res) {
    const imagenesGuardadas = [];
    const videosGuardados = [];

    const archivos = req.files || {};
    const archivosImagenes = archivos.imagenes || [];
    const archivosVideos = archivos.videos || [];

    // Eliminar archivos temporales que todavía existan.
    async function limpiarTemporales() {
        const todosLosArchivos = [
            ...archivosImagenes,
            ...archivosVideos
        ];

        await Promise.all(
            todosLosArchivos.map((archivo) =>
                archivo.path
                    ? fs.promises.unlink(archivo.path).catch(() => {})
                    : Promise.resolve()
            )
        );
    }

    try {
        const cuerpo = req.body || {};
        const texto = (cuerpo.texto || "").trim();

        let gif;
        try {
            gif = normalizarGif(cuerpo.gif);
        } catch (error) {
            if (!(error instanceof ErrorGif)) throw error;
            await limpiarTemporales();
            return res.status(400).json({ mensaje: error.message });
        }

        if (!texto && !gif) {
            await limpiarTemporales();

            return res.status(400).json({
                mensaje: "La publicación no puede estar vacía"
            });
        }

        if (texto.length > 1000) {
            await limpiarTemporales();

            return res.status(400).json({
                mensaje: "La publicación no puede pasar de 1000 caracteres"
            });
        }

        // Comprobar los límites de archivos.
        if (archivosImagenes.length > 10) {
            await limpiarTemporales();

            return res.status(400).json({
                mensaje: "Una publicación puede tener máximo 10 imágenes"
            });
        }

        if (archivosVideos.length > 5) {
            await limpiarTemporales();

            return res.status(400).json({
                mensaje: "Una publicación puede tener máximo 5 videos"
            });
        }

        // Guardar las imágenes.
        for (const archivo of archivosImagenes) {
            const imagen = await guardarImagen(
                archivo,
                req.usuario.id
            );

            imagenesGuardadas.push(imagen);
        }

        // Guardar los videos en MongoDB GridFS.
        for (const archivo of archivosVideos) {
            try {
                const video = await guardarVideo(
                    archivo,
                    req.usuario.id
                );

                videosGuardados.push(video);
            } finally {
                // El video ya se guardó en GridFS o falló la subida.
                // En ambos casos, limpiar el archivo temporal.
                if (archivo.path) {
                    await fs.promises.unlink(archivo.path).catch(() => {});
                }
            }
        }

        // Crear la publicación con ambas listas multimedia.
        const nuevaPublicacion = await Publicacion.create({
            autor: req.usuario.id,
            texto,
            grupo: cuerpo.grupo || "",
            imagenes: imagenesGuardadas,
            videos: videosGuardados,
            gif
        });

        await nuevaPublicacion.populate("autor", CAMPOS_AUTOR);

        // Conservar el sistema actual de notificaciones por menciones.
        await notificarMenciones(
            texto,
            req.usuario.id,
            `/publicaciones/${nuevaPublicacion._id}`,
            "una publicación",
            req.app.get("io")
        );

        const publicacionFormateada = await formatearPublicacion(
            nuevaPublicacion,
            req.usuario.id
        );

        return res.status(201).json({
            mensaje: "Publicación creada",
            publicacion: publicacionFormateada
        });

    } catch (error) {
        // Eliminar imágenes que ya se hayan guardado.
        for (const imagen of imagenesGuardadas) {
            await eliminarImagen(imagen).catch((errorLimpieza) => {
                logger.error(
                    "No se pudo limpiar una imagen:",
                    errorLimpieza
                );
            });
        }

        // Eliminar videos que ya se hayan guardado en GridFS.
        for (const video of videosGuardados) {
            const idVideo = video.split("/").pop();

            await eliminarVideo(idVideo).catch((errorLimpieza) => {
                logger.error(
                    "No se pudo limpiar un video:",
                    errorLimpieza
                );
            });
        }

        await limpiarTemporales();

        logger.error("Error al crear publicación:", error);

        return res.status(500).json({
            mensaje: "Error al crear la publicación"
        });
    }
}

// PUT /api/publicaciones/:id
// Editar publicación, imágenes y videos.
async function actualizarPublicacion(req, res) {
    const imagenesNuevas = [];
    const videosNuevos = [];

    const archivos = req.files || {};
    const archivosImagenes = archivos.imagenes || [];
    const archivosVideos = archivos.videos || [];

    async function limpiarTemporales() {
        const todosLosArchivos = [
            ...archivosImagenes,
            ...archivosVideos
        ];

        await Promise.all(
            todosLosArchivos.map((archivo) =>
                archivo.path
                    ? fs.promises.unlink(archivo.path).catch(() => {})
                    : Promise.resolve()
            )
        );
    }

    function obtenerListaEliminada(valor, nombre) {
        if (valor === undefined) {
            return [];
        }

        let lista;

        try {
            lista = typeof valor === "string"
                ? JSON.parse(valor)
                : valor;
        } catch {
            throw new Error(
                `La lista de ${nombre} eliminados no es válida`
            );
        }

        if (
            !Array.isArray(lista) ||
            !lista.every((elemento) => typeof elemento === "string")
        ) {
            throw new Error(
                `La lista de ${nombre} eliminados no es válida`
            );
        }

        return lista;
    }

    try {
        const publicacion = await buscarPorId(req.params.id);

        if (!publicacion) {
            await limpiarTemporales();

            return res.status(404).json({
                mensaje: "Publicación no encontrada"
            });
        }

        if (
            String(publicacion.autor._id) !==
            String(req.usuario.id)
        ) {
            await limpiarTemporales();

            return res.status(403).json({
                mensaje: "Solo el autor puede editar esta publicación"
            });
        }

        const {
            texto,
            grupo,
            imagenesEliminadas,
            videosEliminados
        } = req.body || {};

        if (req.body?.gif !== undefined) {
            try {
                publicacion.gif = normalizarGif(req.body.gif);
            } catch (error) {
                if (!(error instanceof ErrorGif)) throw error;
                await limpiarTemporales();
                return res.status(400).json({ mensaje: error.message });
            }
        }

        if (texto !== undefined) {
            if (typeof texto !== "string" || (!texto.trim() && !publicacion.gif)) {
                await limpiarTemporales();

                return res.status(400).json({
                    mensaje: "La publicación no puede estar vacía"
                });
            }

            if (texto.trim().length > 1000) {
                await limpiarTemporales();

                return res.status(400).json({
                    mensaje: "La publicación no puede pasar de 1000 caracteres"
                });
            }

            publicacion.texto = texto.trim();
        }

        if (grupo !== undefined) {
            publicacion.grupo = grupo;
        }

        // Conservar las imágenes actuales.
        const imagenesActuales = publicacion.imagenes?.length
            ? [...publicacion.imagenes]
            : (publicacion.imagen ? [publicacion.imagen] : []);

        // Conservar los videos actuales.
        const videosActuales = [...(publicacion.videos || [])];

        let imagenesPorEliminar;
        let videosPorEliminar;

        try {
            imagenesPorEliminar = obtenerListaEliminada(
                imagenesEliminadas,
                "imágenes"
            );

            videosPorEliminar = obtenerListaEliminada(
                videosEliminados,
                "videos"
            );
        } catch (error) {
            await limpiarTemporales();

            return res.status(400).json({
                mensaje: error.message
            });
        }

        // Evitar que se intenten eliminar archivos que no pertenecen
        // a esta publicación.
        const imagenesNoEncontradas = imagenesPorEliminar.filter(
            (imagen) => !imagenesActuales.includes(imagen)
        );

        const videosNoEncontrados = videosPorEliminar.filter(
            (video) => !videosActuales.includes(video)
        );

        if (imagenesNoEncontradas.length || videosNoEncontrados.length) {
            await limpiarTemporales();

            return res.status(400).json({
                mensaje: "La lista de archivos por eliminar no es válida"
            });
        }

        const imagenesRestantes = imagenesActuales.filter(
            (imagen) => !imagenesPorEliminar.includes(imagen)
        );

        const videosRestantes = videosActuales.filter(
            (video) => !videosPorEliminar.includes(video)
        );

        // Comprobar límites antes de guardar los nuevos archivos.
        if (imagenesRestantes.length + archivosImagenes.length > 10) {
            await limpiarTemporales();

            return res.status(400).json({
                mensaje: "Una publicación puede tener máximo 10 imágenes"
            });
        }

        if (videosRestantes.length + archivosVideos.length > 5) {
            await limpiarTemporales();

            return res.status(400).json({
                mensaje: "Una publicación puede tener máximo 5 videos"
            });
        }

        // Guardar las imágenes nuevas.
        for (const archivo of archivosImagenes) {
            const imagen = await guardarImagen(
                archivo,
                req.usuario.id
            );

            imagenesNuevas.push(imagen);
        }

        // Guardar los videos nuevos.
        for (const archivo of archivosVideos) {
            try {
                const video = await guardarVideo(
                    archivo,
                    req.usuario.id
                );

                videosNuevos.push(video);
            } finally {
                if (archivo.path) {
                    await fs.promises.unlink(archivo.path).catch(() => {});
                }
            }
        }

        const imagenesFinales = [
            ...imagenesRestantes,
            ...imagenesNuevas
        ];

        const videosFinales = [
            ...videosRestantes,
            ...videosNuevos
        ];

        // Guardar la publicación antes de eliminar los archivos antiguos.
        try {
            publicacion.imagenes = imagenesFinales;
            publicacion.imagen = "";
            publicacion.videos = videosFinales;

            await publicacion.save();
        } catch (error) {
            for (const imagen of imagenesNuevas) {
                await eliminarImagen(imagen).catch(() => {});
            }

            for (const video of videosNuevos) {
                const idVideo = video.split("/").pop();

                await eliminarVideo(idVideo).catch(() => {});
            }

            throw error;
        }

        // Eliminar las imágenes que el usuario quitó.
        for (const imagen of imagenesPorEliminar) {
            await eliminarImagen(imagen).catch((error) => {
                logger.error(
                    "No se pudo eliminar una imagen:",
                    error
                );
            });
        }

        // Eliminar los videos que el usuario quitó.
        for (const video of videosPorEliminar) {
            const idVideo = video.split("/").pop();

            await eliminarVideo(idVideo).catch((error) => {
                logger.error(
                    "No se pudo eliminar un video:",
                    error
                );
            });
        }

        await publicacion.populate("autor", CAMPOS_AUTOR);

        const publicacionFormateada = await formatearPublicacion(
            publicacion,
            req.usuario.id
        );

        return res.json({
            mensaje: "Publicación actualizada",
            publicacion: publicacionFormateada
        });

    } catch (error) {
        await limpiarTemporales();

        for (const imagen of imagenesNuevas) {
            await eliminarImagen(imagen).catch(() => {});
        }

        for (const video of videosNuevos) {
            const idVideo = video.split("/").pop();

            await eliminarVideo(idVideo).catch(() => {});
        }

        logger.error("Error al actualizar publicación:", error);

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

        // Comprobar que el usuario sea el autor.
        if (
            String(publicacion.autor._id) !==
            String(req.usuario.id)
        ) {
            return res.status(403).json({
                mensaje: "Solo el autor puede eliminar esta publicación"
            });
        }

        // Obtener las imágenes, incluyendo publicaciones antiguas.
        const imagenes = publicacion.imagenes?.length
            ? [...publicacion.imagenes]
            : (publicacion.imagen ? [publicacion.imagen] : []);

        // Obtener los videos asociados.
        const videos = [...(publicacion.videos || [])];

        // Eliminar la publicación de la base de datos, con sus comentarios y respuestas.
        await publicacion.deleteOne();
        await Promise.all([
            Comentario.deleteMany({ publicacion: publicacion._id }),
            Respuesta.deleteMany({ publicacion: publicacion._id })
        ]);

        // Eliminar sus imágenes almacenadas.
        for (const imagen of imagenes) {
            await eliminarImagen(imagen).catch((error) => {
                logger.error(
                    "No se pudo eliminar una imagen:",
                    error
                );
            });
        }

        // Eliminar sus videos de GridFS.
        for (const video of videos) {
            const idVideo = video.split("/").pop();

            await eliminarVideo(idVideo).catch((error) => {
                logger.error(
                    "No se pudo eliminar un video:",
                    error
                );
            });
        }

        return res.json({
            mensaje: "Publicación eliminada"
        });

    } catch (error) {
        logger.error("Error al eliminar publicación:", error);

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
                await crearNotificacion({
                    destinatario: publicacion.autor._id,
                    emisor: req.usuario.id,
                    tipo: "like",
                    mensaje: "Le dio me gusta a tu publicación.",
                    enlace: `/publicaciones/${publicacion._id}`,
                    io: req.app.get("io")
                });
            } catch (error) {
                logger.error(
                    "Error al crear notificación:",
                    error
                );
            }
        }

        await publicacion.populate("autor", CAMPOS_AUTOR);

        return res.json({
            publicacion: await formatearPublicacion(
                publicacion,
                req.usuario.id
            )
        });
    } catch (error) {
        logger.error("Error al dar like:", error);

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
        const lectura = leerGif(req, res);
        if (!lectura) return;
        const { gif } = lectura;

        if (!texto && !gif) {
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
            texto,
            gif
        });

        await comentario.populate("autor", CAMPOS_AUTOR);

        const autor = comentario.autor;

        // Crear una notificación si el comentario es de otra persona.
        const idAutorPublicacion = String(publicacion.autor._id);
        const idAutorComentario = String(req.usuario.id);

        if (idAutorPublicacion !== idAutorComentario) {
            try {
                const textoNotificacion = !texto
                    ? "GIF"
                    : texto.length > 100
                        ? `${texto.slice(0, 100)}...`
                        : texto;

                await crearNotificacion({
                    destinatario: publicacion.autor._id,
                    emisor: req.usuario.id,
                    tipo: "comentario",
                    mensaje: `comentó tu publicación: "${textoNotificacion}"`,
                    enlace: `/publicaciones/${publicacion._id}`,
                    io: req.app.get("io")
                });
            } catch (error) {
                // Un error de notificación no debe impedir publicar.
                logger.error(
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
            "un comentario",
            req.app.get("io")
        );

        return res.status(201).json({
            mensaje: "Comentario publicado",

            comentario: {
                id: String(comentario._id),
                texto: comentario.texto,
                gif: comentario.gif || null,
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
        logger.error("Error al agregar comentario:", error);

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

        const verOcultos = esModeracion(req);
        const comentariosDB = await Comentario.find({
            publicacion: publicacion._id,
            ...(verOcultos ? {} : filtroVisible(req.usuario.id))
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
                fotoPerfil: autor.fotoPerfil,
                rol: autor.rol || "usuario"
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
                gif: respuesta.gif || null,
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
                gif: comentario.gif || null,
                fecha: comentario.fecha,
                autor: formatearAutor(comentario.autor),
                oculto: Boolean(comentario.oculto),
                motivoOculto: comentario.oculto?.motivo || "",

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
        logger.error("Error al listar comentarios:", error);

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
        logger.error("Error al dar like al comentario:", error);

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
                await crearNotificacion({
                    destinatario: comentario.autor,
                    emisor: req.usuario.id,
                    tipo: "like",
                    mensaje: "Le dio me gusta a tu comentario.",
                    enlace: `/publicaciones/${id}`,
                    io: req.app.get("io")
                });
            } catch (errorNotificacion) {
                // Un error en la notificación no debe impedir el like.
                logger.error(
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
        logger.error(
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
        const lectura = leerGif(req, res);
        if (!lectura) return;
        const { gif } = lectura;

        if (!texto && !gif) {
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
            gif,
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
            "una respuesta",
            req.app.get("io")
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
                gif: respuesta.gif || null,
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
        logger.error("Error al agregar respuesta:", error);

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
                await crearNotificacion({
                    destinatario: respuesta.autor,
                    emisor: req.usuario.id,
                    tipo: "like",
                    mensaje: "Le dio me gusta a tu respuesta.",
                    enlace: `/publicaciones/${id}`,
                    io: req.app.get("io")
                });
            } catch (errorNotificacion) {
                // La notificación no debe impedir que funcione el like.
                logger.error(
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
        logger.error(
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
        logger.error("Error al eliminar comentario:", error);

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
        logger.error("Error al eliminar respuesta:", error);

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
        logger.error("Error al actualizar comentario:", error);

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
        logger.error("Error al actualizar respuesta:", error);

        return res.status(500).json({
            mensaje: "Error al actualizar la respuesta"
        });
    }
}


module.exports = {
    CAMPOS_AUTOR,
    esModeracion,
    filtroVisible,
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
