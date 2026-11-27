/* ==========================================================================
   Dibujos de las estampitas (SVG 100 × 100). Arte original con figuras
   simples: nada de fotos, logos ni personajes de otros.
   ========================================================================== */

const T = "#2a1f3d"; // tinta
const L = { stroke: T, strokeWidth: 2.4, strokeLinejoin: "round", strokeLinecap: "round" };
const SIN = { fill: "none", stroke: T, strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" };

function estrella(cx, cy, r, props) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return <polygon points={pts.join(" ")} {...props} />;
}

const corazon = (x, y, s) =>
  `M${x} ${y + s * 0.9} C${x - s * 1.6} ${y - s * 0.1} ${x - s * 0.7} ${y - s * 1.3} ${x} ${y - s * 0.45} C${x + s * 0.7} ${y - s * 1.3} ${x + s * 1.6} ${y - s * 0.1} ${x} ${y + s * 0.9} Z`;

const destello = (x, y, r, color = "#ffffff") => (
  <path
    d={`M${x} ${y - r} Q${x + r * 0.2} ${y - r * 0.2} ${x + r} ${y} Q${x + r * 0.2} ${y + r * 0.2} ${x} ${y + r} Q${x - r * 0.2} ${y + r * 0.2} ${x - r} ${y} Q${x - r * 0.2} ${y - r * 0.2} ${x} ${y - r} Z`}
    fill={color}
  />
);

/* ------------------------------ Lightsticks ------------------------------ */

function Lightstick({ color, cabeza, banda = "#ff4fa3" }) {
  return (
    <g>
      <circle cx="50" cy="34" r="30" fill={color} opacity="0.28" />
      <circle cx="50" cy="34" r="22" fill={color} opacity="0.25" />
      <rect x="44" y="52" width="12" height="40" rx="5" fill="#f4f1fa" {...L} />
      <rect x="44" y="68" width="12" height="7" fill={banda} {...L} strokeWidth="1.8" />
      <circle cx="50" cy="84" r="2.2" fill="#9b5cff" />
      <rect x="42" y="49" width="16" height="6" rx="2" fill="#d9d4e6" {...L} strokeWidth="1.8" />
      {cabeza}
      {destello(30, 16, 4)}
      {destello(74, 22, 3)}
    </g>
  );
}

const LIGHTSTICKS = {
  ls_estrella: <Lightstick color="#ffd166" cabeza={estrella(50, 32, 20, { fill: "#ffe48a", ...L })} />,
  ls_corazon: <Lightstick color="#ff4fa3" banda="#ffd166" cabeza={<path d={corazon(50, 32, 15)} fill="#ff8fc7" {...L} />} />,
  ls_luna: (
    <Lightstick
      color="#b69cff"
      cabeza={<path d="M58 14 A19 19 0 1 0 58 50 A15 15 0 1 1 58 14 Z" fill="#e2d6ff" {...L} />}
    />
  ),
  ls_diamante: (
    <Lightstick
      color="#4fd8ff"
      cabeza={
        <g>
          <path d="M34 26 L42 14 L58 14 L66 26 L50 50 Z" fill="#bff0ff" {...L} />
          <path d="M34 26 L66 26 M42 14 L46 26 L50 50 L54 26 L58 14" {...SIN} strokeWidth="1.6" />
        </g>
      }
    />
  ),
  ls_corona: (
    <Lightstick
      color="#ffd166"
      banda="#9b5cff"
      cabeza={
        <g>
          <path d="M32 46 L30 18 L41 30 L50 12 L59 30 L70 18 L68 46 Z" fill="#ffd166" stroke="#a86b12" strokeWidth="2.4" strokeLinejoin="round" />
          <circle cx="50" cy="36" r="4" fill="#ff4fa3" />
          <circle cx="39" cy="39" r="2.6" fill="#4fd8ff" />
          <circle cx="61" cy="39" r="2.6" fill="#4fd8ff" />
        </g>
      }
    />
  ),
  ls_arcoiris: (
    <Lightstick
      color="#ff8fc7"
      cabeza={
        <g>
          {["#ff5c72", "#ff9f43", "#ffd166", "#3ddc97", "#4f8cff", "#9b5cff"].map((c, i) => (
            <circle key={c} cx="50" cy="32" r={20 - i * 3} fill={c} />
          ))}
          <circle cx="50" cy="32" r="20" {...SIN} />
          <circle cx="44" cy="25" r="3" fill="#ffffff" opacity="0.8" />
        </g>
      }
    />
  ),
};

