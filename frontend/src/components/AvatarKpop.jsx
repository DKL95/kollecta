import { forwardRef, useId } from "react";
import {
  COLOR_CABELLO,
  COLOR_OJOS,
  COLOR_ROPA,
  FONDOS,
  PIEL,
  completarAvatar,
  mezclar,
} from "../utils/avatar";

/* ==========================================================================
   Dibujo del avatar (SVG de 200 × 200, estilo chibi). Todo es arte original
   hecho con figuras simples, así se ve nítido en cualquier tamaño y pesa poco.

   Capas, de atrás hacia adelante: fondo, cabello de atrás, cuello y ropa,
   cabeza, mejillas, ojos, cejas, boca, accesorios de atrás, cabello de
   enfrente, accesorios, manos (gesto) y efectos de la expresión.
   ========================================================================== */

const TINTA = "#2a1f3d";
const LINEA = { stroke: TINTA, strokeWidth: 2.4, strokeLinejoin: "round", strokeLinecap: "round" };
const TRAZO = (ancho = 3) => ({ fill: "none", stroke: TINTA, strokeWidth: ancho, strokeLinecap: "round", strokeLinejoin: "round" });
const ROSA = "#ff4f8b";
const LAGRIMA = "#8fd3ff";

const OJO_IZQ = 78;
const OJO_DER = 122;
const OJO_Y = 98;
const CEJA_Y = 80;

function corazon(x, y, s, props = {}) {
  return (
    <path
      d={`M${x} ${y + s * 0.9} C${x - s * 1.6} ${y - s * 0.1} ${x - s * 0.7} ${y - s * 1.3} ${x} ${y - s * 0.45} C${x + s * 0.7} ${y - s * 1.3} ${x + s * 1.6} ${y - s * 0.1} ${x} ${y + s * 0.9} Z`}
      fill={ROSA}
      {...props}
    />
  );
}

function estrella(x, y, r, props = {}) {
  const puntos = [];
  for (let i = 0; i < 10; i++) {
    const radio = i % 2 === 0 ? r : r * 0.45;
    const angulo = (Math.PI / 5) * i - Math.PI / 2;
    puntos.push(`${(x + radio * Math.cos(angulo)).toFixed(1)},${(y + radio * Math.sin(angulo)).toFixed(1)}`);
  }
  return <polygon points={puntos.join(" ")} {...props} />;
}

function brillo(x, y, r, color = "#ffe27a") {
  return (
    <path
      d={`M${x} ${y - r} Q${x + r * 0.2} ${y - r * 0.2} ${x + r} ${y} Q${x + r * 0.2} ${y + r * 0.2} ${x} ${y + r} Q${x - r * 0.2} ${y + r * 0.2} ${x - r} ${y} Q${x - r * 0.2} ${y - r * 0.2} ${x} ${y - r} Z`}
      fill={color}
    />
  );
}

/* ----------------------------- Cabello ----------------------------- */

function CabelloAtras({ estilo, color }) {
  const sombra = mezclar(color, "#000000", 0.22);
  const props = { fill: color, ...LINEA };
  switch (estilo) {
    case "largo":
      return <path d="M40 90 C36 40 66 22 100 22 C134 22 164 40 160 90 L166 178 C140 188 60 188 34 178 Z" {...props} />;
    case "coletas":
      return (
        <g {...props}>
          <path d="M52 70 C20 78 10 132 24 172 C38 156 46 124 60 98 Z" />
          <path d="M148 70 C180 78 190 132 176 172 C162 156 154 124 140 98 Z" />
          <path d="M26 150 C30 140 36 128 40 118" fill="none" stroke={sombra} strokeWidth="2" />
          <path d="M174 150 C170 140 164 128 160 118" fill="none" stroke={sombra} strokeWidth="2" />
        </g>
      );
    case "chongo":
      return <circle cx="100" cy="21" r="20" {...props} />;
    case "ondulado":
      return (
        <g {...props}>
          <circle cx="46" cy="112" r="22" />
          <circle cx="154" cy="112" r="22" />
          <circle cx="50" cy="140" r="17" />
          <circle cx="150" cy="140" r="17" />
        </g>
      );
    case "bob":
      return <path d="M40 92 C36 44 66 24 100 24 C134 24 164 44 160 92 L162 132 C150 140 136 138 128 132 L72 132 C64 138 50 140 38 132 Z" {...props} />;
    default:
      return null;
  }
}

const FLEQUILLO_RECTO =
  "M44 100 C40 52 66 26 100 26 C134 26 160 52 156 100 L152 100 C151 88 149 80 146 74 L134 81 L122 74 L110 81 L100 74 L90 81 L78 74 L66 81 L54 74 C51 80 49 88 48 100 Z";
