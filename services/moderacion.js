/* ==========================================================================
   Acciones de moderación compartidas por /api/denuncias, /api/moderacion y
   /api/admin: ocultar o mostrar contenido, suspender, banear y la bitácora.
   Reglas (docs/PLAN-roles.md §2):
   - Nadie actúa sobre sí mismo.
   - Un moderador no actúa sobre otro moderador ni sobre un administrador.
   - Debe quedar al menos un administrador activo.
   ========================================================================== */

const mongoose = require("mongoose");

const Usuario = require("../models/Usuario");
const Publicacion = require("../models/Publicacion");
const Comentario = require("../models/Comentario");
const Producto = require("../models/Producto");
const Mensaje = require("../models/Mensaje");
const Klip = require("../models/Klip");
const Moderacion = require("../models/Moderacion");
const { crearNotificacion } = require("../controllers/notificacionController");
const logger = require("../config/logger");

const DIAS_SUSPENSION = { min: 1, max: 30 };

// Contenido que se puede ocultar y cómo encontrar a su autor.
const OCULTABLES = {
    publicacion: { Modelo: Publicacion, autor: "autor", nombre: "publicación" },
    comentario: { Modelo: Comentario, autor: "autor", nombre: "comentario" },
    producto: { Modelo: Producto, autor: "vendedor", nombre: "artículo del marketplace" },
    klip: { Modelo: Klip, autor: "autor", nombre: "Klip" }
};

class ErrorModeracion extends Error {
    constructor(status, mensaje) {
        super(mensaje);
        this.status = status;
    }
}

function recortar(texto, max = 200) {
    const limpio = String(texto || "").replace(/\s+/g, " ").trim();
    return limpio.length > max ? `${limpio.slice(0, max - 1)}…` : limpio;
}

// Carga lo denunciado y devuelve { doc, autorId, resumen }. null si no existe.
async function cargarObjetivo(tipo, id) {
    if (!mongoose.isValidObjectId(id)) return null;

    if (tipo === "usuario") {
        const usuario = await Usuario.findById(id).select("username nombre rol activo");
        return usuario ? { doc: usuario, autorId: usuario._id, resumen: `@${usuario.username}` } : null;
    }

    if (tipo === "mensaje") {
        const mensaje = await Mensaje.findById(id).select("remitente texto conversacion");
        return mensaje
            ? { doc: mensaje, autorId: mensaje.remitente, resumen: recortar(mensaje.texto) || "(imagen)" }
            : null;
    }

    const config = OCULTABLES[tipo];
    if (!config) return null;

    const doc = await config.Modelo.findById(id);
    if (!doc) return null;

    const resumen =
        tipo === "producto" ? recortar(doc.titulo)
            : tipo === "klip" ? recortar(doc.texto) || "(Klip sin descripción)"
                : recortar(doc.texto);
    return { doc, autorId: doc[config.autor], resumen };
}

// ¿Quien actúa ({ id, rol }) puede sancionar a esta persona? Devuelve al usuario objetivo.
async function verificarJerarquia(actor, usuarioId) {
    if (String(actor.id) === String(usuarioId)) {
        throw new ErrorModeracion(400, "No puedes moderar tu propia cuenta o contenido");
    }

    const objetivo = await Usuario.findById(usuarioId).select("rol activo username");
    if (!objetivo) throw new ErrorModeracion(404, "Usuario no encontrado");

    // Solo un administrador puede actuar sobre moderadores o administradores.
    if (objetivo.rol !== "usuario" && actor.rol !== "administrador") {
        throw new ErrorModeracion(403, "Solo un administrador puede sancionar a un moderador o administrador");
    }

    return objetivo;
}

// Falla si la acción dejaría a la plataforma sin administradores activos.
async function verificarUltimoAdmin(usuario) {
    if (usuario.rol !== "administrador" || !usuario.activo) return;

    const otros = await Usuario.countDocuments({
        _id: { $ne: usuario._id },
        rol: "administrador",
        activo: true
    });

    if (otros === 0) {
        throw new ErrorModeracion(400, "Debe quedar al menos un administrador activo");
    }
}

async function registrar({
    actor,
    accion,
    tipoObjetivo,
    objetivo,
    usuarioAfectado = null,
    motivo = "",
    detalle = null,
    denuncia = null
}) {
    return Moderacion.create({
        moderador: actor.id,
        accion,
        tipoObjetivo,
        objetivo,
        usuarioAfectado,
        motivo: recortar(motivo, 500),
        detalle,
        denuncia
    });
}

// Notificación sin emisor: la moderación es anónima para quien la recibe.
async function avisar(destinatario, mensaje, enlace = "", io = null) {
    try {
        await crearNotificacion({ destinatario, tipo: "moderacion", mensaje, enlace, io });
    } catch (error) {
        logger.error("No se pudo notificar la acción de moderación:", error);
    }
}

