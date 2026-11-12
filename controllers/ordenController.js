/* ==========================================================================
   Compra-venta e intercambios (fase 1: el dinero se acuerda entre las personas;
   la app registra la operación y le da seguimiento).
   ========================================================================== */

const mongoose = require("mongoose");

const Orden = require("../models/Orden");
const { ESTADOS_ACTIVOS } = require("../models/Orden");
const Coleccion = require("../models/Coleccion");
const Producto = require("../models/Producto");
const Conversacion = require("../models/Conversacion");
const Mensaje = require("../models/Mensaje");
const Usuario = require("../models/Usuario");
const { crearNotificacion } = require("./notificacionController");
const { tieneRol } = require("../middleware/roles");

const CAMPOS_USUARIO = "nombre username fotoPerfil";
const MAX_OFRECIDOS = 5;

const ETIQUETAS_ESTADO = {
    pendiente: "pendiente",
    aceptada: "aceptada",
    enviada: "enviada",
    recibida: "recibida",
    completada: "completada",
    rechazada: "rechazada",
    cancelada: "cancelada"
};

function copiarProducto(producto) {
    return {
        articuloId: null,
        titulo: producto.titulo,
        grupo: producto.grupo,
        categoria: producto.categoria,
        imagen: producto.imagenes?.[0] || ""
    };
}

function copiarArticulo(articulo) {
    return {
        articuloId: articulo._id,
        titulo: articulo.titulo,
        grupo: articulo.grupo,
        categoria: articulo.categoria,
        imagen: articulo.imagenes?.[0] || ""
    };
}

function esParticipante(orden, usuarioId) {
    const id = String(usuarioId);
    return (
        String(orden.comprador._id || orden.comprador) === id ||
        String(orden.vendedor._id || orden.vendedor) === id
    );
}

function rolEnOrden(orden, usuarioId) {
    if (String(orden.comprador._id || orden.comprador) === String(usuarioId)) return "comprador";
    if (String(orden.vendedor._id || orden.vendedor) === String(usuarioId)) return "vendedor";
    return null;
}

// Abre (o reutiliza) el chat directo entre comprador y vendedor y lo vuelve
// a mostrar para los dos, aunque alguno lo hubiera ocultado.
async function abrirChat(usuarioA, usuarioB) {
    let conversacion = await Conversacion.findOne({
        tipo: { $ne: "grupo" },
        participantes: { $all: [usuarioA, usuarioB] },
        $expr: { $eq: [{ $size: "$participantes" }, 2] }
    });

    if (!conversacion) {
        conversacion = await Conversacion.create({
            participantes: [usuarioA, usuarioB]
        });
    } else if (conversacion.ocultasPor?.length) {
        conversacion.ocultasPor = [];
        await conversacion.save();
    }

    return conversacion;
}

// Mensaje automático en el chat de la orden. Si falla, la orden sigue adelante.
async function mensajeAutomatico(req, conversacionId, remitenteId, texto) {
    if (!conversacionId) return;

    try {
        const conversacion = await Conversacion.findById(conversacionId);
        if (!conversacion) return;

        const mensaje = await Mensaje.create({
            conversacion: conversacion._id,
            remitente: remitenteId,
            texto
        });

        conversacion.ultimoMensaje = mensaje._id;
        conversacion.fechaActividad = new Date();
        conversacion.ocultasPor = [];
        await conversacion.save();

        await mensaje.populate("remitente", CAMPOS_USUARIO);

        const io = req.app.get("io");
        if (io) {
            io.to(`conversacion:${conversacion._id}`).emit("mensaje:nuevo", mensaje);
            for (const participante of conversacion.participantes) {
                io.to(`usuario:${participante}`).emit("conversaciones:actualizar");
                if (String(participante) !== String(remitenteId)) {
                    io.to(`usuario:${participante}`).emit("mensajes:contador-actualizar");
                }
            }
        }
    } catch (error) {
        console.error("No se pudo enviar el mensaje automático de la orden:", error);
    }
}

