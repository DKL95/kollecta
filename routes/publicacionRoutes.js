const express = require("express");

const {
    listarPublicaciones,
    obtenerPublicacion,
    crearPublicacion,
    actualizarPublicacion,
    eliminarPublicacion,
    alternarLike,
    listarComentarios,
    agregarComentario,
    agregarRespuesta,
    alternarLikeComentario,
    alternarLikeRespuesta,
    eliminarComentario,
    eliminarRespuesta,
    actualizarComentario,
    actualizarRespuesta
} = require("../controllers/publicacionController");

const { requiereAuth } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

const router = express.Router();

router.use(requiereAuth);

router.get("/", listarPublicaciones);

// Crear publicación con hasta 10 imágenes
router.post("/", upload.array("imagenes", 10), crearPublicacion);

// Comentarios
router.get("/:id/comentarios", listarComentarios);
router.post("/:id/comentarios", agregarComentario);

// Likes de comentarios
router.post(
    "/:id/comentarios/:comentarioId/like",
    alternarLikeComentario
);

// Respuestas a comentarios y likes de respuestas
router.post(
    "/:id/comentarios/:comentarioId/respuestas",
    agregarRespuesta
);

router.post(
    "/:id/comentarios/:comentarioId/respuestas/:respuestaId/like",
    alternarLikeRespuesta
);

// Obtener publicación
router.get("/:id", obtenerPublicacion);

// Editar publicación y sus imágenes
router.put("/:id", upload.array("imagenes", 10), actualizarPublicacion);

// Eliminar publicación
router.delete("/:id", eliminarPublicacion);

// Like de publicación
router.post("/:id/like", alternarLike);

// Eliminar comentarios.
router.delete(
    "/:id/comentarios/:comentarioId",
    eliminarComentario
);

// Eliminar respuestas.
router.delete(
    "/:id/comentarios/:comentarioId/respuestas/:respuestaId",
    eliminarRespuesta
);

router.put(
    "/:id/comentarios/:comentarioId",
    actualizarComentario
);

router.put(
    "/:id/comentarios/:comentarioId/respuestas/:respuestaId",
    actualizarRespuesta
);

module.exports = router;