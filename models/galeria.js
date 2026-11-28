const mongoose = require("mongoose");

// Personalización de la galería 3D de la colección. Todas las opciones son gratis.
// Deben coincidir con frontend/src/utils/galeria.js (lo revisa tests/frontend.test.mjs).
const TEMAS_GALERIA = ["museo", "neon", "concierto", "pastel", "estrellas", "madera"];
const MARCOS_GALERIA = ["dorado", "negro", "neon", "madera", "ninguno"];
const LUCES_GALERIA = ["calida", "fria", "escenario"];
const PARTICULAS_GALERIA = ["ninguna", "estrellas", "corazones", "confeti"];
const MAX_TITULO_GALERIA = 40;

const galeriaSchema = new mongoose.Schema(
    {
        tema: { type: String, enum: TEMAS_GALERIA, default: "museo" },
        marco: { type: String, enum: MARCOS_GALERIA, default: "dorado" },
        luz: { type: String, enum: LUCES_GALERIA, default: "calida" },
        particulas: { type: String, enum: PARTICULAS_GALERIA, default: "ninguna" },
        // Nombre de la sala; vacío = "Galería de <nombre>"
        titulo: { type: String, default: "", trim: true, maxlength: MAX_TITULO_GALERIA },
        // Pieza de la colección (articulos._id) que va al centro, en el pedestal
        destacada: { type: mongoose.Schema.Types.ObjectId, default: null }
    },
    { _id: false }
);

const GALERIA_POR_OMISION = {
    tema: "museo",
    marco: "dorado",
    luz: "calida",
    particulas: "ninguna",
    titulo: "",
    destacada: null
};

module.exports = {
    galeriaSchema,
    TEMAS_GALERIA,
    MARCOS_GALERIA,
    LUCES_GALERIA,
    PARTICULAS_GALERIA,
    MAX_TITULO_GALERIA,
    GALERIA_POR_OMISION
};
