import { chromium } from 'playwright';
const D = new URL('.', import.meta.url).pathname;
import * as fs from "fs"; globalThis.__fs = fs;
const store = {}; const T = t => (store[t] = store[t] || new Map());
async function rem(js) { const st = JSON.parse(js); const tab = T(st.t);
  if (!st.uid) return JSON.stringify({ data: null, error: { message: 'no auth', code: '42501' } });
  if (st.op === 'select') { let rows = [...tab.values()].filter(r => r.user_id === st.uid); if (st.filt) rows = rows.filter(r => st.filt.v.includes(r[st.filt.k])); if (st.cols !== '*') { const c = st.cols.split(','); rows = rows.map(r => Object.fromEntries(c.map(k => [k, r[k]]))); } return JSON.stringify({ data: JSON.parse(JSON.stringify(rows)), count: rows.length, error: null }); }
  if (st.op === 'upsert') { const key = st.conf || 'id'; const row = { ...st.row, user_id: st.uid }; tab.set(row[key], row); return JSON.stringify({ data: null, error: null }); }
  if (st.op === 'delete') { for (const v of st.filt.v) { tab.delete(v); if (st.t === 'fincas') for (const tt of ['trabajos', 'fotos']) for (const [k, r] of T(tt)) if (r.finca_id === v) T(tt).delete(k); } return JSON.stringify({ data: null, error: null }); } }
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
await ctx.exposeFunction('__rem', rem);
const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.route('**/cdnjs.cloudflare.com/**', r => { const u = r.request().url(); if (u.includes('jspdf')) return r.fulfill({ path: D + '../lib/jspdf.umd.min.js', contentType: 'application/javascript' }); if (u.includes('three')) return r.fulfill({ path: D + '../lib/three.min.js', contentType: 'application/javascript' }); r.fulfill({ path: D + '../lib/' + (u.endsWith('.css') ? 'leaflet.css' : 'leaflet.js') }); });
await pg.route('**/clipper-lib**', r => r.fulfill({ path: D + '../lib/clipper.js', contentType: 'application/javascript' }));
await pg.route(/supabase-js|lib\/supabase\.js/, r => r.fulfill({ path: D + 'datos/mocksb.js', contentType: 'application/javascript' }));
await pg.route('**/api.open-meteo.com/**', r => { const days = 7, t = [...Array(days)].map((_, i) => new Date(Date.now() + (i - 2) * 864e5).toISOString().slice(0, 10));
  r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ daily: { time: t, weather_code: [61, 3, 0, 2, 63, 0, 1], temperature_2m_max: [16, 17, 19, 20, 15, 18, 21], temperature_2m_min: [9, 10, 11, 12, 10, 9, 11], precipitation_sum: [12, 6, 0, 0.4, 9, 0, 0], precipitation_probability_max: [90, 60, 5, 30, 85, 10, 0], wind_speed_10m_max: [20, 15, 10, 38, 25, 12, 8], wind_gusts_10m_max: [40, 30, 20, 60, 45, 25, 15] } }) }); });