async function notificar(destinatario, emisor, mensaje, ordenId) {
    try {
        await crearNotificacion({
            destinatario,
            emisor,
            tipo: "orden",
            mensaje,
            enlace: `/ordenes/${ordenId}`
        });
    } catch (error) {
        console.error("No se pudo crear la notificación de la orden:", error);
    }
}

async function poblarOrden(orden) {
    await orden.populate([
        { path: "comprador", select: CAMPOS_USUARIO },
        { path: "vendedor", select: CAMPOS_USUARIO }
    ]);
    return orden;
}

function respuestaOrden(orden, usuarioId) {
    const datos = orden.toObject ? orden.toObject() : orden;
    return { ...datos, miRol: rolEnOrden(orden, usuarioId) };
}

/* --------------------------------------------------------------------------
   POST /api/ordenes
   body: { articuloId, tipo: "compra"|"intercambio", entrega, nota, ofrecidos: [articuloId] }
   -------------------------------------------------------------------------- */
async function crearOrden(req, res) {
    try {
        const compradorId = req.usuario.id;
        const { productoId, tipo, entrega = "en_persona", nota = "" } = req.body || {};
        const ofrecidosIds = Array.isArray(req.body?.ofrecidos) ? req.body.ofrecidos : [];

        if (!mongoose.isValidObjectId(productoId)) {
            return res.status(400).json({ mensaje: "El producto no es válido" });
        }

        if (!["compra", "intercambio"].includes(tipo)) {
            return res.status(400).json({ mensaje: "El tipo debe ser compra o intercambio" });
        }

        if (!["envio", "en_persona"].includes(entrega)) {
            return res.status(400).json({ mensaje: "La entrega debe ser envío o en persona" });
        }

        if (typeof nota !== "string" || nota.length > 500) {
            return res.status(400).json({ mensaje: "La nota no puede pasar de 500 caracteres" });
        }

        const producto = await Producto.findById(productoId).populate("vendedor", "activo username");

        if (!producto || !producto.vendedor?.activo || ["retirado", "vendido"].includes(producto.estado)) {
            return res.status(404).json({ mensaje: "Producto no encontrado" });
        }

        const vendedorId = producto.vendedor._id;

        if (String(vendedorId) === String(compradorId)) {
            return res.status(400).json({ mensaje: "No puedes comprar ni intercambiar tu propio producto" });
        }

        if (tipo === "compra" && !producto.disponibleCompra) {
            return res.status(400).json({ mensaje: "Este producto no está a la venta" });
        }

        if (tipo === "intercambio" && !producto.disponibleIntercambio) {
            return res.status(400).json({ mensaje: "Este producto no está disponible para intercambio" });
        }

        if (producto.estado === "reservado") {
            return res.status(409).json({ mensaje: "Este producto ya está apartado en otra operación" });
        }

        const repetida = await Orden.exists({
            comprador: compradorId,
            producto: producto._id,
            estado: { $in: ESTADOS_ACTIVOS }
        });

        if (repetida) {
            return res.status(409).json({ mensaje: "Ya tienes una orden activa para este producto" });
        }

        // En intercambios, lo que ofrece el comprador debe ser de su colección y no estar apartado.
        let ofrecidos = [];

        if (tipo === "intercambio") {
            const unicos = [...new Set(ofrecidosIds.map(String))];

            if (unicos.length === 0) {
                return res.status(400).json({ mensaje: "Elige al menos un artículo de tu colección para ofrecer" });
            }

            if (unicos.length > MAX_OFRECIDOS) {
                return res.status(400).json({ mensaje: `Puedes ofrecer como máximo ${MAX_OFRECIDOS} artículos` });
            }

            if (!unicos.every((id) => mongoose.isValidObjectId(id))) {
                return res.status(400).json({ mensaje: "Algún artículo ofrecido no es válido" });
            }

            const miColeccion = await Coleccion.findOne({ usuario: compradorId });

            for (const id of unicos) {
                const propio = miColeccion?.articulos.id(id);
                if (!propio) {
                    return res.status(400).json({ mensaje: "Solo puedes ofrecer artículos de tu colección" });
                }
                if (propio.reservadoPor) {
                    return res.status(409).json({ mensaje: `"${propio.titulo}" ya está apartado en otra operación` });
                }
                ofrecidos.push(copiarArticulo(propio));
            }
        } else if (ofrecidosIds.length) {
            return res.status(400).json({ mensaje: "Solo los intercambios llevan artículos ofrecidos" });
        }

        const conversacion = await abrirChat(compradorId, vendedorId);

        const orden = await Orden.create({
            comprador: compradorId,
            vendedor: vendedorId,
            producto: producto._id,
            articulo: copiarProducto(producto),
            tipo,
            precio: tipo === "compra" ? producto.precio : 0,
            ofrecidos,
            entrega,
            nota: nota.trim(),
            estado: "pendiente",
            historial: [{ estado: "pendiente", por: compradorId }],
            conversacion: conversacion._id
        });

        const textoChat = tipo === "compra"
            ? `🛒 Quiero comprar "${producto.titulo}" por $${orden.precio} MXN.`
            : `🔁 Te propongo un intercambio por "${producto.titulo}". Ofrezco: ${ofrecidos.map((o) => o.titulo).join(", ")}.`;

        await mensajeAutomatico(
            req,
            conversacion._id,
            compradorId,
            nota.trim() ? `${textoChat}\n${nota.trim()}` : textoChat
        );

        await notificar(
            vendedorId,
            compradorId,
            tipo === "compra"
                ? `quiere comprar "${producto.titulo}"`
                : `te propuso un intercambio por "${producto.titulo}"`,
            orden._id
        );

        await poblarOrden(orden);

        return res.status(201).json({
            mensaje: tipo === "compra" ? "Solicitud de compra enviada" : "Propuesta de intercambio enviada",
            orden: respuestaOrden(orden, compradorId)
        });
    } catch (error) {
        console.error("Error al crear la orden:", error);
        return res.status(500).json({ mensaje: "No se pudo crear la orden" });
    }
}

