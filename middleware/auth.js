const jwt = require("jsonwebtoken");
const Usuario = require("../models/Usuario");

const JWT_SECRET = process.env.JWT_SECRET || "kollecta-dev-secret";

function generarToken(usuario) {
    return jwt.sign(
        { id: usuario._id, username: usuario.username },
        JWT_SECRET,
        { expiresIn: "7d" }
    );
}

// ¿La cuenta puede usar la app? Devuelve null si sí, o { status, cuerpo } con la
// respuesta que hay que mandar (baneo permanente o suspensión vigente).
function bloqueoDeCuenta(usuario) {
    if (!usuario) {
        return { status: 401, cuerpo: { mensaje: "Tu sesión ya no es válida, inicia sesión de nuevo" } };
    }

    if (!usuario.activo) {
        return {
            status: 403,
            cuerpo: {
                mensaje: "Tu cuenta fue dada de baja por incumplir las normas de la comunidad",
                bloqueo: "baneo",
                motivo: usuario.motivoBaneo || ""
            }
        };
    }

    if (usuario.suspendidoHasta && new Date(usuario.suspendidoHasta) > new Date()) {
        return {
            status: 403,
            cuerpo: {
                mensaje: `Tu cuenta está suspendida hasta el ${new Date(usuario.suspendidoHasta).toLocaleDateString("es-MX")}`,
                bloqueo: "suspension",
                hasta: usuario.suspendidoHasta,
                motivo: usuario.motivoSuspension || ""
            }
        };
    }

    return null;
}

// Exige un token válido en el header Authorization: Bearer <token>.
// Además revisa en la base de datos que la cuenta exista y no esté baneada ni
// suspendida, así una sanción surte efecto de inmediato. Deja el rol en req.usuario.rol.
async function requiereAuth(req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ mensaje: "Debes iniciar sesión" });
    }

    let datos;
    try {
        datos = jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return res.status(401).json({
            mensaje: "Sesión inválida o expirada"
        });
    }

    // Los permisos de un solo uso (video, imágenes) no sirven como sesión.
    if (datos.tipo) {
        return res.status(401).json({ mensaje: "Sesión inválida o expirada" });
    }

    try {
        const usuario = await Usuario.findById(datos.id)
            .select("rol activo motivoBaneo suspendidoHasta motivoSuspension")
            .lean();

        const bloqueo = bloqueoDeCuenta(usuario);
        if (bloqueo) return res.status(bloqueo.status).json(bloqueo.cuerpo);

        req.usuario = { ...datos, rol: usuario.rol };
        next();
    } catch (error) {
        next(error);
    }
}

// Crea un permiso temporal para reproducir un video específico.
function generarTokenReproduccion(usuario, idVideo) {
    return jwt.sign(
        {
            id: usuario.id || usuario._id?.toString(),
            tipo: "reproduccion_video",
            videoId: String(idVideo)
        },
        JWT_SECRET,
        { expiresIn: "3m" }
    );
}

// Permite el token normal por header o el permiso temporal por URL.
// El token temporal solo sirve para el video para el que fue generado.
function requiereAuthVideo(req, res, next) {
    const header = req.headers.authorization || "";
    const tokenHeader = header.startsWith("Bearer ")
        ? header.slice(7)
        : null;

    if (tokenHeader) {
        try {
            const datos = jwt.verify(tokenHeader, JWT_SECRET);
            if (datos.tipo) throw new Error("No es un token de sesión");
            req.usuario = datos;
            return next();
        } catch (error) {
            return res.status(401).json({
                mensaje: "Sesión inválida o expirada"
            });
        }
    }

    const token = req.query.token;

    if (!token) {
        return res.status(401).json({
            mensaje: "Debes iniciar sesión para reproducir este video"
        });
    }

    try {
        const datos = jwt.verify(token, JWT_SECRET);

        if (
            datos.tipo !== "reproduccion_video" ||
            datos.videoId !== String(req.params.id)
        ) {
            return res.status(403).json({
                mensaje: "El permiso no corresponde a este video"
            });
        }

        req.usuario = datos;
        next();
    } catch (error) {
        return res.status(401).json({
            mensaje: "El permiso de reproducción expiró o no es válido"
        });
    }
}

/* --------------------------------------------------------------------------
   Imágenes: <img src="/api/imagenes/..."> no puede mandar el header
   Authorization, así que al iniciar sesión se guarda un token de solo lectura
   en una cookie httpOnly. Ese token solo abre imágenes: no sirve para la API.
   -------------------------------------------------------------------------- */
const COOKIE_MEDIOS = "kollecta_medios";
const DURACION_MEDIOS_MS = 7 * 24 * 60 * 60 * 1000;

function opcionesCookieMedios(req) {
    const https = req.secure || req.headers["x-forwarded-proto"] === "https";
    return { httpOnly: true, sameSite: "lax", secure: https, path: "/" };
}

function ponerCookieMedios(req, res, idUsuario) {
    const token = jwt.sign({ id: String(idUsuario), tipo: "medios" }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie(COOKIE_MEDIOS, token, { ...opcionesCookieMedios(req), maxAge: DURACION_MEDIOS_MS });
}

function quitarCookieMedios(req, res) {
    res.clearCookie(COOKIE_MEDIOS, opcionesCookieMedios(req));
}

function leerCookie(req, nombre) {
    for (const parte of (req.headers.cookie || "").split(";")) {
        const [clave, ...valor] = parte.trim().split("=");
        if (clave === nombre) return decodeURIComponent(valor.join("="));
    }
    return null;
}

// Acepta el JWT de sesión (header) o el token de imágenes (cookie).
function requiereAuthMedios(req, res, next) {
    const header = req.headers.authorization || "";
    const tokenHeader = header.startsWith("Bearer ") ? header.slice(7) : null;
    const token = tokenHeader || leerCookie(req, COOKIE_MEDIOS);

    if (!token) {
        return res.status(401).json({ mensaje: "Debes iniciar sesión para ver esta imagen" });
    }

    try {
        const datos = jwt.verify(token, JWT_SECRET);
        const valido = tokenHeader ? !datos.tipo : datos.tipo === "medios";
        if (!valido) return res.status(401).json({ mensaje: "Sesión inválida o expirada" });

        req.usuario = { id: datos.id };
        next();
    } catch (error) {
        return res.status(401).json({ mensaje: "Sesión inválida o expirada" });
    }
}

module.exports = {
    ponerCookieMedios,
    quitarCookieMedios,
    requiereAuthMedios,
    generarToken,
    bloqueoDeCuenta,
    requiereAuth,
    generarTokenReproduccion,
    requiereAuthVideo
};