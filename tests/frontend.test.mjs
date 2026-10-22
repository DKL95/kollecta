import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { formatMoney, getInitials, timeAgo } from "../frontend/src/utils/format.js";
import { categoryClass, categoryIcon, CATEGORY_ICON } from "../frontend/src/utils/categories.js";
import { CATEGORIES, GROUPS, GROUP_NAMES, MY_COLLECTION, PRODUCTS, THREADS } from "../frontend/src/data/mockData.js";

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
    it("los ids de productos y de colección no se repiten", () => {
        assert.equal(new Set(PRODUCTS.map((p) => p.id)).size, PRODUCTS.length);
        assert.equal(new Set(MY_COLLECTION.map((c) => c.id)).size, MY_COLLECTION.length);
    });

    it("cada producto y pieza de colección usa un grupo y una categoría que existen", () => {
        for (const item of [...PRODUCTS, ...MY_COLLECTION]) {
            assert.ok(GROUP_NAMES.includes(item.group), `${item.title}: grupo ${item.group}`);
            assert.ok(CATEGORIES.includes(item.type), `${item.title}: categoría ${item.type}`);
        }
    });

    it("todas las categorías tienen ícono", () => {
        for (const categoria of CATEGORIES) {
            assert.ok(CATEGORY_ICON[categoria], categoria);
        }
    });

    it("los productos de intercambio no tienen precio y los de venta sí", () => {
        for (const producto of PRODUCTS) {
            if (producto.mode === "Intercambio") {
                assert.equal(producto.price, 0, producto.title);
            } else {
                assert.ok(producto.price > 0, producto.title);
            }
        }
    });

    it("las rutas de imagen son absolutas (empiezan con /) para funcionar en rutas anidadas", () => {
        for (const item of [...GROUPS, ...PRODUCTS, ...MY_COLLECTION]) {
            assert.ok(item.img.startsWith("/assets/img/"), item.img);
        }
    });

    it("cada conversación tiene al menos un mensaje", () => {
        for (const hilo of THREADS) {
            assert.ok(hilo.messages.length > 0, hilo.name);
        }
    });
});
