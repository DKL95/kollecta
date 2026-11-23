/* ==========================================================================
   Grupos K-pop: catálogo y solicitudes de grupos nuevos.
   - Cualquiera: ver el catálogo (grupos fijos + aprobados).
   - Usuario: solicita un grupo nuevo, ve sus solicitudes y cancela las pendientes.
   - Moderador+: crea grupos ya aprobados y aprueba o rechaza las solicitudes.
   ========================================================================== */

const fs = require("fs");
const mongoose = require("mongoose");

const Grupo = require("../models/Grupo");
const { ESTADOS_GRUPO } = Grupo;
const { GRUPOS_BASE } = require("../data/gruposBase");
const { alcanza } = require("../middleware/roles");
const { guardarImagen, eliminarImagen } = require("../middleware/upload");
const { registrar, avisar, recortar } = require("../services/moderacion");
const logger = require("../config/logger");

// Un usuario puede tener a lo más estas solicitudes esperando revisión.
const MAX_PENDIENTES = 3;

const COLORES = [
    "linear-gradient(135deg,#9b5cff,#ff4fa3)",
    "linear-gradient(135deg,#4fd8ff,#9b5cff)",
    "linear-gradient(135deg,#ff4fa3,#ffd166)",
    "linear-gradient(135deg,#3ddc97,#4fd8ff)",
    "linear-gradient(135deg,#f97316,#ef4444)",
    "linear-gradient(135deg,#1e293b,#9b5cff)"
];

const CAMPOS_PERSONA = "nombre username fotoPerfil rol";

class ErrorGrupo extends Error {
    constructor(status, mensaje) {
        super(mensaje);
        this.status = status;
    }
}

function claveDe(nombre) {
    return String(nombre || "").trim().replace(/\s+/g, " ").toLowerCase();
}

const CLAVES_BASE = new Set(GRUPOS_BASE.map((grupo) => claveDe(grupo.nombre)));

// "Stray Kids" → "SK"; "aespa" → "AESP"
function inicialesDe(nombre) {
    const palabras = nombre.split(" ").filter(Boolean);
    const texto = palabras.length > 1 ? palabras.map((p) => p[0]).join("") : palabras[0] || "";
    return texto.slice(0, 4).toUpperCase();
}

function colorDe(clave) {
    let suma = 0;
    for (const letra of clave) suma += letra.charCodeAt(0);
    return COLORES[suma % COLORES.length];
}

function texto(valor, campo, maximo) {
    const limpio = String(valor ?? "").trim().replace(/\s+/g, " ");
    if (limpio.length > maximo) throw new ErrorGrupo(400, `${campo} puede tener como máximo ${maximo} caracteres`);
    return limpio;
}

function entero(valor, campo, minimo, maximo) {
    if (valor === undefined || valor === null || String(valor).trim() === "") return null;
    const numero = Number(valor);
    if (!Number.isInteger(numero) || numero < minimo || numero > maximo) {
        throw new ErrorGrupo(400, `${campo} debe ser un número entero entre ${minimo} y ${maximo}`);
    }
    return numero;
}

// Lo que ve cualquiera en el catálogo.
function formatoPublico(grupo) {
    return {
        _id: grupo._id,
        nombre: grupo.nombre,
        fandom: grupo.fandom,
        agencia: grupo.agencia,
        integrantes: grupo.integrantes,
        debut: grupo.debut,
        descripcion: grupo.descripcion,
        imagen: grupo.imagen,
        portada: "",
        color: grupo.color,
        iniciales: grupo.iniciales,
        base: false
    };
}

// Lo que ve quien la solicitó y la moderación.
function formatoSolicitud(grupo) {
    return {
        ...formatoPublico(grupo),
        estado: grupo.estado,
        solicitante: grupo.solicitante,
        revisadoPor: grupo.revisadoPor,
        motivoRechazo: grupo.motivoRechazo,
        fechaCreacion: grupo.fechaCreacion,
        fechaRevision: grupo.fechaRevision
    };
}

function responderError(res, error, mensajeGenerico) {
    if (error instanceof ErrorGrupo) return res.status(error.status).json({ mensaje: error.message });
    logger.error(mensajeGenerico, error);
    return res.status(500).json({ mensaje: mensajeGenerico });
}

async function borrarTemporales(req) {
    const archivos = req.files?.imagenes || [];
    await Promise.all(archivos.map((archivo) => fs.promises.unlink(archivo.path).catch(() => {})));
}

