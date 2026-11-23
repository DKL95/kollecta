const express = require("express");

const {
    listarGrupos,
    crearGrupo,
    listarMisSolicitudes,
    listarSolicitudes,
    revisarSolicitud,
    cancelarSolicitud,
    editarGrupo
} = require("../controllers/grupoController");
const { requiereAuth } = require("../middleware/auth");
const { requiereRol } = require("../middleware/roles");
const { upload, validarArchivos } = require("../middleware/upload");
const { registrarOperacion } = require("../middleware/registrarOperacion");

const router = express.Router();

// Público: el registro necesita la lista para elegir el bias.
router.get("/", listarGrupos);

// Logo ("imagenes") y portada, una de cada una.
const fotosGrupo = upload.fields([
    { name: "imagenes", maxCount: 1 },
    { name: "portada", maxCount: 1 }
]);

router.post(
    "/",
    requiereAuth,
    registrarOperacion("solicitar/crear grupo"),
    fotosGrupo,
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

router.put(
    "/:id",
    requiereAuth,
    requiereRol("moderador"),
    registrarOperacion("editar grupo"),
    fotosGrupo,
    validarArchivos,
    editarGrupo
);

module.exports = router;
