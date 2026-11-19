const mongoose = require("mongoose");

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
        },

        // Recuperar contraseña: hash SHA-256 del enlace enviado por correo y su vencimiento.
        // select: false para que nunca salgan en consultas normales.
        recuperacionHash: {
            type: String,
            select: false
        },

        recuperacionExpira: {
            type: Date,
            select: false
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
        fechaRegistro: this.fechaRegistro
    };
};

module.exports = mongoose.model("Usuario", usuarioSchema);