/* --------------------------------------------------------------------------
   GET /api/ordenes?rol=comprador|vendedor&estado=pendiente
   -------------------------------------------------------------------------- */
async function listarOrdenes(req, res) {
    try {
        const usuarioId = req.usuario.id;
        const { rol, estado } = req.query;

        let filtro;
        if (rol === "comprador") filtro = { comprador: usuarioId };
        else if (rol === "vendedor") filtro = { vendedor: usuarioId };
        else if (!rol) filtro = { $or: [{ comprador: usuarioId }, { vendedor: usuarioId }] };
        else return res.status(400).json({ mensaje: "El rol debe ser comprador o vendedor" });

        if (estado) {
            if (estado === "activas") filtro.estado = { $in: ESTADOS_ACTIVOS };
            else if (ETIQUETAS_ESTADO[estado]) filtro.estado = estado;
            else return res.status(400).json({ mensaje: "Estado no válido" });
        }

        const ordenes = await Orden.find(filtro)
            .sort({ updatedAt: -1 })
            .limit(100)
            .populate("comprador", CAMPOS_USUARIO)
            .populate("vendedor", CAMPOS_USUARIO);

        return res.json({ ordenes: ordenes.map((orden) => respuestaOrden(orden, usuarioId)) });
    } catch (error) {
        console.error("Error al listar órdenes:", error);
        return res.status(500).json({ mensaje: "No se pudieron cargar las órdenes" });
    }
}

/* --------------------------------------------------------------------------
   GET /api/ordenes/:id   (comprador, vendedor, o moderación)
   -------------------------------------------------------------------------- */
