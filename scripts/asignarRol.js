/* ==========================================================================
   Cambia el rol de un usuario directamente en la base de datos.
   Sirve para nombrar al primer administrador (después, los administradores
   cambian roles desde PATCH /api/admin/usuarios/:id/rol).

   Uso:  node scripts/asignarRol.js <username> <usuario|moderador|administrador>
   ========================================================================== */

require("dotenv").config({ quiet: true });

const mongoose = require("mongoose");
const { conectarMongo } = require("../config/db");
const Usuario = require("../models/Usuario");
const { ROLES } = require("../middleware/roles");

async function main() {
    const [username, rol] = process.argv.slice(2);

    if (!username || !ROLES.includes(rol)) {
        console.error(`Uso: node scripts/asignarRol.js <username> <${ROLES.join("|")}>`);
        process.exit(1);
    }

    if (!process.env.MONGODB_URI) {
        console.error("Falta MONGODB_URI en el .env");
        process.exit(1);
    }

    await conectarMongo(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || "kpop" });

    const usuario = await Usuario.findOneAndUpdate({ username }, { rol }, { new: true });

    if (!usuario) {
        console.error(`No existe el usuario @${username}`);
        process.exitCode = 1;
    } else {
        console.log(`@${usuario.username} ahora es ${usuario.rol}`);
    }

    await mongoose.disconnect();
}

main().catch(async (error) => {
    console.error(error.message);
    await mongoose.disconnect();
    process.exit(1);
});
