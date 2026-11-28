const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { iniciarApi, crearCliente, registrarUsuario, imagenPng } = require("./helpers");
const Usuario = require("../models/Usuario");
const Historia = require("../models/Historia");
const Klip = require("../models/Klip");
const Notificacion = require("../models/Notificacion");
const { ArchivoVideo } = require("../services/videoStorage");
const { duracionDeBuffer } = require("../services/duracionVideo");
const { limpiarHistoriasVencidas } = require("../services/historias");

/* ---------- Videos de prueba (solo la estructura que lee el servidor) ---------- */

function caja(tipo, contenido) {
    const cabecera = Buffer.alloc(8);
    cabecera.writeUInt32BE(8 + contenido.length, 0);
    cabecera.write(tipo, 4, "latin1");
    return Buffer.concat([cabecera, contenido]);
}

// MP4 con ftyp + moov/mvhd que dice durar `segundos`, rellenado hasta `bytes`.
function mp4(segundos, { bytes = 2048, version = 0 } = {}) {
    const escala = 1000;
    let mvhd;
    if (version === 1) {
        mvhd = Buffer.alloc(112);
        mvhd.writeUInt8(1, 0);
        mvhd.writeUInt32BE(escala, 20);
        mvhd.writeBigUInt64BE(BigInt(Math.round(segundos * escala)), 24);
    } else {
        mvhd = Buffer.alloc(100);
        mvhd.writeUInt32BE(escala, 12);
        mvhd.writeUInt32BE(Math.round(segundos * escala), 16);
    }
    const ftyp = caja("ftyp", Buffer.from("isom\0\0\x02\0isomiso2mp41", "latin1"));
    const moov = caja("moov", caja("mvhd", mvhd));
    const relleno = Math.max(0, bytes - ftyp.length - moov.length - 8);
    return Buffer.concat([ftyp, caja("mdat", Buffer.alloc(relleno)), moov]);
}

// WebM con Segment → Info → TimecodeScale + Duration (en ticks de 1 ms).
function webm(segundos) {
    const elemento = (id, contenido) => Buffer.concat([Buffer.from(id), Buffer.from([0x80 | contenido.length]), contenido]);
    const duracion = Buffer.alloc(8);
    duracion.writeDoubleBE(segundos * 1000);
    const info = elemento([0x15, 0x49, 0xa9, 0x66], Buffer.concat([
        elemento([0x2a, 0xd7, 0xb1], Buffer.from([0x0f, 0x42, 0x40])),
        elemento([0x44, 0x89], duracion)
    ]));
    const ebml = elemento([0x1a, 0x45, 0xdf, 0xa3], Buffer.from([0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d]));
    // Segment de tamaño desconocido (como lo escriben los navegadores al grabar).
    const segmento = Buffer.concat([Buffer.from([0x18, 0x53, 0x80, 0x67, 0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]), info]);
    return Buffer.concat([ebml, segmento]);
}

