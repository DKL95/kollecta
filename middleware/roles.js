/* ==========================================================================
   Roles: usuario < moderador < administrador.
   Cada rol tiene todos los permisos del anterior. El rol se lee de la base de
   datos en cada petición (no del token) para que un cambio de rol o una
   suspensión surta efecto de inmediato, sin esperar a que caduque el JWT.
   ========================================================================== */

const Usuario = require("../models/Usuario");

const ROLES = ["usuario", "moderador", "administrador"];

function nivel(rol) {
    const indice = ROLES.indexOf(rol);
    return indice === -1 ? 0 : indice;
}

// ¿El rol alcanza el mínimo pedido?
function alcanza(rol, minimo) {
    return nivel(rol) >= nivel(minimo);
}

async function tieneRol(usuarioId, minimo) {
    const usuario = await Usuario.findById(usuarioId).select("rol activo");
    return Boolean(usuario?.activo && alcanza(usuario.rol, minimo));
}

// Middleware: exige al menos el rol indicado. Va después de requiereAuth.
// Deja el rol en req.usuario.rol para que el controlador lo use.
function requiereRol(minimo) {
    return async (req, res, next) => {
        try {
            const usuario = await Usuario.findById(req.usuario?.id).select("rol activo");

            if (!usuario || !usuario.activo) {
                return res.status(401).json({ mensaje: "Tu sesión ya no es válida, inicia sesión de nuevo" });
            }

            if (!alcanza(usuario.rol, minimo)) {
                return res.status(403).json({ mensaje: "No tienes permiso para hacer esto" });
            }

            req.usuario.rol = usuario.rol;
            next();
        } catch (error) {
            next(error);
        }
    };
}

module.exports = { ROLES, alcanza, tieneRol, requiereRol };