async function obtenerOrden(req, res) {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ mensaje: "La orden no es válida" });
        }

        const orden = await Orden.findById(id)
            .populate("comprador", CAMPOS_USUARIO)
            .populate("vendedor", CAMPOS_USUARIO);

        if (!orden) {
            return res.status(404).json({ mensaje: "Orden no encontrada" });
        }

        if (!esParticipante(orden, req.usuario.id) && !(await tieneRol(req.usuario.id, "moderador"))) {
            return res.status(404).json({ mensaje: "Orden no encontrada" });
        }

        return res.json({ orden: respuestaOrden(orden, req.usuario.id) });
    } catch (error) {
        console.error("Error al obtener la orden:", error);
        return res.status(500).json({ mensaje: "No se pudo cargar la orden" });
    }
}

/* --------------------------------------------------------------------------
   Reservas y traspaso de artículos
   -------------------------------------------------------------------------- */

// Aparta el producto y, en intercambios, las piezas ofrecidas de la colección del
// comprador. Regresa un mensaje de error si algo ya no existe o lo apartó otra orden.
async function reservarArticulos(orden) {
    const producto = await Producto.findById(orden.producto);
    if (!producto || ["retirado", "vendido"].includes(producto.estado)) {
        return `"${orden.articulo.titulo}" ya no está disponible`;
    }
    if (producto.estado === "reservado" && String(producto.reservadoPor) !== String(orden._id)) {
        return `"${orden.articulo.titulo}" ya está apartado en otra operación`;
    }

    // Primero se valida todo, luego se aparta, para no dejar reservas a medias.
    let coleccionComprador = null;
    if (orden.ofrecidos.length) {
        coleccionComprador = await Coleccion.findOne({ usuario: orden.comprador });
        for (const ofrecido of orden.ofrecidos) {
            const pieza = coleccionComprador?.articulos.id(ofrecido.articuloId);
            if (!pieza) return `"${ofrecido.titulo}" ya no está en la colección`;
            if (pieza.reservadoPor && String(pieza.reservadoPor) !== String(orden._id)) {
                return `"${ofrecido.titulo}" ya está apartado en otra operación`;
            }
        }
    }

    producto.estado = "reservado";
    producto.reservadoPor = orden._id;
    await producto.save();

    if (coleccionComprador) {
        for (const ofrecido of orden.ofrecidos) {
            coleccionComprador.articulos.id(ofrecido.articuloId).reservadoPor = orden._id;
        }
        await coleccionComprador.save();
    }

    return null;
}

async function liberarArticulos(orden) {
    await Producto.updateOne(
        { _id: orden.producto, reservadoPor: orden._id },
        { $set: { estado: "activo", reservadoPor: null } }
    );
    await Coleccion.updateMany(
        { "articulos.reservadoPor": orden._id },
        { $set: { "articulos.$[a].reservadoPor": null } },
        { arrayFilters: [{ "a.reservadoPor": orden._id }] }
    );
}

// Pasa una pieza de una colección a otra. Llega sin estar apartada.
async function moverArticulo(deUsuario, aUsuario, articuloId) {
    const origen = await Coleccion.findOne({ usuario: deUsuario });
    const subdoc = origen?.articulos.id(articuloId);
    if (!subdoc) return;

    const copia = subdoc.toObject();
    subdoc.deleteOne();
    await origen.save();

    await agregarAColeccion(aUsuario, { ...copia, reservadoPor: null });
}

async function agregarAColeccion(usuarioId, datos) {
    let coleccion = await Coleccion.findOne({ usuario: usuarioId });
    if (!coleccion) coleccion = new Coleccion({ usuario: usuarioId, articulos: [] });
    coleccion.articulos.push({ ...datos, disponibleCompra: false, disponibleIntercambio: false, precio: null });
    await coleccion.save();
}

