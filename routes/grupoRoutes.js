const express = require("express");

const {
    listarGrupos,
    crearGrupo,
    listarMisSolicitudes,
    listarSolicitudes,
    revisarSolicitud,
    cancelarSolicitud
} = require("../controllers/grupoController");
const { requiereAuth } = require("../middleware/auth");
const { requiereRol } = require("../middleware/roles");
const { upload, validarArchivos } = require("../middleware/upload");
const { registrarOperacion } = require("../middleware/registrarOperacion");

const router = express.Router();

// Público: el registro necesita la lista para elegir el bias.
router.get("/", listarGrupos);

router.post(
    "/",
    requiereAuth,
    registrarOperacion("solicitar/crear grupo"),
    upload.fields([{ name: "imagenes", maxCount: 1 }]),
    validarArchivos,
    crearGrupo
);
router.get("/solicitudes/mias", requiereAuth, listarMisSolicitudes);
router.delete("/solicitudes/:id", requiereAuth, registrarOperacion("cancelar solicitud de grupo"), cancelarSolicitud);
router.get("/solicitudes", requiereAuth, requiereRol("moderador"), listarSolicitudes);
router.patch(
    "/solicitudes/:id",
    requiereAuth,
    requiereRol("moderador"),
    registrarOperacion("revisar solicitud de grupo"),
    revisarSolicitud
);

module.exports = router;
