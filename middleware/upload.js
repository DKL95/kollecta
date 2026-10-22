const path = require("path");
const multer = require("multer");
const mongoose = require("mongoose");

const Imagen = require("../models/Imagen");

// Carpeta donde se guardaban las imágenes antes de moverlas a MongoDB.
// Solo se sigue sirviendo para que las rutas antiguas (/uploads/...) no se rompan.
const CARPETA_UPLOADS = path.join(__dirname, "..", "uploads");

const PREFIJO_URL = "/api/imagenes/";

// El archivo se queda en memoria y después se guarda en la colección "imagenes".
// Solo imágenes, máximo 5 MB.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Solo se permiten imágenes"));
        }
    }
});

// Guarda el archivo recibido por multer y regresa la URL con la que se muestra
async function guardarImagen(archivo, idUsuario) {
    const imagen = await Imagen.create({
        datos: archivo.buffer,
        tipo: archivo.mimetype,
        tamano: archivo.size,
        subidaPor: idUsuario || null
    });

    return PREFIJO_URL + imagen._id;
}

// Borra una imagen guardada en MongoDB a partir de su URL (ignora rutas antiguas o vacías)
async function eliminarImagen(url) {
    if (!url || !url.startsWith(PREFIJO_URL)) return;

    const id = url.slice(PREFIJO_URL.length);
    if (mongoose.isValidObjectId(id)) {
        await Imagen.findByIdAndDelete(id);
    }
}

module.exports = { upload, guardarImagen, eliminarImagen, CARPETA_UPLOADS };