// Al completar: el producto queda vendido y llega a la colección de quien lo compró.
// Si se había publicado copiando una pieza de la colección del vendedor, esa pieza
// sale de su colección (físicamente ya no la tiene). En intercambios, las piezas
// ofrecidas pasan de la colección del comprador a la del vendedor.
async function traspasarArticulos(orden) {
    const comprador = orden.comprador._id || orden.comprador;
    const vendedor = orden.vendedor._id || orden.vendedor;

    const producto = await Producto.findById(orden.producto);
    if (producto) {
        producto.estado = "vendido";
        producto.reservadoPor = null;
        await producto.save();

        await agregarAColeccion(comprador, {
            titulo: producto.titulo,
            grupo: producto.grupo,
            categoria: producto.categoria,
            imagenes: producto.imagenes,
            descripcion: producto.descripcion,
            estado: producto.condicion,
            valorEstimado: producto.precio || 0
        });

        if (producto.articuloOrigen) {
            const coleccionVendedor = await Coleccion.findOne({ usuario: vendedor });
            const pieza = coleccionVendedor?.articulos.id(producto.articuloOrigen);
            if (pieza) {
                pieza.deleteOne();
                await coleccionVendedor.save();
            }
        }
    }

    for (const ofrecido of orden.ofrecidos) {
        await moverArticulo(comprador, vendedor, ofrecido.articuloId);
    }
}

/* --------------------------------------------------------------------------
   PATCH /api/ordenes/:id/estado   body: { estado, nota }
   -------------------------------------------------------------------------- */

// Quién puede pasar la orden a cada estado y desde cuáles.
const TRANSICIONES = {
    aceptada: { quien: ["vendedor"], desde: ["pendiente"] },
    rechazada: { quien: ["vendedor"], desde: ["pendiente"] },
    enviada: { quien: ["vendedor"], desde: ["aceptada"] },
    recibida: { quien: ["comprador"], desde: ["aceptada", "enviada"] },
    completada: { quien: ["vendedor"], desde: ["recibida"] },
    cancelada: { quien: ["comprador", "vendedor"], desde: ["pendiente", "aceptada"] }
};

const TEXTO_CAMBIO = {
    aceptada: (o) => `✅ Acepté la ${o.tipo === "compra" ? "compra" : "propuesta de intercambio"} de "${o.articulo.titulo}". Queda apartado para ti.`,
    rechazada: (o) => `❌ Rechacé la ${o.tipo === "compra" ? "solicitud de compra" : "propuesta de intercambio"} de "${o.articulo.titulo}".`,
    enviada: (o) => `📦 Ya envié "${o.articulo.titulo}".`,
    recibida: (o) => `📬 Recibí "${o.articulo.titulo}".`,
    completada: (o) => `🎉 Operación completada: "${o.articulo.titulo}". ¡Gracias!`,
    cancelada: (o) => `🚫 Cancelé la operación de "${o.articulo.titulo}".`
};

const NOTIFICACION_CAMBIO = {
    aceptada: (o) => `aceptó tu ${o.tipo === "compra" ? "compra" : "intercambio"} de "${o.articulo.titulo}"`,
    rechazada: (o) => `rechazó tu ${o.tipo === "compra" ? "compra" : "intercambio"} de "${o.articulo.titulo}"`,
    enviada: (o) => `envió "${o.articulo.titulo}"`,
    recibida: (o) => `confirmó que recibió "${o.articulo.titulo}"`,
    completada: (o) => `marcó como completada la operación de "${o.articulo.titulo}"`,
    cancelada: (o) => `canceló la operación de "${o.articulo.titulo}"`
};

