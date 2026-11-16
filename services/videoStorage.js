const mongoose = require("mongoose");
const { GridFSBucket, ObjectId } = require("mongodb");
const fs = require("fs");

const NOMBRE_BUCKET = "videos";

// Mongoose no sabe guardar archivos en GridFS, así que subir, transmitir y borrar
// el contenido usa GridFSBucket (driver oficial que ya viene con Mongoose).
// Los datos del archivo (nombre, tamaño, tipo) sí se consultan con este modelo.
const ArchivoVideo = mongoose.model(
    "ArchivoVideo",
    new mongoose.Schema(
        {
            filename: String,
            contentType: String,
            length: Number,
            chunkSize: Number,
            uploadDate: Date,
            metadata: { subidaPor: mongoose.Schema.Types.ObjectId, tamano: Number, contentType: String }
        },
        // GridFS crea la colección y sus índices; Mongoose solo la lee.
        { collection: `${NOMBRE_BUCKET}.files`, versionKey: false, autoCreate: false, autoIndex: false }
    )
);

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
function obtenerVideo(id, opciones = {}) {
    if (!ObjectId.isValid(id)) {
        throw new Error("ID de video inválido");
    }

    const bucket = obtenerBucket();

    return bucket.openDownloadStream(
        new ObjectId(id),
        opciones
    );
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
    ArchivoVideo,
    guardarVideo,
    obtenerVideo,
    eliminarVideo
};