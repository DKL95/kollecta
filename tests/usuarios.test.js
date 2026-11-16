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

            // La búsqueda no incluye a quien busca, así que Mina busca a Derek.
            const porNombre = await api("GET", "/api/usuarios?q=luna", { token: mina.token });
            assert.deepEqual(porNombre.body.usuarios.map((u) => u.username), ["derek.once"]);

            const aSiMismo = await api("GET", "/api/usuarios?q=derek", { token: derek.token });
            assert.deepEqual(aSiMismo.body.usuarios, [], "no se encuentra a sí mismo");

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

            const nueva = await api("GET", fotoNueva, { token: derek.token });
            assert.equal(nueva.status, 200);
            assert.deepEqual(nueva.body, PNG_1X1, "la imagen se guarda sin cambios");

            const anterior = await api("GET", fotoAnterior, { token: derek.token });
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
        const res = await api("GET", "/api/imagenes/abc", { token: derek.token });
        assert.equal(res.status, 404);
    });

    describe("imágenes protegidas", () => {
        let rutaFoto;
        let cookie;

        before(async () => {
            const sufijo = Math.random().toString(36).slice(2, 8);
            const form = new FormData();
            for (const [k, v] of Object.entries({ name: "Con Foto", username: `foto_${sufijo}`, email: `foto_${sufijo}@test.com`, password: "contrasena123" })) form.append(k, v);
            form.append("fotoPerfil", imagenPng(), "foto.png");
            const respuesta = await fetch(`${entorno.url}/api/auth/register`, { method: "POST", body: form });
            rutaFoto = (await respuesta.json()).usuario.fotoPerfil;
            cookie = respuesta.headers.get("set-cookie").split(";")[0];
        });

        it("sin token ni cookie responde 401", async () => {
            assert.match(rutaFoto, /^\/api\/imagenes\//);
            const res = await api("GET", rutaFoto);
            assert.equal(res.status, 401);
        });

        it("abre con el token de sesión o con la cookie que deja el registro/login", async () => {
            const conToken = await api("GET", rutaFoto, { token: mina.token });
            assert.equal(conToken.status, 200);
            assert.deepEqual(conToken.body, PNG_1X1);

            assert.match(cookie, /^kollecta_medios=/);
            const conCookie = await fetch(entorno.url + rutaFoto, { headers: { cookie } });
            assert.equal(conCookie.status, 200);
            assert.match(conCookie.headers.get("cache-control"), /private/);
        });

        it("la cookie de imágenes no sirve como sesión para la API", async () => {
            const token = decodeURIComponent(cookie.split("=")[1]);
            const res = await api("GET", "/api/auth/me", { token });
            assert.equal(res.status, 401);
        });

        it("logout borra la cookie", async () => {
            const res = await fetch(`${entorno.url}/api/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${mina.token}` } });
            assert.equal(res.status, 200);
            assert.match(res.headers.get("set-cookie"), /kollecta_medios=;.*Expires=Thu, 01 Jan 1970/);
        });
    });
});