/* -------------------------------- Álbumes -------------------------------- */

function Album({ fondo, portada, extra }) {
  return (
    <g>
      <circle cx="66" cy="48" r="26" fill="#e8e6f0" {...L} />
      <circle cx="66" cy="48" r="17" fill="none" stroke="#c9c4d6" strokeWidth="1.5" />
      <circle cx="66" cy="48" r="5" fill="#ffffff" {...L} strokeWidth="1.8" />
      <g transform="rotate(-6 40 52)">
        <rect x="12" y="20" width="56" height="62" rx="3" fill={fondo} {...L} />
        <rect x="12" y="20" width="7" height="62" fill="rgba(0,0,0,0.18)" />
        {portada}
      </g>
      {extra}
    </g>
  );
}

const ALBUMES = {
  al_debut: (
    <Album
      fondo="#ff8fc7"
      portada={
        <g>
          {estrella(42, 46, 16, { fill: "none", stroke: "#ffffff", strokeWidth: 3, strokeLinejoin: "round" })}
          <rect x="24" y="68" width="36" height="6" rx="3" fill="#ffffff" />
        </g>
      }
    />
  ),
  al_verano: (
    <Album
      fondo="#4fd8ff"
      portada={
        <g>
          <circle cx="44" cy="40" r="10" fill="#ffd166" />
          <path d="M20 64 Q28 58 36 64 T52 64 T68 64 L68 82 L20 82 Z" fill="#2b6cb0" />
          <path d="M20 72 Q28 66 36 72 T52 72 T68 72" fill="none" stroke="#bff0ff" strokeWidth="2" />
        </g>
      }
    />
  ),
  al_invierno: (
    <Album
      fondo="#3b4a8f"
      portada={
        <g stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round">
          <path d="M42 30 L42 66 M26 48 L58 48 M30 36 L54 60 M54 36 L30 60" />
          <path d="M38 32 L42 36 L46 32 M38 64 L42 60 L46 64" fill="none" />
          <circle cx="24" cy="28" r="1.6" fill="#ffffff" stroke="none" />
          <circle cx="60" cy="72" r="1.6" fill="#ffffff" stroke="none" />
        </g>
      }
    />
  ),
  al_retro: (
    <Album
      fondo="#ffd166"
      portada={
        <g>
          {["#ff5c72", "#ff9f43", "#3ddc97", "#4f8cff"].map((c, i) => (
            <rect key={c} x="19" y={30 + i * 7} width="49" height="5" fill={c} />
          ))}
          <rect x="26" y="62" width="32" height="14" rx="2" fill="#2a2340" />
          <circle cx="35" cy="69" r="3" fill="#ffffff" />
          <circle cx="49" cy="69" r="3" fill="#ffffff" />
        </g>
      }
    />
  ),
  al_holo: (
    <Album
      fondo="#e0d4ff"
      portada={
        <g>
          {["#ffb3e6", "#b3e5ff", "#d4ffb3"].map((c, i) => (
            <path key={c} d={`M${19 + i * 13} 82 L${31 + i * 13} 20 L${39 + i * 13} 20 L${27 + i * 13} 82 Z`} fill={c} opacity="0.9" />
          ))}
          {destello(40, 44, 14)}
          {destello(56, 66, 6)}
          {destello(26, 70, 4)}
        </g>
      }
    />
  ),
  al_firmado: (
    <Album
      fondo="#2a2340"
      portada={
        <g>
          <path d="M22 60 C30 44 36 70 44 52 C50 40 52 64 60 50" fill="none" stroke="#ffd166" strokeWidth="3" strokeLinecap="round" />
          <path d={corazon(56, 34, 6)} fill="#ff4fa3" />
          <path d="M24 70 L58 70" stroke="#ffd166" strokeWidth="1.6" strokeDasharray="2 3" />
        </g>
      }
      extra={
        <g transform="rotate(35 80 78)">
          <rect x="76" y="58" width="7" height="30" rx="2" fill="#ff4fa3" {...L} strokeWidth="1.8" />
          <path d="M76 88 L79.5 96 L83 88 Z" fill="#f4f1fa" {...L} strokeWidth="1.8" />
        </g>
      }
    />
  ),
};

