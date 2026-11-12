const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { iniciarApi, crearCliente, registrarUsuario } = require("./helpers");
const Usuario = require("../models/Usuario");

describe("Amigos activos (/api/usuarios/me/amigos)", () => {
    let entorno;
    let api;
    let ana;
    let beto;
    let caro;
    let dani;

    before(async () => {
        entorno = await iniciarApi("amigos");
        api = crearCliente(entorno.url);
        ana = await registrarUsuario(api, { name: "Ana" });
        beto = await registrarUsuario(api, { name: "Beto" });
        caro = await registrarUsuario(api, { name: "Caro" });
        dani = await registrarUsuario(api, { name: "Dani" });

        // Ana es amiga de Beto y Caro; Beto y Caro también son amigos entre sí.
        await Usuario.updateOne({ _id: ana.usuario.id }, { amigos: [beto.usuario.id, caro.usuario.id] });
        await Usuario.updateOne({ _id: beto.usuario.id }, { amigos: [ana.usuario.id, caro.usuario.id] });
        await Usuario.updateOne({ _id: caro.usuario.id }, { amigos: [ana.usuario.id, beto.usuario.id] });
    });

    after(async () => {
        await entorno.detener();
    });

    it("regresa solo mis amigos, con amigos en común y sin datos privados", async () => {
        const res = await api("GET", "/api/usuarios/me/amigos", { token: ana.token });
        assert.equal(res.status, 200);
        const usernames = res.body.amigos.map((a) => a.username).sort();
        assert.deepEqual(usernames, [beto.usuario.username, caro.usuario.username].sort());
        assert.ok(!usernames.includes(dani.usuario.username));

        const deBeto = res.body.amigos.find((a) => a.username === beto.usuario.username);
        assert.equal(deBeto.amigosEnComun, 1, "Caro es amiga de las dos");
        assert.equal(deBeto.enLinea, false, "sin Socket.IO en las pruebas nadie está en línea");
        assert.equal(deBeto.email, undefined);
        assert.equal(deBeto.amigos, undefined);
    });

    it("no muestra cuentas desactivadas y una persona sin amigos recibe lista vacía", async () => {
        await Usuario.updateOne({ _id: caro.usuario.id }, { activo: false });
        const res = await api("GET", "/api/usuarios/me/amigos", { token: ana.token });
        assert.deepEqual(res.body.amigos.map((a) => a.username), [beto.usuario.username]);

        const sola = await api("GET", "/api/usuarios/me/amigos", { token: dani.token });
        assert.deepEqual(sola.body.amigos, []);
    });

    it("pide sesión", async () => {
        assert.equal((await api("GET", "/api/usuarios/me/amigos")).status, 401);
    });
});
