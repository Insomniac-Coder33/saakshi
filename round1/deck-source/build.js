// Builds the SHAKTI Hackathon Round 1 deck for "Saakshi" (v5: brand system, 12-column grid, fixed type scale).
// Shapes named a<group>_<delay*10>_<duration*10>_<n> are animated later by animate.ps1, in group order.
// Usage: node build5.js <out.pptx> <brandDir>
const path = require("path");
const pptxgen = require("pptxgenjs");
const sharp = require("sharp");
const { applyTheme } = require(path.join(
  "C:/Users/Pratik/.claude/skills/synced/a2a23248-510f-4e4d-867c-dfc75ed37e3c_8230d551-dbe7-4d9e-8a5b-c2a8f2b0f013/pptx/scripts/apply_theme.js"
));

const OUT = process.argv[2] || "deck.pptx";
const BRAND = process.argv[3] || "C:/Users/Pratik/Desktop/Appvengers-Shakti/brand";
const asset = (p) => path.join(BRAND, p);

// ---------- tokens (mirror brand/tokens.css) ----------
const PLUM = "1C0914", RANI = "D6246E", RANI_L = "FF6FA5", BLUSH = "FCEEF3", BLUSH2 = "F2D3DF";
const INK = "1D1419", MUTED = "76626D", HAIR = "EAD8E0", HAIR_D = "47203D", SOFT_D = "CDB8C4", PALE_D = "F6E3EB";
const ON_PINK = "FFE1EC", PINK_LINE = "EE7FAA", GREEN = "2F7A5F";
const SERIF = "Instrument Serif", SANS = "DM Sans", SANS_M = "DM Sans Medium";
const BANGLA = "Tiro Bangla", DEVA = "Tiro Devanagari Hindi";

// Type scale (pt). Every text box uses one of these.
const TS = { label: 10, small: 14, body: 16, lead: 20, quote: 24, sub: 32, title: 40, display: 56, big: 72, hero: 120 };

const THEME = {
  name: "Saakshi Rani", headFontFace: SERIF, bodyFontFace: SANS,
  colors: { dk1: INK, lt1: "FFFFFF", dk2: PLUM, lt2: BLUSH, accent1: RANI, accent2: RANI_L, accent3: GREEN, accent4: "A8154F", accent5: MUTED, accent6: BLUSH2, hlink: RANI, folHlink: "A8154F" },
};

// ---------- 12-column grid ----------
const W = 13.333, M = 0.75, CW = W - 2 * M, GUT = 1 / 3, COL = (CW - 11 * GUT) / 12;
const colX = (i) => M + i * (COL + GUT);
const span = (n) => n * COL + (n - 1) * GUT;

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.author = "Team Appvengers";
pres.title = "Saakshi - SHAKTI Hackathon 2026 Round 1";
pres.subject = "Round 1 Idea Submission - Women Safety / Blockchain";
pres.theme = { headFontFace: SERIF, bodyFontFace: SANS };

// ---------- animation naming ----------
let AG = null, uid = 0;
function anim(group, delay = 0.2, dur = 0.6) { AG = { group, delay, dur }; }
function still() { AG = null; }
function nm() {
  uid++;
  return AG ? `a${AG.group}_${Math.round(AG.delay * 10)}_${Math.round(AG.dur * 10)}_${uid}` : `s_${uid}`;
}

// ---------- typography helpers ----------
// Typographer's quotes: curly apostrophes and quotation marks everywhere on slides.
function smart(s) {
  return s.replace(/(^|[\s(\[{\u201C])"/g, "$1\u201C").replace(/"/g, "\u201D").replace(/'/g, "\u2019");
}
function smartRuns(text) {
  if (typeof text === "string") return smart(text);
  return text.map((r) => ({ ...r, text: smart(r.text) }));
}
function t(s, text, o = {}) {
  s.addText(smartRuns(text), {
    isTextBox: true, margin: 0, valign: "top", fontFace: SANS, fontSize: TS.body, color: INK,
    lineSpacingMultiple: 1.2, objectName: nm(), ...o,
  });
}
function serif(s, text, o = {}) { t(s, text, { fontFace: SERIF, lineSpacingMultiple: 1.0, ...o }); }
function label(s, text, x, y, w, color = RANI, o = {}) {
  t(s, text.toUpperCase(), { x, y, w, h: 0.25, fontFace: SANS_M, fontSize: TS.label, charSpacing: 2.5, color, lineSpacingMultiple: 1.0, ...o });
}
function hline(s, x, y, w, color = HAIR, width = 0.75) {
  s.addShape(pres.shapes.LINE, { x, y, w, h: 0, line: { color, width }, objectName: nm() });
}
function vline(s, x, y, h, color = HAIR, width = 0.75) {
  s.addShape(pres.shapes.LINE, { x, y, w: 0, h, line: { color, width }, objectName: nm() });
}
function rect(s, x, y, w, h, fill, o = {}) {
  s.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h, fill: { color: fill }, line: o.line ? { color: o.line, width: 0.75 } : { type: "none" }, objectName: nm(),
  });
}
function dot(s, x, y, d, color) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color }, line: { type: "none" }, objectName: nm() });
}
const sizeCache = {};
async function aspect(file) {
  if (!sizeCache[file]) { const m = await sharp(file).metadata(); sizeCache[file] = m.width / m.height; }
  return sizeCache[file];
}
async function imgH(s, file, x, y, h, altText) {
  const w = h * (await aspect(file));
  s.addImage({ path: file, x, y, w, h, altText, objectName: nm() });
  return w;
}
async function imgW(s, file, x, y, w, altText) {
  const h = w / (await aspect(file));
  s.addImage({ path: file, x, y, w, h, altText, objectName: nm() });
  return h;
}
// UI renders carry transparent padding for their shadows, so place them by the device's own box (CSS px).
const DEVICE = {
  phone: { w: 637, h: 1156, x: 110, y: 110, dw: 417, dh: 876 },
  browser: { w: 1440, h: 870, x: 120, y: 100, dw: 1200, dh: 600 },
};
function placeDevice(s, file, kind, dx, dy, dh, altText) {
  const k = DEVICE[kind], scale = dh / k.dh;
  s.addImage({ path: file, x: dx - k.x * scale, y: dy - k.y * scale, w: k.w * scale, h: k.h * scale, altText, objectName: nm() });
  return k.dw * scale;
}
const deviceWidth = (kind, dh) => DEVICE[kind].dw * (dh / DEVICE[kind].dh);

