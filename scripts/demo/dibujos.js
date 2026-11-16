/* ==========================================================================
   Dibujos originales para los datos de demostración (sin fotos de terceros):
   álbumes, photocards, lightsticks, peluches, posters, llaveros, ropa y
   escenas para publicaciones. Se generan como SVG y se pasan a PNG con
   Edge/Chrome sin ventana.

   Uso:  node scripts/demo/dibujos.js   → scripts/demo/dibujos/*.png
   ========================================================================== */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const SALIDA = path.join(__dirname, "dibujos");
const T = 600;

const PALETAS = {
    rosa: ["#ff8fc7", "#ff4fa3", "#ffe1f0"],
    lila: ["#c8a6ff", "#9b5cff", "#f0e6ff"],
    cielo: ["#8fdcff", "#3aa8e6", "#e2f6ff"],
    menta: ["#9ff0cf", "#2fc48d", "#e3fff3"],
    durazno: ["#ffc59a", "#ff8a4c", "#fff0e4"],
    limon: ["#ffe58a", "#f5b700", "#fff9dc"],
    noche: ["#7a7fd6", "#2b2f77", "#e3e5ff"],
    rojo: ["#ff8a8a", "#e23b4e", "#ffe5e8"]
};

const fondo = (p, extra = "") => `
<defs>
  <radialGradient id="bg" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="${p[2]}"/><stop offset="1" stop-color="${p[0]}"/></radialGradient>
  <linearGradient id="holo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd6f2"/><stop offset=".35" stop-color="#d6e8ff"/><stop offset=".7" stop-color="#dcffe9"/><stop offset="1" stop-color="#fff4c9"/></linearGradient>
  ${extra}
</defs>
<rect width="${T}" height="${T}" fill="url(#bg)"/>
${confeti(p)}`;

function confeti(p) {
    const puntos = [[70, 80], [520, 110], [90, 500], [530, 470], [300, 60], [470, 300], [120, 290]];
    return puntos
        .map(([x, y], i) =>
            i % 3 === 0
                ? estrella(x, y, 13, "#fff", 0.85)
                : i % 3 === 1
                    ? corazon(x, y, 11, p[1], 0.45)
                    : `<circle cx="${x}" cy="${y}" r="6" fill="#fff" opacity=".7"/>`
        )
        .join("");
}

function estrella(cx, cy, r, color, op = 1) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const rr = i % 2 ? r * 0.45 : r;
        pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
    }
    return `<polygon points="${pts.join(" ")}" fill="${color}" opacity="${op}"/>`;
}

function corazon(cx, cy, s, color, op = 1) {
    return `<path transform="translate(${cx} ${cy}) scale(${s / 10})" d="M0 4 C -9 -3 -6 -11 0 -6 C 6 -11 9 -3 0 4 Z" fill="${color}" opacity="${op}"/>`;
}