const CORTINA =
  "M44 104 C38 56 64 26 100 26 C136 26 162 56 156 104 C152 90 146 76 136 66 C124 64 108 56 100 44 C92 56 76 64 64 66 C54 76 48 90 44 104 Z";

function CabelloFrente({ estilo, color, accesorio }) {
  const sombra = mezclar(color, "#000000", 0.25);
  const props = { fill: color, ...LINEA };
  const mechones = (d) => <path d={d} fill="none" stroke={sombra} strokeWidth="2" strokeLinecap="round" />;
  // Con gorra o gorro solo se asoma el fleco.
  const cubierto = accesorio === "gorra" || accesorio === "pescador";

  switch (estilo) {
    case "corto":
      return (
        <g>
          <path d="M46 96 C40 52 66 28 100 28 C136 28 162 52 154 96 C150 80 144 68 134 62 C126 72 108 74 94 68 C86 76 70 78 60 74 C54 80 50 88 46 96 Z" {...props} />
          {!cubierto && mechones("M80 40 C90 46 104 46 116 40 M70 52 C76 58 84 60 92 58")}
        </g>
      );
    case "cortina":
      return (
        <g>
          <path d={CORTINA} {...props} />
          {mechones("M100 30 L100 44 M70 50 C66 60 62 70 58 82 M130 50 C134 60 138 70 142 82")}
        </g>
      );
    case "flequillo":
    case "coletas":
    case "bob":
      return (
        <g>
          <path d={FLEQUILLO_RECTO} {...props} />
          {!cubierto && mechones("M74 40 C82 36 92 34 100 34 M110 38 C120 40 128 44 134 50")}
          {estilo === "coletas" && (
            <g>
              <circle cx="52" cy="72" r="6" fill="#ffd166" {...LINEA} />
              <circle cx="148" cy="72" r="6" fill="#ffd166" {...LINEA} />
            </g>
          )}
        </g>
      );
    case "largo":
      return (
        <g>
          <path d={CORTINA} {...props} />
          <path d="M44 100 C40 122 42 150 50 170 L62 168 C56 142 56 118 58 96 Z" {...props} />
          <path d="M156 100 C160 122 158 150 150 170 L138 168 C144 142 144 118 142 96 Z" {...props} />
          {mechones("M100 30 L100 44 M48 120 C50 136 52 150 56 162 M152 120 C150 136 148 150 144 162")}
        </g>
      );
    case "chongo":
      return (
        <g>
          <path d="M46 98 C40 54 66 30 100 30 C134 30 160 54 154 98 C148 74 134 58 112 54 C96 62 74 66 58 72 C52 80 48 88 46 98 Z" {...props} />
          {mechones("M62 66 C78 52 98 44 118 44")}
          <path d="M88 33 Q100 38 112 33" fill="none" stroke="#ffd166" strokeWidth="4" strokeLinecap="round" />
        </g>
      );
    case "ondulado":
      return (
        <g fill={color} stroke={TINTA} strokeWidth="2.4">
          <circle cx="56" cy="72" r="18" />
          <circle cx="144" cy="72" r="18" />
          <circle cx="72" cy="50" r="20" />
          <circle cx="128" cy="50" r="20" />
          <circle cx="100" cy="40" r="24" />
          <circle cx="48" cy="96" r="12" />
          <circle cx="152" cy="96" r="12" />
          <g stroke="none">
            <circle cx="56" cy="72" r="16" />
            <circle cx="144" cy="72" r="16" />
            <circle cx="72" cy="50" r="18" />
            <circle cx="128" cy="50" r="18" />
            <circle cx="100" cy="40" r="22" />
          </g>
          <circle cx="80" cy="66" r="12" />
          <circle cx="100" cy="62" r="13" />
          <circle cx="120" cy="66" r="12" />
        </g>
      );
    case "rapado":
      return (
        <g>
          <path d="M50 86 C48 50 72 34 100 34 C128 34 152 50 150 86 C146 66 128 54 100 54 C72 54 54 66 50 86 Z" {...props} />
          <path d="M60 60 L62 64 M72 48 L74 52 M88 42 L89 46 M112 42 L111 46 M128 48 L126 52 M140 60 L138 64" stroke={sombra} strokeWidth="1.6" strokeLinecap="round" />
        </g>
      );
    default:
      return null;
  }
}

/* ------------------------------ Ropa ------------------------------- */

const CUERPO = "M28 200 C30 168 58 152 100 152 C142 152 170 168 172 200 Z";

