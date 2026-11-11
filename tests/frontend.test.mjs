import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { formatMoney, getInitials, timeAgo } from "../frontend/src/utils/format.js";
import { categoryClass, categoryIcon, CATEGORY_ICON } from "../frontend/src/utils/categories.js";
import { CATEGORIES, GROUPS, THREADS } from "../frontend/src/data/mockData.js";
import { adaptarArticuloMarketplace, modalidad } from "../frontend/src/utils/coleccion.js";
import { accionesDisponibles } from "../frontend/src/utils/ordenes.js";

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

describe("Frontend: datos de ejemplo consistentes", () => {
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

    it("las rutas de imagen son absolutas (empiezan con /) para funcionar en rutas anidadas", () => {
        for (const item of GROUPS) {
            assert.ok(item.img.startsWith("/assets/img/"), item.img);
        }
    });

    it("cada conversación tiene al menos un mensaje", () => {
        for (const hilo of THREADS) {
            assert.ok(hilo.messages.length > 0, hilo.name);
        }
    });
});

describe("Frontend: compra-venta", () => {
    it("adapta un artículo del marketplace al formato de la tarjeta", () => {
        const tarjeta = adaptarArticuloMarketplace({
            _id: "a1", titulo: "PC Nayeon", grupo: "TWICE", categoria: "Photocard", imagenes: ["/api/imagenes/x"],
            precioVenta: 250, estado: "Como nuevo", disponibleCompra: true, disponibleIntercambio: true,
            vendedor: { username: "mina" }, esMio: false
        });
        assert.equal(tarjeta.id, "a1");
        assert.equal(tarjeta.price, 250);
        assert.equal(tarjeta.mode, "Ambos");
        assert.equal(tarjeta.seller, "mina");
        assert.equal(tarjeta.img, "/api/imagenes/x");
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