// Carita tierna: oso, conejo o gato.
function carita(cx, cy, r, color, animal = "oso") {
    const orejas = {
        oso: `<circle cx="${cx - r * 0.72}" cy="${cy - r * 0.72}" r="${r * 0.32}" fill="${color}"/><circle cx="${cx + r * 0.72}" cy="${cy - r * 0.72}" r="${r * 0.32}" fill="${color}"/>
              <circle cx="${cx - r * 0.72}" cy="${cy - r * 0.72}" r="${r * 0.16}" fill="#ffc2dc"/><circle cx="${cx + r * 0.72}" cy="${cy - r * 0.72}" r="${r * 0.16}" fill="#ffc2dc"/>`,
        conejo: `<ellipse cx="${cx - r * 0.42}" cy="${cy - r * 1.15}" rx="${r * 0.2}" ry="${r * 0.6}" fill="${color}"/><ellipse cx="${cx + r * 0.42}" cy="${cy - r * 1.15}" rx="${r * 0.2}" ry="${r * 0.6}" fill="${color}"/>
                 <ellipse cx="${cx - r * 0.42}" cy="${cy - r * 1.12}" rx="${r * 0.09}" ry="${r * 0.42}" fill="#ffc2dc"/><ellipse cx="${cx + r * 0.42}" cy="${cy - r * 1.12}" rx="${r * 0.09}" ry="${r * 0.42}" fill="#ffc2dc"/>`,
        gato: `<path d="M${cx - r * 0.9} ${cy - r * 0.35} L${cx - r * 0.75} ${cy - r * 1.15} L${cx - r * 0.2} ${cy - r * 0.8} Z" fill="${color}"/><path d="M${cx + r * 0.9} ${cy - r * 0.35} L${cx + r * 0.75} ${cy - r * 1.15} L${cx + r * 0.2} ${cy - r * 0.8} Z" fill="${color}"/>`
    }[animal];
    return `${orejas}
<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>
<circle cx="${cx - r * 0.36}" cy="${cy - r * 0.05}" r="${r * 0.1}" fill="#2a2140"/><circle cx="${cx + r * 0.36}" cy="${cy - r * 0.05}" r="${r * 0.1}" fill="#2a2140"/>
<circle cx="${cx - r * 0.33}" cy="${cy - r * 0.09}" r="${r * 0.035}" fill="#fff"/><circle cx="${cx + r * 0.39}" cy="${cy - r * 0.09}" r="${r * 0.035}" fill="#fff"/>
<ellipse cx="${cx - r * 0.58}" cy="${cy + r * 0.25}" rx="${r * 0.16}" ry="${r * 0.09}" fill="#ff8fb8" opacity=".7"/><ellipse cx="${cx + r * 0.58}" cy="${cy + r * 0.25}" rx="${r * 0.16}" ry="${r * 0.09}" fill="#ff8fb8" opacity=".7"/>
<path d="M${cx - r * 0.12} ${cy + r * 0.2} Q${cx} ${cy + r * 0.34} ${cx + r * 0.12} ${cy + r * 0.2}" stroke="#2a2140" stroke-width="${r * 0.05}" fill="none" stroke-linecap="round"/>`;
}

