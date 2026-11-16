const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { iniciarApi, crearCliente, registrarUsuario } = require("./helpers");
const Usuario = require("../models/Usuario");
const Moderacion = require("../models/Moderacion");
const Notificacion = require("../models/Notificacion");
const Mensaje = require("../models/Mensaje");

// Disputas de órdenes (docs/PLAN-roles.md, fase B): una parte la abre, la orden se
// congela y moderación la resuelve (cancelar, completar o dejar que siga).
describe("Disputas de órdenes (/api/ordenes/:id/disputa)", () => {
    let entorno;
    let api;
    let vendedora;
    let compradora;
    let moderador;
    let admin;
    let ajena;

    async function publicar(usuario, titulo) {
        const res = await api("POST", "/api/productos", {
            token: usuario.token,
            form: { titulo, grupo: "TWICE", categoria: "Photocard", disponibleCompra: "true", precio: "300" }
        });
        assert.equal(res.status, 201, JSON.stringify(res.body));
        return res.body.producto;
    }

    // Crea una orden de compra y la deja aceptada (producto apartado).
    async function ordenAceptada(titulo, comprador = compradora, vendedor = vendedora) {
        const producto = await publicar(vendedor, titulo);
        const pedido = await api("POST", "/api/ordenes", {
            token: comprador.token,
            json: { productoId: producto._id, tipo: "compra", entrega: "envio" }
        });
        assert.equal(pedido.status, 201, JSON.stringify(pedido.body));
        const orden = pedido.body.orden;
        const aceptar = await api("PATCH", `/api/ordenes/${orden._id}/estado`, { token: vendedor.token, json: { estado: "aceptada" } });
        assert.equal(aceptar.status, 200, JSON.stringify(aceptar.body));
        return { orden, producto };
    }

    function abrir(usuario, orden, motivo = "no_llego", detalle = "") {
        return api("POST", `/api/ordenes/${orden._id}/disputa`, { token: usuario.token, json: { motivo, detalle } });
    }

    function resolver(usuario, orden, accion, nota = "Revisamos el chat y las pruebas") {
        return api("PATCH", `/api/ordenes/${orden._id}/disputa`, { token: usuario.token, json: { accion, nota } });
    }

    before(async () => {
        entorno = await iniciarApi("disputas");
        api = crearCliente(entorno.url);
        vendedora = await registrarUsuario(api, { name: "Vendedora" });
        compradora = await registrarUsuario(api, { name: "Compradora" });
        moderador = await registrarUsuario(api, { name: "Mod" });
        admin = await registrarUsuario(api, { name: "Admin" });
        ajena = await registrarUsuario(api, { name: "Ajena" });
        await Usuario.updateOne({ _id: moderador.usuario.id }, { rol: "moderador" });
        await Usuario.updateOne({ _id: admin.usuario.id }, { rol: "administrador" });
    });

    after(async () => {
        await entorno.detener();
    });

    it("no se abre en una orden pendiente, sin motivo, ni por alguien ajeno", async () => {
        const producto = await publicar(vendedora, "PC Nayeon");
        const pedido = await api("POST", "/api/ordenes", { token: compradora.token, json: { productoId: producto._id, tipo: "compra" } });
        const orden = pedido.body.orden;

        assert.equal((await abrir(compradora, orden)).status, 409);
        await api("PATCH", `/api/ordenes/${orden._id}/estado`, { token: vendedora.token, json: { estado: "aceptada" } });
        assert.equal((await abrir(compradora, orden, "inventado")).status, 400);
        assert.equal((await abrir(ajena, orden)).status, 404);
    });

    it("al abrirla se congela la orden, se avisa a la otra parte y aparece en la cola", async () => {
        const { orden } = await ordenAceptada("PC Momo");

        const res = await abrir(compradora, orden, "no_llego", "Pasaron tres semanas");
        assert.equal(res.status, 201, JSON.stringify(res.body));
        assert.equal(res.body.orden.disputa.estado, "abierta");
        assert.equal(res.body.orden.disputa.estadoPrevio, "aceptada");

        assert.equal((await abrir(vendedora, orden)).status, 409, "solo una disputa abierta a la vez");
        const mover = await api("PATCH", `/api/ordenes/${orden._id}/estado`, { token: vendedora.token, json: { estado: "enviada" } });
        assert.equal(mover.status, 409);

        assert.ok(await Notificacion.exists({ destinatario: vendedora.usuario.id, mensaje: /abrió una disputa/ }));
        assert.ok(await Mensaje.exists({ conversacion: orden.conversacion, texto: /Abrí una disputa/ }));

        assert.equal((await api("GET", "/api/ordenes/disputas", { token: compradora.token })).status, 403);
        const cola = await api("GET", "/api/ordenes/disputas", { token: moderador.token });
        assert.equal(cola.status, 200);
        assert.ok(cola.body.disputas.some((d) => d._id === orden._id));

        const resumen = await api("GET", "/api/moderacion/resumen", { token: moderador.token });
        assert.ok(resumen.body.disputas >= 1);
        assert.equal(resumen.body.pendientes, resumen.body.denuncias + resumen.body.disputas);
    });

    it("resolver pide nota y una acción válida; un usuario normal no puede", async () => {
        const { orden } = await ordenAceptada("PC Sana");
        await abrir(compradora, orden);

        assert.equal((await resolver(compradora, orden, "cancelar")).status, 403);
        assert.equal((await resolver(moderador, orden, "cancelar", "")).status, 400);
        assert.equal((await resolver(moderador, orden, "reembolsar")).status, 400);
    });

    it("cancelar libera el producto, cierra la orden, avisa a los dos y queda en la bitácora", async () => {
        const { orden, producto } = await ordenAceptada("PC Jeongyeon");
        await abrir(compradora, orden);

        const res = await resolver(moderador, orden, "cancelar", "La vendedora no envió nada");
        assert.equal(res.status, 200, JSON.stringify(res.body));
        assert.equal(res.body.orden.estado, "cancelada");
        assert.equal(res.body.orden.disputa.estado, "resuelta");
        assert.equal(res.body.orden.disputa.resolucion.accion, "cancelar");
        assert.match(res.body.orden.historial.at(-1).nota, /^Moderación: /);

        const prod = await api("GET", `/api/productos/${producto._id}`, { token: ajena.token });
        assert.equal(prod.body.producto.estado, "activo");

        for (const persona of [compradora, vendedora]) {
            assert.ok(await Notificacion.exists({ destinatario: persona.usuario.id, tipo: "moderacion", mensaje: /resolvió la disputa/ }));
        }

        const registro = await Moderacion.findOne({ accion: "resolver_disputa", objetivo: orden._id });
        assert.ok(registro);
        assert.equal(String(registro.usuarioAfectado), vendedora.usuario.id);

        assert.equal((await resolver(moderador, orden, "cancelar")).status, 409, "ya no hay disputa abierta");
    });

    it("completar pasa el artículo a la colección de quien compró", async () => {
        const { orden } = await ordenAceptada("PC Mina");
        await api("PATCH", `/api/ordenes/${orden._id}/estado`, { token: vendedora.token, json: { estado: "enviada" } });
        await abrir(vendedora, orden, "no_responde", "Ya le llegó y no confirma");

        const res = await resolver(moderador, orden, "completar", "La guía dice entregado");
        assert.equal(res.status, 200, JSON.stringify(res.body));
        assert.equal(res.body.orden.estado, "completada");

        const coleccion = await api("GET", "/api/coleccion", { token: compradora.token });
        assert.ok(coleccion.body.articulos.some((a) => a.titulo === "PC Mina"));
    });

    it("continuar deja la orden donde estaba y la descongela", async () => {
        const { orden } = await ordenAceptada("PC Dahyun");
        await abrir(compradora, orden, "otro", "Malentendido");

        const res = await resolver(moderador, orden, "continuar", "Se pusieron de acuerdo en el chat");
        assert.equal(res.status, 200);
        assert.equal(res.body.orden.estado, "aceptada");

        const mover = await api("PATCH", `/api/ordenes/${orden._id}/estado`, { token: vendedora.token, json: { estado: "enviada" } });
        assert.equal(mover.status, 200, JSON.stringify(mover.body));
    });

    it("conflicto de interés: nadie resuelve su propia disputa y las del equipo solo un admin", async () => {
        // El moderador compra: no puede resolver su propia disputa, ni otro moderador.
        const { orden } = await ordenAceptada("PC Chaeyoung", moderador);
        await abrir(moderador, orden);

        assert.equal((await resolver(moderador, orden, "cancelar")).status, 403);

        const mod2 = await registrarUsuario(api, { name: "Mod Dos" });
        await Usuario.updateOne({ _id: mod2.usuario.id }, { rol: "moderador" });
        assert.equal((await resolver(mod2, orden, "cancelar")).status, 403);

        assert.equal((await resolver(admin, orden, "cancelar")).status, 200);
    });
});
