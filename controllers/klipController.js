/* ==========================================================================
   Klips (/api/klips): videos verticales cortos (máx. 60 s y 15 MB).
   Feed con paginación por cursor, likes, comentarios, reproducciones y
   moderación (se pueden denunciar y ocultar como las publicaciones).
   ========================================================================== */

const mongoose = require("mongoose");

const Klip = require("../models/Klip");
const Usuario = require("../models/Usuario");
const { MAX_TEXTO_KLIP, MAX_COMENTARIO_KLIP, MAX_COMENTARIOS_KLIP } = Klip;
const { guardarVideo } = require("../services/videoStorage");
const { borrarTemporal, MAX_SEGUNDOS_KLIP } = require("../middleware/uploadCorto");
const { ErrorMedio, revisarDuracion, revisarEspacio, borrarMedio } = require("../services/videosCortos");
const { registrarEvento } = require("../services/tareas");
const { crearNotificacion } = require("./notificacionController");
const { alcanza } = require("../middleware/roles");
const logger = require("../config/logger");

const CAMPOS_AUTOR = "nombre username fotoPerfil rol activo";
const POR_PAGINA = 8;
const MAX_KLIPS_POR_PERSONA = 20;

function esModeracion(req) {
    return alcanza(req.usuario?.rol, "moderador");
}

function formatearAutor(autor = {}) {
    return {
        id: autor._id,
        nombre: autor.nombre,
        username: autor.username,
        fotoPerfil: autor.fotoPerfil,
        rol: autor.rol || "usuario"
    };
}

function formatearComentario(comentario, idUsuario) {
    return {
        id: comentario._id,
        texto: comentario.texto,
        fecha: comentario.fecha,
        autor: formatearAutor(comentario.autor || {}),
        esMio: String(comentario.autor?._id || comentario.autor) === String(idUsuario)
    };
}

function formatearKlip(klip, idUsuario) {
    const likes = klip.likes || [];
    return {
        id: klip._id,
        video: klip.video,
        texto: klip.texto,
        grupo: klip.grupo,
        duracion: klip.duracion,
        fecha: klip.fecha,
        autor: formatearAutor(klip.autor || {}),
        totalLikes: likes.length,
        meGusta: likes.some((id) => String(id) === String(idUsuario)),
        totalComentarios: (klip.comentarios || []).length,
        reproducciones: klip.reproducciones || 0,
        oculta: Boolean(klip.oculto),
        motivoOculto: klip.oculto?.motivo || "",
        esMio: String(klip.autor?._id || klip.autor) === String(idUsuario)
    };
}

// Lo que cada quien puede ver: lo visible, lo suyo aunque esté oculto, y todo si es moderación.
function filtroVisible(req) {
    return esModeracion(req) ? {} : { $or: [{ oculto: null }, { autor: req.usuario.id }] };
}

async function buscarKlip(req, res, { conComentarios = false } = {}) {
    if (!mongoose.isValidObjectId(req.params.id)) {
        res.status(400).json({ mensaje: "ID de Klip inválido" });
        return null;
    }

    const consulta = Klip.findOne({ _id: req.params.id, ...filtroVisible(req) }).populate("autor", CAMPOS_AUTOR);
    if (conComentarios) consulta.populate("comentarios.autor", CAMPOS_AUTOR);

    const klip = await consulta;
    if (!klip || (klip.autor?.activo === false && !esModeracion(req))) {
        res.status(404).json({ mensaje: "Klip no encontrado" });
        return null;
    }
    return klip;
}

function responderError(res, error, mensaje) {
    if (error instanceof ErrorMedio || error.name === "ValidationError") {
        return res.status(error.status || 400).json({ mensaje: error.message });
    }
    logger.error(`${mensaje}:`, error);
    res.status(500).json({ mensaje });
}

