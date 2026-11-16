/* ==========================================================================
   Sección "Reportes": consultas que cruzan colecciones ($lookup / $unionWith).
   Cada reporte pide un rol mínimo (usuario < moderador < administrador):
   - Usuario: estadísticas propias (sus ventas, su actividad, su colección).
   - Moderador: salud de la comunidad (denuncias, cuentas problemáticas).
   - Administrador: métricas del negocio y del equipo de moderación.
   Todas responden con el mismo formato para que el front las pinte igual:
   { reporte, columnas: [{ clave, etiqueta, tipo }], filas: [...], grafica }
   ========================================================================== */

const mongoose = require("mongoose");

const Orden = require("../models/Orden");
const Publicacion = require("../models/Publicacion");
const Coleccion = require("../models/Coleccion");
const Usuario = require("../models/Usuario");
const Denuncia = require("../models/Denuncia");
const Moderacion = require("../models/Moderacion");
const { alcanza } = require("../middleware/roles");
const logger = require("../config/logger");

const MAX_MESES = 24;

const ETIQUETAS_MOTIVO = {
    spam: "Spam",
    acoso: "Acoso",
    falsificacion: "Merch falsa",
    estafa: "Estafa",
    contenido_inapropiado: "Contenido inapropiado",
    otro: "Otro"
};

const ETIQUETAS_ESTADO_ORDEN = {
    pendiente: "Pendiente",
    aceptada: "Aceptada",
    enviada: "Enviada",
    recibida: "Recibida",
    completada: "Completada",
    rechazada: "Rechazada",
    cancelada: "Cancelada"
};

const ETIQUETAS_ACCION = {
    ocultar: "Ocultar",
    mostrar: "Mostrar",
    suspender: "Suspender",
    levantar_suspension: "Levantar suspensión",
    banear: "Banear",
    reactivar: "Reactivar",
    cambiar_rol: "Cambiar rol",
    resolver_denuncia: "Resolver denuncia",
    descartar_denuncia: "Descartar denuncia"
};

/* --------------------------------------------------------------------------
   Parámetros comunes
   -------------------------------------------------------------------------- */

// ?desde=AAAA-MM-DD&hasta=AAAA-MM-DD → { $gte, $lt } o null. Lanza Error si no es válido.
function rangoFechas(query) {
    const rango = {};

    if (query.desde) {
        const desde = new Date(`${query.desde}T00:00:00`);
        if (Number.isNaN(desde.getTime())) throw new Error("La fecha 'desde' no es válida");
        rango.$gte = desde;
    }

    if (query.hasta) {
        const hasta = new Date(`${query.hasta}T00:00:00`);
        if (Number.isNaN(hasta.getTime())) throw new Error("La fecha 'hasta' no es válida");
        hasta.setDate(hasta.getDate() + 1); // incluye el día completo
        rango.$lt = hasta;
    }

    if (rango.$gte && rango.$lt && rango.$gte >= rango.$lt) {
        throw new Error("'desde' debe ser anterior a 'hasta'");
    }

    return Object.keys(rango).length ? rango : null;
}

// Primer día del mes de hace N meses (para reportes mensuales).
function inicioMeses(query) {
    const meses = Math.min(Math.max(parseInt(query.meses, 10) || 6, 1), MAX_MESES);
    const fecha = new Date();
    fecha.setDate(1);
    fecha.setHours(0, 0, 0, 0);
    fecha.setMonth(fecha.getMonth() - (meses - 1));
    return { desde: fecha, meses };
}

// Lista de "AAAA-MM" desde una fecha hasta hoy (para rellenar meses sin datos).
function listaMeses(desde, meses) {
    const lista = [];
    const fecha = new Date(desde);
    for (let i = 0; i < meses; i++) {
        lista.push(`${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`);
        fecha.setMonth(fecha.getMonth() + 1);
    }
    return lista;
}

const redondear = (campo, decimales = 2) => ({ $round: [campo, decimales] });

/* --------------------------------------------------------------------------
   Reportes de usuario (estadísticas propias)
   -------------------------------------------------------------------------- */

