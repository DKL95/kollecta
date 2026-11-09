const express = require("express");

const {
    buscarUsuarios,
    obtenerPerfil,
    obtenerPublicacionesDeUsuario,
    actualizarPerfil,
    enviarSolicitud,
    listarSolicitudesRecibidas,
    listarSolicitudesEnviadas,
    aceptarSolicitud,
    rechazarSolicitud,
    cancelarSolicitud,
    obtenerEstadoAmistad,
    eliminarAmigo
} = require("../controllers/usuarioController");

const { requiereAuth } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

const router = express.Router();

router.use(requiereAuth);

// Solicitudes de amistad
router.get(
    "/solicitudes/recibidas",
    listarSolicitudesRecibidas
);

router.get(
    "/solicitudes/enviadas",
    listarSolicitudesEnviadas
);

router.post(
    "/solicitudes/:id/aceptar",
    aceptarSolicitud
);

router.post(
    "/solicitudes/:id/rechazar",
    rechazarSolicitud
);

router.delete(
    "/solicitudes/:id",
    cancelarSolicitud
);

router.post(
    "/:username/solicitud",
    enviarSolicitud
);

router.get("/:username/amistad", obtenerEstadoAmistad);

router.delete("/:id/amigo", eliminarAmigo);

router.get("/", buscarUsuarios);
router.put("/me",upload.single("fotoPerfil"), actualizarPerfil);
router.get("/:username", obtenerPerfil);
router.get("/:username/publicaciones", obtenerPublicacionesDeUsuario);

module.exports = router;
