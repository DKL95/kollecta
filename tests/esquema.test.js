const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const { iniciarApi } = require("./helpers");
const { aplicarEsquema } = require("./esquemaMongosh");
const { generar } = require("../scripts/generarCrearBase");

// scripts/crear-base.mongodb.js: el "script DDL" de la base para mongosh.
describe("Script de creación de la base (mongosh)", () => {
    let entorno;
    let db;

    before(async () => {
        entorno = await iniciarApi("esquema");
        db = mongoose.connection.db;
    });

    after(async () => {
        await entorno.detener();
    });

    it("está al día con los modelos (volver a generarlo no cambia nada)", () => {
        const ruta = path.join(__dirname, "..", "scripts", "crear-base.mongodb.js");
        // Git en Windows puede cambiar los saltos de línea: se comparan sin ellos.
        const leer = () => fs.readFileSync(ruta, "utf8").replace(/\r\n/g, "\n");
        const antes = leer();
        generar();
        assert.equal(leer(), antes, "Corre: npm run generar-base");
    });

    it("crea las 19 colecciones con validador e índices únicos, y se puede correr dos veces", async () => {
        await db.dropDatabase();
        const salida = await aplicarEsquema();
        assert.match(salida.at(-1), /Listo: 19 colecciones/);

        const colecciones = await db.listCollections().toArray();
        assert.equal(colecciones.length, 19);
        assert.ok(colecciones.every((c) => c.options.validator?.$jsonSchema), "cada colección lleva $jsonSchema");

        const indices = await db.collection("usuarios").indexes();
        assert.ok(indices.some((i) => i.key.email === 1 && i.unique));
        assert.ok(indices.some((i) => i.key.username === 1 && i.unique));

        const otraVez = await aplicarEsquema();
        assert.ok(otraVez.some((linea) => linea.startsWith("Actualizada: usuarios")));
    });

    it("la base rechaza documentos que rompen el esquema", async () => {
        const ordenes = db.collection("ordenes");
        await assert.rejects(
            ordenes.insertOne({ comprador: new mongoose.Types.ObjectId(), tipo: "regalo" }),
            /Document failed validation/
        );

        const usuarios = db.collection("usuarios");
        await assert.rejects(usuarios.insertOne({ nombre: "Sin correo", rol: "superadmin" }), /Document failed validation/);
    });
});
