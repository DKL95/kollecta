const bcrypt = require("bcryptjs");

const Usuario = require("../models/Usuario");
const { generarToken } = require("../middleware/auth");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9._]{3,30}$/;

// POST /api/auth/register
async function registrar(req, res) {
    try {
        const { name, email, password, bias, descripcion } = req.body;
        const username = (req.body.username || "").trim().replace(/^@/, "");

        if (!username || !email || !password) {
            return res.status(400).json({ mensaje: "Usuario, correo y contraseña son obligatorios" });
        }

        if (!USERNAME_REGEX.test(username)) {
            return res.status(400).json({
                mensaje: "El usuario debe tener de 3 a 30 caracteres (letras, números, punto o guion bajo)"
            });
        }

        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({ mensaje: "El correo no es válido" });
        }

        if (password.length < 8) {
            return res.status(400).json({ mensaje: "La contraseña debe tener al menos 8 caracteres" });
        }

        const usuarioExistente = await Usuario.findOne({
            $or: [{ username: username }, { email: email.toLowerCase() }]
        });

        if (usuarioExistente) {
            return res.status(400).json({ mensaje: "El usuario o correo ya está registrado" });
        }

        const nuevoUsuario = new Usuario({
            nombre: name || "",
            username,
            email: email.toLowerCase(),
            password: await bcrypt.hash(password, 10),
            gruposFavoritos: bias ? [bias] : [],
            descripcion: descripcion || "",
            fotoPerfil: req.file ? "/uploads/" + req.file.filename : ""
        });

        await nuevoUsuario.save();

        res.status(201).json({
            mensaje: "Usuario registrado correctamente",
            token: generarToken(nuevoUsuario),
            usuario: nuevoUsuario.aPublico()
        });
    } catch (error) {
        console.error("Error en registro:", error);
        res.status(500).json({ mensaje: "Error al registrar usuario" });
    }
}

// POST /api/auth/login
async function iniciarSesion(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ mensaje: "Correo y contraseña son obligatorios" });
        }

        const usuario = await Usuario.findOne({ email: email.toLowerCase() });

        if (!usuario || !(await passwordCorrecta(usuario, password))) {
            return res.status(401).json({ mensaje: "Correo o contraseña incorrectos" });
        }

        res.json({
            mensaje: "Inicio de sesión correcto",
            token: generarToken(usuario),
            usuario: usuario.aPublico()
        });
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ mensaje: "Error al iniciar sesión" });
    }
}

// GET /api/auth/me
async function usuarioActual(req, res) {
    try {
        const usuario = await Usuario.findById(req.usuario.id);

        if (!usuario) {
            return res.status(404).json({ mensaje: "Usuario no encontrado" });
        }

        res.json({ usuario: usuario.aPublico() });
    } catch (error) {
        console.error("Error al obtener usuario actual:", error);
        res.status(500).json({ mensaje: "Error al obtener el usuario" });
    }
}

// Las cuentas creadas antes de usar bcrypt tienen la contraseña en texto plano:
// si coincide, se cifra en ese momento para que quede migrada.
async function passwordCorrecta(usuario, password) {
    if (usuario.password.startsWith("$2")) {
        return bcrypt.compare(password, usuario.password);
    }

    if (usuario.password !== password) {
        return false;
    }

    usuario.password = await bcrypt.hash(password, 10);
    await usuario.save();
    return true;
}

module.exports = { registrar, iniciarSesion, usuarioActual };
