import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { formatMoney, getInitials, timeAgo } from "../frontend/src/utils/format.js";
import { categoryClass, categoryIcon, CATEGORY_ICON } from "../frontend/src/utils/categories.js";
import { CATEGORIES } from "../frontend/src/data/catalogo.js";
import { adaptarGrupo } from "../frontend/src/utils/grupos.js";
import { COLORES_BANNER, TEXTURAS_BANNER, normalizarBanner } from "../frontend/src/utils/banner.js";
import { adaptarProducto, modalidad } from "../frontend/src/utils/coleccion.js";
import { accionesDisponibles } from "../frontend/src/utils/ordenes.js";
import * as avatarFront from "../frontend/src/utils/avatar.js";
import { ESTAMPITAS as ESTAMPITAS_FRONT, SERIES as SERIES_FRONT, RAREZAS as RAREZAS_FRONT, numeroDe } from "../frontend/src/utils/estampitas.js";
import { JUEGOS as JUEGOS_FRONT, formatearPuntaje } from "../frontend/src/utils/juegos.js";
import * as historiasFront from "../frontend/src/utils/historias.js";

describe("Frontend: utilidades de formato", () => {
    it("formatMoney usa formato de México", () => {
        assert.equal(formatMoney(1150), "$1,150");
        assert.equal(formatMoney(0), "$0");
        assert.equal(formatMoney("280"), "$280");
    });

    it("getInitials usa el username, luego el nombre, y si no hay nada 'U'", () => {
        assert.equal(getInitials({ username: "derek.once", nombre: "Derek" }), "DE");
        assert.equal(getInitials({ nombre: "mina" }), "MI");
        assert.equal(getInitials(null), "U");
        assert.equal(getInitials({}), "U");
    });

    it("timeAgo describe fechas relativas", () => {
        const haceSegundos = (s) => new Date(Date.now() - s * 1000).toISOString();
        assert.equal(timeAgo(haceSegundos(10)), "justo ahora");
        assert.equal(timeAgo(haceSegundos(5 * 60)), "hace 5 min");
        assert.equal(timeAgo(haceSegundos(3 * 3600)), "hace 3 h");
        assert.equal(timeAgo(haceSegundos(86400)), "hace 1 día");
        assert.equal(timeAgo(haceSegundos(3 * 86400)), "hace 3 días");
    });

    it("las categorías tienen ícono y clase, con valor por defecto", () => {
        assert.equal(categoryIcon("Álbum"), "disc");
        assert.equal(categoryIcon("Desconocida"), "card");
        assert.equal(categoryClass("Álbum"), "thumb--album");
        assert.equal(categoryClass("Desconocida"), "thumb--photocard");
    });
});

describe("Frontend: catálogo consistente", () => {
    it("las categorías del formulario son las mismas que acepta el backend", async () => {
        const { createRequire } = await import("node:module");
        const require = createRequire(import.meta.url);
        const Coleccion = require("../models/Coleccion.js");
        const enumBackend = Coleccion.schema.path("articulos").schema.path("categoria").enumValues;
        assert.deepEqual([...CATEGORIES].sort(), [...enumBackend].sort());
    });

    it("todas las categorías tienen ícono", () => {
        for (const categoria of CATEGORIES) {
            assert.ok(CATEGORY_ICON[categoria], categoria);
        }
    });

    it("las rutas de imagen de los grupos fijos son absolutas (empiezan con /) para funcionar en rutas anidadas", async () => {
        const { createRequire } = await import("node:module");
        const require = createRequire(import.meta.url);
        const { GRUPOS_BASE } = require("../data/gruposBase.js");
        for (const item of GRUPOS_BASE.map(adaptarGrupo)) {
            assert.ok(item.img.startsWith("/assets/img/groups/"), item.img);
            assert.ok(item.cover.startsWith("/assets/img/covers/"), item.cover);
        }
    });

    it("los colores y texturas del banner son los mismos que acepta el backend", async () => {
        const { createRequire } = await import("node:module");
        const require = createRequire(import.meta.url);
        const Usuario = require("../models/Usuario.js");
        assert.deepEqual(Object.keys(COLORES_BANNER).sort(), [...Usuario.BANNER_COLORES].sort());
        assert.deepEqual(Object.keys(TEXTURAS_BANNER).sort(), [...Usuario.BANNER_TEXTURAS].sort());
    });

    it("cada textura se desliza un mosaico completo por vuelta (la animación no da saltos)", () => {
        for (const [id, t] of Object.entries(TEXTURAS_BANNER)) {
            if (t.imagen === "none") continue;
            const [ancho, alto] = t.tamano.split(" ").map((v) => Math.abs(parseFloat(v)));
            const [x, y] = t.mover.split(" ").map((v) => Math.abs(parseFloat(v)));
            assert.ok((x === 0 || x === ancho) && (y === 0 || y === alto) && x + y > 0, id);
        }
    });

    it("un banner vacío o con valores viejos usa el diseño por defecto", () => {
        assert.deepEqual(normalizarBanner(undefined), { color: "kollecta", textura: "ninguna", logo: "", imagen: "", animado: false });
        assert.equal(normalizarBanner({ color: "arcoiris", textura: "puntos" }).color, "kollecta");
        assert.equal(normalizarBanner({ color: "arcoiris", textura: "puntos" }).textura, "puntos");
    });

    it("adapta un grupo aprobado de la API al formato de las tarjetas", () => {
        const grupo = adaptarGrupo({
            _id: "g1", nombre: "QWER", fandom: "Bawi", agencia: "", integrantes: null, debut: 2023,
            imagen: "/api/imagenes/x", portada: "", color: "linear-gradient(red,blue)", iniciales: "QWER", base: false
        });
        assert.equal(grupo.id, "g1");
        assert.equal(grupo.name, "QWER");
        assert.equal(grupo.img, "/api/imagenes/x");
        assert.equal(grupo.members, null);
        assert.equal(grupo.base, false);
    });
});