// Oculta (o vuelve a mostrar) una publicación, comentario o producto.
async function cambiarVisibilidad({ actor, tipo, id, ocultar, motivo = "", denuncia = null, io = null }) {
    const config = OCULTABLES[tipo];
    if (!config) throw new ErrorModeracion(400, "Ese tipo de contenido no se puede ocultar");
    if (!mongoose.isValidObjectId(id)) throw new ErrorModeracion(400, "El contenido no es válido");

    const doc = await config.Modelo.findById(id);
    if (!doc) throw new ErrorModeracion(404, "El contenido ya no existe");

    const autorId = doc[config.autor];
    await verificarJerarquia(actor, autorId);

    if (ocultar && doc.oculto) throw new ErrorModeracion(400, "Ese contenido ya está oculto");
    if (!ocultar && !doc.oculto) throw new ErrorModeracion(400, "Ese contenido no está oculto");

    doc.oculto = ocultar ? { por: actor.id, motivo: recortar(motivo, 300), fecha: new Date() } : null;
    await doc.save();

    await registrar({
        actor,
        accion: ocultar ? "ocultar" : "mostrar",
        tipoObjetivo: tipo,
        objetivo: doc._id,
        usuarioAfectado: autorId,
        motivo,
        denuncia
    });

    if (ocultar) {
        const enlace =
            tipo === "publicacion" ? `/publicaciones/${doc._id}`
                : tipo === "producto" ? `/marketplace/${doc._id}`
                    : tipo === "comentario" ? `/publicaciones/${doc.publicacion}`
                        : tipo === "klip" ? `/klips/${doc._id}`
                            : "";
        await avisar(
            autorId,
            `Tu ${config.nombre} fue ocultado por moderación${motivo ? `: ${recortar(motivo, 120)}` : ""}`,
            enlace,
            io
        );
    }

    return doc;
}

// Suspende una cuenta de 1 a 30 días.
async function suspender({ actor, usuarioId, dias, motivo = "", denuncia = null }) {
    const numero = Number(dias);
    if (!Number.isInteger(numero) || numero < DIAS_SUSPENSION.min || numero > DIAS_SUSPENSION.max) {
        throw new ErrorModeracion(400, `La suspensión debe ser de ${DIAS_SUSPENSION.min} a ${DIAS_SUSPENSION.max} días`);
    }
    if (!String(motivo).trim()) throw new ErrorModeracion(400, "Escribe el motivo de la suspensión");

    const objetivo = await verificarJerarquia(actor, usuarioId);
    await verificarUltimoAdmin(objetivo);

    const hasta = new Date(Date.now() + numero * 24 * 60 * 60 * 1000);
    await Usuario.updateOne(
        { _id: objetivo._id },
        { suspendidoHasta: hasta, motivoSuspension: recortar(motivo, 300) }
    );

    await registrar({
        actor,
        accion: "suspender",
        tipoObjetivo: "usuario",
        objetivo: objetivo._id,
        usuarioAfectado: objetivo._id,
        motivo,
        detalle: { dias: numero, hasta },
        denuncia
    });

    return { usuario: objetivo, hasta };
}

async function levantarSuspension({ actor, usuarioId, motivo = "", io = null }) {
    const objetivo = await verificarJerarquia(actor, usuarioId);
    await Usuario.updateOne({ _id: objetivo._id }, { suspendidoHasta: null, motivoSuspension: "" });

    await registrar({
        actor,
        accion: "levantar_suspension",
        tipoObjetivo: "usuario",
        objetivo: objetivo._id,
        usuarioAfectado: objetivo._id,
        motivo
    });

    await avisar(objetivo._id, "Tu suspensión fue levantada. Ya puedes volver a usar KollectA.", "", io);
    return objetivo;
}

// Baneo permanente o reactivación (solo administradores).
async function cambiarActivo({ actor, usuarioId, activo, motivo = "", denuncia = null, io = null }) {
    if (actor.rol !== "administrador") {
        throw new ErrorModeracion(403, "Solo un administrador puede banear o reactivar cuentas");
    }
    if (!activo && !String(motivo).trim()) throw new ErrorModeracion(400, "Escribe el motivo del baneo");

    const objetivo = await verificarJerarquia(actor, usuarioId);
    if (!activo) await verificarUltimoAdmin(objetivo);

    await Usuario.updateOne(
        { _id: objetivo._id },
        activo
            ? { activo: true, motivoBaneo: "" }
            : { activo: false, motivoBaneo: recortar(motivo, 300) }
    );

    await registrar({
        actor,
        accion: activo ? "reactivar" : "banear",
        tipoObjetivo: "usuario",
        objetivo: objetivo._id,
        usuarioAfectado: objetivo._id,
        motivo,
        denuncia
    });

    if (activo) await avisar(objetivo._id, "Tu cuenta fue reactivada", "", io);
    return objetivo;
}

// Convierte un ErrorModeracion en respuesta HTTP; cualquier otro error es 500.
function responderError(res, error, mensajeGenerico) {
    if (error instanceof ErrorModeracion) {
        return res.status(error.status).json({ mensaje: error.message });
    }
    logger.error(mensajeGenerico, error);
    return res.status(500).json({ mensaje: mensajeGenerico });
}

module.exports = {
    OCULTABLES,
    DIAS_SUSPENSION,
    ErrorModeracion,
    cargarObjetivo,
    verificarJerarquia,
    verificarUltimoAdmin,
    registrar,
    avisar,
    cambiarVisibilidad,
    suspender,
    levantarSuspension,
    cambiarActivo,
    responderError,
    recortar
};