// GET /api/grupos → catálogo: los fijos en su orden de siempre y después los aprobados, por nombre.
async function listarGrupos(req, res) {
    try {
        const aprobados = await Grupo.find({ estado: "aprobado" }).collation({ locale: "es" }).sort({ nombre: 1 }).lean();
        res.json({ grupos: [...GRUPOS_BASE, ...aprobados.map(formatoPublico)] });
    } catch (error) {
        responderError(res, error, "No se pudieron cargar los grupos");
    }
}

// POST /api/grupos   multipart: nombre, fandom?, agencia?, integrantes?, debut?, descripcion?, imagenes? (1 foto)
// Usuario → queda pendiente. Moderador o administrador → queda aprobado de una vez.
async function crearGrupo(req, res) {
    try {
        const cuerpo = req.body || {};
        const nombre = texto(cuerpo.nombre, "El nombre", 40);
        if (!nombre) throw new ErrorGrupo(400, "Escribe el nombre del grupo");

        const datos = {
            nombre,
            clave: claveDe(nombre),
            fandom: texto(cuerpo.fandom, "El fandom", 40),
            agencia: texto(cuerpo.agencia, "La agencia", 60),
            integrantes: entero(cuerpo.integrantes, "Los integrantes", 1, 50),
            debut: entero(cuerpo.debut, "El año de debut", 1990, new Date().getFullYear() + 1),
            descripcion: String(cuerpo.descripcion ?? "").trim()
        };
        if (datos.descripcion.length > 500) throw new ErrorGrupo(400, "La descripción puede tener como máximo 500 caracteres");

        if (CLAVES_BASE.has(datos.clave) || (await Grupo.exists({ clave: datos.clave, estado: "aprobado" }))) {
            throw new ErrorGrupo(409, `${nombre} ya está en el catálogo de grupos`);
        }
        if (await Grupo.exists({ clave: datos.clave, estado: "pendiente" })) {
            throw new ErrorGrupo(409, `Ya hay una solicitud pendiente para ${nombre}`);
        }

        const esModeracion = alcanza(req.usuario.rol, "moderador");
        if (!esModeracion) {
            const pendientes = await Grupo.countDocuments({ solicitante: req.usuario.id, estado: "pendiente" });
            if (pendientes >= MAX_PENDIENTES) {
                throw new ErrorGrupo(429, `Ya tienes ${MAX_PENDIENTES} solicitudes esperando revisión. Espera a que la moderación las revise.`);
            }
        }

        const foto = req.files?.imagenes?.[0];
        const imagen = foto ? await guardarImagen(foto, req.usuario.id) : "";

        const grupo = await Grupo.create({
            ...datos,
            imagen,
            iniciales: inicialesDe(nombre),
            color: colorDe(datos.clave),
            solicitante: req.usuario.id,
            estado: esModeracion ? "aprobado" : "pendiente",
            revisadoPor: esModeracion ? req.usuario.id : null,
            fechaRevision: esModeracion ? new Date() : null
        });

        if (esModeracion) {
            await registrar({
                actor: { id: req.usuario.id, rol: req.usuario.rol },
                accion: "crear_grupo",
                tipoObjetivo: "grupo",
                objetivo: grupo._id,
                detalle: { nombre }
            });
        }

        res.status(201).json({
            mensaje: esModeracion
                ? `${nombre} ya está en el catálogo de grupos`
                : "Solicitud enviada. Te avisaremos cuando la moderación la revise.",
            grupo: formatoSolicitud(grupo)
        });
    } catch (error) {
        await borrarTemporales(req);
        responderError(res, error, "No se pudo guardar el grupo");
    }
}

// GET /api/grupos/solicitudes/mias
async function listarMisSolicitudes(req, res) {
    try {
        const grupos = await Grupo.find({ solicitante: req.usuario.id })
            .sort({ fechaCreacion: -1 })
            .limit(50)
            .lean();
        res.json({ solicitudes: grupos.map(formatoSolicitud) });
    } catch (error) {
        responderError(res, error, "No se pudieron cargar tus solicitudes");
    }
}