/* ------------------------------- Escenario ------------------------------- */

const ESCENARIO = {
  es_micro: (
    <g>
      <path d="M42 44 L58 44 L54 90 L46 90 Z" fill="#2a2340" {...L} />
      <rect x="42" y="56" width="16" height="6" fill="#ff4fa3" />
      <circle cx="50" cy="28" r="17" fill="#c9c4d6" {...L} />
      <path d="M38 22 L62 22 M35 30 L65 30 M38 38 L62 38 M44 13 L44 43 M50 11 L50 45 M56 13 L56 43" stroke="#8d86a3" strokeWidth="1.3" />
      <circle cx="50" cy="28" r="17" {...SIN} />
      {destello(74, 18, 5, "#ffd166")}
      <path d="M72 40 Q78 46 74 54 M78 34 Q88 44 80 58" {...SIN} stroke="#ff8fc7" />
    </g>
  ),
  es_inear: (
    <g>
      <path d="M30 40 C30 70 50 70 50 82 C50 70 70 70 70 40" fill="none" stroke="#2a2340" strokeWidth="3" />
      <path d="M50 82 L50 92" stroke="#2a2340" strokeWidth="3" />
      <path d="M18 30 C18 18 34 14 38 26 C41 36 32 46 24 44 C20 43 18 38 18 30 Z" fill="#7fb2ff" {...L} />
      <path d="M82 30 C82 18 66 14 62 26 C59 36 68 46 76 44 C80 43 82 38 82 30 Z" fill="#ff8fc7" {...L} />
      <circle cx="28" cy="30" r="4" fill="#ffffff" {...L} strokeWidth="1.6" />
      <circle cx="72" cy="30" r="4" fill="#ffffff" {...L} strokeWidth="1.6" />
      <path d="M40 10 Q44 6 48 10 M52 10 Q56 6 60 10" {...SIN} strokeWidth="2" />
    </g>
  ),
  es_reflector: (
    <g>
      <path d="M38 26 L62 26 L92 92 L8 92 Z" fill="#fff3b0" opacity="0.55" />
      <ellipse cx="50" cy="90" rx="38" ry="6" fill="#ffe48a" opacity="0.7" />
      <rect x="34" y="8" width="32" height="22" rx="4" fill="#2a2340" {...L} />
      <ellipse cx="50" cy="30" rx="14" ry="4" fill="#ffe48a" {...L} strokeWidth="1.8" />
      <path d="M26 14 L34 18 M74 14 L66 18" stroke={T} strokeWidth="3" strokeLinecap="round" />
      {estrella(50, 70, 9, { fill: "#ffd166", ...L, strokeWidth: 1.8 })}
    </g>
  ),
  es_confeti: (
    <g>
      <path d="M20 90 L44 46 L58 60 Z" fill="#ff4fa3" {...L} />
      <path d="M30 72 L48 60 M25 82 L52 64" stroke="#ffd166" strokeWidth="3" />
      {[
        [62, 22, "#ffd166", 20], [76, 36, "#4fd8ff", -30], [54, 12, "#3ddc97", 45], [84, 18, "#ff5c72", 10],
        [70, 50, "#9b5cff", -15], [88, 54, "#ffd166", 60], [40, 22, "#ff8fc7", -40],
      ].map(([x, y, c, r]) => (
        <rect key={`${x}-${y}`} x={x - 4} y={y - 2} width="8" height="4" rx="1" fill={c} transform={`rotate(${r} ${x} ${y})`} />
      ))}
      <circle cx="66" cy="66" r="3" fill="#4fd8ff" />
      <circle cx="80" cy="74" r="2.4" fill="#ff8fc7" />
      <circle cx="48" cy="34" r="2.4" fill="#ffd166" />
      <path d="M58 40 Q64 30 72 30 M60 46 Q72 42 80 46" {...SIN} stroke="#ffffff" strokeWidth="2" />
    </g>
  ),
  es_setlist: (
    <g>
      <g transform="rotate(-5 50 52)">
        <rect x="22" y="14" width="56" height="76" rx="3" fill="#fffaf0" {...L} />
        <rect x="38" y="8" width="24" height="10" fill="#ffd166" opacity="0.85" transform="rotate(4 50 13)" />
        <rect x="30" y="24" width="40" height="7" rx="2" fill="#ff4fa3" />
        {[40, 50, 60, 70, 80].map((y, i) => (
          <g key={y}>
            <circle cx="32" cy={y} r="2" fill={T} />
            <rect x="37" y={y - 1.5} width={i % 2 ? 26 : 32} height="3" rx="1.5" fill="#8d86a3" />
          </g>
        ))}
        <path d={corazon(66, 70, 5)} fill="#ff4fa3" />
      </g>
    </g>
  ),
  es_trofeo: (
    <g>
      <path d="M30 18 L70 18 L66 50 C64 60 56 64 50 64 C44 64 36 60 34 50 Z" fill="#ffd166" stroke="#a86b12" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M30 24 C16 24 18 44 34 44 M70 24 C84 24 82 44 66 44" fill="none" stroke="#a86b12" strokeWidth="3.4" />
      <rect x="45" y="64" width="10" height="12" fill="#e2a93b" stroke="#a86b12" strokeWidth="2" />
      <rect x="32" y="76" width="36" height="12" rx="2" fill="#2a2340" {...L} />
      <text x="50" y="86" textAnchor="middle" fontSize="9" fontWeight="900" fill="#ffd166">#1</text>
      {estrella(50, 38, 10, { fill: "#fff3b0", stroke: "#a86b12", strokeWidth: 1.8, strokeLinejoin: "round" })}
      {destello(80, 14, 5, "#fff3b0")}
      {destello(20, 60, 4, "#fff3b0")}
    </g>
  ),
};

