/* ==========================================================================
   Duración de un video sin instalar ffmpeg.
   - MP4 / MOV / M4V: se lee la caja "mvhd" dentro de "moov" (escala y duración).
   - WebM / MKV: se lee Segment → Info → Duration (con su TimecodeScale).
   Regresa los segundos o null si no se pudo leer (p. ej. un WebM grabado con
   MediaRecorder, que no escribe la duración). En ese caso el controlador usa la
   duración que mandó el navegador, que también se valida contra el límite.
   ========================================================================== */

const fs = require("fs");

/* ------------------------------ MP4 / MOV ------------------------------ */

// Recorre cajas [tamaño(4) tipo(4) ...] entre inicio y fin; regresa { inicio, fin } del contenido de "tipo".
function buscarCaja(buffer, tipo, inicio = 0, fin = buffer.length) {
    let pos = inicio;

    while (pos + 8 <= fin) {
        let tamano = buffer.readUInt32BE(pos);
        const nombre = buffer.toString("latin1", pos + 4, pos + 8);
        let cabecera = 8;

        if (tamano === 1) {
            if (pos + 16 > fin) return null;
            tamano = Number(buffer.readBigUInt64BE(pos + 8));
            cabecera = 16;
        } else if (tamano === 0) {
            tamano = fin - pos; // la caja llega hasta el final
        }

        if (tamano < cabecera || pos + tamano > fin) return null;

        if (nombre === tipo) return { inicio: pos + cabecera, fin: pos + tamano };
        pos += tamano;
    }

    return null;
}

function duracionMp4(buffer) {
    const ftyp = buffer.length >= 8 && buffer.toString("latin1", 4, 8);
    if (!["ftyp", "moov", "mdat", "wide", "free"].includes(ftyp)) return null;

    const moov = buscarCaja(buffer, "moov");
    if (!moov) return null;

    const mvhd = buscarCaja(buffer, "mvhd", moov.inicio, moov.fin);
    if (!mvhd || mvhd.fin - mvhd.inicio < 20) return null;

    const version = buffer.readUInt8(mvhd.inicio);
    let escala;
    let duracion;

    if (version === 1) {
        if (mvhd.fin - mvhd.inicio < 32) return null;
        escala = buffer.readUInt32BE(mvhd.inicio + 20);
        duracion = Number(buffer.readBigUInt64BE(mvhd.inicio + 24));
    } else {
        escala = buffer.readUInt32BE(mvhd.inicio + 12);
        duracion = buffer.readUInt32BE(mvhd.inicio + 16);
    }

    if (!escala || duracion === 0xffffffff) return null;
    return duracion / escala;
}

/* ------------------------------ WebM / MKV ----------------------------- */

const EBML = 0x1a45dfa3;
const SEGMENT = 0x18538067;
const INFO = 0x1549a966;
const TIMECODE_SCALE = 0x2ad7b1;
const DURATION = 0x4489;

// Número de longitud variable de EBML. conMarca = true para los ID (se conserva el bit de longitud).
function leerVint(buffer, pos, conMarca) {
    if (pos >= buffer.length) return null;
    const primero = buffer[pos];
    let largo = 1;
    let mascara = 0x80;

    while (largo <= 8 && !(primero & mascara)) {
        largo++;
        mascara >>= 1;
    }
    if (largo > 8 || pos + largo > buffer.length) return null;

    let valor = conMarca ? primero : primero & (mascara - 1);
    let desconocido = !conMarca && valor === mascara - 1;
    for (let i = 1; i < largo; i++) {
        valor = valor * 256 + buffer[pos + i];
        if (buffer[pos + i] !== 0xff) desconocido = false;
    }

    return { valor, largo, desconocido };
}

function leerElemento(buffer, pos) {
    const id = leerVint(buffer, pos, true);
    if (!id) return null;
    const tamano = leerVint(buffer, pos + id.largo, false);
    if (!tamano) return null;

    const inicio = pos + id.largo + tamano.largo;
    const fin = tamano.desconocido ? buffer.length : Math.min(buffer.length, inicio + tamano.valor);
    return { id: id.valor, inicio, fin, tamano: tamano.valor };
}

function duracionWebm(buffer) {
    const cabecera = leerElemento(buffer, 0);
    if (!cabecera || cabecera.id !== EBML) return null;

    const segmento = leerElemento(buffer, cabecera.fin);
    if (!segmento || segmento.id !== SEGMENT) return null;

    // Info suele estar al principio del segmento.
    let pos = segmento.inicio;
    while (pos < segmento.fin) {
        const elemento = leerElemento(buffer, pos);
        if (!elemento || elemento.fin <= pos) return null;

        if (elemento.id === INFO) {
            let escala = 1_000_000; // nanosegundos por "tick" (valor por omisión)
            let duracion = null;
            let p = elemento.inicio;

            while (p < elemento.fin) {
                const hijo = leerElemento(buffer, p);
                if (!hijo || hijo.fin <= p) break;

                if (hijo.id === TIMECODE_SCALE) {
                    escala = buffer.readUIntBE(hijo.inicio, Math.min(6, hijo.fin - hijo.inicio));
                } else if (hijo.id === DURATION) {
                    const largo = hijo.fin - hijo.inicio;
                    if (largo === 4) duracion = buffer.readFloatBE(hijo.inicio);
                    else if (largo === 8) duracion = buffer.readDoubleBE(hijo.inicio);
                }
                p = hijo.fin;
            }

            if (duracion === null || !Number.isFinite(duracion) || duracion <= 0) return null;
            return (duracion * escala) / 1e9;
        }

        pos = elemento.fin;
    }

    return null;
}

/* ------------------------------- Entrada ------------------------------- */

function duracionDeBuffer(buffer) {
    try {
        const segundos = duracionMp4(buffer) ?? duracionWebm(buffer);
        return Number.isFinite(segundos) && segundos > 0 ? Math.round(segundos * 100) / 100 : null;
    } catch {
        return null;
    }
}

// Los videos permitidos pesan 15 MB como máximo, así que leer el archivo completo es seguro.
async function duracionDeArchivo(ruta) {
    try {
        return duracionDeBuffer(await fs.promises.readFile(ruta));
    } catch {
        return null;
    }
}

module.exports = { duracionDeBuffer, duracionDeArchivo };
