const mongoose = require("mongoose");

const Publicacion = require("../models/Publicacion");

const CAMPOS_AUTOR = "nombre username fotoPerfil";

// Da forma a una publicación para el frontend (conteos + si el usuario actual le dio like)
function formatearPublicacion(publicacion, idUsuarioActual) {
    const autor = publicacion.autor || {};

    return {
        id: publicacion._id,
        texto: publicacion.texto,
        grupo: publicacion.grupo,
        imagen: publicacion.imagen,
        fechaCreacion: publicacion.fechaCreacion,
        autor: {
            id: autor._id,
            nombre: autor.nombre,
            username: autor.username,
            fotoPerfil: autor.fotoPerfil
        },
        totalLikes: publicacion.likes.length,
        totalComentarios: publicacion.comentarios.length,
        meGusta: idUsuarioActual ? publicacion.likes.some((id) => id.equals(idUsuarioActual)) : false,
        esMia: idUsuarioActual ? String(autor._id) === String(idUsuarioActual) : false
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
    try {
        const texto = (req.body.texto || "").trim();

        if (!texto) {
            return res.status(400).json({ mensaje: "La publicación no puede estar vacía" });
        }

        if (texto.length > 1000) {
            return res.status(400).json({ mensaje: "La publicación no puede pasar de 1000 caracteres" });
        }

        const nuevaPublicacion = await Publicacion.create({
            autor: req.usuario.id,
            texto,
            grupo: req.body.grupo || "",
            imagen: req.file ? "/uploads/" + req.file.filename : ""
        });

        await nuevaPublicacion.populate("autor", CAMPOS_AUTOR);

        res.status(201).json({
            mensaje: "Publicación creada",
            publicacion: formatearPublicacion(nuevaPublicacion, req.usuario.id)
        });
    } catch (error) {
        console.error("Error al crear publicación:", error);
        res.status(500).json({ mensaje: "Error al crear la publicación" });
    }
}

// PUT /api/publicaciones/:id  (solo el autor)
async function actualizarPublicacion(req, res) {
    try {
        const publicacion = await buscarPorId(req.params.id);

        if (!publicacion) {
            return res.status(404).json({ mensaje: "Publicación no encontrada" });
        }

        if (String(publicacion.autor._id) !== String(req.usuario.id)) {
            return res.status(403).json({ mensaje: "Solo el autor puede editar esta publicación" });
        }

        if (req.body.texto !== undefined) {
            const texto = req.body.texto.trim();
            if (!texto) {
                return res.status(400).json({ mensaje: "La publicación no puede estar vacía" });
            }
            publicacion.texto = texto;
        }

        if (req.body.grupo !== undefined) publicacion.grupo = req.body.grupo;

        await publicacion.save();

        res.json({
            mensaje: "Publicación actualizada",
            publicacion: formatearPublicacion(publicacion, req.usuario.id)
        });
    } catch (error) {
        console.error("Error al actualizar publicación:", error);
        res.status(500).json({ mensaje: "Error al actualizar la publicación" });
    }
}

// DELETE /api/publicaciones/:id  (solo el autor)
async function eliminarPublicacion(req, res) {
    try {
        const publicacion = await buscarPorId(req.params.id);

        if (!publicacion) {
            return res.status(404).json({ mensaje: "Publicación no encontrada" });
        }

        if (String(publicacion.autor._id) !== String(req.usuario.id)) {
            return res.status(403).json({ mensaje: "Solo el autor puede eliminar esta publicación" });
        }

        await publicacion.deleteOne();

        res.json({ mensaje: "Publicación eliminada" });
    } catch (error) {
        console.error("Error al eliminar publicación:", error);
        res.status(500).json({ mensaje: "Error al eliminar la publicación" });
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
