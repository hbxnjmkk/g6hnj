/* 7Я ФИН — service worker (PWA, пункт 13).
   HTML: network-first (свежая версия при сети, кэш офлайн).
   Статика (иконки/манифест): cache-first.
   Кросс-домен (API) не трогаем. */
const VER = "7yafin-v1";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VER).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VER).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;                       // не кэшируем POST/PUT
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // API и прочее — мимо

  const isHTML = req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    // network-first: свежий index.html при сети, кэш — офлайн
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VER).then((c) => c.put("./index.html", copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // статика: cache-first
  e.respondWith(
    caches.match(req).then((cached) =>
      cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VER).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => cached)
    )
  );
});