describe("Frontend: compra-venta", () => {
    it("adapta un producto del marketplace al formato de la tarjeta", () => {
        const tarjeta = adaptarProducto({
            _id: "p1", titulo: "PC Nayeon", grupo: "TWICE", categoria: "Photocard", imagenes: ["/api/imagenes/x"],
            precio: 250, condicion: "Como nuevo", estado: "activo", disponibleCompra: true, disponibleIntercambio: true,
            vendedor: { username: "mina" }, esMio: false
        });
        assert.equal(tarjeta.id, "p1");
        assert.equal(tarjeta.price, 250);
        assert.equal(tarjeta.mode, "Ambos");
        assert.equal(tarjeta.tag, "Como nuevo");
        assert.equal(tarjeta.seller, "mina");
        assert.equal(adaptarProducto({ estado: "reservado", condicion: "Como nuevo" }).tag, "Apartado");
    });

    it("la modalidad sale de la disponibilidad", () => {
        assert.equal(modalidad({ disponibleCompra: true }), "Venta");
        assert.equal(modalidad({ disponibleIntercambio: true }), "Intercambio");
        assert.equal(modalidad({ disponibleCompra: true, disponibleIntercambio: true }), "Ambos");
    });

    it("cada quien ve solo las acciones que el backend le permite", () => {
        const estados = (o) => accionesDisponibles(o).map((a) => a.estado);
        assert.deepEqual(estados({ estado: "pendiente", miRol: "vendedor" }), ["aceptada", "rechazada"]);
        assert.deepEqual(estados({ estado: "pendiente", miRol: "comprador" }), ["retirar"]);
        assert.deepEqual(estados({ estado: "aceptada", miRol: "vendedor", entrega: "envio" }), ["enviada", "cancelada"]);
        assert.deepEqual(estados({ estado: "aceptada", miRol: "comprador", entrega: "envio" }), ["cancelada"]);
        assert.deepEqual(estados({ estado: "aceptada", miRol: "comprador", entrega: "en_persona" }), ["recibida", "cancelada"]);
        assert.deepEqual(estados({ estado: "recibida", miRol: "vendedor" }), ["completada"]);
        assert.deepEqual(estados({ estado: "completada", miRol: "comprador" }), []);
        assert.deepEqual(estados({ estado: "pendiente", miRol: null }), [], "moderación solo mira");
    });
});

describe("Frontend: avatar y stickers", () => {
    const cargarBackend = async () => {
        const { createRequire } = await import("node:module");
        return createRequire(import.meta.url)("../models/avatar.js");
    };

    it("las opciones del avatar son las mismas que acepta el backend", async () => {
        const back = await cargarBackend();
        assert.deepEqual(Object.keys(avatarFront.OPCIONES_AVATAR).sort(), Object.keys(back.OPCIONES_AVATAR).sort());
        for (const [clave, valores] of Object.entries(back.OPCIONES_AVATAR)) {
            assert.deepEqual(Object.keys(avatarFront.OPCIONES_AVATAR[clave]).sort(), [...valores].sort(), clave);
        }
        assert.deepEqual(avatarFront.AVATAR_INICIAL, back.AVATAR_INICIAL);
        assert.deepEqual(Object.keys(avatarFront.EXPRESIONES).sort(), [...back.EXPRESIONES].sort());
        assert.deepEqual(Object.keys(avatarFront.GESTOS).sort(), [...back.GESTOS].sort());
        assert.equal(avatarFront.MAX_TEXTO_STICKER, back.MAX_TEXTO_STICKER);
    });

    it("los stickers básicos usan expresiones y gestos válidos y textos cortos", () => {
        const ids = new Set();
        for (const s of avatarFront.STICKERS_BASE) {
            assert.ok(avatarFront.EXPRESIONES[s.expresion], s.id);
            assert.ok(avatarFront.GESTOS[s.gesto], s.id);
            assert.ok(s.texto.length <= avatarFront.MAX_TEXTO_STICKER, s.id);
            assert.ok(!ids.has(s.id), `id repetido: ${s.id}`);
            ids.add(s.id);
        }
    });

    it("completarAvatar rellena lo que falta o no existe", () => {
        const a = avatarFront.completarAvatar({ cabello: "bob", piel: "verde-alien" });
        assert.equal(a.cabello, "bob");
        assert.equal(a.piel, avatarFront.AVATAR_INICIAL.piel);
        assert.deepEqual(avatarFront.completarAvatar(null), avatarFront.AVATAR_INICIAL);
    });

    it("avatarAleatorio siempre da opciones válidas", () => {
        for (let i = 0; i < 50; i++) {
            const a = avatarFront.avatarAleatorio();
            for (const [clave, opciones] of Object.entries(avatarFront.OPCIONES_AVATAR)) assert.ok(opciones[a[clave]], clave);
        }
    });

    it("mezclar combina colores hex", () => {
        assert.equal(avatarFront.mezclar("#000000", "#ffffff", 0.5), "#808080");
        assert.equal(avatarFront.mezclar("#ff0000", "#0000ff", 0), "#ff0000");
    });
});

