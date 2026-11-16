const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { iniciarApi, crearCliente, registrarUsuario } = require("./helpers");
const Usuario = require("../models/Usuario");
const Moderacion = require("../models/Moderacion");
const Notificacion = require("../models/Notificacion");

// Una prueba por regla de la matriz de docs/PLAN-roles.md §2 (sobre todo las de "no puede").
describe("Roles, denuncias, moderación y reportes", () => {
    let entorno;
    let api;
    let admin;
    let admin2;
    let moderador;
    let autora;
    let lectora;
    let publicacion;
    let comentario;

    async function publicar(usuario, texto = "Vendo photocards") {
        const res = await api("POST", "/api/publicaciones", { token: usuario.token, form: { texto, grupo: "TWICE" } });
        assert.equal(res.status, 201, JSON.stringify(res.body));
        return res.body.publicacion;
    }

    async function denunciar(usuario, tipo, objetivo, motivo = "spam", detalle = "") {
        return api("POST", "/api/denuncias", { token: usuario.token, json: { tipo, objetivo, motivo, detalle } });
    }

    before(async () => {
        entorno = await iniciarApi("moderacion");
        api = crearCliente(entorno.url);
        admin = await registrarUsuario(api, { name: "Admin" });
        admin2 = await registrarUsuario(api, { name: "Admin Dos" });
        moderador = await registrarUsuario(api, { name: "Mod" });
        autora = await registrarUsuario(api, { name: "Autora" });
        lectora = await registrarUsuario(api, { name: "Lectora" });

        await Usuario.updateOne({ _id: admin.usuario.id }, { rol: "administrador" });
        await Usuario.updateOne({ _id: admin2.usuario.id }, { rol: "administrador" });
        await Usuario.updateOne({ _id: moderador.usuario.id }, { rol: "moderador" });

        publicacion = await publicar(autora);
        const res = await api("POST", `/api/publicaciones/${publicacion.id}/comentarios`, {
            token: autora.token,
            json: { texto: "Comentario feo" }
        });
        comentario = res.body.comentario;
    });

    after(async () => {
        await entorno.detener();
    });

    describe("denuncias", () => {
        it("cualquier usuario denuncia, pero no dos veces lo mismo ni a sí mismo", async () => {
            const res = await denunciar(lectora, "publicacion", publicacion.id, "falsificacion");
            assert.equal(res.status, 201, JSON.stringify(res.body));

            assert.equal((await denunciar(lectora, "publicacion", publicacion.id)).status, 409);
            assert.equal((await denunciar(autora, "publicacion", publicacion.id)).status, 400);
            assert.equal((await denunciar(lectora, "usuario", lectora.usuario.id)).status, 400);
        });

        it("valida tipo, motivo y que exista lo denunciado", async () => {
            assert.equal((await denunciar(lectora, "orden", publicacion.id)).status, 400);
            assert.equal((await api("POST", "/api/denuncias", {
                token: lectora.token, json: { tipo: "comentario", objetivo: comentario.id, motivo: "porque si" }
            })).status, 400);
            assert.equal((await denunciar(lectora, "comentario", comentario.id, "otro")).status, 400, "motivo 'otro' pide detalle");
            assert.equal((await denunciar(lectora, "publicacion", "64b000000000000000000000")).status, 404);
        });

        it("un usuario ve sus denuncias pero no la cola de moderación", async () => {
            const mias = await api("GET", "/api/denuncias/mias", { token: lectora.token });
            assert.equal(mias.body.denuncias.length, 1);
            assert.equal((await api("GET", "/api/denuncias", { token: lectora.token })).status, 403);
            assert.equal((await api("GET", "/api/moderacion/bitacora", { token: lectora.token })).status, 403);
        });

        it("un moderador ve la cola con el total de denuncias por contenido", async () => {
            await denunciar(admin2, "publicacion", publicacion.id, "spam");
            const cola = await api("GET", "/api/denuncias", { token: moderador.token });
            assert.equal(cola.status, 200);
            assert.equal(cola.body.pendientes, 2);
            assert.equal(cola.body.denuncias[0].totalDenuncias, 2);
            assert.equal(cola.body.denuncias[0].usuarioDenunciado.username, autora.usuario.username);
        });

        it("resolver con 'ocultar' oculta la publicación y cierra todas las denuncias sobre ella", async () => {
            const cola = await api("GET", "/api/denuncias", { token: moderador.token });
            const id = cola.body.denuncias[0]._id;

            const tomar = await api("PATCH", `/api/denuncias/${id}`, { token: moderador.token, json: { estado: "en_revision" } });
            assert.equal(tomar.status, 200);

            const res = await api("PATCH", `/api/denuncias/${id}`, {
                token: moderador.token,
                json: { estado: "resuelta", accion: "ocultar", nota: "Merch falsa" }
            });
            assert.equal(res.status, 200, JSON.stringify(res.body));
            assert.equal(res.body.cerradas, 2);

            const otraVez = await api("PATCH", `/api/denuncias/${id}`, { token: moderador.token, json: { estado: "descartada", nota: "x" } });
            assert.equal(otraVez.status, 400, "ya estaba atendida");

            const avisos = await Notificacion.find({ tipo: "moderacion" });
            assert.ok(avisos.some((n) => String(n.destinatario) === autora.usuario.id), "la autora recibe aviso");
            assert.ok(avisos.some((n) => String(n.destinatario) === lectora.usuario.id), "quien denunció recibe aviso");
        });

        it("descartar exige una nota", async () => {
            await denunciar(lectora, "comentario", comentario.id, "acoso");
            const cola = await api("GET", "/api/denuncias?tipo=comentario", { token: moderador.token });
            const id = cola.body.denuncias[0]._id;
            assert.equal((await api("PATCH", `/api/denuncias/${id}`, { token: moderador.token, json: { estado: "descartada" } })).status, 400);
            assert.equal((await api("PATCH", `/api/denuncias/${id}`, { token: moderador.token, json: { estado: "descartada", nota: "Es una broma entre amigas" } })).status, 200);
        });
    });

    describe("contenido oculto", () => {
        it("desaparece del feed y del detalle para los demás", async () => {
            const feed = await api("GET", "/api/publicaciones", { token: lectora.token });
            assert.ok(!feed.body.publicaciones.some((p) => p.id === publicacion.id));
            assert.equal((await api("GET", `/api/publicaciones/${publicacion.id}`, { token: lectora.token })).status, 404);

            const perfil = await api("GET", `/api/usuarios/${autora.usuario.username}/publicaciones`, { token: lectora.token });
            assert.equal(perfil.body.publicaciones.length, 0);
        });

        it("la autora la sigue viendo con aviso y la moderación también", async () => {
            const propia = await api("GET", `/api/publicaciones/${publicacion.id}`, { token: autora.token });
            assert.equal(propia.status, 200);
            assert.equal(propia.body.publicacion.oculta, true);
            assert.equal(propia.body.publicacion.motivoOculto, "Merch falsa");

            assert.equal((await api("GET", `/api/publicaciones/${publicacion.id}`, { token: moderador.token })).status, 200);
        });

        it("un moderador la vuelve a mostrar y queda en la bitácora", async () => {
            const res = await api("PATCH", `/api/moderacion/contenido/publicacion/${publicacion.id}`, {
                token: moderador.token, json: { oculto: false }
            });
            assert.equal(res.status, 200, JSON.stringify(res.body));
            assert.equal((await api("GET", `/api/publicaciones/${publicacion.id}`, { token: lectora.token })).status, 200);

            const bitacora = await api("GET", "/api/moderacion/bitacora", { token: moderador.token });
            assert.deepEqual(
                bitacora.body.registros.map((r) => r.accion).sort(),
                ["descartar_denuncia", "mostrar", "ocultar", "resolver_denuncia"]
            );
        });

        it("ocultar un comentario lo quita de la lista para los demás", async () => {
            const res = await api("PATCH", `/api/moderacion/contenido/comentario/${comentario.id}`, {
                token: moderador.token, json: { oculto: true, motivo: "Acoso" }
            });
            assert.equal(res.status, 200, JSON.stringify(res.body));

            const ajenos = await api("GET", `/api/publicaciones/${publicacion.id}/comentarios`, { token: lectora.token });
            assert.equal(ajenos.body.comentarios.length, 0);
            const propios = await api("GET", `/api/publicaciones/${publicacion.id}/comentarios`, { token: autora.token });
            assert.equal(propios.body.comentarios[0].oculto, true);
        });

        it("ocultar pide motivo y un usuario normal no puede", async () => {
            const otra = await publicar(autora, "Otra publicación");
            assert.equal((await api("PATCH", `/api/moderacion/contenido/publicacion/${otra.id}`, {
                token: moderador.token, json: { oculto: true }
            })).status, 400);
            assert.equal((await api("PATCH", `/api/moderacion/contenido/publicacion/${otra.id}`, {
                token: lectora.token, json: { oculto: true, motivo: "No me gusta" }
            })).status, 403);
        });
    });

    describe("jerarquía", () => {
        it("un moderador no actúa sobre un administrador ni sobre sí mismo", async () => {
            const delAdmin = await publicar(admin, "Aviso oficial");
            assert.equal((await api("PATCH", `/api/moderacion/contenido/publicacion/${delAdmin.id}`, {
                token: moderador.token, json: { oculto: true, motivo: "x" }
            })).status, 403);
            assert.equal((await api("POST", `/api/moderacion/usuarios/${admin.usuario.id}/suspension`, {
                token: moderador.token, json: { dias: 3, motivo: "x" }
            })).status, 403);
            assert.equal((await api("POST", `/api/moderacion/usuarios/${moderador.usuario.id}/suspension`, {
                token: moderador.token, json: { dias: 3, motivo: "x" }
            })).status, 400);
        });

        it("conflicto de interés: nadie atiende denuncias sobre sí mismo; las de moderadores las atiende un admin", async () => {
            const delMod = await publicar(moderador, "Publicación del moderador");
            assert.equal((await denunciar(autora, "publicacion", delMod.id, "spam")).status, 201);
            const cola = await api("GET", "/api/denuncias?tipo=publicacion", { token: admin.token });
            const id = cola.body.denuncias.find((d) => d.objetivo === delMod.id)._id;

            assert.equal((await api("PATCH", `/api/denuncias/${id}`, {
                token: moderador.token, json: { estado: "descartada", nota: "No es spam" }
            })).status, 400);

            const otroMod = await registrarUsuario(api, { name: "Otro Mod" });
            await Usuario.updateOne({ _id: otroMod.usuario.id }, { rol: "moderador" });
            assert.equal((await api("PATCH", `/api/denuncias/${id}`, {
                token: otroMod.token, json: { estado: "descartada", nota: "No es spam" }
            })).status, 403);

            assert.equal((await api("PATCH", `/api/denuncias/${id}`, {
                token: admin.token, json: { estado: "descartada", nota: "No es spam" }
            })).status, 200);
        });

        it("un moderador no puede banear ni cambiar roles", async () => {
            assert.equal((await api("PATCH", `/api/admin/usuarios/${autora.usuario.id}/estado`, {
                token: moderador.token, json: { activo: false, motivo: "x" }
            })).status, 403);
            assert.equal((await api("PATCH", `/api/admin/usuarios/${autora.usuario.id}/rol`, {
                token: moderador.token, json: { rol: "moderador" }
            })).status, 403);
        });
    });

    describe("suspensiones y baneos", () => {
        it("valida los días (1 a 30) y el motivo", async () => {
            const ruta = `/api/moderacion/usuarios/${autora.usuario.id}/suspension`;
            assert.equal((await api("POST", ruta, { token: moderador.token, json: { dias: 0, motivo: "Spam" } })).status, 400);
            assert.equal((await api("POST", ruta, { token: moderador.token, json: { dias: 31, motivo: "Spam" } })).status, 400);
            assert.equal((await api("POST", ruta, { token: moderador.token, json: { dias: 3 } })).status, 400);
        });

        it("una cuenta suspendida no puede usar la API ni iniciar sesión", async () => {
            const res = await api("POST", `/api/moderacion/usuarios/${autora.usuario.id}/suspension`, {
                token: moderador.token, json: { dias: 3, motivo: "Spam repetido" }
            });
            assert.equal(res.status, 200, JSON.stringify(res.body));

            const bloqueada = await api("GET", "/api/publicaciones", { token: autora.token });
            assert.equal(bloqueada.status, 403);
            assert.equal(bloqueada.body.bloqueo, "suspension");
            assert.equal(bloqueada.body.motivo, "Spam repetido");

            const login = await api("POST", "/api/auth/login", {
                json: { email: autora.usuario.email, password: "contrasena123" }
            });
            assert.equal(login.status, 403);
        });

        it("al levantar la suspensión vuelve a entrar", async () => {
            const res = await api("DELETE", `/api/moderacion/usuarios/${autora.usuario.id}/suspension`, { token: moderador.token });
            assert.equal(res.status, 200);
            assert.equal((await api("GET", "/api/publicaciones", { token: autora.token })).status, 200);
        });

        it("un administrador banea; la cuenta desaparece y no entra", async () => {
            const res = await api("PATCH", `/api/admin/usuarios/${lectora.usuario.id}/estado`, {
                token: admin.token, json: { activo: false, motivo: "Estafas" }
            });
            assert.equal(res.status, 200, JSON.stringify(res.body));

            const bloqueada = await api("GET", "/api/publicaciones", { token: lectora.token });
            assert.equal(bloqueada.body.bloqueo, "baneo");
            assert.equal((await api("GET", `/api/usuarios/${lectora.usuario.username}`, { token: autora.token })).status, 404);

            const paraMod = await api("GET", `/api/usuarios/${lectora.usuario.username}`, { token: moderador.token });
            assert.equal(paraMod.body.usuario.moderacion.activo, false);

            assert.equal((await api("PATCH", `/api/admin/usuarios/${lectora.usuario.id}/estado`, {
                token: admin.token, json: { activo: true }
            })).status, 200);
            assert.equal((await api("GET", "/api/publicaciones", { token: lectora.token })).status, 200);
        });

        it("no se puede dejar a la plataforma sin administradores", async () => {
            const degradar = await api("PATCH", `/api/admin/usuarios/${admin2.usuario.id}/rol`, {
                token: admin.token, json: { rol: "usuario" }
            });
            assert.equal(degradar.status, 200, JSON.stringify(degradar.body));

            // admin es ahora el único: admin2 ya no puede hacerle nada, y nadie puede degradarlo.
            assert.equal((await api("PATCH", `/api/admin/usuarios/${admin.usuario.id}/rol`, {
                token: admin.token, json: { rol: "usuario" }
            })).status, 400);

            await Usuario.updateOne({ _id: admin2.usuario.id }, { rol: "administrador" });
            await Usuario.updateOne({ _id: admin.usuario.id }, { activo: false });
            assert.equal((await api("PATCH", `/api/admin/usuarios/${admin.usuario.id}/rol`, {
                token: admin2.token, json: { rol: "usuario" }
            })).status, 200, "un admin inactivo sí se puede degradar");
            await Usuario.updateOne({ _id: admin.usuario.id }, { activo: true, rol: "administrador" });

            const cambios = await Moderacion.countDocuments({ accion: "cambiar_rol" });
            assert.equal(cambios, 2);
        });
    });

    describe("reportes según el rol", () => {
        it("cada rol ve su catálogo: 3 de usuario, 6 de moderador, 12 de administrador", async () => {
            const deUsuario = await api("GET", "/api/reportes", { token: autora.token });
            const deMod = await api("GET", "/api/reportes", { token: moderador.token });
            const deAdmin = await api("GET", "/api/reportes", { token: admin.token });
            assert.equal(deUsuario.body.reportes.length, 3);
            assert.equal(deMod.body.reportes.length, 6);
            assert.equal(deAdmin.body.reportes.length, 12);
        });

        it("un usuario no abre reportes de moderación ni de administración", async () => {
            assert.equal((await api("GET", "/api/reportes/denuncias-por-motivo", { token: autora.token })).status, 403);
            assert.equal((await api("GET", "/api/reportes/ventas-por-grupo", { token: moderador.token })).status, 403);
            assert.equal((await api("GET", "/api/reportes/no-existe", { token: admin.token })).status, 404);
        });

        it("todos los reportes del administrador responden con columnas y filas", async () => {
            const { body } = await api("GET", "/api/reportes", { token: admin.token });
            for (const reporte of body.reportes) {
                const res = await api("GET", `/api/reportes/${reporte.id}`, { token: admin.token });
                assert.equal(res.status, 200, `${reporte.id}: ${JSON.stringify(res.body)}`);
                assert.ok(Array.isArray(res.body.columnas) && res.body.columnas.length > 0, reporte.id);
                assert.ok(Array.isArray(res.body.filas), reporte.id);
            }
        });

        it("los reportes tienen datos reales", async () => {
            const motivos = await api("GET", "/api/reportes/denuncias-por-motivo", { token: moderador.token });
            const total = motivos.body.filas.reduce((s, f) => s + f.total, 0);
            assert.equal(total, 4);

            const actividad = await api("GET", "/api/reportes/actividad-mensual?meses=3", { token: admin.token });
            assert.equal(actividad.body.filas.length, 3);
            assert.equal(actividad.body.filas.at(-1).usuarios, 6);

            const mia = await api("GET", "/api/reportes/mi-actividad", { token: autora.token });
            assert.equal(mia.body.filas.at(-1).publicaciones, 2);
        });

        it("valida las fechas", async () => {
            assert.equal((await api("GET", "/api/reportes/ventas-por-grupo?desde=ayer", { token: admin.token })).status, 400);
            assert.equal((await api("GET", "/api/reportes/ventas-por-grupo?desde=2026-12-01&hasta=2026-01-01", { token: admin.token })).status, 400);
        });
    });
});
