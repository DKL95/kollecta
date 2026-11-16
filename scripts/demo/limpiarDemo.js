/* ==========================================================================
   Borra TODO lo de las cuentas de demostración (correo @demo.kollecta):
   sus publicaciones, comentarios, respuestas, likes, amistades, chats,
   notificaciones, imágenes, colecciones, productos, órdenes, denuncias y
   registros de moderación sobre ellas. No toca nada de las cuentas reales,
   salvo quitar los likes y amistades que tenían con cuentas demo.

   Uso (con MONGODB_URI en el .env):
     npm run limpiar-demo                 → solo muestra qué se borraría
     npm run limpiar-demo -- --confirmar  → lo borra
   ========================================================================== */

require("dotenv").config({ quiet: true });

const DOMINIO = /@demo\.kollecta$/i;
const ID_IMAGEN = /\/api\/imagenes\/([a-f0-9]{24})/i;

function idsDeImagenes(urls = []) {
    return urls.map((u) => String(u || "").match(ID_IMAGEN)?.[1]).filter(Boolean);
}

async function limpiarDemo(db, { confirmar = false } = {}) {
    const { ObjectId } = require("mongodb");
    const col = (n) => db.collection(n);

    const usuarios = await col("usuarios").find({ email: DOMINIO }, { projection: { _id: 1, fotoPerfil: 1 } }).toArray();
    const ids = usuarios.map((u) => u._id);
    if (!ids.length) return { usuarios: 0, borrados: {} };

    const enDemo = { $in: ids };
    const pubs = await col("publicaciones").find({ autor: enDemo }, { projection: { _id: 1, imagenes: 1 } }).toArray();
    const idsPubs = pubs.map((p) => p._id);
    const convs = await col("conversaciones").find({ participantes: enDemo }, { projection: { _id: 1, participantes: 1 } }).toArray();
    // Solo se borran los chats donde todos son demo; de los demás se saca a las cuentas demo.
    const soloDemo = convs.filter((c) => c.participantes.every((p) => ids.some((id) => id.equals(p)))).map((c) => c._id);
    const productos = await col("productos").find({ vendedor: enDemo }, { projection: { _id: 1, imagenes: 1 } }).toArray();
    const colecciones = await col("colecciones").find({ usuario: enDemo }, { projection: { "articulos.imagenes": 1 } }).toArray();
    const denuncias = await col("denuncias").find({ $or: [{ reportante: enDemo }, { usuarioDenunciado: enDemo }] }, { projection: { _id: 1 } }).toArray();
    const idsDenuncias = denuncias.map((d) => d._id);

    const imagenes = new Set([
        ...idsDeImagenes(usuarios.map((u) => u.fotoPerfil)),
        ...pubs.flatMap((p) => idsDeImagenes(p.imagenes)),
        ...productos.flatMap((p) => idsDeImagenes(p.imagenes)),
        ...colecciones.flatMap((c) => (c.articulos || []).flatMap((a) => idsDeImagenes(a.imagenes)))
    ]);

    const plan = {
        publicaciones: { autor: enDemo },
        comentarios: { $or: [{ autor: enDemo }, { publicacion: { $in: idsPubs } }] },
        respuestas: { $or: [{ autor: enDemo }, { publicacion: { $in: idsPubs } }] },
        solicitudes_amistad: { $or: [{ solicitante: enDemo }, { destinatario: enDemo }] },
        mensajes: { $or: [{ conversacion: { $in: soloDemo } }, { remitente: enDemo }] },
        conversaciones: { _id: { $in: soloDemo } },
        notificaciones: { $or: [{ destinatario: enDemo }, { emisor: enDemo }] },
        imagenes: { $or: [{ subidaPor: enDemo }, { _id: { $in: [...imagenes].map((i) => new ObjectId(i)) } }] },
        colecciones: { usuario: enDemo },
        productos: { vendedor: enDemo },
        ordenes: { $or: [{ comprador: enDemo }, { vendedor: enDemo }] },
        denuncias: { _id: { $in: idsDenuncias } },
        moderaciones: { $or: [{ usuarioAfectado: enDemo }, { denuncia: { $in: idsDenuncias } }] },
        usuarios: { _id: enDemo }
    };

    const borrados = {};
    for (const [nombre, filtro] of Object.entries(plan)) {
        borrados[nombre] = confirmar ? (await col(nombre).deleteMany(filtro)).deletedCount : await col(nombre).countDocuments(filtro);
    }

    if (confirmar) {
        // Rastros en documentos de cuentas reales.
        await col("publicaciones").updateMany({ likes: enDemo }, { $pull: { likes: enDemo } });
        await col("comentarios").updateMany({ likes: enDemo }, { $pull: { likes: enDemo } });
        await col("respuestas").updateMany({ likes: enDemo }, { $pull: { likes: enDemo } });
        await col("usuarios").updateMany({ amigos: enDemo }, { $pull: { amigos: enDemo } });
        await col("conversaciones").updateMany({ participantes: enDemo }, { $pull: { participantes: enDemo, administradores: enDemo } });
    }

    return { usuarios: ids.length, borrados };
}

async function main() {
    const mongoose = require("mongoose");
    const confirmar = process.argv.includes("--confirmar");
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("Falta MONGODB_URI en el .env");

    await mongoose.connect(uri);
    try {
        const { usuarios, borrados } = await limpiarDemo(mongoose.connection.db, { confirmar });
        console.log(`Base: ${mongoose.connection.name} · cuentas demo: ${usuarios}`);
        for (const [nombre, n] of Object.entries(borrados)) if (n) console.log(`  ${nombre.padEnd(20)} ${n}`);
        console.log(confirmar ? "\nBorrado." : "\nNo se borró nada. Para borrar: npm run limpiar-demo -- --confirmar");
    } finally {
        await mongoose.disconnect();
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error("ERROR:", error.message);
        process.exit(1);
    });
}

module.exports = { limpiarDemo };