const DIBUJOS = {
    album: (p, { animal = "oso", texto = "MINI ALBUM" } = {}) => `${fondo(p)}
<g transform="rotate(-6 300 300)">
  <circle cx="400" cy="300" r="150" fill="#d9dbe6"/><circle cx="400" cy="300" r="150" fill="url(#holo)" opacity=".6"/>
  <circle cx="400" cy="300" r="34" fill="#fff"/><circle cx="400" cy="300" r="12" fill="${p[0]}"/>
  <rect x="120" y="140" width="300" height="320" rx="16" fill="${p[1]}"/>
  <rect x="120" y="140" width="300" height="320" rx="16" fill="url(#holo)" opacity=".25"/>
  <circle cx="270" cy="290" r="95" fill="${p[2]}" opacity=".9"/>
  ${carita(270, 300, 62, "#fff", animal)}
  ${estrella(165, 185, 16, "#fff")}${estrella(380, 420, 12, "#fff", .8)}
  <rect x="150" y="410" width="160" height="30" rx="15" fill="#fff" opacity=".95"/>
  <text x="230" y="431" font-family="Segoe UI, sans-serif" font-size="16" font-weight="800" text-anchor="middle" fill="${p[1]}" letter-spacing="2">${texto}</text>
</g>`,

    photocard: (p, { animal = "conejo" } = {}) => `${fondo(p)}
<g transform="rotate(5 300 300)">
  <rect x="170" y="85" width="260" height="400" rx="18" fill="#fff" opacity=".55" stroke="#fff" stroke-width="4"/>
  <rect x="190" y="105" width="220" height="330" rx="14" fill="url(#holo)"/>
  <rect x="190" y="105" width="220" height="330" rx="14" fill="${p[0]}" opacity=".35"/>
  ${carita(300, 270, 70, "#fff", animal)}
  ${corazon(240, 150, 14, p[1])}${estrella(370, 380, 14, "#fff")}${estrella(225, 395, 9, "#fff")}
  <rect x="215" y="395" width="120" height="22" rx="11" fill="#fff" opacity=".9"/>
  <text x="275" y="411" font-family="Segoe UI, sans-serif" font-size="12" font-weight="800" text-anchor="middle" fill="${p[1]}">PHOTOCARD</text>
  <rect x="180" y="95" width="60" height="400" fill="#fff" opacity=".18" transform="skewX(-12)"/>
</g>`,

    lightstick: (p, { forma = "corazon" } = {}) => {
        const cabeza = {
            corazon: `<path transform="translate(300 210) scale(13)" d="M0 4 C -9 -3 -6 -11 0 -6 C 6 -11 9 -3 0 4 Z" fill="${p[0]}" stroke="#fff" stroke-width=".35"/>`,
            estrella: estrella(300, 200, 120, p[0]) + estrella(300, 200, 120, "none"),
            esfera: `<circle cx="300" cy="200" r="110" fill="${p[0]}" stroke="#fff" stroke-width="5"/><circle cx="260" cy="160" r="30" fill="#fff" opacity=".55"/>`
        }[forma];
        return `${fondo(p, `<radialGradient id="brillo"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="${p[0]}" stop-opacity="0"/></radialGradient>`)}
<circle cx="300" cy="200" r="210" fill="url(#brillo)"/>
${cabeza}
<rect x="270" y="300" width="60" height="230" rx="26" fill="#f4f1fb" stroke="#d8d2ea" stroke-width="4"/>
<rect x="270" y="300" width="60" height="38" rx="14" fill="${p[1]}"/>
<circle cx="300" cy="400" r="12" fill="${p[1]}"/>
<rect x="282" y="430" width="36" height="70" rx="12" fill="#e7e2f3"/>`;
    },

    peluche: (p, { animal = "oso" } = {}) => `${fondo(p)}
<ellipse cx="300" cy="530" rx="170" ry="22" fill="#000" opacity=".08"/>
<ellipse cx="300" cy="420" rx="150" ry="120" fill="${p[0]}"/>
<ellipse cx="300" cy="440" rx="85" ry="75" fill="${p[2]}"/>
<ellipse cx="185" cy="470" rx="48" ry="40" fill="${p[0]}"/><ellipse cx="415" cy="470" rx="48" ry="40" fill="${p[0]}"/>
<ellipse cx="225" cy="525" rx="52" ry="34" fill="${p[0]}"/><ellipse cx="375" cy="525" rx="52" ry="34" fill="${p[0]}"/>
${carita(300, 240, 120, p[0], animal)}
${corazon(300, 440, 20, p[1])}`,

    poster: (p) => `${fondo(p)}
<g transform="rotate(-4 300 300)">
  <rect x="140" y="90" width="320" height="420" rx="6" fill="#fff"/>
  <rect x="160" y="110" width="280" height="330" fill="${p[1]}"/>
  <rect x="160" y="110" width="280" height="330" fill="url(#holo)" opacity=".3"/>
  <circle cx="300" cy="260" r="100" fill="${p[0]}"/>
  ${estrella(300, 260, 70, "#fff")}${estrella(200, 150, 18, "#fff")}${estrella(400, 400, 14, "#fff")}
  <rect x="190" y="460" width="220" height="16" rx="8" fill="${p[1]}" opacity=".5"/>
  <circle cx="155" cy="105" r="9" fill="${p[1]}"/><circle cx="445" cy="105" r="9" fill="${p[1]}"/>
</g>
<rect x="440" y="380" width="70" height="170" rx="35" fill="#fff" transform="rotate(25 475 465)"/>
<ellipse cx="475" cy="390" rx="35" ry="14" fill="${p[0]}" transform="rotate(25 475 465)"/>`,

    llavero: (p, { animal = "gato" } = {}) => `${fondo(p)}
<circle cx="300" cy="130" r="55" fill="none" stroke="#c9c4d6" stroke-width="12"/>
<rect x="292" y="180" width="16" height="50" rx="6" fill="#c9c4d6"/>
<path transform="translate(300 360) scale(17)" d="M0 4 C -9 -3 -6 -11 0 -6 C 6 -11 9 -3 0 4 Z" fill="#fff" opacity=".8" stroke="#fff" stroke-width=".25"/>
<path transform="translate(300 360) scale(15)" d="M0 4 C -9 -3 -6 -11 0 -6 C 6 -11 9 -3 0 4 Z" fill="${p[0]}"/>
${carita(300, 330, 60, "#fff", animal)}
<rect x="240" y="230" width="40" height="230" fill="#fff" opacity=".2" transform="skewX(-15)"/>`,

    sudadera: (p) => `${fondo(p)}
<path d="M200 140 L250 120 Q300 160 350 120 L400 140 L500 230 L450 290 L410 260 L410 500 L190 500 L190 260 L150 290 L100 230 Z" fill="${p[1]}"/>
<path d="M250 120 Q300 190 350 120" fill="none" stroke="#fff" stroke-width="10" opacity=".5"/>
<rect x="190" y="470" width="220" height="30" fill="#000" opacity=".12"/>
${corazon(300, 310, 55, "#fff")}${estrella(300, 300, 22, p[1])}
<rect x="245" y="400" width="110" height="60" rx="10" fill="#000" opacity=".1"/>`,

    bolsa: (p) => `${fondo(p)}
<path d="M230 220 Q230 120 300 120 Q370 120 370 220" fill="none" stroke="${p[1]}" stroke-width="16"/>
<path d="M170 210 L430 210 L460 510 L140 510 Z" fill="#fff8ef"/>
<path d="M170 210 L430 210 L460 510 L140 510 Z" fill="${p[2]}" opacity=".5"/>
${carita(300, 370, 80, p[0], "conejo")}
${estrella(200, 260, 14, p[1])}${corazon(410, 470, 14, p[1])}`,

    coleccion: (p) => {
        const albumes = [0, 1, 2, 3, 4].map((i) => {
            const c = Object.values(PALETAS)[i + 1];
            return `<rect x="${95 + i * 85}" y="${170 - (i % 2) * 15}" width="70" height="${150 + (i % 2) * 15}" rx="6" fill="${c[1]}"/>${estrella(130 + i * 85, 220, 14, "#fff", .9)}`;
        }).join("");
        const tarjetas = [0, 1, 2, 3].map((i) => `<rect x="${110 + i * 100}" y="380" width="70" height="100" rx="8" fill="url(#holo)" stroke="#fff" stroke-width="4"/>${corazon(145 + i * 100, 425, 12, Object.values(PALETAS)[i][1])}`).join("");
        return `${fondo(p)}
<rect x="70" y="320" width="460" height="20" rx="6" fill="#8b6b4a"/><rect x="70" y="490" width="460" height="20" rx="6" fill="#8b6b4a"/>
${albumes}${tarjetas}`;
    },

    concierto: (p) => `${fondo(PALETAS.noche, `<linearGradient id="haz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`)}
<rect width="600" height="600" fill="#1a1440" opacity=".55"/>
<path d="M120 0 L60 330 L190 330 Z" fill="url(#haz)"/><path d="M480 0 L410 330 L540 330 Z" fill="url(#haz)"/><path d="M300 0 L230 330 L370 330 Z" fill="url(#haz)"/>
<rect x="40" y="330" width="520" height="40" fill="#2b2f77"/>
${[...Array(14)].map((_, i) => {
        const x = 40 + i * 40;
        const y = 440 + (i % 3) * 22;
        return `<circle cx="${x}" cy="${y + 60}" r="34" fill="#140f2e"/><rect x="${x - 4}" y="${y - 40}" width="8" height="70" rx="4" fill="#ddd"/>${corazon(x, y - 48, 9, p[0])}<circle cx="${x}" cy="${y - 48}" r="16" fill="${p[0]}" opacity=".3"/>`;
    }).join("")}`,

    unboxing: (p) => `${fondo(p)}
<path d="M140 280 L300 220 L460 280 L300 340 Z" fill="#e7c79c"/>
<path d="M140 280 L300 340 L300 520 L140 460 Z" fill="#d4ad7c"/><path d="M460 280 L300 340 L300 520 L460 460 Z" fill="#c19a69"/>
<path d="M140 280 L80 200 L240 150 L300 220 Z" fill="#edd3ad"/><path d="M460 280 L520 200 L360 150 L300 220 Z" fill="#edd3ad"/>
<rect x="240" y="120" width="120" height="150" rx="10" fill="${p[1]}" transform="rotate(-8 300 195)"/>
${estrella(300, 190, 30, "#fff")}
${corazon(180, 120, 18, p[1])}${corazon(430, 110, 14, p[1])}${estrella(500, 330, 16, "#fff")}${estrella(100, 360, 12, "#fff")}`
};

// Qué se dibuja: nombre del archivo → [tipo, paleta, opciones].
const CATALOGO = {
    "album-rosa": ["album", "rosa", { animal: "conejo" }],
    "album-lila": ["album", "lila", { animal: "oso", texto: "1ST ALBUM" }],
    "album-cielo": ["album", "cielo", { animal: "gato", texto: "REPACKAGE" }],
    "album-menta": ["album", "menta", { animal: "conejo", texto: "SPECIAL" }],
    "album-noche": ["album", "noche", { animal: "oso", texto: "2ND ALBUM" }],
    "album-durazno": ["album", "durazno", { animal: "gato", texto: "SINGLE" }],
    "pc-rosa": ["photocard", "rosa", { animal: "conejo" }],
    "pc-lila": ["photocard", "lila", { animal: "gato" }],
    "pc-cielo": ["photocard", "cielo", { animal: "oso" }],
    "pc-limon": ["photocard", "limon", { animal: "conejo" }],
    "pc-menta": ["photocard", "menta", { animal: "oso" }],
    "pc-rojo": ["photocard", "rojo", { animal: "gato" }],
    "ls-corazon": ["lightstick", "rosa", { forma: "corazon" }],
    "ls-estrella": ["lightstick", "limon", { forma: "estrella" }],
    "ls-esfera": ["lightstick", "cielo", { forma: "esfera" }],
    "peluche-oso": ["peluche", "durazno", { animal: "oso" }],
    "peluche-conejo": ["peluche", "lila", { animal: "conejo" }],
    "poster-noche": ["poster", "noche"],
    "poster-rosa": ["poster", "rosa"],
    "llavero-gato": ["llavero", "menta", { animal: "gato" }],
    "llavero-oso": ["llavero", "rosa", { animal: "oso" }],
    "sudadera-lila": ["sudadera", "lila"],
    "bolsa-cielo": ["bolsa", "cielo"],
    "escena-coleccion": ["coleccion", "durazno"],
    "escena-concierto": ["concierto", "rosa"],
    "escena-unboxing": ["unboxing", "lila"]
};

function svgDe(nombre) {
    const [tipo, paleta, opciones] = CATALOGO[nombre];
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${T} ${T}" width="${T}" height="${T}">${DIBUJOS[tipo](PALETAS[paleta], opciones)}</svg>`;
}

