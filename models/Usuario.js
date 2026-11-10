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

        rol: {
            type: String,
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

        activo: {
            type: Boolean,
            default: true
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
        fechaRegistro: this.fechaRegistro
    };
};

module.exports = mongoose.model("Usuario", usuarioSchema);