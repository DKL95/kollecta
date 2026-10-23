const mongoose = require("mongoose");

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
    ]
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