// ---------- layouts ----------
const titlePh = (color) => ({
  placeholder: {
    options: {
      name: "title", type: "title", x: M, y: 0.8, w: CW, h: 0.8,
      fontFace: SERIF, fontSize: TS.title, color, valign: "top", align: "left", margin: 0,
    },
    text: "",
  },
});
const pageNo = (color) => ({ x: W - M - 0.8, y: 0.4, w: 0.8, h: 0.25, fontFace: SANS_M, fontSize: TS.label, color, align: "right" });
pres.defineSlideMaster({ title: "Saakshi Cover", background: { color: PLUM }, objects: [] });
pres.defineSlideMaster({ title: "Saakshi Pink Full", background: { color: RANI }, objects: [] });
pres.defineSlideMaster({ title: "Saakshi Pink", background: { color: RANI }, objects: [], slideNumber: pageNo(ON_PINK) });
pres.defineSlideMaster({ title: "Saakshi Dark", background: { color: PLUM }, objects: [titlePh("FFFFFF")], slideNumber: pageNo("8C7383") });
pres.defineSlideMaster({ title: "Saakshi Light", background: { color: "FFFFFF" }, objects: [titlePh(INK)], slideNumber: pageNo(MUTED) });
pres.defineSlideMaster({ title: "Saakshi Blush", background: { color: BLUSH }, objects: [titlePh(INK)], slideNumber: pageNo(MUTED) });

const CHAPTERS = { 1: "Her story", 2: "The witness", 3: "Under the hood", 4: "Build and impact" };
const ROMAN = { 1: "i.", 2: "ii.", 3: "iii.", 4: "iv." };
function slide(master, section, chapter, title) {
  still();
  const s = pres.addSlide({ masterName: master, sectionTitle: section });
  if (chapter) {
    const dark = master === "Saakshi Dark", pink = master === "Saakshi Pink";
    t(s, [
      { text: ROMAN[chapter] + "  ", options: { color: pink ? "FFFFFF" : dark ? RANI_L : RANI } },
      { text: CHAPTERS[chapter], options: { color: pink ? ON_PINK : dark ? SOFT_D : MUTED } },
    ], { x: M, y: 0.36, w: 5, h: 0.3, fontFace: SERIF, fontSize: TS.lead, italic: true, lineSpacingMultiple: 1.0 });
  }
  if (title) s.addText(smart(title), { placeholder: "title" });
  return s;
}

