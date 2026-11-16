/* ==========================================================================
   Denuncias y moderación (docs/PLAN-roles.md, fase A).
   - Cualquier usuario: denunciar y ver sus denuncias.
   - Moderador+: cola de denuncias, ocultar contenido, suspender, bitácora.
   - Administrador: además banea/reactiva y cambia roles (routes/adminRoutes.js).
   ========================================================================== */

const mongoose = require("mongoose");

const Denuncia = require("../models/Denuncia");
const Moderacion = require("../models/Moderacion");
const Usuario = require("../models/Usuario");
const Conversacion = require("../models/Conversacion");
const { TIPOS_DENUNCIA, MOTIVOS_DENUNCIA, ESTADOS_DENUNCIA, ACCIONES_RESOLUCION } = Denuncia;
const { ACCIONES_MODERACION } = Moderacion;
const {
    OCULTABLES,
    cargarObjetivo,
    cambiarVisibilidad,
    suspender,
    levantarSuspension,
    cambiarActivo,
    registrar,
    avisar,
    responderError,
    recortar
} = require("../services/moderacion");

const CAMPOS_PERSONA = "nombre username fotoPerfil rol activo suspendidoHasta";

function actorDe(req) {
    return { id: req.usuario.id, rol: req.usuario.rol };
}

function escaparRegex(texto) {
    return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* --------------------------------------------------------------------------
   Denuncias
   -------------------------------------------------------------------------- */

// POST /api/denuncias   { tipo, objetivo, motivo, detalle }
async function crearDenuncia(req, res) {
    try {
        const { tipo, objetivo, motivo } = req.body || {};
        const detalle = String(req.body?.detalle || "").trim();

        if (!TIPOS_DENUNCIA.includes(tipo)) {
            return res.status(400).json({ mensaje: `El tipo debe ser uno de: ${TIPOS_DENUNCIA.join(", ")}` });
        }
        if (!MOTIVOS_DENUNCIA.includes(motivo)) {
            return res.status(400).json({ mensaje: "Elige un motivo válido" });
        }
        if (detalle.length > 500) {
            return res.status(400).json({ mensaje: "El detalle puede tener como máximo 500 caracteres" });
        }
        if (motivo === "otro" && !detalle) {
            return res.status(400).json({ mensaje: "Cuéntanos qué pasa en el detalle" });
        }

        const encontrado = await cargarObjetivo(tipo, objetivo);
        if (!encontrado) {
            return res.status(404).json({ mensaje: "Lo que intentas denunciar ya no existe" });
        }

        if (String(encontrado.autorId) === String(req.usuario.id)) {
            return res.status(400).json({ mensaje: "No puedes denunciarte a ti mismo" });
        }

        // Un mensaje solo lo puede denunciar alguien de esa conversación.
        if (tipo === "mensaje") {
            const esParticipante = await Conversacion.exists({
                _id: encontrado.doc.conversacion,
                participantes: req.usuario.id
            });
            if (!esParticipante) {
                return res.status(403).json({ mensaje: "No participas en esa conversación" });
            }
        }

        const yaExiste = await Denuncia.exists({ reportante: req.usuario.id, tipo, objetivo });
        if (yaExiste) {
            return res.status(409).json({ mensaje: "Ya habías denunciado esto. La moderación lo está revisando." });
        }

        const denuncia = await Denuncia.create({
            reportante: req.usuario.id,
            tipo,
            objetivo,
            usuarioDenunciado: encontrado.autorId,
            resumen: encontrado.resumen,
            motivo,
            detalle
        });

        res.status(201).json({
            mensaje: "Gracias. La moderación revisará tu denuncia.",
            denuncia: { id: denuncia._id, estado: denuncia.estado }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ mensaje: "Ya habías denunciado esto. La moderación lo está revisando." });
        }
        responderError(res, error, "No se pudo enviar la denuncia");
    }
}

// GET /api/denuncias/mias
async function listarMisDenuncias(req, res) {
    try {
        const denuncias = await Denuncia.find({ reportante: req.usuario.id })
            .select("tipo resumen motivo estado resolucion.accion createdAt")
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        res.json({ denuncias });
    } catch (error) {
        responderError(res, error, "No se pudieron cargar tus denuncias");
    }
}

