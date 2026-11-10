const express = require("express");
const mongoose = require("mongoose");
const fs = require("fs");

const Coleccion = require("../models/Coleccion");
const Usuario = require("../models/Usuario");
const { requiereAuth } = require("../middleware/auth");

const {
    upload,
    validarArchivos,
    guardarImagen
} = require("../middleware/upload");

const router = express.Router();

// Eliminar archivos temporales si ocurre un error durante la publicación.
async function limpiarArchivosTemporales(req) {
    const archivos = req.files || {};

    const todos = [
        ...(archivos.imagenes || []),
        ...(archivos.videos || [])
    ];

    await Promise.all(
        todos.map((archivo) =>
            archivo.path
                ? fs.promises.unlink(archivo.path).catch(() => {})
                : Promise.resolve()
        )
    );
}

// Obtener la colección del usuario autenticado.
router.get("/", requiereAuth, async (req, res) => {
    try {
        const usuarioId = req.usuario.id;

        let coleccion = await Coleccion.findOne({
            usuario: usuarioId
        });

        if (!coleccion) {
            coleccion = await Coleccion.create({
                usuario: usuarioId,
                articulos: []
            });
        }

        res.json(coleccion);
    } catch (error) {
        console.error("Error al obtener la colección:", error);

        res.status(500).json({
            mensaje: "No se pudo obtener la colección"
        });
    }
});

// Consultar la colección de otro usuario mediante su ID.
router.get("/usuario/:usuarioId", requiereAuth, async (req, res) => {
    try {
        const { usuarioId } = req.params;

        if (!mongoose.isValidObjectId(usuarioId)) {
            return res.status(400).json({
                mensaje: "El identificador del usuario no es válido"
            });
        }

        const usuario = await Usuario.findById(usuarioId);

        if (!usuario || !usuario.activo) {
            return res.status(404).json({
                mensaje: "Usuario no encontrado"
            });
        }

        const coleccion = await Coleccion.findOne({
            usuario: usuarioId
        });

        res.json({
            usuario: {
                id: usuario._id,
                nombre: usuario.nombre,
                username: usuario.username,
                fotoPerfil: usuario.fotoPerfil
            },
            articulos: coleccion ? coleccion.articulos : []
        });
    } catch (error) {
        console.error("Error al consultar la colección:", error);

        res.status(500).json({
            mensaje: "No se pudo consultar la colección"
        });
    }
});

// Obtener un artículo individual de la colección del usuario autenticado.
router.get("/articulos/:articuloId", requiereAuth, async (req, res) => {
    try {
        const { articuloId } = req.params;

        if (!mongoose.isValidObjectId(articuloId)) {
            return res.status(400).json({
                mensaje: "El identificador del artículo no es válido"
            });
        }

        const coleccion = await Coleccion.findOne({
            usuario: req.usuario.id
        });

        if (!coleccion) {
            return res.status(404).json({
                mensaje: "No se encontró tu colección"
            });
        }

        const articulo = coleccion.articulos.id(articuloId);

        if (!articulo) {
            return res.status(404).json({
                mensaje: "Artículo no encontrado"
            });
        }

        res.json({ articulo });
    } catch (error) {
        console.error("Error al obtener el artículo:", error);

        res.status(500).json({
            mensaje: "No se pudo obtener el artículo"
        });
    }
});


