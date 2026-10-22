const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "kollecta-dev-secret";

function generarToken(usuario) {
    return jwt.sign({ id: usuario._id, username: usuario.username }, JWT_SECRET, {
        expiresIn: "7d"
    });
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
        return res.status(401).json({ mensaje: "Sesión inválida o expirada" });
    }
}

module.exports = { generarToken, requiereAuth };
