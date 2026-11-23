const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { iniciarApi, crearCliente, registrarUsuario, imagenPng } = require("./helpers");
const Usuario = require("../models/Usuario");
const Moderacion = require("../models/Moderacion");
const Notificacion = require("../models/Notificacion");
const { MAX_PENDIENTES } = require("../controllers/grupoController");

// Solicitudes de grupos nuevos: el usuario pide, la moderación aprueba o rechaza.
describe("Grupos: catálogo y solicitudes", () => {
    let entorno;
    let api;
    let admin;
    let moderador;
    let fan;
    let otraFan;

    const solicitar = (usuario, form) => api("POST", "/api/grupos", { token: usuario.token, form });
    const revisar = (usuario, id, json) => api("PATCH", `/api/grupos/solicitudes/${id}`, { token: usuario.token, json });
    const nombresCatalogo = async () => (await api("GET", "/api/grupos")).body.grupos.map((g) => g.nombre);

    before(async () => {
        entorno = await iniciarApi("grupos");
        api = crearCliente(entorno.url);
        admin = await registrarUsuario(api, { name: "Admin" });
        moderador = await registrarUsuario(api, { name: "Mod" });
        fan = await registrarUsuario(api, { name: "Fan" });
        otraFan = await registrarUsuario(api, { name: "Otra Fan" });
        await Usuario.updateOne({ _id: admin.usuario.id }, { rol: "administrador" });
        await Usuario.updateOne({ _id: moderador.usuario.id }, { rol: "moderador" });
    });

    after(async () => {
        await entorno.detener();
    });

    it("el catálogo es público y trae los grupos fijos", async () => {
        const res = await api("GET", "/api/grupos");
        assert.equal(res.status, 200);
        const bts = res.body.grupos.find((g) => g.nombre === "BTS");
        assert.ok(bts.base);
        assert.ok(bts.imagen.startsWith("/assets/img/groups/"));
        assert.ok(bts.portada.startsWith("/assets/img/covers/"));
    });

    it("pedir un grupo exige sesión y nombre", async () => {
        assert.equal((await api("POST", "/api/grupos", { form: { nombre: "KISS OF LIFE" } })).status, 401);
        assert.equal((await solicitar(fan, { nombre: "   " })).status, 400);
        assert.equal((await solicitar(fan, { nombre: "X", debut: "1800" })).status, 400);
        assert.equal((await solicitar(fan, { nombre: "X", integrantes: "dos" })).status, 400);
    });

    it("la solicitud de un usuario queda pendiente y no sale en el catálogo", async () => {
        const res = await solicitar(fan, {
            nombre: "  KISS   OF LIFE ",
            fandom: "KISSY",
            agencia: "S2 Entertainment",
            integrantes: "4",
            debut: "2023",
            imagenes: imagenPng()
        });
        assert.equal(res.status, 201, JSON.stringify(res.body));
        assert.equal(res.body.grupo.estado, "pendiente");
        assert.equal(res.body.grupo.nombre, "KISS OF LIFE");
        assert.equal(res.body.grupo.iniciales, "KOL");
        assert.equal(res.body.grupo.integrantes, 4);
        assert.match(res.body.grupo.imagen, /^\/api\/imagenes\//);
        assert.ok(!(await nombresCatalogo()).includes("KISS OF LIFE"));

        const mias = await api("GET", "/api/grupos/solicitudes/mias", { token: fan.token });
        assert.deepEqual(mias.body.solicitudes.map((s) => s.estado), ["pendiente"]);
    });

    it("no se repite un grupo del catálogo ni una solicitud pendiente (sin importar mayúsculas)", async () => {
        const fijo = await solicitar(otraFan, { nombre: "twice" });
        assert.equal(fijo.status, 409);
        assert.match(fijo.body.mensaje, /ya está en el catálogo/);

        const repetida = await solicitar(otraFan, { nombre: "kiss of life" });
        assert.equal(repetida.status, 409);
        assert.match(repetida.body.mensaje, /pendiente/);
    });

    it("solo la moderación ve la cola y revisa", async () => {
        assert.equal((await api("GET", "/api/grupos/solicitudes", { token: fan.token })).status, 403);

        const cola = await api("GET", "/api/grupos/solicitudes", { token: moderador.token });
        assert.equal(cola.status, 200);
        assert.equal(cola.body.solicitudes.length, 1);
        assert.equal(cola.body.solicitudes[0].solicitante.username, fan.usuario.username);

        const id = cola.body.solicitudes[0]._id;
        assert.equal((await revisar(fan, id, { decision: "aprobar" })).status, 403);

        const resumen = await api("GET", "/api/moderacion/resumen", { token: moderador.token });
        assert.equal(resumen.body.grupos, 1);
    });

    it("al aprobar, entra al catálogo, se avisa a quien la pidió y queda en la bitácora", async () => {
        const [solicitud] = (await api("GET", "/api/grupos/solicitudes/mias", { token: fan.token })).body.solicitudes;
        const res = await revisar(moderador, solicitud._id, { decision: "aprobar" });
        assert.equal(res.status, 200, JSON.stringify(res.body));
        assert.equal(res.body.grupo.estado, "aprobado");

        assert.ok((await nombresCatalogo()).includes("KISS OF LIFE"));
        assert.equal((await revisar(moderador, solicitud._id, { decision: "rechazar", motivo: "x" })).status, 409);

        const aviso = await Notificacion.findOne({ destinatario: fan.usuario.id, tipo: "moderacion" });
        assert.match(aviso.mensaje, /aprobada/);
        assert.equal(aviso.enlace, "/grupos/KISS%20OF%20LIFE");
        assert.ok(await Moderacion.exists({ accion: "aprobar_grupo", objetivo: solicitud._id, moderador: moderador.usuario.id }));

        const otraVez = await solicitar(otraFan, { nombre: "Kiss of Life" });
        assert.equal(otraVez.status, 409);
    });

    it("rechazar pide motivo; después el nombre se puede volver a pedir", async () => {
        const pedida = await solicitar(otraFan, { nombre: "Grupo Inventado" });
        const id = pedida.body.grupo._id;

        assert.equal((await revisar(admin, id, { decision: "rechazar" })).status, 400);
        assert.equal((await revisar(admin, id, { decision: "quizas" })).status, 400);

        const res = await revisar(admin, id, { decision: "rechazar", motivo: "No encontramos información del grupo" });
        assert.equal(res.status, 200);
        assert.equal(res.body.grupo.motivoRechazo, "No encontramos información del grupo");
        assert.ok(!(await nombresCatalogo()).includes("Grupo Inventado"));

        const aviso = await Notificacion.findOne({ destinatario: otraFan.usuario.id, tipo: "moderacion" });
        assert.match(aviso.mensaje, /rechazada.*No encontramos/);

        assert.equal((await solicitar(otraFan, { nombre: "grupo inventado" })).status, 201);
    });

    it("quien la pidió puede cancelarla mientras está pendiente, nadie más", async () => {
        const mias = (await api("GET", "/api/grupos/solicitudes/mias", { token: otraFan.token })).body.solicitudes;
        const pendiente = mias.find((s) => s.estado === "pendiente");
        const rechazada = mias.find((s) => s.estado === "rechazado");

        assert.equal((await api("DELETE", `/api/grupos/solicitudes/${pendiente._id}`, { token: fan.token })).status, 404);
        assert.equal((await api("DELETE", `/api/grupos/solicitudes/${rechazada._id}`, { token: otraFan.token })).status, 409);
        assert.equal((await api("DELETE", `/api/grupos/solicitudes/${pendiente._id}`, { token: otraFan.token })).status, 200);
    });

    it(`un usuario tiene a lo más ${MAX_PENDIENTES} solicitudes pendientes`, async () => {
        for (let i = 1; i <= MAX_PENDIENTES; i++) {
            assert.equal((await solicitar(fan, { nombre: `Pendiente ${i}` })).status, 201);
        }
        assert.equal((await solicitar(fan, { nombre: "Una más" })).status, 429);
    });

    it("moderadores y administradores lo crean aprobado directo, sin límite", async () => {
        const res = await solicitar(moderador, { nombre: "QWER", fandom: "Bawi" });
        assert.equal(res.status, 201, JSON.stringify(res.body));
        assert.equal(res.body.grupo.estado, "aprobado");
        assert.ok((await nombresCatalogo()).includes("QWER"));
        assert.ok(await Moderacion.exists({ accion: "crear_grupo", objetivo: res.body.grupo._id }));

        const delAdmin = await solicitar(admin, { nombre: "MEOVV" });
        assert.equal(delAdmin.body.grupo.estado, "aprobado");
    });
});
