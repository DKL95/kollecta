const express = require("express");

const { requiereAuth } = require("../middleware/auth");
const { obtenerTareas, reclamar } = require("../controllers/tareaController");

const router = express.Router();

router.use(requiereAuth);

router.get("/", obtenerTareas);
router.post("/:id/reclamar", reclamar);

module.exports = router;
