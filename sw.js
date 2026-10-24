// LIMPFINC service worker — app shell en caché; teselas siempre de red
const CACHE = 'limpfinc-261';
const TILES = 'limpfinc-teselas';
let nPut = 0;
async function recortar(ca) { if (++nPut % 50) return; const ks = await ca.keys(); for (let i = 0; i < ks.length - 3000; i++) await ca.delete(ks[i]); }
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://cdn.jsdelivr.net/npm/clipper-lib@6.4.2/clipper.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.58.0/dist/umd/supabase.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== TILES).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (/supabase\.co|open-meteo\.com|sigpac-hubcloud\.es|nominatim\.openstreetmap\.org|project-osrm\.org|photon\.komoot\.io/.test(u.hostname)) return; // datos: siempre red
  if (/openstreetmap\.org|opentopomap\.org/.test(u.hostname)) {
    // teselas: red primero; las ya vistas se guardan (máx. ~3000) para ver el mapa sin cobertura
    e.respondWith(fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(TILES).then(ca => ca.put(e.request, c).then(() => recortar(ca))); } return r; })
      .catch(() => caches.open(TILES).then(ca => ca.match(e.request)).then(r => r || Response.error())));
    return;
  }
  if (u.origin === location.origin) {
    // red primero (para recibir actualizaciones), caché si no hay red
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
  } else {
    // librerías de CDN (Leaflet, Clipper, Supabase, three.js): caché primero; lo que se descarga se guarda para usarlo sin cobertura
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { if (res.ok && /cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/.test(u.hostname)) { const c = res.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); } return res; })));
  }
});
