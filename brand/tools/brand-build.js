// Generates Saakshi brand assets (vector + raster) into the project's brand/ folder.
// Usage: node brand-build.js <brandDir>
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const opentype = require("opentype.js");
const QRCode = require("qrcode");

const BRAND = process.argv[2];
if (!BRAND) throw new Error("usage: node brand-build.js <brandDir>");
const FONTS_DL = path.join(__dirname, "..", "fonts-dl");
const USER_FONTS = "C:/Users/Pratik/AppData/Local/Microsoft/Windows/Fonts";

const C = {
  rani: "#D6246E", raniBright: "#FF6FA5", plum: "#1C0914", plumSurface: "#34122A",
  blush: "#FCEEF3", ink: "#1D1419", white: "#FFFFFF",
};

function loadFont(p) {
  const b = fs.readFileSync(p);
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
}
const SERIF = loadFont(path.join(FONTS_DL, "InstrumentSerif-Regular.ttf"));
const SANS_M = loadFont(path.join(USER_FONTS, "DMSans-Medium.ttf"));

function mkdirs(...dirs) { dirs.forEach((d) => fs.mkdirSync(d, { recursive: true })); }
async function writeSvgAndPng(svg, base, pngWidth) {
  fs.writeFileSync(base + ".svg", svg);
  await sharp(Buffer.from(svg)).resize({ width: pngWidth }).png().toFile(base + ".png");
}

// ---------- wordmark: the dot of the i is a rani-pink bindi ----------
function wordmarkSvg(textFill, dotFill) {
  const S = 1000, pad = 40, base = 1000;
  // Glyph-by-glyph layout: opentype.js cannot run this font's GSUB shaping.
  const glyphs = Array.from("Saaksh\u0131").map((ch) => SERIF.charToGlyph(ch));
  const p = new opentype.Path();
  let pen = pad, adv = 0;
  glyphs.forEach((gl, i) => {
    if (i === glyphs.length - 1) adv = pen - pad;
    p.extend(gl.getPath(pen, base, S));
    pen += gl.advanceWidth * (S / SERIF.unitsPerEm);
    if (i < glyphs.length - 1) pen += SERIF.getKerningValue(gl, glyphs[i + 1]) * (S / SERIF.unitsPerEm);
  });
  const bb = p.getBoundingBox();
  const g = glyphs[glyphs.length - 1].getBoundingBox();
  const cx = pad + adv + ((g.x1 + g.x2) / 2) * (S / SERIF.unitsPerEm);
  const top = base - g.y2 * (S / SERIF.unitsPerEm);
  const r = 0.068 * S, cy = top - r - 0.075 * S;
  const minY = Math.min(bb.y1, cy - r) - pad, maxY = bb.y2 + pad, maxX = Math.max(bb.x2, cx + r) + pad;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${minY.toFixed(1)} ${maxX.toFixed(1)} ${(maxY - minY).toFixed(1)}">` +
    `<title>Saakshi</title><path d="${p.toPathData(2)}" fill="${textFill}"/>` +
    `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${dotFill}"/></svg>`;
}

// ---------- the eye: Durga's vertical third eye, drawn from two circular arcs ----------
function almondPath(halfH, halfW) {
  const c = (halfW * halfW - halfH * halfH) / (2 * halfW); // arc centre offset (negative)
  const r = halfW - c;
  return `M 0 ${-halfH} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 0 ${halfH} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 0 ${-halfH} Z`;
}

function markSvg(disc, eye, pupil) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-100 -100 200 200"><title>Saakshi mark</title>` +
    `<circle r="100" fill="${disc}"/><path d="${almondPath(60, 27)}" fill="${eye}"/><circle r="13" fill="${pupil}"/></svg>`;
}

