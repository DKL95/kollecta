require("dotenv").config();

const express = require("express");
const path = require("path");

const conectarDB = require("./db");
const Usuario = require("./models/Usuario");

const multer = require("multer");

const app = express();
const PORT = 3000;

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },

    filename: function (req, file, cb) {
        const nombreUnico = Date.now() + "-" + file.originalname;
        cb(null, nombreUnico);
    }
});

const upload = multer({
    storage: storage
});

// Conectar MongoDB
conectarDB();

// Permitir recibir JSON y formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir el frontend
app.use(express.static(path.join(__dirname, "frontend")));

// Servir las fotos de perfil
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// REGISTRO
app.post("/api/register", upload.single("fotoPerfil"), async (req, res) => {
    try {
        const { name, username, email, password, bias, descripcion } = req.body;

        // Verificar si ya existe el usuario
        const usuarioExistente = await Usuario.findOne({
            $or: [
                { username: username },
                { email: email }
            ]
        });

        if (usuarioExistente) {
            return res.status(400).json({
                mensaje: "El usuario o correo ya está registrado"
            });
        }

        // Crear usuario
        const nuevoUsuario = new Usuario({
            nombre: name || "",
            username,
            email,
            password,
            gruposFavoritos: bias ? [bias] : [],
            descripcion: descripcion || "",
            fotoPerfil: req.file ? "/uploads/" + req.file.filename : ""
        });

        await nuevoUsuario.save();

        res.status(201).json({
            mensaje: "Usuario registrado correctamente",
            usuario: {
                id: nuevoUsuario._id,
                nombre: nuevoUsuario.nombre,
                username: nuevoUsuario.username,
                email: nuevoUsuario.email,
                descripcion: nuevoUsuario.descripcion,
                fotoPerfil: nuevoUsuario.fotoPerfil,
                gruposFavoritos: nuevoUsuario.gruposFavoritos
            }
        });

    } catch (error) {
        console.error("Error en registro:", error);

        res.status(500).json({
            mensaje: "Error al registrar usuario"
        });
    }
});

// INICIO DE SESIÓN
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const usuario = await Usuario.findOne({ email });

        if (!usuario) {
            return res.status(401).json({
                mensaje: "Correo o contraseña incorrectos"
            });
        }

        if (usuario.password !== password) {
            return res.status(401).json({
                mensaje: "Correo o contraseña incorrectos"
            });
        }

        res.json({
            mensaje: "Inicio de sesión correcto",
            usuario: {
            id: usuario._id,
            nombre: usuario.nombre,
            username: usuario.username,
            email: usuario.email,
            fotoPerfil: usuario.fotoPerfil,
            descripcion: usuario.descripcion,
            gruposFavoritos: usuario.gruposFavoritos
        }
        });

    } catch (error) {
        console.error("Error en login:", error);

        res.status(500).json({
            mensaje: "Error al iniciar sesión"
        });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});