/* ==========================================================================
   Galería 3D de la colección (/api/coleccion/galeria).
   - GET /:username  → las piezas de esa persona y cómo decoró su sala.
   - PUT /           → guardar mi decoración (tema, marcos, luz, partículas,
                       nombre de la sala y pieza destacada del pedestal).
   ========================================================================== */

const mongoose = require("mongoose");

const Coleccion = require("../models/Coleccion");
const Usuario = require("../models/Usuario");
const {
    TEMAS_GALERIA,
    MARCOS_GALERIA,
    LUCES_GALERIA,
    PARTICULAS_GALERIA,
    MAX_TITULO_GALERIA,
    GALERIA_POR_OMISION
} = require("../models/galeria");
const { registrarEvento } = require("../services/tareas");
const logger = require("../config/logger");

// La sala tiene lugar para 48 piezas en las paredes (más la destacada en el pedestal).
const MAX_PIEZAS_GALERIA = 48;

function configDe(usuario) {
    const guardada = usuario.galeria?.toObject ? usuario.galeria.toObject() : usuario.galeria || {};
    return { ...GALERIA_POR_OMISION, ...guardada };
}

function piezaPublica(articulo) {
    return {
        id: articulo._id,
        titulo: articulo.titulo,
        grupo: articulo.grupo,
        categoria: articulo.categoria,
        imagen: articulo.imagenes?.[0] || "",
        estado: articulo.estado,
        valorEstimado: articulo.valorEstimado || 0,
        descripcion: (articulo.descripcion || "").slice(0, 280)
    };
}

// GET /api/coleccion/galeria/:username
async function obtenerGaleria(req, res) {
    try {
        const usuario = await Usuario.findOne({ username: String(req.params.username) })
            .select("nombre username fotoPerfil activo galeria");

        if (!usuario || !usuario.activo) {
            return res.status(404).json({ mensaje: "Usuario no encontrado" });
        }

        const coleccion = await Coleccion.findOne({ usuario: usuario._id }).lean();
        // Lo más nuevo primero: así las piezas recientes quedan cerca de la entrada.
        const articulos = [...(coleccion?.articulos || [])].reverse();

        const galeria = configDe(usuario);
        const destacada = galeria.destacada && articulos.find((a) => String(a._id) === String(galeria.destacada));
        // Si la pieza destacada ya no existe (se vendió o se borró), el pedestal queda vacío.
        galeria.destacada = destacada ? String(destacada._id) : null;

        const enParedes = articulos.filter((a) => a !== destacada).slice(0, MAX_PIEZAS_GALERIA);

        res.json({
            usuario: {
                id: usuario._id,
                nombre: usuario.nombre,
                username: usuario.username,
                fotoPerfil: usuario.fotoPerfil
            },
            esMia: String(usuario._id) === String(req.usuario.id),
            galeria,
            destacada: destacada ? piezaPublica(destacada) : null,
            piezas: enParedes.map(piezaPublica),
            totalPiezas: articulos.length,
            maxPiezas: MAX_PIEZAS_GALERIA
        });
    } catch (error) {
        logger.error("Error al obtener la galería:", error);
        res.status(500).json({ mensaje: "No se pudo cargar la galería" });
    }
}

// PUT /api/coleccion/galeria  { tema?, marco?, luz?, particulas?, titulo?, destacada? }
async function actualizarGaleria(req, res) {
    try {
        const cuerpo = req.body || {};
        const usuario = await Usuario.findById(req.usuario.id).select("galeria");
        if (!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado" });

        const galeria = configDe(usuario);
        const opciones = [
            ["tema", TEMAS_GALERIA, "tema"],
            ["marco", MARCOS_GALERIA, "marco"],
            ["luz", LUCES_GALERIA, "iluminación"],
            ["particulas", PARTICULAS_GALERIA, "efecto"]
        ];

        for (const [campo, permitidos, nombre] of opciones) {
            if (cuerpo[campo] === undefined) continue;
            if (!permitidos.includes(cuerpo[campo])) {
                return res.status(400).json({ mensaje: `Elige un ${nombre} válido` });
            }
            galeria[campo] = cuerpo[campo];
        }

        if (cuerpo.titulo !== undefined) {
            const titulo = String(cuerpo.titulo).trim();
            if (titulo.length > MAX_TITULO_GALERIA) {
                return res.status(400).json({ mensaje: `El nombre de la sala puede tener como máximo ${MAX_TITULO_GALERIA} caracteres` });
            }
            galeria.titulo = titulo;
        }

        if (cuerpo.destacada !== undefined) {
            if (cuerpo.destacada === null || cuerpo.destacada === "") {
                galeria.destacada = null;
            } else {
                if (!mongoose.isValidObjectId(cuerpo.destacada)) {
                    return res.status(400).json({ mensaje: "La pieza destacada no es válida" });
                }
                const esMia = await Coleccion.exists({ usuario: req.usuario.id, "articulos._id": cuerpo.destacada });
                if (!esMia) {
                    return res.status(400).json({ mensaje: "La pieza destacada debe ser de tu colección" });
                }
                galeria.destacada = cuerpo.destacada;
            }
        }

        usuario.galeria = galeria;
        await usuario.save();
        await registrarEvento(req.usuario.id, "galeria");

        res.json({ mensaje: "Galería guardada", galeria: configDe(usuario) });
    } catch (error) {
        logger.error("Error al guardar la galería:", error);
        res.status(500).json({ mensaje: "No se pudo guardar la galería" });
    }
}

module.exports = { obtenerGaleria, actualizarGaleria, MAX_PIEZAS_GALERIA };
