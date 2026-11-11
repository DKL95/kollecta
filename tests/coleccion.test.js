const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { iniciarApi, crearCliente, registrarUsuario, imagenPng } = require("./helpers");
const Usuario = require("../models/Usuario");

describe("Colección (/api/coleccion)", () => {
    let entorno;
    let api;
    let duena;
    let visita;
    let articulo;

    before(async () => {
        entorno = await iniciarApi("coleccion");
        api = crearCliente(entorno.url);
        duena = await registrarUsuario(api, { name: "Dueña" });
        visita = await registrarUsuario(api, { name: "Visita" });
    });

    after(async () => {
        await entorno.detener();
    });

    it("agrega un artículo con foto a la colección propia", async () => {
        const res = await api("POST", "/api/coleccion/articulos", {
            token: duena.token,
            form: { titulo: "PC Nayeon", grupo: "TWICE", categoria: "Photocard", valorEstimado: "250", imagenes: imagenPng() }
        });

        assert.equal(res.status, 201);
        articulo = res.body.articulo;
        assert.equal(articulo.titulo, "PC Nayeon");
        assert.equal(articulo.valorEstimado, 250);
        assert.match(articulo.imagenes[0], /^\/api\/imagenes\//);
    });

    it("otra persona ve la colección desde el perfil", async () => {
        const res = await api("GET", `/api/coleccion/usuario/${duena.usuario.id}`, { token: visita.token });
        assert.equal(res.status, 200);
        assert.deepEqual(res.body.articulos.map((a) => a.titulo), ["PC Nayeon"]);
    });

    it("una colección vacía regresa lista vacía", async () => {
        const res = await api("GET", `/api/coleccion/usuario/${visita.usuario.id}`, { token: duena.token });
        assert.equal(res.status, 200);
        assert.deepEqual(res.body.articulos, []);
    });

    it("el detalle indica si la pieza es mía y quién es el dueño", async () => {
        const propio = await api("GET", `/api/coleccion/articulos/${articulo._id}`, { token: duena.token });
        assert.equal(propio.status, 200);
        assert.equal(propio.body.esMio, true);

        const ajeno = await api("GET", `/api/coleccion/articulos/${articulo._id}`, { token: visita.token });
        assert.equal(ajeno.status, 200);
        assert.equal(ajeno.body.esMio, false);
        assert.equal(ajeno.body.propietario.username, duena.usuario.username);
        assert.equal(ajeno.body.propietario.email, undefined, "no expone el correo");
    });

    it("solo la dueña puede editar o eliminar", async () => {
        const editar = await api("PUT", `/api/coleccion/articulos/${articulo._id}`, { token: visita.token, json: { titulo: "x" } });
        const borrar = await api("DELETE", `/api/coleccion/articulos/${articulo._id}`, { token: visita.token });
        assert.equal(editar.status, 404);
        assert.equal(borrar.status, 404);
    });

    it("responde 404 con id inexistente y 400 con id mal formado", async () => {
        const inexistente = await api("GET", "/api/coleccion/articulos/000000000000000000000000", { token: visita.token });
        const malo = await api("GET", "/api/coleccion/articulos/abc", { token: visita.token });
        assert.equal(inexistente.status, 404);
        assert.equal(malo.status, 400);
    });

    it("las piezas de una cuenta desactivada ya no se ven", async () => {
        await Usuario.updateOne({ _id: duena.usuario.id }, { activo: false });

        const lista = await api("GET", `/api/coleccion/usuario/${duena.usuario.id}`, { token: visita.token });
        const detalle = await api("GET", `/api/coleccion/articulos/${articulo._id}`, { token: visita.token });
        assert.equal(lista.status, 404);
        assert.equal(detalle.status, 404);
    });
});