describe("Frontend: estampitas y minijuegos", () => {
    const requerir = async (ruta) => {
        const { createRequire } = await import("node:module");
        return createRequire(import.meta.url)(ruta);
    };

    it("las estampitas (id, serie y rareza) son las mismas que en el backend", async () => {
        const back = await requerir("../models/estampitas.js");
        assert.deepEqual(
            ESTAMPITAS_FRONT.map(({ id, serie, rareza }) => ({ id, serie, rareza })),
            back.ESTAMPITAS
        );
        assert.deepEqual(Object.keys(SERIES_FRONT), back.SERIES);
        assert.deepEqual(Object.keys(RAREZAS_FRONT), back.ORDEN_RAREZAS);
    });

    it("cada estampita tiene nombre, descripción y número", () => {
        ESTAMPITAS_FRONT.forEach((e, i) => {
            assert.ok(e.nombre && e.descripcion, e.id);
            assert.equal(numeroDe(e.id), i + 1);
        });
    });

    it("cada estampita tiene su dibujo", async () => {
        const fuente = (await import("node:fs")).readFileSync(new URL("../frontend/src/components/EstampitaArte.jsx", import.meta.url), "utf8");
        for (const e of ESTAMPITAS_FRONT) assert.ok(fuente.includes(`  ${e.id}:`), `falta el dibujo de ${e.id}`);
    });

    it("los juegos son los mismos que acepta el backend", async () => {
        const Marcador = await requerir("../models/Marcador.js");
        const { LIMITES } = await requerir("../controllers/juegoController.js");
        assert.deepEqual(Object.keys(JUEGOS_FRONT).sort(), [...Marcador.JUEGOS].sort());
        assert.deepEqual(Object.keys(LIMITES).sort(), [...Marcador.JUEGOS].sort());
        assert.equal(formatearPuntaje("tiendita", 1500), "$1,500");
        assert.equal(formatearPuntaje("snake", 12), "12 pts");
    });

    it("historias y Klips: mismos fondos y límites que el backend", async () => {
        const Historia = await requerir("../models/Historia.js");
        const Klip = await requerir("../models/Klip.js");
        const corto = await requerir("../middleware/uploadCorto.js");
        assert.deepEqual(historiasFront.FONDOS_HISTORIA.map((f) => f.id), Historia.FONDOS_HISTORIA);
        assert.equal(historiasFront.MAX_TEXTO_HISTORIA, Historia.MAX_TEXTO_HISTORIA);
        assert.equal(historiasFront.MAX_TEXTO_KLIP, Klip.MAX_TEXTO_KLIP);
        assert.equal(historiasFront.MAX_SEGUNDOS_HISTORIA, corto.MAX_SEGUNDOS_HISTORIA);
        assert.equal(historiasFront.MAX_SEGUNDOS_KLIP, corto.MAX_SEGUNDOS_KLIP);
        assert.equal(historiasFront.MAX_MB_KLIP * 1024 * 1024, corto.MAX_TAMANO_KLIP);
        assert.equal(historiasFront.MAX_MB_VIDEO_HISTORIA * 1024 * 1024, corto.MAX_TAMANO_VIDEO_HISTORIA);
        assert.equal(historiasFront.fondoCss("nada"), historiasFront.FONDOS_HISTORIA[0].css);
        assert.equal(historiasFront.formatoConteo(999), "999");
        assert.equal(historiasFront.formatoConteo(1500), "1.5 mil");
        assert.equal(historiasFront.formatoConteo(2_000_000), "2 M");
    });
});
