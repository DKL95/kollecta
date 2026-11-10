const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { iniciarApi, crearCliente, registrarUsuario, imagenPng } = require("./helpers");

describe("Publicaciones (/api/publicaciones)", () => {
    let entorno;
    let api;
    let autor;
    let otro;

    before(async () => {
        entorno = await iniciarApi("publicaciones");
        api = crearCliente(entorno.url);
        autor = await registrarUsuario(api, { name: "Autora" });
        otro = await registrarUsuario(api, { name: "Otra persona" });
    });

    after(async () => {
        await entorno.detener();
    });

    it("requiere sesión en todas las rutas", async () => {
        const rutas = [
            ["GET", "/api/publicaciones"],
            ["POST", "/api/publicaciones"],
            ["GET", "/api/publicaciones/000000000000000000000000"],
            ["PUT", "/api/publicaciones/000000000000000000000000"],
            ["DELETE", "/api/publicaciones/000000000000000000000000"],
            ["POST", "/api/publicaciones/000000000000000000000000/like"]
        ];

        for (const [metodo, ruta] of rutas) {
            const res = await api(metodo, ruta);
            assert.equal(res.status, 401, `${metodo} ${ruta}`);
        }
    });

    it("crea una publicación con texto, grupo e imagen", async () => {
        const res = await api("POST", "/api/publicaciones", {
            token: autor.token,
            form: { texto: "  Mi nueva photocard  ", grupo: "TWICE", imagen: imagenPng() }
        });

        assert.equal(res.status, 201);
        const publicacion = res.body.publicacion;
        assert.equal(publicacion.texto, "Mi nueva photocard", "se quitan los espacios sobrantes");
        assert.equal(publicacion.grupo, "TWICE");
        assert.match(publicacion.imagen, /^\/api\/imagenes\//);
        assert.equal(publicacion.autor.username, autor.usuario.username);
        assert.equal(publicacion.totalLikes, 0);
        assert.equal(publicacion.meGusta, false);
        assert.equal(publicacion.esMia, true);

        const imagen = await api("GET", publicacion.imagen);
        assert.equal(imagen.status, 200);
    });

    it("acepta crear publicaciones en JSON (sin imagen)", async () => {
        const res = await api("POST", "/api/publicaciones", { token: autor.token, json: { texto: "Desde JSON", grupo: "BTS" } });
        assert.equal(res.status, 201);
        assert.equal(res.body.publicacion.imagen, "");
    });

    it("valida texto vacío y demasiado largo", async () => {
        const vacia = await api("POST", "/api/publicaciones", { token: autor.token, form: { texto: "   " } });
        const sinCuerpo = await api("POST", "/api/publicaciones", { token: autor.token });
        const larga = await api("POST", "/api/publicaciones", { token: autor.token, form: { texto: "x".repeat(1001) } });

        assert.equal(vacia.status, 400);
        assert.equal(sinCuerpo.status, 400);
        assert.equal(larga.status, 400);
    });

    it("lista las publicaciones de la más nueva a la más vieja y filtra por grupo", async () => {
        const todas = await api("GET", "/api/publicaciones", { token: otro.token });
        assert.equal(todas.status, 200);
        assert.deepEqual(
            todas.body.publicaciones.map((p) => p.texto),
            ["Desde JSON", "Mi nueva photocard"]
        );
        assert.ok(todas.body.publicaciones.every((p) => p.esMia === false), "para otro usuario no son suyas");

        const twice = await api("GET", "/api/publicaciones?grupo=TWICE", { token: otro.token });
        assert.deepEqual(twice.body.publicaciones.map((p) => p.grupo), ["TWICE"]);

        const sinResultados = await api("GET", "/api/publicaciones?grupo=ATEEZ", { token: otro.token });
        assert.deepEqual(sinResultados.body.publicaciones, []);
    });

    describe("con una publicación existente", () => {
        let publicacion;

        before(async () => {
            const res = await api("POST", "/api/publicaciones", { token: autor.token, json: { texto: "Para probar likes" } });
            publicacion = res.body.publicacion;
        });

        it("obtiene una publicación por id", async () => {
            const res = await api("GET", `/api/publicaciones/${publicacion.id}`, { token: otro.token });
            assert.equal(res.status, 200);
            assert.equal(res.body.publicacion.texto, "Para probar likes");
        });

        it("responde 404 con id inexistente o mal formado", async () => {
            const inexistente = await api("GET", "/api/publicaciones/000000000000000000000000", { token: autor.token });
            const malFormado = await api("GET", "/api/publicaciones/abc", { token: autor.token });
            assert.equal(inexistente.status, 404);
            assert.equal(malFormado.status, 404);
        });

        it("da y quita like, y cuenta likes de distintos usuarios", async () => {
            const like = await api("POST", `/api/publicaciones/${publicacion.id}/like`, { token: otro.token });
            assert.equal(like.body.publicacion.totalLikes, 1);
            assert.equal(like.body.publicacion.meGusta, true);

            const likeAutor = await api("POST", `/api/publicaciones/${publicacion.id}/like`, { token: autor.token });
            assert.equal(likeAutor.body.publicacion.totalLikes, 2);

            const quitar = await api("POST", `/api/publicaciones/${publicacion.id}/like`, { token: otro.token });
            assert.equal(quitar.body.publicacion.totalLikes, 1);
            assert.equal(quitar.body.publicacion.meGusta, false);

            const vista = await api("GET", `/api/publicaciones/${publicacion.id}`, { token: autor.token });
            assert.equal(vista.body.publicacion.meGusta, true, "el like del autor se mantiene");
        });

        it("solo el autor puede editar", async () => {
            const ajeno = await api("PUT", `/api/publicaciones/${publicacion.id}`, { token: otro.token, json: { texto: "hackeado" } });
            assert.equal(ajeno.status, 403);

            const propio = await api("PUT", `/api/publicaciones/${publicacion.id}`, {
                token: autor.token,
                json: { texto: "  Texto editado ", grupo: "aespa" }
            });
            assert.equal(propio.status, 200);
            assert.equal(propio.body.publicacion.texto, "Texto editado");
            assert.equal(propio.body.publicacion.grupo, "aespa");

            const vacio = await api("PUT", `/api/publicaciones/${publicacion.id}`, { token: autor.token, json: { texto: " " } });
            assert.equal(vacio.status, 400);
        });

        it("solo el autor puede eliminar, y se borra su imagen", async () => {
            const conImagen = await api("POST", "/api/publicaciones", {
                token: autor.token,
                form: { texto: "Con foto para borrar", imagen: imagenPng() }
            });
            const { id, imagen } = conImagen.body.publicacion;

            const ajeno = await api("DELETE", `/api/publicaciones/${id}`, { token: otro.token });
            assert.equal(ajeno.status, 403);

            const propio = await api("DELETE", `/api/publicaciones/${id}`, { token: autor.token });
            assert.equal(propio.status, 200);

            const despues = await api("GET", `/api/publicaciones/${id}`, { token: autor.token });
            assert.equal(despues.status, 404);

            const imagenBorrada = await api("GET", imagen);
            assert.equal(imagenBorrada.status, 404);
        });
    });
});
