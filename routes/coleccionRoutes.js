const express = require("express");
const mongoose = require("mongoose");
const fs = require("fs");

const Coleccion = require("../models/Coleccion");
const Usuario = require("../models/Usuario");
const { requiereAuth } = require("../middleware/auth");
const { precioDe, rechazarPendientesDe } = require("../controllers/ordenController");

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

// Marketplace: artículos de todas las colecciones que están a la venta o para
// intercambio y que no están apartados. Filtros: grupo, categoria, tipo, q, usuario.
const CATEGORIAS_VALIDAS = ["Photocard", "Álbum", "Lightstick", "Merch", "Poster", "Otro"];

router.get("/marketplace", requiereAuth, async (req, res) => {
    try {
        const { grupo, categoria, tipo, q, usuario } = req.query;
        const filtroArticulo = {
            "articulos.reservadoPor": null
        };

        if (tipo === "venta") filtroArticulo["articulos.disponibleCompra"] = true;
        else if (tipo === "intercambio") filtroArticulo["articulos.disponibleIntercambio"] = true;
        else if (!tipo || tipo === "todos") {
            filtroArticulo.$or = [
                { "articulos.disponibleCompra": true },
                { "articulos.disponibleIntercambio": true }
            ];
        } else {
            return res.status(400).json({ mensaje: "El tipo debe ser venta, intercambio o todos" });
        }

        if (grupo) filtroArticulo["articulos.grupo"] = String(grupo);

        if (categoria) {
            if (!CATEGORIAS_VALIDAS.includes(categoria)) {
                return res.status(400).json({ mensaje: "Categoría no válida" });
            }
            filtroArticulo["articulos.categoria"] = categoria;
        }

        const texto = String(q || "").trim();
        if (texto) {
            const escapado = texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regex = new RegExp(escapado, "i");
            filtroArticulo.$and = [{
                $or: [
                    { "articulos.titulo": regex },
                    { "articulos.grupo": regex },
                    { "articulos.categoria": regex }
                ]
            }];
        }

        const filtroColeccion = {};
        if (usuario) {
            if (!mongoose.isValidObjectId(usuario)) {
                return res.status(400).json({ mensaje: "El usuario no es válido" });
            }
            filtroColeccion.usuario = new mongoose.Types.ObjectId(String(usuario));
        }

        const resultados = await Coleccion.aggregate([
            { $match: filtroColeccion },
            { $unwind: "$articulos" },
            { $match: filtroArticulo },
            {
                $lookup: {
                    from: "usuarios",
                    localField: "usuario",
                    foreignField: "_id",
                    as: "vendedor"
                }
            },
            { $unwind: "$vendedor" },
            { $match: { "vendedor.activo": true } },
            { $sort: { "articulos._id": -1 } },
            { $limit: 120 },
            {
                $project: {
                    _id: 0,
                    articulo: "$articulos",
                    vendedor: {
                        id: "$vendedor._id",
                        nombre: "$vendedor.nombre",
                        username: "$vendedor.username",
                        fotoPerfil: "$vendedor.fotoPerfil"
                    }
                }
            }
        ]);

        res.json({
            articulos: resultados.map(({ articulo, vendedor }) => ({
                ...articulo,
                precioVenta: precioDe(articulo),
                vendedor,
                esMio: String(vendedor.id) === String(req.usuario.id)
            }))
        });
    } catch (error) {
        console.error("Error al cargar el marketplace:", error);
        res.status(500).json({ mensaje: "No se pudo cargar el marketplace" });
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

// Obtener un artículo individual de cualquier colección (la propia o la de
// otro usuario activo, que ya es visible desde su perfil).
router.get("/articulos/:articuloId", requiereAuth, async (req, res) => {
    try {
        const { articuloId } = req.params;

        if (!mongoose.isValidObjectId(articuloId)) {
            return res.status(400).json({
                mensaje: "El identificador del artículo no es válido"
            });
        }

        const coleccion = await Coleccion.findOne({
            "articulos._id": articuloId
        }).populate("usuario", "nombre username fotoPerfil activo");

        const articulo = coleccion?.articulos.id(articuloId);

        if (!articulo || !coleccion.usuario?.activo) {
            return res.status(404).json({
                mensaje: "Artículo no encontrado"
            });
        }

        const propietario = coleccion.usuario;

        res.json({
            articulo: {
                ...articulo.toObject(),
                precioVenta: precioDe(articulo),
                reservado: Boolean(articulo.reservadoPor)
            },
            esMio: String(propietario._id) === String(req.usuario.id),
            propietario: {
                id: propietario._id,
                nombre: propietario.nombre,
                username: propietario.username,
                fotoPerfil: propietario.fotoPerfil
            }
        });
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
                disponibleCompra,
                precio
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

            const seVende = disponibleCompra === true || disponibleCompra === "true";
            const precioNumero = precio !== undefined && precio !== "" ? Number(precio) : null;
            const valorNumero = valorEstimado !== undefined && valorEstimado !== "" ? Number(valorEstimado) : 0;

            if (precioNumero !== null && (!Number.isFinite(precioNumero) || precioNumero < 0)) {
                await limpiarArchivosTemporales(req);
                return res.status(400).json({ mensaje: "El precio debe ser un número mayor o igual a 0" });
            }

            if (seVende && !(precioNumero > 0) && !(valorNumero > 0)) {
                await limpiarArchivosTemporales(req);
                return res.status(400).json({ mensaje: "Para vender el artículo ponle un precio" });
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
                    disponibleCompra === "true",
                precio:
                    precio !== undefined && precio !== ""
                        ? Number(precio)
                        : null
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

// Agregar fotos a un artículo que ya está en la colección (por ejemplo,
// al ponerlo a la venta desde "Vender"). Máximo 10 fotos en total.
router.post(
    "/articulos/:articuloId/imagenes",
    requiereAuth,
    upload.fields([{ name: "imagenes", maxCount: 10 }]),
    validarArchivos,
    async (req, res) => {
        try {
            const { articuloId } = req.params;
            const archivos = req.files?.imagenes || [];

            if (!mongoose.isValidObjectId(articuloId)) {
                await limpiarArchivosTemporales(req);
                return res.status(400).json({ mensaje: "El identificador del artículo no es válido" });
            }

            const coleccion = await Coleccion.findOne({ usuario: req.usuario.id });
            const articulo = coleccion?.articulos.id(articuloId);

            if (!articulo) {
                await limpiarArchivosTemporales(req);
                return res.status(404).json({ mensaje: "Artículo no encontrado" });
            }

            if (archivos.length === 0) {
                return res.status(400).json({ mensaje: "Selecciona al menos una foto" });
            }

            if (articulo.imagenes.length + archivos.length > 10) {
                await limpiarArchivosTemporales(req);
                return res.status(400).json({ mensaje: "Un artículo puede tener como máximo 10 fotos" });
            }

            for (const archivo of archivos) {
                articulo.imagenes.push(await guardarImagen(archivo, req.usuario.id));
            }

            await coleccion.save();

            res.status(201).json({ mensaje: "Fotos agregadas", articulo });
        } catch (error) {
            console.error("Error al agregar fotos al artículo:", error);
            await limpiarArchivosTemporales(req);
            res.status(500).json({ mensaje: "No se pudieron agregar las fotos" });
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
            "disponibleCompra",
            "precio"
        ];

        const cambios = req.body || {};

        // Mientras esté apartado en una orden no se cambia cómo se ofrece.
        const tocaVenta = ["disponibleCompra", "disponibleIntercambio", "precio"]
            .some((campo) => cambios[campo] !== undefined);

        if (articulo.reservadoPor && tocaVenta) {
            return res.status(409).json({
                mensaje: "Este artículo está apartado en una operación; termínala o cancélala antes de cambiar su venta"
            });
        }

        if (cambios.titulo !== undefined && !String(cambios.titulo).trim()) {
            return res.status(400).json({ mensaje: "El título no puede quedar vacío" });
        }

        if (cambios.precio !== undefined && cambios.precio !== null && cambios.precio !== "") {
            const precio = Number(cambios.precio);
            if (!Number.isFinite(precio) || precio < 0) {
                return res.status(400).json({ mensaje: "El precio debe ser un número mayor o igual a 0" });
            }
        }

        const estabaEnVenta = articulo.disponibleCompra || articulo.disponibleIntercambio;

        camposPermitidos.forEach((campo) => {
            if (cambios[campo] === undefined) return;
            if (campo === "precio" && cambios.precio === "") {
                articulo.set("precio", null);
            } else {
                articulo.set(campo, cambios[campo]);
            }
        });

        // Vender requiere un precio (el publicado o, si no hay, el valor estimado).
        if (articulo.disponibleCompra && !(articulo.precio > 0) && !(articulo.valorEstimado > 0)) {
            return res.status(400).json({ mensaje: "Para vender el artículo ponle un precio" });
        }

        await coleccion.save();

        const quedoFuera = estabaEnVenta && !articulo.disponibleCompra && !articulo.disponibleIntercambio;
        if (quedoFuera) {
            await rechazarPendientesDe(req, articulo._id, req.usuario.id, "Se quitó de la venta");
        }

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

            if (articulo.reservadoPor) {
                return res.status(409).json({
                    mensaje: "Este artículo está apartado en una operación; cancélala antes de borrarlo"
                });
            }

            articulo.deleteOne();

            await coleccion.save();

            await rechazarPendientesDe(req, articuloId, req.usuario.id, "Se eliminó de la colección");

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