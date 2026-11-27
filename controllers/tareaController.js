const logger = require("../config/logger");
const { ErrorTarea, listarTareas, reclamarTarea, registrarEvento } = require("../services/tareas");

// GET /api/tareas  → tareas del día, de la semana y logros con mi avance.
// Abrir las tareas cuenta para la diaria "Pasa a saludar".
async function obtenerTareas(req, res) {
    try {
        await registrarEvento(req.usuario.id, "visita");
        res.json(await listarTareas(req.usuario.id));
    } catch (error) {
        logger.error("Error al listar tareas:", error);
        res.status(500).json({ mensaje: "No se pudieron cargar las tareas" });
    }
}

// POST /api/tareas/:id/reclamar  → abre el sobre de la tarea terminada.
async function reclamar(req, res) {
    try {
        const { obtenidas, seriesNuevas } = await reclamarTarea(req.usuario.id, req.params.id);
        res.json({ mensaje: "¡Sobre abierto!", estampitas: obtenidas, seriesNuevas });
    } catch (error) {
        if (error instanceof ErrorTarea) return res.status(error.status).json({ mensaje: error.message });
        logger.error("Error al reclamar tarea:", error);
        res.status(500).json({ mensaje: "No se pudo reclamar la tarea" });
    }
}

module.exports = { obtenerTareas, reclamar };