function Ropa({ estilo, color, piel }) {
  const sombra = mezclar(color, "#000000", 0.2);
  const luz = mezclar(color, "#ffffff", 0.35);

  switch (estilo) {
    case "sudadera":
      return (
        <g>
          <path d={CUERPO} fill={color} {...LINEA} />
          <path d="M68 158 Q100 180 132 158 Q126 150 116 151 Q100 166 84 151 Q74 150 68 158 Z" fill={sombra} {...LINEA} />
          <path d="M92 164 L90 184 M108 164 L110 184" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="90" cy="186" r="2.4" fill="#ffffff" />
          <circle cx="110" cy="186" r="2.4" fill="#ffffff" />
          <path d="M70 200 Q74 186 100 186 Q126 186 130 200" fill="none" stroke={sombra} strokeWidth="2" />
        </g>
      );
    case "mezclilla": {
      const mezclilla = "#5d80c4";
      const oscura = mezclar(mezclilla, "#000000", 0.2);
      return (
        <g>
          <path d={CUERPO} fill={mezclilla} {...LINEA} />
          <path d="M84 152 L100 186 L116 152 Z" fill={color} {...LINEA} />
          <path d="M84 152 L70 160 L92 182 Z" fill={oscura} {...LINEA} />
          <path d="M116 152 L130 160 L108 182 Z" fill={oscura} {...LINEA} />
          <path d="M50 178 L80 178 M120 178 L150 178" stroke="#a9c1ee" strokeWidth="1.6" strokeDasharray="3 3" />
          <circle cx="66" cy="186" r="2.4" fill="#e2c275" />
          <circle cx="134" cy="186" r="2.4" fill="#e2c275" />
        </g>
      );
    }
    case "uniforme": {
      const saco = "#2b3a67";
      return (
        <g>
          <path d={CUERPO} fill={saco} {...LINEA} />
          <path d="M84 152 L100 190 L116 152 Z" fill="#ffffff" {...LINEA} />
          <path d="M95 157 L105 157 L107 178 L100 188 L93 178 Z" fill={color} {...LINEA} />
          <path d="M84 152 L74 160 L96 196 M116 152 L126 160 L104 196" fill="none" stroke={mezclar(saco, "#ffffff", 0.25)} strokeWidth="2" />
          <circle cx="132" cy="180" r="4.5" fill="#ffd166" stroke={TINTA} strokeWidth="1.6" />
        </g>
      );
    }
    case "sueter":
      return (
        <g>
          <path d={CUERPO} fill={color} {...LINEA} />
          <path d="M78 155 Q100 170 122 155 Q118 150 113 151 Q100 160 87 151 Q82 150 78 155 Z" fill={sombra} {...LINEA} />
          <path d="M84 156 L86 160 M92 159 L93 163 M100 160 L100 164 M108 159 L107 163 M116 156 L114 160" stroke={luz} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M36 182 Q100 172 164 182 L166 190 Q100 180 34 190 Z" fill={luz} />
        </g>
      );
    case "escenario":
      return (
        <g>
          <path d={CUERPO} fill={color} {...LINEA} />
          <path d="M86 152 L100 180 L114 152 Z" fill={TINTA} />
          <path d="M86 152 L74 162 L98 198 M114 152 L126 162 L102 198" fill="none" stroke="#ffd166" strokeWidth="3" strokeLinejoin="round" />
          <path d="M44 168 L62 162 L64 170 L46 176 Z M156 168 L138 162 L136 170 L154 176 Z" fill="#ffd166" {...LINEA} strokeWidth="1.6" />
          <g fill="#ffffff" opacity="0.7">
            <circle cx="60" cy="186" r="1.6" />
            <circle cx="72" cy="178" r="1.3" />
            <circle cx="140" cy="186" r="1.6" />
            <circle cx="128" cy="178" r="1.3" />
            <circle cx="84" cy="194" r="1.2" />
            <circle cx="116" cy="194" r="1.2" />
          </g>
        </g>
      );
    default:
      // camiseta
      return (
        <g>
          <path d={CUERPO} fill={color} {...LINEA} />
          <path d="M84 152 Q100 170 116 152 Z" fill={piel} {...LINEA} />
          <path d="M56 170 C60 180 62 190 62 200 M144 170 C140 180 138 190 138 200" fill="none" stroke={sombra} strokeWidth="2" />
        </g>
      );
  }
}

/* ------------------------------ Cara ------------------------------- */

