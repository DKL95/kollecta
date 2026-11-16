/* ==========================================================================
   Administración (primer paso del plan de roles, ver docs/PLAN-roles.md).
   Listar usuarios, cambiar roles y banear/reactivar cuentas. Todo queda en la
   bitácora de moderación. Debe quedar al menos un administrador activo.
   ========================================================================== */

const express = require("express");
const mongoose = require("mongoose");

const Usuario = require("../models/Usuario");
const { requiereAuth } = require("../middleware/auth");
const { requiereRol, ROLES } = require("../middleware/roles");
const {
    verificarUltimoAdmin,
    cambiarActivo,
    registrar,
    avisar,
    responderError
} = require("../services/moderacion");

const router = express.Router();

router.use(requiereAuth, requiereRol("administrador"));

// GET /api/admin/usuarios?q=&rol=
router.get("/usuarios", async (req, res) => {
    try {
        const texto = String(req.query.q || "").trim();
        const filtro = {};

        if (texto) {
            const escapado = texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            filtro.$or = [
                { username: new RegExp(escapado, "i") },
                { nombre: new RegExp(escapado, "i") },
                { email: new RegExp(escapado, "i") }
            ];
        }

        if (req.query.rol) {
            if (!ROLES.includes(req.query.rol)) {
                return res.status(400).json({ mensaje: "Rol no válido" });
            }
            filtro.rol = req.query.rol;
        }

        const usuarios = await Usuario.find(filtro)
            .select("nombre username email rol activo motivoBaneo suspendidoHasta motivoSuspension fotoPerfil fechaRegistro")
            .sort({ fechaRegistro: -1 })
            .limit(100);

        res.json({ usuarios });
    } catch (error) {
        console.error("Error al listar usuarios (admin):", error);
        res.status(500).json({ mensaje: "No se pudieron cargar los usuarios" });
    }
});

// PATCH /api/admin/usuarios/:id/rol   body: { rol }
router.patch("/usuarios/:id/rol", async (req, res) => {
    try {
        const { id } = req.params;
        const { rol } = req.body || {};

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ mensaje: "El usuario no es válido" });
        }

        if (!ROLES.includes(rol)) {
            return res.status(400).json({ mensaje: `El rol debe ser uno de: ${ROLES.join(", ")}` });
        }

        if (String(id) === String(req.usuario.id)) {
            return res.status(400).json({ mensaje: "No puedes cambiar tu propio rol" });
        }

        const usuario = await Usuario.findById(id);
        if (!usuario) {
            return res.status(404).json({ mensaje: "Usuario no encontrado" });
        }

        if (usuario.rol === rol) {
            return res.status(400).json({ mensaje: `@${usuario.username} ya es ${rol}` });
        }

        // No se puede degradar al último administrador activo.
        if (rol !== "administrador") await verificarUltimoAdmin(usuario);

        const rolAnterior = usuario.rol;
        usuario.rol = rol;
        await usuario.save();

        await registrar({
            actor: { id: req.usuario.id },
            accion: "cambiar_rol",
            tipoObjetivo: "usuario",
            objetivo: usuario._id,
            usuarioAfectado: usuario._id,
            motivo: `${rolAnterior} → ${rol}`,
            detalle: { antes: rolAnterior, despues: rol }
        });

        await avisar(usuario._id, `Tu rol en KollectA ahora es: ${rol}`);

        res.json({ mensaje: `@${usuario.username} ahora es ${rol}`, usuario: usuario.aPublico() });
    } catch (error) {
        responderError(res, error, "No se pudo cambiar el rol");
    }
});

// PATCH /api/admin/usuarios/:id/estado   body: { activo: false, motivo } (banear) | { activo: true } (reactivar)
router.patch("/usuarios/:id/estado", async (req, res) => {
    try {
        const { id } = req.params;
        const { activo, motivo } = req.body || {};

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ mensaje: "El usuario no es válido" });
        }
        if (typeof activo !== "boolean") {
            return res.status(400).json({ mensaje: "Indica activo: true (reactivar) o false (banear)" });
        }

        const usuario = await cambiarActivo({
            actor: { id: req.usuario.id, rol: req.usuario.rol },
            usuarioId: id,
            activo,
            motivo
        });

        res.json({ mensaje: activo ? `@${usuario.username} fue reactivado` : `@${usuario.username} fue baneado` });
    } catch (error) {
        responderError(res, error, "No se pudo cambiar el estado de la cuenta");
    }
});

module.exports = router;
