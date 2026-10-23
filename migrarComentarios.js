const mongoose = require("mongoose");
require("dotenv").config();

const Publicacion = require("./models/Publicacion");
const Comentario = require("./models/Comentario");
const Respuesta = require("./models/Respuesta");

async function migrarComentarios() {
    try {
        // Conectar explícitamente a la base de datos kpop.
        await mongoose.connect(process.env.MONGODB_URI, {
            dbName: process.env.MONGODB_DB || "kpop"
        });

        console.log("✅ Conectado a MongoDB.");
        console.log("Base de datos:", mongoose.connection.name);

        // Leer directamente la colección original.
        const publicaciones = await Publicacion.collection
            .find({
                "comentarios.0": { $exists: true }
            })
            .toArray();

        console.log(
            `📦 Publicaciones con comentarios: ${publicaciones.length}`
        );

        let comentariosMigrados = 0;
        let respuestasMigradas = 0;
        let comentariosExistentes = 0;
        let respuestasExistentes = 0;

        for (const publicacion of publicaciones) {
            for (const comentarioAntiguo of publicacion.comentarios || []) {
                const comentarioId = comentarioAntiguo._id;

                if (!comentarioId) {
                    console.log("⚠️ Comentario sin ID; se omite.");
                    continue;
                }

                // Buscar el comentario por su ID original.
                let comentario = await Comentario.findById(comentarioId);

                if (!comentario) {
                    comentario = await Comentario.create({
                        _id: comentarioId,
                        publicacion: publicacion._id,
                        autor: comentarioAntiguo.autor,
                        texto: comentarioAntiguo.texto,
                        likes: comentarioAntiguo.likes || [],
                        fecha: comentarioAntiguo.fecha || new Date()
                    });

                    comentariosMigrados++;

                    console.log(
                        `✅ Comentario migrado: ${comentarioAntiguo.texto}`
                    );
                } else {
                    comentariosExistentes++;
                    console.log(
                        `ℹ️ El comentario ya existía: ${comentarioId}`
                    );
                }

                // Migrar las respuestas del comentario.
                for (const respuestaAntigua of comentarioAntiguo.respuestas || []) {
                    const respuestaId = respuestaAntigua._id;

                    if (!respuestaId) {
                        console.log("⚠️ Respuesta sin ID; se omite.");
                        continue;
                    }

                    const respuestaExiste = await Respuesta.exists({
                        _id: respuestaId
                    });

                    if (respuestaExiste) {
                        respuestasExistentes++;
                        continue;
                    }

                    await Respuesta.create({
                        _id: respuestaId,
                        comentario: comentarioId,
                        publicacion: publicacion._id,
                        autor: respuestaAntigua.autor,
                        texto: respuestaAntigua.texto,
                        responderA: respuestaAntigua.responderA || null,
                        mencionado: respuestaAntigua.mencionado || null,
                        likes: respuestaAntigua.likes || [],
                        fecha: respuestaAntigua.fecha || new Date()
                    });

                    respuestasMigradas++;

                    console.log(
                        `↳ ✅ Respuesta migrada: ${respuestaAntigua.texto}`
                    );
                }
            }
        }

        console.log("\n========== RESUMEN ==========");
        console.log(`Comentarios migrados: ${comentariosMigrados}`);
        console.log(`Respuestas migradas: ${respuestasMigradas}`);
        console.log(`Comentarios que ya existían: ${comentariosExistentes}`);
        console.log(`Respuestas que ya existían: ${respuestasExistentes}`);
        console.log("=============================");

        console.log(
            "\nℹ️ Los comentarios originales dentro de publicaciones no se eliminaron."
        );

    } catch (error) {
        console.error("❌ Error durante la migración:", error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
        console.log("🔌 Conexión cerrada.");
    }
}

migrarComentarios();