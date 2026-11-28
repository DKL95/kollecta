/* ==========================================================================
   Historias de 24 horas (/api/historias).
   - Foto (máx. 5 MB), video (máx. 15 s y 10 MB) o texto sobre un color.
   - Se ven en la barra de historias de Inicio: primero las tuyas, luego las de
     tus amigos y después las del resto de la comunidad.
   - El autor ve quién vio cada historia. Al pasar 24 h se borran solas
     (services/historias.js), con todo y archivo.
   ========================================================================== */

const mongoose = require("mongoose");

const Historia = require("../models/Historia");
const Usuario = require("../models/Usuario");
const { FONDOS_HISTORIA, DURACION_HISTORIA_HORAS, MAX_TEXTO_HISTORIA } = Historia;
const { guardarImagen } = require("../middleware/upload");
const { guardarVideo } = require("../services/videoStorage");
const { borrarTemporal, MAX_SEGUNDOS_HISTORIA } = require("../middleware/uploadCorto");
const { ErrorMedio, revisarDuracion, revisarEspacio, borrarMedio } = require("../services/videosCortos");
const { registrarEvento } = require("../services/tareas");
const { alcanza } = require("../middleware/roles");
const logger = require("../config/logger");

const CAMPOS_AUTOR = "nombre username fotoPerfil rol activo";
const MAX_HISTORIAS_ACTIVAS = 10;
const MAX_AUTORES = 60;

function formatearHistoria(historia, idUsuario) {
    const esMia = String(historia.autor?._id || historia.autor) === String(idUsuario);
    const vistas = historia.vistas || [];

    return {
        id: historia._id,
        tipo: historia.tipo,
        medio: historia.medio,
        texto: historia.texto,
        fondo: historia.fondo,
        duracion: historia.duracion,
        fecha: historia.fecha,
        expiraEn: historia.expiraEn,
        vista: esMia || vistas.some((v) => String(v.usuario) === String(idUsuario)),
        // Cuántas personas la vieron: solo para su autor.
        totalVistas: esMia ? vistas.length : undefined,
        esMia
    };
}

function formatearAutor(autor) {
    return {
        id: autor._id,
        nombre: autor.nombre,
        username: autor.username,
        fotoPerfil: autor.fotoPerfil,
        rol: autor.rol || "usuario"
    };
}

// GET /api/historias  → [{ autor, historias, todasVistas }] (ordenado)
// GET /api/historias?autor=<username>  → solo las de esa persona
async function listarHistorias(req, res) {
    try {
        const ahora = new Date();
        const filtro = { expiraEn: { $gt: ahora } };

        if (req.query.autor) {
            const autor = await Usuario.findOne({ username: String(req.query.autor) }).select("_id").lean();
            if (!autor) return res.json({ grupos: [] });
            filtro.autor = autor._id;
        }

        const [historias, yo] = await Promise.all([
            Historia.find(filtro).sort({ fecha: 1 }).populate("autor", CAMPOS_AUTOR).lean(),
            Usuario.findById(req.usuario.id).select("amigos").lean()
        ]);

        const amigos = new Set((yo?.amigos || []).map(String));
        const porAutor = new Map();

        for (const historia of historias) {
            // Cuentas baneadas: sus historias no se muestran.
            if (!historia.autor || historia.autor.activo === false) continue;

            const clave = String(historia.autor._id);
            if (!porAutor.has(clave)) {
                porAutor.set(clave, { autor: formatearAutor(historia.autor), historias: [], ultima: historia.fecha });
            }
            const grupo = porAutor.get(clave);
            grupo.historias.push(formatearHistoria(historia, req.usuario.id));
            grupo.ultima = historia.fecha;
        }

        const grupos = [...porAutor.values()].map((grupo) => ({
            ...grupo,
            todasVistas: grupo.historias.every((h) => h.vista),
            esAmigo: amigos.has(String(grupo.autor.id))
        }));

        // Tú primero; luego lo que no has visto; amigos antes que el resto; lo más nuevo primero.
        const peso = (g) => (String(g.autor.id) === String(req.usuario.id) ? 0 : (g.todasVistas ? 2 : 0) + (g.esAmigo ? 0 : 1) + 1);
        grupos.sort((a, b) => peso(a) - peso(b) || new Date(b.ultima) - new Date(a.ultima));

        res.set("Cache-Control", "no-store");
        res.json({ grupos: grupos.slice(0, MAX_AUTORES) });
    } catch (error) {
        logger.error("Error al listar historias:", error);
        res.status(500).json({ mensaje: "No se pudieron cargar las historias" });
    }
}

