const mongoose = require("mongoose");

const { ArchivoVideo, obtenerVideo } = require("../services/videoStorage");
const { generarTokenReproduccion } = require("../middleware/auth");
const logger = require("../config/logger");

const TIPOS_POR_EXTENSION = {
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    m4v: "video/x-m4v",
    ogv: "video/ogg"
};

// Busca los datos del video en videos.files; responde el error si no se puede.
async function buscarArchivo(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) {
        res.status(400).json({ mensaje: "ID de video inválido" });
        return null;
    }

    const archivo = await ArchivoVideo.findById(req.params.id).lean();
    if (!archivo) {
        res.status(404).json({ mensaje: "Video no encontrado" });
        return null;
    }
    return archivo;
}

function tipoDeContenido(archivo) {
    const extension = (archivo.filename || "").split(".").pop().toLowerCase();
    return archivo.contentType || archivo.metadata?.contentType || TIPOS_POR_EXTENSION[extension] || "application/octet-stream";
}

// "bytes=inicio-fin" → { inicio, fin } (fin inclusivo), o null si el rango no es válido.
function leerRango(range, tamano) {
    const coincidencia = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!coincidencia || (!coincidencia[1] && !coincidencia[2])) return null;

    if (coincidencia[1] === "") {
        // Rango de sufijo: bytes=-500 (los últimos 500 bytes)
        const sufijo = Number(coincidencia[2]);
        if (!Number.isSafeInteger(sufijo) || sufijo <= 0) return null;
        return { inicio: Math.max(0, tamano - sufijo), fin: tamano - 1 };
    }

    const inicio = Number(coincidencia[1]);
    const fin = coincidencia[2] === "" ? tamano - 1 : Number(coincidencia[2]);
    if (!Number.isSafeInteger(inicio) || !Number.isSafeInteger(fin) || inicio < 0 || inicio >= tamano || fin < inicio) {
        return null;
    }
    return { inicio, fin: Math.min(fin, tamano - 1) };
}

// GET /api/videos/:id/playback-url  (JWT normal) → URL temporal para <video src>
async function urlReproduccion(req, res) {
    try {
        const archivo = await buscarArchivo(req, res);
        if (!archivo) return;

        const token = generarTokenReproduccion(req.usuario, req.params.id);
        res.set("Cache-Control", "no-store");
        res.json({ url: `/api/videos/${req.params.id}?token=${encodeURIComponent(token)}` });
    } catch (error) {
        logger.error("Error al generar URL de reproducción:", error);
        res.status(500).json({ mensaje: "No se pudo preparar la reproducción del video" });
    }
}

// GET /api/videos/:id  (JWT normal o permiso temporal) → transmite el video, con soporte de rangos
async function transmitirVideo(req, res) {
    let flujo;

    try {
        const archivo = await buscarArchivo(req, res);
        if (!archivo) return;

        const tamano = archivo.length;
        res.set({
            "Content-Type": tipoDeContenido(archivo),
            "Accept-Ranges": "bytes",
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff"
        });

        if (req.headers.range) {
            const rango = leerRango(req.headers.range, tamano);
            if (!rango) {
                res.set("Content-Range", `bytes */${tamano}`);
                return res.status(416).end();
            }

            res.status(206);
            res.set({
                "Content-Range": `bytes ${rango.inicio}-${rango.fin}/${tamano}`,
                "Content-Length": String(rango.fin - rango.inicio + 1)
            });
            // GridFS usa inicio inclusivo y fin exclusivo.
            flujo = obtenerVideo(req.params.id, { start: rango.inicio, end: rango.fin + 1 });
        } else {
            res.set("Content-Length", String(tamano));
            flujo = obtenerVideo(req.params.id);
        }

        flujo.on("error", (error) => {
            logger.error("Error al transmitir el video:", error.message);
            if (!res.headersSent) res.status(500).end();
            else res.destroy(error);
        });

        res.on("close", () => {
            if (!flujo.destroyed) flujo.destroy();
        });

        flujo.pipe(res);
    } catch (error) {
        logger.error("Error al obtener el video:", error);
        if (!res.headersSent) return res.status(500).json({ mensaje: "Error al obtener el video" });
        res.destroy(error);
    }
}

module.exports = { urlReproduccion, transmitirVideo, leerRango };
