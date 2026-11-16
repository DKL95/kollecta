const express = require("express");

const {
    listarProductos,
    obtenerProducto,
    crearProducto,
    editarProducto,
    retirarProducto
} = require("../controllers/productoController");
const { requiereAuth } = require("../middleware/auth");
const { upload, validarArchivos } = require("../middleware/upload");
const { registrarOperacion } = require("../middleware/registrarOperacion");

const router = express.Router();

router.use(requiereAuth);

router.get("/", listarProductos);
router.post("/", registrarOperacion("publicar producto"), upload.fields([{ name: "imagenes", maxCount: 10 }]), validarArchivos, crearProducto);
router.get("/:id", obtenerProducto);
router.put("/:id", registrarOperacion("editar producto"), editarProducto);
router.delete("/:id", registrarOperacion("retirar producto"), retirarProducto);

module.exports = router;
