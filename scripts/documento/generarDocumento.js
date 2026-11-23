/* ==========================================================================
   Genera docs/KollectA-documento-tecnico.pdf: diseño de la base de datos,
   pantallas y rutas, endpoints, reportes y el manual de usuario.

   Casi todo sale del código para que no se desfase:
   - Colecciones, campos, relaciones e índices: models/*.js (mongoose).
   - Pantallas: frontend/src/App.jsx.
   - Endpoints: scripts/documento/endpoints.js, comprobado contra routes/*.js.
   - Reportes: controllers/reporteController.js.
   - Manual: docs/manual/MANUAL-usuario.md.

   Uso:  npm run documento        (necesita Microsoft Edge o Google Chrome)
   ========================================================================== */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { marked } = require("marked");

const RAIZ = path.join(__dirname, "..", "..");
const DOCS = path.join(RAIZ, "docs");
const SALIDA_PDF = path.join(DOCS, "KollectA-documento-tecnico.pdf");
const HTML_TEMPORAL = path.join(DOCS, ".documento-tecnico.html");

const leer = (relativa) => fs.readFileSync(path.join(RAIZ, relativa), "utf8");
const esc = (texto) =>
    String(texto ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const code = (texto) => `<code>${esc(texto)}</code>`;

/* --------------------------------------------------------------------------
   Modelos → colecciones
   -------------------------------------------------------------------------- */
function cargarModelos() {
    const mongoose = require("mongoose");
    for (const archivo of fs.readdirSync(path.join(RAIZ, "models"))) {
        require(path.join(RAIZ, "models", archivo));
    }
    return mongoose.models;
}

function tipoDe(ruta) {
    if (ruta.instance === "Array") {
        if (ruta.schema) return "Array<doc>";
        const interno = ruta.caster || ruta.embeddedSchemaType;
        return `Array<${interno?.instance || "Mixed"}>`;
    }
    if (ruta.instance === "Embedded") return "doc embebido";
    return ruta.instance;
}

function refDe(ruta) {
    return ruta.options?.ref || ruta.caster?.options?.ref || ruta.options?.type?.[0]?.ref || null;
}

// Una fila por campo (los subdocumentos se aplanan con "campo." / "campo[].").
function camposDe(schema, prefijo = "") {
    const filas = [];
    schema.eachPath((nombre, ruta) => {
        if (nombre === "__v" || (prefijo && nombre === "_id")) return;
        const o = ruta.options || {};
        const reglas = [];
        if (o.unique) reglas.push("único");
        const valores = ruta.enumValues?.length ? ruta.enumValues : ruta.caster?.enumValues;
        if (valores?.length) reglas.push(`enum: ${valores.join(", ")}`);
        if (o.min !== undefined) reglas.push(`mín ${o.min}`);
        if (o.max !== undefined) reglas.push(`máx ${o.max}`);
        if (o.minlength !== undefined) reglas.push(`long. mín ${o.minlength}`);
        if (o.maxlength !== undefined) reglas.push(`long. máx ${o.maxlength}`);
        if (o.match) reglas.push("formato validado");
        if (o.default !== undefined && typeof o.default !== "function" && o.default !== null && !(Array.isArray(o.default) && !o.default.length)) {
            reglas.push(`por defecto ${JSON.stringify(o.default)}`);
        }

        filas.push({
            campo: prefijo + nombre,
            tipo: tipoDe(ruta),
            requerido: Boolean(ruta.isRequired),
            ref: refDe(ruta),
            reglas: reglas.join(" · ")
        });

        if (ruta.schema && ruta.instance !== "Mixed") {
            filas.push(...camposDe(ruta.schema, `${prefijo}${nombre}${ruta.instance === "Array" ? "[]" : ""}.`));
        }
    });
    return filas;
}

function describirColecciones() {
    const { DESCRIPCIONES } = require("../generarCrearBase");
    const modelos = cargarModelos();
    const porNombreModelo = {};
    // Solo las 15 colecciones de models/ (ArchivoVideo describe videos.files de GridFS, que crea el driver).
    const colecciones = Object.values(modelos).filter((modelo) => DESCRIPCIONES[modelo.collection.collectionName]).map((modelo) => {
        const nombre = modelo.collection.collectionName;
        porNombreModelo[modelo.modelName] = nombre;
        return {
            nombre,
            modelo: modelo.modelName,
            descripcion: DESCRIPCIONES[nombre] || "",
            campos: camposDe(modelo.schema),
            indices: modelo.schema.indexes()
        };
    });

    const orden = Object.keys(DESCRIPCIONES);
    colecciones.sort((a, b) => orden.indexOf(a.nombre) - orden.indexOf(b.nombre));

    for (const c of colecciones) {
        for (const campo of c.campos) campo.refColeccion = campo.ref ? porNombreModelo[campo.ref] : null;
    }
    return colecciones;
}

/* --------------------------------------------------------------------------
   Diagrama entidad-relación (SVG)
   -------------------------------------------------------------------------- */
// [columna, fila]: usuarios al centro y las demás alrededor (4 columnas x 5 filas).
const POSICIONES = {
    respuestas: [0, 0], comentarios: [1, 0], publicaciones: [2, 0], notificaciones: [3, 0],
    solicitudes_amistad: [0, 1], imagenes: [3, 1],
    colecciones: [0, 2], usuarios: [1.5, 2], conversaciones: [3, 2],
    denuncias: [0, 3], mensajes: [3, 3],
    moderaciones: [0, 4], productos: [1, 4], ordenes: [2, 4], grupos: [3, 4]
};
const FILAS_ER = 5;

function diagramaER(colecciones) {
    const ANCHO = 206, COL = 244, MARGEN = 14, LINEA = 15, CABEZA = 26;
    const cajas = {};
    const filasAltura = Array(FILAS_ER).fill(0);

    for (const c of colecciones) {
        const refs = c.campos.filter((f) => f.refColeccion);
        const claves = [...new Map(refs.map((f) => [f.campo.split(".")[0].replace("[]", ""), f])).values()];
        const lineas = claves.slice(0, 7).map((f) => `${f.campo.split(".")[0]} → ${f.refColeccion}`);
        if (claves.length > 7) lineas.push(`… y ${claves.length - 7} más`);
        if (!lineas.length) {
            // Sin referencias (p. ej. usuarios): se muestran sus campos principales.
            const propios = c.campos.filter((f) => !f.campo.includes(".") && f.campo !== "_id" && !f.ref);
            lineas.push(...propios.slice(0, 7).map((f) => `${f.campo}${f.reglas.includes("único") ? " (único)" : ""}`));
        }
        const alto = CABEZA + 8 + lineas.length * LINEA;
        const [col, fila] = POSICIONES[c.nombre] || [3, 4];
        filasAltura[fila] = Math.max(filasAltura[fila], alto);
        cajas[c.nombre] = { col, fila, alto, lineas, c };
    }

    const GAP = 34;
    const yFila = [MARGEN];
    for (let i = 1; i < FILAS_ER; i++) yFila[i] = yFila[i - 1] + filasAltura[i - 1] + GAP;
    const altoTotal = yFila[FILAS_ER - 1] + filasAltura[FILAS_ER - 1] + MARGEN;
    const anchoTotal = MARGEN * 2 + COL * 3 + ANCHO;

    for (const caja of Object.values(cajas)) {
        caja.x = MARGEN + caja.col * COL;
        caja.y = yFila[caja.fila] + (filasAltura[caja.fila] - caja.alto) / 2;
        caja.cx = caja.x + ANCHO / 2;
        caja.cy = caja.y + caja.alto / 2;
    }

    // Punto donde la línea del centro de a hacia (tx, ty) sale del borde de a.
    const borde = (a, tx, ty) => {
        const dx = tx - a.cx, dy = ty - a.cy;
        const sx = dx ? (ANCHO / 2) / Math.abs(dx) : Infinity;
        const sy = dy ? (a.alto / 2) / Math.abs(dy) : Infinity;
        const s = Math.min(sx, sy);
        return [a.cx + dx * s, a.cy + dy * s];
    };
    const cruzaCaja = (a, b) =>
        Object.values(cajas).some((k) => {
            if (k === a || k === b) return false;
            for (let t = 0.1; t < 0.9; t += 0.05) {
                const x = a.cx + (b.cx - a.cx) * t, y = a.cy + (b.cy - a.cy) * t;
                if (x > k.x - 4 && x < k.x + ANCHO + 4 && y > k.y - 4 && y < k.y + k.alto + 4) return true;
            }
            return false;
        });

    const aristas = new Map();
    for (const c of colecciones) {
        for (const f of c.campos) {
            if (!f.refColeccion || f.refColeccion === c.nombre || !cajas[f.refColeccion]) continue;
            aristas.set(`${c.nombre}>${f.refColeccion}`, [cajas[c.nombre], cajas[f.refColeccion]]);
        }
    }

    const trazos = [...aristas.values()].map(([a, b]) => {
        if (!cruzaCaja(a, b)) {
            const [x1, y1] = borde(a, b.cx, b.cy);
            const [x2, y2] = borde(b, a.cx, a.cy);
            return `<path d="M${x1},${y1} L${x2},${y2}" class="arista" marker-end="url(#flecha)"/>`;
        }
        // Curva por encima/debajo para no atravesar otra caja.
        const misma = a.fila === b.fila;
        const arriba = misma ? a.fila !== FILAS_ER - 1 : false;
        const desv = misma ? (arriba ? -1 : 1) * (Math.abs(a.col - b.col) * 22 + 8) : 0;
        const mx = (a.cx + b.cx) / 2 + (misma ? 0 : (a.cy < b.cy ? -1 : 1) * 70);
        const my = misma ? (arriba ? Math.min(a.y, b.y) : Math.max(a.y + a.alto, b.y + b.alto)) + desv : (a.cy + b.cy) / 2;
        const [x1, y1] = borde(a, mx, my);
        const [x2, y2] = borde(b, mx, my);
        return `<path d="M${x1},${y1} Q${mx},${my} ${x2},${y2}" class="arista" marker-end="url(#flecha)"/>`;
    });

    const nodos = Object.values(cajas).map((k) => {
        const principal = k.c.nombre === "usuarios";
        const texto = k.lineas
            .map((l, i) => `<text x="${k.x + 8}" y="${k.y + CABEZA + 15 + i * LINEA}" class="campo">${esc(l)}</text>`)
            .join("");
        return `<g>
  <rect x="${k.x}" y="${k.y}" width="${ANCHO}" height="${k.alto}" rx="7" class="caja${principal ? " principal" : ""}"/>
  <path d="M${k.x},${k.y + CABEZA} h${ANCHO}" class="separador"/>
  <text x="${k.x + 8}" y="${k.y + 18}" class="titulo">${esc(k.c.nombre)}</text>
  <text x="${k.x + ANCHO - 8}" y="${k.y + 18}" class="conteo" text-anchor="end">${k.c.campos.length} campos</text>
  ${texto}
</g>`;
    });

    return `<svg viewBox="0 0 ${anchoTotal} ${altoTotal}" class="er" role="img" aria-label="Diagrama entidad-relación">
<defs><marker id="flecha" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="punta"/></marker></defs>
${trazos.join("\n")}
${nodos.join("\n")}
</svg>`;
}

/* --------------------------------------------------------------------------
   Endpoints: catálogo comprobado contra routes/*.js
   -------------------------------------------------------------------------- */
function rutasReales() {
    const app = leer("app.js");
    const requeridos = Object.fromEntries(
        [...app.matchAll(/const (\w+) = require\("\.\/routes\/(\w+)"\)/g)].map((m) => [m[1], m[2]])
    );
    const montajes = [...app.matchAll(/app\.use\("(\/api\/[\w-]+)", (\w+)\)/g)].map((m) => ({
        base: m[1],
        archivo: requeridos[m[2]]
    }));

    const rutas = new Set();
    for (const { base, archivo } of montajes) {
        const fuente = leer(`routes/${archivo}.js`);
        for (const m of fuente.matchAll(/router\.(get|post|put|patch|delete)\(\s*"([^"]+)"/g)) {
            const sub = m[2] === "/" ? "" : m[2];
            rutas.add(`${m[1].toUpperCase()} ${base}${sub}`);
        }
    }
    return rutas;
}

function comprobarCatalogo(catalogo) {
    const reales = rutasReales();
    const documentadas = new Set();
    for (const g of catalogo) {
        for (const e of g.endpoints) {
            const sub = e.ruta === "/" ? "" : e.ruta;
            documentadas.add(`${e.metodo} ${g.base}${sub}`);
        }
    }
    const faltan = [...reales].filter((r) => !documentadas.has(r));
    const sobran = [...documentadas].filter((r) => !reales.has(r));
    if (faltan.length || sobran.length) {
        throw new Error(
            "scripts/documento/endpoints.js no coincide con routes/*.js\n" +
                (faltan.length ? `  Sin documentar:\n    ${faltan.join("\n    ")}\n` : "") +
                (sobran.length ? `  Ya no existen:\n    ${sobran.join("\n    ")}\n` : "")
        );
    }
    return reales.size;
}

const ETIQUETA_ACCESO = {
    publico: ["Público", "publico"],
    token: ["Token", "token"],
    firmado: ["URL firmada", "token"],
    moderador: ["Moderador+", "mod"],
    administrador: ["Admin", "admin"]
};

function tablaEndpoints(catalogo) {
    return catalogo
        .map((g) => {
            const filas = g.endpoints
                .map((e) => {
                    const [etiqueta, clase] = ETIQUETA_ACCESO[e.acceso];
                    const sub = e.ruta === "/" ? "" : e.ruta;
                    return `<tr>
  <td><span class="metodo m-${e.metodo.toLowerCase()}">${e.metodo}</span></td>
  <td class="ruta"><code>${esc(g.base + sub).replace(/\//g, "/<wbr>")}</code><div class="desc">${esc(e.descripcion)}</div></td>
  <td><span class="acceso a-${clase}">${etiqueta}</span></td>
  <td class="io">${esc(e.entrada)}</td>
  <td class="io">${esc(e.respuesta)}</td>
</tr>`;
                })
                .join("\n");
            return `<h3>${esc(g.grupo)} <span class="archivo">routes/${esc(g.archivo)}</span></h3>
<table class="endpoints">
<colgroup><col style="width:9%"><col style="width:35%"><col style="width:11%"><col style="width:24%"><col style="width:21%"></colgroup>
<thead><tr><th>Método</th><th>Ruta y descripción</th><th>Acceso</th><th>Entrada</th><th>Respuesta</th></tr></thead>
<tbody>${filas}</tbody></table>`;
        })
        .join("\n");
}

/* --------------------------------------------------------------------------
   Pantallas (frontend/src/App.jsx)
   -------------------------------------------------------------------------- */
const DESCRIPCION_PANTALLA = {
    "/": "Redirige a /inicio.",
    "/login": "Inicio de sesión con correo y contraseña.",
    "/registro": "Alta de usuario con foto de perfil y grupo favorito (bias).",
    "/publicaciones/:id": "Una publicación con sus comentarios y respuestas.",
    "/inicio": "Feed: publicar texto, fotos y videos; likes y comentarios; amigos activos.",
    "/buscar": "Búsqueda de merch, grupos y personas (?q=texto).",
    "/notificaciones": "Likes, comentarios, amistades, órdenes y avisos de moderación.",
    "/mensajes": "Chats directos y grupales en tiempo real (Socket.IO).",
    "/marketplace": "Productos en venta o intercambio con filtros por grupo y categoría.",
    "/marketplace/:productId": "Detalle de un producto: comprar, proponer intercambio o retirarlo (dueño).",
    "/articulo/:productId": "Pieza de una colección personal; el dueño puede publicarla en el marketplace.",
    "/ordenes": "Mis compras y mis ventas filtradas por estado.",
    "/ordenes/:id": "Línea de tiempo de la orden, acciones según el rol, calificación y disputas.",
    "/vender": "Formulario para publicar un producto (o copiar una pieza de la colección).",
    "/coleccion/agregar": "Agregar una pieza a la colección sin ponerla a la venta.",
    "/coleccion": "Vitrina personal de merch.",
    "/perfil": "Perfil propio: datos, edición, publicaciones, colección y reseñas.",
    "/perfil/:username": "Perfil público de otra persona, con su reputación como vendedor.",
    "/grupos": "Catálogo de grupos de K-pop para seguir; solicitar un grupo nuevo (moderador+: agregarlo directo) y ver mis solicitudes.",
    "/grupos/:groupName": "Información del grupo, su merch y las publicaciones de la comunidad.",
    "/reportes": "Reportes con consultas entre colecciones; cambian según el rol.",
    "/moderacion": "Denuncias, disputas, solicitudes de grupos, usuarios y bitácora (moderador y administrador).",
    "*": "Página no encontrada."
};

function pantallas() {
    const fuente = leer("frontend/src/App.jsx");
    return [...fuente.matchAll(/\{ path: "([^"]+)", element: <(\w+)[^\n]*/g)].map((m) => {
        const ruta = m[1];
        m[3] = m[0].match(/title: "([^"]+)"/)?.[1];
        const acceso = ["/login", "/registro"].includes(ruta)
            ? "Público"
            : ruta === "/moderacion"
                ? "Moderador+"
                : ruta === "/"
                    ? "—"
                    : "Sesión";
        return { ruta, componente: m[2], titulo: m[3] || (ruta === "/" ? "Redirección" : m[2].replace(/Page$/, "")), acceso, descripcion: DESCRIPCION_PANTALLA[ruta] || "" };
    });
}

