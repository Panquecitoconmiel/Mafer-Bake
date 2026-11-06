/**
 * Genera las ilustraciones SVG de las velas de demostración (client/public/productos/velas/).
 * Son imágenes ilustrativas: se reemplazan por fotos reales desde el panel administrativo.
 *
 *   node scripts/ilustraciones-velas.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../client/public/productos/velas");
mkdirSync(OUT, { recursive: true });

// ───────── Motivos (dibujados en una caja de 100 × 100) ─────────
const M = {
  corazon: (c) => `<path d="M50 88C22 66 6 50 6 31 6 16 17 6 30 6c9 0 16 5 20 13 4-8 11-13 20-13 13 0 24 10 24 25 0 19-16 35-44 57Z" fill="${c}"/>`,
  estrella: (c) => `<path d="M50 4l13 30 32 3-24 21 7 32-28-17-28 17 7-32L5 37l32-3Z" fill="${c}"/>`,
  copo: (c) => `<g stroke="${c}" stroke-width="7" stroke-linecap="round" fill="none"><path d="M50 6v88M12 28l76 44M12 72l76-44"/><path d="M38 12l12 12 12-12M38 88l12-12 12 12M10 44l16 4-4 16M90 56l-16-4 4-16M10 56l16-4-4-16M90 44l-16 4 4 16"/></g>`,
  pino: (c) => `<g fill="${c}"><path d="M50 4 76 40H62l20 26H64l22 22H14l22-22H18l20-26H24Z"/><rect x="44" y="86" width="12" height="12" rx="2"/></g>`,
  cruz: (c) => `<path d="M42 4h16v26h22v16H58v50H42V46H20V30h22Z" fill="${c}"/>`,
  huellas: (c) => `<g fill="${c}"><ellipse cx="32" cy="62" rx="13" ry="20"/><circle cx="20" cy="34" r="5"/><circle cx="29" cy="28" r="5"/><circle cx="38" cy="29" r="4.5"/><circle cx="45" cy="35" r="4"/><ellipse cx="70" cy="52" rx="13" ry="20"/><circle cx="58" cy="24" r="5"/><circle cx="67" cy="18" r="5"/><circle cx="76" cy="19" r="4.5"/><circle cx="83" cy="25" r="4"/></g>`,
  anillos: (c) => `<g fill="none" stroke="${c}" stroke-width="8"><circle cx="36" cy="58" r="24"/><circle cx="64" cy="58" r="24"/></g><path d="M58 8l8 10-8 10-8-10Z" fill="${c}"/>`,
  calabaza: (c) => `<g><ellipse cx="50" cy="60" rx="42" ry="32" fill="${c}"/><g fill="none" stroke="rgba(0,0,0,.18)" stroke-width="3"><ellipse cx="50" cy="60" rx="16" ry="32"/><ellipse cx="50" cy="60" rx="30" ry="32"/></g><path d="M47 28c0-10 3-18 10-22l5 4c-5 4-7 10-7 18Z" fill="#5b7a3a"/></g>`,
  fantasma: (c) => `<path d="M50 6c22 0 36 16 36 40v46l-12-9-12 9-12-9-12 9-12-9-12 9V46c0-24 14-40 36-40Z" fill="${c}"/><circle cx="38" cy="44" r="6" fill="#2b2433"/><circle cx="62" cy="44" r="6" fill="#2b2433"/><ellipse cx="50" cy="62" rx="6" ry="8" fill="#2b2433"/>`,
  luna: (c) => `<path d="M64 6A44 44 0 1 0 94 70 34 34 0 1 1 64 6Z" fill="${c}"/><path d="M80 18l3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="${c}"/>`,
  calavera: (c) => `<g><path d="M50 6c24 0 40 16 40 38 0 14-7 23-16 28v14H26V72c-9-5-16-14-16-28C10 22 26 6 50 6Z" fill="${c}"/><circle cx="35" cy="44" r="10" fill="#5b3a73"/><circle cx="65" cy="44" r="10" fill="#5b3a73"/><path d="M50 56l-6 10h12Z" fill="#5b3a73"/><g fill="#e85d9b"><circle cx="35" cy="44" r="4"/><circle cx="65" cy="44" r="4"/></g><path d="M36 80v10M46 80v10M54 80v10M64 80v10" stroke="#5b3a73" stroke-width="3"/></g>`,
  flor: (c) => `<g fill="${c}">${Array.from({ length: 12 }, (_, i) => `<ellipse cx="50" cy="22" rx="11" ry="20" transform="rotate(${i * 30} 50 50)"/>`).join("")}</g><g fill="rgba(0,0,0,.12)">${Array.from({ length: 12 }, (_, i) => `<ellipse cx="50" cy="32" rx="7" ry="13" transform="rotate(${i * 30 + 15} 50 50)"/>`).join("")}</g><circle cx="50" cy="50" r="12" fill="#c2410c"/>`,
  lavanda: (c) => `<g><path d="M50 96V30M50 70 30 40M50 70l20-30" stroke="#6d8a5a" stroke-width="4" fill="none"/>${[[50, 10], [50, 22], [44, 16], [56, 16], [30, 26], [26, 34], [34, 32], [70, 26], [74, 34], [66, 32]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="8" fill="${c}"/>`).join("")}</g>`,
  hoja: (c) => `<path d="M14 88C14 40 44 10 90 10c0 46-30 78-76 78Z" fill="${c}"/><path d="M14 88 74 26" stroke="rgba(255,255,255,.55)" stroke-width="4"/>`,
  mono: (c) => `<g fill="${c}"><path d="M50 50 12 26c-6-4-10 2-10 8v32c0 6 4 12 10 8Z"/><path d="M50 50l38-24c6-4 10 2 10 8v32c0 6-4 12-10 8Z"/><path d="M44 54 30 96l12-6 6 8 4-42ZM56 54l14 42-12-6-6 8-4-42Z"/><circle cx="50" cy="50" r="10"/></g>`,
  galleta: (c) => `<g fill="${c}"><circle cx="50" cy="22" r="16"/><path d="M30 40h40l18 14-6 8-12-6v14l10 22-10 4-14-18-14 18-10-4 10-22V56l-12 6-6-8Z"/></g><g fill="#fff"><circle cx="44" cy="20" r="2.5"/><circle cx="56" cy="20" r="2.5"/><circle cx="50" cy="52" r="3"/><circle cx="50" cy="64" r="3"/></g>`,
};

// ───────── Llama con parpadeo suave ─────────
const flame = (x, y, s = 1) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="0" cy="-18" rx="22" ry="30" fill="url(#halo)"/>
    <g>
      <animateTransform attributeName="transform" type="scale" values="1 1;0.94 1.06;1.03 0.97;1 1" dur="1.6s" repeatCount="indefinite" additive="sum"/>
      <path d="M0-44C10-30 14-20 14-10A14 14 0 0 1-14-10C-14-20-10-30 0-44Z" fill="url(#llama)"/>
      <path d="M0-26C5-19 7-14 7-9A7 7 0 0 1-7-9C-7-14-5-19 0-26Z" fill="#fff6d5"/>
    </g>
    <path d="M0 0v-8" stroke="#3b2a22" stroke-width="3" stroke-linecap="round"/>
  </g>`;

const defs = (id, base, shade) => `
  <defs>
    <linearGradient id="cuerpo" x1="0" x2="1">
      <stop offset="0" stop-color="${base}"/><stop offset=".55" stop-color="${base}"/><stop offset="1" stop-color="${shade}"/>
    </linearGradient>
    <radialGradient id="llama" cx=".5" cy=".75" r=".7">
      <stop offset="0" stop-color="#fff2b0"/><stop offset=".55" stop-color="#ffb43d"/><stop offset="1" stop-color="#f06d2a"/>
    </radialGradient>
    <radialGradient id="halo"><stop offset="0" stop-color="#ffd27a" stop-opacity=".55"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>
    <linearGradient id="vidrio" x1="0" x2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".2" stop-color="#fff" stop-opacity=".15"/><stop offset=".8" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#fff" stop-opacity=".45"/>
    </linearGradient>
  </defs>`;

const motif = (name, color, cx, cy, size) => (name ? `<g transform="translate(${cx - size / 2} ${cy - size / 2}) scale(${size / 100})">${M[name](color)}</g>` : "");
const sombra = (cx, cy, rx) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${rx * 0.14}" fill="#3b2a22" opacity=".14"/>`;

/** Vela de pilar con banda o motivo al frente. */
function pilar({ cera, sombraCera, motivo, colorMotivo, banda }) {
  return `${sombra(200, 340, 96)}
  <rect x="122" y="140" width="156" height="196" rx="14" fill="url(#cuerpo)"/>
  <ellipse cx="200" cy="140" rx="78" ry="16" fill="${cera}"/>
  <ellipse cx="200" cy="142" rx="64" ry="11" fill="${sombraCera}" opacity=".35"/>
  ${banda ? `<rect x="122" y="272" width="156" height="22" fill="${banda}"/>` : ""}
  ${motif(motivo, colorMotivo, 200, 214, 76)}
  ${flame(200, 138)}`;
}

