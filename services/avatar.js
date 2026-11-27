/* ==========================================================================
   Validación del avatar y de los stickers que mandan los clientes.
   ========================================================================== */

const {
    OPCIONES_AVATAR,
    AVATAR_INICIAL,
    EXPRESIONES,
    GESTOS,
    MAX_TEXTO_STICKER
} = require("../models/avatar");

class ErrorAvatar extends Error {}

function leerObjeto(entrada, mensaje) {
    let valor = entrada;
    if (typeof valor === "string") {
        try {
            valor = JSON.parse(valor);
        } catch {
            throw new ErrorAvatar(mensaje);
        }
    }
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new ErrorAvatar(mensaje);
    return valor;
}

// Regresa un avatar completo y limpio. Lo que falte toma el valor inicial;
// un valor que no está en el catálogo es un error (no se adivina).
function normalizarAvatar(entrada) {
    const datos = leerObjeto(entrada, "El avatar no es válido");
    const avatar = {};

    for (const [clave, valores] of Object.entries(OPCIONES_AVATAR)) {
        const valor = datos[clave];
        if (valor === undefined || valor === null || valor === "") {
            avatar[clave] = AVATAR_INICIAL[clave];
        } else if (typeof valor === "string" && valores.includes(valor)) {
            avatar[clave] = valor;
        } else {
            throw new ErrorAvatar(`La opción "${String(valor).slice(0, 30)}" no existe para ${clave}`);
        }
    }

    return avatar;
}

// Cara, pose y texto de un sticker (sin el avatar).
function normalizarPose(entrada) {
    const datos = leerObjeto(entrada, "El sticker no es válido");
    const expresion = datos.expresion ?? "normal";
    const gesto = datos.gesto ?? "ninguno";

    if (!EXPRESIONES.includes(expresion)) throw new ErrorAvatar("Esa expresión no existe");
    if (!GESTOS.includes(gesto)) throw new ErrorAvatar("Ese gesto no existe");

    const texto = typeof datos.texto === "string" ? datos.texto.replace(/\s+/g, " ").trim() : "";
    if (texto.length > MAX_TEXTO_STICKER) {
        throw new ErrorAvatar(`El texto del sticker puede tener hasta ${MAX_TEXTO_STICKER} caracteres`);
    }

    return { expresion, gesto, texto };
}

// Sticker que se adjunta a un mensaje o publicación: se dibuja con el avatar
// guardado de quien lo manda (así nadie puede mandar el avatar de otra persona).
// null = sin sticker.
function construirSticker(entrada, usuario) {
    if (entrada === undefined || entrada === null || entrada === "" || entrada === "null") return null;

    const pose = normalizarPose(entrada);
    if (!usuario?.avatar) {
        throw new ErrorAvatar("Primero crea tu avatar para poder mandar stickers");
    }

    const avatar = normalizarAvatar(
        typeof usuario.avatar.toObject === "function" ? usuario.avatar.toObject() : usuario.avatar
    );

    return { avatar, ...pose };
}

module.exports = { ErrorAvatar, normalizarAvatar, normalizarPose, construirSticker };
