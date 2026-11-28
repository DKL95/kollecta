const express = require("express");

const { requiereAuth } = require("../middleware/auth");
const { uploadCorto } = require("../middleware/uploadCorto");
const { registrarOperacion } = require("../middleware/registrarOperacion");
const {
    listarKlips,
    obtenerKlip,
    crearKlip,
    actualizarKlip,
    eliminarKlip,
    alternarLike,
    sumarReproduccion,
    listarComentarios,
    agregarComentario,
    eliminarComentario
} = require("../controllers/klipController");

const router = express.Router();

router.use(requiereAuth);

router.get("/", listarKlips);
router.post("/", registrarOperacion("subir Klip"), uploadCorto.single("video"), crearKlip);
router.get("/:id", obtenerKlip);
router.put("/:id", actualizarKlip);
router.delete("/:id", registrarOperacion("borrar Klip"), eliminarKlip);
router.post("/:id/like", alternarLike);
router.post("/:id/reproduccion", sumarReproduccion);
router.get("/:id/comentarios", listarComentarios);
router.post("/:id/comentarios", agregarComentario);
router.delete("/:id/comentarios/:comentarioId", eliminarComentario);

module.exports = router;