// Estado de visibilidad del contenido denunciado (para mostrar "ya oculto") y
// enlace para abrirlo desde la pantalla de moderación.
async function marcarContenidoOculto(denuncias) {
    for (const denuncia of denuncias) {
        denuncia.enlace =
            denuncia.tipo === "publicacion" ? `/publicaciones/${denuncia.objetivo}`
                : denuncia.tipo === "producto" ? `/marketplace/${denuncia.objetivo}`
                    : denuncia.tipo === "usuario" && denuncia.usuarioDenunciado ? `/perfil/${denuncia.usuarioDenunciado.username}`
                        : null;
    }

    for (const [tipo, { Modelo }] of Object.entries(OCULTABLES)) {
        const ids = denuncias.filter((d) => d.tipo === tipo).map((d) => d.objetivo);
        if (!ids.length) continue;

        const docs = await Modelo.find({ _id: { $in: ids } }).select("oculto publicacion").lean();
        const porId = new Map(docs.map((doc) => [String(doc._id), doc]));

        for (const denuncia of denuncias) {
            if (denuncia.tipo !== tipo) continue;
            const doc = porId.get(String(denuncia.objetivo));
            denuncia.contenidoExiste = Boolean(doc);
            denuncia.contenidoOculto = Boolean(doc?.oculto);
            if (tipo === "comentario" && doc?.publicacion) denuncia.enlace = `/publicaciones/${doc.publicacion}`;
        }
    }
}

// GET /api/denuncias?estado=pendientes|abierta|...&tipo=&motivo=   (moderador+)
async function listarDenuncias(req, res) {
    try {
        const filtro = {};
        const estado = String(req.query.estado || "pendientes");

        if (estado === "pendientes") {
            filtro.estado = { $in: ["abierta", "en_revision"] };
        } else if (estado !== "todas") {
            if (!ESTADOS_DENUNCIA.includes(estado)) {
                return res.status(400).json({ mensaje: "Estado no válido" });
            }
            filtro.estado = estado;
        }

        if (req.query.tipo) {
            if (!TIPOS_DENUNCIA.includes(req.query.tipo)) {
                return res.status(400).json({ mensaje: "Tipo no válido" });
            }
            filtro.tipo = req.query.tipo;
        }

        if (req.query.motivo) {
            if (!MOTIVOS_DENUNCIA.includes(req.query.motivo)) {
                return res.status(400).json({ mensaje: "Motivo no válido" });
            }
            filtro.motivo = req.query.motivo;
        }

        const denuncias = await Denuncia.find(filtro)
            .sort({ createdAt: -1 })
            .limit(100)
            .populate("reportante", "nombre username fotoPerfil")
            .populate("usuarioDenunciado", CAMPOS_PERSONA)
            .populate("moderador", "nombre username")
            .lean();

        // Cuántas personas denunciaron lo mismo (ayuda a priorizar).
        const conteos = await Denuncia.aggregate([
            { $match: { objetivo: { $in: denuncias.map((d) => d.objetivo) } } },
            { $group: { _id: { tipo: "$tipo", objetivo: "$objetivo" }, total: { $sum: 1 } } }
        ]);
        const totalPor = new Map(conteos.map((c) => [`${c._id.tipo}:${c._id.objetivo}`, c.total]));

        for (const denuncia of denuncias) {
            denuncia.totalDenuncias = totalPor.get(`${denuncia.tipo}:${denuncia.objetivo}`) || 1;
        }
        await marcarContenidoOculto(denuncias);

        const pendientes = await Denuncia.countDocuments({ estado: { $in: ["abierta", "en_revision"] } });

        res.json({ denuncias, pendientes });
    } catch (error) {
        responderError(res, error, "No se pudieron cargar las denuncias");
    }
}

const TEXTO_ACCION = {
    ninguna: "la revisamos y no encontramos una falta a las normas",
    ocultar: "ocultamos el contenido",
    suspender: "suspendimos temporalmente la cuenta",
    banear: "dimos de baja la cuenta"
};