function OjoNormal({ x, estilo, color, piel }) {
  const y = OJO_Y;
  if (estilo === "brillantes") {
    return (
      <g>
        <ellipse cx={x} cy={y} rx="8.5" ry="11" fill={color} stroke={TINTA} strokeWidth="2.2" />
        <ellipse cx={x} cy={y + 4} rx="6" ry="5" fill={mezclar(color, "#ffffff", 0.35)} />
        <circle cx={x + 3} cy={y - 4} r="3.4" fill="#ffffff" />
        <circle cx={x - 3} cy={y + 4} r="1.6" fill="#ffffff" />
        <path d={`M${x - 9} ${y - 8} Q${x} ${y - 14} ${x + 9} ${y - 8}`} {...TRAZO(3)} />
      </g>
    );
  }
  if (estilo === "almendrados") {
    return (
      <g>
        <path d={`M${x - 10} ${y} C${x - 6} ${y - 9} ${x + 6} ${y - 9} ${x + 10} ${y - 1} C${x + 6} ${y + 6} ${x - 6} ${y + 6} ${x - 10} ${y} Z`} fill="#ffffff" stroke={TINTA} strokeWidth="2.2" />
        <circle cx={x} cy={y - 1} r="5.2" fill={color} />
        <circle cx={x + 2} cy={y - 3} r="1.8" fill="#ffffff" />
      </g>
    );
  }
  return (
    <g>
      <ellipse cx={x} cy={y} rx="7" ry="9" fill={color} stroke={TINTA} strokeWidth="2.2" />
      <circle cx={x + 2.5} cy={y - 3.5} r="2.6" fill="#ffffff" />
      <circle cx={x - 2} cy={y + 3} r="1.2" fill="#ffffff" />
      {estilo === "pestanas" &&
        (x < 100 ? (
          <path d={`M${x - 6} ${y - 7} L${x - 11} ${y - 10} M${x - 7} ${y - 3} L${x - 12} ${y - 4}`} {...TRAZO(2.2)} />
        ) : (
          <path d={`M${x + 6} ${y - 7} L${x + 11} ${y - 10} M${x + 7} ${y - 3} L${x + 12} ${y - 4}`} {...TRAZO(2.2)} />
        ))}
      {estilo === "dormilones" && (
        <path d={`M${x - 9} ${y - 1} Q${x} ${y - 4} ${x + 9} ${y - 1} L${x + 9} ${y - 11} L${x - 9} ${y - 11} Z`} fill={piel} stroke={TINTA} strokeWidth="2.2" strokeLinejoin="round" />
      )}
    </g>
  );
}

function Ojos({ expresion, estilo, color, piel }) {
  const arco = (x) => <path d={`M${x - 8} ${OJO_Y + 2} Q${x} ${OJO_Y - 8} ${x + 8} ${OJO_Y + 2}`} {...TRAZO(3.2)} />;
  const normal = (x) => <OjoNormal x={x} estilo={estilo} color={color} piel={piel} />;

  switch (expresion) {
    case "feliz":
      return <g>{arco(OJO_IZQ)}{arco(OJO_DER)}</g>;
    case "amor":
      return (
        <g>
          {corazon(OJO_IZQ, OJO_Y, 8, { stroke: TINTA, strokeWidth: 1.8 })}
          {corazon(OJO_DER, OJO_Y, 8, { stroke: TINTA, strokeWidth: 1.8 })}
        </g>
      );
    case "risa":
      return (
        <g>
          <path d={`M${OJO_IZQ - 7} ${OJO_Y - 6} L${OJO_IZQ + 5} ${OJO_Y} L${OJO_IZQ - 7} ${OJO_Y + 6}`} {...TRAZO(3.2)} />
          <path d={`M${OJO_DER + 7} ${OJO_Y - 6} L${OJO_DER - 5} ${OJO_Y} L${OJO_DER + 7} ${OJO_Y + 6}`} {...TRAZO(3.2)} />
        </g>
      );
    case "guino":
      return <g>{normal(OJO_IZQ)}{arco(OJO_DER)}</g>;
    case "sorpresa":
      return (
        <g>
          {[OJO_IZQ, OJO_DER].map((x) => (
            <g key={x}>
              <circle cx={x} cy={OJO_Y} r="8.5" fill="#ffffff" stroke={TINTA} strokeWidth="2.2" />
              <circle cx={x} cy={OJO_Y} r="3.6" fill={color} />
            </g>
          ))}
        </g>
      );
    case "llorar":
      return (
        <g>
          {[OJO_IZQ, OJO_DER].map((x) => (
            <g key={x}>
              <path d={`M${x - 8} ${OJO_Y - 1} Q${x} ${OJO_Y + 6} ${x + 8} ${OJO_Y - 1}`} {...TRAZO(3.2)} />
              <path d={`M${x - 5} ${OJO_Y + 4} C${x - 8} ${OJO_Y + 14} ${x - 8} ${OJO_Y + 24} ${x - 3} ${OJO_Y + 32} C${x} ${OJO_Y + 24} ${x} ${OJO_Y + 13} ${x - 1} ${OJO_Y + 4} Z`} fill={LAGRIMA} stroke={TINTA} strokeWidth="1.4" />
            </g>
          ))}
        </g>
      );
    case "dormir":
      return (
        <g>
          <path d={`M${OJO_IZQ - 8} ${OJO_Y} Q${OJO_IZQ} ${OJO_Y + 5} ${OJO_IZQ + 8} ${OJO_Y}`} {...TRAZO(3)} />
          <path d={`M${OJO_DER - 8} ${OJO_Y} Q${OJO_DER} ${OJO_Y + 5} ${OJO_DER + 8} ${OJO_Y}`} {...TRAZO(3)} />
        </g>
      );
    default:
      return <g>{normal(OJO_IZQ)}{normal(OJO_DER)}</g>;
  }
}

