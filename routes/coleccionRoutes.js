const express = require("express");

const { requiereAuth } = require("../middleware/auth");
const { upload, validarArchivos } = require("../middleware/upload");
const { registrarOperacion } = require("../middleware/registrarOperacion");
const {
    listarMiColeccion,
    listarColeccionDeUsuario,
    obtenerArticulo,
    agregarArticulo,
    agregarImagenesArticulo,
    actualizarArticulo,
    eliminarArticulo
} = require("../controllers/coleccionController");
const { obtenerGaleria, actualizarGaleria } = require("../controllers/galeriaController");

const router = express.Router();
const subirImagenes = upload.fields([{ name: "imagenes", maxCount: 10 }]);

router.use(requiereAuth);

// Obtener la colección del usuario autenticado.
router.get("/", listarMiColeccion);

// Galería 3D: ver la de cualquier persona y decorar la mía.
router.get("/galeria/:username", obtenerGaleria);
router.put("/galeria", registrarOperacion("decorar galería"), actualizarGaleria);

// Consultar la colección de otro usuario mediante su ID.
router.get("/usuario/:usuarioId", listarColeccionDeUsuario);

// Obtener un artículo individual de cualquier colección (la propia o la de
// otro usuario activo, que ya es visible desde su perfil).
router.get("/articulos/:articuloId", obtenerArticulo);

// Añadir un artículo a la colección personal, incluyendo sus imágenes.
router.post("/articulos", registrarOperacion("agregar a la colección"), subirImagenes, validarArchivos, agregarArticulo);

// Agregar fotos a un artículo que ya está en la colección (por ejemplo,
// al ponerlo a la venta desde "Vender"). Máximo 10 fotos en total.
router.post("/articulos/:articuloId/imagenes", subirImagenes, validarArchivos, agregarImagenesArticulo);

// Editar un artículo de la colección personal.
router.put("/articulos/:articuloId", actualizarArticulo);

// Eliminar un artículo de la colección personal.
router.delete("/articulos/:articuloId", registrarOperacion("borrar de la colección"), eliminarArticulo);

module.exports = router;