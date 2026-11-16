/* ==========================================================================
   Registra en la bitácora el inicio y el fin de una operación importante
   (registro, login, publicar, subir video, órdenes, grupos...).

   Uso en una ruta:   router.post("/", registrarOperacion("crear publicación"), crearPublicacion);

   El fin se escribe cuando sale la respuesta, con el código HTTP y la duración;
   si falló (4xx/5xx) se registra como advertencia. Nunca guarda el cuerpo de la
   petición (puede traer contraseñas).
   ========================================================================== */

const logger = require("../config/logger");

function registrarOperacion(nombre) {
    return (req, res, next) => {
        const inicio = process.hrtime.bigint();
        const datos = {
            operacion: nombre,
            metodo: req.method,
            ruta: req.originalUrl.split("?")[0],
            usuario: req.usuario?.id || null,
            ip: req.ip
        };

        logger.info(`Inicio: ${nombre}`, datos);

        let terminado = false;
        const terminar = (abortada) => {
            if (terminado) return;
            terminado = true;

            const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
            const fin = {
                ...datos,
                usuario: req.usuario?.id || res.locals.usuarioId || datos.usuario,
                status: abortada ? null : res.statusCode,
                ms: Math.round(ms)
            };

            if (abortada) logger.warn(`Fin (conexión cerrada): ${nombre}`, fin);
            else if (res.statusCode >= 500) logger.error(`Fin con error: ${nombre}`, fin);
            else if (res.statusCode >= 400) logger.warn(`Fin rechazada: ${nombre}`, fin);
            else logger.info(`Fin: ${nombre}`, fin);
        };

        res.on("finish", () => terminar(false));
        res.on("close", () => terminar(!res.writableFinished));
        next();
    };
}

module.exports = { registrarOperacion };