// Mis compras y ventas completadas por grupo: ordenes ⨝ productos
async function misOperacionesPorGrupo(req) {
    const yo = new mongoose.Types.ObjectId(req.usuario.id);
    const rango = rangoFechas(req.query);

    const filas = await Orden.aggregate([
        {
            $match: {
                estado: "completada",
                $or: [{ comprador: yo }, { vendedor: yo }],
                ...(rango ? { createdAt: rango } : {})
            }
        },
        { $lookup: { from: "productos", localField: "producto", foreignField: "_id", as: "producto" } },
        { $unwind: { path: "$producto", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                grupo: { $ifNull: ["$producto.grupo", { $ifNull: ["$articulo.grupo", "Sin grupo"] }] },
                esVenta: { $eq: ["$vendedor", yo] },
                monto: { $cond: [{ $eq: ["$tipo", "compra"] }, "$precio", 0] },
                tipo: 1
            }
        },
        {
            $group: {
                _id: "$grupo",
                ventas: { $sum: { $cond: ["$esVenta", 1, 0] } },
                compras: { $sum: { $cond: ["$esVenta", 0, 1] } },
                intercambios: { $sum: { $cond: [{ $eq: ["$tipo", "intercambio"] }, 1, 0] } },
                ingresos: { $sum: { $cond: ["$esVenta", "$monto", 0] } },
                gastos: { $sum: { $cond: ["$esVenta", 0, "$monto"] } }
            }
        },
        { $project: { _id: 0, grupo: "$_id", ventas: 1, compras: 1, intercambios: 1, ingresos: 1, gastos: 1 } },
        { $sort: { ingresos: -1, gastos: -1, grupo: 1 } }
    ]);

    return {
        columnas: [
            { clave: "grupo", etiqueta: "Grupo", tipo: "texto" },
            { clave: "ventas", etiqueta: "Ventas", tipo: "numero" },
            { clave: "compras", etiqueta: "Compras", tipo: "numero" },
            { clave: "intercambios", etiqueta: "Intercambios", tipo: "numero" },
            { clave: "ingresos", etiqueta: "Ingresos", tipo: "dinero" },
            { clave: "gastos", etiqueta: "Gastos", tipo: "dinero" }
        ],
        filas,
        grafica: { etiqueta: "grupo", valores: ["ingresos", "gastos"] }
    };
}

// Mi actividad por mes: publicaciones ⨝ comentarios ⨝ respuestas (lo que recibí)
async function miActividadMensual(req) {
    const yo = new mongoose.Types.ObjectId(req.usuario.id);
    const { desde, meses } = inicioMeses(req.query);

    const datos = await Publicacion.aggregate([
        { $match: { autor: yo, fechaCreacion: { $gte: desde } } },
        { $lookup: { from: "comentarios", localField: "_id", foreignField: "publicacion", as: "comentarios" } },
        { $lookup: { from: "respuestas", localField: "_id", foreignField: "publicacion", as: "respuestas" } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m", date: "$fechaCreacion" } },
                publicaciones: { $sum: 1 },
                likes: { $sum: { $size: { $ifNull: ["$likes", []] } } },
                comentarios: { $sum: { $add: [{ $size: "$comentarios" }, { $size: "$respuestas" }] } }
            }
        }
    ]);

    const porMes = new Map(datos.map((d) => [d._id, d]));
    const filas = listaMeses(desde, meses).map((mes) => ({
        mes,
        publicaciones: porMes.get(mes)?.publicaciones || 0,
        likes: porMes.get(mes)?.likes || 0,
        comentarios: porMes.get(mes)?.comentarios || 0
    }));

    return {
        columnas: [
            { clave: "mes", etiqueta: "Mes", tipo: "mes" },
            { clave: "publicaciones", etiqueta: "Publicaciones", tipo: "numero" },
            { clave: "likes", etiqueta: "Likes recibidos", tipo: "numero" },
            { clave: "comentarios", etiqueta: "Comentarios recibidos", tipo: "numero" }
        ],
        filas,
        grafica: { etiqueta: "mes", valores: ["likes", "comentarios"] }
    };
}

// Mi colección contra el marketplace: colecciones ⨝ productos (de otras personas)
async function miColeccionVsMercado(req) {
    const yo = new mongoose.Types.ObjectId(req.usuario.id);

    const filas = await Coleccion.aggregate([
        { $match: { usuario: yo } },
        { $unwind: "$articulos" },
        {
            $group: {
                _id: "$articulos.grupo",
                piezas: { $sum: 1 },
                valorEstimado: { $sum: "$articulos.valorEstimado" }
            }
        },
        {
            $lookup: {
                from: "productos",
                let: { grupo: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ["$grupo", "$$grupo"] },
                            estado: "activo",
                            oculto: null,
                            vendedor: { $ne: yo }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            enVenta: { $sum: 1 },
                            precioPromedio: { $avg: { $cond: ["$disponibleCompra", "$precio", null] } }
                        }
                    }
                ],
                as: "mercado"
            }
        },
        { $unwind: { path: "$mercado", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: 0,
                grupo: "$_id",
                piezas: 1,
                valorEstimado: 1,
                enVenta: { $ifNull: ["$mercado.enVenta", 0] },
                precioPromedio: redondear({ $ifNull: ["$mercado.precioPromedio", 0] })
            }
        },
        { $sort: { piezas: -1, grupo: 1 } }
    ]);

    return {
        columnas: [
            { clave: "grupo", etiqueta: "Grupo", tipo: "texto" },
            { clave: "piezas", etiqueta: "Mis piezas", tipo: "numero" },
            { clave: "valorEstimado", etiqueta: "Valor estimado", tipo: "dinero" },
            { clave: "enVenta", etiqueta: "En venta en el marketplace", tipo: "numero" },
            { clave: "precioPromedio", etiqueta: "Precio promedio en venta", tipo: "dinero" }
        ],
        filas,
        grafica: { etiqueta: "grupo", valores: ["piezas", "enVenta"] }
    };
}

