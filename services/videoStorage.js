const mongoose = require("mongoose");
const { GridFSBucket, ObjectId } = require("mongodb");
const fs = require("fs");

const NOMBRE_BUCKET = "videos";

function obtenerBucket() {
    const db = mongoose.connection.db;

    if (!db) {
        throw new Error("MongoDB todavía no está conectado");
    }

    return new GridFSBucket(db, {
        bucketName: NOMBRE_BUCKET
    });
}

// Guarda un archivo temporal en GridFS mediante un flujo de datos.
function guardarVideo(archivo, idUsuario) {
    const bucket = obtenerBucket();
    const idVideo = new ObjectId();

    return new Promise((resolve, reject) => {
        const lectura = fs.createReadStream(archivo.path);

        const subida = bucket.openUploadStreamWithId(
            idVideo,
            archivo.originalname,
            {
                contentType: archivo.mimetype,
                metadata: {
                    subidaPor: idUsuario || null,
                    tamano: archivo.size
                }
            }
        );

        lectura.on("error", reject);
        subida.on("error", reject);

        subida.on("finish", () => {
            resolve(`/api/videos/${idVideo.toString()}`);
        });

        lectura.pipe(subida);
    });
}

// Recupera un video de GridFS para reproducirlo.
function obtenerVideo(id) {
    if (!ObjectId.isValid(id)) {
        throw new Error("ID de video inválido");
    }

    const bucket = obtenerBucket();

    return bucket.openDownloadStream(new ObjectId(id));
}

// Elimina un video de GridFS.
async function eliminarVideo(id) {
    if (!ObjectId.isValid(id)) {
        return;
    }

    const bucket = obtenerBucket();

    await bucket.delete(new ObjectId(id));
}

module.exports = {
    guardarVideo,
    obtenerVideo,
    eliminarVideo
};