function Cejas({ estilo, color, expresion }) {
  const ancho = estilo === "gruesas" ? 5.5 : 3;
  const forma = (x) => {
    if (estilo === "rectas") return `M${x - 9} ${CEJA_Y} L${x + 9} ${CEJA_Y}`;
    if (estilo === "arqueadas") return `M${x - 9} ${CEJA_Y + 2} Q${x - 2} ${CEJA_Y - 6} ${x + 9} ${CEJA_Y}`;
    return `M${x - 9} ${CEJA_Y + 1} Q${x} ${CEJA_Y - 3} ${x + 9} ${CEJA_Y + 1}`;
  };
  let giro = 0;
  let subir = 0;
  if (expresion === "enojo") giro = 18;
  if (expresion === "llorar" || expresion === "pena") giro = -14;
  if (expresion === "sorpresa") subir = -6;
  if (expresion === "feliz" || expresion === "amor" || expresion === "risa") subir = -3;

  return (
    <g fill="none" stroke={color} strokeWidth={ancho} strokeLinecap="round" transform={`translate(0 ${subir})`}>
      <path d={forma(OJO_IZQ)} transform={`rotate(${giro} ${OJO_IZQ} ${CEJA_Y})`} />
      <path d={forma(OJO_DER)} transform={`translate(${2 * OJO_DER} 0) scale(-1 1) rotate(${giro} ${OJO_DER} ${CEJA_Y})`} />
    </g>
  );
}

const LENGUA = "#ff7aa2";
const BOCA_OSCURA = "#6b1f3a";

function Boca({ estilo, expresion }) {
  const forma = expresion === "normal" ? estilo : {
    feliz: "abierta",
    amor: "sonrisa",
    risa: "carcajada",
    guino: "lengua",
    sorpresa: "o",
    llorar: "llanto",
    enojo: "enojo",
    dormir: "chica",
    pena: "nervios",
  }[expresion];

  switch (forma) {
    case "gatuna":
      return <path d="M88 118 Q94 125 100 119 Q106 125 112 118" {...TRAZO(3)} />;
    case "abierta":
      return (
        <g>
          <path d="M89 117 L111 117 Q109 131 100 131 Q91 131 89 117 Z" fill={BOCA_OSCURA} {...LINEA} />
          <ellipse cx="100" cy="127" rx="5" ry="2.6" fill={LENGUA} />
        </g>
      );
    case "carcajada":
      return (
        <g>
          <path d="M85 114 L115 114 Q113 136 100 136 Q87 136 85 114 Z" fill={BOCA_OSCURA} {...LINEA} />
          <ellipse cx="100" cy="131" rx="7" ry="3.4" fill={LENGUA} />
        </g>
      );
    case "tranquila":
      return <path d="M94 121 Q100 123 106 121" {...TRAZO(3)} />;
    case "lengua":
      return (
        <g>
          <path d="M98 122 Q99 131 104 130 Q108 128 106 121 Z" fill={LENGUA} {...LINEA} strokeWidth="1.8" />
          <path d="M89 119 Q100 127 111 119" {...TRAZO(3)} />
        </g>
      );
    case "o":
      return <ellipse cx="100" cy="123" rx="5" ry="6.5" fill={BOCA_OSCURA} {...LINEA} />;
    case "llanto":
      return <path d="M88 125 Q94 116 100 122 Q106 116 112 125 Q100 132 88 125 Z" fill={BOCA_OSCURA} {...LINEA} />;
    case "enojo":
      return <path d="M90 125 Q100 117 110 125" {...TRAZO(3.2)} />;
    case "chica":
      return <ellipse cx="100" cy="122" rx="3" ry="3.6" fill={BOCA_OSCURA} />;
    case "nervios":
      return <path d="M88 122 q4 -4 8 0 t8 0 t8 0" {...TRAZO(2.6)} />;
    default:
      return <path d="M90 119 Q100 128 110 119" {...TRAZO(3)} />;
  }
}