async function cambiarEstado(req, res) {
    try {
        const usuarioId = req.usuario.id;
        const { id } = req.params;
        const { estado, nota = "" } = req.body || {};

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ mensaje: "La orden no es válida" });
        }

        const regla = TRANSICIONES[estado];
        if (!regla) {
            return res.status(400).json({ mensaje: "Estado no válido" });
        }

        if (typeof nota !== "string" || nota.length > 300) {
            return res.status(400).json({ mensaje: "La nota no puede pasar de 300 caracteres" });
        }

        const orden = await Orden.findById(id);
        if (!orden || !esParticipante(orden, usuarioId)) {
            return res.status(404).json({ mensaje: "Orden no encontrada" });
        }

        const miRol = rolEnOrden(orden, usuarioId);

        if (!regla.quien.includes(miRol)) {
            return res.status(403).json({ mensaje: `Solo el ${regla.quien.join(" o el ")} puede marcar la orden como ${estado}` });
        }

        if (!regla.desde.includes(orden.estado)) {
            return res.status(409).json({ mensaje: `No se puede pasar de "${orden.estado}" a "${estado}"` });
        }

        if (estado === "aceptada") {
            const problema = await reservarArticulos(orden);
            if (problema) return res.status(409).json({ mensaje: problema });
        }

        if (estado === "rechazada" || estado === "cancelada") {
            await liberarArticulos(orden);
        }

        if (estado === "completada") {
            await traspasarArticulos(orden);
        }

        orden.estado = estado;
        orden.historial.push({ estado, por: usuarioId, nota: nota.trim() });
        await orden.save();

        // Al aceptar una orden, las demás pendientes del mismo artículo ya no se pueden cumplir.
        if (estado === "aceptada") {
            const otras = await Orden.find({
                _id: { $ne: orden._id },
                producto: orden.producto,
                estado: "pendiente"
            });
            for (const otra of otras) {
                otra.estado = "rechazada";
                otra.historial.push({ estado: "rechazada", por: usuarioId, nota: "El artículo se apartó para otra persona" });
                await otra.save();
                await notificar(otra.comprador, usuarioId, `apartó "${otra.articulo.titulo}" para otra persona`, otra._id);
                await mensajeAutomatico(req, otra.conversacion, usuarioId, `❌ "${otra.articulo.titulo}" se apartó para otra persona.`);
            }
        }

        const otraPersona = miRol === "comprador" ? orden.vendedor : orden.comprador;
        const texto = TEXTO_CAMBIO[estado](orden);
        await mensajeAutomatico(req, orden.conversacion, usuarioId, nota.trim() ? `${texto}\n${nota.trim()}` : texto);
        await notificar(otraPersona, usuarioId, NOTIFICACION_CAMBIO[estado](orden), orden._id);

        await poblarOrden(orden);

        return res.json({ mensaje: `Orden ${estado}`, orden: respuestaOrden(orden, usuarioId) });
    } catch (error) {
        console.error("Error al cambiar el estado de la orden:", error);
        return res.status(500).json({ mensaje: "No se pudo actualizar la orden" });
    }
}

/* --------------------------------------------------------------------------
   DELETE /api/ordenes/:id   (el comprador cancela mientras siga pendiente)
   -------------------------------------------------------------------------- */
async function cancelarOrden(req, res) {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ mensaje: "La orden no es válida" });
        }

        const orden = await Orden.findById(id);
        if (!orden || !esParticipante(orden, req.usuario.id)) {
            return res.status(404).json({ mensaje: "Orden no encontrada" });
        }

        if (rolEnOrden(orden, req.usuario.id) !== "comprador" || orden.estado !== "pendiente") {
            return res.status(409).json({ mensaje: "Solo puedes retirar tu solicitud mientras siga pendiente" });
        }

        orden.estado = "cancelada";
        orden.historial.push({ estado: "cancelada", por: req.usuario.id, nota: "Solicitud retirada" });
        await orden.save();

        await mensajeAutomatico(req, orden.conversacion, req.usuario.id, TEXTO_CAMBIO.cancelada(orden));
        await notificar(orden.vendedor, req.usuario.id, NOTIFICACION_CAMBIO.cancelada(orden), orden._id);

        return res.json({ mensaje: "Solicitud retirada" });
    } catch (error) {
        console.error("Error al cancelar la orden:", error);
        return res.status(500).json({ mensaje: "No se pudo cancelar la orden" });
    }
}

/* --------------------------------------------------------------------------
   POST /api/ordenes/:id/calificacion   body: { estrellas, comentario }
   -------------------------------------------------------------------------- */
