const mongoose = require("mongoose");
const { campoOculto } = require("./oculto");
const { campoGif } = require("./gif");
const { campoSticker } = require("./avatar");

// Esquema principal de publicaciones.
const publicacionSchema = new mongoose.Schema(
  {
    autor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true
    },

    texto: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000
    },

    grupo: {
      type: String,
      default: ""
    },

    imagenes: {
      type: [String],
      default: []
    },

    videos: {
      type: [String],
      default: []
    },

    likes: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Usuario",
      default: []
    },

    // Ocultada por moderación (null = visible). Ver docs/PLAN-roles.md
    gif: campoGif,
    // Sticker hecho con el avatar del autor (null = sin sticker)
    sticker: campoSticker,
    oculto: campoOculto
  },
  {
    collection: "publicaciones",
    timestamps: {
      createdAt: "fechaCreacion",
      updatedAt: "fechaActualizacion"
    }
  }
);

module.exports = mongoose.model(
  "Publicacion",
  publicacionSchema
);