describe("Historias y Klips", () => {
    let entorno;
    let api;
    let ana;
    let beto;
    let carla;
    let moderador;

    // Subida multipart con nombre de archivo propio (el ayudante usa siempre foto.png).
    async function subir(cuenta, ruta, campo, contenido, tipo, extra = {}, nombre = "video.mp4") {
        const form = new FormData();
        if (contenido) form.append(campo, new Blob([contenido], { type: tipo }), nombre);
        for (const [clave, valor] of Object.entries(extra)) form.append(clave, String(valor));
        const respuesta = await fetch(entorno.url + ruta, {
            method: "POST",
            headers: { Authorization: `Bearer ${cuenta.token}` },
            body: form
        });
        return { status: respuesta.status, body: await respuesta.json() };
    }

    const historiaTexto = (cuenta, texto = "Hola ARMY", fondo = "oceano") =>
        api("POST", "/api/historias", { token: cuenta.token, json: { texto, fondo } });
    const subirKlip = (cuenta, segundos, extra = {}) =>
        subir(cuenta, "/api/klips", "video", mp4(segundos), "video/mp4", { texto: "Mi fancam", grupo: "BTS", ...extra });
    const idDe = (cuenta) => cuenta.usuario._id || cuenta.usuario.id;

    before(async () => {
        entorno = await iniciarApi("historias_klips");
        api = crearCliente(entorno.url);
        ana = await registrarUsuario(api, { name: "Ana", username: "ana.klips" });
        beto = await registrarUsuario(api, { name: "Beto", username: "beto.klips" });
        carla = await registrarUsuario(api, { name: "Carla", username: "carla.klips" });
        moderador = await registrarUsuario(api, { name: "Mod", username: "mod.klips" });
        await Usuario.updateOne({ _id: idDe(moderador) }, { rol: "moderador" });
        // Ana y Beto son amigos; Carla no.
        await Usuario.updateOne({ _id: idDe(ana) }, { $addToSet: { amigos: idDe(beto) } });
        await Usuario.updateOne({ _id: idDe(beto) }, { $addToSet: { amigos: idDe(ana) } });
    });

    after(async () => {
        delete process.env.LIMITE_VIDEOS_MB;
        await entorno.detener();
    });

    describe("duración del video (sin API)", () => {
        it("lee la duración de un MP4 (versión 0 y 1 de mvhd)", () => {
            assert.equal(duracionDeBuffer(mp4(12.5)), 12.5);
            assert.equal(duracionDeBuffer(mp4(59, { version: 1 })), 59);
        });

        it("lee la duración de un WebM", () => {
            assert.equal(duracionDeBuffer(webm(14)), 14);
        });

        it("regresa null si no la puede leer", () => {
            assert.equal(duracionDeBuffer(Buffer.from("no soy un video")), null);
            assert.equal(duracionDeBuffer(Buffer.alloc(0)), null);
            // MP4 cortado a la mitad
            assert.equal(duracionDeBuffer(mp4(10).subarray(0, 40)), null);
        });
    });

    describe("historias", () => {
        it("requiere sesión", async () => {
            assert.equal((await api("GET", "/api/historias")).status, 401);
        });

        it("rechaza una historia vacía o con texto demasiado largo", async () => {
            assert.equal((await api("POST", "/api/historias", { token: ana.token, json: {} })).status, 400);
            assert.equal((await historiaTexto(ana, "x".repeat(201))).status, 400);
        });

        it("crea una historia de texto y la muestra primero a su autor", async () => {
            const creada = await historiaTexto(ana);
            assert.equal(creada.status, 201);
            assert.equal(creada.body.historia.tipo, "texto");
            assert.equal(creada.body.historia.fondo, "oceano");

            const lista = (await api("GET", "/api/historias", { token: ana.token })).body.grupos;
            assert.equal(lista[0].autor.username, "ana.klips");
            assert.equal(lista[0].historias[0].totalVistas, 0);
        });

        it("las de amigos van antes que las del resto y se marcan como vistas una sola vez", async () => {
            await historiaTexto(carla, "Hola desde Carla");
            const paraBeto = (await api("GET", "/api/historias", { token: beto.token })).body.grupos;
            assert.deepEqual(paraBeto.map((g) => g.autor.username), ["ana.klips", "carla.klips"]);
            assert.equal(paraBeto[0].esAmigo, true);
            assert.equal(paraBeto[0].todasVistas, false);
            assert.equal(paraBeto[0].historias[0].totalVistas, undefined, "solo el autor ve el conteo");

            const id = paraBeto[0].historias[0].id;
            assert.equal((await api("POST", `/api/historias/${id}/vista`, { token: beto.token })).status, 200);
            assert.equal((await api("POST", `/api/historias/${id}/vista`, { token: beto.token })).status, 200);

            const otraVez = (await api("GET", "/api/historias", { token: beto.token })).body.grupos;
            // Ya vista: pasa después de las que no ha visto.
            assert.deepEqual(otraVez.map((g) => g.autor.username), ["carla.klips", "ana.klips"]);
            assert.equal(otraVez[1].todasVistas, true);

            const vistas = await api("GET", `/api/historias/${id}/vistas`, { token: ana.token });
            assert.equal(vistas.status, 200);
            assert.deepEqual(vistas.body.vistas.map((v) => v.usuario.username), ["beto.klips"]);

            assert.equal((await api("GET", `/api/historias/${id}/vistas`, { token: beto.token })).status, 403);
        });

        it("filtra por autor", async () => {
            const res = await api("GET", "/api/historias?autor=carla.klips", { token: ana.token });
            assert.deepEqual(res.body.grupos.map((g) => g.autor.username), ["carla.klips"]);
        });

        it("acepta una foto", async () => {
            const res = await subir(beto, "/api/historias", "medio", await imagenPng().arrayBuffer(), "image/png", { texto: "Mi album" }, "foto.png");
            assert.equal(res.status, 201);
            assert.equal(res.body.historia.tipo, "imagen");
            assert.match(res.body.historia.medio, /^\/api\/imagenes\//);
        });

        it("acepta un video de hasta 15 s y rechaza uno más largo", async () => {
            const corto = await subir(beto, "/api/historias", "medio", mp4(14.8), "video/mp4");
            assert.equal(corto.status, 201, JSON.stringify(corto.body));
            assert.equal(corto.body.historia.tipo, "video");
            assert.equal(corto.body.historia.duracion, 14.8);

            const largo = await subir(beto, "/api/historias", "medio", mp4(20), "video/mp4");
            assert.equal(largo.status, 400);
            assert.match(largo.body.mensaje, /15 segundos/);
        });

        it("si no puede leer la duración usa la del navegador, también con límite", async () => {
            const sinDuracion = Buffer.from("1a45dfa3 datos que no son un video completo");
            const mala = await subir(carla, "/api/historias", "medio", sinDuracion, "video/webm", { duracion: 30 }, "grabado.webm");
            assert.equal(mala.status, 400);
            const sinNada = await subir(carla, "/api/historias", "medio", sinDuracion, "video/webm", {}, "grabado.webm");
            assert.equal(sinNada.status, 400);
            const buena = await subir(carla, "/api/historias", "medio", sinDuracion, "video/webm", { duracion: 9 }, "grabado.webm");
            assert.equal(buena.status, 201);
        });

        it("rechaza un video de historia de más de 10 MB", async () => {
            const res = await subir(carla, "/api/historias", "medio", mp4(5, { bytes: 11 * 1024 * 1024 }), "video/mp4");
            assert.equal(res.status, 400);
            assert.match(res.body.mensaje, /10 MB/);
        });

        it("solo su autor o la moderación la borran, y se va con todo y video", async () => {
            const creada = await subir(ana, "/api/historias", "medio", mp4(5), "video/mp4");
            const { id, medio } = creada.body.historia;
            const idVideo = medio.split("/").pop();
            assert.ok(await ArchivoVideo.exists({ _id: idVideo }));

            assert.equal((await api("DELETE", `/api/historias/${id}`, { token: beto.token })).status, 403);
            assert.equal((await api("DELETE", `/api/historias/${id}`, { token: ana.token })).status, 200);
            assert.equal(await ArchivoVideo.exists({ _id: idVideo }), null);

            const deCarla = (await historiaTexto(carla, "otra")).body.historia.id;
            assert.equal((await api("DELETE", `/api/historias/${deCarla}`, { token: moderador.token })).status, 200);
        });

        it("a las 24 h deja de verse y la limpieza borra documento y archivo", async () => {
            const creada = await subir(ana, "/api/historias", "medio", mp4(3), "video/mp4");
            const { id, medio } = creada.body.historia;
            await Historia.updateOne({ _id: id }, { expiraEn: new Date(Date.now() - 1000) });

            const lista = (await api("GET", "/api/historias", { token: beto.token })).body.grupos;
            assert.ok(!lista.some((g) => g.historias.some((h) => h.id === id)));
            assert.equal((await api("POST", `/api/historias/${id}/vista`, { token: beto.token })).status, 404);

            assert.ok((await limpiarHistoriasVencidas()) >= 1);
            assert.equal(await Historia.exists({ _id: id }), null);
            assert.equal(await ArchivoVideo.exists({ _id: medio.split("/").pop() }), null);
        });

        it("no deja tener más de 10 historias a la vez", async () => {
            const persona = await registrarUsuario(api, { name: "Muchas" });
            for (let i = 0; i < 10; i++) assert.equal((await historiaTexto(persona, `#${i}`)).status, 201);
            const once = await historiaTexto(persona, "una más");
            assert.equal(once.status, 400);
            assert.match(once.body.mensaje, /10 historias/);
        });

        it("subir una historia avanza la tarea diaria", async () => {
            const tareas = (await api("GET", "/api/tareas", { token: ana.token })).body.tareas;
            const tarea = tareas.find((t) => t.id === "d_historia");
            assert.equal(tarea.progreso, tarea.meta);
        });
    });

    describe("Klips", () => {
        let klipAna;

        it("requiere sesión", async () => {
            assert.equal((await api("GET", "/api/klips")).status, 401);
        });

        it("sube un Klip de hasta 60 s", async () => {
            const res = await subirKlip(ana, 45);
            assert.equal(res.status, 201, JSON.stringify(res.body));
            klipAna = res.body.klip;
            assert.equal(klipAna.duracion, 45);
            assert.equal(klipAna.grupo, "BTS");
            assert.equal(klipAna.autor.username, "ana.klips");
            assert.equal(klipAna.esMio, true);
        });

        it("rechaza Klips largos, sin video, que no son video o que pesan más de 15 MB", async () => {
            const largo = await subirKlip(ana, 70);
            assert.equal(largo.status, 400);
            assert.match(largo.body.mensaje, /60 segundos/);

            assert.equal((await subir(ana, "/api/klips", "video", null, null, { texto: "sin video" })).status, 400);

            const imagen = await subir(ana, "/api/klips", "video", await imagenPng().arrayBuffer(), "image/png", {}, "foto.png");
            assert.equal(imagen.status, 400);
            assert.match(imagen.body.mensaje, /videos/);

            const pesado = await subir(ana, "/api/klips", "video", mp4(10, { bytes: 16 * 1024 * 1024 }), "video/mp4");
            assert.equal(pesado.status, 400);
            assert.match(pesado.body.mensaje, /15 MB/);
        });

        it("el feed se pagina del más nuevo al más viejo", async () => {
            for (let i = 0; i < 9; i++) assert.equal((await subirKlip(beto, 5, { texto: `Klip ${i}` })).status, 201);

            const primera = (await api("GET", "/api/klips", { token: carla.token })).body;
            assert.equal(primera.klips.length, 8);
            assert.equal(primera.klips[0].texto, "Klip 8");
            assert.ok(primera.siguiente);

            const segunda = (await api("GET", `/api/klips?antes=${primera.siguiente}`, { token: carla.token })).body;
            assert.deepEqual(segunda.klips.map((k) => k.texto), ["Klip 0", "Mi fancam"]);
            assert.equal(segunda.siguiente, null);

            const deAna = (await api("GET", "/api/klips?autor=ana.klips", { token: carla.token })).body.klips;
            assert.deepEqual(deAna.map((k) => k.id), [klipAna.id]);
            assert.equal((await api("GET", "/api/klips?antes=xyz", { token: carla.token })).status, 400);
        });

        it("da y quita me gusta, y avisa al autor", async () => {
            const dar = await api("POST", `/api/klips/${klipAna.id}/like`, { token: beto.token });
            assert.deepEqual(dar.body, { meGusta: true, totalLikes: 1 });
            assert.ok(await Notificacion.exists({ destinatario: idDe(ana), enlace: `/klips/${klipAna.id}`, tipo: "like" }));

            const quitar = await api("POST", `/api/klips/${klipAna.id}/like`, { token: beto.token });
            assert.deepEqual(quitar.body, { meGusta: false, totalLikes: 0 });
        });

        it("cuenta reproducciones de otras personas, no las del autor", async () => {
            await api("POST", `/api/klips/${klipAna.id}/reproduccion`, { token: ana.token });
            await api("POST", `/api/klips/${klipAna.id}/reproduccion`, { token: beto.token });
            await api("POST", `/api/klips/${klipAna.id}/reproduccion`, { token: carla.token });
            const klip = (await api("GET", `/api/klips/${klipAna.id}`, { token: ana.token })).body.klip;
            assert.equal(klip.reproducciones, 2);
        });

        it("comentarios: agregar, listar y borrar con permisos", async () => {
            assert.equal((await api("POST", `/api/klips/${klipAna.id}/comentarios`, { token: beto.token, json: { texto: "  " } })).status, 400);

            const nuevo = await api("POST", `/api/klips/${klipAna.id}/comentarios`, { token: beto.token, json: { texto: "¡Qué buen fancam!" } });
            assert.equal(nuevo.status, 201);
            assert.equal(nuevo.body.comentario.autor.username, "beto.klips");
            assert.equal(nuevo.body.totalComentarios, 1);

            const lista = (await api("GET", `/api/klips/${klipAna.id}/comentarios`, { token: carla.token })).body.comentarios;
            assert.deepEqual(lista.map((c) => c.texto), ["¡Qué buen fancam!"]);

            const ruta = `/api/klips/${klipAna.id}/comentarios/${nuevo.body.comentario.id}`;
            assert.equal((await api("DELETE", ruta, { token: carla.token })).status, 403);
            // La dueña del Klip puede borrar comentarios de su Klip.
            assert.equal((await api("DELETE", ruta, { token: ana.token })).status, 200);
            assert.equal((await api("GET", `/api/klips/${klipAna.id}`, { token: ana.token })).body.klip.totalComentarios, 0);
        });

        it("solo su autor edita la descripción", async () => {
            assert.equal((await api("PUT", `/api/klips/${klipAna.id}`, { token: beto.token, json: { texto: "hackeado" } })).status, 403);
            const editado = await api("PUT", `/api/klips/${klipAna.id}`, { token: ana.token, json: { texto: "Fancam editada", grupo: "TWICE" } });
            assert.equal(editado.status, 200);
            assert.equal(editado.body.klip.texto, "Fancam editada");
            assert.equal(editado.body.klip.grupo, "TWICE");
        });

        it("se puede denunciar y la moderación lo oculta", async () => {
            const denuncia = await api("POST", "/api/denuncias", {
                token: carla.token,
                json: { tipo: "klip", objetivo: klipAna.id, motivo: "spam" }
            });
            assert.equal(denuncia.status, 201, JSON.stringify(denuncia.body));

            const cola = (await api("GET", "/api/denuncias", { token: moderador.token })).body.denuncias;
            const enCola = cola.find((d) => d.tipo === "klip");
            assert.equal(enCola.enlace, `/klips/${klipAna.id}`);
            assert.equal(enCola.resumen, "Fancam editada");

            const ocultar = await api("PATCH", `/api/moderacion/contenido/klip/${klipAna.id}`, {
                token: moderador.token,
                json: { ocultar: true, motivo: "Spam" }
            });
            assert.equal(ocultar.status, 200, JSON.stringify(ocultar.body));

            assert.equal((await api("GET", `/api/klips/${klipAna.id}`, { token: carla.token })).status, 404);
            const paraAna = (await api("GET", `/api/klips/${klipAna.id}`, { token: ana.token })).body.klip;
            assert.equal(paraAna.oculta, true);
            const feedCarla = (await api("GET", "/api/klips?autor=ana.klips", { token: carla.token })).body.klips;
            assert.equal(feedCarla.length, 0);
        });

        it("al borrarlo se borra su video de GridFS", async () => {
            const res = await subirKlip(carla, 8);
            const idVideo = res.body.klip.video.split("/").pop();
            assert.ok(await ArchivoVideo.exists({ _id: idVideo }));

            assert.equal((await api("DELETE", `/api/klips/${res.body.klip.id}`, { token: beto.token })).status, 403);
            assert.equal((await api("DELETE", `/api/klips/${res.body.klip.id}`, { token: carla.token })).status, 200);
            assert.equal(await ArchivoVideo.exists({ _id: idVideo }), null);
            assert.equal(await Klip.exists({ _id: res.body.klip.id }), null);
        });

        it("no deja subir videos si ya se llegó al tope de espacio", async () => {
            process.env.LIMITE_VIDEOS_MB = "0.001";
            try {
                const res = await subirKlip(carla, 8);
                assert.equal(res.status, 507);
                assert.match(res.body.mensaje, /espacio/);
                assert.equal(await Klip.countDocuments({ autor: idDe(carla) }), 0);
            } finally {
                delete process.env.LIMITE_VIDEOS_MB;
            }
        });

        it("subir un Klip avanza la tarea semanal", async () => {
            const tareas = (await api("GET", "/api/tareas", { token: ana.token })).body.tareas;
            const tarea = tareas.find((t) => t.id === "s_klip");
            assert.equal(tarea.progreso, 1);
        });
    });
});
