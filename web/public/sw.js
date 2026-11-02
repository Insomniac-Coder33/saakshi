// Keeps the calculator opening without a network. Pages are network-first with a cached fallback;
// Next's hashed build assets are cache-first. Evidence never passes through here: pieces go to
// IndexedDB and upload from the page.
const CACHE = "calc-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

// The page that installed this worker loaded its scripts before the worker could see them, so fetch
// and keep them now: the calculator (and an SOS) must open offline from the very next launch, not the
// one after. Fonts come from the stylesheets, so those are read for their url()s too.
async function precache() {
  const cache = await caches.open(CACHE);
  const page = await fetch("/", { cache: "no-store" }).catch(() => null);
  if (!page?.ok) return;
  const html = await page.clone().text();
  await cache.put("/", page);
  const assets = new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) ?? []);
  for (const css of [...assets].filter((a) => a.endsWith(".css"))) {
    const text = await fetch(css).then((r) => (r.ok ? r.text() : ""), () => "");
    for (const m of text.matchAll(/url\((\/_next\/static\/[^)"']+)\)/g)) assets.add(m[1]);
  }
  await Promise.all([...assets].map((a) => cache.add(a).catch(() => {})));
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("/"))),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || /\.(?:png|svg|ttf|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
            return res;
          }),
      ),
    );
  }
});