// Añadir un artículo a la colección personal, incluyendo sus imágenes.
router.post(
    "/articulos",
    requiereAuth,
    upload.fields([
        {
            name: "imagenes",
            maxCount: 10
        }
    ]),
    validarArchivos,
    async (req, res) => {
        // Guardamos las referencias para poder limpiar las imágenes
        // si ocurre un error antes de completar la publicación.
        const imagenesGuardadas = [];

        try {
            const {
                titulo,
                grupo,
                categoria,
                descripcion,
                valorEstimado,
                estado,
                disponibleIntercambio,
                disponibleCompra
            } = req.body;

            if (
                !titulo?.trim() ||
                !grupo?.trim() ||
                !categoria?.trim()
            ) {
                await limpiarArchivosTemporales(req);

                return res.status(400).json({
                    mensaje: "El título, grupo y categoría son obligatorios"
                });
            }

            // Comprobar que el artículo no exceda las imágenes permitidas.
            const archivosImagenes = req.files?.imagenes || [];

            if (archivosImagenes.length > 10) {
                await limpiarArchivosTemporales(req);

                return res.status(400).json({
                    mensaje: "Puedes subir un máximo de 10 imágenes"
                });
            }

            // Guardar las imágenes en MongoDB y obtener sus direcciones.
            for (const archivo of archivosImagenes) {
                const urlImagen = await guardarImagen(
                    archivo,
                    req.usuario.id
                );

                imagenesGuardadas.push(urlImagen);
            }

            // Buscar o crear la colección del usuario.
            let coleccion = await Coleccion.findOne({
                usuario: req.usuario.id
            });

            if (!coleccion) {
                coleccion = new Coleccion({
                    usuario: req.usuario.id,
                    articulos: []
                });
            }

            // Incorporar el artículo y las direcciones de sus imágenes.
            coleccion.articulos.push({
                titulo: titulo.trim(),
                grupo: grupo.trim(),
                categoria: categoria.trim(),
                imagenes: imagenesGuardadas,
                descripcion: descripcion || "",
                valorEstimado:
                    valorEstimado !== undefined &&
                    valorEstimado !== ""
                        ? Number(valorEstimado)
                        : 0,
                estado: estado || "Buen estado",
                disponibleIntercambio:
                    disponibleIntercambio === true ||
                    disponibleIntercambio === "true",
                disponibleCompra:
                    disponibleCompra === true ||
                    disponibleCompra === "true"
            });

            await coleccion.save();

            res.status(201).json({
                mensaje: "Artículo añadido a tu colección",
                coleccion,
                articulo: coleccion.articulos[
                    coleccion.articulos.length - 1
                ]
            });
        } catch (error) {
            console.error("Error al añadir el artículo:", error);

            // Si la publicación falla, eliminamos las imágenes que
            // ya se guardaron para evitar dejar imágenes huérfanas.
            const idsImagenes = imagenesGuardadas.map((url) =>
                url.split("/").pop()
            );

            if (idsImagenes.length > 0) {
                try {
                    const Imagen = require("../models/Imagen");

                    await Imagen.deleteMany({
                        _id: { $in: idsImagenes }
                    });
                } catch (errorLimpieza) {
                    console.error(
                        "Error al limpiar imágenes:",
                        errorLimpieza
                    );
                }
            }

            await limpiarArchivosTemporales(req);

            if (res.headersSent) {
                return;
            }

            res.status(400).json({
                mensaje:
                    error.message ||
                    "No se pudo añadir el artículo"
            });
        }
    }
);

// Editar un artículo de la colección personal.
router.put("/articulos/:articuloId", requiereAuth, async (req, res) => {
    try {
        const { articuloId } = req.params;

        if (!mongoose.isValidObjectId(articuloId)) {
            return res.status(400).json({
                mensaje: "El identificador del artículo no es válido"
            });
        }

        const coleccion = await Coleccion.findOne({
            usuario: req.usuario.id
        });

        if (!coleccion) {
            return res.status(404).json({
                mensaje: "No tienes una colección registrada"
            });
        }

        const articulo = coleccion.articulos.id(articuloId);

        if (!articulo) {
            return res.status(404).json({
                mensaje: "Artículo no encontrado"
            });
        }

        const camposPermitidos = [
            "titulo",
            "grupo",
            "categoria",
            "imagenes",
            "descripcion",
            "valorEstimado",
            "estado",
            "disponibleIntercambio",
            "disponibleCompra"
        ];

        camposPermitidos.forEach((campo) => {
            if (req.body[campo] !== undefined) {
                articulo.set(campo, req.body[campo]);
            }
        });

        await coleccion.save();

        res.json({
            mensaje: "Artículo actualizado",
            articulo
        });
    } catch (error) {
        console.error("Error al editar el artículo:", error);

        res.status(400).json({
            mensaje:
                error.message ||
                "No se pudo editar el artículo"
        });
    }
});

// Eliminar un artículo de la colección personal.
router.delete(
    "/articulos/:articuloId",
    requiereAuth,
    async (req, res) => {
        try {
            const { articuloId } = req.params;

            if (!mongoose.isValidObjectId(articuloId)) {
                return res.status(400).json({
                    mensaje: "El identificador del artículo no es válido"
                });
            }

            const coleccion = await Coleccion.findOne({
                usuario: req.usuario.id
            });

            if (!coleccion) {
                return res.status(404).json({
                    mensaje: "No tienes una colección registrada"
                });
            }

            const articulo = coleccion.articulos.id(articuloId);

            if (!articulo) {
                return res.status(404).json({
                    mensaje: "Artículo no encontrado"
                });
            }

            articulo.deleteOne();

            await coleccion.save();

            res.json({
                mensaje: "Artículo eliminado de tu colección"
            });
        } catch (error) {
            console.error("Error al eliminar el artículo:", error);

            res.status(500).json({
                mensaje: "No se pudo eliminar el artículo"
            });
        }
    }
);

module.exports = router;