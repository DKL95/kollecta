/* ==========================================================================
   Tareas: diarias, semanales y logros. Cada acción de la app registra un
   "evento" (publicar, comentar, jugar...) que hace avanzar las tareas que lo
   usan. Al terminar una tarea se reclama y da un sobre de estampitas.

   Los días cambian a medianoche de Monterrey (America/Monterrey).
   ========================================================================== */

const ProgresoTarea = require("../models/ProgresoTarea");
const logger = require("../config/logger");
const { sortearSobre, agregarAlAlbum } = require("./estampitas");

const ZONA = "America/Monterrey";
const DIA_MS = 24 * 60 * 60 * 1000;

/* tipo: diaria | semanal | logro
   evento: lo que la hace avanzar
   modo: "suma" (cada evento suma) o "maximo" (se queda el valor más alto, p. ej. un puntaje)
   recompensa: cuántas estampitas da y la rareza mínima garantizada de la primera */
const TAREAS = [
    { id: "d_visita", tipo: "diaria", evento: "visita", meta: 1, titulo: "Pasa a saludar", descripcion: "Entra a KollectA hoy.", recompensa: { cantidad: 1 } },
    { id: "d_publicar", tipo: "diaria", evento: "publicar", meta: 1, titulo: "Comparte algo", descripcion: "Haz una publicación.", recompensa: { cantidad: 2 } },
    { id: "d_comentar", tipo: "diaria", evento: "comentar", meta: 2, titulo: "Echa porras", descripcion: "Comenta o responde 2 veces.", recompensa: { cantidad: 1 } },
    { id: "d_like", tipo: "diaria", evento: "like", meta: 5, titulo: "Reparte amor", descripcion: "Da 5 me gusta.", recompensa: { cantidad: 1 } },
    { id: "d_sticker", tipo: "diaria", evento: "sticker", meta: 1, titulo: "Habla con stickers", descripcion: "Manda un sticker de tu avatar en el chat.", recompensa: { cantidad: 1 } },
    { id: "d_historia", tipo: "diaria", evento: "historia", meta: 1, titulo: "Cuenta tu día", descripcion: "Sube una historia.", recompensa: { cantidad: 1 } },
    { id: "d_jugar", tipo: "diaria", evento: "partida", meta: 2, titulo: "Hora de jugar", descripcion: "Juega 2 partidas de cualquier minijuego.", recompensa: { cantidad: 2 } },

    { id: "s_snake", tipo: "semanal", evento: "puntos_snake", modo: "maximo", meta: 30, titulo: "Fila de fans", descripcion: "Consigue 30 puntos en Lightstick Snake.", recompensa: { cantidad: 3, minRareza: "rara" } },
    { id: "s_tiendita", tipo: "semanal", evento: "puntos_tiendita", modo: "maximo", meta: 600, titulo: "Tiendita exitosa", descripcion: "Gana $600 en un día de K-Style Boutique.", recompensa: { cantidad: 3, minRareza: "rara" } },
    { id: "s_memorama", tipo: "semanal", evento: "memorama", meta: 3, titulo: "Memoria de fan", descripcion: "Completa el memorama 3 veces.", recompensa: { cantidad: 3 } },
    { id: "s_mensajes", tipo: "semanal", evento: "mensaje", meta: 20, titulo: "Buena plática", descripcion: "Manda 20 mensajes.", recompensa: { cantidad: 2 } },
    { id: "s_klip", tipo: "semanal", evento: "klip", meta: 1, titulo: "Director de Klips", descripcion: "Sube un Klip.", recompensa: { cantidad: 3, minRareza: "rara" } },
    { id: "s_coleccion", tipo: "semanal", evento: "coleccion", meta: 1, titulo: "Vitrina creciente", descripcion: "Agrega una pieza a tu colección.", recompensa: { cantidad: 2 } },

    { id: "l_avatar", tipo: "logro", evento: "avatar", meta: 1, titulo: "Nueva imagen", descripcion: "Crea tu avatar.", recompensa: { cantidad: 3, minRareza: "rara" } },
    { id: "l_sticker", tipo: "logro", evento: "sticker_creado", meta: 1, titulo: "Diseñador de stickers", descripcion: "Guarda tu primer sticker propio.", recompensa: { cantidad: 2 } },
    { id: "l_publicaciones", tipo: "logro", evento: "publicar", meta: 10, titulo: "Voz del fandom", descripcion: "Haz 10 publicaciones.", recompensa: { cantidad: 4, minRareza: "epica" } },
    { id: "l_snake", tipo: "logro", evento: "puntos_snake", modo: "maximo", meta: 100, titulo: "Maestro del lightstick", descripcion: "Llega a 100 puntos en Lightstick Snake.", recompensa: { cantidad: 3, minRareza: "epica" } },
    { id: "l_tiendita", tipo: "logro", evento: "puntos_tiendita", modo: "maximo", meta: 2000, titulo: "Magnate de la moda", descripcion: "Gana $2000 en un día de K-Style Boutique.", recompensa: { cantidad: 3, minRareza: "epica" } },
    { id: "l_serie", tipo: "logro", evento: "serie_completa", meta: 1, titulo: "Serie completa", descripcion: "Completa una serie de tu álbum.", recompensa: { cantidad: 1, minRareza: "legendaria" } }
];

