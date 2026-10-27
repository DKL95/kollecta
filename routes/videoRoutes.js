const express = require("express");
const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");
const {
    obtenerVideo
} = require("../services/videoStorage");
const {
    requiereAuth,
    generarTokenReproduccion,
    requiereAuthVideo
} = require("../middleware/auth");

const router = express.Router();

// Generar una URL temporal de reproducción.
// Esta ruta sí exige el JWT normal del usuario.
router.get("/:id/playback-url", requiereAuth, async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                mensaje: "ID de video inválido"
            });
        }

        const db = mongoose.connection.db;

        if (!db) {
            return res.status(503).json({
                mensaje: "La base de datos no está conectada"
            });
        }

        const archivo = await db.collection("videos.files").findOne({
            _id: new ObjectId(id)
        });

        if (!archivo) {
            return res.status(404).json({
                mensaje: "Video no encontrado"
            });
        }

        const token = generarTokenReproduccion(req.usuario, id);

        res.set("Cache-Control", "no-store");

        return res.json({
            url: `/api/videos/${id}?token=${encodeURIComponent(token)}`
        });
    } catch (error) {
        console.error("Error al generar URL de reproducción:", error);

        return res.status(500).json({
            mensaje: "No se pudo preparar la reproducción del video"
        });
    }
});

// Transmitir el video. Acepta el JWT normal o el permiso temporal.
router.get("/:id", requiereAuthVideo, async (req, res) => {
    let flujo;

    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                mensaje: "ID de video inválido"
            });
        }

        const db = mongoose.connection.db;

        if (!db) {
            return res.status(503).json({
                mensaje: "La base de datos no está conectada"
            });
        }

        const archivo = await db.collection("videos.files").findOne({
            _id: new ObjectId(id)
        });

        if (!archivo) {
            return res.status(404).json({
                mensaje: "Video no encontrado"
            });
        }

        const tamano = archivo.length;

        // Los archivos que se guardaron sin un contentType persistido
        // pueden requerir que lo infiramos por el nombre.
        const extension = (archivo.filename || "").split(".").pop().toLowerCase();

        const tipos = {
            mp4: "video/mp4",
            webm: "video/webm",
            mov: "video/quicktime",
            m4v: "video/x-m4v",
            ogv: "video/ogg"
        };

        const contentType =
            archivo.contentType ||
            archivo.metadata?.contentType ||
            tipos[extension] ||
            "application/octet-stream";

        res.set({
            "Content-Type": contentType,
            "Accept-Ranges": "bytes",
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff"
        });

        const range = req.headers.range;

        if (range) {
            // Se admite un único rango de bytes.
            const coincidencia = /^bytes=(\d*)-(\d*)$/.exec(range);

            if (!coincidencia || (!coincidencia[1] && !coincidencia[2])) {
                res.set("Content-Range", `bytes */${tamano}`);
                return res.status(416).end();
            }

            let inicio;
            let fin;

            if (coincidencia[1] === "") {
                // Rango de sufijo: bytes=-500
                const sufijo = Number(coincidencia[2]);

                if (!Number.isSafeInteger(sufijo) || sufijo <= 0) {
                    res.set("Content-Range", `bytes */${tamano}`);
                    return res.status(416).end();
                }

                inicio = Math.max(0, tamano - sufijo);
                fin = tamano - 1;
            } else {
                inicio = Number(coincidencia[1]);
                fin = coincidencia[2] === ""
                    ? tamano - 1
                    : Number(coincidencia[2]);

                if (
                    !Number.isSafeInteger(inicio) ||
                    !Number.isSafeInteger(fin) ||
                    inicio < 0 ||
                    inicio >= tamano ||
                    fin < inicio
                ) {
                    res.set("Content-Range", `bytes */${tamano}`);
                    return res.status(416).end();
                }

                fin = Math.min(fin, tamano - 1);
            }

            res.status(206);
            res.set({
                "Content-Range": `bytes ${inicio}-${fin}/${tamano}`,
                "Content-Length": String(fin - inicio + 1)
            });

            // GridFS utiliza inicio inclusivo y fin exclusivo.
            flujo = obtenerVideo(id, {
                start: inicio,
                end: fin + 1
            });
        } else {
            res.set("Content-Length", String(tamano));
            flujo = obtenerVideo(id);
        }

        flujo.on("error", (error) => {
            console.error("Error al transmitir el video:", error.message);

            if (!res.headersSent) {
                res.status(500).end();
            } else {
                res.destroy(error);
            }
        });

        res.on("close", () => {
            if (flujo && !flujo.destroyed) {
                flujo.destroy();
            }
        });

        flujo.pipe(res);
    } catch (error) {
        console.error("Error al obtener el video:", error);

        if (!res.headersSent) {
            return res.status(500).json({
                mensaje: "Error al obtener el video"
            });
        }

        res.destroy(error);
    }
});

module.exports = router;