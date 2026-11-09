const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "kollecta-dev-secret";

function generarToken(usuario) {
    return jwt.sign(
        { id: usuario._id, username: usuario.username },
        JWT_SECRET,
        { expiresIn: "7d" }
    );
}

// Exige un token válido en el header Authorization: Bearer <token>
function requiereAuth(req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ mensaje: "Debes iniciar sesión" });
    }

    try {
        req.usuario = jwt.verify(token, JWT_SECRET);
        next();
    } catch (error) {
        return res.status(401).json({
            mensaje: "Sesión inválida o expirada"
        });
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
            req.usuario = jwt.verify(tokenHeader, JWT_SECRET);
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

module.exports = {
    generarToken,
    requiereAuth,
    generarTokenReproduccion,
    requiereAuthVideo
};