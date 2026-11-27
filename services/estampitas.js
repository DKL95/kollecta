/* ==========================================================================
   Sobres de estampitas: sorteo en el servidor y guardado en el álbum.
   ========================================================================== */

const crypto = require("crypto");
const Usuario = require("../models/Usuario");
const { ESTAMPITAS, RAREZAS, ORDEN_RAREZAS, SERIES } = require("../models/estampitas");

// Número al azar en [0, 1) con el generador seguro del sistema.
const azarSeguro = () => crypto.randomInt(0, 1_000_000) / 1_000_000;

// Elige una rareza según su peso, sin bajar de minRareza.
function sortearRareza(minRareza = "comun", azar = azarSeguro) {
    const desde = Math.max(0, ORDEN_RAREZAS.indexOf(minRareza));
    const posibles = ORDEN_RAREZAS.slice(desde);
    const total = posibles.reduce((suma, r) => suma + RAREZAS[r], 0);
    let tiro = azar() * total;
    for (const rareza of posibles) {
        tiro -= RAREZAS[rareza];
        if (tiro < 0) return rareza;
    }
    return posibles[posibles.length - 1];
}

// Regresa los ids de las estampitas del sobre. La primera respeta minRareza
// (la "garantizada"); las demás salen con la probabilidad normal.
function sortearSobre(cantidad, minRareza = "comun", azar = azarSeguro) {
    const resultado = [];
    for (let i = 0; i < cantidad; i++) {
        const rareza = sortearRareza(i === 0 ? minRareza : "comun", azar);
        const opciones = ESTAMPITAS.filter((e) => e.rareza === rareza);
        resultado.push(opciones[Math.floor(azar() * opciones.length)].id);
    }
    return resultado;
}

function seriesCompletas(album) {
    const tengo = new Set(album.map((e) => e.id));
    return SERIES.filter((serie) => ESTAMPITAS.filter((e) => e.serie === serie).every((e) => tengo.has(e.id)));
}

// Agrega las estampitas al álbum. Regresa cuáles eran nuevas y las series
// que se completaron con este sobre.
async function agregarAlAlbum(usuarioId, ids) {
    const usuario = await Usuario.findById(usuarioId).select("estampitas");
    if (!usuario) throw new Error("Usuario no encontrado");

    const antes = seriesCompletas(usuario.estampitas);
    const obtenidas = [];

    for (const id of ids) {
        const existente = usuario.estampitas.find((e) => e.id === id);
        if (existente) {
            existente.cantidad += 1;
            obtenidas.push({ id, nueva: false });
        } else {
            usuario.estampitas.push({ id, cantidad: 1 });
            obtenidas.push({ id, nueva: true });
        }
    }

    await usuario.save();

    const despues = seriesCompletas(usuario.estampitas);
    return {
        obtenidas,
        seriesNuevas: despues.filter((serie) => !antes.includes(serie)),
        album: usuario.estampitas
    };
}

module.exports = { sortearRareza, sortearSobre, agregarAlAlbum, seriesCompletas };