// POST /api/historias  (multipart: medio = foto o video; o solo texto + fondo)
async function crearHistoria(req, res) {
    const archivo = req.file;
    let medioGuardado = "";

    try {
        const texto = String(req.body?.texto || "").trim();
        const fondo = FONDOS_HISTORIA.includes(req.body?.fondo) ? req.body.fondo : "kollecta";

        if (texto.length > MAX_TEXTO_HISTORIA) {
            throw new ErrorMedio(400, `El texto puede tener como máximo ${MAX_TEXTO_HISTORIA} caracteres`);
        }
        if (!archivo && !texto) {
            throw new ErrorMedio(400, "Sube una foto o un video, o escribe algo");
        }

        const activas = await Historia.countDocuments({ autor: req.usuario.id, expiraEn: { $gt: new Date() } });
        if (activas >= MAX_HISTORIAS_ACTIVAS) {
            throw new ErrorMedio(400, `Puedes tener como máximo ${MAX_HISTORIAS_ACTIVAS} historias a la vez`);
        }

        let tipo = "texto";
        let duracion = 0;

        if (archivo) {
            if (archivo.mimetype.startsWith("video/")) {
                tipo = "video";
                duracion = await revisarDuracion(archivo, req.body?.duracion, MAX_SEGUNDOS_HISTORIA, "Una historia");
                await revisarEspacio(archivo.size);
                medioGuardado = await guardarVideo(archivo, req.usuario.id);
            } else {
                tipo = "imagen";
                // guardarImagen borra el temporal.
                medioGuardado = await guardarImagen(archivo, req.usuario.id);
            }
        }

        const historia = await Historia.create({
            autor: req.usuario.id,
            tipo,
            medio: medioGuardado,
            texto,
            fondo,
            duracion,
            expiraEn: new Date(Date.now() + DURACION_HISTORIA_HORAS * 60 * 60 * 1000)
        });

        await registrarEvento(req.usuario.id, "historia");

        res.status(201).json({ historia: formatearHistoria(historia, req.usuario.id) });
    } catch (error) {
        if (medioGuardado) await borrarMedio(medioGuardado);

        if (error instanceof ErrorMedio || error.name === "ValidationError") {
            return res.status(error.status || 400).json({ mensaje: error.message });
        }
        logger.error("Error al crear la historia:", error);
        res.status(500).json({ mensaje: "No se pudo subir la historia" });
    } finally {
        await borrarTemporal(archivo);
    }
}

async function buscarVigente(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) {
        res.status(400).json({ mensaje: "ID de historia inválido" });
        return null;
    }
    const historia = await Historia.findOne({ _id: req.params.id, expiraEn: { $gt: new Date() } });
    if (!historia) {
        res.status(404).json({ mensaje: "La historia ya no está disponible" });
        return null;
    }
    return historia;
}

// POST /api/historias/:id/vista  → marca la historia como vista (una vez por persona)
async function marcarVista(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ mensaje: "ID de historia inválido" });
        }

        const resultado = await Historia.updateOne(
            {
                _id: req.params.id,
                expiraEn: { $gt: new Date() },
                autor: { $ne: req.usuario.id },
                "vistas.usuario": { $ne: req.usuario.id }
            },
            { $push: { vistas: { usuario: req.usuario.id, fecha: new Date() } } }
        );

        if (!resultado.modifiedCount && !(await Historia.exists({ _id: req.params.id, expiraEn: { $gt: new Date() } }))) {
            return res.status(404).json({ mensaje: "La historia ya no está disponible" });
        }

        res.json({ ok: true });
    } catch (error) {
        logger.error("Error al marcar la historia como vista:", error);
        res.status(500).json({ mensaje: "No se pudo marcar la historia como vista" });
    }
}

// GET /api/historias/:id/vistas  → quién la vio (solo su autor)
async function listarVistas(req, res) {
    try {
        const historia = await buscarVigente(req, res);
        if (!historia) return;

        if (String(historia.autor) !== String(req.usuario.id)) {
            return res.status(403).json({ mensaje: "Solo quien subió la historia ve quién la vio" });
        }

        await historia.populate("vistas.usuario", "nombre username fotoPerfil rol");
        const vistas = historia.vistas
            .filter((v) => v.usuario)
            .sort((a, b) => b.fecha - a.fecha)
            .map((v) => ({ usuario: formatearAutor(v.usuario), fecha: v.fecha }));

        res.json({ vistas });
    } catch (error) {
        logger.error("Error al listar vistas:", error);
        res.status(500).json({ mensaje: "No se pudieron cargar las vistas" });
    }
}

// DELETE /api/historias/:id  (su autor o la moderación)
async function eliminarHistoria(req, res) {
    try {
        const historia = await buscarVigente(req, res);
        if (!historia) return;

        const esAutor = String(historia.autor) === String(req.usuario.id);
        if (!esAutor && !alcanza(req.usuario.rol, "moderador")) {
            return res.status(403).json({ mensaje: "No puedes borrar esta historia" });
        }

        await borrarMedio(historia.medio);
        await historia.deleteOne();

        res.json({ mensaje: "Historia eliminada" });
    } catch (error) {
        logger.error("Error al borrar la historia:", error);
        res.status(500).json({ mensaje: "No se pudo borrar la historia" });
    }
}

module.exports = { listarHistorias, crearHistoria, marcarVista, listarVistas, eliminarHistoria };
