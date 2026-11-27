const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { iniciarApi, crearCliente, registrarUsuario } = require("./helpers");
const Usuario = require("../models/Usuario");
const ProgresoTarea = require("../models/ProgresoTarea");
const { ESTAMPITAS, IDS_ESTAMPITAS, ORDEN_RAREZAS } = require("../models/estampitas");
const { sortearSobre, sortearRareza, seriesCompletas } = require("../services/estampitas");
const { claveDia, claveSemana, segundosParaReinicio, TAREAS } = require("../services/tareas");

describe("Tareas, estampitas y minijuegos", () => {
    let entorno;
    let api;
    let ana;
    let beto;

    const tareas = async (cuenta) => (await api("GET", "/api/tareas", { token: cuenta.token })).body;
    const tarea = async (cuenta, id) => (await tareas(cuenta)).tareas.find((t) => t.id === id);
    const reclamar = (cuenta, id) => api("POST", `/api/tareas/${id}/reclamar`, { token: cuenta.token });
    const jugar = (cuenta, juego, puntos) => api("POST", `/api/juegos/${juego}/partidas`, { token: cuenta.token, json: { puntos } });
    // El servidor pide 3 s entre partidas del mismo juego: en las pruebas se "adelanta el reloj".
    const permitirOtraPartida = (cuenta, juego) =>
        require("../models/Marcador").updateOne(
            { usuario: cuenta.usuario._id || cuenta.usuario.id, juego },
            { $set: { ultimaPartida: new Date(Date.now() - 10_000) } }
        );

    before(async () => {
        entorno = await iniciarApi("tareas_juegos");
        api = crearCliente(entorno.url);
        ana = await registrarUsuario(api, { name: "Ana", username: "ana.tareas" });
        beto = await registrarUsuario(api, { name: "Beto", username: "beto.tareas" });
    });

    after(async () => {
        await entorno.detener();
    });

    describe("sorteo y periodos (sin API)", () => {
        it("la primera estampita del sobre respeta la rareza mínima", () => {
            for (let i = 0; i < 200; i++) {
                const [primera, ...resto] = sortearSobre(3, "epica");
                const rareza = ESTAMPITAS.find((e) => e.id === primera).rareza;
                assert.ok(["epica", "legendaria"].includes(rareza));
                resto.forEach((id) => assert.ok(IDS_ESTAMPITAS.includes(id)));
            }
        });

        it("las rarezas salen según su peso", () => {
            assert.equal(sortearRareza("comun", () => 0), "comun");
            assert.equal(sortearRareza("comun", () => 0.999), "legendaria");
            assert.equal(sortearRareza("legendaria", () => 0), "legendaria");
            assert.deepEqual(ORDEN_RAREZAS, ["comun", "rara", "epica", "legendaria"]);
        });

        it("el día y la semana se cuentan con la hora de Monterrey", () => {
            // 03:00 UTC del 27 = 21:00 del 26 en Monterrey
            assert.equal(claveDia(new Date("2026-11-27T03:00:00Z")), "2026-11-26");
            assert.equal(claveDia(new Date("2026-11-27T07:00:00Z")), "2026-11-27");
            assert.equal(claveSemana(new Date("2026-11-26T18:00:00Z")), "2026-S48");
            assert.equal(claveSemana(new Date("2026-01-01T18:00:00Z")), "2026-S01");
            const { diaria, semanal } = segundosParaReinicio(new Date("2026-11-26T18:00:00Z")); // jueves 12:00
            assert.equal(diaria, 12 * 3600);
            assert.equal(semanal, 12 * 3600 + 3 * 86400);
        });

        it("cada tarea tiene un id único y una meta positiva", () => {
            const ids = new Set(TAREAS.map((t) => t.id));
            assert.equal(ids.size, TAREAS.length);
            TAREAS.forEach((t) => assert.ok(t.meta > 0 && t.recompensa.cantidad > 0, t.id));
        });
    });

    describe("tareas", () => {
        it("requiere sesión", async () => {
            assert.equal((await api("GET", "/api/tareas")).status, 401);
        });

        it("abrir las tareas completa la diaria de visita y se puede reclamar una sola vez", async () => {
            const lista = await tareas(ana);
            assert.equal(lista.tareas.length, TAREAS.length);
            const visita = lista.tareas.find((t) => t.id === "d_visita");
            assert.equal(visita.completada, true);
            assert.equal(visita.reclamada, false);
            assert.ok(lista.porReclamar >= 1);
            assert.ok(lista.reinicioEn.diaria > 0);

            const res = await reclamar(ana, "d_visita");
            assert.equal(res.status, 200, JSON.stringify(res.body));
            assert.equal(res.body.estampitas.length, 1);
            assert.ok(IDS_ESTAMPITAS.includes(res.body.estampitas[0].id));
            assert.equal(res.body.estampitas[0].nueva, true);

            assert.equal((await reclamar(ana, "d_visita")).status, 409);
            assert.equal((await tarea(ana, "d_visita")).reclamada, true);
        });

        it("no se reclama lo que falta terminar ni tareas inventadas", async () => {
            assert.equal((await reclamar(ana, "d_publicar")).status, 400);
            assert.equal((await reclamar(ana, "no_existe")).status, 404);
        });

        it("publicar, comentar y dar like hacen avanzar las tareas", async () => {
            const post = await api("POST", "/api/publicaciones", { token: beto.token, json: { texto: "Hola fans" } });
            const id = post.body.publicacion?.id || post.body.publicacion?._id;
            assert.ok(id, JSON.stringify(post.body));

            await api("POST", "/api/publicaciones", { token: ana.token, json: { texto: "Mi primera publicación" } });
            await api("POST", `/api/publicaciones/${id}/comentarios`, { token: ana.token, json: { texto: "¡Qué bonito!" } });
            await api("POST", `/api/publicaciones/${id}/like`, { token: ana.token });

            assert.equal((await tarea(ana, "d_publicar")).completada, true);
            assert.equal((await tarea(ana, "d_comentar")).progreso, 1);
            assert.equal((await tarea(ana, "d_like")).progreso, 1);
            assert.equal((await tarea(ana, "l_publicaciones")).progreso, 1);

            const res = await reclamar(ana, "d_publicar");
            assert.equal(res.status, 200);
            assert.equal(res.body.estampitas.length, 2);
        });

        it("crear el avatar completa el logro y da una estampita rara o mejor primero", async () => {
            await api("PUT", "/api/usuarios/me/avatar", { token: ana.token, json: { avatar: { cabello: "bob" } } });
            const res = await reclamar(ana, "l_avatar");
            assert.equal(res.status, 200);
            const primera = ESTAMPITAS.find((e) => e.id === res.body.estampitas[0].id);
            assert.notEqual(primera.rareza, "comun");
        });
    });

    describe("álbum", () => {
        it("muestra lo que tengo, con repetidas, y el de otra persona", async () => {
            const mio = await api("GET", "/api/estampitas", { token: ana.token });
            assert.equal(mio.status, 200);
            assert.equal(mio.body.total, 36);
            const cantidad = mio.body.album.reduce((suma, e) => suma + e.cantidad, 0);
            assert.equal(cantidad, 1 + 2 + 3);
            assert.equal(mio.body.repetidas, cantidad - mio.body.distintas);

            const ajeno = await api("GET", "/api/estampitas/ana.tareas", { token: beto.token });
            assert.equal(ajeno.status, 200);
            assert.equal(ajeno.body.distintas, mio.body.distintas);
            assert.equal((await api("GET", "/api/estampitas/nadie", { token: beto.token })).status, 404);
        });

        it("completar una serie desbloquea el logro de serie completa", async () => {
            const idBeto = beto.usuario._id || beto.usuario.id;
            // A Beto le falta solo la legendaria de los snacks...
            const snacks = ESTAMPITAS.filter((e) => e.serie === "snacks");
            await Usuario.updateOne({ _id: idBeto }, { $set: { estampitas: snacks.slice(0, 5).map((e) => ({ id: e.id, cantidad: 1 })) } });
            assert.deepEqual(seriesCompletas(snacks.slice(0, 5)), []);

            // ...y la tarea que reclama le da una legendaria garantizada: se fuerza a que sea esa.
            await ProgresoTarea.create({ usuario: idBeto, tarea: "l_serie", periodo: "siempre", progreso: 0 });
            const { agregarAlAlbum } = require("../services/estampitas");
            const resultado = await agregarAlAlbum(idBeto, ["sn_pollo"]);
            assert.deepEqual(resultado.seriesNuevas, ["snacks"]);

            const album = await api("GET", "/api/estampitas", { token: beto.token });
            assert.deepEqual(album.body.seriesCompletas, ["snacks"]);
        });
    });

    describe("minijuegos", () => {
        it("guarda la partida, el récord y avanza las tareas de juegos", async () => {
            const res = await jugar(ana, "snake", 35);
            assert.equal(res.status, 201, JSON.stringify(res.body));
            assert.equal(res.body.mejor, 35);
            assert.equal(res.body.nuevoRecord, true);

            assert.equal((await tarea(ana, "s_snake")).completada, true);
            assert.equal((await tarea(ana, "d_jugar")).progreso, 1);
            assert.equal((await tarea(ana, "l_snake")).progreso, 35);
        });

        it("no deja guardar partidas seguidas muy rápido", async () => {
            assert.equal((await jugar(ana, "snake", 10)).status, 429);
        });

        it("un puntaje más bajo no baja el récord ni el avance", async () => {
            await permitirOtraPartida(ana, "snake");
            const res = await jugar(ana, "snake", 10);
            assert.equal(res.status, 201);
            assert.equal(res.body.mejor, 35);
            assert.equal(res.body.nuevoRecord, false);
            assert.equal((await tarea(ana, "l_snake")).progreso, 35);
            assert.equal((await tarea(ana, "d_jugar")).completada, true);
        });

        it("rechaza puntajes imposibles y juegos que no existen", async () => {
            for (const puntos of [-1, 401, 3.5, "mucho", null]) {
                assert.equal((await jugar(beto, "snake", puntos)).status, 400, String(puntos));
            }
            assert.equal((await jugar(beto, "tetris", 10)).status, 404);
            assert.equal((await jugar(beto, "__proto__", 10)).status, 404);
        });

        it("el memorama cuenta partidas completadas", async () => {
            const res = await jugar(beto, "memorama", 700);
            assert.equal(res.status, 201);
            assert.equal((await tarea(beto, "s_memorama")).progreso, 1);
        });

        it("el ranking ordena por mejor puntaje y dice mi lugar", async () => {
            await jugar(beto, "snake", 50);
            const res = await api("GET", "/api/juegos/snake/ranking", { token: ana.token });
            assert.equal(res.status, 200);
            assert.deepEqual(res.body.ranking.map((r) => r.usuario.username), ["beto.tareas", "ana.tareas"]);
            assert.equal(res.body.ranking[0].mejor, 50);
            assert.deepEqual(res.body.mio, { mejor: 35, partidas: 2, lugar: 2 });
            assert.equal(res.body.ranking[0].usuario.email, undefined);
        });
    });
});
