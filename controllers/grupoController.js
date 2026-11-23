/* ==========================================================================
   Grupos K-pop: catálogo, solicitudes de grupos nuevos y edición.
   - Cualquiera: ver el catálogo (grupos fijos + aprobados).
   - Usuario: solicita un grupo nuevo, ve sus solicitudes y cancela las pendientes.
   - Moderador+: crea grupos ya aprobados, aprueba o rechaza las solicitudes y
     edita cualquier grupo (datos, logo y portada), también los fijos.
   ========================================================================== */

const fs = require("fs");
const mongoose = require("mongoose");

const Grupo = require("../models/Grupo");
const { ESTADOS_GRUPO } = Grupo;
const Publicacion = require("../models/Publicacion");
const Producto = require("../models/Producto");
const Coleccion = require("../models/Coleccion");
const Usuario = require("../models/Usuario");
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

// Guarda en la base los grupos fijos que falten (una vez por proceso), para que se
// puedan editar igual que los demás. claveBase no cambia aunque se renombren.
let gruposBaseListos = null;
function asegurarGruposBase() {
    if (!gruposBaseListos) {
        gruposBaseListos = Grupo.bulkWrite(
            GRUPOS_BASE.map((grupo, orden) => {
                const claveBase = claveDe(grupo.nombre);
                return {
                    updateOne: {
                        filter: { claveBase },
                        update: {
                            $setOnInsert: {
                                nombre: grupo.nombre,
                                clave: claveBase,
                                fandom: grupo.fandom,
                                agencia: grupo.agencia,
                                integrantes: grupo.integrantes,
                                debut: grupo.debut,
                                imagen: grupo.imagen,
                                portada: grupo.portada,
                                color: grupo.color,
                                iniciales: grupo.iniciales,
                                base: true,
                                claveBase,
                                orden,
                                estado: "aprobado"
                            }
                        },
                        upsert: true
                    }
                };
            })
        ).catch((error) => {
            gruposBaseListos = null;
            throw error;
        });
    }
    return gruposBaseListos;
}

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
        portada: grupo.portada || "",
        color: grupo.color,
        iniciales: grupo.iniciales,
        base: Boolean(grupo.base)
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
    const archivos = [...(req.files?.imagenes || []), ...(req.files?.portada || [])];
    await Promise.all(archivos.map((archivo) => fs.promises.unlink(archivo.path).catch(() => {})));
}

// GET /api/grupos → catálogo: los fijos en su orden de siempre y después los aprobados, por nombre.
async function listarGrupos(req, res) {
    try {
        await asegurarGruposBase();
        const aprobados = await Grupo.find({ estado: "aprobado" }).lean();
        aprobados.sort((a, b) =>
            a.base !== b.base ? (a.base ? -1 : 1)
                : a.base ? a.orden - b.orden
                    : a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
        );
        res.json({ grupos: aprobados.map(formatoPublico) });
    } catch (error) {
        responderError(res, error, "No se pudieron cargar los grupos");
    }
}