/* -------------------------------- Fandom --------------------------------- */

const FANDOM = {
  fa_photocard: (
    <g>
      <g transform="rotate(8 52 52)">
        <rect x="26" y="12" width="48" height="74" rx="6" fill="rgba(255,255,255,0.35)" {...L} />
        <rect x="30" y="16" width="40" height="58" rx="4" fill="#ffb3cf" />
        <circle cx="50" cy="40" r="11" fill="#f9d6bf" {...L} strokeWidth="1.8" />
        <path d="M39 38 C38 24 62 24 61 38 C58 31 42 31 39 38 Z" fill="#2a2340" />
        <path d="M32 74 C34 60 66 60 68 74 Z" fill="#9b5cff" />
        <path d="M45 44 Q50 48 55 44" {...SIN} strokeWidth="1.6" />
        <rect x="32" y="77" width="22" height="4" rx="2" fill="#ffffff" />
      </g>
      {destello(20, 22, 5)}
      {destello(84, 74, 4)}
    </g>
  ),
  fa_boleto: (
    <g transform="rotate(-10 50 50)">
      <path d="M10 30 L90 30 L90 44 A6 6 0 0 0 90 56 L90 70 L10 70 L10 56 A6 6 0 0 0 10 44 Z" fill="#ffd166" {...L} />
      <path d="M66 32 L66 68" stroke={T} strokeWidth="1.8" strokeDasharray="3 3" />
      <rect x="18" y="38" width="22" height="9" rx="2" fill="#ff4fa3" />
      <text x="29" y="45.5" textAnchor="middle" fontSize="7" fontWeight="900" fill="#ffffff">VIP</text>
      <rect x="18" y="52" width="40" height="3" rx="1.5" fill="#8d6a1f" />
      <rect x="18" y="58" width="28" height="3" rx="1.5" fill="#8d6a1f" />
      {[72, 75, 77, 80, 82, 85].map((x, i) => (
        <rect key={x} x={x} y="38" width={i % 2 ? 1.4 : 2.4} height="24" fill={T} />
      ))}
    </g>
  ),
  fa_pancarta: (
    <g>
      <rect x="22" y="58" width="6" height="34" rx="2" fill="#d9a074" {...L} strokeWidth="1.8" />
      <rect x="72" y="58" width="6" height="34" rx="2" fill="#d9a074" {...L} strokeWidth="1.8" />
      <path d="M10 22 L90 22 L88 62 L12 62 Z" fill="#fffaf0" {...L} />
      <path d={corazon(26, 38, 7)} fill="#ff4fa3" />
      <path d={corazon(74, 38, 7)} fill="#ff4fa3" />
      <rect x="36" y="32" width="28" height="7" rx="3.5" fill="#9b5cff" />
      <rect x="32" y="45" width="36" height="7" rx="3.5" fill="#4fd8ff" />
      {destello(86, 12, 4, "#ffd166")}
      {destello(14, 12, 3, "#ffd166")}
    </g>
  ),
  fa_binder: (
    <g>
      <rect x="18" y="12" width="64" height="78" rx="6" fill="#9b5cff" {...L} />
      <rect x="18" y="12" width="12" height="78" rx="4" fill="#7c3aed" {...L} />
      {[26, 50, 74].map((y) => <circle key={y} cx="24" cy={y} r="3" fill="#e8e6f0" {...L} strokeWidth="1.4" />)}
      <rect x="38" y="22" width="36" height="46" rx="4" fill="#ffffff" {...L} strokeWidth="1.8" />
      <path d={corazon(56, 42, 9)} fill="#ff8fc7" />
      {estrella(70, 76, 7, { fill: "#ffd166", ...L, strokeWidth: 1.6 })}
      <circle cx="44" cy="78" r="5" fill="#3ddc97" {...L} strokeWidth="1.6" />
    </g>
  ),
  fa_megafono: (
    <g>
      <path d="M18 42 L44 42 L76 22 L76 78 L44 58 L18 58 Z" fill="#ff5c72" {...L} />
      <rect x="10" y="40" width="10" height="20" rx="3" fill="#2a2340" {...L} />
      <path d="M30 58 L34 78 L44 78 L42 58" fill="#2a2340" {...L} />
      <ellipse cx="76" cy="50" rx="6" ry="28" fill="#ffb3b3" {...L} />
      <path d="M86 34 L94 28 M88 50 L98 50 M86 66 L94 72" {...SIN} strokeWidth="3" />
      <g fill="#ffd166" stroke={T} strokeWidth="1.6">
        <circle cx="56" cy="14" r="4" />
        <path d="M60 14 L60 2 L68 5" fill="none" />
      </g>
    </g>
  ),
  fa_firma: (
    <g>
      <g transform="rotate(-6 46 50)">
        <rect x="16" y="14" width="56" height="70" rx="3" fill="#ffffff" {...L} />
        <rect x="21" y="19" width="46" height="44" fill="#b3e5ff" />
        {estrella(44, 41, 12, { fill: "#ffd166", ...L, strokeWidth: 1.8 })}
        <path d="M24 74 C30 64 34 80 40 70 C44 62 46 78 54 68" fill="none" stroke="#ff4fa3" strokeWidth="2.6" strokeLinecap="round" />
      </g>
      <g transform="rotate(40 80 70)">
        <rect x="76" y="46" width="8" height="34" rx="3" fill="#2a2340" {...L} strokeWidth="1.8" />
        <path d="M76 80 L80 90 L84 80 Z" fill="#ffd166" {...L} strokeWidth="1.6" />
      </g>
      <path d={corazon(80, 22, 7)} fill="#ff4fa3" stroke={T} strokeWidth="1.6" />
    </g>
  ),
};

