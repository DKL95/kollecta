const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { iniciarApi, crearCliente, registrarUsuario } = require("./helpers");
const Usuario = require("../models/Usuario");
const Notificacion = require("../models/Notificacion");
const Mensaje = require("../models/Mensaje");

describe("Compra-venta (/api/ordenes) y marketplace", () => {
    let entorno;
    let api;
    let vendedora;
    let compradora;
    let otra;

    async function agregarArticulo(usuario, datos) {
        const res = await api("POST", "/api/coleccion/articulos", {
            token: usuario.token,
            form: { grupo: "TWICE", categoria: "Photocard", ...datos }
        });
        assert.equal(res.status, 201, JSON.stringify(res.body));
        return res.body.articulo;
    }

    async function cambiar(usuario, orden, estado) {
        return api("PATCH", `/api/ordenes/${orden._id}/estado`, { token: usuario.token, json: { estado } });
    }

    before(async () => {
        entorno = await iniciarApi("ordenes");
        api = crearCliente(entorno.url);
        vendedora = await registrarUsuario(api, { name: "Vendedora" });
        compradora = await registrarUsuario(api, { name: "Compradora" });
        otra = await registrarUsuario(api, { name: "Otra" });
    });

    after(async () => {
        await entorno.detener();
    });

    describe("compra", () => {
        let pc;
        let orden;

        before(async () => {
            pc = await agregarArticulo(vendedora, {
                titulo: "PC Nayeon", valorEstimado: "200", precio: "250", disponibleCompra: "true"
            });
            await agregarArticulo(vendedora, { titulo: "Álbum privado", categoria: "Álbum" });
        });

        it("el marketplace muestra solo lo que está a la venta o para intercambio", async () => {
            const res = await api("GET", "/api/coleccion/marketplace", { token: compradora.token });
            assert.equal(res.status, 200);
            const titulos = res.body.articulos.map((a) => a.titulo);
            assert.ok(titulos.includes("PC Nayeon"));
            assert.ok(!titulos.includes("Álbum privado"));

            const item = res.body.articulos.find((a) => a.titulo === "PC Nayeon");
            assert.equal(item.precioVenta, 250, "usa el precio publicado, no el valor estimado");
            assert.equal(item.vendedor.username, vendedora.usuario.username);
            assert.equal(item.vendedor.email, undefined);
            assert.equal(item.esMio, false);
        });

        it("filtra por texto, grupo y tipo", async () => {
            const porTexto = await api("GET", "/api/coleccion/marketplace?q=nayeon", { token: compradora.token });
            assert.equal(porTexto.body.articulos.length, 1);

            const otroGrupo = await api("GET", "/api/coleccion/marketplace?grupo=BTS", { token: compradora.token });
            assert.equal(otroGrupo.body.articulos.length, 0);

            const intercambio = await api("GET", "/api/coleccion/marketplace?tipo=intercambio", { token: compradora.token });
            assert.ok(!intercambio.body.articulos.some((a) => a.titulo === "PC Nayeon"));

            const malo = await api("GET", "/api/coleccion/marketplace?tipo=regalo", { token: compradora.token });
            assert.equal(malo.status, 400);
        });

        it("pide token", async () => {
            const res = await api("GET", "/api/coleccion/marketplace");
            assert.equal(res.status, 401);
        });

        it("no deja comprar tu propio artículo ni algo que no está a la venta", async () => {
            const propio = await api("POST", "/api/ordenes", {
                token: vendedora.token, json: { articuloId: pc._id, tipo: "compra" }
            });
            assert.equal(propio.status, 400);

            const sinIntercambio = await api("POST", "/api/ordenes", {
                token: compradora.token, json: { articuloId: pc._id, tipo: "intercambio", ofrecidos: [] }
            });
            assert.equal(sinIntercambio.status, 400);
        });

        it("crea la orden, abre el chat y avisa a la vendedora", async () => {
            const res = await api("POST", "/api/ordenes", {
                token: compradora.token,
                json: { articuloId: pc._id, tipo: "compra", entrega: "envio", nota: "¿Lo mandas a Monterrey?" }
            });
            assert.equal(res.status, 201, JSON.stringify(res.body));
            orden = res.body.orden;
            assert.equal(orden.estado, "pendiente");
            assert.equal(orden.precio, 250);
            assert.equal(orden.miRol, "comprador");
            assert.equal(orden.articulo.titulo, "PC Nayeon");
            assert.ok(orden.conversacion);

            const mensajes = await Mensaje.find({ conversacion: orden.conversacion });
            assert.equal(mensajes.length, 1);
            assert.match(mensajes[0].texto, /Quiero comprar "PC Nayeon"/);

            const aviso = await Notificacion.findOne({ destinatario: vendedora.usuario.id, tipo: "orden" });
            assert.ok(aviso);
            assert.equal(aviso.enlace, `/ordenes/${orden._id}`);
        });

        it("no deja abrir dos órdenes activas del mismo artículo", async () => {
            const res = await api("POST", "/api/ordenes", {
                token: compradora.token, json: { articuloId: pc._id, tipo: "compra" }
            });
            assert.equal(res.status, 409);
        });

        it("cada quien ve la orden en su lista y nadie más la puede abrir", async () => {
            const compras = await api("GET", "/api/ordenes?rol=comprador", { token: compradora.token });
            assert.equal(compras.body.ordenes.length, 1);

            const ventas = await api("GET", "/api/ordenes?rol=vendedor", { token: vendedora.token });
            assert.equal(ventas.body.ordenes.length, 1);
            assert.equal(ventas.body.ordenes[0].miRol, "vendedor");

            const ajena = await api("GET", `/api/ordenes/${orden._id}`, { token: otra.token });
            assert.equal(ajena.status, 404);
        });

        it("la compradora no puede aceptar su propia orden", async () => {
            const res = await cambiar(compradora, orden, "aceptada");
            assert.equal(res.status, 403);
        });

        it("al aceptar, el artículo queda apartado, sale del marketplace y las demás solicitudes se rechazan", async () => {
            const competencia = await api("POST", "/api/ordenes", {
                token: otra.token, json: { articuloId: pc._id, tipo: "compra" }
            });
            assert.equal(competencia.status, 201);

            const res = await cambiar(vendedora, orden, "aceptada");
            assert.equal(res.status, 200, JSON.stringify(res.body));
            assert.equal(res.body.orden.estado, "aceptada");

            const market = await api("GET", "/api/coleccion/marketplace", { token: otra.token });
            assert.ok(!market.body.articulos.some((a) => a.titulo === "PC Nayeon"));

            const detalle = await api("GET", `/api/coleccion/articulos/${pc._id}`, { token: otra.token });
            assert.equal(detalle.body.articulo.reservado, true);

            const otraOrden = await api("GET", `/api/ordenes/${competencia.body.orden._id}`, { token: otra.token });
            assert.equal(otraOrden.body.orden.estado, "rechazada");

            const nueva = await api("POST", "/api/ordenes", {
                token: otra.token, json: { articuloId: pc._id, tipo: "compra" }
            });
            assert.equal(nueva.status, 409);

            const borrar = await api("DELETE", `/api/coleccion/articulos/${pc._id}`, { token: vendedora.token });
            assert.equal(borrar.status, 409, "no se puede borrar un artículo apartado");
        });

        it("no se salta pasos: no se completa antes de recibirse", async () => {
            const res = await cambiar(vendedora, orden, "completada");
            assert.equal(res.status, 409);
        });

        it("enviada → recibida → completada pasa el artículo a la compradora", async () => {
            assert.equal((await cambiar(vendedora, orden, "enviada")).status, 200);
            assert.equal((await cambiar(compradora, orden, "recibida")).status, 200);
            const fin = await cambiar(vendedora, orden, "completada");
            assert.equal(fin.status, 200);
            assert.deepEqual(fin.body.orden.historial.map((h) => h.estado), ["pendiente", "aceptada", "enviada", "recibida", "completada"]);

            const deVendedora = await api("GET", "/api/coleccion", { token: vendedora.token });
            assert.ok(!deVendedora.body.articulos.some((a) => a.titulo === "PC Nayeon"));

            const deCompradora = await api("GET", "/api/coleccion", { token: compradora.token });
            const recibido = deCompradora.body.articulos.find((a) => a.titulo === "PC Nayeon");
            assert.ok(recibido);
            assert.equal(recibido.disponibleCompra, false, "llega sin estar a la venta");
            assert.equal(recibido.reservadoPor, null);
        });

        it("la compradora califica una sola vez y se refleja en la reputación", async () => {
            const malo = await api("POST", `/api/ordenes/${orden._id}/calificacion`, {
                token: compradora.token, json: { estrellas: 7 }
            });
            assert.equal(malo.status, 400);

            const ok = await api("POST", `/api/ordenes/${orden._id}/calificacion`, {
                token: compradora.token, json: { estrellas: 5, comentario: "Todo perfecto" }
            });
            assert.equal(ok.status, 200);

            const otraVez = await api("POST", `/api/ordenes/${orden._id}/calificacion`, {
                token: compradora.token, json: { estrellas: 4 }
            });
            assert.equal(otraVez.status, 409);

            const resumen = await api("GET", `/api/ordenes/resumen/${vendedora.usuario.username}`, { token: otra.token });
            assert.deepEqual(resumen.body, { operaciones: 1, calificaciones: 1, promedio: 5 });
        });
    });

    describe("intercambio", () => {
        let suyo;
        let mio;
        let orden;

        before(async () => {
            suyo = await agregarArticulo(vendedora, { titulo: "PC Momo", disponibleIntercambio: "true" });
            mio = await agregarArticulo(compradora, { titulo: "PC Sana" });
        });

        it("exige ofrecer algo de tu propia colección", async () => {
            const vacio = await api("POST", "/api/ordenes", {
                token: compradora.token, json: { articuloId: suyo._id, tipo: "intercambio", ofrecidos: [] }
            });
            assert.equal(vacio.status, 400);

            const ajeno = await api("POST", "/api/ordenes", {
                token: otra.token, json: { articuloId: suyo._id, tipo: "intercambio", ofrecidos: [mio._id] }
            });
            assert.equal(ajeno.status, 400);
        });

        it("al completarse, cada quien se queda con lo del otro", async () => {
            const res = await api("POST", "/api/ordenes", {
                token: compradora.token, json: { articuloId: suyo._id, tipo: "intercambio", ofrecidos: [mio._id] }
            });
            assert.equal(res.status, 201, JSON.stringify(res.body));
            orden = res.body.orden;
            assert.equal(orden.precio, 0);
            assert.deepEqual(orden.ofrecidos.map((o) => o.titulo), ["PC Sana"]);

            assert.equal((await cambiar(vendedora, orden, "aceptada")).status, 200);
            assert.equal((await cambiar(compradora, orden, "recibida")).status, 200, "en persona se puede recibir sin 'enviada'");
            assert.equal((await cambiar(vendedora, orden, "completada")).status, 200);

            const deVendedora = (await api("GET", "/api/coleccion", { token: vendedora.token })).body.articulos.map((a) => a.titulo);
            const deCompradora = (await api("GET", "/api/coleccion", { token: compradora.token })).body.articulos.map((a) => a.titulo);
            assert.ok(deVendedora.includes("PC Sana") && !deVendedora.includes("PC Momo"));
            assert.ok(deCompradora.includes("PC Momo") && !deCompradora.includes("PC Sana"));
        });
    });

    describe("cancelar", () => {
        it("la compradora retira su solicitud pendiente; cancelar una aceptada libera el artículo", async () => {
            const art = await agregarArticulo(vendedora, { titulo: "PC Jihyo", disponibleCompra: "true", valorEstimado: "100" });

            const primera = await api("POST", "/api/ordenes", { token: compradora.token, json: { articuloId: art._id, tipo: "compra" } });
            assert.equal(primera.body.orden.precio, 100, "sin precio publicado usa el valor estimado");
            const retirar = await api("DELETE", `/api/ordenes/${primera.body.orden._id}`, { token: compradora.token });
            assert.equal(retirar.status, 200);

            const segunda = await api("POST", "/api/ordenes", { token: compradora.token, json: { articuloId: art._id, tipo: "compra" } });
            assert.equal(segunda.status, 201, "después de retirar se puede volver a pedir");
            await cambiar(vendedora, segunda.body.orden, "aceptada");

            const noRetira = await api("DELETE", `/api/ordenes/${segunda.body.orden._id}`, { token: compradora.token });
            assert.equal(noRetira.status, 409, "una vez aceptada se usa 'cancelada'");

            const cancelar = await cambiar(vendedora, segunda.body.orden, "cancelada");
            assert.equal(cancelar.status, 200);

            const detalle = await api("GET", `/api/coleccion/articulos/${art._id}`, { token: otra.token });
            assert.equal(detalle.body.articulo.reservado, false);
        });
    });

    describe("colección primero, venta después", () => {
        it("una pieza agregada a la colección no sale en el marketplace hasta ponerla a la venta", async () => {
            const pieza = await agregarArticulo(compradora, { titulo: "PC Tzuyu privada", valorEstimado: "300" });

            let market = await api("GET", "/api/coleccion/marketplace?q=tzuyu", { token: otra.token });
            assert.equal(market.body.articulos.length, 0);

            const fotos = await api("POST", `/api/coleccion/articulos/${pieza._id}/imagenes`, {
                token: compradora.token, form: { imagenes: require("./helpers").imagenPng() }
            });
            assert.equal(fotos.status, 201);
            assert.equal(fotos.body.articulo.imagenes.length, 1);

            const ajena = await api("POST", `/api/coleccion/articulos/${pieza._id}/imagenes`, {
                token: otra.token, form: { imagenes: require("./helpers").imagenPng() }
            });
            assert.equal(ajena.status, 404, "no se agregan fotos a piezas ajenas");

            const venta = await api("PUT", `/api/coleccion/articulos/${pieza._id}`, {
                token: compradora.token, json: { disponibleCompra: true, precio: 320, descripcion: "Impecable" }
            });
            assert.equal(venta.status, 200);

            market = await api("GET", "/api/coleccion/marketplace?q=tzuyu", { token: otra.token });
            assert.equal(market.body.articulos.length, 1, "es la misma pieza, no un duplicado");
            assert.equal(market.body.articulos[0]._id, pieza._id);
            assert.equal(market.body.articulos[0].precioVenta, 320);
        });

        it("no deja vender sin precio", async () => {
            const sinPrecio = await api("POST", "/api/coleccion/articulos", {
                token: compradora.token, form: { titulo: "Gratis", grupo: "TWICE", categoria: "Otro", disponibleCompra: "true" }
            });
            assert.equal(sinPrecio.status, 400);

            const pieza = await agregarArticulo(compradora, { titulo: "Sin valor" });
            const put = await api("PUT", `/api/coleccion/articulos/${pieza._id}`, {
                token: compradora.token, json: { disponibleCompra: true }
            });
            assert.equal(put.status, 400);

            const negativo = await api("PUT", `/api/coleccion/articulos/${pieza._id}`, {
                token: compradora.token, json: { disponibleCompra: true, precio: -5 }
            });
            assert.equal(negativo.status, 400);
        });

        it("al quitarla de la venta, las solicitudes pendientes se cierran y se avisa", async () => {
            const pieza = await agregarArticulo(vendedora, { titulo: "PC Dahyun", precio: "150", disponibleCompra: "true" });
            const orden = await api("POST", "/api/ordenes", { token: otra.token, json: { articuloId: pieza._id, tipo: "compra" } });
            assert.equal(orden.status, 201);

            const quitar = await api("PUT", `/api/coleccion/articulos/${pieza._id}`, {
                token: vendedora.token, json: { disponibleCompra: false, disponibleIntercambio: false }
            });
            assert.equal(quitar.status, 200);

            const despues = await api("GET", `/api/ordenes/${orden.body.orden._id}`, { token: otra.token });
            assert.equal(despues.body.orden.estado, "rechazada");
            assert.ok(await Notificacion.exists({ destinatario: otra.usuario.id, mensaje: /retiró "PC Dahyun"/ }));
        });

        it("con la pieza apartada no se cambia su venta, pero sí la descripción", async () => {
            const pieza = await agregarArticulo(vendedora, { titulo: "PC Chaeyoung", precio: "150", disponibleCompra: "true" });
            const orden = await api("POST", "/api/ordenes", { token: compradora.token, json: { articuloId: pieza._id, tipo: "compra" } });
            await cambiar(vendedora, orden.body.orden, "aceptada");

            const bloqueado = await api("PUT", `/api/coleccion/articulos/${pieza._id}`, {
                token: vendedora.token, json: { disponibleCompra: false }
            });
            assert.equal(bloqueado.status, 409);

            const texto = await api("PUT", `/api/coleccion/articulos/${pieza._id}`, {
                token: vendedora.token, json: { descripcion: "Con funda" }
            });
            assert.equal(texto.status, 200);
        });
    });

    describe("roles", () => {
        it("un usuario normal no entra a /api/admin", async () => {
            const res = await api("GET", "/api/admin/usuarios", { token: compradora.token });
            assert.equal(res.status, 403);
        });

        it("un moderador puede ver cualquier orden, pero no administrar roles", async () => {
            await Usuario.updateOne({ _id: otra.usuario.id }, { rol: "moderador" });

            const ordenes = await api("GET", "/api/ordenes?rol=comprador", { token: compradora.token });
            const ajena = await api("GET", `/api/ordenes/${ordenes.body.ordenes[0]._id}`, { token: otra.token });
            assert.equal(ajena.status, 200);
            assert.equal(ajena.body.orden.miRol, null);

            const admin = await api("GET", "/api/admin/usuarios", { token: otra.token });
            assert.equal(admin.status, 403);
        });

        it("un administrador cambia roles, pero no el suyo, y rechaza roles inventados", async () => {
            await Usuario.updateOne({ _id: vendedora.usuario.id }, { rol: "administrador" });

            const lista = await api("GET", "/api/admin/usuarios?rol=moderador", { token: vendedora.token });
            assert.equal(lista.status, 200);
            assert.deepEqual(lista.body.usuarios.map((u) => u.username), [otra.usuario.username]);

            const promover = await api("PATCH", `/api/admin/usuarios/${compradora.usuario.id}/rol`, {
                token: vendedora.token, json: { rol: "moderador" }
            });
            assert.equal(promover.status, 200);
            assert.equal(promover.body.usuario.rol, "moderador");

            const inventado = await api("PATCH", `/api/admin/usuarios/${compradora.usuario.id}/rol`, {
                token: vendedora.token, json: { rol: "superadmin" }
            });
            assert.equal(inventado.status, 400);

            const propio = await api("PATCH", `/api/admin/usuarios/${vendedora.usuario.id}/rol`, {
                token: vendedora.token, json: { rol: "usuario" }
            });
            assert.equal(propio.status, 400);
        });
    });
});
