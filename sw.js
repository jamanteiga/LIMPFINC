/* Service worker: con conexión carga siempre la última versión publicada; sin conexión usa la copia guardada.
   Al publicar cambios (por ejemplo, nuevas preguntas) sube el número de VERSION. */
var VERSION = "celador-v9";
var ARCHIVOS = ["./", "index.html", "app.js", "preguntas-1.js", "preguntas-2.js", "preguntas-3.js", "preguntas-4.js", "preguntas-5.js", "preguntas-6.js", "preguntas-7.js", "preguntas-8.js", "preguntas-9.js", "preguntas-10.js", "preguntas-11.js", "preguntas-12.js", "preguntas-13.js", "preguntas-14.js", "preguntas-15.js", "preguntas-16.js", "preguntas-17.js", "preguntas-18.js", "preguntas-19.js", "preguntas-20.js", "preguntas-21.js", "preguntas-22.js", "preguntas-23.js", "preguntas-24.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return c.addAll(ARCHIVOS.map(function (u) { return new Request(u, { cache: "reload" }); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(function (c) {
    // Primero la red (sin caché HTTP); si no hay conexión, la copia guardada.
    return fetch(e.request, { cache: "no-store" }).then(function (r) {
      if (r && r.ok) c.put(e.request, r.clone());
      return r;
    }).catch(function () {
      return c.match(e.request, { ignoreSearch: true }).then(function (g) { return g || Response.error(); });
    });
  }));
});