// POST /api/grupos   multipart: nombre, fandom?, agencia?, integrantes?, debut?, descripcion?, imagenes? (logo), portada?
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

        await asegurarGruposBase();
        if (await Grupo.exists({ clave: datos.clave, estado: "aprobado" })) {
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
        const fotoPortada = req.files?.portada?.[0];
        const imagen = foto ? await guardarImagen(foto, req.usuario.id) : "";
        const portada = fotoPortada ? await guardarImagen(fotoPortada, req.usuario.id) : "";

        const grupo = await Grupo.create({
            ...datos,
            imagen,
            portada,
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

        // Los grupos fijos no son solicitudes de nadie.
        const filtro = { base: { $ne: true }, ...(estado === "todas" ? {} : { estado }) };
        const grupos = await Grupo.find(filtro)
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

// Cambia el nombre de un grupo en todo lo que lo usa por nombre. Las órdenes no:
// guardan el grupo como estaba al momento de la compra.
async function renombrarEnTodo(anterior, nuevo) {
    await Promise.all([
        Publicacion.updateMany({ grupo: anterior }, { $set: { grupo: nuevo } }),
        Producto.updateMany({ grupo: anterior }, { $set: { grupo: nuevo } }),
        Coleccion.updateMany(
            { "articulos.grupo": anterior },
            { $set: { "articulos.$[a].grupo": nuevo } },
            { arrayFilters: [{ "a.grupo": anterior }] }
        ),
        Usuario.updateMany(
            { gruposFavoritos: anterior },
            { $set: { "gruposFavoritos.$[g]": nuevo } },
            { arrayFilters: [{ g: anterior }] }
        ),
        Usuario.updateMany({ "banner.logo": anterior }, { $set: { "banner.logo": nuevo } })
    ]);
}

// PUT /api/grupos/:id   (moderador+)
// multipart: nombre?, fandom?, agencia?, integrantes?, debut?, descripcion?,
//            imagenes? (logo), portada? (imagen ancha), quitarImagen?, quitarPortada?
async function editarGrupo(req, res) {
    const nuevas = [];
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) throw new ErrorGrupo(400, "El grupo no es válido");

        await asegurarGruposBase();
        const grupo = await Grupo.findById(id);
        if (!grupo) throw new ErrorGrupo(404, "El grupo ya no existe");
        if (grupo.estado === "rechazado") throw new ErrorGrupo(409, "No se puede editar una solicitud rechazada");

        const cuerpo = req.body || {};
        const nombreAnterior = grupo.nombre;
        const cambios = [];
        const poner = (campo, valor) => {
            if (valor !== undefined && String(grupo[campo] ?? "") !== String(valor ?? "")) {
                grupo[campo] = valor;
                cambios.push(campo);
            }
        };

        if (cuerpo.nombre !== undefined) {
            const nombre = texto(cuerpo.nombre, "El nombre", 40);
            if (!nombre) throw new ErrorGrupo(400, "El grupo necesita un nombre");
            const clave = claveDe(nombre);
            if (clave !== grupo.clave) {
                const repetido = await Grupo.exists({ _id: { $ne: grupo._id }, clave, estado: { $in: ["pendiente", "aprobado"] } });
                if (repetido) throw new ErrorGrupo(409, `Ya existe un grupo llamado ${nombre}`);
            }
            poner("nombre", nombre);
            grupo.clave = clave;
        }
        if (cuerpo.fandom !== undefined) poner("fandom", texto(cuerpo.fandom, "El fandom", 40));
        if (cuerpo.agencia !== undefined) poner("agencia", texto(cuerpo.agencia, "La agencia", 60));
        if (cuerpo.integrantes !== undefined) poner("integrantes", entero(cuerpo.integrantes, "Los integrantes", 1, 50));
        if (cuerpo.debut !== undefined) poner("debut", entero(cuerpo.debut, "El año de debut", 1990, new Date().getFullYear() + 1));
        if (cuerpo.descripcion !== undefined) {
            const descripcion = String(cuerpo.descripcion).trim();
            if (descripcion.length > 500) throw new ErrorGrupo(400, "La descripción puede tener como máximo 500 caracteres");
            poner("descripcion", descripcion);
        }

        // Fotos: una nueva reemplaza a la anterior; "quitar" la borra (queda el degradado).
        const porBorrar = [];
        for (const [campo, archivo, quitar] of [
            ["imagen", req.files?.imagenes?.[0], cuerpo.quitarImagen],
            ["portada", req.files?.portada?.[0], cuerpo.quitarPortada]
        ]) {
            if (archivo) {
                const url = await guardarImagen(archivo, req.usuario.id);
                nuevas.push(url);
                if (grupo[campo]) porBorrar.push(grupo[campo]);
                grupo[campo] = url;
                cambios.push(campo);
            } else if ((quitar === "true" || quitar === true) && grupo[campo]) {
                porBorrar.push(grupo[campo]);
                grupo[campo] = "";
                cambios.push(campo);
            }
        }

        if (!cambios.length) return res.json({ mensaje: "No hubo cambios", grupo: formatoSolicitud(grupo) });

        if (cambios.includes("nombre")) grupo.iniciales = inicialesDe(grupo.nombre);
        await grupo.save();
        nuevas.length = 0;

        if (grupo.nombre !== nombreAnterior && grupo.estado === "aprobado") {
            await renombrarEnTodo(nombreAnterior, grupo.nombre);
        }
        // Las fotos fijas (/assets/...) no se borran; eliminarImagen solo borra las de la base.
        await Promise.all(porBorrar.map((url) => eliminarImagen(url).catch(() => {})));

        await registrar({
            actor: { id: req.usuario.id, rol: req.usuario.rol },
            accion: "editar_grupo",
            tipoObjetivo: "grupo",
            objetivo: grupo._id,
            detalle: { nombre: grupo.nombre, ...(grupo.nombre !== nombreAnterior ? { antes: nombreAnterior } : {}), cambios }
        });

        res.json({ mensaje: "Grupo actualizado", grupo: formatoSolicitud(grupo) });
    } catch (error) {
        await borrarTemporales(req);
        await Promise.all(nuevas.map((url) => eliminarImagen(url).catch(() => {})));
        responderError(res, error, "No se pudo editar el grupo");
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
    editarGrupo,
    asegurarGruposBase,
    MAX_PENDIENTES
};
