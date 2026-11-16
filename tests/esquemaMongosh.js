/* ==========================================================================
   Ejecuta scripts/crear-base.mongodb.js sin mongosh, con el driver de Node,
   sobre la base a la que ya está conectado mongoose. Sirve para probar que el
   script corre y que sus validadores aceptan los datos reales de la app.

   Solo implementa lo que usa el script: getSiblingDB, getCollectionNames,
   createCollection, runCommand, db.<colección>.createIndex y print.
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const SCRIPT = path.join(__dirname, "..", "scripts", "crear-base.mongodb.js");

async function aplicarEsquema() {
    const nativa = mongoose.connection.db;
    const existentes = (await nativa.listCollections().toArray()).map((c) => c.name);
    const pendientes = [];
    const salida = [];

    const base = {
        getSiblingDB: () => db,
        getCollectionNames: () => [...existentes],
        createCollection: (nombre, opciones) => {
            existentes.push(nombre);
            // mongoose puede crear la colección en paralelo (autoCreate/autoIndex): en ese
            // caso se le pone el validador con collMod, igual que hace el script si ya existe.
            pendientes.push(async () => {
                try {
                    await nativa.createCollection(nombre, opciones);
                } catch (error) {
                    if (error.codeName !== "NamespaceExists") throw error;
                    await nativa.command({ collMod: nombre, ...opciones });
                }
            });
        },
        runCommand: (comando) => pendientes.push(() => nativa.command(comando))
    };

    const db = new Proxy(base, {
        get(objetivo, prop) {
            if (prop in objetivo) return objetivo[prop];
            return {
                createIndex: (campos, opciones = {}) =>
                    pendientes.push(() => nativa.collection(String(prop)).createIndex(campos, opciones))
            };
        }
    });

    const codigo = fs.readFileSync(SCRIPT, "utf8");
    // eslint-disable-next-line no-new-func
    new Function("db", "print", "process", codigo)(db, (texto) => salida.push(texto), { env: {} });

    for (const paso of pendientes) await paso();
    return salida;
}

module.exports = { aplicarEsquema };
