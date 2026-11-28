const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const { CARPETA_TEMP, MAX_TAMANO_IMAGEN } = require("./upload");

// Subidas de historias y Klips. Tienen límites mucho más chicos que las
// publicaciones (100 MB) para cuidar el espacio de Atlas (512 MB en el plan gratis).
const MAX_TAMANO_KLIP = 15 * 1024 * 1024;
const MAX_TAMANO_VIDEO_HISTORIA = 10 * 1024 * 1024;
const MAX_SEGUNDOS_KLIP = 60;
const MAX_SEGUNDOS_HISTORIA = 15;

const almacenamiento = multer.diskStorage({
    destination: (req, file, cb) => cb(null, CARPETA_TEMP),
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
});

const uploadCorto = multer({
    storage: almacenamiento,
    limits: { fileSize: MAX_TAMANO_KLIP, files: 1 },
    fileFilter(req, file, cb) {
        // Klip: solo video. Historia: foto o video.
        if (file.fieldname === "video") {
            return file.mimetype.startsWith("video/") ? cb(null, true) : cb(new Error("Solo se permiten videos"));
        }
        if (file.fieldname === "medio") {
            return file.mimetype.startsWith("video/") || file.mimetype.startsWith("image/")
                ? cb(null, true)
                : cb(new Error("Solo se permiten imágenes o videos"));
        }
        return cb(new Error("Campo de archivo no permitido"));
    }
});

async function borrarTemporal(archivo) {
    if (archivo?.path) await fs.promises.unlink(archivo.path).catch(() => {});
}

// Revisa el peso según el tipo antes de guardarlo (multer solo corta en 15 MB).
async function validarHistoria(req, res, next) {
    const archivo = req.file;
    if (!archivo) return next();

    const esVideo = archivo.mimetype.startsWith("video/");
    const maximo = esVideo ? MAX_TAMANO_VIDEO_HISTORIA : MAX_TAMANO_IMAGEN;

    if (archivo.size > maximo) {
        await borrarTemporal(archivo);
        return res.status(400).json({
            mensaje: esVideo
                ? "El video de una historia puede pesar como máximo 10 MB"
                : "La imagen de una historia puede pesar como máximo 5 MB"
        });
    }

    next();
}

module.exports = {
    uploadCorto,
    validarHistoria,
    borrarTemporal,
    MAX_TAMANO_KLIP,
    MAX_TAMANO_VIDEO_HISTORIA,
    MAX_SEGUNDOS_KLIP,
    MAX_SEGUNDOS_HISTORIA
};
