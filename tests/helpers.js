/* ==========================================================================
   Utilidades para las pruebas de la API.

   Cada archivo de pruebas levanta la app en un puerto libre y usa su propia
   base de datos (kpop_test_<nombre>), que se borra al empezar y al terminar.
   NUNCA usa la base real: la URI viene de MONGODB_URI_TEST y el nombre de la
   base siempre termina en "_test_...".
   ========================================================================== */

require("dotenv").config({ quiet: true });

const mongoose = require("mongoose");
const app = require("../app");
const { conectarMongo } = require("../config/db");

// PNG de 1x1 píxel para probar subidas de imágenes
const PNG_1X1 = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
);

async function iniciarApi(nombre) {
    const uri = process.env.MONGODB_URI_TEST;

    if (!uri) {
        throw new Error(
            "Falta MONGODB_URI_TEST en el .env (puede ser la misma URI de Atlas: las pruebas usan otra base de datos)"
        );
    }

    const nombreBase = `kpop_test_${nombre}`;
    await conectarMongo(uri, { dbName: nombreBase });
    await mongoose.connection.dropDatabase();

    const servidor = await new Promise((resolve) => {
        const s = app.listen(0, () => resolve(s));
    });
    const url = `http://127.0.0.1:${servidor.address().port}`;

    async function detener() {
        await new Promise((resolve) => servidor.close(resolve));
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    }

    return { url, detener };
}

// Hace una petición y regresa { status, body } (body ya convertido a JSON si aplica)
function crearCliente(url) {
    return async function api(metodo, ruta, { token, json, form } = {}) {
        const headers = {};
        let body;

        if (token) headers.Authorization = `Bearer ${token}`;

        if (json !== undefined) {
            headers["Content-Type"] = "application/json";
            body = JSON.stringify(json);
        } else if (form) {
            body = new FormData();
            for (const [campo, valor] of Object.entries(form)) {
                if (valor instanceof Blob) {
                    body.append(campo, valor, "foto.png");
                } else {
                    body.append(campo, valor);
                }
            }
        }

        const respuesta = await fetch(url + ruta, { method: metodo, headers, body });
        const tipo = respuesta.headers.get("content-type") || "";
        const contenido = tipo.includes("application/json") ? await respuesta.json() : Buffer.from(await respuesta.arrayBuffer());

        return { status: respuesta.status, body: contenido, headers: respuesta.headers };
    };
}

function imagenPng() {
    return new Blob([PNG_1X1], { type: "image/png" });
}

// Registra un usuario y regresa { token, usuario }
async function registrarUsuario(api, datos = {}) {
    const sufijo = Math.random().toString(36).slice(2, 8);
    const respuesta = await api("POST", "/api/auth/register", {
        form: {
            name: "Usuario Prueba",
            username: `user_${sufijo}`,
            email: `user_${sufijo}@test.com`,
            password: "contrasena123",
            ...datos
        }
    });

    if (respuesta.status !== 201) {
        throw new Error(`No se pudo registrar el usuario de prueba: ${JSON.stringify(respuesta.body)}`);
    }

    return respuesta.body;
}

module.exports = { iniciarApi, crearCliente, registrarUsuario, imagenPng, PNG_1X1 };