await pg.route('**/sigpac-hubcloud.es/**', r => { const u = new URL(r.request().url()); (globalThis.__sq = globalThis.__sq || []).push(u.pathname.split('/').slice(-1)[0] + u.search);
  const sq = (x0, y0, w, h) => [[[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h], [x0, y0]]];
  const F = (par, rec, g, k) => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: g }, properties: { dn_pk: k, provincia: 15, municipio: 1, agregado: 0, zona: 0, poligono: 501, parcela: par, recinto: rec } });
  const ALL = [F(103, 1, sq(-8.2910, 43.2150, 0.0010, 0.0006), 1), F(103, 2, sq(-8.2900, 43.2150, 0.0006, 0.0006), 2), F(103, 3, sq(-8.2910, 43.2156, 0.0016, 0.00003), 3), F(104, 1, sq(-8.2910, 43.2140, 0.0016, 0.0010), 4)];
  if (u.pathname.includes('recinfo')) { const seg = u.pathname.split('/'), rec = parseInt(seg.pop()); const par = +seg.pop(); return r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify([{ uso_sigpac: rec === 3 ? 'CA' : par === 104 ? 'TA' : 'FO', superficie: 0.1 }]) }); }
  let feats = ALL; const pa = u.searchParams.get('parcela'); if (pa) feats = ALL.filter(f => f.properties.parcela === +pa);
  r.fulfill({ contentType: 'application/geo+json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ type: 'FeatureCollection', features: feats }) }); });
await pg.route(/openstreetmap|opentopomap/, r => r.fulfill({ path: D + 'datos/foto.jpg', contentType: 'image/jpeg' }));
await pg.addInitScript(() => { let cb = null; navigator.geolocation.watchPosition = s => { cb = s; return 1; }; navigator.geolocation.clearWatch = () => {};
  Object.defineProperty(window, 'speechSynthesis', { value: { speak() {}, cancel() {}, getVoices: () => [], pending: false } }); window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  window.__f = (lat, lon, ts) => cb && cb({ coords: { latitude: lat, longitude: lon, accuracy: 4, altitude: window.__alt ?? null, altitudeAccuracy: 3 }, timestamp: ts || Date.now() }); });
await pg.goto('http://localhost:8765/'); await pg.waitForTimeout(400);
await pg.fill('#lMail', 'j@x.es'); await pg.fill('#lPass', 'ok'); await pg.click('#lGo'); await pg.waitForTimeout(1500);
await pg.evaluate(async () => { const { Geo, DB, Planner, S } = window.LIMPFINC; const P = Geo.proj(43.22, -8.29), ll = xy => Geo.toLL(xy, P);
  for (const [id, n, o] of [['g', 'A Gándará', 0], ['l', 'Leira Nova', 150], ['m', 'Monte', 300]]) { const f = { id, nombre: n, tipo: 'abierta', creada: 1, exclusiones: [], linde: { coords: ll([[o, 0], [o + 100, 0], [o + 100, 60], [o, 60]]) } }; if (id !== 'm') f.plan = Planner.plan(f, S, {}); await DB.put(f); }
  await DB.tPut({ id: 't1', fincaId: 'g', inicio: Date.now() - 864e5 * 3, fin: Date.now() - 864e5 * 3, estado: 'cerrado', sesiones: [], resumen: { cobertura: 0.95 } }); });
await pg.evaluate(() => showList()); await pg.waitForTimeout(400);
const out = [], txt = async () => pg.evaluate(() => (document.querySelector('.sheet') || {}).innerText || '');
await pg.evaluate(async () => { await openFinca('g'); SB.promedioS = 3; S.promedioS = 3; });
await pg.click('#tExcl'); await pg.waitForTimeout(400);
out.push('menú: ' + (await txt()).split('\n').filter(l => /^[🚶🚜📍✍⭕⚠]/u.test(l.trim())).join(' | '));
// 1) tractor rodeando una zona: círculo de 3,5 m alrededor de un obstáculo
await pg.click('[data-m="trac"]'); await pg.waitForTimeout(300); out.push('tractor: ' + (await txt()).split('\n').slice(1, 3).join(' '));
await pg.click('#tGo'); await pg.waitForTimeout(300);
const C = await pg.evaluate(() => { const P = Geo.projFor(cur.linde.coords), o = P.fwd(...cur.linde.coords[0]); return P.inv(o[0] + 30, o[1] + 30); });
const circ = async (r, n, t0) => { for (let k = 0; k <= n; k++) { await pg.evaluate(([c, r, a, t]) => { const P = Geo.proj(c[0], c[1]), q = P.inv(r * Math.cos(a), r * Math.sin(a)); __f(q[0], q[1], t); }, [C, r, k / n * 2 * Math.PI, t0 + k * 1000]); } };
await pg.evaluate(c => __f(c[0], c[1] + 0.00003, Date.now()), C); await pg.waitForTimeout(100);
await pg.click('#bPause'); await circ(3.5, 40, Date.now() + 2000); await pg.click('#bFin'); await pg.waitForTimeout(500);
out.push('resultado tractor: ' + await pg.evaluate(() => $('toolHint').innerText.split('·').slice(0, 2).join('·') + ' (esperado ≈ π·2,15² = 14,5 m²)'));
await pg.evaluate(() => [...document.querySelectorAll('#toolBtns button')].find(b => /Guardar/.test(b.textContent)).click()); await pg.waitForTimeout(1200); await pg.evaluate(() => closeSheet());
// 2) vértices con GPS a pie: cuadrado 10 × 10 m
await pg.click('#tExcl'); await pg.waitForTimeout(300); await pg.click('[data-m="ptsPie"]'); await pg.waitForTimeout(300);
out.push('puntos: ' + await pg.evaluate(() => $('recTitle').textContent + ' · botones: ' + ['bPause', 'bCorner', 'bFin'].map(id => id + (document.getElementById(id).classList.contains('hidden') ? '✗' : '✓') + '«' + document.getElementById(id).textContent + '»').join(' ')));
const V = [[50, 20], [60, 20], [60, 30], [50, 30]];
for (const v of V) {
  await pg.evaluate(([c, v]) => { const P = Geo.projFor(cur.linde.coords), o = P.fwd(...cur.linde.coords[0]), q = P.inv(o[0] + v[0], o[1] + v[1]); __f(q[0], q[1], Date.now()); }, [C, v]);
  await pg.click('#bCorner');
  for (let k = 0; k < 14; k++) { await pg.waitForTimeout(280); await pg.evaluate(([v, k]) => { const P = Geo.projFor(cur.linde.coords), o = P.fwd(...cur.linde.coords[0]), q = P.inv(o[0] + v[0] + (Math.random() - .5), o[1] + v[1] + (Math.random() - .5)); __f(q[0], q[1], Date.now() + k); }, [v, k]); }
  await pg.waitForTimeout(800);
}
out.push('tras 4 puntos: ' + await pg.evaluate(() => $('recHint').textContent));
await pg.click('#bFin'); await pg.waitForTimeout(500);
out.push('resultado puntos: ' + await pg.evaluate(() => $('toolHint').innerText.split('·').slice(0, 3).join('·')));
await pg.evaluate(() => [...document.querySelectorAll('#toolBtns button')].find(b => /Guardar/.test(b.textContent)).click()); await pg.waitForTimeout(1200); await pg.evaluate(() => closeSheet());
out.push('exclusiones: ' + await pg.evaluate(() => cur.exclusiones.map(e => e.nombre + ' ' + Math.round(Geo.areaLL(e.coords)) + ' m² (' + e.metodo + ')').join(', ')));
// 3) peligros tocando el mapa
await pg.evaluate(() => { fitFinca(); }); await pg.waitForTimeout(500);
await pg.evaluate(() => peligroTocar()); await pg.waitForTimeout(300);
await pg.mouse.click(150, 420); await pg.waitForTimeout(400); out.push('hoja: ' + (await txt()).split('\n').filter(Boolean).slice(0, 6).join(' | '));
await pg.screenshot({ path: 'z41a.png' });
await pg.click('[data-p="prohibido"]'); await pg.waitForTimeout(600);
await pg.mouse.click(250, 500); await pg.waitForTimeout(400); await pg.click('[data-p="piedra"]'); await pg.waitForTimeout(600);
await pg.evaluate(() => [...document.querySelectorAll('#toolBtns button')].find(b => /Terminar/.test(b.textContent)).click()); await pg.waitForTimeout(500);
out.push('peligros: ' + await pg.evaluate(() => cur.peligros.map(p => p.tipo + '/' + p.origen + '/r' + p.radio).join(', ') + ' · exclusiones ' + cur.exclusiones.length));
await pg.screenshot({ path: 'z41b.png' });
console.log(out.join('\n')); console.log('errores:', errs); await br.close();
