const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { iniciarApi, crearCliente, registrarUsuario } = require("./helpers");

describe("Chats grupales (/api/mensajes/grupos)", () => {
    let entorno;
    let api;
    let ana;
    let beto;
    let caro;
    let dani;
    let grupoId;

    const idDe = (cuenta) => cuenta.usuario._id || cuenta.usuario.id;

    before(async () => {
        entorno = await iniciarApi("grupos");
        api = crearCliente(entorno.url);
        ana = await registrarUsuario(api, { name: "Ana" });
        beto = await registrarUsuario(api, { name: "Beto" });
        caro = await registrarUsuario(api, { name: "Caro" });
        dani = await registrarUsuario(api, { name: "Dani" });
    });

    after(async () => {
        await entorno.detener();
    });

    it("requiere sesión", async () => {
        const res = await api("POST", "/api/mensajes/grupos", { json: {} });
        assert.equal(res.status, 401);
    });

    it("valida nombre y mínimo de participantes", async () => {
        const sinNombre = await api("POST", "/api/mensajes/grupos", {
            token: ana.token,
            json: { nombre: "  ", participantes: [idDe(beto), idDe(caro)] }
        });
        assert.equal(sinNombre.status, 400);

        const pocos = await api("POST", "/api/mensajes/grupos", {
            token: ana.token,
            json: { nombre: "Solo uno", participantes: [idDe(beto)] }
        });
        assert.equal(pocos.status, 400);

        const idMalo = await api("POST", "/api/mensajes/grupos", {
            token: ana.token,
            json: { nombre: "Malo", participantes: [idDe(beto), "no-es-un-id"] }
        });
        assert.equal(idMalo.status, 400);
    });

    it("crea el grupo con el creador como administrador", async () => {
        const res = await api("POST", "/api/mensajes/grupos", {
            token: ana.token,
            json: { nombre: "Intercambios TWICE", participantes: [idDe(beto), idDe(caro)] }
        });

        assert.equal(res.status, 201);
        assert.equal(res.body.tipo, "grupo");
        assert.equal(res.body.nombre, "Intercambios TWICE");
        assert.equal(res.body.participantes.length, 3);
        assert.deepEqual(res.body.administradores.map(String), [String(idDe(ana))]);
        grupoId = res.body._id;
    });

    it("aparece en las conversaciones de los participantes", async () => {
        const res = await api("GET", "/api/mensajes/conversaciones", { token: beto.token });
        assert.equal(res.status, 200);
        assert.ok(res.body.some((c) => c._id === grupoId && c.tipo === "grupo"));
    });

    it("un chat directo no reutiliza el grupo", async () => {
        const res = await api("POST", `/api/mensajes/conversaciones/${idDe(beto)}`, { token: ana.token });
        assert.equal(res.status, 200);
        assert.notEqual(res.body._id, grupoId);
        assert.notEqual(res.body.tipo, "grupo");
    });

    it("cuenta no leídos por persona y marca leído cuando todos lo leen", async () => {
        const enviado = await api("POST", `/api/mensajes/${grupoId}`, {
            token: ana.token,
            json: { texto: "¡Hola grupo!" }
        });
        assert.equal(enviado.status, 201);

        let noLeidos = await api("GET", "/api/mensajes/no-leidos", { token: beto.token });
        assert.equal(noLeidos.body.noLeidos, 1);

        await api("GET", `/api/mensajes/${grupoId}`, { token: beto.token });

        noLeidos = await api("GET", "/api/mensajes/no-leidos", { token: beto.token });
        assert.equal(noLeidos.body.noLeidos, 0);

        // Caro todavía no lo lee: para Ana sigue sin estar "leído".
        let mensajes = await api("GET", `/api/mensajes/${grupoId}`, { token: ana.token });
        assert.equal(mensajes.body[0].leido, false);

        await api("GET", `/api/mensajes/${grupoId}`, { token: caro.token });
        mensajes = await api("GET", `/api/mensajes/${grupoId}`, { token: ana.token });
        assert.equal(mensajes.body[0].leido, true);
    });

    it("solo los administradores renombran, agregan y quitan", async () => {
        const renombrarBeto = await api("PATCH", `/api/mensajes/grupos/${grupoId}`, {
            token: beto.token,
            json: { nombre: "Hackeado" }
        });
        assert.equal(renombrarBeto.status, 403);

        const agregarBeto = await api("POST", `/api/mensajes/grupos/${grupoId}/participantes`, {
            token: beto.token,
            json: { usuarios: [idDe(dani)] }
        });
        assert.equal(agregarBeto.status, 403);

        const renombrar = await api("PATCH", `/api/mensajes/grupos/${grupoId}`, {
            token: ana.token,
            json: { nombre: "Intercambios TWICE MTY" }
        });
        assert.equal(renombrar.status, 200);
        assert.equal(renombrar.body.nombre, "Intercambios TWICE MTY");

        const agregar = await api("POST", `/api/mensajes/grupos/${grupoId}/participantes`, {
            token: ana.token,
            json: { usuarios: [idDe(dani)] }
        });
        assert.equal(agregar.status, 200);
        assert.equal(agregar.body.participantes.length, 4);

        const quitar = await api("DELETE", `/api/mensajes/grupos/${grupoId}/participantes/${idDe(dani)}`, {
            token: ana.token
        });
        assert.equal(quitar.status, 200);
        assert.equal(quitar.body.participantes.length, 3);
    });

    it("quien sale o es quitado pierde el acceso", async () => {
        const res = await api("GET", `/api/mensajes/${grupoId}`, { token: dani.token });
        assert.equal(res.status, 404);

        const enviar = await api("POST", `/api/mensajes/${grupoId}`, {
            token: dani.token,
            json: { texto: "¿Sigo aquí?" }
        });
        assert.equal(enviar.status, 404);
    });

    it("si sale el único admin, otro participante pasa a ser admin", async () => {
        const salir = await api("DELETE", `/api/mensajes/grupos/${grupoId}/participantes/${idDe(ana)}`, {
            token: ana.token
        });
        assert.equal(salir.status, 200);

        const renombrar = await api("PATCH", `/api/mensajes/grupos/${grupoId}`, {
            token: beto.token,
            json: { nombre: "Ahora mando yo" }
        });
        assert.equal(renombrar.status, 200);
    });
});