class ErrorTarea extends Error {
    constructor(status, mensaje) {
        super(mensaje);
        this.status = status;
    }
}

/* ------------------------------ Periodos ------------------------------ */

// Fecha local de Monterrey como { anio, mes, dia, hora, minuto, segundo }.
function partesLocales(fecha = new Date()) {
    const partes = new Intl.DateTimeFormat("en-CA", {
        timeZone: ZONA,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
    }).formatToParts(fecha);
    const valor = (tipo) => Number(partes.find((p) => p.type === tipo).value);
    return { anio: valor("year"), mes: valor("month"), dia: valor("day"), hora: valor("hour"), minuto: valor("minute"), segundo: valor("second") };
}

const dos = (n) => String(n).padStart(2, "0");

function claveDia(fecha = new Date()) {
    const { anio, mes, dia } = partesLocales(fecha);
    return `${anio}-${dos(mes)}-${dos(dia)}`;
}

// Semana ISO (empieza el lunes) de la fecha local.
function claveSemana(fecha = new Date()) {
    const { anio, mes, dia } = partesLocales(fecha);
    const d = new Date(Date.UTC(anio, mes - 1, dia));
    const diaSemana = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - diaSemana);
    const inicioAnio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const semana = Math.ceil(((d - inicioAnio) / DIA_MS + 1) / 7);
    return `${d.getUTCFullYear()}-S${dos(semana)}`;
}

function periodoDe(tipo, fecha = new Date()) {
    if (tipo === "diaria") return claveDia(fecha);
    if (tipo === "semanal") return claveSemana(fecha);
    return "siempre";
}

// Segundos que faltan para la medianoche local y para el próximo lunes.
function segundosParaReinicio(fecha = new Date()) {
    const { hora, minuto, segundo, anio, mes, dia } = partesLocales(fecha);
    const restoDia = DIA_MS / 1000 - (hora * 3600 + minuto * 60 + segundo);
    const diaSemana = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay() || 7;
    return { diaria: restoDia, semanal: restoDia + (7 - diaSemana) * 86400 };
}

function expiracion(tipo) {
    return tipo === "logro" ? null : new Date(Date.now() + 35 * DIA_MS);
}

/* ------------------------------ Eventos ------------------------------- */

