'use strict';
/* =========================================================
   MAPA
   ========================================================= */
let map, lyr = {}, posMarker, posCircle, followPos = false;
function initMap() {
  if (map) return;
  map = L.map('map', { zoomControl: false, attributionControl: true, maxZoom: 21, preferCanvas: true, zoomSnap: 0.25, zoomDelta: 0.5 }).setView([43.22, -8.29], 15);
  const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxNativeZoom: 19, maxZoom: 21, crossOrigin: true, attribution: '© OpenStreetMap' });
  // Solo fuentes libres: OSM (ODbL) y OpenTopoMap (CC BY-SA)
  const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { subdomains: 'abc', maxNativeZoom: 17, maxZoom: 21, crossOrigin: true, attribution: '© OpenStreetMap · SRTM · © OpenTopoMap (CC BY-SA)' });
  const bases = { 'OpenStreetMap': osm, 'OpenTopoMap': topo };
  L.control.layers(bases, null, { position: 'topright' }).addTo(map);
  (bases[S.mapaBase] || osm).addTo(map);
  map.on('baselayerchange', async e => { S.mapaBase = e.name; try { await saveSB(); } catch { } });
  L.control.scale({ imperial: false, position: 'topleft' }).addTo(map); // queda debajo del indicador GPS
  lyr.finca = L.layerGroup().addTo(map);
  lyr.plan = L.layerGroup().addTo(map);
  lyr.real = L.layerGroup().addTo(map);
  lyr.over = L.layerGroup().addTo(map);
  lyr.m3d = L.layerGroup().addTo(map);
  lyr.fotos = L.layerGroup().addTo(map);
  lyr.desv = L.layerGroup().addTo(map);
  lyr.tmp = L.layerGroup().addTo(map);
  lyr.edit = L.layerGroup().addTo(map);
  map.on('dragstart', () => { followPos = false; });
  const zc = () => map.getContainer().classList.toggle('lowz', map.getZoom() < 20); map.on('zoomend', zc); zc();
}

async function openFinca(id) {
  cur = await DB.get(id); if (!cur) return showList();
  try { await cargarPlanes(cur); } catch (e) { planesCache = new Map(); }
  if (!cur.config) cur.config = { tractorId: SB.tractorDef, aperoId: SB.aperoDef, velocidad: velDef(cur.tipo), vegetacion: 'media' };
  DB.raw.kvPut('ultima', cur.id).catch(() => {});
  if (lyr.over) lyr.over.clearLayers();
  if (lyr.m3d) lyr.m3d.clearLayers(); m3dVista = null;
  $('bLay').classList.remove('hidden');
  applyS();
  viewTrab = null; trabCache = null;
  view = 'map';
  setHeader('‹ Fincas', cur.nombre, '⋯', volverLista, fincaMenu);
  $('vList').classList.add('hidden'); $('bNueva').classList.add('hidden'); $('vSet').classList.add('hidden');
  $('mapWrap').classList.remove('hidden');
  initMap(); setTimeout(() => map.invalidateSize(), 50);
  showMain();
  drawFinca(true);
  startGPS(); // posición visible
}

