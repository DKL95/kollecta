const mongoose = require("mongoose");

// Esquema para las respuestas a comentarios.
const respuestaSchema = new mongoose.Schema(
  {
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

    // Identifica la respuesta a la que se está contestando.
    responderA: {
      type: mongoose.Schema.Types.ObjectId,
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
    timestamps: {
      createdAt: "fecha",
      updatedAt: false
    }
  }
);

// Esquema para los comentarios principales.
const comentarioSchema = new mongoose.Schema(
  {
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

    // Usuarios que dieron like al comentario.
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usuario"
      }
    ],

    // Respuestas asociadas al comentario.
    respuestas: {
      type: [respuestaSchema],
      default: []
    }
  },
  {
    timestamps: {
      createdAt: "fecha",
      updatedAt: false
    }
  }
);

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
      required: true,
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

    likes: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Usuario",
      default: []
    },

    comentarios: {
      type: [comentarioSchema],
      default: []
    }
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