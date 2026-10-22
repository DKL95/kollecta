const mongoose = require("mongoose");

const Publicacion = require("../models/Publicacion");
const { guardarImagen, eliminarImagen } = require("../middleware/upload");

const CAMPOS_AUTOR = "nombre username fotoPerfil";

// Da forma a una publicación para el frontend (conteos + si el usuario actual le dio like)
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
            ? publicacion.likes.some((id) => id.equals(idUsuarioActual))
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

// GET /api/publicaciones?grupo=TWICE
async function listarPublicaciones(req, res) {
    try {
        const filtro = req.query.grupo ? { grupo: req.query.grupo } : {};

        const publicaciones = await Publicacion.find(filtro)
            .sort({ fechaCreacion: -1 })
            .limit(50)
            .populate("autor", CAMPOS_AUTOR);

        res.json({
            publicaciones: publicaciones.map((p) => formatearPublicacion(p, req.usuario.id))
        });
    } catch (error) {
        console.error("Error al listar publicaciones:", error);
        res.status(500).json({ mensaje: "Error al obtener las publicaciones" });
    }
}

// GET /api/publicaciones/:id
async function obtenerPublicacion(req, res) {
    try {
        const publicacion = await buscarPorId(req.params.id);

        if (!publicacion) {
            return res.status(404).json({ mensaje: "Publicación no encontrada" });
        }

        res.json({ publicacion: formatearPublicacion(publicacion, req.usuario.id) });
    } catch (error) {
        console.error("Error al obtener publicación:", error);
        res.status(500).json({ mensaje: "Error al obtener la publicación" });
    }
}

// POST /api/publicaciones
async function crearPublicacion(req, res) {
    let imagen = "";

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

        if (req.file) {
            imagen = await guardarImagen(req.file, req.usuario.id);
        }

        const nuevaPublicacion = await Publicacion.create({
            autor: req.usuario.id,
            texto,
            grupo: cuerpo.grupo || "",
            imagenes: imagen ? [imagen] : []
        });

        await nuevaPublicacion.populate("autor", CAMPOS_AUTOR);

        res.status(201).json({
            mensaje: "Publicación creada",
            publicacion: formatearPublicacion(
                nuevaPublicacion,
                req.usuario.id
            )
        });
    } catch (error) {
        if (imagen) await eliminarImagen(imagen).catch(() => {});

        console.error("Error al crear publicación:", error);
        res.status(500).json({
            mensaje: "Error al crear la publicación"
        });
    }
}

// PUT /api/publicaciones/:id (solo el autor)
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

        const { texto, grupo, imagenesEliminadas } = req.body || {};

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

        // Compatibilidad con publicaciones antiguas que solo tenían "imagen".
        const actuales = publicacion.imagenes?.length
            ? [...publicacion.imagenes]
            : (publicacion.imagen ? [publicacion.imagen] : []);

        let eliminadas = [];

        if (imagenesEliminadas !== undefined) {
            try {
                eliminadas = JSON.parse(imagenesEliminadas);

                if (
                    !Array.isArray(eliminadas) ||
                    !eliminadas.every((imagen) => typeof imagen === "string")
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

        // Solo se eliminan referencias que pertenecen a esta publicación.
        const restantes = actuales.filter(
            (imagen) => !eliminadas.includes(imagen)
        );

        for (const archivo of req.files || []) {
            imagenesNuevas.push(
                await guardarImagen(archivo, req.usuario.id)
            );
        }

        const resultado = [...restantes, ...imagenesNuevas];

        if (resultado.length > 10) {
            for (const imagen of imagenesNuevas) {
                await eliminarImagen(imagen).catch(() => {});
            }

            return res.status(400).json({
                mensaje: "Una publicación puede tener máximo 10 imágenes"
            });
        }

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
                console.error("No se pudo eliminar una imagen:", error);
            });
        }

        await publicacion.populate("autor", CAMPOS_AUTOR);

        res.json({
            mensaje: "Publicación actualizada",
            publicacion: formatearPublicacion(
                publicacion,
                req.usuario.id
            )
        });
    } catch (error) {
        console.error("Error al actualizar publicación:", error);
        res.status(500).json({
            mensaje: "Error al actualizar la publicación"
        });
    }
}


// DELETE /api/publicaciones/:id  (solo el autor)
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
                console.error("No se pudo eliminar una imagen:", error);
            });
        }

        res.json({ mensaje: "Publicación eliminada" });
    } catch (error) {
        console.error("Error al eliminar publicación:", error);
        res.status(500).json({
            mensaje: "Error al eliminar la publicación"
        });
    }
}

// POST /api/publicaciones/:id/like  (da o quita el like)
async function alternarLike(req, res) {
    try {
        const publicacion = await buscarPorId(req.params.id);

        if (!publicacion) {
            return res.status(404).json({ mensaje: "Publicación no encontrada" });
        }

        const yaTieneLike = publicacion.likes.some((id) => id.equals(req.usuario.id));

        if (yaTieneLike) {
            publicacion.likes.pull(req.usuario.id);
        } else {
            publicacion.likes.push(req.usuario.id);
        }

        await publicacion.save();

        res.json({ publicacion: formatearPublicacion(publicacion, req.usuario.id) });
    } catch (error) {
        console.error("Error al dar like:", error);
        res.status(500).json({ mensaje: "Error al dar like" });
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
    alternarLike
};
