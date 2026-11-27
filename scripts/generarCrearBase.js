/* ==========================================================================
   Genera scripts/crear-base.mongodb.js (el "script DDL" de la base) a partir
   de los modelos de mongoose, para que nunca se desfase del código.

   Uso:  node scripts/generarCrearBase.js
   Después:  mongosh "<MONGODB_URI>" scripts/crear-base.mongodb.js
   ========================================================================== */

const fs = require("fs");
const path = require("path");

const CARPETA_MODELOS = path.join(__dirname, "..", "models");
const SALIDA = path.join(__dirname, "crear-base.mongodb.js");

// Qué representa cada colección y con quién se relaciona (para los comentarios del script).
const DESCRIPCIONES = {
    usuarios: "Cuentas de la red social. Rol: usuario < moderador < administrador.",
    publicaciones: "Publicaciones del feed (texto, imágenes, videos, likes). autor → usuarios.",
    comentarios: "Comentarios de una publicación. publicacion → publicaciones, autor → usuarios.",
    respuestas: "Respuestas a un comentario. comentario → comentarios, publicacion → publicaciones.",
    solicitudes_amistad: "Solicitudes de amistad entre dos usuarios (solicitante → destinatario).",
    conversaciones: "Chats directos y grupales. participantes → usuarios, ultimoMensaje → mensajes.",
    mensajes: "Mensajes de un chat. conversacion → conversaciones, remitente → usuarios.",
    notificaciones: "Avisos para un usuario (likes, comentarios, órdenes, moderación). destinatario/emisor → usuarios.",
    imagenes: "Archivos de imagen guardados en la base (fotos de perfil, publicaciones, productos).",
    colecciones: "Colección personal de merch de cada usuario (un documento por usuario, artículos embebidos).",
    productos: "Anuncios del marketplace. vendedor → usuarios; articuloOrigen → colecciones.articulos.",
    ordenes: "Compras e intercambios. comprador/vendedor → usuarios, producto → productos, conversacion → conversaciones.",
    denuncias: "Denuncias de contenido o cuentas para moderación. reportante/usuarioDenunciado/moderador → usuarios.",
    moderaciones: "Bitácora de acciones de moderación. moderador/usuarioAfectado → usuarios, denuncia → denuncias.",
    grupos: "Grupos K-pop que agrega la comunidad (pendiente → aprobado | rechazado). solicitante/revisadoPor → usuarios.",
    progreso_tareas: "Avance de cada usuario en las tareas diarias, semanales y logros (TTL: las diarias/semanales caducan). usuario → usuarios.",
    marcadores: "Mejor puntaje y partidas de cada usuario en cada minijuego (ranking). usuario → usuarios."
};

const ORDEN = Object.keys(DESCRIPCIONES);

function bsonDe(tipo) {
    switch (tipo) {
        case "String": return "string";
        case "Number": return ["int", "long", "double", "decimal"];
        case "Boolean": return "bool";
        case "Date": return "date";
        case "ObjectId": return "objectId";
        case "Buffer": return "binData";
        default: return null; // Mixed: cualquier cosa
    }
}

function conNull(bson) {
    const lista = Array.isArray(bson) ? bson : [bson];
    return lista.includes("null") ? lista : [...lista, "null"];
}

// Un SchemaType de mongoose → fragmento de $jsonSchema.
function esquemaDeTipo(tipo) {
    const opciones = tipo.options || {};

    if (tipo.instance === "Embedded" || (tipo.schema && tipo.instance !== "Array")) {
        const sub = esquemaDeSchema(tipo.schema, { anidado: true });
        if (opciones.required) sub.bsonType = "object";
        return sub;
    }

    if (tipo.instance === "Array") {
        const salida = { bsonType: "array" };
        if (tipo.schema) salida.items = esquemaDeSchema(tipo.schema, { anidado: true });
        else if (tipo.caster) {
            const item = esquemaDeTipo(tipo.caster);
            if (Object.keys(item).length) salida.items = item;
        }
        return salida;
    }

    const bson = bsonDe(tipo.instance);
    if (!bson) return {};

    const salida = { bsonType: bson };
    const enumValores = tipo.enumValues?.length ? tipo.enumValues : opciones.enum;
    if (Array.isArray(enumValores) && enumValores.length) salida.enum = [...enumValores];
    if (opciones.maxlength !== undefined) salida.maxLength = Array.isArray(opciones.maxlength) ? opciones.maxlength[0] : opciones.maxlength;
    if (opciones.minlength !== undefined) salida.minLength = Array.isArray(opciones.minlength) ? opciones.minlength[0] : opciones.minlength;
    if (opciones.min !== undefined) salida.minimum = Array.isArray(opciones.min) ? opciones.min[0] : opciones.min;
    if (opciones.max !== undefined) salida.maximum = Array.isArray(opciones.max) ? opciones.max[0] : opciones.max;
    if (opciones.ref) salida.description = `→ ${opciones.ref}`;

    // Si el campo no es obligatorio puede venir como null (mongoose guarda null en muchos defaults).
    if (!opciones.required) {
        salida.bsonType = conNull(salida.bsonType);
        if (salida.enum) salida.enum = [...salida.enum, null];
    }
    return salida;
}