/* -------------------------------- Snacks --------------------------------- */

const SNACKS = {
  sn_tteokbokki: (
    <g>
      <path d="M40 22 Q36 14 42 8 M52 22 Q48 14 54 8 M64 22 Q60 14 66 8" {...SIN} stroke="#ffffff" strokeWidth="2" />
      <path d="M12 46 L88 46 C86 72 70 86 50 86 C30 86 14 72 12 46 Z" fill="#f4f1fa" {...L} />
      <ellipse cx="50" cy="46" rx="38" ry="10" fill="#e0474c" {...L} />
      {[[34, 42, 20], [50, 40, -15], [64, 44, 30], [44, 48, -40], [58, 49, 10]].map(([x, y, r]) => (
        <rect key={`${x}-${y}`} x={x - 8} y={y - 3.5} width="16" height="7" rx="3.5" fill="#fff3e6" stroke={T} strokeWidth="1.4" transform={`rotate(${r} ${x} ${y})`} />
      ))}
      <path d="M20 60 C30 64 70 64 80 60" fill="none" stroke="#e0476f" strokeWidth="2" />
    </g>
  ),
  sn_ramyeon: (
    <g>
      <path d="M6 44 L16 44 M84 44 L94 44" stroke="#c9a227" strokeWidth="6" strokeLinecap="round" />
      <path d="M14 40 L86 40 L80 82 C78 88 22 88 20 82 Z" fill="#ffd166" stroke="#a86b12" strokeWidth="2.4" strokeLinejoin="round" />
      <ellipse cx="50" cy="40" rx="36" ry="9" fill="#ffb067" stroke="#a86b12" strokeWidth="2.4" />
      <path d="M24 40 Q30 34 36 40 T48 40 T60 40 T72 40" fill="none" stroke="#fff3b0" strokeWidth="2.4" />
      <ellipse cx="62" cy="38" rx="9" ry="5" fill="#ffffff" {...L} strokeWidth="1.6" />
      <circle cx="62" cy="38" r="3" fill="#ffb800" />
      <path d="M30 6 L48 42 M38 4 L54 40" stroke="#c9845a" strokeWidth="3.4" strokeLinecap="round" />
    </g>
  ),
  sn_bungeoppang: (
    <g>
      <path d="M14 50 C24 26 62 24 76 44 L92 30 L88 50 L92 70 L76 56 C62 76 24 74 14 50 Z" fill="#e2a050" stroke="#8d5a1f" strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx="28" cy="46" r="3.4" fill={T} />
      <circle cx="29" cy="45" r="1" fill="#ffffff" />
      <path d="M22 56 Q26 58 30 56" fill="none" stroke="#8d5a1f" strokeWidth="2" strokeLinecap="round" />
      {[[44, 40], [54, 40], [64, 44], [48, 52], [58, 52], [52, 62]].map(([x, y]) => (
        <path key={`${x}-${y}`} d={`M${x - 4} ${y} Q${x} ${y + 5} ${x + 4} ${y}`} fill="none" stroke="#a86b2a" strokeWidth="1.8" />
      ))}
      <path d="M38 34 C46 28 58 28 66 34" fill="none" stroke="#f6c98a" strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  sn_kimbap: (
    <g>
      {[[30, 34], [68, 38], [48, 68]].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="19" fill="#1f3b2a" {...L} />
          <circle cx={x} cy={y} r="15" fill="#fffaf0" />
          <rect x={x - 6} y={y - 7} width="5" height="5" fill="#ff9f43" />
          <rect x={x + 1} y={y - 6} width="5" height="5" fill="#ffd166" />
          <rect x={x - 5} y={y + 1} width="5" height="5" fill="#3ddc97" />
          <rect x={x + 1} y={y + 1} width="5" height="5" fill="#e0476f" />
        </g>
      ))}
      <path d="M84 70 L92 62 M86 80 L96 76" {...SIN} strokeWidth="2" />
    </g>
  ),
  sn_bingsu: (
    <g>
      <path d="M22 58 L78 58 L70 86 L30 86 Z" fill="#b3e5ff" {...L} />
      <rect x="40" y="86" width="20" height="6" rx="2" fill="#b3e5ff" {...L} strokeWidth="1.8" />
      <path d="M20 58 C18 36 34 20 50 20 C66 20 82 36 80 58 Z" fill="#ffffff" {...L} />
      <path d="M28 46 Q50 54 72 46" fill="none" stroke="#ffb3cf" strokeWidth="5" strokeLinecap="round" />
      {[[38, 32], [54, 28], [64, 40]].map(([x, y]) => (
        <path key={`${x}-${y}`} d={`M${x} ${y + 6} C${x - 6} ${y} ${x - 4} ${y - 5} ${x} ${y - 4} C${x + 4} ${y - 5} ${x + 6} ${y} ${x} ${y + 6} Z`} fill="#ff5c72" stroke={T} strokeWidth="1.4" />
      ))}
      <rect x="44" y="38" width="9" height="9" rx="2" fill="#ffd166" stroke={T} strokeWidth="1.4" />
      <path d="M74 14 L64 50" stroke="#c9c4d6" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="76" cy="12" rx="4" ry="6" fill="#c9c4d6" transform="rotate(20 76 12)" />
    </g>
  ),
  sn_pollo: (
    <g>
      <path d="M16 52 L84 52 L78 90 L22 90 Z" fill="#ff5c72" {...L} />
      <path d="M30 52 L32 90 M50 52 L50 90 M70 52 L68 90" stroke="#ffffff" strokeWidth="3" />
      {[[34, 44, -20], [52, 38, 10], [68, 46, 30]].map(([x, y, r]) => (
        <g key={`${x}-${y}`} transform={`rotate(${r} ${x} ${y})`}>
          <rect x={x - 2.5} y={y + 8} width="5" height="12" rx="2" fill="#fff3e6" {...L} strokeWidth="1.6" />
          <ellipse cx={x} cy={y} rx="12" ry="14" fill="#d98b2b" stroke="#8d5a1f" strokeWidth="2.2" />
          <path d={`M${x - 6} ${y - 6} q3 -3 6 0 M${x + 1} ${y + 2} q3 -3 6 0 M${x - 7} ${y + 6} q3 -3 6 0`} fill="none" stroke="#f6c98a" strokeWidth="1.8" />
        </g>
      ))}
      {destello(86, 22, 5, "#ffd166")}
    </g>
  ),
};