/* --------------------------------------------------------------------------
   Manual de usuario
   -------------------------------------------------------------------------- */
function manualHtml() {
    let md = leer("docs/manual/MANUAL-usuario.md").replace(/\r\n/g, "\n");
    md = md.replace(/^# .*\n/, ""); // el título lo pone el documento
    md = md.replace(/## Contenido[\s\S]*?\n---\n/, ""); // índice propio del .md (sus enlaces no sirven en el PDF)
    let html = marked.parse(md);
    html = html.replace(/src="img\//g, 'src="manual/img/');
    let primera = true;
    html = html.replace(/<h2>/g, () => {
        const clase = primera ? "manual-h2" : "manual-h2 salto";
        primera = false;
        return `<h2 class="${clase}">`;
    });
    html = html.replace(/<p><img ([^>]+)><\/p>/g, '<figure><img $1></figure>');
    return html;
}

/* --------------------------------------------------------------------------
   Documento
   -------------------------------------------------------------------------- */
function equipo() {
    const readme = leer("README.md");
    const bloque = readme.split("## Equipo")[1]?.split("\n## ")[0] || "";
    return bloque
        .split("\n")
        .filter((l) => l.startsWith("|") && !l.includes("---") && !l.includes("Matrícula |"))
        .map((l) => l.split("|").slice(1, 3).map((s) => s.trim()))
        .filter(([nombre]) => nombre && !nombre.startsWith("["));
}

function tablaCampos(c) {
    const filas = c.campos
        .map((f) => {
            const nivel = (f.campo.match(/\./g) || []).length;
            return `<tr${nivel ? ' class="sub"' : ""}>
  <td style="padding-left:${6 + nivel * 12}px">${code(f.campo)}</td>
  <td>${esc(f.tipo)}</td>
  <td class="centro">${f.requerido ? "Sí" : ""}</td>
  <td>${f.refColeccion ? `→ ${code(f.refColeccion)}` : ""}</td>
  <td class="reglas">${esc(f.reglas)}</td>
</tr>`;
        })
        .join("\n");
    const indices = c.indices
        .map(([campos, opciones]) => {
            const texto = Object.entries(campos).map(([k, v]) => `${k}: ${v}`).join(", ");
            const extra = [opciones.unique && "único", opciones.sparse && "sparse", opciones.expireAfterSeconds !== undefined && `TTL ${opciones.expireAfterSeconds}s`]
                .filter(Boolean)
                .join(", ");
            return `<li>${code(`{ ${texto} }`)}${extra ? ` <em>${extra}</em>` : ""}</li>`;
        })
        .join("");
    return `<section class="coleccion">
<h3>${code(c.nombre)} <span class="archivo">models/${esc(c.modelo)}.js</span></h3>
<p>${esc(c.descripcion)}</p>
<table class="campos">
<colgroup><col style="width:27%"><col style="width:14%"><col style="width:8%"><col style="width:17%"><col style="width:34%"></colgroup>
<thead><tr><th>Campo</th><th>Tipo</th><th>Req.</th><th>Referencia</th><th>Reglas</th></tr></thead>
<tbody>${filas}</tbody></table>
${indices ? `<p class="indices"><strong>Índices adicionales:</strong></p><ul class="indices">${indices}</ul>` : ""}
</section>`;
}

const MATRIZ_CRUD = [
    ["usuarios", "POST /auth/register", "GET /usuarios, /usuarios/:username", "PUT /usuarios/me; PATCH /admin/usuarios/:id/rol", "Baja lógica: PATCH /admin/usuarios/:id/estado (activo: false)"],
    ["publicaciones", "POST /publicaciones", "GET /publicaciones, /:id", "PUT /publicaciones/:id", "DELETE /publicaciones/:id"],
    ["comentarios", "POST …/comentarios", "GET …/comentarios", "PUT …/comentarios/:id", "DELETE …/comentarios/:id"],
    ["respuestas", "POST …/respuestas", "GET …/comentarios (anidadas)", "PUT …/respuestas/:id", "DELETE …/respuestas/:id"],
    ["solicitudes_amistad", "POST /usuarios/:username/solicitud", "GET /usuarios/solicitudes/*", "POST …/aceptar | …/rechazar", "DELETE /usuarios/solicitudes/:id"],
    ["conversaciones", "POST /mensajes/conversaciones/:id, /grupos", "GET /mensajes/conversaciones", "PATCH /mensajes/grupos/:id, …/silenciar", "DELETE /mensajes/:id (de mi lista)"],
    ["mensajes", "POST /mensajes/:conversacionId", "GET /mensajes/:conversacionId", "PATCH /mensajes/:conversacionId/mensajes/:id", "DELETE /mensajes/:conversacionId/mensajes/:id"],
    ["notificaciones", "Las crea el sistema", "GET /notificaciones", "PATCH /notificaciones/:id/leida", "DELETE /notificaciones/:id"],
    ["imagenes", "Al subir fotos (publicación, perfil, producto, colección)", "GET /imagenes/:id", "—", "Se borran con su publicación o pieza"],
    ["colecciones", "POST /coleccion/articulos", "GET /coleccion, …/articulos/:id", "PUT /coleccion/articulos/:id", "DELETE /coleccion/articulos/:id"],
    ["productos", "POST /productos", "GET /productos, /:id", "PUT /productos/:id", "DELETE /productos/:id (retirar)"],
    ["ordenes", "POST /ordenes", "GET /ordenes, /:id", "PATCH /ordenes/:id/estado, …/disputa", "DELETE /ordenes/:id (retirar solicitud)"],
    ["denuncias", "POST /denuncias", "GET /denuncias, /mias", "PATCH /denuncias/:id", "Se conservan como historial"],
    ["moderaciones", "La crea cada acción de moderación", "GET /moderacion/bitacora", "— (bitácora inmutable)", "— (bitácora inmutable)"],
    ["grupos", "POST /grupos", "GET /grupos, /grupos/solicitudes, …/mias", "PATCH /grupos/solicitudes/:id (aprobar o rechazar)", "DELETE /grupos/solicitudes/:id (cancelar pendiente)"]
];

function construirHtml() {
    const colecciones = describirColecciones();
    const catalogo = require("./endpoints");
    const totalRutas = comprobarCatalogo(catalogo);
    const { REPORTES } = require(path.join(RAIZ, "controllers", "reporteController"));
    const listaPantallas = pantallas();
    const integrantes = equipo();
    const fecha = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
    const totalCampos = colecciones.reduce((n, c) => n + c.campos.length, 0);

    const secciones = [
        ["arquitectura", "1. Descripción y arquitectura"],
        ["pantallas", "2. Pantallas y rutas"],
        ["base", "3. Diseño de la base de datos"],
        ["endpoints", "4. Descripción de endpoints"],
        ["reportes", "5. Reportes"],
        ["seguridad", "6. Seguridad, validaciones y logs"],
        ["diseno", "7. Sistema de diseño"],
        ["manual", "8. Manual de usuario"]
    ];

    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>KollectA — Documento técnico</title>
<style>
@page { size: Letter; margin: 18mm 16mm 18mm 16mm;
  @bottom-right { content: counter(page); font: 9pt "Segoe UI", sans-serif; color: #776d90; }
  @bottom-left { content: "KollectA · Documento técnico"; font: 9pt "Segoe UI", sans-serif; color: #776d90; } }
@page :first { @bottom-right { content: none; } @bottom-left { content: none; } }
:root { --tinta: #1d1830; --tenue: #5d5575; --linea: #e3deee; --suave: #f6f3fb; --rosa: #e0368a; --morado: #7a3fe0; --cian: #1b9fc6; }
* { box-sizing: border-box; }
body { font: 10pt/1.45 "Segoe UI", "Poppins", sans-serif; color: var(--tinta); margin: 0; background: #fff; }
h1 { font-size: 20pt; margin: 0 0 10px; color: var(--morado); break-after: avoid; }
h2 { font-size: 14pt; margin: 22px 0 8px; break-after: avoid; }
h3 { font-size: 11.5pt; margin: 16px 0 6px; break-after: avoid; }
h4 { font-size: 10.5pt; margin: 12px 0 4px; break-after: avoid; }
p, li { orphans: 3; widows: 3; }
.parte { break-before: page; }
code { font: 8.6pt Consolas, "Cascadia Mono", monospace; background: var(--suave); border-radius: 3px; padding: 0 3px; }
table { width: 100%; border-collapse: collapse; margin: 6px 0 12px; font-size: 8.8pt; table-layout: fixed; }
th { text-align: left; background: #efe9f9; color: #3c3058; font-weight: 600; }
th, td { border: 1px solid var(--linea); padding: 4px 6px; vertical-align: top; overflow-wrap: anywhere; }
tr { break-inside: avoid; }
thead { display: table-header-group; }
.centro { text-align: center; }
.archivo { font: 8pt Consolas, monospace; color: var(--tenue); font-weight: 400; margin-left: 6px; }
.nota { background: #fff8e6; border-left: 3px solid #e2a400; padding: 6px 10px; margin: 8px 0; font-size: 9.2pt; }
.info { background: #eef7fb; border-left: 3px solid var(--cian); padding: 6px 10px; margin: 8px 0; font-size: 9.2pt; }

/* Portada */
.portada { height: 240mm; display: flex; flex-direction: column; justify-content: space-between; }
.marca { display: inline-block; font-size: 46pt; font-weight: 800; letter-spacing: -1px; background: linear-gradient(135deg, #ff4fa3, #9b5cff 55%, #4fd8ff); -webkit-background-clip: text; color: transparent; margin: 40mm 0 4mm; }
.subtitulo { font-size: 18pt; color: var(--tinta); margin: 0; }
.lema { color: var(--tenue); font-size: 11pt; max-width: 130mm; }
.datos { font-size: 10.5pt; }
.datos table { width: auto; font-size: 10pt; }
.datos td, .datos th { padding: 4px 12px 4px 0; border: 0; border-bottom: 1px solid var(--linea); }
.datos th { background: none; }
.cifras { display: flex; gap: 10px; margin: 14px 0; }
.cifra { flex: 1; border: 1px solid var(--linea); border-radius: 8px; padding: 8px 10px; }
.cifra b { display: block; font-size: 18pt; color: var(--morado); line-height: 1.1; }
.cifra span { color: var(--tenue); font-size: 8.5pt; }

/* Índice */
.indice ol { list-style: none; padding: 0; font-size: 11pt; }
.indice li { padding: 6px 0; border-bottom: 1px dotted var(--linea); }
.indice a { color: var(--tinta); text-decoration: none; }

/* Arquitectura */
.capas { display: flex; align-items: stretch; gap: 0; margin: 10px 0 14px; }
.capa { flex: 1; border: 1px solid var(--linea); border-radius: 8px; padding: 8px 10px; background: var(--suave); font-size: 8.8pt; }
.capa b { display: block; font-size: 10pt; margin-bottom: 3px; }
.flechita { align-self: center; padding: 0 6px; color: var(--tenue); font-size: 8pt; text-align: center; }

/* Diagrama ER */
.er { width: 100%; height: auto; margin: 4px 0 6px; }
.er .caja { fill: #fff; stroke: #c9bfe0; stroke-width: 1.2; }
.er .caja.principal { fill: #fbf2fb; stroke: var(--rosa); stroke-width: 1.8; }
.er .separador { stroke: #e3deee; }
.er .titulo { font: 600 13px Consolas, monospace; fill: var(--tinta); }
.er .conteo { font: 10px "Segoe UI", sans-serif; fill: #8a809f; }
.er .campo { font: 11.5px Consolas, monospace; fill: #4c4366; }
.er .arista { fill: none; stroke: #9d8fc0; stroke-width: 1.1; }
.er .punta { fill: #9d8fc0; }
.leyenda { font-size: 8.6pt; color: var(--tenue); }

/* Colecciones */
.coleccion { margin-bottom: 6px; }
.coleccion > h3 { border-bottom: 2px solid #efe9f9; padding-bottom: 3px; }
table.campos td { font-size: 8.4pt; }
table.campos tr.sub td { background: #fcfbfe; }
.reglas { color: var(--tenue); }
ul.indices { margin: 0 0 8px; padding-left: 18px; font-size: 8.8pt; }
p.indices { margin: 0; font-size: 9pt; }

/* Endpoints */
table.endpoints td { font-size: 8.3pt; }
.ruta code { background: none; padding: 0; font-weight: 600; overflow-wrap: normal; }
td.ruta { overflow-wrap: normal; }
.desc { color: var(--tenue); margin-top: 2px; font-size: 8.3pt; }
.io { font-family: Consolas, monospace; font-size: 7.8pt !important; color: #3c3058; }
.metodo { display: inline-block; font: 700 7.6pt Consolas, monospace; padding: 1px 5px; border-radius: 3px; color: #fff; }
.m-get { background: #1b9fc6; } .m-post { background: #23a36b; } .m-put { background: #d88a00; } .m-patch { background: #9a6a00; } .m-delete { background: #d33d55; }
.acceso { display: inline-block; font-size: 7.6pt; padding: 1px 6px; border-radius: 999px; border: 1px solid; white-space: nowrap; }
.a-publico { color: #1e7f53; border-color: #9ad6b9; } .a-token { color: #4c4366; border-color: #cfc6e2; }
.a-mod { color: #8a5a00; border-color: #e7c57a; } .a-admin { color: #b3263d; border-color: #eea5b1; }

/* Diseño */
.paleta { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0 12px; }
.color { width: 23%; border: 1px solid var(--linea); border-radius: 6px; overflow: hidden; font-size: 8pt; }
.color i { display: block; height: 26px; }
.color span { display: block; padding: 3px 6px; }

/* Manual */
.manual h2.manual-h2 { font-size: 13pt; margin-top: 20px; border-bottom: 2px solid #efe9f9; padding-bottom: 3px; }
.manual h2.salto { break-before: page; }
.manual figure { margin: 6px 0 8px; break-inside: avoid; text-align: center; }
.manual img { max-width: 100%; max-height: 150mm; border: 1px solid var(--linea); border-radius: 6px; }
.manual hr { display: none; }
.manual blockquote { margin: 8px 0; background: #eef7fb; border-left: 3px solid var(--cian); padding: 4px 10px; }
.manual table { table-layout: auto; }
</style>
</head>
<body>

<section class="portada">
  <div>
    <div class="marca">KollectA</div>
    <p class="subtitulo">Documento técnico y manual de usuario</p>
    <p class="lema">Red social y marketplace para fans del K-pop: publica, chatea, arma tu colección de merch y compra, vende o intercambia piezas con otras personas.</p>
    <div class="cifras">
      <div class="cifra"><b>${colecciones.length}</b><span>colecciones en MongoDB</span></div>
      <div class="cifra"><b>${totalRutas}</b><span>endpoints REST</span></div>
      <div class="cifra"><b>${listaPantallas.filter((p) => p.ruta !== "/" && p.ruta !== "*").length}</b><span>pantallas</span></div>
      <div class="cifra"><b>${REPORTES.length}</b><span>reportes por rol</span></div>
    </div>
  </div>
  <div class="datos">
    <p><strong>Programación Web II</strong> · Facultad de Ciencias Físico Matemáticas, UANL<br>Licenciatura en Multimedia y Animación Digital</p>
    <table><thead><tr><th>Integrante</th><th>Matrícula</th></tr></thead><tbody>
      ${integrantes.map(([n, m]) => `<tr><td>${esc(n)}</td><td>${esc(m)}</td></tr>`).join("")}
    </tbody></table>
    <p>Aplicación publicada: <strong>https://kollecta.onrender.com</strong><br>${esc(fecha)}</p>
  </div>
</section>

<section class="parte indice">
  <h1>Contenido</h1>
  <ol>${secciones.map(([id, t]) => `<li><a href="#${id}">${esc(t)}</a></li>`).join("")}</ol>
</section>

<section class="parte" id="arquitectura">
  <h1>1. Descripción y arquitectura</h1>
  <p>KollectA junta en una sola plataforma lo que la comunidad K-pop hace hoy en grupos de Facebook, chats y sitios de compraventa: un <strong>feed social</strong>, <strong>mensajería</strong> directa y grupal, una <strong>vitrina de colección</strong> personal y un <strong>marketplace</strong> de venta e intercambio con órdenes, calificaciones y disputas, todo bajo un esquema de <strong>roles y moderación</strong>.</p>
  <div class="capas">
    <div class="capa"><b>Front End</b>React 18 + React Router (Vite). Solo habla con el back end por <code>fetch</code> a <code>/api</code> con JSON y por Socket.IO.</div>
    <div class="flechita">HTTPS · JSON<br>JWT Bearer</div>
    <div class="capa"><b>Back End</b>Node.js + Express 5. Rutas → middleware (auth, roles, subida, logs) → controladores. Socket.IO para mensajes en tiempo real.</div>
    <div class="flechita">Mongoose<br>(ORM/ODM)</div>
    <div class="capa"><b>Base de datos</b>MongoDB Atlas, base <code>kpop</code>. ${colecciones.length} colecciones; imágenes en la colección <code>imagenes</code> y videos en GridFS.</div>
  </div>
  <h3>Organización del código</h3>
  <table>
    <colgroup><col style="width:28%"><col></colgroup>
    <tbody>
      <tr><td>${code("server.js")}, ${code("app.js")}</td><td>Arranque del servidor HTTP y Socket.IO; montaje de rutas y middleware de errores.</td></tr>
      <tr><td>${code("routes/")}</td><td>Una carpeta de rutas por recurso; declara la autenticación, el rol requerido y el registro de operaciones.</td></tr>
      <tr><td>${code("controllers/")}</td><td>Lógica de cada endpoint y validaciones del lado del servidor.</td></tr>
      <tr><td>${code("models/")}</td><td>Esquemas de Mongoose: tipos, reglas, índices y relaciones.</td></tr>
      <tr><td>${code("middleware/")}</td><td>${code("auth.js")} (JWT), ${code("roles.js")} (usuario &lt; moderador &lt; administrador), ${code("upload.js")} (multer), ${code("registrarOperacion.js")} (logs).</td></tr>
      <tr><td>${code("services/")}</td><td>Servicios compartidos, p. ej. la bitácora de moderación y los avisos.</td></tr>
      <tr><td>${code("config/")}</td><td>Conexión a MongoDB y logger (winston).</td></tr>
      <tr><td>${code("scripts/")}</td><td>Script de creación de la base para mongosh y generadores de este documento.</td></tr>
      <tr><td>${code("frontend/src/")}</td><td>${code("pages/")} (una por pantalla), ${code("components/")}, ${code("api/")} (cliente HTTP), ${code("context/")} (sesión), ${code("utils/")}.</td></tr>
      <tr><td>${code("tests/")}</td><td>Pruebas automáticas de la API y del front (node:test).</td></tr>
    </tbody>
  </table>
  <h3>Roles</h3>
  <table><colgroup><col style="width:20%"><col></colgroup><tbody>
    <tr><td><strong>Usuario</strong></td><td>Publica, comenta, chatea, arma su colección, compra, vende, intercambia, solicita grupos nuevos, denuncia y ve sus propios reportes.</td></tr>
    <tr><td><strong>Moderador</strong></td><td>Además atiende denuncias y disputas, aprueba o rechaza las solicitudes de grupos nuevos (y los crea directo), oculta contenido, suspende cuentas de 1 a 30 días y ve los reportes de moderación.</td></tr>
    <tr><td><strong>Administrador</strong></td><td>Además banea o reactiva cuentas, cambia roles y ve todos los reportes de la plataforma.</td></tr>
  </tbody></table>
</section>

<section class="parte" id="pantallas">
  <h1>2. Pantallas y rutas</h1>
  <p>Rutas definidas en ${code("frontend/src/App.jsx")}. Todas, salvo ${code("/login")} y ${code("/registro")}, requieren sesión; sin ella la app redirige al login.</p>
  <table>
    <colgroup><col style="width:21%"><col style="width:18%"><col style="width:13%"><col></colgroup>
    <thead><tr><th>Ruta</th><th>Pantalla</th><th>Acceso</th><th>Descripción</th></tr></thead>
    <tbody>${listaPantallas
        .map((p) => `<tr><td>${code(p.ruta)}</td><td>${esc(p.titulo)}<div class="desc">${esc(p.componente)}</div></td><td>${p.acceso}</td><td>${esc(p.descripcion)}</td></tr>`)
        .join("")}</tbody>
  </table>
</section>

<section class="parte" id="base">
  <h1>3. Diseño de la base de datos</h1>
  <p>MongoDB con Mongoose como ODM: todo acceso a datos pasa por los modelos de ${code("models/")}. Hay <strong>${colecciones.length} colecciones</strong> y ${totalCampos} campos (contando subdocumentos). Las relaciones son referencias ${code("ObjectId")}; los datos que siempre se leen juntos se <strong>embeben</strong> (historial de una orden, piezas de una colección, disputa).</p>
  <h2>3.1 Diagrama entidad-relación</h2>
  ${diagramaER(colecciones)}
  <p class="leyenda">Cada flecha va del campo que guarda la referencia a la colección referenciada. La caja resaltada es <code>usuarios</code>, de la que dependen casi todas. <code>imagenes</code> se referencia por URL (<code>/api/imagenes/:id</code>), no por <code>ObjectId</code>.</p>

  <h2>3.2 Operaciones por colección</h2>
  <table>
    <colgroup><col style="width:19%"><col style="width:20%"><col style="width:20%"><col style="width:21%"><col style="width:20%"></colgroup>
    <thead><tr><th>Colección</th><th>Crear</th><th>Leer</th><th>Actualizar</th><th>Borrar</th></tr></thead>
    <tbody>${MATRIZ_CRUD.map((f) => `<tr><td>${code(f[0])}</td>${f.slice(1).map((x) => `<td>${esc(x)}</td>`).join("")}</tr>`).join("")}</tbody>
  </table>
  <p class="info">Las operaciones que no tienen pantalla propia están justificadas: las notificaciones y la bitácora las genera el sistema; los usuarios se dan de baja de forma lógica (baneo) para conservar el historial de órdenes y denuncias; los mensajes se borran junto con la conversación.</p>

  <h2>3.3 Script de creación (equivalente al DDL)</h2>
  <p>${code("scripts/crear-base.mongodb.js")} crea las ${colecciones.length} colecciones con validadores ${code("$jsonSchema")} (tipos, campos requeridos, enums y límites) y todos los índices. Se genera desde los modelos con ${code("npm run generar-base")} y se ejecuta con:</p>
  <p>${code('mongosh "<MONGODB_URI>" scripts/crear-base.mongodb.js')}</p>
  <p>Se puede correr varias veces (si la colección existe, actualiza su validador). Las pruebas automáticas corren también con estos validadores activos para comprobar que aceptan todo lo que guarda la app.</p>

  <h2>3.4 Diccionario de datos</h2>
  <p>Generado de los esquemas de Mongoose. Todas las colecciones tienen ${code("_id")}; las que usan ${code("timestamps")} incluyen ${code("createdAt")} y ${code("updatedAt")}.</p>
  ${colecciones.map(tablaCampos).join("\n")}
</section>

<section class="parte" id="endpoints">
  <h1>4. Descripción de endpoints</h1>
  <p>API REST bajo ${code("/api")}; ${totalRutas} endpoints. Este catálogo se comprueba automáticamente contra ${code("routes/*.js")} al generar el documento.</p>
  <table><colgroup><col style="width:22%"><col></colgroup><tbody>
    <tr><td><strong>Formato</strong></td><td>JSON (${code("Content-Type: application/json")}). Los formularios con archivos usan ${code("multipart/form-data")}.</td></tr>
    <tr><td><strong>Autenticación</strong></td><td>${code("Authorization: Bearer <token>")} (JWT de 7 días) en todos los endpoints salvo registro, login y la lectura de imágenes.</td></tr>
    <tr><td><strong>Errores</strong></td><td>${code('{ "mensaje": "…" }')} con 400 (datos inválidos), 401 (sin sesión), 403 (sin permiso o cuenta suspendida), 404, 409 (conflicto de estado) o 500.</td></tr>
    <tr><td><strong>Acceso</strong></td><td><span class="acceso a-publico">Público</span> sin token · <span class="acceso a-token">Token</span> cualquier sesión · <span class="acceso a-mod">Moderador+</span> moderador o administrador · <span class="acceso a-admin">Admin</span> solo administrador.</td></tr>
  </tbody></table>
  ${tablaEndpoints(catalogo)}
  <p class="nota"><strong>Solo el registro y el login funcionan sin token.</strong> Las etiquetas ${code("<img>")} no pueden mandar el header ${code("Authorization")}, así que al iniciar sesión el back end deja una cookie ${code("httpOnly")} (${code("kollecta_medios")}) con un token de solo lectura que únicamente abre ${code("GET /api/imagenes/:id")}; no sirve como sesión para el resto de la API y se borra con ${code("POST /api/auth/logout")}. Los videos usan una URL firmada con un token temporal (3 min) ligado a ese video.</p>
  <p><strong>Tiempo real.</strong> Socket.IO autentica con el mismo JWT y emite ${code("mensaje:nuevo")}, ${code("mensaje:estado")}, ${code("conversaciones:actualizar")} y ${code("mensajes:contador-actualizar")} a las salas de cada conversación y de cada usuario.</p>
</section>

<section class="parte" id="reportes">
  <h1>5. Reportes</h1>
  <p>Pantalla ${code("/reportes")}. Cada reporte es una agregación de MongoDB (${code("$lookup")}, ${code("$group")}) que cruza colecciones; el back end solo devuelve los que el rol de la sesión puede ver. Se pueden filtrar por fechas o meses.</p>
  <table>
    <colgroup><col style="width:24%"><col style="width:12%"><col style="width:36%"><col style="width:28%"></colgroup>
    <thead><tr><th>Reporte</th><th>Rol</th><th>Qué muestra</th><th>Colecciones</th></tr></thead>
    <tbody>${REPORTES.map((r) => `<tr><td><strong>${esc(r.titulo)}</strong><div class="desc">${code(`GET /api/reportes/${r.id}`)}</div></td><td>${esc(r.rol)}</td><td>${esc(r.descripcion)}</td><td>${r.colecciones.map(code).join(" ")}</td></tr>`).join("")}</tbody>
  </table>
</section>

<section class="parte" id="seguridad">
  <h1>6. Seguridad, validaciones y logs</h1>
  <h3>Autenticación y permisos</h3>
  <ul>
    <li>Contraseñas cifradas con <strong>bcrypt</strong>; nunca se devuelven en las respuestas.</li>
    <li>JWT firmado con ${code("JWT_SECRET")}. En cada petición se vuelve a leer al usuario: si fue baneado, suspendido o cambió de rol, aplica de inmediato.</li>
    <li>${code("requiereRol()")} protege las rutas por rol. Además hay reglas de dueño (solo el autor edita su publicación, solo el vendedor acepta una orden) y de <strong>conflicto de interés</strong> (un moderador no resuelve una disputa en la que participa).</li>
  </ul>
  <h3>Validaciones del lado del servidor</h3>
  <ul>
    <li>Cada controlador valida tipos, longitudes, enums e ids antes de escribir, sin depender del front end.</li>
    <li>Los esquemas de Mongoose vuelven a validar al guardar, y el script de mongosh añade la validación en la propia base.</li>
    <li>Subidas: multer limita tipo (imagen o video), tamaño y número de archivos; si algo falla, borra los temporales.</li>
    <li>Las órdenes siguen una máquina de estados: cada transición revisa quién la pide y el estado actual (409 si no aplica, o si hay una disputa abierta).</li>
  </ul>
  <h3>Archivo de logs</h3>
  <p>Con <strong>winston</strong> (${code("config/logger.js")}), en formato JSON:</p>
  <ul>
    <li>${code("logs/app.log")}: inicio y fin de las operaciones críticas (registro, login, publicaciones con imágenes y videos, grupos, productos, órdenes, disputas, denuncias, moderación y administración), con código HTTP, usuario y duración.</li>
    <li>${code("logs/error.log")}: excepciones no controladas con método, ruta, usuario y stack.</li>
    <li>Nunca se registra el cuerpo de las peticiones (puede traer contraseñas).</li>
  </ul>
  <h3>Pruebas automáticas</h3>
  <p>${code("npm test")} levanta la API con un MongoDB temporal y cubre autenticación, perfiles, publicaciones, colección, marketplace, órdenes, disputas, roles, moderación, reportes, logs y el script de la base.</p>
</section>

<section class="parte" id="diseno">
  <h1>7. Sistema de diseño</h1>
  <p>En lugar de MaterialUI, KollectA usa un sistema de diseño propio equivalente, definido con variables CSS en ${code("frontend/src/styles.css")} y componentes React reutilizables. Sigue los mismos principios: tokens de color, espaciado y elevación; componentes consistentes; estados de foco, carga y vacío; y un diseño adaptable a celular.</p>
  <h3>Tokens de color</h3>
  <div class="paleta">
    ${[
        ["--bg", "#0f0b1e", "Fondo"], ["--card", "#1c1533", "Tarjetas"], ["--text", "#f5f3fb", "Texto"], ["--text-dim", "#b3a8cc", "Texto secundario"],
        ["--pink", "#ff4fa3", "Marca / acción"], ["--purple", "#9b5cff", "Marca"], ["--cyan", "#4fd8ff", "Información"], ["--gold", "#ffd166", "Calificaciones"],
        ["--green", "#3ddc97", "Éxito"], ["--red", "#ff5c72", "Error / peligro"]
    ].map(([v, c, u]) => `<div class="color"><i style="background:${c}"></i><span>${code(v)} ${c}<br>${u}</span></div>`).join("")}
  </div>
  <h3>Otros tokens</h3>
  <p>Radios ${code("--radius-sm/md/lg/pill")} (10, 16, 24 y 999 px), sombras ${code("--shadow-1/2/glow")}, degradado de marca ${code("--gradient-brand")} y medidas de layout ${code("--header-h")} y ${code("--sidebar-w")}.</p>
  <h3>Equivalencias con MaterialUI</h3>
  <table><colgroup><col style="width:30%"><col style="width:30%"><col></colgroup>
    <thead><tr><th>MaterialUI</th><th>KollectA</th><th>Uso</th></tr></thead><tbody>
    <tr><td>AppBar, Drawer, BottomNavigation</td><td>${code("Topbar")}, ${code("Sidebar")}, ${code("BottomNav")}</td><td>Navegación de escritorio y celular (${code("components/layout")}).</td></tr>
    <tr><td>Card</td><td>${code("PostCard")}, ${code("ProductCard")}, ${code("GroupCard")}, ${code("CollectionItem")}</td><td>Contenido del feed, marketplace, grupos y colección.</td></tr>
    <tr><td>Dialog</td><td>${code("OrderDialog")}, ${code("DisputeDialog")}, ${code("ReportDialog")}, ${code("ModActionDialog")}, ${code("GroupChatDialog")}</td><td>Acciones que piden confirmación o datos.</td></tr>
    <tr><td>Chip, Badge</td><td>${code("FilterChips")}, ${code("RoleBadge")}</td><td>Filtros e insignias de rol.</td></tr>
    <tr><td>Avatar, Icon</td><td>${code("Avatar")}, ${code("Icon")}</td><td>Fotos de perfil e íconos SVG.</td></tr>
    <tr><td>Tabs, TextField, Button</td><td>Clases ${code(".tabs")}, ${code(".field")}, ${code(".btn")}</td><td>Formularios y pestañas.</td></tr>
    <tr><td>Empty state, Popover</td><td>${code("EmptyState")}, ${code("UserHoverCard")}</td><td>Listas vacías y vista rápida de un perfil.</td></tr>
  </tbody></table>
</section>

<section class="parte manual" id="manual">
  <h1>8. Manual de usuario</h1>
  ${manualHtml()}
</section>

</body>
</html>`;
}

function buscarNavegador() {
    const candidatos = [
        process.env.NAVEGADOR_PDF,
        "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
        "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium"
    ].filter(Boolean);
    const encontrado = candidatos.find((c) => fs.existsSync(c));
    if (!encontrado) throw new Error("No encontré Edge ni Chrome. Indica la ruta con NAVEGADOR_PDF.");
    return encontrado;
}

function generarPdf() {
    fs.writeFileSync(HTML_TEMPORAL, construirHtml());
    const perfil = fs.mkdtempSync(path.join(os.tmpdir(), "kollecta-pdf-"));
    try {
        execFileSync(
            buscarNavegador(),
            [
                "--headless=new",
                "--disable-gpu",
                "--no-pdf-header-footer",
                `--user-data-dir=${perfil}`,
                `--print-to-pdf=${SALIDA_PDF}`,
                "file:///" + HTML_TEMPORAL.replace(/\\/g, "/")
            ],
            { stdio: "ignore", timeout: 120000 }
        );
    } finally {
        fs.rmSync(perfil, { recursive: true, force: true });
        if (!process.env.CONSERVAR_HTML) fs.rmSync(HTML_TEMPORAL, { force: true });
    }
    return SALIDA_PDF;
}

if (require.main === module) {
    const salida = generarPdf();
    console.log(`Generado ${path.relative(process.cwd(), salida)} (${Math.round(fs.statSync(salida).size / 1024)} KB)`);
}

module.exports = { construirHtml, comprobarCatalogo, generarPdf };
