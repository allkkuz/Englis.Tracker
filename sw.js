// Трекер английского — офлайн-кэш. При каждом обновлении файлов меняйте VERSION.
const VERSION = "eng-2";
const ASSETS = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    // свежая версия, если есть сеть (с проверкой на сервере); иначе — из кэша
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3000);
        const res = await fetch(req, { signal: ctrl.signal, cache: "no-cache" });
        clearTimeout(timer);
        if (res.ok) await cache.put("index.html", res.clone());
        return res;
      } catch (err) {
        return (await cache.match("index.html")) || (await cache.match("./")) || Response.error();
      }
    })());
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  })));
});