/** Vela en frasco de vidrio con tapa y etiqueta redonda. */
function frasco({ cera, sombraCera, motivo, colorMotivo, etiqueta = "#fffaf3", tapa = "#c9a77c" }) {
  return `${sombra(200, 342, 92)}
  <rect x="118" y="118" width="164" height="222" rx="26" fill="#ffffff" opacity=".35" stroke="#d9cdbf" stroke-width="3"/>
  <rect x="126" y="168" width="148" height="164" rx="20" fill="url(#cuerpo)"/>
  <ellipse cx="200" cy="168" rx="74" ry="12" fill="${sombraCera}" opacity=".5"/>
  <rect x="118" y="118" width="164" height="222" rx="26" fill="url(#vidrio)"/>
  <circle cx="200" cy="252" r="50" fill="${etiqueta}" stroke="${tapa}" stroke-width="4"/>
  ${motif(motivo, colorMotivo, 200, 252, 62)}
  <rect x="116" y="312" width="168" height="14" rx="7" fill="${tapa}" opacity=".85"/>
  ${flame(200, 166, 0.85)}`;
}

/** Par de velas cónicas en candelero (bodas y bautizos). */
function conicas({ cera, sombraCera, motivo, colorMotivo, liston = "#c9a77c" }) {
  const una = (x, h) => `<path d="M${x - 16} 330 L${x - 12} ${330 - h} Q${x} ${322 - h} ${x + 12} ${330 - h} L${x + 16} 330Z" fill="url(#cuerpo)"/>${flame(x, 328 - h, 0.7)}`;
  return `${sombra(200, 346, 110)}
  ${una(150, 200)}${una(250, 200)}
  <rect x="104" y="326" width="192" height="16" rx="8" fill="${liston}"/>
  <path d="M200 250c-20-14-36-6-36 6 0 10 16 12 36 2 20 10 36 8 36-2 0-12-16-20-36-6Z" fill="${liston}"/>
  <path d="M194 256l-10 38 10-6 6 8 4-40Z" fill="${liston}"/>
  ${motif(motivo, colorMotivo, 200, 200, 52)}
  <ellipse cx="150" cy="130" rx="12" ry="3" fill="${sombraCera}" opacity=".4"/><ellipse cx="250" cy="130" rx="12" ry="3" fill="${sombraCera}" opacity=".4"/>
  ${cera ? "" : ""}`;
}