// PATCH /api/denuncias/:id   (moderador+)
// { estado: "en_revision" }  → la toma quien la pide
// { estado: "descartada", nota }
// { estado: "resuelta", accion: "ninguna"|"ocultar"|"suspender"|"banear", nota, dias }
async function actualizarDenuncia(req, res) {
    try {
        const { id } = req.params;
        const { estado } = req.body || {};
        const accion = req.body?.accion || "ninguna";
        const nota = String(req.body?.nota || "").trim();
        const actor = actorDe(req);

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ mensaje: "La denuncia no es válida" });
        }
        if (!["en_revision", "resuelta", "descartada"].includes(estado)) {
            return res.status(400).json({ mensaje: "El estado debe ser en_revision, resuelta o descartada" });
        }
        if (nota.length > 500) {
            return res.status(400).json({ mensaje: "La nota puede tener como máximo 500 caracteres" });
        }

        const denuncia = await Denuncia.findById(id);
        if (!denuncia) return res.status(404).json({ mensaje: "Denuncia no encontrada" });

        if (["resuelta", "descartada"].includes(denuncia.estado)) {
            return res.status(400).json({ mensaje: "Esa denuncia ya fue atendida" });
        }

        // Conflicto de interés: nadie atiende una denuncia sobre sí mismo, y las
        // denuncias contra moderadores o administradores solo las atiende un administrador.
        if (String(denuncia.usuarioDenunciado) === String(actor.id)) {
            return res.status(400).json({ mensaje: "No puedes atender una denuncia sobre ti" });
        }
        if (actor.rol !== "administrador") {
            const denunciado = await Usuario.findById(denuncia.usuarioDenunciado).select("rol");
            if (denunciado && denunciado.rol !== "usuario") {
                return res.status(403).json({ mensaje: "Solo un administrador atiende denuncias contra moderadores o administradores" });
            }
        }

        if (estado === "en_revision") {
            denuncia.estado = "en_revision";
            denuncia.moderador = actor.id;
            await denuncia.save();
            return res.json({ mensaje: "Tomaste la denuncia", denuncia });
        }

        if (estado === "resuelta") {
            if (!ACCIONES_RESOLUCION.includes(accion)) {
                return res.status(400).json({ mensaje: "Acción no válida" });
            }

            if (accion === "ocultar") {
                if (!OCULTABLES[denuncia.tipo]) {
                    return res.status(400).json({ mensaje: "Este tipo de denuncia no permite ocultar el contenido" });
                }
                await cambiarVisibilidad({
                    actor,
                    tipo: denuncia.tipo,
                    id: denuncia.objetivo,
                    ocultar: true,
                    motivo: nota || denuncia.motivo,
                    denuncia: denuncia._id
                });
            } else if (accion === "suspender") {
                await suspender({
                    actor,
                    usuarioId: denuncia.usuarioDenunciado,
                    dias: req.body?.dias,
                    motivo: nota || denuncia.motivo,
                    denuncia: denuncia._id
                });
            } else if (accion === "banear") {
                await cambiarActivo({
                    actor,
                    usuarioId: denuncia.usuarioDenunciado,
                    activo: false,
                    motivo: nota || denuncia.motivo,
                    denuncia: denuncia._id
                });
            }
        } else if (!nota) {
            return res.status(400).json({ mensaje: "Escribe por qué descartas la denuncia" });
        }

        // Se cierran también las demás denuncias abiertas sobre lo mismo.
        const relacionadas = await Denuncia.find({
            tipo: denuncia.tipo,
            objetivo: denuncia.objetivo,
            estado: { $in: ["abierta", "en_revision"] }
        });

        const resolucion = { accion: estado === "resuelta" ? accion : "ninguna", nota, fecha: new Date() };

        await Denuncia.updateMany(
            { _id: { $in: relacionadas.map((d) => d._id) } },
            { estado, moderador: actor.id, resolucion }
        );

        await registrar({
            actor,
            accion: estado === "resuelta" ? "resolver_denuncia" : "descartar_denuncia",
            tipoObjetivo: "denuncia",
            objetivo: denuncia._id,
            usuarioAfectado: denuncia.usuarioDenunciado,
            motivo: nota,
            detalle: { accion: resolucion.accion, cerradas: relacionadas.length }
        });

        const aviso = estado === "resuelta"
            ? `Revisamos tu denuncia (${recortar(denuncia.resumen, 60)}): ${TEXTO_ACCION[accion]}. Gracias por cuidar la comunidad.`
            : `Revisamos tu denuncia (${recortar(denuncia.resumen, 60)}) y no encontramos una falta a las normas.`;

        await Promise.all(relacionadas.map((d) => avisar(d.reportante, aviso)));

        res.json({
            mensaje: estado === "resuelta" ? "Denuncia resuelta" : "Denuncia descartada",
            cerradas: relacionadas.length
        });
    } catch (error) {
        responderError(res, error, "No se pudo actualizar la denuncia");
    }
}

/* --------------------------------------------------------------------------
   Moderación directa
   -------------------------------------------------------------------------- */

// PATCH /api/moderacion/contenido/:tipo/:id   { oculto: true|false, motivo }
async function cambiarVisibilidadContenido(req, res) {
    try {
        const ocultar = req.body?.oculto !== false;
        const motivo = String(req.body?.motivo || "").trim();

        if (ocultar && !motivo) {
            return res.status(400).json({ mensaje: "Escribe el motivo para ocultarlo" });
        }

        await cambiarVisibilidad({ actor: actorDe(req), tipo: req.params.tipo, id: req.params.id, ocultar, motivo });
        res.json({ mensaje: ocultar ? "Contenido ocultado" : "El contenido vuelve a estar visible" });
    } catch (error) {
        responderError(res, error, "No se pudo cambiar la visibilidad");
    }
}

