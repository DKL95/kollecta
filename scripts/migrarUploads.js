/* ==========================================================================
   Migración única: pasa las fotos de la carpeta uploads/ a MongoDB.

   Antes las imágenes se guardaban en el disco de quien las subía, así que
   solo esa persona podía verlas. Este script lo corre quien tenga los
   archivos en su carpeta uploads/:

       npm run migrar-uploads

   Para cada usuario o publicación con una ruta "/uploads/..." cuyo archivo
   exista en esta computadora, guarda la imagen en la colección "imagenes"
   y actualiza la ruta. Se puede correr varias veces sin duplicar nada.
   ========================================================================== */

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const { conectarMongo } = require("../config/db");
const Usuario = require("../models/Usuario");
const Publicacion = require("../models/Publicacion");
const { guardarImagen, CARPETA_UPLOADS } = require("../middleware/upload");

const TIPOS_POR_EXTENSION = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp"
};

// Regresa la nueva URL, o null si el archivo no está en esta computadora
async function migrarRuta(ruta, idUsuario) {
    const rutaArchivo = path.join(CARPETA_UPLOADS, path.basename(ruta));

    if (!fs.existsSync(rutaArchivo)) {
        return null;
    }

    const datos = fs.readFileSync(rutaArchivo);
    const tipo = TIPOS_POR_EXTENSION[path.extname(rutaArchivo).toLowerCase()] || "image/jpeg";

    return guardarImagen({ buffer: datos, mimetype: tipo, size: datos.length }, idUsuario);
}

async function migrar() {
    await conectarMongo(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || "kpop" });

    let migradas = 0;
    let faltantes = 0;

    const usuarios = await Usuario.find({ fotoPerfil: /^\/uploads\// });
    for (const usuario of usuarios) {
        const nuevaRuta = await migrarRuta(usuario.fotoPerfil, usuario._id);
        if (nuevaRuta) {
            usuario.fotoPerfil = nuevaRuta;
            await usuario.save();
            migradas++;
        } else {
            console.log(`No está en esta computadora: foto de @${usuario.username} (${usuario.fotoPerfil})`);
            faltantes++;
        }
    }

    const publicaciones = await Publicacion.find({ imagen: /^\/uploads\// });
    for (const publicacion of publicaciones) {
        const nuevaRuta = await migrarRuta(publicacion.imagen, publicacion.autor);
        if (nuevaRuta) {
            publicacion.imagen = nuevaRuta;
            await publicacion.save();
            migradas++;
        } else {
            console.log(`No está en esta computadora: imagen de la publicación ${publicacion._id}`);
            faltantes++;
        }
    }

    console.log(`Listo: ${migradas} imágenes migradas a MongoDB, ${faltantes} no encontradas en esta computadora.`);
    await mongoose.disconnect();
}

migrar().catch((error) => {
    console.error("Error en la migración:", error);
    process.exit(1);
});
