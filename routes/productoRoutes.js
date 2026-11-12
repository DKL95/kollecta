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

const router = express.Router();

router.use(requiereAuth);

router.get("/", listarProductos);
router.post("/", upload.fields([{ name: "imagenes", maxCount: 10 }]), validarArchivos, crearProducto);
router.get("/:id", obtenerProducto);
router.put("/:id", editarProducto);
router.delete("/:id", retirarProducto);

module.exports = router;
