const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { iniciarApi, crearCliente, registrarUsuario, imagenPng } = require("./helpers");
const Usuario = require("../models/Usuario");
const Coleccion = require("../models/Coleccion");

describe("Galería 3D de la colección", () => {
    let entorno;
    let api;
    let ana;
    let beto;
    const piezas = [];

    const agregar = (cuenta, titulo, extra = {}) =>
        api("POST", "/api/coleccion/articulos", {
            token: cuenta.token,
            form: { titulo, grupo: "TWICE", categoria: "Photocard", valorEstimado: "120", ...extra }
        });

    before(async () => {
        entorno = await iniciarApi("galeria");
        api = crearCliente(entorno.url);
        ana = await registrarUsuario(api, { name: "Ana", username: "ana.galeria" });
        beto = await registrarUsuario(api, { name: "Beto", username: "beto.galeria" });
        for (const titulo of ["PC Nayeon", "Álbum Formula", "Lightstick Candybong"]) {
            const res = await agregar(ana, titulo, titulo === "PC Nayeon" ? { imagenes: imagenPng() } : {});
            assert.equal(res.status, 201);
            piezas.push(res.body.articulo);
        }
    });

    after(async () => {
        await entorno.detener();
    });

    it("requiere sesión", async () => {
        assert.equal((await api("GET", "/api/coleccion/galeria/ana.galeria")).status, 401);
    });

    it("muestra la galería con la decoración por omisión y lo más nuevo primero", async () => {
        const res = await api("GET", "/api/coleccion/galeria/ana.galeria", { token: beto.token });
        assert.equal(res.status, 200);
        assert.equal(res.body.esMia, false);
        assert.equal(res.body.usuario.username, "ana.galeria");
        assert.deepEqual(res.body.galeria, { tema: "museo", marco: "dorado", luz: "calida", particulas: "ninguna", titulo: "", destacada: null });
        assert.deepEqual(res.body.piezas.map((p) => p.titulo), ["Lightstick Candybong", "Álbum Formula", "PC Nayeon"]);
        assert.match(res.body.piezas[2].imagen, /^\/api\/imagenes\//);
        assert.equal(res.body.destacada, null);
        assert.equal(res.body.totalPiezas, 3);
    });

    it("404 si la persona no existe o está baneada", async () => {
        assert.equal((await api("GET", "/api/coleccion/galeria/nadie.aqui", { token: ana.token })).status, 404);
        const baneada = await registrarUsuario(api, { name: "Baneada" });
        await Usuario.updateOne({ _id: baneada.usuario.id }, { activo: false });
        assert.equal((await api("GET", `/api/coleccion/galeria/${baneada.usuario.username}`, { token: ana.token })).status, 404);
    });

    it("guarda la decoración y pone la pieza destacada en el pedestal", async () => {
        const res = await api("PUT", "/api/coleccion/galeria", {
            token: ana.token,
            json: { tema: "neon", marco: "neon", luz: "escenario", particulas: "corazones", titulo: "  Sala ONCE  ", destacada: piezas[0]._id }
        });
        assert.equal(res.status, 200, JSON.stringify(res.body));
        assert.equal(res.body.galeria.titulo, "Sala ONCE");

        const galeria = (await api("GET", "/api/coleccion/galeria/ana.galeria", { token: ana.token })).body;
        assert.equal(galeria.esMia, true);
        assert.equal(galeria.galeria.tema, "neon");
        assert.equal(galeria.destacada.titulo, "PC Nayeon");
        // La destacada no se repite en las paredes.
        assert.deepEqual(galeria.piezas.map((p) => p.titulo), ["Lightstick Candybong", "Álbum Formula"]);
    });

    it("solo cambia lo que se manda", async () => {
        await api("PUT", "/api/coleccion/galeria", { token: ana.token, json: { luz: "fria" } });
        const { galeria } = (await api("GET", "/api/coleccion/galeria/ana.galeria", { token: ana.token })).body;
        assert.equal(galeria.luz, "fria");
        assert.equal(galeria.tema, "neon");
        assert.equal(galeria.particulas, "corazones");
    });

    it("rechaza opciones inválidas y piezas ajenas", async () => {
        const put = (json) => api("PUT", "/api/coleccion/galeria", { token: ana.token, json });
        assert.equal((await put({ tema: "dorado-falso" })).status, 400);
        assert.equal((await put({ marco: "x" })).status, 400);
        assert.equal((await put({ luz: "x" })).status, 400);
        assert.equal((await put({ particulas: "x" })).status, 400);
        assert.equal((await put({ titulo: "x".repeat(41) })).status, 400);
        assert.equal((await put({ destacada: "no-es-id" })).status, 400);

        const deBeto = (await agregar(beto, "PC de Beto")).body.articulo;
        const ajena = await put({ destacada: deBeto._id });
        assert.equal(ajena.status, 400);
        assert.match(ajena.body.mensaje, /tu colección/);
    });

    it("si la pieza destacada se borra, el pedestal queda vacío", async () => {
        await Coleccion.updateOne({ usuario: ana.usuario.id }, { $pull: { articulos: { _id: piezas[0]._id } } });
        const res = (await api("GET", "/api/coleccion/galeria/ana.galeria", { token: ana.token })).body;
        assert.equal(res.destacada, null);
        assert.equal(res.galeria.destacada, null);
        assert.equal(res.piezas.length, 2);

        assert.equal((await api("PUT", "/api/coleccion/galeria", { token: ana.token, json: { destacada: null } })).status, 200);
    });

    it("decorar la galería completa el logro", async () => {
        const tareas = (await api("GET", "/api/tareas", { token: ana.token })).body.tareas;
        const logro = tareas.find((t) => t.id === "l_galeria");
        assert.equal(logro.progreso, logro.meta);
    });
});
