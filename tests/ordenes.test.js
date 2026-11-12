const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { iniciarApi, crearCliente, registrarUsuario, imagenPng } = require("./helpers");
const Usuario = require("../models/Usuario");
const Notificacion = require("../models/Notificacion");
const Mensaje = require("../models/Mensaje");

describe("Marketplace (/api/productos) y compra-venta (/api/ordenes)", () => {
    let entorno;
    let api;
    let vendedora;
    let compradora;
    let otra;

    async function agregarPieza(usuario, datos) {
        const res = await api("POST", "/api/coleccion/articulos", {
            token: usuario.token,
            form: { grupo: "TWICE", categoria: "Photocard", ...datos }
        });
        assert.equal(res.status, 201, JSON.stringify(res.body));
        return res.body.articulo;
    }

    async function publicar(usuario, datos) {
        const res = await api("POST", "/api/productos", {
            token: usuario.token,
            form: { grupo: "TWICE", categoria: "Photocard", disponibleCompra: "true", precio: "100", ...datos }
        });
        assert.equal(res.status, 201, JSON.stringify(res.body));
        return res.body.producto;
    }

    async function pedir(usuario, producto, datos = {}) {
        return api("POST", "/api/ordenes", {
            token: usuario.token, json: { productoId: producto._id, tipo: "compra", ...datos }
        });
    }

    async function cambiar(usuario, orden, estado) {
        return api("PATCH", `/api/ordenes/${orden._id}/estado`, { token: usuario.token, json: { estado } });
    }

    async function coleccionDe(usuario) {
        return (await api("GET", "/api/coleccion", { token: usuario.token })).body.articulos;
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

    describe("colección y venta son cosas distintas", () => {
        it("lo que se agrega a la colección nunca aparece en el marketplace", async () => {
            await agregarPieza(vendedora, { titulo: "PC Tzuyu privada", valorEstimado: "300", disponibleCompra: "true" });
            const market = await api("GET", "/api/productos?q=tzuyu", { token: otra.token });
            assert.equal(market.status, 200);
            assert.equal(market.body.productos.length, 0);
        });

        it("publicar desde la colección copia los datos y las fotos, y la pieza sigue igual en la colección", async () => {
            const pieza = await agregarPieza(vendedora, { titulo: "Álbum Formula of Love", categoria: "Álbum", imagenes: imagenPng() });

            const res = await api("POST", "/api/productos", {
                token: vendedora.token,
                form: {
                    desdeColeccion: pieza._id, titulo: "Álbum Formula of Love (ver. A)", grupo: "TWICE", categoria: "Álbum",
                    condicion: "Como nuevo", disponibleCompra: "true", precio: "550", imagenes: imagenPng()
                }
            });
            assert.equal(res.status, 201, JSON.stringify(res.body));
            const producto = res.body.producto;
            assert.notEqual(producto._id, pieza._id, "es un documento nuevo");
            assert.equal(producto.imagenes.length, 2, "foto copiada + foto nueva");
            assert.equal(producto.imagenes[0], pieza.imagenes[0]);
            assert.equal(producto.articuloOrigen, pieza._id);

            const coleccion = await coleccionDe(vendedora);
            const enColeccion = coleccion.find((a) => a._id === pieza._id);
            assert.equal(enColeccion.titulo, "Álbum Formula of Love", "la colección no cambia");
            assert.equal(enColeccion.imagenes.length, 1);
        });

        it("se puede elegir cuáles fotos de la pieza se copian", async () => {
            const pieza = await agregarPieza(vendedora, { titulo: "PC con fotos", imagenes: imagenPng() });
            const sinFotos = await api("POST", "/api/productos", {
                token: vendedora.token,
                form: { desdeColeccion: pieza._id, fotosCopiadas: "[]", titulo: "PC", grupo: "TWICE", categoria: "Photocard", disponibleCompra: "true", precio: "50" }
            });
            assert.equal(sinFotos.status, 201);
            assert.equal(sinFotos.body.producto.imagenes.length, 0);

            const ajenas = await api("POST", "/api/productos", {
                token: vendedora.token,
                form: { desdeColeccion: pieza._id, fotosCopiadas: JSON.stringify(["/api/imagenes/inventada"]), titulo: "PC", grupo: "TWICE", categoria: "Photocard", disponibleCompra: "true", precio: "50" }
            });
            assert.equal(ajenas.body.producto.imagenes.length, 0, "no se cuelan fotos que no son de la pieza");
        });

        it("no se puede copiar una pieza de la colección de otra persona", async () => {
            const ajena = await agregarPieza(compradora, { titulo: "Ajena" });
            const res = await api("POST", "/api/productos", {
                token: vendedora.token,
                form: { desdeColeccion: ajena._id, titulo: "x", grupo: "TWICE", categoria: "Photocard", disponibleCompra: "true", precio: "10" }
            });
            assert.equal(res.status, 404);
        });
    });

    describe("productos", () => {
        it("valida modalidad, precio y categoría", async () => {
            const casos = [
                { disponibleCompra: "false", disponibleIntercambio: "false" },
                { disponibleCompra: "true", precio: "0" },
                { disponibleCompra: "true", precio: "-3" },
                { categoria: "Ropa" }
            ];
            for (const datos of casos) {
                const res = await api("POST", "/api/productos", {
                    token: vendedora.token,
                    form: { titulo: "Malo", grupo: "TWICE", categoria: "Photocard", disponibleCompra: "true", precio: "100", ...datos }
                });
                assert.equal(res.status, 400, JSON.stringify(datos));
            }
        });

        it("el marketplace filtra por texto, grupo y modalidad, y no expone correos", async () => {
            await publicar(vendedora, { titulo: "PC Nayeon", precio: "250" });
            await publicar(vendedora, { titulo: "PC Felix", grupo: "Stray Kids", disponibleCompra: "false", disponibleIntercambio: "true", busca: "PC Hyunjin" });

            const todo = await api("GET", "/api/productos", { token: otra.token });
            const nayeon = todo.body.productos.find((p) => p.titulo === "PC Nayeon");
            assert.equal(nayeon.precio, 250);
            assert.equal(nayeon.vendedor.username, vendedora.usuario.username);
            assert.equal(nayeon.vendedor.email, undefined);
            assert.equal(nayeon.esMio, false);

            assert.equal((await api("GET", "/api/productos?q=nayeon", { token: otra.token })).body.productos.length, 1);
            assert.equal((await api("GET", "/api/productos?grupo=BTS", { token: otra.token })).body.productos.length, 0);
            const inter = await api("GET", "/api/productos?tipo=intercambio", { token: otra.token });
            assert.deepEqual(inter.body.productos.map((p) => p.titulo), ["PC Felix"]);
            assert.equal(inter.body.productos[0].busca, "PC Hyunjin");

            assert.equal((await api("GET", "/api/productos?tipo=regalo", { token: otra.token })).status, 400);
            assert.equal((await api("GET", "/api/productos")).status, 401);
        });

        it("solo el vendedor edita o retira, y lo retirado deja de verse", async () => {
            const p = await publicar(vendedora, { titulo: "PC Momo", precio: "120" });

            assert.equal((await api("PUT", `/api/productos/${p._id}`, { token: otra.token, json: { precio: 1 } })).status, 404);
            const editado = await api("PUT", `/api/productos/${p._id}`, { token: vendedora.token, json: { precio: 140 } });
            assert.equal(editado.status, 200);
            assert.equal(editado.body.producto.precio, 140);

            assert.equal((await api("DELETE", `/api/productos/${p._id}`, { token: otra.token })).status, 404);
            assert.equal((await api("DELETE", `/api/productos/${p._id}`, { token: vendedora.token })).status, 200);
            assert.equal((await api("GET", `/api/productos/${p._id}`, { token: otra.token })).status, 404);
            assert.equal((await api("GET", `/api/productos/${p._id}`, { token: vendedora.token })).status, 200, "el dueño sí lo ve");

            const mios = await api("GET", "/api/productos?vendedor=yo", { token: vendedora.token });
            assert.ok(!mios.body.productos.some((x) => x._id === p._id));
        });
    });

    describe("compra", () => {
        let producto;
        let orden;

        before(async () => {
            producto = await publicar(vendedora, { titulo: "Álbum Ready to Be", categoria: "Álbum", precio: "520" });
        });

        it("no deja comprar lo propio ni pedir intercambio de algo que solo se vende", async () => {
            assert.equal((await pedir(vendedora, producto)).status, 400);
            assert.equal((await pedir(compradora, producto, { tipo: "intercambio", ofrecidos: [] })).status, 400);
        });

        it("crea la orden, abre el chat y avisa a la vendedora", async () => {
            const res = await pedir(compradora, producto, { entrega: "envio", nota: "¿Lo mandas a Monterrey?" });
            assert.equal(res.status, 201, JSON.stringify(res.body));
            orden = res.body.orden;
            assert.equal(orden.estado, "pendiente");
            assert.equal(orden.precio, 520);
            assert.equal(orden.producto, producto._id);
            assert.equal(orden.miRol, "comprador");

            const mensajes = await Mensaje.find({ conversacion: orden.conversacion });
            assert.match(mensajes[0].texto, /Quiero comprar "Álbum Ready to Be"/);
            assert.ok(await Notificacion.exists({ destinatario: vendedora.usuario.id, tipo: "orden", enlace: `/ordenes/${orden._id}` }));
        });

        it("no deja dos órdenes activas del mismo producto y nadie ajeno abre la orden", async () => {
            assert.equal((await pedir(compradora, producto)).status, 409);
            assert.equal((await api("GET", `/api/ordenes/${orden._id}`, { token: otra.token })).status, 404);
            assert.equal((await cambiar(compradora, orden, "aceptada")).status, 403);
        });

        it("al aceptar se aparta, sale del marketplace y las demás solicitudes se rechazan", async () => {
            const competencia = await pedir(otra, producto);
            assert.equal(competencia.status, 201);

            const res = await cambiar(vendedora, orden, "aceptada");
            assert.equal(res.status, 200, JSON.stringify(res.body));

            const market = await api("GET", "/api/productos?q=ready", { token: otra.token });
            assert.equal(market.body.productos.length, 0);
            assert.equal((await api("GET", `/api/productos/${producto._id}`, { token: otra.token })).body.producto.estado, "reservado");
            assert.equal((await api("GET", `/api/ordenes/${competencia.body.orden._id}`, { token: otra.token })).body.orden.estado, "rechazada");
            assert.equal((await pedir(otra, producto)).status, 409);

            assert.equal((await api("PUT", `/api/productos/${producto._id}`, { token: vendedora.token, json: { precio: 1 } })).status, 409);
            assert.equal((await api("DELETE", `/api/productos/${producto._id}`, { token: vendedora.token })).status, 409);
        });

        it("no se salta pasos", async () => {
            assert.equal((await cambiar(vendedora, orden, "completada")).status, 409);
        });

        it("enviada → recibida → completada: queda vendido y llega a la colección de la compradora", async () => {
            assert.equal((await cambiar(vendedora, orden, "enviada")).status, 200);
            assert.equal((await cambiar(compradora, orden, "recibida")).status, 200);
            const fin = await cambiar(vendedora, orden, "completada");
            assert.equal(fin.status, 200);
            assert.deepEqual(fin.body.orden.historial.map((h) => h.estado), ["pendiente", "aceptada", "enviada", "recibida", "completada"]);

            assert.equal((await api("GET", `/api/productos/${producto._id}`, { token: otra.token })).body.producto.estado, "vendido");
            const recibido = (await coleccionDe(compradora)).find((a) => a.titulo === "Álbum Ready to Be");
            assert.ok(recibido);
            assert.equal(recibido.valorEstimado, 520);
        });

        it("la compradora califica una vez y se refleja en la reputación", async () => {
            assert.equal((await api("POST", `/api/ordenes/${orden._id}/calificacion`, { token: compradora.token, json: { estrellas: 7 } })).status, 400);
            assert.equal((await api("POST", `/api/ordenes/${orden._id}/calificacion`, { token: compradora.token, json: { estrellas: 5, comentario: "Perfecto" } })).status, 200);
            assert.equal((await api("POST", `/api/ordenes/${orden._id}/calificacion`, { token: compradora.token, json: { estrellas: 4 } })).status, 409);

            const resumen = await api("GET", `/api/ordenes/resumen/${vendedora.usuario.username}`, { token: otra.token });
            assert.deepEqual(resumen.body, { operaciones: 1, calificaciones: 1, promedio: 5 });
        });

        it("si el producto se copió de la colección, al venderse esa pieza sale de la colección del vendedor", async () => {
            const pieza = await agregarPieza(vendedora, { titulo: "Lightstick Candy Bong", categoria: "Lightstick" });
            const res = await api("POST", "/api/productos", {
                token: vendedora.token,
                form: { desdeColeccion: pieza._id, titulo: "Lightstick Candy Bong", grupo: "TWICE", categoria: "Lightstick", disponibleCompra: "true", precio: "900" }
            });
            const o = (await pedir(compradora, res.body.producto, { entrega: "en_persona" })).body.orden;
            await cambiar(vendedora, o, "aceptada");
            await cambiar(compradora, o, "recibida");
            assert.equal((await cambiar(vendedora, o, "completada")).status, 200);

            assert.ok(!(await coleccionDe(vendedora)).some((a) => a._id === pieza._id));
            assert.ok((await coleccionDe(compradora)).some((a) => a.titulo === "Lightstick Candy Bong"));
        });
    });

    describe("intercambio", () => {
        it("exige ofrecer piezas de tu colección y al completarse cada quien recibe lo del otro", async () => {
            const producto = await publicar(vendedora, { titulo: "PC Mina", disponibleCompra: "false", disponibleIntercambio: "true" });
            const mia = await agregarPieza(compradora, { titulo: "PC Sana" });
            const ajena = await agregarPieza(otra, { titulo: "PC Jeongyeon" });

            assert.equal((await pedir(compradora, producto, { tipo: "intercambio", ofrecidos: [] })).status, 400);
            assert.equal((await pedir(compradora, producto, { tipo: "intercambio", ofrecidos: [ajena._id] })).status, 400);

            const res = await pedir(compradora, producto, { tipo: "intercambio", ofrecidos: [mia._id] });
            assert.equal(res.status, 201, JSON.stringify(res.body));
            const orden = res.body.orden;
            assert.equal(orden.precio, 0);

            assert.equal((await cambiar(vendedora, orden, "aceptada")).status, 200);
            assert.equal((await api("DELETE", `/api/coleccion/articulos/${mia._id}`, { token: compradora.token })).status, 409, "la pieza ofrecida queda apartada");
            assert.equal((await cambiar(compradora, orden, "recibida")).status, 200);
            assert.equal((await cambiar(vendedora, orden, "completada")).status, 200);

            const deVendedora = (await coleccionDe(vendedora)).map((a) => a.titulo);
            const deCompradora = (await coleccionDe(compradora)).map((a) => a.titulo);
            assert.ok(deVendedora.includes("PC Sana"));
            assert.ok(deCompradora.includes("PC Mina") && !deCompradora.includes("PC Sana"));
        });
    });

    describe("cancelar y retirar", () => {
        it("retirar la solicitud, cancelar una aceptada libera el producto, y retirar el producto cierra las pendientes", async () => {
            const producto = await publicar(vendedora, { titulo: "PC Jihyo", precio: "100" });

            const primera = (await pedir(compradora, producto)).body.orden;
            assert.equal((await api("DELETE", `/api/ordenes/${primera._id}`, { token: compradora.token })).status, 200);

            const segunda = (await pedir(compradora, producto)).body.orden;
            await cambiar(vendedora, segunda, "aceptada");
            assert.equal((await api("DELETE", `/api/ordenes/${segunda._id}`, { token: compradora.token })).status, 409);
            assert.equal((await cambiar(vendedora, segunda, "cancelada")).status, 200);
            assert.equal((await api("GET", `/api/productos/${producto._id}`, { token: otra.token })).body.producto.estado, "activo");

            const tercera = (await pedir(otra, producto)).body.orden;
            assert.equal((await api("DELETE", `/api/productos/${producto._id}`, { token: vendedora.token })).status, 200);
            assert.equal((await api("GET", `/api/ordenes/${tercera._id}`, { token: otra.token })).body.orden.estado, "rechazada");
            assert.ok(await Notificacion.exists({ destinatario: otra.usuario.id, mensaje: /retiró "PC Jihyo"/ }));
        });
    });

    describe("roles", () => {
        it("un usuario normal no entra a /api/admin", async () => {
            assert.equal((await api("GET", "/api/admin/usuarios", { token: compradora.token })).status, 403);
        });

        it("un moderador ve cualquier orden pero no administra roles", async () => {
            await Usuario.updateOne({ _id: otra.usuario.id }, { rol: "moderador" });
            const ordenes = await api("GET", "/api/ordenes?rol=comprador", { token: compradora.token });
            const ajena = await api("GET", `/api/ordenes/${ordenes.body.ordenes[0]._id}`, { token: otra.token });
            assert.equal(ajena.status, 200);
            assert.equal(ajena.body.orden.miRol, null);
            assert.equal((await api("GET", "/api/admin/usuarios", { token: otra.token })).status, 403);
        });

        it("un administrador cambia roles, pero no el suyo, y rechaza roles inventados", async () => {
            await Usuario.updateOne({ _id: vendedora.usuario.id }, { rol: "administrador" });
            const lista = await api("GET", "/api/admin/usuarios?rol=moderador", { token: vendedora.token });
            assert.deepEqual(lista.body.usuarios.map((u) => u.username), [otra.usuario.username]);

            const promover = await api("PATCH", `/api/admin/usuarios/${compradora.usuario.id}/rol`, { token: vendedora.token, json: { rol: "moderador" } });
            assert.equal(promover.body.usuario.rol, "moderador");
            assert.equal((await api("PATCH", `/api/admin/usuarios/${compradora.usuario.id}/rol`, { token: vendedora.token, json: { rol: "superadmin" } })).status, 400);
            assert.equal((await api("PATCH", `/api/admin/usuarios/${vendedora.usuario.id}/rol`, { token: vendedora.token, json: { rol: "usuario" } })).status, 400);
        });
    });
});