/* --------------------------------------------------------------------------
   Reportes de moderación
   -------------------------------------------------------------------------- */

// Denuncias por motivo: denuncias ⨝ usuarios (rol del denunciado), con tiempo de respuesta
async function denunciasPorMotivo(req) {
    const rango = rangoFechas(req.query);

    const filas = await Denuncia.aggregate([
        { $match: rango ? { createdAt: rango } : {} },
        { $lookup: { from: "usuarios", localField: "usuarioDenunciado", foreignField: "_id", as: "denunciado" } },
        { $unwind: { path: "$denunciado", preserveNullAndEmptyArrays: true } },
        {
            $group: {
                _id: "$motivo",
                total: { $sum: 1 },
                pendientes: { $sum: { $cond: [{ $in: ["$estado", ["abierta", "en_revision"]] }, 1, 0] } },
                conAccion: {
                    $sum: {
                        $cond: [
                            { $and: [{ $eq: ["$estado", "resuelta"] }, { $ne: ["$resolucion.accion", "ninguna"] }] },
                            1,
                            0
                        ]
                    }
                },
                descartadas: { $sum: { $cond: [{ $eq: ["$estado", "descartada"] }, 1, 0] } },
                cuentasDistintas: { $addToSet: "$usuarioDenunciado" },
                horasRespuesta: {
                    $avg: {
                        $cond: [
                            { $ifNull: ["$resolucion.fecha", false] },
                            { $divide: [{ $subtract: ["$resolucion.fecha", "$createdAt"] }, 3600000] },
                            null
                        ]
                    }
                }
            }
        },
        {
            $project: {
                _id: 0,
                motivo: "$_id",
                total: 1,
                pendientes: 1,
                conAccion: 1,
                descartadas: 1,
                cuentas: { $size: "$cuentasDistintas" },
                horasRespuesta: redondear({ $ifNull: ["$horasRespuesta", 0] }, 1)
            }
        },
        { $sort: { total: -1 } }
    ]);

    filas.forEach((fila) => { fila.motivo = ETIQUETAS_MOTIVO[fila.motivo] || fila.motivo; });

    return {
        columnas: [
            { clave: "motivo", etiqueta: "Motivo", tipo: "texto" },
            { clave: "total", etiqueta: "Denuncias", tipo: "numero" },
            { clave: "pendientes", etiqueta: "Pendientes", tipo: "numero" },
            { clave: "conAccion", etiqueta: "Con sanción", tipo: "numero" },
            { clave: "descartadas", etiqueta: "Descartadas", tipo: "numero" },
            { clave: "cuentas", etiqueta: "Cuentas distintas", tipo: "numero" },
            { clave: "horasRespuesta", etiqueta: "Horas promedio de respuesta", tipo: "numero" }
        ],
        filas,
        grafica: { etiqueta: "motivo", valores: ["total", "pendientes"] }
    };
}

// Cuentas más denunciadas: denuncias ⨝ usuarios ⨝ moderaciones (sanciones previas)
async function cuentasMasDenunciadas(req) {
    const rango = rangoFechas(req.query);

    const filas = await Denuncia.aggregate([
        { $match: rango ? { createdAt: rango } : {} },
        {
            $group: {
                _id: "$usuarioDenunciado",
                denuncias: { $sum: 1 },
                pendientes: { $sum: { $cond: [{ $in: ["$estado", ["abierta", "en_revision"]] }, 1, 0] } },
                reportantes: { $addToSet: "$reportante" },
                motivos: { $addToSet: "$motivo" }
            }
        },
        { $sort: { denuncias: -1 } },
        { $limit: 20 },
        { $lookup: { from: "usuarios", localField: "_id", foreignField: "_id", as: "usuario" } },
        { $unwind: "$usuario" },
        {
            $lookup: {
                from: "moderaciones",
                let: { id: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ["$usuarioAfectado", "$$id"] },
                            accion: { $in: ["ocultar", "suspender", "banear"] }
                        }
                    },
                    { $count: "total" }
                ],
                as: "sanciones"
            }
        },
        {
            $project: {
                _id: 0,
                usuario: { $concat: ["@", "$usuario.username"] },
                username: "$usuario.username",
                rol: "$usuario.rol",
                denuncias: 1,
                pendientes: 1,
                personas: { $size: "$reportantes" },
                motivos: "$motivos",
                sanciones: { $ifNull: [{ $arrayElemAt: ["$sanciones.total", 0] }, 0] },
                estado: {
                    $cond: [
                        { $eq: ["$usuario.activo", false] },
                        "Baneado",
                        { $cond: [{ $gt: ["$usuario.suspendidoHasta", "$$NOW"] }, "Suspendido", "Activo"] }
                    ]
                }
            }
        }
    ]);

    filas.forEach((fila) => {
        fila.motivos = fila.motivos.map((m) => ETIQUETAS_MOTIVO[m] || m).join(", ");
    });

    return {
        columnas: [
            { clave: "usuario", etiqueta: "Cuenta", tipo: "usuario" },
            { clave: "denuncias", etiqueta: "Denuncias", tipo: "numero" },
            { clave: "personas", etiqueta: "Personas que denunciaron", tipo: "numero" },
            { clave: "pendientes", etiqueta: "Pendientes", tipo: "numero" },
            { clave: "motivos", etiqueta: "Motivos", tipo: "texto" },
            { clave: "sanciones", etiqueta: "Sanciones previas", tipo: "numero" },
            { clave: "estado", etiqueta: "Estado", tipo: "texto" }
        ],
        filas,
        grafica: { etiqueta: "usuario", valores: ["denuncias"] }
    };
}