// POST /api/moderacion/usuarios/:id/suspension   { dias, motivo }
async function suspenderUsuario(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ mensaje: "El usuario no es válido" });
        }
        const { usuario, hasta } = await suspender({
            actor: actorDe(req),
            usuarioId: req.params.id,
            dias: req.body?.dias,
            motivo: req.body?.motivo
        });
        res.json({ mensaje: `@${usuario.username} quedó suspendido`, hasta });
    } catch (error) {
        responderError(res, error, "No se pudo suspender la cuenta");
    }
}

// DELETE /api/moderacion/usuarios/:id/suspension
async function quitarSuspension(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ mensaje: "El usuario no es válido" });
        }
        const usuario = await levantarSuspension({
            actor: actorDe(req),
            usuarioId: req.params.id,
            motivo: req.body?.motivo
        });
        res.json({ mensaje: `Se levantó la suspensión de @${usuario.username}` });
    } catch (error) {
        responderError(res, error, "No se pudo levantar la suspensión");
    }
}

// GET /api/moderacion/usuarios?q=&estado=suspendidos|baneados   (moderador+)
async function buscarUsuariosModeracion(req, res) {
    try {
        const texto = String(req.query.q || "").trim();
        const filtro = {};

        if (texto) {
            const regex = new RegExp(escaparRegex(texto), "i");
            filtro.$or = [{ username: regex }, { nombre: regex }];
        }
        if (req.query.estado === "suspendidos") filtro.suspendidoHasta = { $gt: new Date() };
        if (req.query.estado === "baneados") filtro.activo = false;
        if (req.query.rol) filtro.rol = String(req.query.rol);

        const usuarios = await Usuario.find(filtro)
            .select(`${CAMPOS_PERSONA} motivoSuspension motivoBaneo fechaRegistro`)
            .sort({ username: 1 })
            .limit(50)
            .lean();

        // Denuncias recibidas por persona
        const denuncias = await Denuncia.aggregate([
            { $match: { usuarioDenunciado: { $in: usuarios.map((u) => u._id) } } },
            { $group: { _id: "$usuarioDenunciado", total: { $sum: 1 } } }
        ]);
        const totalPor = new Map(denuncias.map((d) => [String(d._id), d.total]));

        res.json({
            usuarios: usuarios.map((u) => ({
                ...u,
                id: u._id,
                suspendido: Boolean(u.suspendidoHasta && new Date(u.suspendidoHasta) > new Date()),
                denunciasRecibidas: totalPor.get(String(u._id)) || 0
            }))
        });
    } catch (error) {
        responderError(res, error, "No se pudieron cargar los usuarios");
    }
}

// GET /api/moderacion/bitacora?accion=&moderador=
// Moderador: solo sus acciones. Administrador: todas (puede filtrar por moderador).
async function listarBitacora(req, res) {
    try {
        const filtro = {};

        if (req.usuario.rol !== "administrador") {
            filtro.moderador = req.usuario.id;
        } else if (req.query.moderador && mongoose.isValidObjectId(req.query.moderador)) {
            filtro.moderador = req.query.moderador;
        }

        if (req.query.accion) {
            if (!ACCIONES_MODERACION.includes(req.query.accion)) {
                return res.status(400).json({ mensaje: "Acción no válida" });
            }
            filtro.accion = req.query.accion;
        }

        const registros = await Moderacion.find(filtro)
            .sort({ fecha: -1 })
            .limit(100)
            .populate("moderador", "nombre username fotoPerfil rol")
            .populate("usuarioAfectado", "nombre username fotoPerfil")
            .lean();

        res.json({ registros });
    } catch (error) {
        responderError(res, error, "No se pudo cargar la bitácora");
    }
}

// GET /api/moderacion/resumen → contador para el menú
async function resumenModeracion(req, res) {
    try {
        const pendientes = await Denuncia.countDocuments({ estado: { $in: ["abierta", "en_revision"] } });
        res.json({ pendientes });
    } catch (error) {
        responderError(res, error, "No se pudo cargar el resumen");
    }
}

module.exports = {
    crearDenuncia,
    listarMisDenuncias,
    listarDenuncias,
    actualizarDenuncia,
    cambiarVisibilidadContenido,
    suspenderUsuario,
    quitarSuspension,
    buscarUsuariosModeracion,
    listarBitacora,
    resumenModeracion
};
