/* ==========================================================================
   Reglas compartidas de los videos cortos (historias y Klips):
   - Duración máxima, leída del propio archivo (services/duracionVideo.js) y,
     si no se puede leer, la que manda el navegador.
   - Tope de espacio: antes de guardar un video se revisa cuánto ocupan ya los
     videos en GridFS para no llenar el plan gratis de Atlas (512 MB en total).
   ========================================================================== */

const { ArchivoVideo, eliminarVideo } = require("./videoStorage");
const { duracionDeArchivo } = require("./duracionVideo");
const { eliminarImagen } = require("../middleware/upload");
const logger = require("../config/logger");

// Espacio total que pueden ocupar los videos (MB). Se puede cambiar en Render con LIMITE_VIDEOS_MB.
function limiteVideosMB() {
    return Number(process.env.LIMITE_VIDEOS_MB) || 300;
}
// Margen sobre la duración: los contenedores redondean y el navegador también.
const TOLERANCIA_SEGUNDOS = 0.5;

class ErrorMedio extends Error {
    constructor(status, mensaje) {
        super(mensaje);
        this.status = status;
    }
}

// Regresa los segundos del video o lanza ErrorMedio(400) si se pasa del máximo.
async function revisarDuracion(archivo, declarada, maximo, nombre) {
    const leida = await duracionDeArchivo(archivo.path);
    const delNavegador = Number(declarada);
    const segundos = leida ?? (Number.isFinite(delNavegador) && delNavegador > 0 ? delNavegador : null);

    if (segundos === null) {
        throw new ErrorMedio(400, "No se pudo saber cuánto dura el video. Intenta con un MP4.");
    }
    if (segundos > maximo + TOLERANCIA_SEGUNDOS) {
        throw new ErrorMedio(400, `${nombre} puede durar como máximo ${maximo} segundos`);
    }

    return Math.round(segundos * 10) / 10;
}

async function espacioUsadoVideos() {
    const [total] = await ArchivoVideo.aggregate([{ $group: { _id: null, bytes: { $sum: "$length" } } }]);
    return total?.bytes || 0;
}

async function revisarEspacio(tamano) {
    const usado = await espacioUsadoVideos();
    if (usado + tamano > limiteVideosMB() * 1024 * 1024) {
        logger.warn("Subida de video rechazada: se llegó al tope de espacio", { usadoMB: Math.round(usado / 1048576) });
        throw new ErrorMedio(507, "Ya no hay espacio para más videos por ahora. Prueba con una foto o borra algún Klip viejo.");
    }
}

// Borra el archivo de una historia o Klip (imagen en "imagenes" o video en GridFS).
async function borrarMedio(url) {
    if (!url) return;
    try {
        if (url.startsWith("/api/videos/")) await eliminarVideo(url.split("/").pop());
        else await eliminarImagen(url);
    } catch (error) {
        // Si ya no existía no pasa nada.
        if (!/File not found/i.test(error.message)) logger.warn("No se pudo borrar un archivo:", error.message);
    }
}

module.exports = {
    ErrorMedio,
    revisarDuracion,
    revisarEspacio,
    espacioUsadoVideos,
    borrarMedio,
    limiteVideosMB
};