async function main() {
  // ================= 1. COVER =================
  pres.addSection({ title: "Opening" });
  {
    const s = slide("Saakshi Cover", "Opening");
    await imgW(s, asset("assets/glow-rani.png"), 6.75, 0.25, 7.0, "");
    await imgW(s, asset("logo/seal-pink.png"), 7.85, 1.35, 4.8, "The Saakshi seal: witnessed, sealed, believed");
    label(s, "SHAKTI Hackathon 2026  ·  Round 1 idea submission", M, 0.75, span(7), RANI_L);
    await imgH(s, asset("logo/wordmark-on-dark.png"), M - 0.03, 1.25, 1.3, "Saakshi");
    t(s, [
      { text: "साक्षी", options: { fontFace: DEVA, color: RANI_L, lang: "hi-IN" } },
      { text: "   ·   ", options: { fontFace: SANS, color: HAIR_D } },
      { text: "সাক্ষী", options: { fontFace: BANGLA, color: RANI_L, lang: "bn-IN" } },
      { text: "   ·   ", options: { fontFace: SANS, color: HAIR_D } },
      { text: "the witness", options: { fontFace: SERIF, italic: true, color: PALE_D } },
    ], { x: M, y: 2.78, w: span(7), h: 0.5, fontSize: TS.quote, lineSpacingMultiple: 1.0 });
    serif(s, "An SOS gets help to her. Saakshi gets justice to her.", { x: M, y: 3.55, w: span(7), h: 1.2, fontSize: TS.sub, italic: true, color: "FFFFFF" });
    t(s, "Saakshi silently records harassment, seals the evidence so no one can claim it was edited, and explains her rights in her own language.", {
      x: M, y: 4.85, w: span(6), h: 1.05, fontSize: TS.body, color: SOFT_D, lineSpacingMultiple: 1.3,
    });
    hline(s, M, 6.1, span(7), HAIR_D);
    [["Track", "Women Safety / Blockchain", 0], ["Team", "Appvengers", 3], ["Built with", "AI agents · Polygon · PWA", 5]].forEach(([k, v, c]) => {
      label(s, k, colX(c), 6.3, span(3), RANI_L);
      t(s, v, { x: colX(c), y: 6.56, w: span(3), h: 0.3, fontSize: TS.small, color: PALE_D, lineSpacingMultiple: 1.0 });
    });
    s.addNotes("Saakshi means 'the witness'. Most safety apps get help to a woman. Saakshi is built for what comes after: proof that can't be lost or doubted, and a clear path to justice, in her own language.");
  }

  // ================= 2. HER STORY =================
  pres.addSection({ title: "Her story" });
  {
    const s = slide("Saakshi Dark", "Her story", 1, "Ashtami night, North Kolkata");
    serif(s, "Ria is 20. She has waited all year for this night.", { x: M, y: 1.72, w: span(7), h: 0.45, fontSize: TS.quote, italic: true, color: PALE_D });
    const beats = [
      ["10:40 pm", "The pandal queue is packed. The dhak drowns out her friend Payel."],
      ["10:41 pm", "A hand grabs her from behind. Nobody saw, or everyone looked away."],
      ["10:55 pm", "He follows her to the metro. All she has is a shaky 9-second video."],
      ["Next day", "At the station: \"Are you sure it was him? Your video shows nothing.\""],
    ];
    beats.forEach(([time, text], i) => {
      anim(i + 1, i === 0 ? 0.5 : 0.9, 0.6);
      const y = 2.55 + i * 0.98;
      hline(s, M, y, colX(2) + span(4) + 0.3 - M, HAIR_D);
      serif(s, time, { x: M, y: y + 0.16, w: span(2), h: 0.45, fontSize: TS.quote, color: RANI_L });
      t(s, text, { x: colX(2), y: y + 0.18, w: span(4) + 0.3, h: 0.66, fontSize: TS.body, color: "E9DDE3" });
    });
    hline(s, M, 2.55 + 4 * 0.98, colX(2) + span(4) + 0.3 - M, HAIR_D);
    anim(5, 0.6, 0.9);
    serif(s, [{ text: "\"Where is your", options: { breakLine: true } }, { text: "proof?\"" }], {
      x: colX(7) - 0.12, y: 2.45, w: span(5) + 0.12, h: 1.75, fontSize: TS.display, italic: true, color: "FFFFFF", lineSpacingMultiple: 0.92,
    });
    anim(6, 0.4, 0.6);
    t(s, "Ria goes home. She never files the complaint. Like three in four women who face violence, she tells no one.", {
      x: colX(7), y: 4.45, w: span(4), h: 1.1, fontSize: TS.body, color: SOFT_D, lineSpacingMultiple: 1.3,
    });
    anim(7, 0.5, 0.6);
    label(s, "Ria is a composite. Her night is not.", colX(7), 6.25, span(5), "A88B9C");
    s.addNotes("Ria is a composite character, but every part of her night happens to real women, during Pujo and every other day. The harassment lasts seconds. What follows decides everything: evidence that doesn't hold up, a question she can't answer, and silence.");
  }

  // ================= 3. RIA IS FAR FROM ALONE =================
  {
    const s = slide("Saakshi Blush", "Her story", 1, "Ria is far from alone");
    anim(1, 0.3, 0.9);
    const d = 0.2, g = 0.12;
    for (let i = 0; i < 100; i++) {
      const r = Math.floor(i / 10), c = i % 10;
      dot(s, M + c * (d + g), 2.05 + r * (d + g), d, i < 77 ? RANI : BLUSH2);
    }
    anim(2, 0.2, 0.7);
    serif(s, "77", { x: colX(4) - 0.05, y: 1.7, w: span(4), h: 2.0, fontSize: TS.hero, color: RANI });
    t(s, "of every 100 women who face violence never tell anyone or seek help.", {
      x: colX(4), y: 3.45, w: span(4), h: 1.25, fontSize: TS.lead, color: INK, lineSpacingMultiple: 1.2,
    });
    t(s, "NFHS-5 (2019–21), as reported", { x: colX(4), y: 4.78, w: span(4), h: 0.25, fontSize: TS.label, color: MUTED });
    still();
    vline(s, colX(8) - GUT / 2, 2.0, 3.55, BLUSH2);
    [["4,48,211", "crimes against women registered in 2023, over 1,200 a day.", INK],
     ["1 in 5", "cases of crime against women ended in a conviction, 2017–2023.", INK],
     ["3.7%", "conviction rate for crimes against women in West Bengal, 2023.", RANI]].forEach(([n, c, col], i) => {
      anim(3 + i, 0.15, 0.5);
      const y = 1.92 + i * 1.22;
      serif(s, n, { x: colX(8), y, w: span(4), h: 0.7, fontSize: TS.title, color: col });
      t(s, c, { x: colX(8), y: y + 0.68, w: span(4), h: 0.55, fontSize: TS.small, color: MUTED, lineSpacingMultiple: 1.15 });
    });
    anim(6, 0.4, 0.7);
    serif(s, "Ask any woman you know. She has a story she never reported.", { x: M, y: 5.78, w: CW, h: 0.65, fontSize: TS.sub, italic: true, color: INK });
    still();
    t(s, "Sources: NCRB, Crime in India 2023 (via PTI, Sep 2025). NFHS-5 help-seeking data as reported. The Wire analysis of NCRB data, 2017–2023.", {
      x: M, y: 6.62, w: CW, h: 0.25, fontSize: TS.label, color: MUTED,
    });
    s.addNotes("Seventy-seven of every hundred women who face violence never tell anyone. Over 1,200 cases are registered every day, and those are only the reported ones. In Bengal, fewer than four in a hundred end in conviction. The thread running through all of it is proof.");
  }

  // ================= 4. HELP ARRIVES. BELIEF DOESN'T =================
  {
    const s = slide("Saakshi Light", "Her story", 1, "Help arrives. Belief doesn't");
    hline(s, M, 3.0, CW, HAIR);
    [["01", "The moment", "SOS apps alert her family and the police. That part works."],
     ["02", "The evidence", "Phone snatched, files lost, and the video dismissed as edited."],
     ["03", "The report", "Which law applies? Which office? What if he finds the app?"],
     ["04", "The court", "Courts need a certificate with the file's hash. Few have it."]].forEach(([n, name, desc], i) => {
      anim(i + 1, i === 0 ? 0.2 : 0.15, 0.5);
      const x = colX(3 * i), col = i === 0 ? MUTED : RANI;
      serif(s, n, { x, y: 1.85, w: span(2), h: 1.0, fontSize: TS.display, color: col });
      dot(s, x, 2.92, 0.16, col);
      label(s, name, x, 3.25, span(3), INK);
      t(s, desc, { x, y: 3.6, w: span(3) - 0.2, h: 0.95, fontSize: TS.body, color: MUTED });
    });
    anim(5, 0.3, 0.6);
    hline(s, M, 4.82, span(3), MUTED, 1);
    label(s, "Where today's apps stop", M, 4.94, span(3), MUTED);
    hline(s, colX(3), 4.82, CW - (colX(3) - M), RANI, 1.5);
    label(s, "Where Ria was left alone, and where Saakshi begins", colX(3), 4.94, span(9), RANI);
    anim(6, 0.3, 0.7);
    label(s, "Supreme Court  ·  2026", M, 5.72, span(3), RANI);
    serif(s, "Electronic evidence must be certified with its hash value.", { x: colX(3), y: 5.6, w: span(9), h: 0.5, fontSize: TS.quote, italic: true, color: INK });
    t(s, "Section 63(4), Bharatiya Sakshya Adhiniyam, upheld in Pune Bar Association v. Union of India. Saakshi records that hash the second evidence is captured.", {
      x: colX(3), y: 6.12, w: span(9), h: 0.62, fontSize: TS.small, color: MUTED,
    });
    s.addNotes("Every safety app helps with the first ten seconds. Ria's case collapsed in the days after: no usable evidence, no idea which law applied, and a court system that now expects hash-certified records. The Supreme Court upheld that requirement in 2026.");
  }

  // ================= 5. THREE WOMEN =================
  {
    const s = slide("Saakshi Blush", "Her story", 1, "Three women, three kinds of harm");
    still();
    vline(s, colX(4) - GUT / 2, 2.0, 4.5, BLUSH2);
    vline(s, colX(8) - GUT / 2, 2.0, 4.5, BLUSH2);
    [["Ria, 20", "Student · North Kolkata", "Groped in an Ashtami crowd, then followed to the metro. Her only proof is a shaky 9-second video.",
      "\"No one will believe me.\"", "Silent capture, sealed evidence and a ready Zero FIR."],
     ["Mitali, 34", "Homemaker · Howrah", "Her husband checks her phone every night. Cruelty at home is India's most-reported crime against women.",
      "\"If he finds out, it gets worse.\"", "A journal hidden inside a calculator, and a duress PIN."],
     ["Ananya, 19", "First-year student · Durgapur", "Morphed photos of her are spreading on Instagram. Her college group chat has already seen them.",
      "\"By morning, everyone will have seen it.\"", "A sealed screenshot vault and a takedown request the same night."]].forEach(([name, meta, sit, fear, gives], i) => {
      anim(i + 1, i === 0 ? 0.2 : 0.3, 0.6);
      const x = colX(4 * i), w = span(4) - 0.15;
      serif(s, name, { x, y: 1.9, w, h: 0.6, fontSize: TS.sub, color: INK });
      label(s, meta, x, 2.55, w, RANI);
      t(s, sit, { x, y: 2.95, w, h: 1.4, fontSize: TS.body, color: INK });
      serif(s, fear, { x, y: 4.4, w, h: 0.85, fontSize: TS.quote, italic: true, color: RANI });
      hline(s, x, 5.35, w, BLUSH2);
      label(s, "Saakshi gives her", x, 5.48, w, MUTED);
      t(s, gives, { x, y: 5.78, w, h: 0.65, fontSize: TS.body, color: INK });
    });
    still();
    t(s, "Composite characters. Cruelty by husband or relatives: 1,33,676 cases in 2023 (NCRB, Crime in India 2023).", { x: M, y: 6.62, w: CW, h: 0.25, fontSize: TS.label, color: MUTED });
    s.addNotes("Harassment looks different for every woman. Ria faces it in public, Mitali at home, Ananya online. Each has a different fear, and Saakshi answers each one directly.");
  }

  // ================= 6. THE IDEA (full rani) =================
  pres.addSection({ title: "Solution" });
  {
    const s = slide("Saakshi Pink", "Solution", 2, null);
    t(s, [
      { text: "At dawn on Mahalaya, Kumartuli's artisans paint the goddess's eyes. They call it ", options: {} },
      { text: "chokkhu daan", options: { italic: true } },
      { text: " (", options: {} },
      { text: "চক্ষুদান", options: { fontFace: BANGLA, italic: false, lang: "bn-IN" } },
      { text: "), the gift of sight.", options: {} },
    ], { x: M, y: 0.9, w: span(10), h: 0.85, fontFace: SERIF, fontSize: TS.quote, italic: true, color: ON_PINK, lineSpacingMultiple: 1.1 });
    anim(1, 0.4, 0.8);
    serif(s, "Saakshi gives every woman a witness that never looks away.", { x: M, y: 1.95, w: CW, h: 1.82, fontSize: TS.display, color: "FFFFFF", lineSpacingMultiple: 0.95 });
    still();
    hline(s, M, 3.85, CW, PINK_LINE);
    [["01", "Capture", "Three taps start a silent SOS. Audio, video and location stream out, encrypted."],
     ["02", "Prove", "Fingerprinted on her phone, sealed on Polygon. No one can claim it was edited."],
     ["03", "Act", "An AI agent explains which laws apply and drafts the complaint, in Bengali, Hindi or English."]].forEach(([n, word, desc], i) => {
      anim(i + 2, i === 0 ? 0.3 : 0.25, 0.6);
      const x = colX(4 * i), w = span(4) - 0.3;
      label(s, n, x, 4.05, w, "FFFFFF");
      serif(s, [{ text: word, options: { color: "FFFFFF" } }, { text: ".", options: { color: PLUM } }], { x, y: 4.32, w, h: 0.7, fontSize: TS.title });
      t(s, desc, { x, y: 5.1, w, h: 1.2, fontSize: TS.body, color: "FFFFFF", lineSpacingMultiple: 1.3 });
    });
    still();
    s.addNotes("On Mahalaya, Kumartuli's artisans paint the goddess's eyes, a ritual called chokkhu daan, the gift of sight. Saakshi gives every woman that gift: a witness that never looks away. It does three things. Capture, so nothing is lost. Prove, so no one can claim it was edited. Act, so she is never left wondering what to do next.");
  }

  // ================= 7. INVISIBLE UNTIL SHE NEEDS IT =================
  {
    const s = slide("Saakshi Light", "Solution", 2, "Invisible until she needs it");
    const phones = [
      ["phone-calc.png", "01  ·  Disguise", "A working calculator. Her PIN and = opens Saakshi."],
      ["phone-sos.png", "02  ·  Silent SOS", "Three taps. The screen goes dark."],
      ["phone-guardian.png", "03  ·  Not alone", "Payel gets an alert and Ria's live location for an hour."],
      ["phone-proof.png", "04  ·  Proof", "One QR code any officer can scan to verify it."],
    ];
    const dh = 3.95, dw = deviceWidth("phone", dh);
    for (let i = 0; i < phones.length; i++) {
      const [file, k, v] = phones[i];
      anim(i + 1, i === 0 ? 0.3 : 0.35, 0.6);
      const x0 = colX(3 * i);
      placeDevice(s, asset("renders/" + file), "phone", x0 + (span(3) - dw) / 2, 1.85, dh, k);
      label(s, k, x0, 6.0, span(3), RANI, { align: "center" });
      t(s, v, { x: x0 + 0.1, y: 6.28, w: span(3) - 0.2, h: 0.5, fontSize: TS.small, color: MUTED, align: "center", lineSpacingMultiple: 1.15 });
    }
    still();
    s.addNotes("Four screens tell the story. To anyone looking at her phone, Saakshi is just a calculator. Three taps start a silent SOS: the screen goes dark and simply tells her, in Bengali, that she is not alone. Her friend gets her live location for one hour. The next day, one QR code is all an officer needs to verify her evidence. These are the real screens we will build.");
  }

  // ================= 8. ASHTAMI NIGHT, AGAIN =================
  {
    const s = slide("Saakshi Light", "Solution", 2, "Ashtami night, again");
    const w5 = (CW - 4 * GUT) / 5;
    hline(s, M, 2.72, CW, HAIR);
    [["10:41 pm", "Trigger", "Three taps on her calculator. The screen goes dark."],
     ["10:41 pm", "Capture and seal", "Recording starts. The first piece is sealed on Polygon."],
     ["10:42 pm", "Not alone", "Payel sees Ria's live location. They find each other."],
     ["11:30 pm", "Understand", "Saakshi explains her rights in Bengali and drafts a Zero FIR."],
     ["Next day", "Believed", "The officer scans her QR code. Untampered, sealed at 10:41 pm."]].forEach(([time, tag, text], i) => {
      anim(i + 1, i === 0 ? 0.3 : 0.35, 0.5);
      const x = M + i * (w5 + GUT), col = i === 4 ? GREEN : RANI;
      serif(s, time, { x, y: 1.95, w: w5, h: 0.6, fontSize: TS.sub, color: INK });
      dot(s, x, 2.64, 0.16, col);
      label(s, tag, x, 2.92, w5, col);
      t(s, text, { x, y: 3.25, w: w5 - 0.1, h: 1.5, fontSize: TS.body, color: INK });
    });
    anim(6, 0.4, 0.8);
    rect(s, 0, 5.1, W, 2.4, PLUM);
    t(s, "তুমি একা নও", { x: M, y: 5.5, w: span(5), h: 0.75, fontFace: BANGLA, fontSize: TS.title, color: "FFFFFF", lang: "bn-IN", lineSpacingMultiple: 1.0 });
    t(s, "You are not alone. The first thing her screen says.", { x: M, y: 6.35, w: span(5), h: 0.3, fontSize: TS.small, color: SOFT_D });
    serif(s, "\"Where is your proof?\"", { x: colX(6), y: 5.42, w: span(6), h: 0.5, fontSize: TS.sub, italic: true, color: "A88B9C" });
    serif(s, "\"Here it is.\"", { x: colX(6), y: 5.92, w: span(6), h: 0.9, fontSize: TS.display, italic: true, color: RANI_L });
    still();
    s.addNotes("Same night, same crowd, same man. The difference is that Ria now has a witness. Within seconds her first piece of evidence is off the phone and sealed. Her friend knows where she is. That night she understands her rights in her own language, and the next morning the question that silenced her has an answer.");
  }

  // ================= 9. TEN ARMS =================
  {
    const s = slide("Saakshi Blush", "Solution", 2, "The ten arms of Saakshi");
    t(s, [{ text: "As the SHAKTI brief puts it: ", options: { italic: true } }, { text: "\"Devi Durga wields ten arms, each channelling a Shakti.\"", options: { italic: true, color: RANI } }], {
      x: M, y: 1.5, w: CW, h: 0.4, fontFace: SERIF, fontSize: TS.lead, color: MUTED, lineSpacingMultiple: 1.0,
    });
    [["Duress PIN", "Looks like cancel, silently escalates"],
     ["Disguise mode", "Hides behind a working calculator"],
     ["Chunked streaming", "Evidence leaves her phone every five seconds"],
     ["Tamper-proof seal", "SHA-256 fingerprint, timestamped on Polygon"],
     ["Gasless by design", "No wallet, no crypto, no fees for her"],
     ["Public Verify page", "Anyone can check a file in one click"],
     ["AI legal agent", "Explains the law kindly, and cites it"],
     ["Her language", "Speak or type in Bengali, Hindi or English"],
     ["Consent first", "Location sharing is time-limited and visible"],
     ["Works offline", "Queues evidence and syncs when back online"]].forEach(([name, desc], i) => {
      const c = Math.floor(i / 5), r = i % 5, x = colX(6 * c), w = span(6), y = 2.15 + r * 0.88;
      hline(s, x, y, w, BLUSH2);
      serif(s, String(i + 1).padStart(2, "0"), { x, y: y + 0.13, w: 0.7, h: 0.45, fontSize: TS.quote, color: RANI });
      t(s, name, { x: x + 0.8, y: y + 0.13, w: w - 0.8, h: 0.3, fontFace: SANS_M, fontSize: TS.body, color: INK, lineSpacingMultiple: 1.0 });
      t(s, desc, { x: x + 0.8, y: y + 0.45, w: w - 0.8, h: 0.3, fontSize: TS.small, color: MUTED, lineSpacingMultiple: 1.0 });
      if (r === 4) hline(s, x, y + 0.88, w, BLUSH2);
    });
    s.addNotes("The organisers describe Durga's ten arms; these are Saakshi's. The first two protect her from the person hurting her. The middle ones protect the evidence. The last ones protect her choices and her dignity. Every one of them is in the build, not just on a roadmap.");
  }

  // ================= 10. HOW A RECORDING BECOMES PROOF =================
  pres.addSection({ title: "Technology" });
  {
    const s = slide("Saakshi Light", "Technology", 3, "How a recording becomes proof");
    const xs = [0, 3, 6, 9].map(colX);
    hline(s, M, 2.45, xs[3] - M + 0.08, HAIR);
    ["Ciphertext only", "Fingerprints only", "Public proof"].forEach((seg, i) => {
      const mid = (xs[i] + xs[i + 1]) / 2 + 0.08;
      label(s, seg, mid - 1.2, 2.08, 2.4, RANI, { align: "center" });
    });
    [["On her phone", "Fingerprinted first", ["In 5-second pieces", "SHA-256, then AES-GCM", "Queued when offline"]],
     ["Saakshi cloud", "Stored, encrypted", ["Row-level security", "Ciphertext only", "Fingerprints batched"]],
     ["Polygon", "Sealed in public", ["EvidenceAnchor contract", "One root, many files", "No personal data, ever"]],
     ["Anyone, anywhere", "Verified by anyone", ["Verify page and QR code", "Section 63 certificate", "File never uploaded"]]].forEach(([lab, title, items], i) => {
      anim(i + 1, 0.2, 0.5);
      const x = xs[i];
      dot(s, x, 2.37, 0.16, i === 3 ? GREEN : RANI);
      label(s, lab, x, 2.7, span(3), MUTED);
      serif(s, title, { x, y: 2.98, w: span(3) - 0.05, h: 0.5, fontSize: TS.quote, color: INK });
      t(s, items.map((p, j) => ({ text: p, options: { breakLine: j < items.length - 1 } })), {
        x, y: 3.6, w: span(3) - 0.1, h: 1.2, fontSize: TS.small, color: INK, paraSpaceAfter: 8, lineSpacingMultiple: 1.15,
      });
    });
    anim(5, 0.4, 0.6);
    hline(s, M, 5.15, CW, HAIR);
    label(s, "Alongside: the AI agent", M, 5.32, span(4), RANI);
    t(s, "Claude API with tool-calling, answering only from a curated corpus of Indian law, always with citations. Bengali and Hindi voice through the Web Speech API. It drafts the complaint and the Section 63 certificate for her to review.", {
      x: M, y: 5.62, w: CW, h: 0.75, fontSize: TS.body, color: INK, lineSpacingMultiple: 1.25,
    });
    still();
    t(s, "NEXT.JS · TYPESCRIPT · TAILWIND · SUPABASE · SOLIDITY · HARDHAT · ETHERS.JS · POLYGON AMOY · CLAUDE API · WEB PUSH · VERCEL", {
      x: M, y: 6.6, w: CW, h: 0.25, fontFace: SANS_M, fontSize: TS.label, charSpacing: 1.2, color: MUTED,
    });
    s.addNotes("Privacy is the architecture, not a feature. Files are encrypted on her phone before upload, so the cloud only ever holds scrambled data. Only fingerprints reach the blockchain, and a relayer pays network fees so she never touches crypto. Anyone can verify a file in a browser without uploading it.");
  }

  // ================= 11. ONLY A FINGERPRINT GOES ON-CHAIN =================
  {
    const s = slide("Saakshi Light", "Technology", 3, "Only a fingerprint goes on-chain");
    const lw = span(5);
    label(s, "On-chain", M, 1.95, lw, GREEN);
    serif(s, "One salted fingerprint per batch, and the moment it was sealed.", { x: M, y: 2.22, w: lw, h: 0.85, fontSize: TS.quote, color: INK });
    hline(s, M, 3.2, lw, HAIR);
    label(s, "Never on-chain", M, 3.35, lw, RANI);
    serif(s, "Her video, voice, location and name.", { x: M, y: 3.62, w: lw, h: 0.85, fontSize: TS.quote, color: INK });
    hline(s, M, 4.6, lw, HAIR);
    [["Merkle batching. ", "Thousands of files per transaction, a fraction of a rupee each."],
     ["Gasless. ", "Saakshi pays the network fee. She never needs a wallet."],
     ["Erasure built in. ", "Delete the encrypted file and its key, and nothing personal remains."]].forEach(([k, v], i) => {
      t(s, [{ text: k, options: { fontFace: SANS_M, color: INK } }, { text: v, options: { color: MUTED } }], {
        x: M, y: 4.75 + i * 0.62, w: lw, h: 0.55, fontSize: TS.small, lineSpacingMultiple: 1.15,
      });
    });
    anim(1, 0.4, 0.8);
    const bw = span(7), bh = bw / 2; // the browser mock-up is 1200 x 600
    placeDevice(s, asset("renders/desktop-verify.png"), "browser", colX(5), 2.05, bh, "The Saakshi Verify page: one untampered file and one edited file");
    still();
    s.addNotes("Putting Ria's video on a blockchain would be slow, expensive and a privacy disaster, because a blockchain never forgets. Saakshi seals only a fingerprint. On the Verify page, the file is fingerprinted in the browser and never uploaded. Change a single byte of her video and it shows as edited.");
  }

  // ================= 12. THE AI AGENT =================
  {
    const s = slide("Saakshi Blush", "Technology", 3, "It answers like an elder sister would");
    anim(1, 0.3, 0.6);
    placeDevice(s, asset("renders/phone-agent.png"), "phone", M, 1.88, 4.85, "Saakshi replying to Ria in Bengali");
    const rx = colX(4), rw = span(8);
    anim(2, 0.5, 0.7);
    label(s, "What she hears, in English", rx, 1.95, rw, RANI);
    serif(s, "\"I'm so sorry, Ria. It's not your fault. What you describe is sexual harassment and stalking (BNS §74, §78). A Zero FIR can be filed at any police station. Shall I draft it?\"", {
      x: rx, y: 2.22, w: rw, h: 1.45, fontSize: TS.quote, italic: true, color: INK, lineSpacingMultiple: 1.1,
    });
    still();
    [["Triage", "Hears her voice or text in Bengali, Hindi or English."],
     ["Legal", "Answers only from curated Indian law, always cited."],
     ["Drafting", "Writes the complaint, Zero FIR request and certificate."],
     ["Routing", "Points her to 112, 181, the NCW or free legal aid."]].forEach(([name, desc], i) => {
      const x = i % 2 === 0 ? colX(4) : colX(8), y = 3.95 + Math.floor(i / 2) * 1.0, w = span(4);
      hline(s, x, y, w, BLUSH2);
      serif(s, String(i + 1).padStart(2, "0"), { x, y: y + 0.13, w: 0.6, h: 0.45, fontSize: TS.quote, color: RANI });
      t(s, name, { x: x + 0.62, y: y + 0.13, w: w - 0.62, h: 0.3, fontFace: SANS_M, fontSize: TS.body, color: INK, lineSpacingMultiple: 1.0 });
      t(s, desc, { x: x + 0.62, y: y + 0.45, w: w - 0.62, h: 0.5, fontSize: TS.small, color: MUTED, lineSpacingMultiple: 1.15 });
    });
    hline(s, colX(4), 5.95, rw, BLUSH2);
    label(s, "Never files without consent  ·  Every claim cited  ·  Legal aid: NALSA 15100", rx, 6.12, rw, RANI, { charSpacing: 1.5 });
    s.addNotes("When Ria speaks to Saakshi at 11:30 at night, she needs kindness first and law second. The reply on screen is in Bengali; its English meaning is on the right. Four narrow agents work behind one gentle voice, and the legal agent only answers from verified legal text, refusing rather than guessing. Stretch goal: a Banglish and Hinglish triage model trained with Adaption, the hackathon's technology partner.");
  }

  // ================= 13. THE QUESTIONS SHE WOULD ASK =================
  {
    const s = slide("Saakshi Light", "Technology", 3, "The questions she would ask");
    [["\"What if he snatches my phone?\"", "The evidence has already left it, five seconds at a time."],
     ["\"What if he forces me to cancel?\"", "The duress PIN looks like a cancel and silently escalates."],
     ["\"What if he goes through my phone?\"", "He sees a calculator. No notifications, instant quick-exit."],
     ["\"What if they say my video is edited?\"", "The blockchain seal from capture time proves it isn't."],
     ["\"What if I press it by mistake?\"", "Ten seconds to undo. Calling 112 is always her choice."],
     ["\"What if I don't want the police?\"", "Evidence stays sealed for later. NGOs and counsellors too."],
     ["\"What if the app gets the law wrong?\"", "It answers only from cited legal text, and she reviews first."],
     ["\"What if someone uses this to track me?\"", "Sharing is consent-based, time-limited and always visible."],
     ["\"What if Saakshi itself is hacked?\"", "Files are encrypted on her phone before they leave it."],
     ["\"What if I'm under 18?\"", "Routes to POCSO-specific help and Childline 1098."]].forEach(([q, a], i) => {
      const c = i % 2, r = Math.floor(i / 2), x = colX(6 * c), w = span(6), y = 1.95 + r * 0.92;
      hline(s, x, y, w, HAIR);
      serif(s, q, { x, y: y + 0.11, w, h: 0.4, fontSize: TS.lead, italic: true, color: INK });
      t(s, a, { x, y: y + 0.52, w, h: 0.3, fontSize: TS.small, color: MUTED, lineSpacingMultiple: 1.0 });
      if (r === 4) hline(s, x, y + 0.92, w, HAIR);
    });
    s.addNotes("These are the edge cases, written as her questions, because that is how they feel to the person living them. The one judges rarely see: a safety app with location sharing can itself become a stalking tool, so sharing in Saakshi is always consensual, time-limited and visible.");
  }

  // ================= 14. FOUR DAYS =================
  pres.addSection({ title: "Implementation" });
  {
    const s = slide("Saakshi Light", "Implementation", 4, "A working product in four days");
    [["21", "Calculator disguise, duress PIN, encrypted 5-second capture, live on Vercel"],
     ["22", "Polygon Amoy contract, Merkle batching, Verify page, QR, guardian alerts"],
     ["23", "AI agent with a cited legal corpus, complaint and Section 63 PDF, journal, vault"],
     ["24", "Offline queue, tests on real Android phones, demo video recorded"]].forEach(([day, task], i) => {
      const x = colX(3 * i);
      serif(s, day, { x, y: 1.72, w: span(3), h: 1.25, fontSize: TS.big, color: i === 0 ? RANI : INK });
      label(s, "October", x, 3.0, span(3), i === 0 ? RANI : MUTED);
      t(s, task, { x, y: 3.32, w: span(3) - 0.3, h: 1.3, fontSize: TS.body, color: INK });
    });
    hline(s, M, 4.75, CW, HAIR);
    label(s, "Project ownership", M, 4.95, span(6), RANI);
    t(s, "Written from scratch during SHAKTI. The public GitHub history shows every step.", {
      x: M, y: 5.25, w: span(6) - 0.3, h: 0.8, fontSize: TS.body, color: INK, lineSpacingMultiple: 1.3,
    });
    label(s, "After the hackathon", colX(6), 4.95, span(6), RANI);
    const road = ["Co-design with women students and a Kolkata NGO", "Native Android: power-button trigger, SMS fallback", "Integration with ERSS 112 and e-FIR portals"];
    t(s, road.map((p, j) => ({ text: p, options: { bullet: { type: "number" }, breakLine: j < road.length - 1 } })), {
      x: colX(6), y: 5.25, w: span(6), h: 1.4, fontSize: TS.body, color: INK, paraSpaceAfter: 6,
    });
    s.addNotes("A realistic build plan where every day ends with something deployable, so the Round 2 demo shows Ria's night working end to end on real phones. After the hackathon, the first step is to design it with the women who will use it, not just for them.");
  }

  // ================= 15. IMPACT =================
  pres.addSection({ title: "Impact" });
  {
    const s = slide("Saakshi Blush", "Impact", 4, "From \"Where is your proof?\" to \"Here it is\"");
    still();
    vline(s, colX(4) - GUT / 2, 1.98, 2.0, BLUSH2);
    vline(s, colX(8) - GUT / 2, 1.98, 2.0, BLUSH2);
    [["For Ria", "Walks into any police station with sealed evidence and a ready Zero FIR, and is taken seriously."],
     ["For Mitali", "Builds a dated record of abuse he can't find or erase: the pattern protection-order cases rest on."],
     ["For Ananya", "Sends her takedown request the same night, with proof of exactly when she acted."]].forEach(([name, desc], i) => {
      anim(i + 1, i === 0 ? 0.2 : 0.3, 0.6);
      const x = colX(4 * i), w = span(4) - 0.15;
      serif(s, name, { x, y: 1.9, w, h: 0.6, fontSize: TS.sub, color: RANI });
      t(s, desc, { x, y: 2.6, w, h: 1.3, fontSize: TS.body, color: INK, lineSpacingMultiple: 1.3 });
    });
    still();
    hline(s, M, 4.25, CW, BLUSH2);
    label(s, "What a pilot will measure", M, 4.45, span(6), RANI);
    const mets = ["Incidents with sealed, verifiable evidence", "Time from incident to a filed complaint", "Integrity checks passed at verification", "Women who felt able to act (follow-up survey)"];
    t(s, mets.map((p, j) => ({ text: p, options: { bullet: { indent: 14 }, breakLine: j < mets.length - 1 } })), {
      x: M, y: 4.78, w: span(6), h: 1.65, fontSize: TS.body, color: INK, paraSpaceAfter: 4,
    });
    label(s, "Sustainable by design", colX(6), 4.45, span(6), RANI);
    const model = ["Free forever for every woman who needs it", "Paid POSH dashboards for colleges and companies", "Integrations for state police and NGOs"];
    t(s, model.map((p, j) => ({ text: p, options: { bullet: { indent: 14 }, breakLine: j < model.length - 1 } })), {
      x: colX(6), y: 4.78, w: span(6), h: 1.25, fontSize: TS.body, color: INK, paraSpaceAfter: 4,
    });
    label(s, "UN SDG 5 · Gender equality", colX(6), 6.12, span(6), MUTED, { charSpacing: 1.2 });
    label(s, "UN SDG 16 · Peace, justice and strong institutions", colX(6), 6.38, span(6), MUTED, { charSpacing: 1.2 });
    s.addNotes("Impact, measured in people: Ria is believed, Mitali is protected, Ananya acts before the damage spreads. A pilot will measure these outcomes honestly. Women never pay; institutions that already have legal duties under the POSH Act fund it.");
  }

  // ================= 16. CLOSING (full rani) =================
  pres.addSection({ title: "Closing" });
  {
    const s = slide("Saakshi Pink Full", "Closing");
    await imgW(s, asset("logo/seal-plum.png"), 7.85, 1.35, 4.8, "The Saakshi seal");
    anim(1, 0.4, 0.8);
    serif(s, "For five days, we worship Shakti in every pandal.", { x: M, y: 1.3, w: span(7), h: 0.5, fontSize: TS.quote, color: ON_PINK });
    anim(2, 0.7, 0.9);
    serif(s, [{ text: "Saakshi is for", options: { breakLine: true } }, { text: "the other 360." }], {
      x: M, y: 1.95, w: span(7), h: 2.32, fontSize: TS.big, color: "FFFFFF", lineSpacingMultiple: 0.95,
    });
    anim(3, 0.5, 0.7);
    serif(s, "Every woman deserves a witness.", { x: M, y: 4.38, w: span(7), h: 0.5, fontSize: TS.quote, italic: true, color: PLUM });
    anim(4, 0.4, 0.6);
    t(s, [
      { text: "ধন্যবাদ", options: { fontFace: BANGLA, fontSize: TS.quote, lang: "bn-IN" } },
      { text: "     Thank you", options: { fontFace: SANS, fontSize: TS.body } },
    ], { x: M, y: 5.12, w: span(6), h: 0.5, color: "FFFFFF", lineSpacingMultiple: 1.0, valign: "middle" });
    still();
    hline(s, M, 6.1, span(7), PINK_LINE);
    [["Project", "Saakshi", 0], ["Team", "Appvengers", 3], ["Track", "02 · Dharma & Trust", 5]].forEach(([k, v, c]) => {
      label(s, k, colX(c), 6.3, span(3), "FFFFFF");
      t(s, v, { x: colX(c), y: 6.56, w: span(3), h: 0.3, fontSize: TS.small, color: "FFFFFF", lineSpacingMultiple: 1.0 });
    });
    s.addNotes("For five days a year we celebrate Shakti in every pandal. Women live the other three hundred and sixty. Saakshi is built for those days, so that every woman, everywhere, has a witness. Thank you.");
  }

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("wrote " + OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
