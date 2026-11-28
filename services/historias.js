/* ==========================================================================
   Limpieza de historias vencidas: borra el documento y su archivo
   (imagen o video). Corre al arrancar el servidor y luego cada 10 minutos.
   ========================================================================== */

const Historia = require("../models/Historia");
const { borrarMedio } = require("./videosCortos");
const logger = require("../config/logger");

const CADA_MS = 10 * 60 * 1000;

async function limpiarHistoriasVencidas(ahora = new Date()) {
    const vencidas = await Historia.find({ expiraEn: { $lte: ahora } }).select("medio").limit(500).lean();
    if (!vencidas.length) return 0;

    for (const historia of vencidas) {
        await borrarMedio(historia.medio);
    }
    await Historia.deleteMany({ _id: { $in: vencidas.map((h) => h._id) } });

    logger.info(`Historias vencidas borradas: ${vencidas.length}`);
    return vencidas.length;
}

function iniciarLimpiezaHistorias() {
    const correr = () =>
        limpiarHistoriasVencidas().catch((error) => logger.error("Error al limpiar historias vencidas:", error));

    correr();
    // unref: el temporizador no impide que el proceso termine.
    setInterval(correr, CADA_MS).unref();
}

module.exports = { limpiarHistoriasVencidas, iniciarLimpiezaHistorias };
