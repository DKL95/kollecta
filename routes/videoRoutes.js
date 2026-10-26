const express = require("express");
const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");
const { obtenerVideo } = require("../services/videoStorage");
const { requiereAuth } = require("../middleware/auth");

const router = express.Router();

// Reproducir un video almacenado en MongoDB GridFS.
router.get("/:id", requiereAuth, async (req, res) => {
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

        // Buscar los metadatos del video en GridFS.
        const archivo = await db
            .collection("videos.files")
            .findOne({ _id: new ObjectId(id) });

        if (!archivo) {
            return res.status(404).json({
                mensaje: "Video no encontrado"
            });
        }

        res.set("Content-Type", archivo.contentType || "application/octet-stream");
        res.set("Accept-Ranges", "bytes");
        res.set("Cache-Control", "private, no-cache");

        const flujo = obtenerVideo(id);

        flujo.on("error", (error) => {
            console.error("Error al transmitir el video:", error);

            if (!res.headersSent) {
                res.status(500).json({
                    mensaje: "No se pudo reproducir el video"
                });
            } else {
                res.destroy(error);
            }
        });

        flujo.pipe(res);
    } catch (error) {
        console.error("Error al obtener el video:", error);

        if (!res.headersSent) {
            res.status(500).json({
                mensaje: "Error al obtener el video"
            });
        } else {
            res.destroy(error);
        }
    }
});

module.exports = router;