// Vendedores con más cancelaciones o rechazos: ordenes ⨝ usuarios (posibles estafas)
async function vendedoresConProblemas(req) {
    const rango = rangoFechas(req.query);

    const filas = await Orden.aggregate([
        { $match: rango ? { createdAt: rango } : {} },
        {
            $group: {
                _id: "$vendedor",
                ordenes: { $sum: 1 },
                completadas: { $sum: { $cond: [{ $eq: ["$estado", "completada"] }, 1, 0] } },
                canceladas: { $sum: { $cond: [{ $eq: ["$estado", "cancelada"] }, 1, 0] } },
                rechazadas: { $sum: { $cond: [{ $eq: ["$estado", "rechazada"] }, 1, 0] } },
                estrellas: { $avg: "$calificacion.estrellas" }
            }
        },
        { $match: { $expr: { $gt: [{ $add: ["$canceladas", "$rechazadas"] }, 0] } } },
        { $lookup: { from: "usuarios", localField: "_id", foreignField: "_id", as: "usuario" } },
        { $unwind: "$usuario" },
        {
            $project: {
                _id: 0,
                usuario: { $concat: ["@", "$usuario.username"] },
                username: "$usuario.username",
                ordenes: 1,
                completadas: 1,
                canceladas: 1,
                rechazadas: 1,
                tasaProblemas: redondear({
                    $multiply: [{ $divide: [{ $add: ["$canceladas", "$rechazadas"] }, "$ordenes"] }, 100]
                }, 1),
                estrellas: redondear({ $ifNull: ["$estrellas", 0] }, 1)
            }
        },
        { $sort: { tasaProblemas: -1, ordenes: -1 } },
        { $limit: 20 }
    ]);

    return {
        columnas: [
            { clave: "usuario", etiqueta: "Vendedor", tipo: "usuario" },
            { clave: "ordenes", etiqueta: "Órdenes", tipo: "numero" },
            { clave: "completadas", etiqueta: "Completadas", tipo: "numero" },
            { clave: "canceladas", etiqueta: "Canceladas", tipo: "numero" },
            { clave: "rechazadas", etiqueta: "Rechazadas", tipo: "numero" },
            { clave: "tasaProblemas", etiqueta: "% con problema", tipo: "porcentaje" },
            { clave: "estrellas", etiqueta: "Calificación", tipo: "estrellas" }
        ],
        filas,
        grafica: { etiqueta: "usuario", valores: ["tasaProblemas"] }
    };
}

/* --------------------------------------------------------------------------
   Reportes de administración
   -------------------------------------------------------------------------- */

