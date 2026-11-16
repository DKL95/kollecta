const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { iniciarApi, crearCliente, registrarUsuario } = require("./helpers");

describe("Editar/borrar mensajes y borrar notificaciones", () => {
    let entorno;
    let api;
    let ana;
    let beto;
    let caro;
    let grupoId;

    const idDe = (cuenta) => cuenta.usuario._id || cuenta.usuario.id;

    before(async () => {
        entorno = await iniciarApi("mensajes_notif");
        api = crearCliente(entorno.url);
        ana = await registrarUsuario(api, { name: "Ana" });
        beto = await registrarUsuario(api, { name: "Beto" });
        caro = await registrarUsuario(api, { name: "Caro" });

        const grupo = await api("POST", "/api/mensajes/grupos", {
            token: ana.token,
            json: { nombre: "Fans", participantes: [idDe(beto), idDe(caro)] }
        });
        grupoId = grupo.body.conversacion?._id || grupo.body._id;
        assert.ok(grupoId, JSON.stringify(grupo.body));
    });

    after(async () => {
        await entorno.detener();
    });

    describe("mensajes", () => {
        let mensajeId;

        before(async () => {
            const res = await api("POST", `/api/mensajes/${grupoId}`, { token: ana.token, json: { texto: "Hola a todos" } });
            assert.equal(res.status, 201);
            mensajeId = res.body._id;
        });

        it("solo el remitente puede editar, y el texto no puede quedar vacío", async () => {
            const ajeno = await api("PATCH", `/api/mensajes/${grupoId}/mensajes/${mensajeId}`, { token: beto.token, json: { texto: "hack" } });
            assert.equal(ajeno.status, 403);

            const vacio = await api("PATCH", `/api/mensajes/${grupoId}/mensajes/${mensajeId}`, { token: ana.token, json: { texto: "   " } });
            assert.equal(vacio.status, 400);

            const ok = await api("PATCH", `/api/mensajes/${grupoId}/mensajes/${mensajeId}`, { token: ana.token, json: { texto: "Hola, fans" } });
            assert.equal(ok.status, 200);
            assert.equal(ok.body.texto, "Hola, fans");
            assert.ok(ok.body.editadoEn);
        });

        it("ids inválidos → 400, inexistente → 404, sin sesión → 401", async () => {
            assert.equal((await api("PATCH", `/api/mensajes/${grupoId}/mensajes/abc`, { token: ana.token, json: { texto: "x" } })).status, 400);
            assert.equal((await api("DELETE", `/api/mensajes/${grupoId}/mensajes/0123456789abcdef01234567`, { token: ana.token })).status, 404);
            assert.equal((await api("DELETE", `/api/mensajes/${grupoId}/mensajes/${mensajeId}`)).status, 401);
        });

        it("borrar el último mensaje regresa la vista previa al anterior", async () => {
            const segundo = await api("POST", `/api/mensajes/${grupoId}`, { token: ana.token, json: { texto: "Me equivoqué" } });

            assert.equal((await api("DELETE", `/api/mensajes/${grupoId}/mensajes/${segundo.body._id}`, { token: beto.token })).status, 403);
            const res = await api("DELETE", `/api/mensajes/${grupoId}/mensajes/${segundo.body._id}`, { token: ana.token });
            assert.equal(res.status, 200);

            const mensajes = await api("GET", `/api/mensajes/${grupoId}`, { token: caro.token });
            assert.deepEqual(mensajes.body.map((m) => m.texto), ["Hola, fans"]);

            const conversaciones = await api("GET", "/api/mensajes/conversaciones", { token: caro.token });
            const grupo = conversaciones.body.find((c) => String(c._id) === String(grupoId));
            assert.equal(grupo.ultimoMensaje?.texto, "Hola, fans");
        });
    });

    describe("notificaciones", () => {
        let notificacionId;

        before(async () => {
            const post = await api("POST", "/api/publicaciones", { token: ana.token, json: { texto: "Mi bias" } });
            const id = post.body.publicacion?.id || post.body.publicacion?._id;
            await api("POST", `/api/publicaciones/${id}/comentarios`, { token: beto.token, json: { texto: "¡Qué bonito!" } });

            const lista = await api("GET", "/api/notificaciones", { token: ana.token });
            assert.ok(lista.body.notificaciones.length >= 1);
            notificacionId = lista.body.notificaciones[0]._id;
        });

        it("solo la dueña puede borrarla", async () => {
            assert.equal((await api("DELETE", `/api/notificaciones/${notificacionId}`, { token: beto.token })).status, 404);
            assert.equal((await api("DELETE", "/api/notificaciones/abc", { token: ana.token })).status, 400);

            const res = await api("DELETE", `/api/notificaciones/${notificacionId}`, { token: ana.token });
            assert.equal(res.status, 200);

            const lista = await api("GET", "/api/notificaciones", { token: ana.token });
            assert.ok(!lista.body.notificaciones.some((n) => n._id === notificacionId));
        });
    });
});