function Mejillas({ tipo, expresion, piel }) {
  const rubor = tipo === "rubor" || ["amor", "pena", "feliz", "risa"].includes(expresion);
  const fuerte = expresion === "pena" || expresion === "amor";
  return (
    <g>
      {rubor && (
        <g fill="#ff7aa2" opacity={fuerte ? 0.7 : 0.45}>
          <ellipse cx="66" cy="112" rx={fuerte ? 11 : 9} ry="5" />
          <ellipse cx="134" cy="112" rx={fuerte ? 11 : 9} ry="5" />
        </g>
      )}
      {fuerte && (
        <path d="M60 110 L64 114 M66 110 L70 114 M130 110 L134 114 M136 110 L140 114" stroke="#e0476f" strokeWidth="1.5" strokeLinecap="round" />
      )}
      {tipo === "lunar" && <circle cx="132" cy="108" r="1.9" fill={TINTA} />}
      {tipo === "pecas" && (
        <g fill={mezclar(piel, "#6b3f24", 0.55)}>
          {[[66, 109], [72, 112], [70, 106], [128, 109], [134, 112], [130, 106]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" />
          ))}
        </g>
      )}
      {tipo === "brillos" && (
        <g>
          {brillo(62, 110, 4)}
          {brillo(140, 110, 4)}
        </g>
      )}
      {tipo === "curita" && (
        <g transform="rotate(-20 136 114)">
          <rect x="125" y="109.5" width="22" height="9" rx="4.5" fill="#f6c7a0" stroke={TINTA} strokeWidth="1.6" />
          <rect x="132" y="109.5" width="8" height="9" fill="#fbe0c8" />
          <circle cx="134.5" cy="112.5" r="0.8" fill={TINTA} />
          <circle cx="137.5" cy="115.5" r="0.8" fill={TINTA} />
        </g>
      )}
    </g>
  );
}

/* --------------------------- Accesorios ---------------------------- */

function AccesorioAtras({ tipo }) {
  if (tipo === "audifonos") {
    return <path d="M44 96 C38 34 162 34 156 96" fill="none" stroke={TINTA} strokeWidth="7" strokeLinecap="round" />;
  }
  return null;
}

function Accesorio({ tipo, ropa, cabello }) {
  const oscuro = mezclar(ropa, "#000000", 0.25);
  switch (tipo) {
    case "gato":
      // Diadema con orejitas encima del cabello.
      return (
        <g>
          <path d="M52 62 C62 40 138 40 148 62" fill="none" stroke={TINTA} strokeWidth="5" strokeLinecap="round" />
          <path d="M52 62 C62 40 138 40 148 62" fill="none" stroke={mezclar(cabello, "#ffffff", 0.15)} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M54 54 L52 14 L84 40 Z" fill={cabello} {...LINEA} />
          <path d="M60 46 L59 26 L75 40 Z" fill="#ffb3cf" />
          <path d="M146 54 L148 14 L116 40 Z" fill={cabello} {...LINEA} />
          <path d="M140 46 L141 26 L125 40 Z" fill="#ffb3cf" />
        </g>
      );
    case "lentes":
      return (
        <g fill="rgba(255,255,255,0.14)" stroke={TINTA} strokeWidth="3">
          <circle cx={OJO_IZQ} cy={OJO_Y} r="13" />
          <circle cx={OJO_DER} cy={OJO_Y} r="13" />
          <path d="M91 96 Q100 91 109 96 M65 96 L52 92 M135 96 L148 92" fill="none" strokeLinecap="round" />
        </g>
      );
    case "gorra":
      return (
        <g>
          <path d="M48 72 C50 36 74 22 100 22 C126 22 150 36 152 72 Z" fill={ropa} {...LINEA} />
          <path d="M42 72 C70 62 130 62 158 72 C152 80 48 80 42 72 Z" fill={oscuro} {...LINEA} />
          <path d="M100 22 L100 66" stroke={oscuro} strokeWidth="2" />
          <circle cx="100" cy="23" r="3.4" fill={oscuro} stroke={TINTA} strokeWidth="1.6" />
        </g>
      );
    case "pescador":
      return (
        <g>
          <path d="M58 66 C58 34 78 24 100 24 C122 24 142 34 142 66 Z" fill={ropa} {...LINEA} />
          <path d="M38 74 C48 58 152 58 162 74 C140 84 60 84 38 74 Z" fill={oscuro} {...LINEA} />
          <path d="M58 58 C84 52 116 52 142 58" fill="none" stroke={mezclar(ropa, "#ffffff", 0.4)} strokeWidth="4" />
        </g>
      );
    case "mono":
      return (
        <g {...LINEA} fill={ROSA}>
          <path d="M138 46 C122 32 116 58 138 50 Z" />
          <path d="M138 46 C154 32 160 58 138 50 Z" />
          <circle cx="138" cy="48" r="5" />
        </g>
      );
    case "audifonos":
      return (
        <g fill={ropa} stroke={TINTA} strokeWidth="2.4">
          <rect x="34" y="84" width="16" height="28" rx="7" />
          <rect x="150" y="84" width="16" height="28" rx="7" />
        </g>
      );
    case "estrellas":
      return (
        <g>
          {estrella(140, 58, 9, { fill: "#ffd166", ...LINEA, strokeWidth: 1.8 })}
          {estrella(152, 76, 6.5, { fill: "#ffd166", ...LINEA, strokeWidth: 1.6 })}
        </g>
      );
    case "corona":
      return (
        <g transform="rotate(-8 100 26)">
          <path d="M76 36 L80 12 L92 26 L100 8 L108 26 L120 12 L124 36 Z" fill="#ffd166" stroke="#a86b12" strokeWidth="2.2" strokeLinejoin="round" />
          <circle cx="100" cy="28" r="3" fill={ROSA} />
          <circle cx="86" cy="31" r="2.2" fill="#4fd8ff" />
          <circle cx="114" cy="31" r="2.2" fill="#4fd8ff" />
        </g>
      );
    default:
      return null;
  }
}