async function calificarOrden(req, res) {
    try {
        const { id } = req.params;
        const estrellas = Number(req.body?.estrellas);
        const comentario = typeof req.body?.comentario === "string" ? req.body.comentario.trim() : "";

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ mensaje: "La orden no es válida" });
        }

        if (!Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5) {
            return res.status(400).json({ mensaje: "La calificación debe ser de 1 a 5 estrellas" });
        }

        if (comentario.length > 500) {
            return res.status(400).json({ mensaje: "El comentario no puede pasar de 500 caracteres" });
        }

        const orden = await Orden.findById(id);
        if (!orden || !esParticipante(orden, req.usuario.id)) {
            return res.status(404).json({ mensaje: "Orden no encontrada" });
        }

        if (rolEnOrden(orden, req.usuario.id) !== "comprador") {
            return res.status(403).json({ mensaje: "Solo el comprador califica la operación" });
        }

        if (orden.estado !== "completada") {
            return res.status(409).json({ mensaje: "Solo se califican operaciones completadas" });
        }

        if (orden.calificacion?.estrellas) {
            return res.status(409).json({ mensaje: "Ya calificaste esta operación" });
        }

        orden.calificacion = { estrellas, comentario, fecha: new Date() };
        await orden.save();

        await notificar(orden.vendedor, req.usuario.id, `te calificó con ${estrellas} ★ por "${orden.articulo.titulo}"`, orden._id);

        await poblarOrden(orden);
        return res.json({ mensaje: "¡Gracias por calificar!", orden: respuestaOrden(orden, req.usuario.id) });
    } catch (error) {
        console.error("Error al calificar la orden:", error);
        return res.status(500).json({ mensaje: "No se pudo guardar la calificación" });
    }
}

/* --------------------------------------------------------------------------
   GET /api/ordenes/resumen/:username   (reputación pública del vendedor)
   -------------------------------------------------------------------------- */
async function resumenVendedor(req, res) {
    try {
        const usuario = await Usuario.findOne({ username: req.params.username, activo: true }).select("_id");
        if (!usuario) {
            return res.status(404).json({ mensaje: "Usuario no encontrado" });
        }

        const [resumen] = await Orden.aggregate([
            { $match: { vendedor: usuario._id, estado: "completada" } },
            {
                $group: {
                    _id: null,
                    operaciones: { $sum: 1 },
                    calificaciones: { $sum: { $cond: [{ $gt: ["$calificacion.estrellas", null] }, 1, 0] } },
                    promedio: { $avg: "$calificacion.estrellas" }
                }
            }
        ]);

        return res.json({
            operaciones: resumen?.operaciones || 0,
            calificaciones: resumen?.calificaciones || 0,
            promedio: resumen?.promedio ? Math.round(resumen.promedio * 10) / 10 : null
        });
    } catch (error) {
        console.error("Error al calcular la reputación:", error);
        return res.status(500).json({ mensaje: "No se pudo calcular la reputación" });
    }
}

/* --------------------------------------------------------------------------
   Cuando el vendedor retira un producto del marketplace, las solicitudes
   pendientes ya no se pueden cumplir: se rechazan y se avisa a cada comprador.
   -------------------------------------------------------------------------- */
async function rechazarPendientesDe(req, productoId, vendedorId, motivo) {
    const pendientes = await Orden.find({
        producto: productoId,
        vendedor: vendedorId,
        estado: "pendiente"
    });

    for (const orden of pendientes) {
        orden.estado = "rechazada";
        orden.historial.push({ estado: "rechazada", por: vendedorId, nota: motivo });
        await orden.save();
        await mensajeAutomatico(req, orden.conversacion, vendedorId, `❌ "${orden.articulo.titulo}" ya no está disponible: ${motivo.toLowerCase()}.`);
        await notificar(orden.comprador, vendedorId, `retiró "${orden.articulo.titulo}"; tu solicitud se cerró`, orden._id);
    }

    return pendientes.length;
}

module.exports = {
    rechazarPendientesDe,
    crearOrden,
    listarOrdenes,
    obtenerOrden,
    cambiarEstado,
    cancelarOrden,
    calificarOrden,
    resumenVendedor
};