function buscarNavegador() {
    return [
        process.env.NAVEGADOR_PDF,
        "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
        "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium"
    ].filter(Boolean).find((c) => fs.existsSync(c));
}

function generar() {
    fs.mkdirSync(SALIDA, { recursive: true });
    const navegador = buscarNavegador();
    if (!navegador) throw new Error("No encontré Edge ni Chrome (NAVEGADOR_PDF)");
    const temporal = fs.mkdtempSync(path.join(os.tmpdir(), "kollecta-dibujos-"));
    try {
        for (const nombre of Object.keys(CATALOGO)) {
            const html = path.join(temporal, `${nombre}.html`);
            fs.writeFileSync(html, `<!doctype html><html><body style="margin:0;overflow:hidden">${svgDe(nombre)}</body></html>`);
            execFileSync(navegador, [
                "--headless=new", "--disable-gpu", "--hide-scrollbars",
                `--user-data-dir=${path.join(temporal, "perfil")}`,
                `--window-size=${T},${T}`,
                `--screenshot=${path.join(SALIDA, `${nombre}.png`)}`,
                "file:///" + html.replace(/\\/g, "/")
            ], { stdio: "ignore", timeout: 60000 });
        }
    } finally {
        fs.rmSync(temporal, { recursive: true, force: true });
    }
    return Object.keys(CATALOGO).length;
}

if (require.main === module) {
    console.log(`Generados ${generar()} dibujos en ${path.relative(process.cwd(), SALIDA)}`);
}

module.exports = { CATALOGO, svgDe, generar, SALIDA };
