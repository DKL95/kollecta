const express = require("express");

const { requiereAuth } = require("../middleware/auth");
const { uploadCorto, validarHistoria } = require("../middleware/uploadCorto");
const { registrarOperacion } = require("../middleware/registrarOperacion");
const {
    listarHistorias,
    crearHistoria,
    marcarVista,
    listarVistas,
    eliminarHistoria
} = require("../controllers/historiaController");

const router = express.Router();

router.use(requiereAuth);

router.get("/", listarHistorias);
router.post("/", registrarOperacion("subir historia"), uploadCorto.single("medio"), validarHistoria, crearHistoria);
router.post("/:id/vista", marcarVista);
router.get("/:id/vistas", listarVistas);
router.delete("/:id", eliminarHistoria);

module.exports = router;