async function actualizarProgreso(usuarioId, tarea, cantidad, valor) {
    const filtro = { usuario: usuarioId, tarea: tarea.id, periodo: periodoDe(tarea.tipo) };
    const cambio = tarea.modo === "maximo"
        ? { $max: { progreso: Math.max(0, Number(valor) || 0) } }
        : { $inc: { progreso: cantidad } };
    const opciones = { upsert: true, setDefaultsOnInsert: true };

    try {
        await ProgresoTarea.updateOne(filtro, { ...cambio, $setOnInsert: { expiraEn: expiracion(tarea.tipo) } }, opciones);
    } catch (error) {
        // Dos eventos al mismo tiempo pueden intentar crear el mismo documento: se reintenta una vez.
        if (error?.code !== 11000) throw error;
        await ProgresoTarea.updateOne(filtro, cambio);
    }
}

// Registra una acción. Nunca lanza error: una tarea no debe romper la acción principal.
// valor: para tareas de modo "maximo" (p. ej. el puntaje de una partida).
async function registrarEvento(usuarioId, evento, { cantidad = 1, valor } = {}) {
    if (!usuarioId) return;
    const tareas = TAREAS.filter((t) => t.evento === evento);
    try {
        await Promise.all(tareas.map((tarea) => actualizarProgreso(usuarioId, tarea, cantidad, valor ?? cantidad)));
    } catch (error) {
        logger.error(`No se pudo registrar el evento "${evento}":`, error);
    }
}

/* ------------------------------ Consultas ----------------------------- */

async function listarTareas(usuarioId) {
    const periodos = [...new Set(TAREAS.map((t) => periodoDe(t.tipo)))];
    const progresos = await ProgresoTarea.find({ usuario: usuarioId, periodo: { $in: periodos } }).lean();

    const tareas = TAREAS.map((tarea) => {
        const registro = progresos.find((p) => p.tarea === tarea.id && p.periodo === periodoDe(tarea.tipo));
        const progreso = Math.min(registro?.progreso || 0, tarea.meta);
        return {
            id: tarea.id,
            tipo: tarea.tipo,
            titulo: tarea.titulo,
            descripcion: tarea.descripcion,
            meta: tarea.meta,
            progreso,
            completada: progreso >= tarea.meta,
            reclamada: Boolean(registro?.reclamada),
            recompensa: { cantidad: tarea.recompensa.cantidad, minRareza: tarea.recompensa.minRareza || "comun" }
        };
    });

    return {
        tareas,
        porReclamar: tareas.filter((t) => t.completada && !t.reclamada).length,
        reinicioEn: segundosParaReinicio()
    };
}

async function reclamarTarea(usuarioId, tareaId) {
    const tarea = TAREAS.find((t) => t.id === tareaId);
    if (!tarea) throw new ErrorTarea(404, "Esa tarea no existe");

    const periodo = periodoDe(tarea.tipo);

    // Atómico: solo una petición puede marcarla como reclamada.
    const marcada = await ProgresoTarea.findOneAndUpdate(
        { usuario: usuarioId, tarea: tarea.id, periodo, reclamada: false, progreso: { $gte: tarea.meta } },
        { $set: { reclamada: true, reclamadaEn: new Date() } },
        { new: true }
    );

    if (!marcada) {
        const registro = await ProgresoTarea.findOne({ usuario: usuarioId, tarea: tarea.id, periodo }).lean();
        if (registro?.reclamada) throw new ErrorTarea(409, "Ya reclamaste esta tarea");
        throw new ErrorTarea(400, "Todavía no terminas esta tarea");
    }

    const ids = sortearSobre(tarea.recompensa.cantidad, tarea.recompensa.minRareza);
    const resultado = await agregarAlAlbum(usuarioId, ids);

    if (resultado.seriesNuevas.length > 0) {
        await registrarEvento(usuarioId, "serie_completa", { cantidad: resultado.seriesNuevas.length });
    }

    return resultado;
}

module.exports = {
    TAREAS,
    ErrorTarea,
    registrarEvento,
    listarTareas,
    reclamarTarea,
    claveDia,
    claveSemana,
    periodoDe,
    segundosParaReinicio
};
