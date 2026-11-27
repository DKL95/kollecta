const mongoose = require("mongoose");

/* ==========================================================================
   Avatar personalizable y stickers hechos con él.
   Aquí solo están los ids válidos: el dibujo de cada opción vive en
   frontend/src/utils/avatar.js (las claves deben coincidir, lo revisa
   tests/frontend.test.mjs).
   ========================================================================== */

const OPCIONES_AVATAR = {
    piel: ["porcelana", "clara", "miel", "canela", "morena", "caoba", "ebano", "lila"],
    ojos: ["redondos", "brillantes", "almendrados", "pestanas", "dormilones"],
    colorOjos: ["cafe", "negro", "miel", "verde", "azul", "violeta", "rosa"],
    cejas: ["suaves", "rectas", "arqueadas", "gruesas"],
    boca: ["sonrisa", "gatuna", "abierta", "tranquila", "lengua"],
    cabello: ["corto", "cortina", "flequillo", "largo", "coletas", "chongo", "ondulado", "bob", "rapado"],
    colorCabello: ["negro", "castano", "rubio", "rosa", "lila", "azul", "rojo", "platino", "menta", "naranja"],
    ropa: ["camiseta", "sudadera", "mezclilla", "uniforme", "sueter", "escenario"],
    colorRopa: ["rosa", "morado", "azul", "menta", "amarillo", "negro", "blanco", "rojo"],
    accesorio: ["ninguno", "lentes", "gorra", "gato", "mono", "audifonos", "pescador", "estrellas", "corona"],
    mejillas: ["ninguno", "rubor", "lunar", "curita", "pecas", "brillos"],
    fondo: ["kollecta", "atardecer", "oceano", "menta", "noche", "dorado", "cereza"]
};

const AVATAR_INICIAL = {
    piel: "clara",
    ojos: "redondos",
    colorOjos: "cafe",
    cejas: "suaves",
    boca: "sonrisa",
    cabello: "cortina",
    colorCabello: "negro",
    ropa: "sudadera",
    colorRopa: "rosa",
    accesorio: "ninguno",
    mejillas: "rubor",
    fondo: "kollecta"
};

// Cara y pose de un sticker (se dibujan con el avatar de quien lo manda).
const EXPRESIONES = ["normal", "feliz", "amor", "risa", "guino", "sorpresa", "llorar", "enojo", "dormir", "pena"];
const GESTOS = ["ninguno", "saludo", "corazon", "fighting", "paz", "mejillas"];

const MAX_TEXTO_STICKER = 20;
const MAX_STICKERS_PROPIOS = 30;

const campos = {};
for (const [clave, valores] of Object.entries(OPCIONES_AVATAR)) {
    campos[clave] = { type: String, enum: valores, default: AVATAR_INICIAL[clave] };
}

const avatarSchema = new mongoose.Schema(campos, { _id: false });

// Sticker ya enviado: guarda una copia del avatar de ese momento para que
// no cambie si después la persona modifica su avatar.
const stickerSchema = new mongoose.Schema(
    {
        avatar: { type: avatarSchema, required: true },
        expresion: { type: String, enum: EXPRESIONES, default: "normal" },
        gesto: { type: String, enum: GESTOS, default: "ninguno" },
        texto: { type: String, default: "", maxlength: MAX_TEXTO_STICKER, trim: true }
    },
    { _id: false }
);

// Sticker guardado en "Mis stickers" (sin avatar: se usa el actual al enviarlo).
const stickerPropioSchema = new mongoose.Schema(
    {
        expresion: { type: String, enum: EXPRESIONES, default: "normal" },
        gesto: { type: String, enum: GESTOS, default: "ninguno" },
        texto: { type: String, default: "", maxlength: MAX_TEXTO_STICKER, trim: true },
        creadoEn: { type: Date, default: Date.now }
    }
);

const campoSticker = { type: stickerSchema, default: null };

module.exports = {
    OPCIONES_AVATAR,
    AVATAR_INICIAL,
    EXPRESIONES,
    GESTOS,
    MAX_TEXTO_STICKER,
    MAX_STICKERS_PROPIOS,
    avatarSchema,
    stickerSchema,
    stickerPropioSchema,
    campoSticker
};