// GET /api/klips?antes=<id>&autor=<username>&grupo=<nombre>
async function listarKlips(req, res) {
    try {
        const filtro = { ...filtroVisible(req) };
        const condiciones = [];

        if (req.query.autor) {
            const autor = await Usuario.findOne({ username: String(req.query.autor) }).select("_id").lean();
            if (!autor) return res.json({ klips: [], siguiente: null });
            condiciones.push({ autor: autor._id });
        }
        if (req.query.grupo) condiciones.push({ grupo: String(req.query.grupo) });
        if (req.query.antes) {
            if (!mongoose.isValidObjectId(req.query.antes)) {
                return res.status(400).json({ mensaje: "Cursor inválido" });
            }
            // Los ObjectId crecen con el tiempo: "antes de este id" = más viejos.
            condiciones.push({ _id: { $lt: new mongoose.Types.ObjectId(String(req.query.antes)) } });
        }
        if (condiciones.length) filtro.$and = condiciones;

        const klips = await Klip.find(filtro)
            .sort({ _id: -1 })
            .limit(POR_PAGINA + 1)
            .select("-comentarios.texto")
            .populate("autor", CAMPOS_AUTOR)
            .lean();

        const visibles = klips.filter((k) => k.autor && (k.autor.activo !== false || esModeracion(req)));
        const hayMas = klips.length > POR_PAGINA;
        const pagina = visibles.slice(0, POR_PAGINA);

        res.json({
            klips: pagina.map((k) => formatearKlip(k, req.usuario.id)),
            siguiente: hayMas ? String(klips[POR_PAGINA - 1]._id) : null
        });
    } catch (error) {
        responderError(res, error, "No se pudieron cargar los Klips");
    }
}

// GET /api/klips/:id
async function obtenerKlip(req, res) {
    try {
        const klip = await buscarKlip(req, res);
        if (!klip) return;
        res.json({ klip: formatearKlip(klip, req.usuario.id) });
    } catch (error) {
        responderError(res, error, "No se pudo cargar el Klip");
    }
}

function leerTextos(body = {}) {
    const texto = String(body.texto || "").trim();
    const grupo = String(body.grupo || "").trim();

    if (texto.length > MAX_TEXTO_KLIP) {
        throw new ErrorMedio(400, `La descripción puede tener como máximo ${MAX_TEXTO_KLIP} caracteres`);
    }
    if (grupo.length > 60) throw new ErrorMedio(400, "Nombre de grupo demasiado largo");

    return { texto, grupo };
}

// POST /api/klips  (multipart: video, texto, grupo, duracion)
async function crearKlip(req, res) {
    const archivo = req.file;
    let video = "";

    try {
        if (!archivo) throw new ErrorMedio(400, "Elige un video para tu Klip");
        const { texto, grupo } = leerTextos(req.body);

        const propios = await Klip.countDocuments({ autor: req.usuario.id });
        if (propios >= MAX_KLIPS_POR_PERSONA) {
            throw new ErrorMedio(400, `Puedes tener como máximo ${MAX_KLIPS_POR_PERSONA} Klips. Borra alguno para subir otro.`);
        }

        const duracion = await revisarDuracion(archivo, req.body?.duracion, MAX_SEGUNDOS_KLIP, "Un Klip");
        await revisarEspacio(archivo.size);
        video = await guardarVideo(archivo, req.usuario.id);

        const klip = await Klip.create({ autor: req.usuario.id, video, texto, grupo, duracion });
        await klip.populate("autor", CAMPOS_AUTOR);

        await registrarEvento(req.usuario.id, "klip");

        res.status(201).json({ klip: formatearKlip(klip, req.usuario.id) });
    } catch (error) {
        if (video) await borrarMedio(video);
        responderError(res, error, "No se pudo subir el Klip");
    } finally {
        await borrarTemporal(archivo);
    }
}

// PUT /api/klips/:id  { texto, grupo }  (solo su autor)
async function actualizarKlip(req, res) {
    try {
        const klip = await buscarKlip(req, res);
        if (!klip) return;

        if (String(klip.autor._id) !== String(req.usuario.id)) {
            return res.status(403).json({ mensaje: "Solo puedes editar tus Klips" });
        }

        const { texto, grupo } = leerTextos(req.body);
        klip.texto = texto;
        klip.grupo = grupo;
        await klip.save();

        res.json({ klip: formatearKlip(klip, req.usuario.id) });
    } catch (error) {
        responderError(res, error, "No se pudo editar el Klip");
    }
}

// DELETE /api/klips/:id  (su autor o la moderación) → borra también el video
async function eliminarKlip(req, res) {
    try {
        const klip = await buscarKlip(req, res);
        if (!klip) return;

        if (String(klip.autor._id) !== String(req.usuario.id) && !esModeracion(req)) {
            return res.status(403).json({ mensaje: "No puedes borrar este Klip" });
        }

        await borrarMedio(klip.video);
        await klip.deleteOne();

        res.json({ mensaje: "Klip eliminado" });
    } catch (error) {
        responderError(res, error, "No se pudo borrar el Klip");
    }
}