// Ventas e intercambios por grupo K-pop: ordenes ⨝ productos
async function ventasPorGrupo(req) {
    const rango = rangoFechas(req.query);

    const filas = await Orden.aggregate([
        { $match: { estado: "completada", ...(rango ? { createdAt: rango } : {}) } },
        { $lookup: { from: "productos", localField: "producto", foreignField: "_id", as: "producto" } },
        { $unwind: { path: "$producto", preserveNullAndEmptyArrays: true } },
        {
            $group: {
                _id: { $ifNull: ["$producto.grupo", { $ifNull: ["$articulo.grupo", "Sin grupo"] }] },
                ventas: { $sum: { $cond: [{ $eq: ["$tipo", "compra"] }, 1, 0] } },
                intercambios: { $sum: { $cond: [{ $eq: ["$tipo", "intercambio"] }, 1, 0] } },
                monto: { $sum: { $cond: [{ $eq: ["$tipo", "compra"] }, "$precio", 0] } },
                ticket: { $avg: { $cond: [{ $eq: ["$tipo", "compra"] }, "$precio", null] } },
                categorias: { $addToSet: "$producto.categoria" }
            }
        },
        {
            $project: {
                _id: 0,
                grupo: "$_id",
                ventas: 1,
                intercambios: 1,
                monto: 1,
                ticket: redondear({ $ifNull: ["$ticket", 0] }),
                categorias: 1
            }
        },
        { $sort: { monto: -1, intercambios: -1 } }
    ]);

    filas.forEach((fila) => { fila.categorias = fila.categorias.filter(Boolean).join(", "); });

    return {
        columnas: [
            { clave: "grupo", etiqueta: "Grupo", tipo: "texto" },
            { clave: "ventas", etiqueta: "Ventas", tipo: "numero" },
            { clave: "intercambios", etiqueta: "Intercambios", tipo: "numero" },
            { clave: "monto", etiqueta: "Monto vendido", tipo: "dinero" },
            { clave: "ticket", etiqueta: "Ticket promedio", tipo: "dinero" },
            { clave: "categorias", etiqueta: "Categorías", tipo: "texto" }
        ],
        filas,
        grafica: { etiqueta: "grupo", valores: ["monto"] }
    };
}

// Top vendedores: ordenes ⨝ usuarios ⨝ productos (anuncios activos)
async function topVendedores(req) {
    const rango = rangoFechas(req.query);

    const filas = await Orden.aggregate([
        { $match: { estado: "completada", ...(rango ? { createdAt: rango } : {}) } },
        {
            $group: {
                _id: "$vendedor",
                operaciones: { $sum: 1 },
                monto: { $sum: { $cond: [{ $eq: ["$tipo", "compra"] }, "$precio", 0] } },
                estrellas: { $avg: "$calificacion.estrellas" },
                calificaciones: { $sum: { $cond: [{ $gt: ["$calificacion.estrellas", null] }, 1, 0] } }
            }
        },
        { $sort: { monto: -1, operaciones: -1 } },
        { $limit: 10 },
        { $lookup: { from: "usuarios", localField: "_id", foreignField: "_id", as: "usuario" } },
        { $unwind: "$usuario" },
        {
            $lookup: {
                from: "productos",
                let: { id: "$_id" },
                pipeline: [
                    { $match: { $expr: { $eq: ["$vendedor", "$$id"] }, estado: "activo", oculto: null } },
                    { $count: "total" }
                ],
                as: "activos"
            }
        },
        {
            $project: {
                _id: 0,
                usuario: { $concat: ["@", "$usuario.username"] },
                username: "$usuario.username",
                operaciones: 1,
                monto: 1,
                estrellas: redondear({ $ifNull: ["$estrellas", 0] }, 1),
                calificaciones: 1,
                anunciosActivos: { $ifNull: [{ $arrayElemAt: ["$activos.total", 0] }, 0] }
            }
        }
    ]);

    return {
        columnas: [
            { clave: "usuario", etiqueta: "Vendedor", tipo: "usuario" },
            { clave: "operaciones", etiqueta: "Operaciones", tipo: "numero" },
            { clave: "monto", etiqueta: "Monto vendido", tipo: "dinero" },
            { clave: "estrellas", etiqueta: "Calificación", tipo: "estrellas" },
            { clave: "calificaciones", etiqueta: "Reseñas", tipo: "numero" },
            { clave: "anunciosActivos", etiqueta: "Anuncios activos", tipo: "numero" }
        ],
        filas,
        grafica: { etiqueta: "usuario", valores: ["monto"] }
    };
}

