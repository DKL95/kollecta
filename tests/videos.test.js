const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { iniciarApi, crearCliente, registrarUsuario } = require("./helpers");
const { leerRango } = require("../controllers/videoController");

// 16 bytes que hacen de "video" (el servidor no decodifica el contenido)
const BYTES = Buffer.from("0123456789abcdef");

describe("Videos (/api/videos, GridFS)", () => {
    let entorno;
    let api;
    let derek;
    let idVideo;

    before(async () => {
        entorno = await iniciarApi("videos");
        api = crearCliente(entorno.url);
        derek = await registrarUsuario(api);

        const form = new FormData();
        form.append("texto", "Fancam");
        form.append("videos", new Blob([BYTES], { type: "video/mp4" }), "fancam.mp4");
        const res = await fetch(`${entorno.url}/api/publicaciones`, {
            method: "POST",
            headers: { Authorization: `Bearer ${derek.token}` },
            body: form
        });
        const cuerpo = await res.json();
        assert.equal(res.status, 201, JSON.stringify(cuerpo));
        idVideo = cuerpo.publicacion.videos[0].split("/").pop();
    });

    after(async () => {
        await entorno.detener();
    });

    it("la URL de reproducción exige sesión", async () => {
        const res = await api("GET", `/api/videos/${idVideo}/playback-url`);
        assert.equal(res.status, 401);
    });

    it("id inválido → 400 y video inexistente → 404", async () => {
        assert.equal((await api("GET", "/api/videos/abc/playback-url", { token: derek.token })).status, 400);
        assert.equal((await api("GET", "/api/videos/0123456789abcdef01234567/playback-url", { token: derek.token })).status, 404);
    });

    it("transmite completo y por rangos con el permiso temporal", async () => {
        const { body } = await api("GET", `/api/videos/${idVideo}/playback-url`, { token: derek.token });
        assert.match(body.url, /\?token=/);

        const completo = await fetch(entorno.url + body.url);
        assert.equal(completo.status, 200);
        assert.equal(completo.headers.get("content-type"), "video/mp4");
        assert.deepEqual(Buffer.from(await completo.arrayBuffer()), BYTES);

        const parcial = await fetch(entorno.url + body.url, { headers: { Range: "bytes=4-7" } });
        assert.equal(parcial.status, 206);
        assert.equal(parcial.headers.get("content-range"), "bytes 4-7/16");
        assert.equal(Buffer.from(await parcial.arrayBuffer()).toString(), "4567");

        const fuera = await fetch(entorno.url + body.url, { headers: { Range: "bytes=99-" } });
        assert.equal(fuera.status, 416);
    });

    it("sin token responde 401 y el permiso de otro video no sirve", async () => {
        assert.equal((await fetch(`${entorno.url}/api/videos/${idVideo}`)).status, 401);

        const { body } = await api("GET", `/api/videos/${idVideo}/playback-url`, { token: derek.token });
        const token = body.url.split("token=")[1];
        const otro = await fetch(`${entorno.url}/api/videos/0123456789abcdef01234567?token=${token}`);
        assert.equal(otro.status, 403);

        // El permiso de reproducción tampoco sirve como sesión
        assert.equal((await api("GET", "/api/auth/me", { token: decodeURIComponent(token) })).status, 401);
    });

    it("leerRango interpreta rangos normales, abiertos y de sufijo", () => {
        assert.deepEqual(leerRango("bytes=0-3", 10), { inicio: 0, fin: 3 });
        assert.deepEqual(leerRango("bytes=5-", 10), { inicio: 5, fin: 9 });
        assert.deepEqual(leerRango("bytes=-4", 10), { inicio: 6, fin: 9 });
        assert.deepEqual(leerRango("bytes=2-99", 10), { inicio: 2, fin: 9 });
        assert.equal(leerRango("bytes=-", 10), null);
        assert.equal(leerRango("bytes=8-2", 10), null);
        assert.equal(leerRango("items=0-1", 10), null);
    });
});
