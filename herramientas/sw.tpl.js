// LIMPFINC service worker — la app entera en caché (también las librerías); teselas de mapa: red primero
// Generado por herramientas/construir.py: no editar sw.js a mano.
const VERSION = '__VERSION__';
const CACHE = 'limpfinc-' + VERSION;
const TILES = 'limpfinc-teselas';
const SHELL = [
  __SHELL__
];
let nPut = 0;
async function recortar(ca) { if (++nPut % 50) return; const ks = await ca.keys(); for (let i = 0; i < ks.length - 3000; i++) await ca.delete(ks[i]); }
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })));
    // paso desde las versiones antiguas (≤ 2.8.0, sin aviso de actualización): se activa sola una vez
    const ks = await caches.keys();
    if (ks.some(k => /^limpfinc-\d+$/.test(k))) self.skipWaiting();
  })());
});
self.addEventListener('message', e => {
  if (!e.data) return;
  if (e.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data.type === 'VERSION' && e.ports && e.ports[0]) e.ports[0].postMessage(VERSION);
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== TILES).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== 'GET') return;
  if (/supabase\.co|open-meteo\.com|sigpac-hubcloud\.es|nominatim\.openstreetmap\.org|project-osrm\.org|photon\.komoot\.io/.test(u.hostname)) return; // datos: siempre red
  if (/openstreetmap\.org|opentopomap\.org/.test(u.hostname)) {
    // teselas: red primero; las vistas o descargadas se guardan (máx. ~3000) para ver el mapa sin cobertura
    e.respondWith(fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(TILES).then(ca => ca.put(req, c).then(() => recortar(ca))); } return r; })
      .catch(() => caches.open(TILES).then(ca => ca.match(req)).then(r => r || Response.error())));
    return;
  }
  if (u.origin !== location.origin) return;
  // app: siempre la versión en caché (coherente); las versiones nuevas llegan con un service worker nuevo
  if (req.mode === 'navigate') { e.respondWith(caches.open(CACHE).then(c => c.match('./index.html')).then(r => r || fetch(req))); return; }
  e.respondWith(caches.open(CACHE).then(c => c.match(req)).then(r => r || fetch(req).then(res => { if (res.ok && /\/(lib|src|css)\//.test(u.pathname)) { const cp = res.clone(); caches.open(CACHE).then(ca => ca.put(req, cp)); } return res; })));
});
