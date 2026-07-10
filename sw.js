/* ДомФин — service worker (PWA).
   HTML: stale-while-revalidate (мгновенно из кэша, обновление в фоне) — быстрый повторный запуск.
   Статика (иконки/манифест): cache-first. Кросс-домен (API) не трогаем. */
const VER = "domfin-v3";
const SHELL = ["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png","./icon-512-maskable.png","./apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VER).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VER).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const isHTML = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
  if (isHTML) {
    // stale-while-revalidate: сразу кэш (без белого экрана), в фоне обновляем
    e.respondWith(
      caches.match("./index.html").then((cached) => {
        const network = fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(VER).then((c) => c.put("./index.html", copy)).catch(() => {});
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }
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
