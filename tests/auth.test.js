const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const { iniciarApi, crearCliente, registrarUsuario, imagenPng } = require("./helpers");

describe("Autenticación (/api/auth)", () => {
    let entorno;
    let api;

    before(async () => {
        entorno = await iniciarApi("auth");
        api = crearCliente(entorno.url);
    });

    after(async () => {
        await entorno.detener();
    });

    describe("POST /register", () => {
        it("registra un usuario y regresa token sin exponer la contraseña", async () => {
            const res = await api("POST", "/api/auth/register", {
                form: { name: "Derek", username: "derek.once", email: "Derek@Test.com", password: "contrasena123", bias: "TWICE" }
            });

            assert.equal(res.status, 201);
            assert.ok(res.body.token);
            assert.equal(res.body.usuario.username, "derek.once");
            assert.equal(res.body.usuario.email, "derek@test.com", "el correo se guarda en minúsculas");
            assert.deepEqual(res.body.usuario.gruposFavoritos, ["TWICE"]);
            assert.equal(res.body.usuario.password, undefined);
        });

        it("guarda la contraseña cifrada con bcrypt", async () => {
            const guardado = await mongoose.connection.collection("usuarios").findOne({ username: "derek.once" });
            assert.match(guardado.password, /^\$2[aby]\$/);
            assert.notEqual(guardado.password, "contrasena123");
        });

        it("guarda la foto de perfil en MongoDB", async () => {
            const { usuario, token } = await registrarUsuario(api, { fotoPerfil: imagenPng() });
            assert.match(usuario.fotoPerfil, /^\/api\/imagenes\/[a-f0-9]{24}$/);

            const imagen = await api("GET", usuario.fotoPerfil, { token });
            assert.equal(imagen.status, 200);
            assert.equal(imagen.headers.get("content-type"), "image/png");
        });

        it("quita la @ inicial del usuario", async () => {
            const { usuario } = await registrarUsuario(api, { username: "@con.arroba", email: "arroba@test.com" });
            assert.equal(usuario.username, "con.arroba");
        });

        it("rechaza usuario o correo repetido", async () => {
            const mismoUsuario = await api("POST", "/api/auth/register", {
                form: { username: "derek.once", email: "otro@test.com", password: "contrasena123" }
            });
            const mismoCorreo = await api("POST", "/api/auth/register", {
                form: { username: "otro.usuario", email: "DEREK@test.com", password: "contrasena123" }
            });

            assert.equal(mismoUsuario.status, 400);
            assert.equal(mismoCorreo.status, 400);
            assert.equal(mismoCorreo.body.mensaje, "El usuario o correo ya está registrado");
        });

        it("valida campos obligatorios, correo, usuario y contraseña", async () => {
            const casos = [
                [{ email: "a@test.com", password: "contrasena123" }, "Usuario, correo y contraseña son obligatorios"],
                [{ username: "valido", email: "no-es-correo", password: "contrasena123" }, "El correo no es válido"],
                [{ username: "ab", email: "a@test.com", password: "contrasena123" }, /3 a 30 caracteres/],
                [{ username: "con espacios", email: "a@test.com", password: "contrasena123" }, /3 a 30 caracteres/],
                [{ username: "valido", email: "a@test.com", password: "corta" }, "La contraseña debe tener al menos 8 caracteres"]
            ];

            for (const [form, mensajeEsperado] of casos) {
                const res = await api("POST", "/api/auth/register", { form });
                assert.equal(res.status, 400, JSON.stringify(form));
                if (mensajeEsperado instanceof RegExp) {
                    assert.match(res.body.mensaje, mensajeEsperado);
                } else {
                    assert.equal(res.body.mensaje, mensajeEsperado);
                }
            }
        });

        it("rechaza archivos que no son imagen", async () => {
            const res = await api("POST", "/api/auth/register", {
                form: {
                    username: "con.pdf",
                    email: "pdf@test.com",
                    password: "contrasena123",
                    fotoPerfil: new Blob(["%PDF-1.4"], { type: "application/pdf" })
                }
            });
            assert.equal(res.status, 400);
            assert.equal(res.body.mensaje, "Solo se permiten imágenes");
        });

        it("rechaza imágenes de más de 5 MB", async () => {
            const res = await api("POST", "/api/auth/register", {
                form: {
                    username: "foto.grande",
                    email: "grande@test.com",
                    password: "contrasena123",
                    fotoPerfil: new Blob([Buffer.alloc(5 * 1024 * 1024 + 1)], { type: "image/png" })
                }
            });
            assert.equal(res.status, 400);
            assert.equal(res.body.mensaje, "La imagen no puede pesar más de 5 MB");
        });
    });

    describe("POST /login", () => {
        it("inicia sesión sin importar mayúsculas en el correo", async () => {
            const res = await api("POST", "/api/auth/login", { json: { email: "DEREK@test.com", password: "contrasena123" } });
            assert.equal(res.status, 200);
            assert.ok(res.body.token);
            assert.equal(res.body.usuario.username, "derek.once");
        });

        it("rechaza contraseña incorrecta y correo inexistente con el mismo mensaje", async () => {
            const malaPassword = await api("POST", "/api/auth/login", { json: { email: "derek@test.com", password: "incorrecta" } });
            const noExiste = await api("POST", "/api/auth/login", { json: { email: "nadie@test.com", password: "contrasena123" } });

            assert.equal(malaPassword.status, 401);
            assert.equal(noExiste.status, 401);
            assert.equal(malaPassword.body.mensaje, noExiste.body.mensaje);
        });

        it("pide correo y contraseña", async () => {
            const res = await api("POST", "/api/auth/login", { json: { email: "derek@test.com" } });
            assert.equal(res.status, 400);
        });

        it("migra a bcrypt las cuentas viejas con contraseña en texto plano", async () => {
            await mongoose.connection.collection("usuarios").insertOne({
                username: "cuenta.vieja",
                email: "vieja@test.com",
                password: "textoplano1"
            });

            const res = await api("POST", "/api/auth/login", { json: { email: "vieja@test.com", password: "textoplano1" } });
            assert.equal(res.status, 200);

            const guardado = await mongoose.connection.collection("usuarios").findOne({ username: "cuenta.vieja" });
            assert.match(guardado.password, /^\$2[aby]\$/);

            const otraVez = await api("POST", "/api/auth/login", { json: { email: "vieja@test.com", password: "textoplano1" } });
            assert.equal(otraVez.status, 200, "después de migrar sigue entrando con la misma contraseña");
        });
    });

    describe("GET /me", () => {
        it("regresa el usuario del token", async () => {
            const { token, usuario } = await registrarUsuario(api);
            const res = await api("GET", "/api/auth/me", { token });
            assert.equal(res.status, 200);
            assert.equal(res.body.usuario.username, usuario.username);
        });

        it("rechaza peticiones sin token o con token inválido", async () => {
            const sinToken = await api("GET", "/api/auth/me");
            const tokenFalso = await api("GET", "/api/auth/me", { token: "no.es.token" });
            assert.equal(sinToken.status, 401);
            assert.equal(tokenFalso.status, 401);
        });

        it("responde 401 si el usuario del token ya no existe (para cerrar la sesión)", async () => {
            const { token, usuario } = await registrarUsuario(api);
            await mongoose.connection.collection("usuarios").deleteOne({ username: usuario.username });

            const res = await api("GET", "/api/auth/me", { token });
            assert.equal(res.status, 401);
        });
    });

    describe("Recuperar contraseña (POST /recuperar y /restablecer)", () => {
        // Sin BREVO_API_KEY el correo no sale: queda en correosSimulados.
        const { correosSimulados } = require("../services/correo");
        let usuario;

        before(async () => {
            delete process.env.BREVO_API_KEY;
            ({ usuario } = await registrarUsuario(api, { username: "olvidadiza", email: "olvidadiza@test.com", password: "vieja12345" }));
        });

        function tokenDelUltimoCorreo() {
            const correo = correosSimulados.at(-1);
            return correo.texto.match(/\/restablecer\?token=([a-f0-9]{64})/)[1];
        }

        it("responde lo mismo exista o no el correo, y solo manda correo si existe", async () => {
            const antes = correosSimulados.length;
            const existe = await api("POST", "/api/auth/recuperar", { json: { email: "OLVIDADIZA@test.com " } });
            const noExiste = await api("POST", "/api/auth/recuperar", { json: { email: "nadie@test.com" } });

            assert.equal(existe.status, 200);
            assert.equal(noExiste.status, 200);
            assert.equal(existe.body.mensaje, noExiste.body.mensaje);
            assert.equal(correosSimulados.length, antes + 1);
            assert.equal(correosSimulados.at(-1).para, "olvidadiza@test.com");
        });

        it("guarda solo el hash del token y no lo expone en /me", async () => {
            const guardado = await mongoose.connection.collection("usuarios").findOne({ username: "olvidadiza" });
            const token = tokenDelUltimoCorreo();
            assert.match(guardado.recuperacionHash, /^[a-f0-9]{64}$/);
            assert.notEqual(guardado.recuperacionHash, token);
            assert.ok(guardado.recuperacionExpira > new Date());

            const login = await api("POST", "/api/auth/login", { json: { email: "olvidadiza@test.com", password: "vieja12345" } });
            const me = await api("GET", "/api/auth/me", { token: login.body.token });
            assert.equal(me.body.usuario.recuperacionHash, undefined);
            assert.equal(usuario.recuperacionHash, undefined);
        });

        it("no manda otro correo si se pide de nuevo antes de 1 minuto", async () => {
            const antes = correosSimulados.length;
            const res = await api("POST", "/api/auth/recuperar", { json: { email: "olvidadiza@test.com" } });
            assert.equal(res.status, 200);
            assert.equal(correosSimulados.length, antes);
        });

        it("rechaza correo inválido, token falso y contraseña corta", async () => {
            const correoMalo = await api("POST", "/api/auth/recuperar", { json: { email: "no-es-correo" } });
            const tokenFalso = await api("POST", "/api/auth/restablecer", { json: { token: "a".repeat(64), password: "nueva12345" } });
            const corta = await api("POST", "/api/auth/restablecer", { json: { token: tokenDelUltimoCorreo(), password: "corta" } });
            assert.equal(correoMalo.status, 400);
            assert.equal(tokenFalso.status, 400);
            assert.equal(corta.status, 400);
        });

        it("cambia la contraseña con el enlace, que solo sirve una vez", async () => {
            const token = tokenDelUltimoCorreo();
            const res = await api("POST", "/api/auth/restablecer", { json: { token, password: "nueva12345" } });
            assert.equal(res.status, 200);

            const vieja = await api("POST", "/api/auth/login", { json: { email: "olvidadiza@test.com", password: "vieja12345" } });
            const nueva = await api("POST", "/api/auth/login", { json: { email: "olvidadiza@test.com", password: "nueva12345" } });
            assert.equal(vieja.status, 401);
            assert.equal(nueva.status, 200);

            const otraVez = await api("POST", "/api/auth/restablecer", { json: { token, password: "otra123456" } });
            assert.equal(otraVez.status, 400);
        });

        it("rechaza un enlace vencido", async () => {
            await mongoose.connection.collection("usuarios").updateOne(
                { username: "olvidadiza" }, { $unset: { recuperacionHash: "", recuperacionExpira: "" } }
            );
            await api("POST", "/api/auth/recuperar", { json: { email: "olvidadiza@test.com" } });
            await mongoose.connection.collection("usuarios").updateOne(
                { username: "olvidadiza" }, { $set: { recuperacionExpira: new Date(Date.now() - 1000) } }
            );

            const res = await api("POST", "/api/auth/restablecer", { json: { token: tokenDelUltimoCorreo(), password: "nueva98765" } });
            assert.equal(res.status, 400);
        });
    });
});