/* ---------------------------- Gestos ------------------------------- */

function Gesto({ tipo, piel, ropa }) {
  const mano = { fill: piel, ...LINEA };
  const manga = { fill: ropa, ...LINEA };
  switch (tipo) {
    case "saludo":
      return (
        <g>
          <path d="M150 200 L142 172 C150 156 156 146 160 138 L174 142 C172 158 170 178 172 200 Z" {...manga} />
          <path d="M156 138 C150 122 152 106 160 100 L163 114 L165 96 C166 91 172 91 172 96 L171 112 L176 98 C178 93 183 95 182 100 L179 118 C186 111 193 115 187 123 C181 132 173 140 165 141 Z" {...mano} />
          <path d="M186 94 Q192 100 190 108 M180 86 Q190 90 194 100" {...TRAZO(2)} />
        </g>
      );
    case "corazon":
      return (
        <g>
          <path d="M138 200 L140 168 L162 166 L166 200 Z" {...manga} />
          <ellipse cx="152" cy="150" rx="14" ry="12" {...mano} />
          <path d="M146 140 C146 132 152 128 156 132 L158 142" {...mano} />
          {corazon(160, 122, 8, { stroke: TINTA, strokeWidth: 1.6 })}
        </g>
      );
    case "fighting":
      return (
        <g>
          <path d="M28 200 L40 162 L64 164 L62 200 Z" {...manga} />
          <circle cx="52" cy="150" r="15" {...mano} />
          <path d="M42 144 L62 144 M42 151 L62 151 M44 158 L60 158" stroke={mezclar(piel, "#000000", 0.25)} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M28 132 L20 126 M34 124 L30 114 M44 120 L44 110" {...TRAZO(2.2)} />
        </g>
      );
    case "paz":
      return (
        <g>
          <path d="M20 200 L28 132 L50 134 L46 200 Z" {...manga} />
          <path d="M33 110 L25 84 C24 79 30 77 32 82 L41 104 Z" {...mano} />
          <path d="M43 106 L46 81 C47 76 53 77 52 82 L50 108 Z" {...mano} />
          <ellipse cx="40" cy="118" rx="12" ry="11" {...mano} />
        </g>
      );
    case "mejillas":
      return (
        <g>
          <path d="M30 200 L44 136 L62 140 L58 200 Z" {...manga} />
          <path d="M170 200 L156 136 L138 140 L142 200 Z" {...manga} />
          <ellipse cx="56" cy="124" rx="12" ry="15" {...mano} />
          <ellipse cx="144" cy="124" rx="12" ry="15" {...mano} />
          <path d="M52 112 L50 120 M58 111 L57 120 M148 112 L150 120 M142 111 L143 120" stroke={mezclar(piel, "#000000", 0.25)} strokeWidth="1.5" strokeLinecap="round" />
        </g>
      );
    default:
      return null;
  }
}

/* ---------------------------- Efectos ------------------------------ */

function Efectos({ expresion }) {
  switch (expresion) {
    case "amor":
      return (
        <g stroke={TINTA} strokeWidth="1.6">
          {corazon(164, 46, 9)}
          {corazon(178, 70, 6)}
          {corazon(30, 56, 6)}
        </g>
      );
    case "feliz":
    case "guino":
      return (
        <g>
          {brillo(36, 60, 7)}
          {brillo(166, 54, 8)}
          {brillo(176, 78, 4)}
        </g>
      );
    case "enojo":
      return (
        <path d="M150 40 Q154 46 150 52 M162 40 Q158 46 162 52 M150 40 Q156 36 162 40 M150 52 Q156 56 162 52" fill="none" stroke="#ff5c72" strokeWidth="3.4" strokeLinecap="round" />
      );
    case "dormir":
      return (
        <g fontFamily="inherit" fontWeight="900" fill="#ffffff" stroke={TINTA} strokeWidth="1.6" paintOrder="stroke">
          <text x="148" y="56" fontSize="22">Z</text>
          <text x="166" y="40" fontSize="15">z</text>
        </g>
      );
    case "sorpresa":
      return <path d="M152 46 L160 36 M160 56 L172 52 M146 38 L148 26" {...TRAZO(3)} />;
    case "pena":
      return <path d="M150 62 C143 73 145 80 150 80 C155 80 157 73 150 62 Z" fill={LAGRIMA} stroke={TINTA} strokeWidth="1.8" />;
    case "risa":
      return <path d="M36 70 L28 66 M34 82 L24 82 M164 70 L172 66 M166 82 L176 82" {...TRAZO(2.6)} />;
    default:
      return null;
  }
}