// POST /api/klips/:id/like  → da o quita el me gusta
async function alternarLike(req, res) {
    try {
        const klip = await buscarKlip(req, res);
        if (!klip) return;

        const yaTieneLike = klip.likes.some((id) => String(id) === String(req.usuario.id));
        await Klip.updateOne(
            { _id: klip._id },
            yaTieneLike ? { $pull: { likes: req.usuario.id } } : { $addToSet: { likes: req.usuario.id } }
        );

        if (!yaTieneLike) {
            await registrarEvento(req.usuario.id, "like");
            await crearNotificacion({
                destinatario: klip.autor._id,
                emisor: req.usuario.id,
                tipo: "like",
                mensaje: "Le dio me gusta a tu Klip.",
                enlace: `/klips/${klip._id}`,
                io: req.app.get("io")
            }).catch((error) => logger.error("Error al notificar like de Klip:", error));
        }

        res.json({ meGusta: !yaTieneLike, totalLikes: klip.likes.length + (yaTieneLike ? -1 : 1) });
    } catch (error) {
        responderError(res, error, "No se pudo dar me gusta");
    }
}

// POST /api/klips/:id/reproduccion  → suma una reproducción (no cuenta las del autor)
async function sumarReproduccion(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ mensaje: "ID de Klip inválido" });
        }
        await Klip.updateOne({ _id: req.params.id, autor: { $ne: req.usuario.id } }, { $inc: { reproducciones: 1 } });
        res.json({ ok: true });
    } catch (error) {
        responderError(res, error, "No se pudo registrar la reproducción");
    }
}

// GET /api/klips/:id/comentarios
async function listarComentarios(req, res) {
    try {
        const klip = await buscarKlip(req, res, { conComentarios: true });
        if (!klip) return;

        const comentarios = klip.comentarios
            .filter((c) => c.autor && c.autor.activo !== false)
            .map((c) => formatearComentario(c, req.usuario.id));

        res.json({ comentarios });
    } catch (error) {
        responderError(res, error, "No se pudieron cargar los comentarios");
    }
}

// POST /api/klips/:id/comentarios  { texto }
async function agregarComentario(req, res) {
    try {
        const texto = String(req.body?.texto || "").trim();
        if (!texto) return res.status(400).json({ mensaje: "Escribe un comentario" });
        if (texto.length > MAX_COMENTARIO_KLIP) {
            return res.status(400).json({ mensaje: `El comentario puede tener como máximo ${MAX_COMENTARIO_KLIP} caracteres` });
        }

        const klip = await buscarKlip(req, res);
        if (!klip) return;

        if (klip.comentarios.length >= MAX_COMENTARIOS_KLIP) {
            return res.status(400).json({ mensaje: "Este Klip ya no acepta más comentarios" });
        }

        klip.comentarios.push({ autor: req.usuario.id, texto });
        await klip.save();

        const nuevo = klip.comentarios.at(-1);
        const autor = await Usuario.findById(req.usuario.id).select(CAMPOS_AUTOR).lean();

        await registrarEvento(req.usuario.id, "comentar");
        await crearNotificacion({
            destinatario: klip.autor._id,
            emisor: req.usuario.id,
            tipo: "comentario",
            mensaje: "Comentó tu Klip.",
            enlace: `/klips/${klip._id}`,
            io: req.app.get("io")
        }).catch((error) => logger.error("Error al notificar comentario de Klip:", error));

        res.status(201).json({
            comentario: formatearComentario({ _id: nuevo._id, texto: nuevo.texto, fecha: nuevo.fecha, autor }, req.usuario.id),
            totalComentarios: klip.comentarios.length
        });
    } catch (error) {
        responderError(res, error, "No se pudo comentar");
    }
}

// DELETE /api/klips/:id/comentarios/:comentarioId  (autor del comentario, dueño del Klip o moderación)
async function eliminarComentario(req, res) {
    try {
        const klip = await buscarKlip(req, res);
        if (!klip) return;

        const comentario = mongoose.isValidObjectId(req.params.comentarioId) && klip.comentarios.id(req.params.comentarioId);
        if (!comentario) return res.status(404).json({ mensaje: "Comentario no encontrado" });

        const puede =
            String(comentario.autor) === String(req.usuario.id) ||
            String(klip.autor._id) === String(req.usuario.id) ||
            esModeracion(req);
        if (!puede) return res.status(403).json({ mensaje: "No puedes borrar este comentario" });

        comentario.deleteOne();
        await klip.save();

        res.json({ mensaje: "Comentario eliminado", totalComentarios: klip.comentarios.length });
    } catch (error) {
        responderError(res, error, "No se pudo borrar el comentario");
    }
}

module.exports = {
    listarKlips,
    obtenerKlip,
    crearKlip,
    actualizarKlip,
    eliminarKlip,
    alternarLike,
    sumarReproduccion,
    listarComentarios,
    agregarComentario,
    eliminarComentario
};
