const express = require("express");

const { requiereAuth } = require("../middleware/auth");
const { miAlbum, albumDe } = require("../controllers/estampitaController");

const router = express.Router();

router.use(requiereAuth);

router.get("/", miAlbum);
router.get("/:username", albumDe);

module.exports = router;