/* --------------------------- Componente ---------------------------- */

/**
 * Props:
 * - avatar: objeto guardado (se completa con los valores iniciales).
 * - expresion, gesto: para stickers ("normal"/"ninguno" por defecto).
 * - fondo: dibuja el degradado de fondo (avatar de perfil).
 * - sticker: contorno blanco tipo calcomanía y sin fondo.
 * - texto: frase del sticker.
 * - size: tamaño en px (cuadrado).
 */
const AvatarKpop = forwardRef(function AvatarKpop(
  { avatar, expresion = "normal", gesto = "ninguno", fondo = false, sticker = false, texto = "", size = 120, className = "", titulo },
  ref
) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const a = completarAvatar(avatar);
  const piel = PIEL[a.piel].color;
  const sombraPiel = mezclar(piel, "#7a3b2a", 0.18);
  const ojos = COLOR_OJOS[a.colorOjos].color;
  const cabello = COLOR_CABELLO[a.colorCabello].color;
  const cejas = mezclar(cabello, TINTA, 0.45);
  const ropa = COLOR_ROPA[a.colorRopa].color;
  const colores = FONDOS[a.fondo].colores;
  const frase = (texto || "").slice(0, 20);

  const dibujo = (
    <g>
      <CabelloAtras estilo={a.cabello} color={cabello} />
      <rect x="88" y="126" width="24" height="30" fill={sombraPiel} {...LINEA} />
      <Ropa estilo={a.ropa} color={ropa} piel={piel} />
      <ellipse cx="50" cy="96" rx="9" ry="12" fill={piel} {...LINEA} />
      <ellipse cx="150" cy="96" rx="9" ry="12" fill={piel} {...LINEA} />
      <path d="M50 88 C50 52 72 36 100 36 C128 36 150 52 150 88 C150 120 128 140 100 140 C72 140 50 120 50 88 Z" fill={piel} {...LINEA} />
      <Mejillas tipo={a.mejillas} expresion={expresion} piel={piel} />
      <Ojos expresion={expresion} estilo={a.ojos} color={ojos} piel={piel} />
      <Cejas estilo={a.cejas} color={cejas} expresion={expresion} />
      <Boca estilo={a.boca} expresion={expresion} />
      <AccesorioAtras tipo={a.accesorio} />
      <CabelloFrente estilo={a.cabello} color={cabello} accesorio={a.accesorio} />
      <Accesorio tipo={a.accesorio} ropa={ropa} cabello={cabello} />
      <Gesto tipo={gesto} piel={piel} ropa={ropa} />
      <Efectos expresion={expresion} />
    </g>
  );

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={`avatar-kpop ${sticker ? "es-sticker" : ""} ${className}`}
      role="img"
      aria-label={titulo || (frase ? `Sticker: ${frase}` : "Avatar")}
    >
      <defs>
        <linearGradient id={`fondo${id}`} x1="0" y1="0" x2="1" y2="1">
          {colores.map((color, i) => (
            <stop key={color} offset={colores.length === 1 ? 0 : i / (colores.length - 1)} stopColor={color} />
          ))}
        </linearGradient>
        {sticker && (
          <filter id={`borde${id}`} x="-10%" y="-10%" width="120%" height="120%">
            <feMorphology in="SourceAlpha" operator="dilate" radius="4.5" result="grueso" />
            <feFlood floodColor="#ffffff" />
            <feComposite in2="grueso" operator="in" result="borde" />
            <feDropShadow in="borde" dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.3" result="sombra" />
            <feMerge>
              <feMergeNode in="sombra" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      {fondo && !sticker && <rect width="200" height="200" fill={`url(#fondo${id})`} />}

      {sticker ? (
        <g filter={`url(#borde${id})`}>
          <g transform={frase ? "translate(14 6) scale(0.86)" : "translate(8 6) scale(0.92)"}>{dibujo}</g>
          {frase && (
            <text
              x="100"
              y="188"
              textAnchor="middle"
              fontSize="21"
              fontWeight="900"
              fill={TINTA}
              stroke="#ffffff"
              strokeWidth="6"
              strokeLinejoin="round"
              paintOrder="stroke"
              {...(frase.length > 13 ? { textLength: 186, lengthAdjust: "spacingAndGlyphs" } : {})}
            >
              {frase}
            </text>
          )}
        </g>
      ) : (
        dibujo
      )}
    </svg>
  );
});

export default AvatarKpop;
