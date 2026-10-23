const Usuario = require("../models/Usuario");
const Publicacion = require("../models/Publicacion");
const { formatearPublicacion, CAMPOS_AUTOR } = require("./publicacionController");
const { guardarImagen, eliminarImagen } = require("../middleware/upload");


async function buscarUsuarios(req, res) {
    try {
        const texto = (req.query.q || "").trim();
        const escapado = texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const filtro = texto
            ? { $or: [{ username: new RegExp(escapado, "i") }, { nombre: new RegExp(escapado, "i") }] }
            : {};

        const usuarios = await Usuario.find(filtro).sort({ fechaRegistro: -1 }).limit(20);

        res.json({
            usuarios: usuarios.map((u) => ({ ...u.aPublico(), email: undefined }))
        });
    } catch (error) {
        console.error("Error al buscar usuarios:", error);
        res.status(500).json({ mensaje: "Error al buscar usuarios" });
    }
}

// GET /api/usuarios/:username
async function obtenerPerfil(req, res) {
    try {
        const usuario = await Usuario.findOne({ username: req.params.username });

        if (!usuario) {
            return res.status(404).json({ mensaje: "Usuario no encontrado" });
        }

        const totalPublicaciones = await Publicacion.countDocuments({ autor: usuario._id });

        res.json({
            usuario: {
                ...usuario.aPublico(),
                email: undefined,
                totalPublicaciones,
                totalAmigos: usuario.amigos.length
            }
        });
    } catch (error) {
        console.error("Error al obtener perfil:", error);
        res.status(500).json({ mensaje: "Error al obtener el perfil" });
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
            return res.status(401).json({ mensaje: "Tu sesión ya no es válida, inicia sesión de nuevo" });
        }

        const { nombre, descripcion, gruposFavoritos } = req.body || {};

        if (nombre !== undefined) usuario.nombre = nombre.trim();
        if (descripcion !== undefined) usuario.descripcion = descripcion.trim();
        if (Array.isArray(gruposFavoritos)) usuario.gruposFavoritos = gruposFavoritos.map(String);

        if (req.file) {
            const fotoAnterior = usuario.fotoPerfil;
            usuario.fotoPerfil = await guardarImagen(req.file, usuario._id);
            await eliminarImagen(fotoAnterior);
        }

        await usuario.save();

        res.json({ mensaje: "Perfil actualizado", usuario: usuario.aPublico() });
    } catch (error) {
        console.error("Error al actualizar perfil:", error);
        res.status(500).json({ mensaje: "Error al actualizar el perfil" });
    }
}

module.exports = { buscarUsuarios, obtenerPerfil, obtenerPublicacionesDeUsuario, actualizarPerfil };
