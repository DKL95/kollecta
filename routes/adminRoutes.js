/* ==========================================================================
   Administración (primer paso del plan de roles, ver docs/PLAN-roles.md).
   Por ahora: listar usuarios con su rol y cambiar el rol de alguien.
   ========================================================================== */

const express = require("express");
const mongoose = require("mongoose");

const Usuario = require("../models/Usuario");
const { requiereAuth } = require("../middleware/auth");
const { requiereRol, ROLES } = require("../middleware/roles");

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
            .select("nombre username email rol activo fotoPerfil fechaRegistro")
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

        usuario.rol = rol;
        await usuario.save();

        res.json({ mensaje: `@${usuario.username} ahora es ${rol}`, usuario: usuario.aPublico() });
    } catch (error) {
        console.error("Error al cambiar el rol:", error);
        res.status(500).json({ mensaje: "No se pudo cambiar el rol" });
    }
});

module.exports = router;
