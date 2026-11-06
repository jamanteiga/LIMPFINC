// LIMPFINC service worker — la app entera en caché (también las librerías); teselas de mapa: red primero
// Generado por herramientas/construir.py: no editar sw.js a mano.
const VERSION = '2.9.2';
const CACHE = 'limpfinc-' + VERSION;
const TILES = 'limpfinc-teselas';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './css/limpfinc.css?v=2.9.2',
  './trabajador-plan.js?v=2.9.2',
  './lib/leaflet/leaflet.css',
  './lib/leaflet/leaflet.js',
  './lib/clipper.js',
  './lib/supabase.js',
  './lib/jspdf.umd.min.js',
  './lib/three.min.js',
  './lib/xlsx.full.min.js',
  './lib/leaflet/images/layers-2x.png',
  './lib/leaflet/images/layers.png',
  './lib/leaflet/images/marker-icon-2x.png',
  './lib/leaflet/images/marker-icon.png',
  './lib/leaflet/images/marker-shadow.png',
  './src/00-base.js?v=2.9.2',
  './src/00b-registro.js?v=2.9.2',
  './src/01-geo.js?v=2.9.2',
  './src/02-nucleo.js?v=2.9.2',
  './src/03-lista.js?v=2.9.2',
  './src/04-ajustes.js?v=2.9.2',
  './src/05-mapa.js?v=2.9.2',
  './src/06-medicion.js?v=2.9.2',
  './src/07-dibujo-edicion.js?v=2.9.2',
  './src/08-exclusiones-datos.js?v=2.9.2',
  './src/09-planificador.js?v=2.9.2',
  './src/10-plan-ui.js?v=2.9.2',
  './src/11-capas-exportar.js?v=2.9.2',
  './src/12-trabajo.js?v=2.9.2',
  './src/13-monte.js?v=2.9.2',
  './src/14-catalogo.js?v=2.9.2',
  './src/15-sincronizacion.js?v=2.9.2',
  './src/16-comodidad.js?v=2.9.2',
  './src/17-importar-sigpac.js?v=2.9.2',
  './src/18-mapa3d.js?v=2.9.2',
  './src/19-presupuesto-jornada.js?v=2.9.2',
  './src/20-planes-rutas-peligros.js?v=2.9.2',
  './src/21-repaso-informe.js?v=2.9.2',
  './src/22-aprendizaje.js?v=2.9.2',
  './src/23-velocidad-hoja.js?v=2.9.2',
  './src/24-seguridad.js?v=2.9.2',
  './src/24m-mantenimiento.js?v=2.9.2',
  './src/25-arranque.js?v=2.9.2'
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
