const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const { iniciarApi, crearCliente, registrarUsuario, imagenPng } = require("./helpers");
const { limpiarDemo } = require("../scripts/demo/limpiarDemo");

// scripts/demo/limpiarDemo.js debe borrar todo lo demo sin tocar a las cuentas reales.
describe("Limpieza de los datos de demostración", () => {
    let entorno;
    let api;

    before(async () => {
        entorno = await iniciarApi("demo");
        api = crearCliente(entorno.url);
    });

    after(async () => {
        await entorno.detener();
    });

    it("borra cuentas @demo.kollecta y todo lo suyo; deja intacto lo real", async () => {
        const real = await registrarUsuario(api, { username: "real_user", email: "real@test.com" });
        const demoA = await registrarUsuario(api, { username: "demo_a", email: "demo_a@demo.kollecta", fotoPerfil: imagenPng() });
        const demoB = await registrarUsuario(api, { username: "demo_b", email: "demo_b@demo.kollecta" });

        const pubReal = await api("POST", "/api/publicaciones", { token: real.token, form: { texto: "Publicación real" } });
        const pubDemo = await api("POST", "/api/publicaciones", { token: demoA.token, form: { texto: "Demo", imagenes: imagenPng() } });
        await api("POST", `/api/publicaciones/${pubReal.body.publicacion.id}/like`, { token: demoA.token });
        await api("POST", `/api/publicaciones/${pubReal.body.publicacion.id}/comentarios`, { token: demoB.token, json: { texto: "hola" } });
        await api("POST", `/api/publicaciones/${pubDemo.body.publicacion.id}/comentarios`, { token: real.token, json: { texto: "comentario real en pub demo" } });
        const conv = await api("POST", `/api/mensajes/conversaciones/${demoB.usuario.id}`, { token: demoA.token });
        await api("POST", `/api/mensajes/${conv.body._id}`, { token: demoA.token, json: { texto: "hola demo" } });
        const prod = await api("POST", "/api/productos", {
            token: demoA.token,
            form: { titulo: "Álbum demo", grupo: "TWICE", categoria: "Álbum", precio: "100", disponibleCompra: "true", disponibleIntercambio: "false", imagenes: imagenPng() }
        });
        await api("POST", "/api/ordenes", { token: demoB.token, json: { productoId: prod.body.producto.id, tipo: "compra", entrega: "envio" } });

        const db = mongoose.connection.db;
        const simulacro = await limpiarDemo(db);
        assert.equal(simulacro.usuarios, 2);
        assert.equal(await db.collection("usuarios").countDocuments(), 3, "sin --confirmar no borra nada");

        const { borrados } = await limpiarDemo(db, { confirmar: true });
        assert.equal(borrados.usuarios, 2);
        assert.ok(borrados.imagenes >= 3, "foto de perfil, de la publicación y del producto");

        assert.deepEqual((await db.collection("usuarios").find().toArray()).map((u) => u.username), ["real_user"]);
        for (const nombre of ["productos", "ordenes", "conversaciones", "mensajes", "colecciones"]) {
            assert.equal(await db.collection(nombre).countDocuments(), 0, nombre);
        }
        const pubs = await db.collection("publicaciones").find().toArray();
        assert.equal(pubs.length, 1);
        assert.deepEqual(pubs[0].likes, [], "se quitó el like demo de la publicación real");
        assert.equal(await db.collection("comentarios").countDocuments(), 0, "comentario demo y el de la pub demo");
    });
});