// Actividad de la plataforma por mes:
// usuarios ∪ publicaciones ∪ comentarios ∪ mensajes ∪ ordenes ($unionWith)
async function actividadMensual(req) {
    const { desde, meses } = inicioMeses(req.query);
    const mes = (campo) => ({ $dateToString: { format: "%Y-%m", date: campo } });

    const datos = await Usuario.aggregate([
        // fechaRegistro se guarda como texto ISO: se convierte a fecha.
        { $project: { fecha: { $toDate: "$fechaRegistro" }, tipo: { $literal: "usuarios" } } },
        {
            $unionWith: {
                coll: "publicaciones",
                pipeline: [{ $project: { fecha: "$fechaCreacion", tipo: { $literal: "publicaciones" } } }]
            }
        },
        {
            $unionWith: {
                coll: "comentarios",
                pipeline: [{ $project: { fecha: "$fecha", tipo: { $literal: "comentarios" } } }]
            }
        },
        {
            $unionWith: {
                coll: "mensajes",
                pipeline: [{ $project: { fecha: "$createdAt", tipo: { $literal: "mensajes" } } }]
            }
        },
        {
            $unionWith: {
                coll: "ordenes",
                pipeline: [{ $project: { fecha: "$createdAt", tipo: { $literal: "ordenes" } } }]
            }
        },
        { $match: { fecha: { $gte: desde } } },
        { $group: { _id: { mes: mes("$fecha"), tipo: "$tipo" }, total: { $sum: 1 } } }
    ]);

    const tabla = new Map();
    for (const { _id, total } of datos) {
        if (!tabla.has(_id.mes)) tabla.set(_id.mes, {});
        tabla.get(_id.mes)[_id.tipo] = total;
    }

    const filas = listaMeses(desde, meses).map((m) => ({
        mes: m,
        usuarios: tabla.get(m)?.usuarios || 0,
        publicaciones: tabla.get(m)?.publicaciones || 0,
        comentarios: tabla.get(m)?.comentarios || 0,
        mensajes: tabla.get(m)?.mensajes || 0,
        ordenes: tabla.get(m)?.ordenes || 0
    }));

    return {
        columnas: [
            { clave: "mes", etiqueta: "Mes", tipo: "mes" },
            { clave: "usuarios", etiqueta: "Usuarios nuevos", tipo: "numero" },
            { clave: "publicaciones", etiqueta: "Publicaciones", tipo: "numero" },
            { clave: "comentarios", etiqueta: "Comentarios", tipo: "numero" },
            { clave: "mensajes", etiqueta: "Mensajes", tipo: "numero" },
            { clave: "ordenes", etiqueta: "Órdenes", tipo: "numero" }
        ],
        filas,
        grafica: { etiqueta: "mes", valores: ["publicaciones", "ordenes"] }
    };
}

// Interés contra oferta por grupo:
// usuarios (favoritos) ∪ publicaciones ∪ colecciones ∪ productos activos
async function ofertaDemandaPorGrupo() {
    const datos = await Usuario.aggregate([
        { $match: { activo: true } },
        { $unwind: "$gruposFavoritos" },
        { $project: { grupo: "$gruposFavoritos", tipo: { $literal: "fans" } } },
        {
            $unionWith: {
                coll: "publicaciones",
                pipeline: [
                    { $match: { grupo: { $nin: ["", null] }, oculto: null } },
                    { $project: { grupo: 1, tipo: { $literal: "publicaciones" } } }
                ]
            }
        },
        {
            $unionWith: {
                coll: "colecciones",
                pipeline: [
                    { $unwind: "$articulos" },
                    { $project: { grupo: "$articulos.grupo", tipo: { $literal: "piezas" } } }
                ]
            }
        },
        {
            $unionWith: {
                coll: "productos",
                pipeline: [
                    { $match: { estado: "activo", oculto: null } },
                    { $project: { grupo: 1, tipo: { $literal: "enVenta" } } }
                ]
            }
        },
        { $group: { _id: { grupo: "$grupo", tipo: "$tipo" }, total: { $sum: 1 } } }
    ]);

    const tabla = new Map();
    for (const { _id, total } of datos) {
        if (!_id.grupo) continue;
        if (!tabla.has(_id.grupo)) tabla.set(_id.grupo, { grupo: _id.grupo, fans: 0, publicaciones: 0, piezas: 0, enVenta: 0 });
        tabla.get(_id.grupo)[_id.tipo] = total;
    }

    // Interés = fans + publicaciones. Si hay mucho interés y poca oferta, conviene promover ese grupo.
    const filas = [...tabla.values()]
        .map((fila) => ({
            ...fila,
            interesPorAnuncio: Math.round(((fila.fans + fila.publicaciones) / Math.max(fila.enVenta, 1)) * 10) / 10
        }))
        .sort((a, b) => b.fans + b.publicaciones - (a.fans + a.publicaciones));

    return {
        columnas: [
            { clave: "grupo", etiqueta: "Grupo", tipo: "texto" },
            { clave: "fans", etiqueta: "Fans (favorito)", tipo: "numero" },
            { clave: "publicaciones", etiqueta: "Publicaciones", tipo: "numero" },
            { clave: "piezas", etiqueta: "Piezas en colecciones", tipo: "numero" },
            { clave: "enVenta", etiqueta: "Anuncios activos", tipo: "numero" },
            { clave: "interesPorAnuncio", etiqueta: "Interés por anuncio", tipo: "numero" }
        ],
        filas,
        grafica: { etiqueta: "grupo", valores: ["fans", "enVenta"] }
    };
}

