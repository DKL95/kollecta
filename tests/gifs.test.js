const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { iniciarApi, crearCliente, registrarUsuario } = require("./helpers");

const GIF = { url: "https://media2.giphy.com/media/abc123/200.gif", ancho: 356, alto: 200, titulo: "Feliz" };

describe("GIFs en publicaciones, comentarios, respuestas y chat", () => {
    let entorno;
    let api;
    let ana;
    let beto;
    const llaveOriginal = process.env.GIPHY_API_KEY;

    before(async () => {
        delete process.env.GIPHY_API_KEY;
        entorno = await iniciarApi("gifs");
        api = crearCliente(entorno.url);
        ana = await registrarUsuario(api);
        beto = await registrarUsuario(api);
    });

    after(async () => {
        if (llaveOriginal) process.env.GIPHY_API_KEY = llaveOriginal;
        await entorno.detener();
    });

    it("la búsqueda pide sesión y avisa si falta la llave de GIPHY", async () => {
        assert.equal((await api("GET", "/api/gifs?q=hola")).status, 401);
        const r = await api("GET", "/api/gifs?q=hola", { token: ana.token });
        assert.equal(r.status, 503);
        assert.match(r.body.mensaje, /GIPHY_API_KEY/);
    });

    it("publicación solo con GIF; se puede quitar al editar si hay texto", async () => {
        const r = await api("POST", "/api/publicaciones", { token: ana.token, form: { gif: JSON.stringify(GIF) } });
        assert.equal(r.status, 201);
        assert.equal(r.body.publicacion.gif.url, GIF.url);
        assert.equal(r.body.publicacion.texto, "");

        const vacia = await api("POST", "/api/publicaciones", { token: ana.token, form: { texto: "  " } });
        assert.equal(vacia.status, 400);

        const id = r.body.publicacion.id;
        const editada = await api("PUT", `/api/publicaciones/${id}`, { token: ana.token, form: { texto: "Ahora con texto", gif: "" } });
        assert.equal(editada.status, 200);
        assert.equal(editada.body.publicacion.gif, null);
    });

    it("comentario y respuesta con GIF, y rechaza GIFs de otros sitios", async () => {
        const pub = await api("POST", "/api/publicaciones", { token: ana.token, form: { texto: "Mi nueva photocard" } });
        const id = pub.body.publicacion.id;

        const malo = await api("POST", `/api/publicaciones/${id}/comentarios`, {
            token: beto.token,
            json: { gif: { url: "https://evil.example.com/x.gif" } }
        });
        assert.equal(malo.status, 400);

        const com = await api("POST", `/api/publicaciones/${id}/comentarios`, { token: beto.token, json: { gif: GIF } });
        assert.equal(com.status, 201);
        assert.equal(com.body.comentario.gif.url, GIF.url);

        const resp = await api("POST", `/api/publicaciones/${id}/comentarios/${com.body.comentario.id}/respuestas`, {
            token: ana.token,
            json: { texto: "jaja 😂", gif: GIF }
        });
        assert.equal(resp.status, 201);
        assert.equal(resp.body.respuesta.gif.ancho, 356);

        const lista = await api("GET", `/api/publicaciones/${id}/comentarios`, { token: ana.token });
        assert.equal(lista.body.comentarios[0].gif.url, GIF.url);
        assert.equal(lista.body.comentarios[0].respuestas[0].texto, "jaja 😂");
    });

    it("mensaje de chat solo con GIF", async () => {
        const conv = await api("POST", `/api/mensajes/conversaciones/${beto.usuario.id}`, { token: ana.token });
        const convId = conv.body._id;

        const r = await api("POST", `/api/mensajes/${convId}`, { token: ana.token, json: { gif: GIF } });
        assert.equal(r.status, 201);
        assert.equal(r.body.gif.url, GIF.url);

        const vacio = await api("POST", `/api/mensajes/${convId}`, { token: ana.token, json: { texto: "" } });
        assert.equal(vacio.status, 400);

        const mensajes = await api("GET", `/api/mensajes/${convId}`, { token: beto.token });
        assert.equal(mensajes.body.at(-1).gif.url, GIF.url);
    });
});
