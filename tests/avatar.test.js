const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { iniciarApi, crearCliente, registrarUsuario } = require("./helpers");

describe("Avatar y stickers", () => {
    let entorno;
    let api;
    let ana;
    let beto;
    let chatId;

    const idDe = (cuenta) => cuenta.usuario._id || cuenta.usuario.id;
    const guardarAvatar = (cuenta, avatar) => api("PUT", "/api/usuarios/me/avatar", { token: cuenta.token, json: { avatar } });

    before(async () => {
        entorno = await iniciarApi("avatar");
        api = crearCliente(entorno.url);
        ana = await registrarUsuario(api, { name: "Ana", username: "ana.avatar" });
        beto = await registrarUsuario(api, { name: "Beto", username: "beto.avatar" });

        const chat = await api("POST", `/api/mensajes/conversaciones/${idDe(beto)}`, { token: ana.token });
        chatId = chat.body._id;
        assert.ok(chatId, JSON.stringify(chat.body));
    });

    after(async () => {
        await entorno.detener();
    });

    describe("avatar", () => {
        it("al principio no hay avatar", async () => {
            const res = await api("GET", "/api/auth/me", { token: ana.token });
            assert.equal(res.status, 200);
            assert.equal((res.body.usuario || res.body).avatar, null);
        });

        it("guarda el avatar y completa lo que falte con los valores iniciales", async () => {
            const res = await guardarAvatar(ana, { piel: "canela", cabello: "coletas", colorCabello: "rosa", accesorio: "gato" });
            assert.equal(res.status, 200);
            const { avatar } = res.body.usuario;
            assert.equal(avatar.piel, "canela");
            assert.equal(avatar.cabello, "coletas");
            assert.equal(avatar.accesorio, "gato");
            assert.equal(avatar.ojos, "redondos");
            assert.equal(avatar.fondo, "kollecta");
        });

        it("rechaza opciones que no existen o un avatar mal formado", async () => {
            assert.equal((await guardarAvatar(ana, { cabello: "mohicano" })).status, 400);
            assert.equal((await guardarAvatar(ana, { piel: { $ne: 1 } })).status, 400);
            assert.equal((await guardarAvatar(ana, "nada")).status, 400);
            assert.equal((await guardarAvatar(ana, ["x"])).status, 400);
        });

        it("el avatar se ve en el perfil público, pero no los stickers guardados", async () => {
            const res = await api("GET", "/api/usuarios/ana.avatar", { token: beto.token });
            assert.equal(res.status, 200);
            assert.equal(res.body.usuario.avatar.cabello, "coletas");
            assert.equal(res.body.usuario.stickers, undefined);
        });
    });

    describe("mis stickers", () => {
        it("sin avatar no se pueden guardar stickers", async () => {
            const res = await api("POST", "/api/usuarios/me/stickers", { token: beto.token, json: { expresion: "feliz" } });
            assert.equal(res.status, 400);
        });

        it("guarda, valida y borra stickers propios", async () => {
            const ok = await api("POST", "/api/usuarios/me/stickers", {
                token: ana.token,
                json: { expresion: "amor", gesto: "corazon", texto: "  Saranghae   💜 " }
            });
            assert.equal(ok.status, 201);
            assert.equal(ok.body.sticker.texto, "Saranghae 💜");
            assert.equal(ok.body.usuario.stickers.length, 1);

            assert.equal((await api("POST", "/api/usuarios/me/stickers", { token: ana.token, json: { expresion: "bailar" } })).status, 400);
            assert.equal((await api("POST", "/api/usuarios/me/stickers", { token: ana.token, json: { gesto: "volar" } })).status, 400);
            assert.equal((await api("POST", "/api/usuarios/me/stickers", { token: ana.token, json: { texto: "x".repeat(21) } })).status, 400);

            const id = ok.body.sticker._id;
            assert.equal((await api("DELETE", `/api/usuarios/me/stickers/${id}`, { token: beto.token })).status, 404);
            const borrado = await api("DELETE", `/api/usuarios/me/stickers/${id}`, { token: ana.token });
            assert.equal(borrado.status, 200);
            assert.equal(borrado.body.usuario.stickers.length, 0);
            assert.equal((await api("DELETE", "/api/usuarios/me/stickers/abc", { token: ana.token })).status, 400);
        });

        it("hay un límite de 30 stickers guardados", async () => {
            for (let i = 0; i < 30; i++) {
                const res = await api("POST", "/api/usuarios/me/stickers", { token: ana.token, json: { texto: `#${i}` } });
                assert.equal(res.status, 201);
            }
            const extra = await api("POST", "/api/usuarios/me/stickers", { token: ana.token, json: { texto: "uno más" } });
            assert.equal(extra.status, 400);
        });
    });

    describe("stickers en el chat y en publicaciones", () => {
        it("manda un sticker con una copia de su avatar actual", async () => {
            const res = await api("POST", `/api/mensajes/${chatId}`, {
                token: ana.token,
                json: { sticker: { expresion: "feliz", gesto: "fighting", texto: "Hwaiting!" } }
            });
            assert.equal(res.status, 201, JSON.stringify(res.body));
            assert.equal(res.body.texto, "");
            assert.equal(res.body.sticker.expresion, "feliz");
            assert.equal(res.body.sticker.gesto, "fighting");
            assert.equal(res.body.sticker.avatar.cabello, "coletas");

            // Si después cambia su avatar, el sticker enviado se queda como estaba.
            await guardarAvatar(ana, { cabello: "bob" });
            const historial = await api("GET", `/api/mensajes/${chatId}`, { token: beto.token });
            const lista = historial.body.mensajes || historial.body;
            const enviado = lista.find((m) => m._id === res.body._id);
            assert.equal(enviado.sticker.avatar.cabello, "coletas");
        });

        it("no se puede mandar el avatar de otra persona: el servidor usa el propio", async () => {
            const res = await api("POST", `/api/mensajes/${chatId}`, {
                token: ana.token,
                json: { sticker: { expresion: "risa", avatar: { cabello: "rapado" } } }
            });
            assert.equal(res.status, 201);
            assert.equal(res.body.sticker.avatar.cabello, "bob");
        });

        it("sin avatar o con una pose inválida → 400", async () => {
            const sinAvatar = await api("POST", `/api/mensajes/${chatId}`, { token: beto.token, json: { sticker: { expresion: "feliz" } } });
            assert.equal(sinAvatar.status, 400);
            const invalido = await api("POST", `/api/mensajes/${chatId}`, { token: ana.token, json: { sticker: { expresion: "volar" } } });
            assert.equal(invalido.status, 400);
        });

        it("una publicación puede ser solo un sticker", async () => {
            const res = await api("POST", "/api/publicaciones", {
                token: ana.token,
                form: { sticker: JSON.stringify({ expresion: "amor", gesto: "corazon", texto: "Bias" }) }
            });
            assert.equal(res.status, 201, JSON.stringify(res.body));
            const publicacion = res.body.publicacion || res.body;
            assert.equal(publicacion.sticker.texto, "Bias");
            assert.equal(publicacion.sticker.avatar.cabello, "bob");

            const vacia = await api("POST", "/api/publicaciones", { token: beto.token, form: { sticker: JSON.stringify({ expresion: "feliz" }) } });
            assert.equal(vacia.status, 400);
        });
    });
});
