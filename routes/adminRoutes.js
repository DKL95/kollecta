/* ==========================================================================
   Administración (primer paso del plan de roles, ver docs/PLAN-roles.md).
   Listar usuarios, cambiar roles y banear/reactivar cuentas. Todo queda en la
   bitácora de moderación. Debe quedar al menos un administrador activo.
   ========================================================================== */

const express = require("express");

const { requiereAuth } = require("../middleware/auth");
const { requiereRol } = require("../middleware/roles");
const { registrarOperacion } = require("../middleware/registrarOperacion");
const { listarUsuarios, cambiarRol, cambiarEstado } = require("../controllers/adminController");

const router = express.Router();

router.use(requiereAuth, requiereRol("administrador"));

// GET /api/admin/usuarios?q=&rol=
router.get("/usuarios", listarUsuarios);

// PATCH /api/admin/usuarios/:id/rol   body: { rol }
router.patch("/usuarios/:id/rol", registrarOperacion("cambiar rol"), cambiarRol);

// PATCH /api/admin/usuarios/:id/estado   body: { activo: false, motivo } (banear) | { activo: true } (reactivar)
router.patch("/usuarios/:id/estado", registrarOperacion("banear/reactivar cuenta"), cambiarEstado);

module.exports = router;
