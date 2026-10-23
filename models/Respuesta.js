const mongoose = require("mongoose");

const respuestaSchema = new mongoose.Schema(
  {
    // Comentario al que pertenece esta respuesta.
    comentario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comentario",
      required: true,
      index: true
    },

    // Publicación a la que pertenece, para facilitar consultas.
    publicacion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Publicacion",
      required: true,
      index: true
    },

    // Usuario que escribió la respuesta.
    autor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true
    },

    // Texto de la respuesta.
    texto: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },

    // ID de otra respuesta si se está respondiendo a ella.
    // Si responde directamente al comentario, será null.
    responderA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Respuesta",
      default: null
    },

    // Usuario al que se menciona.
    mencionado: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      default: null
    },

    // Usuarios que dieron like a esta respuesta.
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usuario"
      }
    ]
  },
  {
    collection: "respuestas",
    timestamps: {
      createdAt: "fecha",
      updatedAt: false
    }
  }
);

module.exports = mongoose.model(
  "Respuesta",
  respuestaSchema
);