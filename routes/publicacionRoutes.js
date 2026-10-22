const express = require("express");

const {
    listarPublicaciones,
    obtenerPublicacion,
    crearPublicacion,
    actualizarPublicacion,
    eliminarPublicacion,
    alternarLike
} = require("../controllers/publicacionController");
const { requiereAuth } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

const router = express.Router();

router.use(requiereAuth);

router.get("/", listarPublicaciones);
router.post("/", upload.single("imagen"), crearPublicacion);
router.get("/:id", obtenerPublicacion);
router.put("/:id", actualizarPublicacion);
router.delete("/:id", eliminarPublicacion);
router.post("/:id/like", alternarLike);

module.exports = router;
