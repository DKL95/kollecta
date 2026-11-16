/* ==========================================================================
   GIFs: búsqueda en GIPHY (a través del back end, la llave nunca llega al
   navegador) y validación del GIF que se adjunta a un mensaje o publicación.

   Requiere GIPHY_API_KEY en el .env (gratis en https://developers.giphy.com).
   ========================================================================== */

const logger = require("../config/logger");

const API = "https://api.giphy.com/v1/gifs";

// Solo se aceptan archivos servidos por GIPHY: evita guardar direcciones arbitrarias.
const HOST_PERMITIDO = /^https:\/\/(media\d*|i)\.giphy\.com\/[\w./-]+$/;

class ErrorGif extends Error {}

// Recibe lo que manda el cliente (objeto o texto JSON) y regresa
// { url, ancho, alto, titulo }, null si no hay GIF, o lanza ErrorGif.
function normalizarGif(entrada) {
    if (entrada === undefined || entrada === null || entrada === "" || entrada === "null") return null;

    let gif = entrada;
    if (typeof gif === "string") {
        try {
            gif = JSON.parse(gif);
        } catch {
            throw new ErrorGif("El GIF no es válido");
        }
    }

    if (!gif || typeof gif !== "object" || typeof gif.url !== "string") {
        throw new ErrorGif("El GIF no es válido");
    }

    const url = gif.url.trim().split("?")[0];
    if (url.length > 500 || !HOST_PERMITIDO.test(url)) {
        throw new ErrorGif("Solo se pueden usar GIFs del buscador");
    }

    const numero = (valor) => (Number.isFinite(Number(valor)) && Number(valor) > 0 ? Math.round(Number(valor)) : 0);

    return {
        url,
        ancho: numero(gif.ancho),
        alto: numero(gif.alto),
        titulo: typeof gif.titulo === "string" ? gif.titulo.trim().slice(0, 200) : ""
    };
}

function formatearResultado(item) {
    const original = item.images?.fixed_height || item.images?.original || {};
    const vista = item.images?.fixed_height_small || item.images?.preview_gif || original;
    return {
        id: item.id,
        url: String(original.url || "").split("?")[0],
        preview: String(vista.url || original.url || "").split("?")[0],
        ancho: Number(original.width) || 0,
        alto: Number(original.height) || 0,
        titulo: item.title || ""
    };
}

// q vacío = GIFs en tendencia.
async function buscarGifs(q, limite = 24) {
    const llave = process.env.GIPHY_API_KEY;
    if (!llave) {
        const error = new Error("La búsqueda de GIFs no está configurada (falta GIPHY_API_KEY)");
        error.status = 503;
        throw error;
    }

    const parametros = new URLSearchParams({
        api_key: llave,
        limit: String(Math.min(Math.max(Number(limite) || 24, 1), 50)),
        rating: "pg-13",
        lang: "es"
    });
    if (q) parametros.set("q", q.slice(0, 50));

    const respuesta = await fetch(`${API}/${q ? "search" : "trending"}?${parametros}`);
    if (!respuesta.ok) {
        logger.warn("GIPHY respondió con error", { status: respuesta.status });
        const error = new Error("No se pudieron cargar los GIFs");
        error.status = 502;
        throw error;
    }

    const { data = [] } = await respuesta.json();
    return data.map(formatearResultado).filter((g) => HOST_PERMITIDO.test(g.url));
}

module.exports = { normalizarGif, buscarGifs, ErrorGif, HOST_PERMITIDO };
