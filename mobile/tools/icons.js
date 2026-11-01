// Launcher icons and splash for the Android shell, from the PWA's calculator icon. The disguise holds on
// the home screen and while the app opens: a calculator icon, then plain calculator black.
// Usage (from mobile/): NODE_PATH=<dir with sharp> node tools/icons.js
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const res = path.join(__dirname, "..", "android", "app", "src", "main", "res");
const icons = path.join(__dirname, "..", "..", "web", "public", "icons");
const maskable = path.join(icons, "calculator-maskable-512.png");
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const CALC_BLACK = { r: 0x0f, g: 0x0d, b: 0x0f, alpha: 1 };

(async () => {
  // The maskable icon's background colour, so the adaptive icon's background matches its foreground.
  const { data } = await sharp(maskable).extract({ left: 4, top: 4, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
  const bg = `#${[...data.subarray(0, 3)].map((b) => b.toString(16).padStart(2, "0")).join("")}`.toUpperCase();

  for (const [d, k] of Object.entries(DENSITIES)) {
    const dir = path.join(res, `mipmap-${d}`);
    fs.mkdirSync(dir, { recursive: true });
    // Adaptive foreground: 108dp, full bleed; the glyphs sit inside the 66dp safe zone already.
    await sharp(maskable).resize(Math.round(108 * k)).png().toFile(path.join(dir, "ic_launcher_foreground.png"));
    // Legacy icons for launchers without adaptive icons: 48dp, square and round.
    const size = Math.round(48 * k);
    const square = await sharp(maskable).resize(size).png().toBuffer();
    const radius = Math.round(size * 0.22);
    const rounded = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}"/></svg>`);
    const circle = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`);
    await sharp(square).composite([{ input: rounded, blend: "dest-in" }]).png().toFile(path.join(dir, "ic_launcher.png"));
    await sharp(square).composite([{ input: circle, blend: "dest-in" }]).png().toFile(path.join(dir, "ic_launcher_round.png"));
  }
  fs.writeFileSync(
    path.join(res, "values", "ic_launcher_background.xml"),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${bg}</color>\n</resources>\n`,
  );

  // Every splash image becomes plain calculator black at its own size.
  for (const dir of fs.readdirSync(res).filter((d) => d.startsWith("drawable"))) {
    const file = path.join(res, dir, "splash.png");
    if (!fs.existsSync(file)) continue;
    const { width, height } = await sharp(file).metadata();
    await sharp({ create: { width, height, channels: 4, background: CALC_BLACK } }).png().toFile(file + ".tmp");
    fs.renameSync(file + ".tmp", file);
  }
  console.log("icons and splash written; adaptive background", bg);
})();