/* --------------------------------- Seúl ---------------------------------- */

const SEUL = {
  se_torre: (
    <g>
      <path d="M0 92 C20 66 80 66 100 92 Z" fill="#3ddc97" {...L} />
      <path d="M47 70 L49 30 L51 30 L53 70 Z" fill="#e8e6f0" {...L} strokeWidth="1.8" />
      <rect x="40" y="22" width="20" height="10" rx="5" fill="#ff4fa3" {...L} />
      <rect x="43" y="34" width="14" height="6" rx="3" fill="#e8e6f0" {...L} strokeWidth="1.8" />
      <path d="M50 22 L50 6" stroke={T} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="50" cy="6" r="2.4" fill="#ff5c72" />
      {destello(20, 18, 4, "#ffd166")}
      {destello(80, 30, 3, "#ffd166")}
      <circle cx="74" cy="14" r="7" fill="#fff3b0" />
    </g>
  ),
  se_hanok: (
    <g>
      <rect x="22" y="54" width="56" height="34" fill="#fffaf0" {...L} />
      <rect x="44" y="64" width="12" height="24" fill="#c9845a" {...L} strokeWidth="1.8" />
      <rect x="28" y="62" width="10" height="10" fill="#ffd166" opacity="0.7" {...L} strokeWidth="1.6" />
      <rect x="62" y="62" width="10" height="10" fill="#ffd166" opacity="0.7" {...L} strokeWidth="1.6" />
      <path d="M6 50 C20 52 26 36 50 30 C74 36 80 52 94 50 C88 58 12 58 6 50 Z" fill="#3b4a6b" {...L} />
      <path d="M18 50 C30 50 38 40 50 37 C62 40 70 50 82 50" fill="none" stroke="#7f8fb3" strokeWidth="1.6" />
      <rect x="18" y="88" width="64" height="5" fill="#8d86a3" {...L} strokeWidth="1.6" />
    </g>
  ),
  se_rio: (
    <g>
      <rect x="0" y="62" width="100" height="38" fill="#2f5bd3" />
      <path d="M0 70 Q12 66 24 70 T48 70 T72 70 T100 70 M0 82 Q12 78 24 82 T48 82 T72 82 T100 82" fill="none" stroke="#7fb2ff" strokeWidth="1.8" />
      <rect x="0" y="48" width="100" height="6" fill="#e8e6f0" {...L} strokeWidth="1.8" />
      {[10, 36, 62, 88].map((x) => (
        <path key={x} d={`M${x - 12} 54 Q${x} 76 ${x + 12} 54`} fill="none" stroke="#e8e6f0" strokeWidth="3" />
      ))}
      {[16, 30, 44, 58, 72, 86].map((x, i) => (
        <circle key={x} cx={x} cy="44" r="2" fill={["#ff4fa3", "#ffd166", "#4fd8ff"][i % 3]} />
      ))}
      <circle cx="78" cy="20" r="10" fill="#fff3b0" />
      <circle cx="82" cy="17" r="9" fill="#0f1b3d" opacity="0.0" />
      {destello(30, 16, 3)}
      {destello(54, 26, 2.4)}
    </g>
  ),
  se_metro: (
    <g>
      <path d="M22 14 L78 14 C86 14 88 22 88 30 L88 76 L12 76 L12 30 C12 22 14 14 22 14 Z" fill="#f4f1fa" {...L} />
      <rect x="12" y="52" width="76" height="8" fill="#3ddc97" />
      <rect x="20" y="22" width="60" height="24" rx="4" fill="#1f3b5a" {...L} strokeWidth="1.8" />
      <path d="M50 22 L50 46" stroke={T} strokeWidth="1.8" />
      <circle cx="26" cy="66" r="4" fill="#ffd166" {...L} strokeWidth="1.6" />
      <circle cx="74" cy="66" r="4" fill="#ffd166" {...L} strokeWidth="1.6" />
      <rect x="40" y="16" width="20" height="5" rx="2" fill="#3ddc97" />
      <path d="M20 76 L14 90 M80 76 L86 90" stroke={T} strokeWidth="3" strokeLinecap="round" />
      <path d="M6 90 L94 90" stroke="#8d86a3" strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  se_palacio: (
    <g>
      <rect x="10" y="84" width="80" height="8" fill="#c9c4d6" {...L} strokeWidth="1.8" />
      <rect x="22" y="56" width="56" height="28" fill="#fffaf0" {...L} />
      {[26, 40, 56, 70].map((x) => <rect key={x} x={x} y="56" width="4" height="28" fill="#e0474c" />)}
      <path d="M40 84 L40 66 Q50 58 60 66 L60 84 Z" fill="#7a2b2b" {...L} strokeWidth="1.8" />
      <path d="M8 56 C20 58 24 46 50 42 C76 46 80 58 92 56 C86 62 14 62 8 56 Z" fill="#2f7a5f" {...L} />
      <rect x="30" y="34" width="40" height="10" fill="#e0474c" {...L} strokeWidth="1.8" />
      <path d="M16 36 C26 38 30 26 50 22 C70 26 74 38 84 36 C78 42 22 42 16 36 Z" fill="#2f7a5f" {...L} />
      <path d="M20 59 L80 59 M22 39 L78 39" stroke="#ffd166" strokeWidth="1.6" strokeDasharray="3 2" />
      {destello(86, 14, 4, "#ffd166")}
    </g>
  ),
  se_cerezos: (
    <g>
      <path d="M46 92 L48 60 C40 52 30 50 24 44 M48 66 C56 56 66 54 74 46 M48 60 L50 40" fill="none" stroke="#7a4b2b" strokeWidth="5" strokeLinecap="round" />
      {[[30, 34, 16], [52, 24, 18], [74, 34, 15], [40, 48, 12], [64, 48, 12], [20, 50, 9], [82, 52, 9]].map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#ffb3cf" stroke="#e0679f" strokeWidth="1.8" />
      ))}
      {[[28, 30], [48, 20], [58, 30], [72, 30], [38, 44], [66, 46]].map(([x, y]) => (
        <g key={`${x}-${y}`} fill="#ffffff">
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx={x} cy={y - 2.4} rx="1.6" ry="2.4" transform={`rotate(${a} ${x} ${y})`} />
          ))}
          <circle cx={x} cy={y} r="1" fill="#ff4fa3" />
        </g>
      ))}
      {[[16, 76, 20], [80, 72, -30], [64, 86, 40], [30, 88, -10]].map(([x, y, r]) => (
        <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="3" ry="1.8" fill="#ffb3cf" transform={`rotate(${r} ${x} ${y})`} />
      ))}
    </g>
  ),
};

const ARTE = { ...LIGHTSTICKS, ...ALBUMES, ...ESCENARIO, ...FANDOM, ...SNACKS, ...SEUL };

export const IDS_CON_ARTE = Object.keys(ARTE);

export default function EstampitaArte({ id, size = 100, titulo }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={titulo || "Estampita"} className="estampita-svg">
      {ARTE[id] || <text x="50" y="58" textAnchor="middle" fontSize="30" fill="#ffffff">?</text>}
    </svg>
  );
}
