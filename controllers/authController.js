const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const Usuario = require("../models/Usuario");
const { generarToken, bloqueoDeCuenta, ponerCookieMedios, quitarCookieMedios } = require("../middleware/auth");
const { guardarImagen } = require("../middleware/upload");
const logger = require("../config/logger");
const { enviarCorreo } = require("../services/correo");

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

// ---------- Recuperar contraseña ----------

const VIGENCIA_ENLACE_MS = 60 * 60 * 1000; // el enlace sirve 1 hora
const ESPERA_REENVIO_MS = 60 * 1000;       // no se manda otro correo antes de 1 minuto

const RESPUESTA_RECUPERAR = "Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña. Revisa también la carpeta de spam.";
const ENLACE_INVALIDO = "El enlace no es válido o ya venció. Pide uno nuevo.";

function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

// La dirección del enlace sale de la configuración, NUNCA de los encabezados de la petición
// (si no, alguien podría pedir el correo de otra persona con un enlace hacia su propio sitio).
function urlDeLaApp() {
    const url = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || process.env.FRONTEND_URL || "http://localhost:5173";
    return url.replace(/\/+$/, "");
}

// POST /api/auth/recuperar  { email }
// Siempre responde lo mismo, exista o no la cuenta, para no revelar qué correos están registrados.
async function solicitarRecuperacion(req, res) {
    try {
        const email = String(req.body?.email || "").trim().toLowerCase();

        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({ mensaje: "Escribe un correo válido" });
        }

        const usuario = await Usuario.findOne({ email }).select("+recuperacionExpira");

        // Cuánto hace que se pidió el último enlace (para no mandar correos en ráfaga)
        const pedidoHace = usuario?.recuperacionExpira
            ? Date.now() - (usuario.recuperacionExpira.getTime() - VIGENCIA_ENLACE_MS)
            : Infinity;

        if (usuario && pedidoHace >= ESPERA_REENVIO_MS) {
            const token = crypto.randomBytes(32).toString("hex");
            usuario.recuperacionHash = hashToken(token);
            usuario.recuperacionExpira = new Date(Date.now() + VIGENCIA_ENLACE_MS);
            await usuario.save();
            res.locals.usuarioId = String(usuario._id); // para la bitácora

            const enlace = `${urlDeLaApp()}/restablecer?token=${token}`;
            const nombre = usuario.nombre || usuario.username;

            try {
                await enviarCorreo({
                    para: usuario.email,
                    asunto: "Restablece tu contraseña de KollectA",
                    texto: `Hola ${nombre}:\n\nRecibimos una solicitud para restablecer la contraseña de tu cuenta @${usuario.username}.\nAbre este enlace para elegir una nueva (vence en 1 hora):\n\n${enlace}\n\nSi no fuiste tú, ignora este correo: tu contraseña no cambiará.`,
                    html: correoRecuperacionHtml(nombre, usuario.username, enlace)
                });
            } catch (errorCorreo) {
                // Se quita el enlace para que se pueda volver a pedir de inmediato.
                usuario.recuperacionHash = undefined;
                usuario.recuperacionExpira = undefined;
                await usuario.save();
                logger.error("No se pudo enviar el correo de recuperación:", errorCorreo);
                return res.status(502).json({ mensaje: "No se pudo enviar el correo. Intenta de nuevo en unos minutos." });
            }
        }

        res.json({ mensaje: RESPUESTA_RECUPERAR });
    } catch (error) {
        logger.error("Error al solicitar recuperación de contraseña:", error);
        res.status(500).json({ mensaje: "Error al solicitar la recuperación de contraseña" });
    }
}

// POST /api/auth/restablecer  { token, password }
async function restablecerPassword(req, res) {
    try {
        const token = String(req.body?.token || "");
        const password = String(req.body?.password || "");

        if (!/^[a-f0-9]{64}$/.test(token)) {
            return res.status(400).json({ mensaje: ENLACE_INVALIDO });
        }

        if (password.length < 8) {
            return res.status(400).json({ mensaje: "La contraseña debe tener al menos 8 caracteres" });
        }

        const usuario = await Usuario.findOne({
            recuperacionHash: hashToken(token),
            recuperacionExpira: { $gt: new Date() }
        });

        if (!usuario) {
            return res.status(400).json({ mensaje: ENLACE_INVALIDO });
        }

        // El enlace es de un solo uso
        usuario.password = await bcrypt.hash(password, 10);
        usuario.recuperacionHash = undefined;
        usuario.recuperacionExpira = undefined;
        await usuario.save();
        res.locals.usuarioId = String(usuario._id); // para la bitácora

        res.json({ mensaje: "Tu contraseña se cambió. Ya puedes iniciar sesión con la nueva." });
    } catch (error) {
        logger.error("Error al restablecer la contraseña:", error);
        res.status(500).json({ mensaje: "Error al restablecer la contraseña" });
    }
}

function escaparHtml(texto) {
    const reemplazos = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return String(texto).replace(/[&<>"']/g, (c) => reemplazos[c]);
}

function correoRecuperacionHtml(nombre, username, enlace) {
    return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#222">
  <h2 style="color:#7b3fe4">KollectA</h2>
  <p>Hola ${escaparHtml(nombre)}:</p>
  <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta <b>@${escaparHtml(username)}</b>.</p>
  <p style="text-align:center;margin:28px 0">
    <a href="${enlace}" style="background:#7b3fe4;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Elegir nueva contraseña</a>
  </p>
  <p style="font-size:13px;color:#555">El enlace vence en 1 hora y solo se puede usar una vez. Si el botón no funciona, copia esta dirección en tu navegador:<br><a href="${enlace}">${enlace}</a></p>
  <p style="font-size:13px;color:#555">Si no fuiste tú, ignora este correo: tu contraseña no cambiará.</p>
</div>`;
}

module.exports = { registrar, iniciarSesion, usuarioActual, cerrarSesion, solicitarRecuperacion, restablecerPassword };
