const express = require("express");

const {
    actualizarBanner,
    listarMisAmigos,
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
const { upload, validarFotoPerfil, validarArchivos } = require("../middleware/upload");
const { registrarOperacion } = require("../middleware/registrarOperacion");

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

// Va antes de "/:username" para que "me" no se tome como nombre de usuario.
router.get("/me/amigos", listarMisAmigos);

router.get("/:username/amistad", obtenerEstadoAmistad);

router.delete("/:id/amigo", eliminarAmigo);

router.get("/", buscarUsuarios);
router.put("/me", registrarOperacion("editar perfil"), upload.single("fotoPerfil"), validarFotoPerfil, actualizarPerfil);
router.put("/me/banner", registrarOperacion("editar banner"), upload.fields([{ name: "portada", maxCount: 1 }]), validarArchivos, actualizarBanner);
router.get("/:username", obtenerPerfil);
router.get("/:username/publicaciones", obtenerPublicacionesDeUsuario);

module.exports = router;
