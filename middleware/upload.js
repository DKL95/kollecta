const path = require("path");
const fs = require("fs");
const multer = require("multer");
const mongoose = require("mongoose");
const crypto = require("crypto");

const Imagen = require("../models/Imagen");

// Carpetas para archivos temporales y archivos antiguos.
const CARPETA_UPLOADS = path.join(__dirname, "..", "uploads");
const CARPETA_TEMP = path.join(CARPETA_UPLOADS, "temp");

const PREFIJO_URL = "/api/imagenes/";

const MAX_TAMANO_IMAGEN = 5 * 1024 * 1024;
const MAX_TAMANO_VIDEO = 100 * 1024 * 1024;

fs.mkdirSync(CARPETA_TEMP, { recursive: true });

// Los archivos se reciben temporalmente en disco para evitar
// cargar videos grandes completos en la memoria.
const almacenamiento = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, CARPETA_TEMP);
    },

    filename: function (req, file, cb) {
        const extension = path.extname(file.originalname).toLowerCase();
        const nombre = `${crypto.randomUUID()}${extension}`;

        cb(null, nombre);
    }
});

const upload = multer({
    storage: almacenamiento,

    limits: {
        fileSize: MAX_TAMANO_VIDEO,
        files: 15
    },

    fileFilter: function (req, file, cb) {
        if (file.fieldname === "imagenes") {
            if (!file.mimetype.startsWith("image/")) {
                return cb(new Error("Solo se permiten imágenes en el campo imagenes"));
            }

            return cb(null, true);
        }

        if (file.fieldname === "videos") {
            if (!file.mimetype.startsWith("video/")) {
                return cb(new Error("Solo se permiten videos en el campo videos"));
            }

            return cb(null, true);
        }

        return cb(new Error("Campo de archivo no permitido"));
    }
});

// Comprueba las cantidades y los tamaños después de recibir los archivos.
async function validarArchivos(req, res, next) {
    const archivos = req.files || {};

    const imagenes = archivos.imagenes || [];
    const videos = archivos.videos || [];

    const todos = [...imagenes, ...videos];

    let mensajeError = null;

    if (imagenes.length > 10) {
        mensajeError = "Puedes subir un máximo de 10 imágenes";
    } else if (videos.length > 5) {
        mensajeError = "Puedes subir un máximo de 5 videos";
    } else if (imagenes.some(archivo => archivo.size > MAX_TAMANO_IMAGEN)) {
        mensajeError = "Cada imagen puede pesar como máximo 5 MB";
    } else if (videos.some(archivo => archivo.size > MAX_TAMANO_VIDEO)) {
        mensajeError = "Cada video puede pesar como máximo 100 MB";
    }

    if (mensajeError) {
        await Promise.all(
            todos.map(archivo =>
                fs.promises.unlink(archivo.path).catch(() => {})
            )
        );

        return res.status(400).json({ mensaje: mensajeError });
    }

    next();
}

// Guarda una imagen en MongoDB.
// Admite archivos temporales en disco y buffers por compatibilidad.
async function guardarImagen(archivo, idUsuario) {
    const datos = archivo.buffer || await fs.promises.readFile(archivo.path);

    try {
        if (datos.length > MAX_TAMANO_IMAGEN) {
            throw new Error("Cada imagen puede pesar como máximo 5 MB");
        }

        const imagen = await Imagen.create({
            datos,
            tipo: archivo.mimetype,
            tamano: datos.length,
            subidaPor: idUsuario || null
        });

        return PREFIJO_URL + imagen._id;
    } finally {
        if (archivo.path) {
            await fs.promises.unlink(archivo.path).catch(() => {});
        }
    }
}

// Borra una imagen de MongoDB a partir de su URL.
async function eliminarImagen(url) {
    if (!url || !url.startsWith(PREFIJO_URL)) return;

    const id = url.slice(PREFIJO_URL.length);

    if (mongoose.isValidObjectId(id)) {
        await Imagen.findByIdAndDelete(id);
    }
}

module.exports = {
    upload,
    validarArchivos,
    guardarImagen,
    eliminarImagen,
    CARPETA_UPLOADS,
    CARPETA_TEMP,
    MAX_TAMANO_IMAGEN,
    MAX_TAMANO_VIDEO
};