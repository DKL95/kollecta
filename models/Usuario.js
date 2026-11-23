const mongoose = require("mongoose");

// Opciones del banner del perfil (deben coincidir con frontend/src/utils/banner.js).
const BANNER_COLORES = ["kollecta", "atardecer", "oceano", "menta", "noche", "dorado", "cereza"];
const BANNER_TEXTURAS = ["ninguna", "puntos", "rayas", "cuadricula", "corazones", "estrellas", "ondas"];

const usuarioSchema = new mongoose.Schema(
    {
        nombre: {
            type: String,
            default: ""
        },
        
        username: {
            type: String,
            required: true,
            unique: true
        },

        email: {
            type: String,
            required: true,
            unique: true
        },

        password: {
            type: String,
            required: true
        },

        // usuario < moderador < administrador (ver middleware/roles.js y docs/PLAN-roles.md)
        rol: {
            type: String,
            enum: ["usuario", "moderador", "administrador"],
            default: "usuario"
        },

        fotoPerfil: {
            type: String,
            default: ""
        },

        descripcion: {
            type: String,
            default: ""
        },

        gruposFavoritos: {
            type: [String],
            default: []
        },

        // Banner del perfil: degradado + textura opcional + logo de un grupo, o una imagen propia
        // (si hay imagen, se ve la imagen). Los valores se dibujan en frontend/src/utils/banner.js.
        banner: {
            type: new mongoose.Schema(
                {
                    color: { type: String, enum: BANNER_COLORES, default: "kollecta" },
                    textura: { type: String, enum: BANNER_TEXTURAS, default: "ninguna" },
                    logo: { type: String, default: "", maxlength: 40 },
                    imagen: { type: String, default: "" }
                },
                { _id: false }
            ),
            default: () => ({})
        },

        fechaRegistro: {
            type: String,
            default: () => new Date().toISOString()
        },

        // false = baneado para siempre (solo un administrador). Ver middleware/auth.js
        activo: {
            type: Boolean,
            default: true
        },

        motivoBaneo: {
            type: String,
            default: ""
        },

        // Suspensión temporal puesta por moderación (1 a 30 días)
        suspendidoHasta: {
            type: Date,
            default: null
        },

        motivoSuspension: {
            type: String,
            default: ""
        },

        amigos: {
            type: [mongoose.Schema.Types.ObjectId],
            default: []
        }
    },
    {
        collection: "usuarios"
    }
);

// Datos del usuario que se pueden enviar al frontend (sin contraseña)
usuarioSchema.methods.aPublico = function () {
    return {
        id: this._id,
        nombre: this.nombre,
        username: this.username,
        email: this.email,
        rol: this.rol,
        fotoPerfil: this.fotoPerfil,
        descripcion: this.descripcion,
        gruposFavoritos: this.gruposFavoritos,
        banner: this.banner || {},
        fechaRegistro: this.fechaRegistro
    };
};

module.exports = mongoose.model("Usuario", usuarioSchema);
module.exports.BANNER_COLORES = BANNER_COLORES;
module.exports.BANNER_TEXTURAS = BANNER_TEXTURAS;