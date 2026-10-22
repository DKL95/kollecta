const fs = require("fs");
const path = require("path");
const multer = require("multer");

const CARPETA_UPLOADS = path.join(__dirname, "..", "uploads");

// Crear la carpeta de archivos subidos si no existe (no se sube a git)
fs.mkdirSync(CARPETA_UPLOADS, { recursive: true });

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, CARPETA_UPLOADS);
    },

    filename: function (req, file, cb) {
        const extension = path.extname(file.originalname).toLowerCase();
        cb(null, Date.now() + "-" + Math.round(Math.random() * 1e6) + extension);
    }
});

// Solo imágenes, máximo 5 MB
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Solo se permiten imágenes"));
        }
    }
});

module.exports = { upload, CARPETA_UPLOADS };
