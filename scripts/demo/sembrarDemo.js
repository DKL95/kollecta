/* ==========================================================================
   Carga datos de DEMOSTRACIÓN usando la API (igual que lo haría una persona):
   cuentas, amistades, publicaciones con dibujos, comentarios con emojis,
   colecciones, productos, órdenes en todos los estados, calificaciones,
   una disputa abierta, un chat grupal y una denuncia pendiente.

   Todo queda marcado: nombre "· Demo" y correo @demo.kollecta.
   Se borra con:  npm run limpiar-demo

   Uso:
     DEMO_URL=http://127.0.0.1:3999 node scripts/demo/sembrarDemo.js     (local)
     DEMO_URL=https://kollecta.onrender.com node scripts/demo/sembrarDemo.js
   Las contraseñas quedan en scripts/demo/.cuentas-demo.json (ignorado por Git).
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { generar, SALIDA: CARPETA_DIBUJOS, CATALOGO } = require("./dibujos");

const BASE = (process.env.DEMO_URL || "http://127.0.0.1:3999").replace(/\/$/, "");
const DOMINIO = "demo.kollecta";
const ARCHIVO_CUENTAS = path.join(__dirname, ".cuentas-demo.json");

const GIF_DEMO = process.env.DEMO_GIFS !== "0";

const CUENTAS = [
    { u: "sofi.once", nombre: "Sofía Ramírez", bias: "TWICE", bio: "ONCE desde 2016 💖 Coleccionista de photocards y lightsticks.", avatar: "pc-rosa" },
    { u: "dani.army", nombre: "Daniel Ortega", bias: "BTS", bio: "ARMY 💜 Vendo lo repetido, cambio por versiones que me faltan.", avatar: "album-lila" },
    { u: "vale.blink", nombre: "Valeria Cruz", bias: "BLACKPINK", bio: "BLINK de Monterrey 🖤🩷 Siempre buscando POBs.", avatar: "llavero-oso" },
    { u: "mau.stay", nombre: "Mauricio Leal", bias: "Stray Kids", bio: "STAY 🐺 Fan de los álbumes en todas sus versiones.", avatar: null },
    { u: "caro.carat", nombre: "Carolina Méndez", bias: "SEVENTEEN", bio: "CARAT 💎 Lightsticks y merch de conciertos.", avatar: "ls-esfera" },
    { u: "lu.bunnies", nombre: "Lucía Herrera", bias: "NewJeans", bio: "Bunnies 🐰 Coleccionando todo lo de NewJeans.", avatar: "peluche-conejo" },
    { u: "emi.my", nombre: "Emiliano Ruiz", bias: "aespa", bio: "MY 🦋 Posters y photocards. Envíos a todo México.", avatar: null },
    { u: "ana.atiny", nombre: "Ana Torres", bias: "ATEEZ", bio: "ATINY 🏴‍☠️ Intercambios justos y rápidos.", avatar: "llavero-gato" }
];

const PNG = (nombre) => new Blob([fs.readFileSync(path.join(CARPETA_DIBUJOS, `${nombre}.png`))], { type: "image/png" });

let resumen = { ok: 0, pasos: [] };

async function api(metodo, ruta, { token, json, form } = {}) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    let body;
    if (json !== undefined) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(json);
    } else if (form) {
        body = new FormData();
        for (const [k, v] of Object.entries(form)) {
            if (v === undefined || v === null) continue;
            if (Array.isArray(v)) v.forEach((x) => body.append(k, x, `${k}.png`));
            else if (v instanceof Blob) body.append(k, v, `${k}.png`);
            else body.append(k, String(v));
        }
    }
    for (let intento = 0; intento < 3; intento++) {
        const r = await fetch(BASE + ruta, { method: metodo, headers, body });
        const data = await r.json().catch(() => ({}));
        if (r.status >= 500 && intento < 2) {
            await new Promise((res) => setTimeout(res, 1500));
            continue;
        }
        if (!r.ok) throw new Error(`${metodo} ${ruta} → ${r.status} ${JSON.stringify(data).slice(0, 200)}`);
        resumen.ok++;
        return data;
    }
}

const paso = (texto) => {
    resumen.pasos.push(texto);
    console.log("•", texto);
};

async function main() {
    if (!fs.existsSync(path.join(CARPETA_DIBUJOS, "album-rosa.png")) || fs.readdirSync(CARPETA_DIBUJOS).length < Object.keys(CATALOGO).length) {
        console.log("Generando dibujos…");
        generar();
    }

    const previas = fs.existsSync(ARCHIVO_CUENTAS) ? JSON.parse(fs.readFileSync(ARCHIVO_CUENTAS, "utf8")) : {};
    if (previas[BASE] && !process.argv.includes("--forzar")) {
        throw new Error(`Ya se cargó la demo en ${BASE}. Bórrala con npm run limpiar-demo o usa --forzar.`);
    }
    const password = crypto.randomBytes(9).toString("base64url");

    // Despierta el servidor (Render se duerme).
    await fetch(BASE + "/api/auth/me").catch(() => {});

    // ---------- Cuentas ----------
    const U = {};
    for (const c of CUENTAS) {
        // Si el nombre de usuario ya existe (cuenta real o demo anterior), se prueba otra variante.
        let datos = null;
        for (const sufijo of ["", "_mx", "_kpop", "_demo"]) {
            const username = c.u + sufijo;
            try {
                datos = await api("POST", "/api/auth/register", {
                    form: {
                        name: `${c.nombre} · Demo`,
                        username,
                        email: `${username}@${DOMINIO}`,
                        password,
                        bias: c.bias,
                        descripcion: c.bio,
                        fotoPerfil: c.avatar ? PNG(c.avatar) : undefined
                    }
                });
                break;
            } catch (error) {
                if (!/ya está registrado/.test(error.message)) throw error;
            }
        }
        if (!datos) throw new Error(`No hay nombre de usuario libre para ${c.u}`);
        U[c.u] = { token: datos.token, id: datos.usuario.id || datos.usuario._id, username: datos.usuario.username, ...c };
    }
    fs.writeFileSync(
        ARCHIVO_CUENTAS,
        JSON.stringify({ ...previas, [BASE]: { password, cuentas: Object.values(U).map((u) => `${u.username}@${DOMINIO}`), fecha: new Date().toISOString() } }, null, 2)
    );
    paso(`${CUENTAS.length} cuentas demo creadas`);

    const t = (u) => U[u].token;
    const pruebaGif = GIF_DEMO ? await api("GET", "/api/gifs?limite=1", { token: t("sofi.once") }).catch(() => null) : null;
    const gifs = pruebaGif?.gifs?.length ? (await api("GET", "/api/gifs?q=kpop&limite=10", { token: t("sofi.once") })).gifs : [];

    // ---------- Amistades ----------
    const pares = [["sofi.once", "dani.army"], ["sofi.once", "vale.blink"], ["vale.blink", "lu.bunnies"], ["mau.stay", "caro.carat"], ["dani.army", "emi.my"], ["ana.atiny", "vale.blink"], ["caro.carat", "lu.bunnies"], ["sofi.once", "lu.bunnies"]];
    for (const [a, b] of pares) {
        const r = await api("POST", `/api/usuarios/${U[b].username}/solicitud`, { token: t(a) });
        await api("POST", `/api/usuarios/solicitudes/${r.solicitud.id}/aceptar`, { token: t(b) });
    }
    await api("POST", `/api/usuarios/${U["emi.my"].username}/solicitud`, { token: t("ana.atiny") }); // queda pendiente
    paso(`${pares.length} amistades y 1 solicitud pendiente`);

    // ---------- Publicaciones, comentarios y likes ----------
    const publicaciones = [
        ["sofi.once", "TWICE", "¡Por fin completé el set de photocards de esta era! 😭💖 Gracias a todas las que me ayudaron con los intercambios.", ["escena-coleccion"]],
        ["dani.army", "BTS", "Unboxing del álbum que me llegó hoy 📦✨ La versión con photobook está preciosa.", ["escena-unboxing", "album-lila"]],
        ["vale.blink", "BLACKPINK", "¿Alguien más va al concierto? Armemos grupo para ir juntas 🖤🩷🎤", ["escena-concierto"]],
        ["lu.bunnies", "NewJeans", "Mi nuevo peluche oficial 🐰 está demasiado suave, no lo suelto.", ["peluche-conejo"]],
        ["caro.carat", "SEVENTEEN", "Tip para cuidar sus lightsticks: quiten las pilas si no los van a usar en mucho tiempo 🔦💎", ["ls-esfera"]],
        ["mau.stay", "Stray Kids", "Comparando versiones del álbum, ¿cuál es su favorita? 🐺", ["album-noche", "album-cielo"]],
        ["emi.my", "aespa", "Poster nuevo para mi cuarto 🦋 ya casi no queda pared libre jaja", ["poster-noche"]],
        ["ana.atiny", "ATEEZ", "Busco intercambiar photocards repetidas, tengo varias 🏴‍☠️ manden DM o vean mis anuncios en el marketplace.", ["pc-limon", "pc-menta"]]
    ];
    const P = [];
    for (const [u, grupo, texto, imgs] of publicaciones) {
        const r = await api("POST", "/api/publicaciones", { token: t(u), form: { texto, grupo, imagenes: imgs.map(PNG) } });
        P.push({ id: r.publicacion.id, autor: u });
    }
    if (gifs[0]) {
        const r = await api("POST", "/api/publicaciones", { token: t("vale.blink"), form: { texto: "Yo cuando llega mi pedido 📦", grupo: "BLACKPINK", gif: JSON.stringify(gifs[0]) } });
        P.push({ id: r.publicacion.id, autor: "vale.blink" });
    }

    const comentarios = [
        [0, "vale.blink", "¡Quedó hermoso! 😍 Me faltan dos de ese set."],
        [0, "lu.bunnies", "Felicidades 🎉🎉"],
        [1, "emi.my", "Esa versión es la mejor 💜"],
        [2, "sofi.once", "¡Yo voy! 🙋‍♀️ Hagamos el grupo."],
        [2, "ana.atiny", "Yo también voy, ¿de qué ciudad son?"],
        [3, "vale.blink", "Necesito uno igual 🐰💕"],
        [4, "mau.stay", "Gracias por el tip 🙏"],
        [5, "caro.carat", "La versión azul sin duda 💙"],
        [5, "dani.army", "Yo voto por la oscura 🖤"],
        [7, "vale.blink", "Te mandé mensaje 👀"]
    ];
    let primerComentario = null;
    for (const [i, u, texto] of comentarios) {
        const r = await api("POST", `/api/publicaciones/${P[i].id}/comentarios`, { token: t(u), json: { texto, gif: i === 0 && gifs[1] ? gifs[1] : undefined } });
        if (!primerComentario) primerComentario = { pub: P[i].id, id: r.comentario.id };
    }
    await api("POST", `/api/publicaciones/${primerComentario.pub}/comentarios/${primerComentario.id}/respuestas`, {
        token: t("sofi.once"),
        json: { texto: "¡Te ayudo a conseguirlas! 💪✨" }
    });
    const likes = [[0, ["dani.army", "vale.blink", "lu.bunnies", "caro.carat"]], [1, ["sofi.once", "emi.my"]], [2, ["sofi.once", "lu.bunnies", "ana.atiny"]], [3, ["vale.blink", "sofi.once", "caro.carat"]], [4, ["mau.stay"]], [5, ["caro.carat", "dani.army"]], [6, ["dani.army"]], [7, ["vale.blink", "emi.my"]]];
    for (const [i, quienes] of likes) for (const u of quienes) await api("POST", `/api/publicaciones/${P[i].id}/like`, { token: t(u) });
    paso(`${P.length} publicaciones, ${comentarios.length} comentarios, 1 respuesta y likes`);

    // ---------- Colecciones ----------
    const piezas = {
        "sofi.once": [["Photocard Momo (Feel Special)", "TWICE", "Photocard", "pc-rosa"], ["Lightstick Candybong", "TWICE", "Lightstick", "ls-corazon"]],
        "dani.army": [["Álbum Proof (Standard)", "BTS", "Álbum", "album-lila"]],
        "vale.blink": [["Llavero oficial Born Pink", "BLACKPINK", "Merch", "llavero-oso"]],
        "mau.stay": [["Álbum 5-STAR (versión digipack)", "Stray Kids", "Álbum", "album-noche"]],
        "caro.carat": [["Photocard Mingyu (FML)", "SEVENTEEN", "Photocard", "pc-cielo"]],
        "lu.bunnies": [["Bolsa tote Bunnies", "NewJeans", "Merch", "bolsa-cielo"]],
        "emi.my": [["Poster Armageddon", "aespa", "Poster", "poster-rosa"]],
        "ana.atiny": [["Photocard Hongjoong (Golden Hour)", "ATEEZ", "Photocard", "pc-menta"], ["Photocard San (The World)", "ATEEZ", "Photocard", "pc-rojo"]]
    };
    const C = {};
    for (const [u, lista] of Object.entries(piezas)) {
        C[u] = [];
        for (const [titulo, grupo, categoria, img] of lista) {
            const r = await api("POST", "/api/coleccion/articulos", { token: t(u), form: { titulo, grupo, categoria, descripcion: "Pieza de mi colección personal ✨", imagenes: [PNG(img)] } });
            C[u].push(r.articulo._id);
        }
    }
    paso("Colecciones con 10 piezas");

    // ---------- Productos ----------
    const productos = [
        ["dani.army", "Álbum BE (Deluxe) sellado", "BTS", "Álbum", "Nuevo / sellado", 650, false, "album-lila"],
        ["sofi.once", "Photocard Nayeon (Formula of Love)", "TWICE", "Photocard", "Como nuevo", 180, true, "pc-rosa"],
        ["caro.carat", "Lightstick Carat Bong ver. 3", "SEVENTEEN", "Lightstick", "Buen estado", 1100, false, "ls-esfera"],
        ["emi.my", "Poster oficial Drama", "aespa", "Poster", "Nuevo / sellado", 220, false, "poster-noche"],
        ["vale.blink", "Photocard Jisoo (Born Pink)", "BLACKPINK", "Photocard", "Como nuevo", 250, true, "pc-lila"],
        ["mau.stay", "Álbum MAXIDENT (versión T)", "Stray Kids", "Álbum", "Buen estado", 480, false, "album-cielo"],
        ["lu.bunnies", "Peluche oficial Tokki", "NewJeans", "Merch", "Nuevo / sellado", 520, false, "peluche-oso"],
        ["ana.atiny", "Llavero acrílico ATEEZ", "ATEEZ", "Merch", "Nuevo / sellado", 150, false, "llavero-gato"],
        ["caro.carat", "Sudadera oficial Follow Tour", "SEVENTEEN", "Merch", "Como nuevo", 900, false, "sudadera-lila"],
        ["dani.army", "Photocard Jimin (Face)", "BTS", "Photocard", "Como nuevo", 300, false, "pc-limon"],
        ["sofi.once", "Álbum Ready To Be (versión digital code)", "TWICE", "Álbum", "Nuevo / sellado", 420, true, "album-rosa"],
        ["emi.my", "Photocard Karina (Whiplash)", "aespa", "Photocard", "Como nuevo", 350, true, "pc-cielo"],
        ["lu.bunnies", "Álbum Get Up (Bunny Beach Bag)", "NewJeans", "Álbum", "Nuevo / sellado", 700, false, "album-menta"]
    ];
    const PR = [];
    for (const [u, titulo, grupo, categoria, condicion, precio, intercambio, img] of productos) {
        const r = await api("POST", "/api/productos", {
            token: t(u),
            form: { titulo, grupo, categoria, condicion, precio, disponibleCompra: "true", disponibleIntercambio: String(intercambio), busca: intercambio ? "Photocards de mi bias 💖" : "", descripcion: "Original, guardado en funda. Envío o entrega en persona.", imagenes: [PNG(img)] }
        });
        PR.push({ id: r.producto.id || r.producto._id, vendedor: u, titulo });
    }
    paso(`${PR.length} productos en el marketplace`);

    // ---------- Órdenes ----------
    const orden = async (comprador, i, extra = {}) =>
        (await api("POST", "/api/ordenes", { token: t(comprador), json: { productoId: PR[i].id, tipo: "compra", entrega: "envio", nota: "¡Hola! Me interesa 😊", ...extra } })).orden;
    const estado = (u, o, e) => api("PATCH", `/api/ordenes/${o.id || o._id}/estado`, { token: t(u), json: { estado: e } });
    const calificar = (u, o, estrellas, comentario) => api("POST", `/api/ordenes/${o.id || o._id}/calificacion`, { token: t(u), json: { estrellas, comentario } });

    async function completa(comprador, i, estrellas, comentario, extra) {
        const vendedor = PR[i].vendedor;
        const o = await orden(comprador, i, extra);
        await estado(vendedor, o, "aceptada");
        if ((extra?.entrega || "envio") === "envio") await estado(vendedor, o, "enviada");
        await estado(comprador, o, "recibida");
        await estado(vendedor, o, "completada");
        await calificar(comprador, o, estrellas, comentario);
        return o;
    }

    await completa("sofi.once", 0, 5, "Llegó perfecto y muy bien empacado 💜 ¡Súper recomendado!");
    await completa("vale.blink", 1, 4, "Todo bien, la entrega fue puntual 🙂", { entrega: "en_persona" });
    await completa("mau.stay", 2, 5, "Funciona perfecto, gracias por las pilas extra 🔦");
    await completa("lu.bunnies", 3, 3, "Llegó bien pero tardó un poco en enviarlo.");
    await completa("dani.army", 10, 5, "Excelente vendedora 💖", { entrega: "en_persona" });
    // Intercambio: Ana ofrece una photocard de su colección por la de Valeria.
    const inter = await (async () => {
        const o = (await api("POST", "/api/ordenes", { token: t("ana.atiny"), json: { productoId: PR[4].id, tipo: "intercambio", entrega: "en_persona", nota: "¿Te interesa cambiarla por mi San? 🏴‍☠️", ofrecidos: [C["ana.atiny"][1]] } })).orden;
        await estado("vale.blink", o, "aceptada");
        await estado("ana.atiny", o, "recibida");
        await estado("vale.blink", o, "completada");
        await calificar("ana.atiny", o, 5, "Intercambio rapidísimo, ¡gracias! ✨");
        return o;
    })();
    void inter;

    const enCurso = await orden("caro.carat", 5);
    await estado("mau.stay", enCurso, "aceptada");
    await estado("mau.stay", enCurso, "enviada");

    await orden("dani.army", 6); // pendiente

    const rechazada = await orden("emi.my", 7);
    await estado("ana.atiny", rechazada, "rechazada");

    const retirada = await orden("sofi.once", 8);
    await api("DELETE", `/api/ordenes/${retirada.id || retirada._id}`, { token: t("sofi.once") });

    const disputada = await orden("lu.bunnies", 9);
    await estado("dani.army", disputada, "aceptada");
    await estado("dani.army", disputada, "enviada");
    await api("POST", `/api/ordenes/${disputada.id || disputada._id}/disputa`, {
        token: t("lu.bunnies"),
        json: { motivo: "no_llego", detalle: "Pasaron 10 días desde que se marcó como enviada y la guía no tiene movimiento." }
    });
    paso("Órdenes: 5 compras y 1 intercambio completados con reseña, 1 enviada, 1 pendiente, 1 rechazada, 1 retirada y 1 en disputa");

    // ---------- Chats ----------
    const conv = await api("POST", `/api/mensajes/conversaciones/${U["vale.blink"].id}`, { token: t("sofi.once") });
    const charla = [
        ["sofi.once", "¡Holaaa! ¿Siempre sí vas al concierto? 🎤"],
        ["vale.blink", "¡Sí! Ya tengo boleto 🖤🩷"],
        ["sofi.once", "Llevo mi lightstick, nos vemos en la fila 💖"]
    ];
    for (const [u, texto] of charla) await api("POST", `/api/mensajes/${conv._id}`, { token: t(u), json: { texto } });
    if (gifs[2]) await api("POST", `/api/mensajes/${conv._id}`, { token: t("vale.blink"), json: { gif: gifs[2] } });

    const grupo = await api("POST", "/api/mensajes/grupos", {
        token: t("vale.blink"),
        json: { nombre: "Concierto MTY 🎤", participantes: [U["sofi.once"].id, U["lu.bunnies"].id, U["ana.atiny"].id] }
    });
    const idGrupo = grupo._id || grupo.conversacion?._id;
    for (const [u, texto] of [["vale.blink", "Hice este grupo para organizarnos 🙌"], ["lu.bunnies", "¡Qué emoción! 🐰✨"], ["ana.atiny", "Yo llevo pancartas 🏴‍☠️"], ["sofi.once", "Y yo snacks 🍓🍒"]]) {
        await api("POST", `/api/mensajes/${idGrupo}`, { token: t(u), json: { texto } });
    }
    paso("Chat directo y chat grupal con emojis");

    // ---------- Denuncia pendiente ----------
    const spam = await api("POST", "/api/publicaciones", { token: t("mau.stay"), form: { texto: "Sigan mi otra cuenta, vendo TODO baratísimo, depósito por adelantado 🔥🔥🔥", grupo: "Stray Kids" } });
    await api("POST", "/api/denuncias", { token: t("caro.carat"), json: { tipo: "publicacion", objetivo: spam.publicacion.id, motivo: "spam", detalle: "Parece un intento de estafa (pide depósito por adelantado)." } });
    paso("1 denuncia pendiente para la cola de moderación");

    console.log(`\nListo: ${resumen.ok} peticiones a ${BASE}. Contraseñas en ${path.relative(process.cwd(), ARCHIVO_CUENTAS)}.`);
}

main().catch((error) => {
    console.error("\nERROR:", error.message);
    process.exit(1);
});