// Un Schema completo → { bsonType: "object", required, properties }.
function esquemaDeSchema(schema, { anidado = false } = {}) {
    const raiz = { bsonType: anidado ? ["object", "null"] : "object", properties: {} };
    const requeridos = new Set();

    schema.eachPath((ruta, tipo) => {
        if (ruta === "__v") return;
        const partes = ruta.split(".");
        let nodo = raiz;
        for (const parte of partes.slice(0, -1)) {
            nodo.properties[parte] ??= { bsonType: ["object", "null"], properties: {} };
            nodo = nodo.properties[parte];
        }
        const hoja = partes.at(-1);
        nodo.properties[hoja] = esquemaDeTipo(tipo);
        if (partes.length === 1 && tipo.options?.required === true && ruta !== "_id") requeridos.add(hoja);
    });

    if (requeridos.size) raiz.required = [...requeridos];
    return raiz;
}

// JSON con sangría, pero los objetos cortos en una sola línea para que se lea mejor.
function bonito(valor, sangria = "") {
    const corto = JSON.stringify(valor);
    if (corto.length <= 100 || valor === null || typeof valor !== "object") return corto;
    const siguiente = `${sangria}  `;
    if (Array.isArray(valor)) {
        return `[\n${valor.map((v) => siguiente + bonito(v, siguiente)).join(",\n")}\n${sangria}]`;
    }
    const filas = Object.entries(valor).map(([k, v]) => `${siguiente}${JSON.stringify(k)}: ${bonito(v, siguiente)}`);
    return `{\n${filas.join(",\n")}\n${sangria}}`;
}

function cargarModelos() {
    const modelos = {};
    for (const archivo of fs.readdirSync(CARPETA_MODELOS)) {
        const modelo = require(path.join(CARPETA_MODELOS, archivo));
        if (modelo?.schema && modelo.collection) modelos[modelo.collection.name] = modelo;
    }
    return modelos;
}

function generar() {
    const modelos = cargarModelos();
    const faltantes = Object.keys(modelos).filter((nombre) => !ORDEN.includes(nombre));
    if (faltantes.length) throw new Error(`Agrega la descripción de: ${faltantes.join(", ")}`);

    const bloques = ORDEN.filter((nombre) => modelos[nombre]).map((nombre) => {
        const schema = modelos[nombre].schema;
        const validador = esquemaDeSchema(schema);
        const indices = schema.indexes();
        const lineasIndices = indices.map(([campos, opciones]) => {
            const opts = { ...opciones };
            delete opts.background;
            return `db.${nombre}.createIndex(${JSON.stringify(campos)}${Object.keys(opts).length ? `, ${JSON.stringify(opts)}` : ""});`;
        });

        return [
            `// ---------------------------------------------------------------------------`,
            `// ${nombre}: ${DESCRIPCIONES[nombre]}`,
            `// ---------------------------------------------------------------------------`,
            `crear("${nombre}", ${bonito(validador)});`,
            ...lineasIndices,
            ""
        ].join("\n");
    });

    const contenido = `/* ==========================================================================
   KollectA — creación de la base de datos (equivalente al script SQL de tablas).

   Crea las ${bloques.length} colecciones con su validador $jsonSchema (tipos, campos
   obligatorios, enums y límites) y sus índices, incluidos los únicos.

   Uso:   mongosh "<MONGODB_URI>" scripts/crear-base.mongodb.js
          (opcional) BASE=otra_base mongosh ... para usar otra base

   Es seguro correrlo varias veces: si la colección ya existe, solo actualiza
   su validador (collMod) y vuelve a crear los índices que falten.

   ARCHIVO GENERADO por scripts/generarCrearBase.js a partir de models/.
   No lo edites a mano: cambia el modelo y vuelve a generarlo.
   ========================================================================== */

const nombreBase = (typeof process !== "undefined" && process.env && process.env.BASE) || "kpop";
db = db.getSiblingDB(nombreBase);

function crear(nombre, esquema) {
    const validador = { $jsonSchema: esquema };
    const existe = db.getCollectionNames().includes(nombre);
    if (existe) {
        db.runCommand({ collMod: nombre, validator: validador, validationLevel: "moderate", validationAction: "error" });
    } else {
        db.createCollection(nombre, { validator: validador, validationLevel: "moderate", validationAction: "error" });
    }
    print((existe ? "Actualizada: " : "Creada:     ") + nombre);
}

${bloques.join("\n")}
print("Listo: " + db.getCollectionNames().length + " colecciones en " + nombreBase);
`;

    fs.writeFileSync(SALIDA, contenido);
    return { salida: SALIDA, colecciones: bloques.length };
}

if (require.main === module) {
    const { salida, colecciones } = generar();
    console.log(`Generado ${path.relative(process.cwd(), salida)} con ${colecciones} colecciones`);
}

module.exports = { generar, DESCRIPCIONES };