function drawFinca(fit) {
  lyr.finca.clearLayers(); lyr.plan.clearLayers();
  if (!cur) return;
  if (cur.plan && CFG.plan && !planStale(cur)) drawPlan(cur.plan, lyr.plan);
  else if (cur.plan && CFG.noAlc && !planStale(cur)) drawPlan({ ...cur.plan, parts: [], arrows: [] }, lyr.plan);
  if (cur.linde) {
    L.polygon(cur.linde.coords, { color: '#1b5e20', weight: 2.5, fill: CFG.area, fillColor: '#a5d6a7', fillOpacity: .35, interactive: false }).addTo(lyr.finca);
  }
  if (CFG.arboles) drawArboles(cur, lyr.finca);
  if (CFG.excl) (cur.exclusiones || []).forEach(e => {
    L.polygon(e.coords, { color: '#b71c1c', weight: 2, dashArray: '6 4', fillColor: '#757575', fillOpacity: .55 })
      .bindTooltip(esc(e.nombre), { sticky: true }).addTo(lyr.finca);
  });
  drawTrabView(); drawFotos(); drawIncidencias(cur, lyr.finca); drawPeligros(cur, lyr.finca); drawLentas(cur, lyr.finca); drawInclinaciones(cur, lyr.finca);
  if (fit) fitFinca();
}
// encuadra la finca en la parte visible del mapa (entre la cabecera y el panel inferior), en cualquier pantalla
function fitFinca() {
  if (!cur || !map) return;
  const all = [...(cur.linde ? cur.linde.coords : []), ...(cur.exclusiones || []).flatMap(e => e.coords)];
  if (!all.length) { if (lastPos) map.setView([lastPos.lat, lastPos.lon], 17); return; }
  const pan = ['pWork', 'pRec', 'pTool', 'tbMain'].map($).find(el => el && !el.classList.contains('hidden'));
  const pb = (pan ? pan.offsetHeight : 0) + 24, w = map.getSize().x, pad = Math.max(16, Math.round(w * 0.05));
  map.fitBounds(L.latLngBounds(all), { paddingTopLeft: [pad, 64], paddingBottomRight: [pad, pb], maxZoom: 20, animate: false });
}
let rszT = null, lastW = 0;
window.addEventListener('resize', () => {
  clearTimeout(rszT);
  rszT = setTimeout(() => { if (!map || view !== 'map') return; map.invalidateSize(); const w = window.innerWidth; if (w !== lastW && !followPos && !busy()) fitFinca(); lastW = w; }, 250);
});
// volver a la lista: si hay algo a medias, se pregunta en vez de bloquear
function volverLista() {
  if (work) return toast('Pulsa «■ Parar» para terminar el trabajo antes de salir', 3500);
  if (!busy()) { stopGPS(); return showList(); }
  confirmSheet('Hay una operación a medias (medición, dibujo o edición). ¿Descartarla y volver a la lista?', 'Descartar y salir', () => {
    if (rec) endRec(); if (draw) endDraw(); if (edit) { lyr.edit.clearLayers(); edit = null; }
    if (mallaW) mallaCancel(); review = null; planRev = null; lyr.tmp.clearLayers(); stopGPS(); showList();
  }, true);
}
async function fincaSwitcher() {
  const fs = (await DB.all()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  sheet(`<h3>Mis fincas</h3>${fs.map(f => `<button class="opt" data-id="${f.id}">${f.tipo === 'monte' ? '🌲' : '🌾'} ${esc(f.nombre)}${cur && f.id === cur.id ? ' <b style="color:var(--pri)">· abierta</b>' : ''}<small>${f.linde ? fmtArea(fincaAreas(f).neta) : 'sin linde'}</small></button>`).join('')}
    <button class="btn" id="swN">＋ Nueva finca</button>`,
    sh => { sh.querySelectorAll('[data-id]').forEach(b => b.onclick = () => { closeSheet(); stopGPS(); openFinca(b.dataset.id); }); $('swN').onclick = () => { closeSheet(); stopGPS(); showList(); nuevaFinca(); }; });
}

function showMain() { $('tbMain').classList.remove('hidden'); $('pRec').classList.add('hidden'); $('pTool').classList.add('hidden'); }
function busy() { return !!(rec || draw || edit || review || planRev || work || mallaW); }

/* ---------- GPS ---------- */
let watchId = null, lastPos = null, wakeLock = null;
const GPS = { estado: 'off', err: '', n: 0, t0: 0, alt: null, altAcc: null, rx: 0 };
const PERM_TXT = 'Ajustes del iPhone › Privacidad y seguridad › Localización › Sitios web de Safari → «Al usar la app» y «Ubicación exacta» activada. Revisa también Ajustes › Apps › Safari › Ubicación → «Permitir».';
function startGPS() {
  if (watchId !== null) return;
  if (!window.isSecureContext) { GPS.estado = 'nohttps'; GPS.err = 'La app debe abrirse desde una dirección https:// (p. ej. GitHub Pages). Abierta como archivo local, el iPhone no da la ubicación.'; updGpsChip(); toast(GPS.err, 6000); return; }
  if (!('geolocation' in navigator)) { GPS.estado = 'error'; GPS.err = 'Este navegador no ofrece geolocalización.'; updGpsChip(); return; }
  GPS.estado = 'wait'; GPS.err = ''; GPS.t0 = Date.now(); updGpsChip();
  watchId = navigator.geolocation.watchPosition(onPos, err => {
    if (err.code === 1) { GPS.estado = 'denied'; GPS.err = 'Permiso de ubicación denegado. ' + PERM_TXT; stopGPS(); toast('Permiso de ubicación denegado. Toca el indicador GPS para ver cómo activarlo.', 5000); }
    else if (err.code === 3) { GPS.estado = 'wait'; GPS.err = 'Sin señal todavía (tiempo de espera agotado). Sal a cielo abierto.'; }
    else { GPS.estado = 'error'; GPS.err = 'GPS: ' + err.message; }
    updGpsChip();
  }, { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
}
function stopGPS() { if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; } if (GPS.estado !== 'denied' && GPS.estado !== 'nohttps') GPS.estado = 'off'; updGpsChip(); }
function gpsAge() { return lastPos ? (Date.now() - lastPos.rx) / 1000 : Infinity; }
function updGpsChip() {
  const ch = $('gpsChip'); if (!ch) return;
  let cls = 'g-bad', txt = 'GPS inactivo';
  const age = gpsAge();
  if (GPS.estado === 'denied') txt = 'GPS sin permiso';
  else if (GPS.estado === 'nohttps') txt = 'GPS: requiere https';
  else if (GPS.estado === 'error') txt = 'GPS error';
  else if (lastPos && age < 10 && GPS.estado === 'ok') { cls = 'g-ok'; txt = `GPS activo · ±${fmt(lastPos.acc, lastPos.acc < 10 ? 1 : 0)} m`; }
  else if (GPS.estado === 'wait' || (GPS.estado === 'ok' && age >= 10)) { cls = 'g-wait'; txt = 'GPS buscando señal…'; }
  ch.className = 'gpsChip ' + cls; $('gpsTxt').textContent = txt;
}
setInterval(updGpsChip, 1000);
function gpsSheet() {
  startGPS();
  const row = (k, v) => `<tr><td>${k}</td><td>${v}</td></tr>`;
  const paint = () => {
    const el = $('gpsBody'); if (!el) { clearInterval(tm); return; }
    const p = lastPos, age = gpsAge();
    let est = { off: 'Apagado', wait: 'Buscando señal…', ok: 'Recibiendo', denied: 'Sin permiso', nohttps: 'Requiere https', error: 'Error' }[GPS.estado] || GPS.estado;
    if (GPS.estado === 'ok' && age > 10) est = 'Sin lecturas recientes';
    el.innerHTML = `<table class="gtab" style="width:100%;border-collapse:collapse">
      ${row('Estado', est)}
      ${row('Precisión horizontal', p ? '±' + fmt(p.acc, 1) + ' m ' + (p.acc <= 5 ? '✅ buena' : p.acc <= S.umbralPrecision ? '🟠 aceptable' : '🔴 insuficiente (> ' + S.umbralPrecision + ' m)') : '–')}
      ${row('Latitud', p ? p.lat.toFixed(7) + '°' : '–')}
      ${row('Longitud', p ? p.lon.toFixed(7) + '°' : '–')}
      ${row('Altitud', GPS.alt != null ? fmt(GPS.alt, 1) + ' m' + (GPS.altAcc != null ? ' (±' + fmt(GPS.altAcc, 0) + ')' : '') : '–')}
      ${row('Velocidad', p && p.spd != null && p.spd >= 0 ? fmt(p.spd * 3.6, 1) + ' km/h' : '–')}
      ${row('Rumbo', p && p.hdg != null && !isNaN(p.hdg) ? fmt(p.hdg, 0) + '°' : '–')}
      ${row('Última lectura', p ? (age < 1.5 ? 'ahora' : 'hace ' + Math.round(age) + ' s') : '–')}
      ${row('Lecturas recibidas', GPS.n)}
      ${row('Conexión segura (https)', window.isSecureContext ? 'Sí' : 'No')}
      </table>${GPS.err ? `<div class="card" style="margin-top:10px;background:#ffebee;color:#b71c1c">${esc(GPS.err)}</div>` : ''}
      <div class="note" style="margin-top:8px">La primera posición puede tardar 10–60 s y llegar con poca precisión (wifi/antenas). Espera a que baje de ${S.umbralPrecision} m antes de medir. Cielo abierto, lejos de edificios y árboles densos.</div>`;
  };
  sheet(`<h3>📡 Estado del GPS</h3><div id="gpsBody"></div>
    <div class="row" style="margin-top:12px"><button class="btn sec" id="gRe">Reiniciar GPS</button><button class="btn" id="gMap" ${cur ? '' : 'disabled'}>Ver en el mapa</button></div>`,
    () => {
      $('gRe').onclick = () => { if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; } GPS.estado = 'off'; GPS.err = ''; startGPS(); paint(); };
      $('gMap').onclick = () => { closeSheet(); if (lastPos && map) { followPos = true; map.setView([lastPos.lat, lastPos.lon], Math.max(map.getZoom(), 18)); } };
    });
  paint(); const tm = setInterval(paint, 1000);
}
$('gpsChip').onclick = gpsSheet;
const gpsHist = [];
function rumboAvance() {   // sentido de avance con las últimas posiciones (≥ 2 m recorridos en ≤ 10 s)
  const n = gpsHist.length; if (n < 2) return gpsHist.rumbo && Date.now() - gpsHist.rumbo.t < 60000 ? gpsHist.rumbo : null;
  const p = gpsHist[n - 1], P = Geo.proj(p.lat, p.lon);
  for (let k = n - 2; k >= 0; k--) { const q = gpsHist[k]; if (p.t - q.t > 10000) break; const a = P.fwd(q.lat, q.lon), d = Math.hypot(a[0], a[1]); if (d >= 2) { gpsHist.rumbo = { u: [-a[0] / d, -a[1] / d], t: Date.now() }; return gpsHist.rumbo; } }
  return gpsHist.rumbo && Date.now() - gpsHist.rumbo.t < 60000 ? gpsHist.rumbo : null;
}
function onPos(p) {
  const c = p.coords;
  GPS.estado = 'ok'; GPS.err = ''; GPS.n++; GPS.alt = c.altitude; GPS.altAcc = c.altitudeAccuracy;
  lastPos = { lat: c.latitude, lon: c.longitude, acc: c.accuracy, t: p.timestamp, rx: Date.now(), spd: c.speed, hdg: c.heading, alt: c.altitude, altAcc: c.altitudeAccuracy };
  if (c.accuracy <= Math.max(S.umbralPrecision || 8, 8)) { gpsHist.push({ lat: c.latitude, lon: c.longitude, t: p.timestamp }); while (gpsHist.length > 30) gpsHist.shift(); }
  updGpsChip();
  const ll = [c.latitude, c.longitude];
  if (!map) { if (rec) recPoint(lastPos); if (work) workPoint(lastPos); return; }
  if (!posMarker) {
    posCircle = L.circle(ll, { radius: c.accuracy, color: '#1e88e5', weight: 1, fillOpacity: .12, interactive: false }).addTo(map);
    posMarker = L.marker(ll, { icon: L.divIcon({ className: '', html: '<div class="pos"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }), interactive: false, zIndexOffset: 1000 }).addTo(map);
  } else { posMarker.setLatLng(ll); posCircle.setLatLng(ll).setRadius(c.accuracy); }
  if (followPos) {
    // centra la posición en la parte visible del mapa (por encima del panel inferior)
    const pan = ['pWork', 'pRec', 'pTool'].map($).find(el => el && !el.classList.contains('hidden'));
    const z = map.getZoom() < 17 ? 18 : map.getZoom(), off = pan ? pan.offsetHeight / 2 : 0;
    map.setView(map.unproject(map.project(ll, z).add([0, off]), z), z, { animate: false });
  }
  if (rec) recPoint(lastPos);
  if (work) workPoint(lastPos);
}
$('bLoc').onclick = () => {
  startGPS();
  if (lastPos) { followPos = true; map.setView([lastPos.lat, lastPos.lon], Math.max(map.getZoom(), 18)); }
  else toast('Esperando posición GPS…');
};
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator) { wakeLock = await navigator.wakeLock.request('screen'); }
    else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (e) { /* no soportado */ }
}
document.addEventListener('visibilitychange', () => {
  // al volver a primer plano, si el GPS se quedó parado, se reinicia
  if (document.visibilityState === 'visible' && watchId !== null && gpsAge() > 5) { navigator.geolocation.clearWatch(watchId); watchId = null; startGPS(); }
  if (document.visibilityState === 'visible' && rec) { keepAwake(true); }
  if (document.visibilityState === 'hidden' && rec) rec.hiddenAt = Date.now();
  if (document.visibilityState === 'visible' && rec && rec.hiddenAt) {
    const s = Math.round((Date.now() - rec.hiddenAt) / 1000); rec.hiddenAt = 0;
    if (s > 3) toast(`La app estuvo en segundo plano ${s} s: el GPS no registró ese tramo.`, 4500);
  }
});

