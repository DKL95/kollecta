const bcrypt = require("bcryptjs");

const Usuario = require("../models/Usuario");
const { generarToken, bloqueoDeCuenta, ponerCookieMedios, quitarCookieMedios } = require("../middleware/auth");
const { guardarImagen } = require("../middleware/upload");
const logger = require("../config/logger");

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
            fotoPerfil: ""
        });

        if (req.file) {
            nuevoUsuario.fotoPerfil = await guardarImagen(req.file, nuevoUsuario._id);
        }

        await nuevoUsuario.save();
        res.locals.usuarioId = String(nuevoUsuario._id); // para la bitácora
        ponerCookieMedios(req, res, nuevoUsuario._id);

        res.status(201).json({
            mensaje: "Usuario registrado correctamente",
            token: generarToken(nuevoUsuario),
            usuario: nuevoUsuario.aPublico()
        });
    } catch (error) {
        logger.error("Error en registro:", error);
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

        // Cuenta baneada o suspendida: no se entrega token
        const bloqueo = bloqueoDeCuenta(usuario);
        if (bloqueo) {
            return res.status(bloqueo.status).json(bloqueo.cuerpo);
        }

        res.locals.usuarioId = String(usuario._id); // para la bitácora
        ponerCookieMedios(req, res, usuario._id);

        res.json({
            mensaje: "Inicio de sesión correcto",
            token: generarToken(usuario),
            usuario: usuario.aPublico()
        });
    } catch (error) {
        logger.error("Error en login:", error);
        res.status(500).json({ mensaje: "Error al iniciar sesión" });
    }
}

// GET /api/auth/me
async function usuarioActual(req, res) {
    try {
        const usuario = await Usuario.findById(req.usuario.id);

        // El token es válido pero el usuario ya no existe (p. ej. se borró o es de otra base de datos):
        // se responde 401 para que el frontend cierre la sesión.
        if (!usuario) {
            return res.status(401).json({ mensaje: "Tu sesión ya no es válida, inicia sesión de nuevo" });
        }

        // Renueva la cookie de imágenes (también para sesiones abiertas antes de que existiera)
        ponerCookieMedios(req, res, usuario._id);
        res.json({ usuario: usuario.aPublico() });
    } catch (error) {
        logger.error("Error al obtener usuario actual:", error);
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

// POST /api/auth/logout: borra la cookie de imágenes (el JWT lo olvida el frontend)
function cerrarSesion(req, res) {
    quitarCookieMedios(req, res);
    res.json({ mensaje: "Sesión cerrada" });
}

module.exports = { registrar, iniciarSesion, usuarioActual, cerrarSesion };
