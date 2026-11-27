const express = require("express");

const { requiereAuth } = require("../middleware/auth");
const { guardarPartida, ranking } = require("../controllers/juegoController");

const router = express.Router();

router.use(requiereAuth);

router.post("/:juego/partidas", guardarPartida);
router.get("/:juego/ranking", ranking);

module.exports = router;