// GET /api/grupos/solicitudes?estado=pendiente|aprobado|rechazado|todas   (moderador+)
async function listarSolicitudes(req, res) {
    try {
        const estado = req.query.estado || "pendiente";
        if (estado !== "todas" && !ESTADOS_GRUPO.includes(estado)) {
            return res.status(400).json({ mensaje: "Estado no válido" });
        }

        const grupos = await Grupo.find(estado === "todas" ? {} : { estado })
            .sort({ fechaCreacion: estado === "pendiente" ? 1 : -1 })
            .limit(100)
            .populate("solicitante", CAMPOS_PERSONA)
            .populate("revisadoPor", CAMPOS_PERSONA)
            .lean();

        res.json({ solicitudes: grupos.map(formatoSolicitud) });
    } catch (error) {
        responderError(res, error, "No se pudieron cargar las solicitudes");
    }
}

// PATCH /api/grupos/solicitudes/:id   { decision: "aprobar" | "rechazar", motivo? }   (moderador+)
async function revisarSolicitud(req, res) {
    try {
        const { id } = req.params;
        const decision = req.body?.decision;
        const motivo = String(req.body?.motivo || "").trim();

        if (!mongoose.isValidObjectId(id)) throw new ErrorGrupo(400, "La solicitud no es válida");
        if (!["aprobar", "rechazar"].includes(decision)) throw new ErrorGrupo(400, "La decisión debe ser aprobar o rechazar");
        if (decision === "rechazar" && !motivo) throw new ErrorGrupo(400, "Escribe el motivo del rechazo");
        if (motivo.length > 300) throw new ErrorGrupo(400, "El motivo puede tener como máximo 300 caracteres");

        const aprobar = decision === "aprobar";
        const grupo = await Grupo.findOneAndUpdate(
            { _id: id, estado: "pendiente" },
            {
                estado: aprobar ? "aprobado" : "rechazado",
                revisadoPor: req.usuario.id,
                fechaRevision: new Date(),
                motivoRechazo: aprobar ? "" : recortar(motivo, 300)
            },
            { returnDocument: "after" }
        );

        if (!grupo) {
            const existe = await Grupo.exists({ _id: id });
            throw existe
                ? new ErrorGrupo(409, "Esta solicitud ya fue revisada")
                : new ErrorGrupo(404, "La solicitud ya no existe");
        }

        await registrar({
            actor: { id: req.usuario.id, rol: req.usuario.rol },
            accion: aprobar ? "aprobar_grupo" : "rechazar_grupo",
            tipoObjetivo: "grupo",
            objetivo: grupo._id,
            usuarioAfectado: grupo.solicitante,
            motivo,
            detalle: { nombre: grupo.nombre }
        });

        await avisar(
            grupo.solicitante,
            aprobar
                ? `Tu solicitud de grupo fue aprobada: ${grupo.nombre} ya está en el catálogo.`
                : `Tu solicitud de grupo ${grupo.nombre} fue rechazada. Motivo: ${recortar(motivo, 300)}`,
            aprobar ? `/grupos/${encodeURIComponent(grupo.nombre)}` : "/grupos?vista=solicitudes"
        );

        res.json({
            mensaje: aprobar ? `${grupo.nombre} se agregó al catálogo` : "Solicitud rechazada",
            grupo: formatoSolicitud(grupo)
        });
    } catch (error) {
        responderError(res, error, "No se pudo revisar la solicitud");
    }
}

// DELETE /api/grupos/solicitudes/:id → quien la envió la cancela mientras sigue pendiente.
async function cancelarSolicitud(req, res) {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) throw new ErrorGrupo(400, "La solicitud no es válida");

        const grupo = await Grupo.findOneAndDelete({ _id: id, solicitante: req.usuario.id, estado: "pendiente" });
        if (!grupo) {
            const existe = await Grupo.exists({ _id: id, solicitante: req.usuario.id });
            throw existe
                ? new ErrorGrupo(409, "La solicitud ya fue revisada, no se puede cancelar")
                : new ErrorGrupo(404, "La solicitud no existe");
        }

        if (grupo.imagen) await eliminarImagen(grupo.imagen).catch(() => {});
        res.json({ mensaje: "Solicitud cancelada" });
    } catch (error) {
        responderError(res, error, "No se pudo cancelar la solicitud");
    }
}

module.exports = {
    listarGrupos,
    crearGrupo,
    listarMisSolicitudes,
    listarSolicitudes,
    revisarSolicitud,
    cancelarSolicitud,
    MAX_PENDIENTES
};