// Embudo de órdenes: cuántas llegan a cada estado, por tipo (compra / intercambio)
async function embudoOrdenes(req) {
    const rango = rangoFechas(req.query);
    const orden = Object.keys(ETIQUETAS_ESTADO_ORDEN);

    const datos = await Orden.aggregate([
        { $match: rango ? { createdAt: rango } : {} },
        {
            $group: {
                _id: "$estado",
                total: { $sum: 1 },
                compras: { $sum: { $cond: [{ $eq: ["$tipo", "compra"] }, 1, 0] } },
                intercambios: { $sum: { $cond: [{ $eq: ["$tipo", "intercambio"] }, 1, 0] } },
                monto: { $sum: { $cond: [{ $eq: ["$tipo", "compra"] }, "$precio", 0] } }
            }
        }
    ]);

    const porEstado = new Map(datos.map((d) => [d._id, d]));
    const totalOrdenes = datos.reduce((suma, d) => suma + d.total, 0);

    const filas = orden.map((estado) => {
        const d = porEstado.get(estado) || {};
        return {
            estado: ETIQUETAS_ESTADO_ORDEN[estado],
            total: d.total || 0,
            compras: d.compras || 0,
            intercambios: d.intercambios || 0,
            monto: d.monto || 0,
            porcentaje: totalOrdenes ? Math.round(((d.total || 0) / totalOrdenes) * 1000) / 10 : 0
        };
    });

    return {
        columnas: [
            { clave: "estado", etiqueta: "Estado", tipo: "texto" },
            { clave: "total", etiqueta: "Órdenes", tipo: "numero" },
            { clave: "compras", etiqueta: "Compras", tipo: "numero" },
            { clave: "intercambios", etiqueta: "Intercambios", tipo: "numero" },
            { clave: "monto", etiqueta: "Monto", tipo: "dinero" },
            { clave: "porcentaje", etiqueta: "% del total", tipo: "porcentaje" }
        ],
        filas,
        grafica: { etiqueta: "estado", valores: ["total"] }
    };
}

// Trabajo del equipo de moderación: moderaciones ⨝ usuarios
async function actividadModeracion(req) {
    const rango = rangoFechas(req.query);

    const datos = await Moderacion.aggregate([
        { $match: rango ? { fecha: rango } : {} },
        { $group: { _id: { moderador: "$moderador", accion: "$accion" }, total: { $sum: 1 }, ultima: { $max: "$fecha" } } },
        { $lookup: { from: "usuarios", localField: "_id.moderador", foreignField: "_id", as: "moderador" } },
        { $unwind: "$moderador" },
        {
            $group: {
                _id: "$_id.moderador",
                username: { $first: "$moderador.username" },
                rol: { $first: "$moderador.rol" },
                acciones: { $push: { accion: "$_id.accion", total: "$total" } },
                total: { $sum: "$total" },
                ultima: { $max: "$ultima" }
            }
        },
        { $sort: { total: -1 } }
    ]);

    const filas = datos.map((d) => {
        const cuenta = (lista) => d.acciones.filter((a) => lista.includes(a.accion)).reduce((s, a) => s + a.total, 0);
        return {
            usuario: `@${d.username}`,
            username: d.username,
            rol: d.rol,
            total: d.total,
            denuncias: cuenta(["resolver_denuncia", "descartar_denuncia"]),
            ocultados: cuenta(["ocultar"]),
            sanciones: cuenta(["suspender", "banear"]),
            ultima: d.ultima
        };
    });

    return {
        columnas: [
            { clave: "usuario", etiqueta: "Moderador", tipo: "usuario" },
            { clave: "rol", etiqueta: "Rol", tipo: "texto" },
            { clave: "total", etiqueta: "Acciones", tipo: "numero" },
            { clave: "denuncias", etiqueta: "Denuncias atendidas", tipo: "numero" },
            { clave: "ocultados", etiqueta: "Contenido ocultado", tipo: "numero" },
            { clave: "sanciones", etiqueta: "Suspensiones y baneos", tipo: "numero" },
            { clave: "ultima", etiqueta: "Última acción", tipo: "fecha" }
        ],
        filas,
        grafica: { etiqueta: "usuario", valores: ["total"] }
    };
}

/* --------------------------------------------------------------------------
   Catálogo
   -------------------------------------------------------------------------- */

