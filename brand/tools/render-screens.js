// Renders the Saakshi UI kit (brand/screens.html) to transparent PNGs with headless Edge.
// Usage: node render-screens.js <brandDir>
const http = require("http");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");
const sharp = require("sharp");

const BRAND = process.argv[2];
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const TYPES = { ".html": "text/html", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".ttf": "font/ttf" };

function serve(root) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const file = path.join(root, decodeURIComponent(req.url.split("?")[0]));
      if (!file.startsWith(path.resolve(root)) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

// Fade alpha to zero across the outer band so clipped shadow tails never show as a faint box.
async function feather(file, band) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.min(x, y, w - 1 - x, h - 1 - y);
      if (d >= band) continue;
      const i = (y * w + x) * c + 3;
      data[i] = Math.round(data[i] * (d / band) * (d / band));
    }
  }
  await sharp(data, { raw: { width: w, height: h, channels: c } }).png().toFile(file + ".tmp");
  fs.renameSync(file + ".tmp", file);
}

async function main() {
  const out = path.join(BRAND, "renders");
  fs.mkdirSync(out, { recursive: true });
  const server = await serve(path.resolve(BRAND));
  const base = `http://127.0.0.1:${server.address().port}/screens.html`;
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ["--force-color-profile=srgb"] });
  try {
    const page = await browser.newPage();
    page.on("requestfailed", (r) => console.warn("failed:", r.url()));

    await page.setViewport({ width: 2800, height: 1200, deviceScaleFactor: 3 });
    await page.goto(base + "?render", { waitUntil: "networkidle0" });
    await page.evaluate(() => document.fonts.ready);
    const fonts = await page.evaluate(() => [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family + " " + f.weight + " " + f.style));
    console.log("fonts loaded:", fonts.join(", "));
    for (const id of ["calc", "sos", "guardian", "proof", "agent"]) {
      const el = await page.$("#" + id);
      await el.screenshot({ path: path.join(out, `phone-${id}.png`), omitBackground: true });
      await feather(path.join(out, `phone-${id}.png`), 150);
      console.log("rendered phone-" + id);
    }
    await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 2 });
    await page.goto(base + "?render", { waitUntil: "networkidle0" });
    await page.evaluate(() => document.fonts.ready);
    await (await page.$("#verify")).screenshot({ path: path.join(out, "desktop-verify.png"), omitBackground: true });
    await feather(path.join(out, "desktop-verify.png"), 140);
    console.log("rendered desktop-verify");

    // A full preview of the kit page for humans.
    await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });
    await page.goto(base, { waitUntil: "networkidle0" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(out, "ui-kit-overview.png"), fullPage: true });
    console.log("rendered ui-kit-overview");
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
