const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

// Este archivo corre en su propio proceso: el logger escribe en una carpeta temporal
// y con nivel "info" para poder revisar el inicio y el fin de las operaciones.
const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), "kollecta-logs-"));
process.env.LOG_DIR = carpeta;
process.env.LOG_LEVEL = "info";

const { iniciarApi, crearCliente, registrarUsuario } = require("./helpers");
const logger = require("../config/logger");

function leerLog(archivo = "test.log") {
    const ruta = path.join(carpeta, archivo);
    if (!fs.existsSync(ruta)) return [];
    return fs.readFileSync(ruta, "utf8").trim().split("\n").filter(Boolean).map((linea) => JSON.parse(linea));
}

// winston escribe de forma asíncrona: espera a que aparezca la línea buscada.
async function esperarLinea(condicion, archivo) {
    for (let i = 0; i < 50; i++) {
        const linea = leerLog(archivo).find(condicion);
        if (linea) return linea;
        await new Promise((r) => setTimeout(r, 50));
    }
    return null;
}

describe("Archivo de logs (winston)", () => {
    let entorno;
    let api;

    before(async () => {
        entorno = await iniciarApi("logs");
        api = crearCliente(entorno.url);
    });

    after(async () => {
        await entorno.detener();
        fs.rmSync(carpeta, { recursive: true, force: true });
    });

    it("registra el inicio y el fin del registro y del login, sin guardar la contraseña", async () => {
        const cuenta = await registrarUsuario(api, { name: "Logs" });

        const inicio = await esperarLinea((l) => l.message === "Inicio: registro");
        const fin = await esperarLinea((l) => l.message === "Fin: registro" && l.status === 201);
        assert.ok(inicio, "falta el inicio del registro");
        assert.ok(fin, "falta el fin del registro");
        assert.equal(fin.usuario, cuenta.usuario.id);
        assert.equal(typeof fin.ms, "number");
        assert.ok(fin.timestamp);

        await api("POST", "/api/auth/login", { json: { email: "nadie@demo.com", password: "secreta123" } });
        const rechazado = await esperarLinea((l) => l.message === "Fin rechazada: login");
        assert.equal(rechazado.status, 401);
        assert.equal(rechazado.level, "warn");

        const todo = fs.readFileSync(path.join(carpeta, "test.log"), "utf8");
        assert.ok(!todo.includes("secreta123"), "la contraseña no debe aparecer en el log");
    });

    it("los errores van también a error.log con su stack", async () => {
        logger.error("Falló algo de prueba:", new Error("explotó"), { ruta: "/api/prueba" });
        const linea = await esperarLinea((l) => l.message === "Falló algo de prueba", "test-error.log");
        assert.ok(linea);
        assert.equal(linea.error, "explotó");
        assert.equal(linea.ruta, "/api/prueba");
        assert.match(linea.stack, /Error: explotó/);
    });
});