/** Paquete de tres frascos mini (recuerdos por mayoreo). */
function mini({ colores, motivo, colorMotivo, tapa = "#c9a77c" }) {
  const uno = (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s})">
    <rect x="-46" y="-70" width="92" height="124" rx="16" fill="#fff" opacity=".35" stroke="#d9cdbf" stroke-width="3"/>
    <rect x="-40" y="-40" width="80" height="88" rx="12" fill="${c}"/>
    <rect x="-46" y="-70" width="92" height="124" rx="16" fill="url(#vidrio)"/>
    <rect x="-47" y="38" width="94" height="9" rx="4.5" fill="${tapa}" opacity=".85"/>
    <circle cx="0" cy="6" r="27" fill="#fffaf3" stroke="${tapa}" stroke-width="3"/>
    ${motif(motivo, colorMotivo, 0, 6, 34)}
    ${flame(0, -42, 0.55)}
  </g>`;
  return `${sombra(200, 346, 140)}${uno(112, 282, 0.95, colores[0])}${uno(288, 282, 0.95, colores[2])}${uno(200, 270, 1.1, colores[1])}`;
}

const SHAPES = { pilar, frasco, conicas, mini };

/** slug → [forma, opciones, color de cera, sombra de cera] */
export const VELAS = {
  // Navidad
  "pino-nevado": ["pilar", { motivo: "copo", colorMotivo: "#ffffff", banda: "#b8862f" }, "#2f5a43", "#1f3d2d"],
  "ponche-navideno": ["frasco", { motivo: "estrella", colorMotivo: "#b8862f", tapa: "#b8862f" }, "#a3243b", "#7a1a2c"],
  "galleta-de-jengibre": ["pilar", { motivo: "galleta", colorMotivo: "#8a5a35", banda: "#a3243b" }, "#f3e6d2", "#d8c3a5"],
  "esfera-roja": ["pilar", { motivo: "estrella", colorMotivo: "#e2b45c" }, "#a3243b", "#7a1a2c"],
  "set-navideno-mini": ["mini", { colores: ["#a3243b", "#2f5a43", "#e2b45c"], motivo: "pino", colorMotivo: "#2f5a43", tapa: "#b8862f" }],
  // Amor y amistad
  "frasco-te-quiero": ["frasco", { motivo: "corazon", colorMotivo: "#c8203f", tapa: "#e6a5b2" }, "#f7c4ce", "#e79aab"],
  "rosas-y-vainilla": ["pilar", { motivo: "corazon", colorMotivo: "#fff1f3", banda: "#f7c4ce" }, "#c8203f", "#9c1530"],
  "set-amistad-mini": ["mini", { colores: ["#f7c4ce", "#c8203f", "#ffe1e7"], motivo: "corazon", colorMotivo: "#c8203f", tapa: "#e6a5b2" }],
  // Día de muertos
  "cempasuchil": ["frasco", { motivo: "flor", colorMotivo: "#f29e1f", tapa: "#7b3f9e" }, "#f6b13d", "#d98a17"],
  "calaverita-de-azucar": ["pilar", { motivo: "calavera", colorMotivo: "#ffffff", banda: "#f29e1f" }, "#7b3f9e", "#5b2a6e"],
  "pan-de-muerto": ["frasco", { motivo: "flor", colorMotivo: "#7b3f9e", tapa: "#f29e1f" }, "#e8b97a", "#c9945a"],
  // Halloween
  "calabaza-especiada": ["pilar", { motivo: "calabaza", colorMotivo: "#f08a3c", banda: "#3a2a4a" }, "#2b2433", "#18141d"],
  "noche-de-brujas": ["frasco", { motivo: "luna", colorMotivo: "#f0b45c", etiqueta: "#2b2433", tapa: "#6b4a8a" }, "#3a2a4a", "#241a30"],
  "fantasma-de-vainilla": ["pilar", { motivo: "fantasma", colorMotivo: "#ffffff", banda: "#f08a3c" }, "#6b4a8a", "#4b3266"],
  // Bautizo
  "vela-de-bautizo": ["conicas", { motivo: "cruz", colorMotivo: "#c9a77c", liston: "#c9a77c" }, "#fffaf3", "#e9dfd2"],
  "recuerdo-bautizo-mini": ["mini", { colores: ["#fffaf3", "#f3ece2", "#fffaf3"], motivo: "cruz", colorMotivo: "#c9a77c" }],
  "frasco-bendicion": ["frasco", { motivo: "cruz", colorMotivo: "#c9a77c" }, "#fffaf3", "#e9dfd2"],
  // Baby shower
  "frasco-oh-baby": ["frasco", { motivo: "huellas", colorMotivo: "#7fa7c9", tapa: "#a9c8e2" }, "#dceaf6", "#b9d3ea"],
  "recuerdo-huellitas-mini": ["mini", { colores: ["#f7d6dc", "#dceaf6", "#f6efc9"], motivo: "huellas", colorMotivo: "#9c7a64" }],
  "pilar-baby-mono": ["pilar", { motivo: "mono", colorMotivo: "#e9b8c2", banda: "#f6efc9" }, "#fff4d6", "#efdcae"],
  // Bodas
  "vela-de-unidad": ["conicas", { motivo: "anillos", colorMotivo: "#c9a77c", liston: "#e8dccb" }, "#fffaf3", "#e9dfd2"],
  "recuerdo-boda-frasco": ["frasco", { motivo: "anillos", colorMotivo: "#c9a77c" }, "#f3ece2", "#e2d5c8"],
  "pilar-iniciales": ["pilar", { motivo: "hoja", colorMotivo: "#a8b89a", banda: "#c9a77c" }, "#fffaf3", "#e9dfd2"],
  // XV años y cumpleaños
  "recuerdo-xv-anos": ["frasco", { motivo: "estrella", colorMotivo: "#c9a77c", tapa: "#e6a5b2" }, "#f4c6d4", "#e2a2b6"],
  "recuerdo-cumpleanos-mini": ["mini", { colores: ["#f6efc9", "#f4c6d4", "#dceaf6"], motivo: "estrella", colorMotivo: "#c9a77c" }],
  // Aromáticas
  "ambar": ["frasco", { motivo: "hoja", colorMotivo: "#b07a2a" }, "#e9a640", "#c8841f"],
  "lavanda": ["frasco", { motivo: "lavanda", colorMotivo: "#9a7cc9", tapa: "#b9a6d9" }, "#c9b6ea", "#a891d6"],
  "coco-y-vainilla": ["frasco", { motivo: "hoja", colorMotivo: "#c9a77c" }, "#f6efe3", "#e3d6c3"],
  "eucalipto-y-menta": ["frasco", { motivo: "hoja", colorMotivo: "#6d8a5a", tapa: "#a8b89a" }, "#c9d8bf", "#a9bf9b"],
};

for (const [slug, [shape, opts, cera = "#fffaf3", sombraCera = "#e9dfd2"]] of Object.entries(VELAS)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="800" height="800">${defs(slug, cera, sombraCera)}${SHAPES[shape]({ cera, sombraCera, ...opts })}</svg>\n`;
  writeFileSync(join(OUT, `${slug}.svg`), svg.replace(/\n\s+/g, "\n"));
}
console.info(`✓ ${Object.keys(VELAS).length} ilustraciones en ${OUT}`);