const REPORTES = [
    {
        id: "mis-operaciones",
        rol: "usuario",
        titulo: "Mis compras y ventas por grupo",
        descripcion: "Operaciones completadas en el marketplace, agrupadas por grupo K-pop.",
        colecciones: ["ordenes", "productos"],
        filtros: ["fechas"],
        ejecutar: misOperacionesPorGrupo
    },
    {
        id: "mi-actividad",
        rol: "usuario",
        titulo: "Mi actividad por mes",
        descripcion: "Tus publicaciones y la reacción que recibieron (likes, comentarios y respuestas).",
        colecciones: ["publicaciones", "comentarios", "respuestas"],
        filtros: ["meses"],
        ejecutar: miActividadMensual
    },
    {
        id: "mi-coleccion",
        rol: "usuario",
        titulo: "Mi colección contra el marketplace",
        descripcion: "Cuántas piezas tienes por grupo y cuántas hay a la venta de otras personas.",
        colecciones: ["colecciones", "productos"],
        filtros: [],
        ejecutar: miColeccionVsMercado
    },
    {
        id: "denuncias-por-motivo",
        rol: "moderador",
        titulo: "Denuncias por motivo",
        descripcion: "Volumen de denuncias, cuántas terminaron en sanción y el tiempo promedio de respuesta.",
        colecciones: ["denuncias", "usuarios"],
        filtros: ["fechas"],
        ejecutar: denunciasPorMotivo
    },
    {
        id: "cuentas-denunciadas",
        rol: "moderador",
        titulo: "Cuentas más denunciadas",
        descripcion: "Las 20 cuentas con más denuncias, su estado actual y sanciones previas.",
        colecciones: ["denuncias", "usuarios", "moderaciones"],
        filtros: ["fechas"],
        ejecutar: cuentasMasDenunciadas
    },
    {
        id: "vendedores-con-problemas",
        rol: "moderador",
        titulo: "Vendedores con cancelaciones",
        descripcion: "Vendedores con órdenes canceladas o rechazadas: ayuda a detectar posibles estafas.",
        colecciones: ["ordenes", "usuarios"],
        filtros: ["fechas"],
        ejecutar: vendedoresConProblemas
    },
    {
        id: "ventas-por-grupo",
        rol: "administrador",
        titulo: "Ventas e intercambios por grupo",
        descripcion: "Operaciones completadas y monto vendido por grupo K-pop.",
        colecciones: ["ordenes", "productos"],
        filtros: ["fechas"],
        ejecutar: ventasPorGrupo
    },
    {
        id: "top-vendedores",
        rol: "administrador",
        titulo: "Top 10 vendedores",
        descripcion: "Quién vende más, su calificación promedio y sus anuncios activos.",
        colecciones: ["ordenes", "usuarios", "productos"],
        filtros: ["fechas"],
        ejecutar: topVendedores
    },
    {
        id: "actividad-mensual",
        rol: "administrador",
        titulo: "Actividad de la plataforma por mes",
        descripcion: "Usuarios nuevos, publicaciones, comentarios, mensajes y órdenes.",
        colecciones: ["usuarios", "publicaciones", "comentarios", "mensajes", "ordenes"],
        filtros: ["meses"],
        ejecutar: actividadMensual
    },
    {
        id: "oferta-demanda",
        rol: "administrador",
        titulo: "Interés contra oferta por grupo",
        descripcion: "Fans y publicaciones contra anuncios activos: qué grupos conviene promover.",
        colecciones: ["usuarios", "publicaciones", "colecciones", "productos"],
        filtros: [],
        ejecutar: ofertaDemandaPorGrupo
    },
    {
        id: "embudo-ordenes",
        rol: "administrador",
        titulo: "Embudo de órdenes",
        descripcion: "En qué estado están las órdenes y cuántas se completan.",
        colecciones: ["ordenes"],
        filtros: ["fechas"],
        ejecutar: embudoOrdenes
    },
    {
        id: "actividad-moderacion",
        rol: "administrador",
        titulo: "Trabajo del equipo de moderación",
        descripcion: "Acciones por moderador: denuncias atendidas, contenido ocultado y sanciones.",
        colecciones: ["moderaciones", "usuarios"],
        filtros: ["fechas"],
        ejecutar: actividadModeracion
    }
];

function descripcionPublica({ ejecutar, ...resto }) {
    return resto;
}

// GET /api/reportes → los reportes que puede ver quien pregunta
function listarReportes(req, res) {
    const disponibles = REPORTES.filter((r) => alcanza(req.usuario.rol, r.rol)).map(descripcionPublica);
    res.json({ rol: req.usuario.rol, reportes: disponibles });
}

// GET /api/reportes/:id?desde=&hasta=&meses=
async function obtenerReporte(req, res) {
    const reporte = REPORTES.find((r) => r.id === req.params.id);

    if (!reporte) {
        return res.status(404).json({ mensaje: "Ese reporte no existe" });
    }

    if (!alcanza(req.usuario.rol, reporte.rol)) {
        return res.status(403).json({ mensaje: "No tienes permiso para ver este reporte" });
    }

    let resultado;
    try {
        resultado = await reporte.ejecutar(req);
    } catch (error) {
        if (/fecha|'desde'/.test(error.message)) {
            return res.status(400).json({ mensaje: error.message });
        }
        logger.error(`Error en el reporte ${reporte.id}:`, error);
        return res.status(500).json({ mensaje: "No se pudo generar el reporte" });
    }

    res.json({
        reporte: descripcionPublica(reporte),
        generado: new Date(),
        ...resultado
    });
}

module.exports = { REPORTES, listarReportes, obtenerReporte, ETIQUETAS_ACCION };
