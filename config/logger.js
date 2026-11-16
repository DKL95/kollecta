/* ==========================================================================
   Bitácora de la aplicación (winston).

   - logs/app.log    → todo desde el nivel LOG_LEVEL (por defecto "info"), en JSON por línea.
   - logs/error.log  → solo errores, con stack.
   - Consola         → mismo contenido en formato legible (apagada en las pruebas).

   Se usa como console: logger.info("texto", dato), logger.error("Falló X:", error).
   Los Error se guardan con su mensaje y stack; los objetos, como metadatos.
   En Render los archivos se borran al reiniciar el servicio.
   ========================================================================== */

const path = require("path");
const winston = require("winston");

const CARPETA_LOGS = process.env.LOG_DIR || path.join(__dirname, "..", "logs");
const EN_PRUEBAS = process.env.NODE_ENV === "test" || process.argv.includes("--test") || Boolean(process.env.NODE_TEST_CONTEXT);
const NIVEL = process.env.LOG_LEVEL || (EN_PRUEBAS ? "warn" : "info");

const MAX_TAMANO = 5 * 1024 * 1024; // 5 MB por archivo
const MAX_ARCHIVOS = 5;

const formatoArchivo = winston.format.combine(winston.format.timestamp(), winston.format.json());

const formatoConsola = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: "HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
        return `${timestamp} ${level} ${message}${extra}${stack ? `\n${stack}` : ""}`;
    })
);

const base = winston.createLogger({
    level: NIVEL,
    transports: [
        new winston.transports.File({
            filename: path.join(CARPETA_LOGS, EN_PRUEBAS ? "test.log" : "app.log"),
            format: formatoArchivo,
            maxsize: MAX_TAMANO,
            maxFiles: MAX_ARCHIVOS,
            tailable: true
        }),
        new winston.transports.File({
            filename: path.join(CARPETA_LOGS, EN_PRUEBAS ? "test-error.log" : "error.log"),
            level: "error",
            format: formatoArchivo,
            maxsize: MAX_TAMANO,
            maxFiles: MAX_ARCHIVOS,
            tailable: true
        }),
        new winston.transports.Console({ format: formatoConsola, silent: EN_PRUEBAS })
    ]
});

// Convierte los argumentos estilo console (textos, errores, objetos) en { message, meta }.
function normalizar(args) {
    const textos = [];
    const meta = {};

    for (const arg of args) {
        if (arg instanceof Error) {
            meta.error = arg.message;
            meta.stack = arg.stack;
            if (arg.code !== undefined) meta.code = arg.code;
        } else if (arg && typeof arg === "object" && !Array.isArray(arg)) {
            Object.assign(meta, arg);
        } else if (Array.isArray(arg)) {
            textos.push(JSON.stringify(arg));
        } else {
            textos.push(String(arg));
        }
    }

    const message = textos.join(" ").replace(/:\s*$/, "") || meta.error || "(sin mensaje)";
    return { message, meta };
}

function crearNivel(nivel) {
    return (...args) => {
        const { message, meta } = normalizar(args);
        base.log(nivel, message, meta);
    };
}

const logger = {
    error: crearNivel("error"),
    warn: crearNivel("warn"),
    info: crearNivel("info"),
    http: crearNivel("http"),
    debug: crearNivel("debug"),
    winston: base
};

module.exports = logger;
