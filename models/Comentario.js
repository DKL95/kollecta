const mongoose = require("mongoose");
const { campoOculto } = require("./oculto");

const comentarioSchema = new mongoose.Schema(
  {
    publicacion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Publicacion",
      required: true,
      index: true
    },

    autor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true
    },

    texto: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usuario"
      }
    ],

    // Ocultado por moderación (null = visible)
    oculto: campoOculto
  },
  {
    collection: "comentarios",
    timestamps: {
      createdAt: "fecha",
      updatedAt: false
    }
  }
);

module.exports = mongoose.model(
  "Comentario",
  comentarioSchema
);