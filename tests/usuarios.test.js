const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { iniciarApi, crearCliente, registrarUsuario, imagenPng, PNG_1X1 } = require("./helpers");

describe("Usuarios (/api/usuarios)", () => {
    let entorno;
    let api;
    let derek;
    let mina;

    before(async () => {
        entorno = await iniciarApi("usuarios");
        api = crearCliente(entorno.url);
        derek = await registrarUsuario(api, { name: "Derek Luna", username: "derek.once", email: "derek@test.com", bias: "TWICE" });
        mina = await registrarUsuario(api, { name: "Mina Cardona", username: "mina.cards", email: "mina@test.com" });
    });

    after(async () => {
        await entorno.detener();
    });

    it("requiere sesión", async () => {
        const res = await api("GET", "/api/usuarios/derek.once");
        assert.equal(res.status, 401);
    });

    describe("GET /:username", () => {
        it("regresa el perfil público sin correo ni contraseña", async () => {
            await api("POST", "/api/publicaciones", { token: derek.token, json: { texto: "Hola" } });

            const res = await api("GET", "/api/usuarios/derek.once", { token: mina.token });
            assert.equal(res.status, 200);
            assert.equal(res.body.usuario.nombre, "Derek Luna");
            assert.equal(res.body.usuario.email, undefined);
            assert.equal(res.body.usuario.password, undefined);
            assert.equal(res.body.usuario.totalPublicaciones, 1);
            assert.equal(res.body.usuario.totalAmigos, 0);
        });

        it("responde 404 si no existe", async () => {
            const res = await api("GET", "/api/usuarios/no.existe", { token: mina.token });
            assert.equal(res.status, 404);
        });
    });

    describe("GET /:username/publicaciones", () => {
        it("regresa solo las publicaciones de ese usuario", async () => {
            await api("POST", "/api/publicaciones", { token: mina.token, json: { texto: "De Mina" } });

            const res = await api("GET", "/api/usuarios/mina.cards/publicaciones", { token: derek.token });
            assert.equal(res.status, 200);
            assert.deepEqual(res.body.publicaciones.map((p) => p.texto), ["De Mina"]);
        });

        it("responde 404 si el usuario no existe", async () => {
            const res = await api("GET", "/api/usuarios/no.existe/publicaciones", { token: derek.token });
            assert.equal(res.status, 404);
        });
    });

    describe("GET /?q=", () => {
        it("busca por usuario o nombre sin importar mayúsculas", async () => {
            const porUsuario = await api("GET", "/api/usuarios?q=MINA", { token: derek.token });
            assert.deepEqual(porUsuario.body.usuarios.map((u) => u.username), ["mina.cards"]);

            const porNombre = await api("GET", "/api/usuarios?q=luna", { token: derek.token });
            assert.deepEqual(porNombre.body.usuarios.map((u) => u.username), ["derek.once"]);

            assert.ok(porNombre.body.usuarios.every((u) => u.email === undefined), "no expone correos");
        });

        it("no rompe con caracteres especiales de regex", async () => {
            const res = await api("GET", `/api/usuarios?q=${encodeURIComponent(".*(")}`, { token: derek.token });
            assert.equal(res.status, 200);
            assert.deepEqual(res.body.usuarios, []);
        });
    });

    describe("PUT /me", () => {
        it("edita nombre y descripción con formulario", async () => {
            const res = await api("PUT", "/api/usuarios/me", {
                token: derek.token,
                form: { nombre: "  Derek Editado ", descripcion: "ONCE de Monterrey" }
            });

            assert.equal(res.status, 200);
            assert.equal(res.body.usuario.nombre, "Derek Editado");
            assert.equal(res.body.usuario.descripcion, "ONCE de Monterrey");
            assert.deepEqual(res.body.usuario.gruposFavoritos, ["TWICE"], "no toca lo que no se mandó");
        });

        it("cambia la foto de perfil y borra la anterior", async () => {
            const primera = await api("PUT", "/api/usuarios/me", { token: derek.token, form: { fotoPerfil: imagenPng() } });
            const fotoAnterior = primera.body.usuario.fotoPerfil;
            assert.match(fotoAnterior, /^\/api\/imagenes\//);

            const segunda = await api("PUT", "/api/usuarios/me", { token: derek.token, form: { fotoPerfil: imagenPng() } });
            const fotoNueva = segunda.body.usuario.fotoPerfil;
            assert.notEqual(fotoNueva, fotoAnterior);

            const nueva = await api("GET", fotoNueva);
            assert.equal(nueva.status, 200);
            assert.deepEqual(nueva.body, PNG_1X1, "la imagen se guarda sin cambios");

            const anterior = await api("GET", fotoAnterior);
            assert.equal(anterior.status, 404);
        });

        it("actualiza los grupos que sigue (JSON)", async () => {
            const res = await api("PUT", "/api/usuarios/me", { token: derek.token, json: { gruposFavoritos: ["TWICE", "aespa"] } });
            assert.equal(res.status, 200);
            assert.deepEqual(res.body.usuario.gruposFavoritos, ["TWICE", "aespa"]);

            const yo = await api("GET", "/api/auth/me", { token: derek.token });
            assert.deepEqual(yo.body.usuario.gruposFavoritos, ["TWICE", "aespa"]);
        });

        it("no falla si la petición llega sin cuerpo", async () => {
            const res = await api("PUT", "/api/usuarios/me", { token: derek.token });
            assert.equal(res.status, 200);
        });

        it("solo modifica al usuario de la sesión", async () => {
            await api("PUT", "/api/usuarios/me", { token: mina.token, form: { nombre: "Mina Nueva" } });
            const derekPerfil = await api("GET", "/api/usuarios/derek.once", { token: mina.token });
            assert.equal(derekPerfil.body.usuario.nombre, "Derek Editado");
        });
    });

    it("las rutas de la API que no existen responden 404 en JSON", async () => {
        const res = await api("GET", "/api/no-existe", { token: derek.token });
        assert.equal(res.status, 404);
        assert.equal(res.body.mensaje, "Ruta no encontrada");
    });

    it("una imagen con id inválido responde 404", async () => {
        const res = await api("GET", "/api/imagenes/abc");
        assert.equal(res.status, 404);
    });
});