// ---------- the seal: mark + ring text, used wherever evidence is verified ----------
// Top arc reads clockwise and is centred on 12 o'clock; the bottom arc stays upright, as on a real seal.
function sealSvg(disc, ink) {
  const S = 15.5, rb = 71.5, capH = (SANS_M.tables.os2.sCapHeight / SANS_M.unitsPerEm) * S;
  const track = 0.3 * S;
  const measure = (str) => {
    const glyphs = Array.from(str).map((ch) => SANS_M.charToGlyph(ch));
    const advs = glyphs.map((g) => g.advanceWidth * (S / SANS_M.unitsPerEm));
    return { glyphs, advs, len: advs.reduce((a, b) => a + b, 0) + track * (glyphs.length - 1) };
  };
  const deg = 180 / Math.PI;
  let parts = "";

  const top = measure("WITNESSED \u00B7 SEALED");
  let pos = -top.len / 2;
  top.glyphs.forEach((g, i) => {
    const theta = ((pos + top.advs[i] / 2) / rb) * deg;
    const d = g.getPath(-top.advs[i] / 2, -rb, S).toPathData(2);
    if (d) parts += `<path transform="rotate(${theta.toFixed(3)})" d="${d}" fill="${ink}"/>`;
    pos += top.advs[i] + track;
  });
  const topHalfDeg = (top.len / 2 / rb) * deg;

  const rOut = rb + capH; // bottom glyphs hang inward from the outer edge of the text band
  const bottom = measure("BELIEVED");
  pos = -bottom.len / 2;
  bottom.glyphs.forEach((g, i) => {
    const theta = 180 - ((pos + bottom.advs[i] / 2) / rOut) * deg;
    const d = g.getPath(-bottom.advs[i] / 2, 0, S).toPathData(2);
    if (d) parts += `<path transform="rotate(${theta.toFixed(3)}) translate(0 ${-rOut.toFixed(3)}) rotate(180)" d="${d}" fill="${ink}"/>`;
    pos += bottom.advs[i] + track;
  });
  const bottomHalfDeg = (bottom.len / 2 / rOut) * deg;

  // Separator dots centred in the two gaps between the arcs.
  const gapMid = (topHalfDeg + (180 - bottomHalfDeg)) / 2;
  const rDot = rb + capH / 2;
  for (const a of [gapMid, -gapMid]) {
    const rad = a / deg;
    parts += `<circle cx="${(rDot * Math.sin(rad)).toFixed(2)}" cy="${(-rDot * Math.cos(rad)).toFixed(2)}" r="1.9" fill="${ink}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-100 -100 200 200"><title>Saakshi seal</title>` +
    `<circle r="100" fill="${disc}"/>` +
    `<circle r="90" fill="none" stroke="${ink}" stroke-width="1.4"/>` +
    `<circle r="65" fill="none" stroke="${ink}" stroke-width="1.4"/>` + parts +
    `<path d="${almondPath(42, 19)}" fill="${ink}"/><circle r="9.5" fill="${disc}"/></svg>`;
}

// ---------- disguise icon: an ordinary calculator ----------
function calculatorSvg(maskable) {
  const s = maskable ? 0.78 : 1;
  const sym = (cx, cy, kind, color) => {
    const L = 92 * s, T = 18 * s, h = T / 2;
    const bar = (x, y, w, hgt, rot = 0) =>
      `<rect x="${(x - w / 2).toFixed(1)}" y="${(y - hgt / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${hgt.toFixed(1)}" rx="${h.toFixed(1)}" fill="${color}" transform="rotate(${rot} ${x} ${y})"/>`;
    if (kind === "+") return bar(cx, cy, L, T) + bar(cx, cy, T, L);
    if (kind === "x") return bar(cx, cy, L, T, 45) + bar(cx, cy, T, L, 45);
    if (kind === "-") return bar(cx, cy, L, T);
    return bar(cx, cy - 20 * s, L, T) + bar(cx, cy + 20 * s, L, T);
  };
  const d = 80 * s;
  const bg = maskable
    ? `<rect width="512" height="512" fill="#1E1B1F"/>`
    : `<rect x="16" y="16" width="480" height="480" rx="112" fill="#1E1B1F"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><title>Calculator</title>${bg}` +
    sym(256 - d, 256 - d, "+", "#F2EEF0") + sym(256 + d, 256 - d, "-", "#F2EEF0") +
    sym(256 - d, 256 + d, "x", "#F2EEF0") + sym(256 + d, 256 + d, "=", C.rani) + `</svg>`;
}

async function main() {
  const logo = path.join(BRAND, "logo"), icons = path.join(BRAND, "icons"), assets = path.join(BRAND, "assets"), fontsOut = path.join(BRAND, "fonts");
  mkdirs(logo, icons, assets, fontsOut);

  await writeSvgAndPng(wordmarkSvg(C.ink, C.rani), path.join(logo, "wordmark-on-light"), 2400);
  await writeSvgAndPng(wordmarkSvg(C.white, C.raniBright), path.join(logo, "wordmark-on-dark"), 2400);
  await writeSvgAndPng(markSvg(C.rani, C.plum, C.rani), path.join(logo, "mark"), 1200);
  await writeSvgAndPng(sealSvg(C.rani, C.plum), path.join(logo, "seal-pink"), 2000);
  await writeSvgAndPng(sealSvg(C.plum, C.raniBright), path.join(logo, "seal-plum"), 2000);

  for (const [name, maskable, size] of [["calculator-192", false, 192], ["calculator-512", false, 512], ["calculator-maskable-512", true, 512]]) {
    const svg = calculatorSvg(maskable);
    if (size === 512 && !maskable) fs.writeFileSync(path.join(icons, "calculator.svg"), svg);
    await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(icons, name + ".png"));
  }

  // Soft rani glow used behind the seal on dark slides.
  const glow = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1600"><defs><radialGradient id="g" cx="50%" cy="50%" r="50%">` +
    `<stop offset="0%" stop-color="${C.rani}" stop-opacity="0.42"/><stop offset="45%" stop-color="${C.rani}" stop-opacity="0.14"/>` +
    `<stop offset="100%" stop-color="${C.rani}" stop-opacity="0"/></radialGradient></defs><rect width="1600" height="1600" fill="url(#g)"/></svg>`;
  await sharp(Buffer.from(glow)).png().toFile(path.join(assets, "glow-rani.png"));

  const qr = await QRCode.toString("SAAKSHI VERIFY | ria_ashtami_2241.mp4 | sealed 2026-10-19 22:41 IST | untampered (illustrative demo)", {
    type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: C.ink, light: "#FFFFFF" },
  });
  fs.writeFileSync(path.join(assets, "qr-demo.svg"), qr);

  // Fonts the UI kit and the app use (all SIL Open Font License).
  for (const f of ["InstrumentSerif-Regular", "InstrumentSerif-Italic", "TiroBangla-Regular", "TiroBangla-Italic", "TiroDevanagariHindi-Regular", "TiroDevanagariHindi-Italic"]) {
    fs.copyFileSync(path.join(FONTS_DL, f + ".ttf"), path.join(fontsOut, f + ".ttf"));
  }
  for (const f of ["DMSans-Regular", "DMSans-Medium", "DMSans-Bold", "DMSans-Italic"]) {
    fs.copyFileSync(path.join(USER_FONTS, f + ".ttf"), path.join(fontsOut, f + ".ttf"));
  }
  console.log("brand assets written to " + BRAND);
}

main().catch((e) => { console.error(e); process.exit(1); });
