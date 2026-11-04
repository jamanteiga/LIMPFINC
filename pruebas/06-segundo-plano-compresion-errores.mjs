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
const out = [];
// a) plan en segundo plano: mismo resultado que en primer plano y la pantalla sigue respondiendo
await pg.evaluate(async () => { const P = Geo.proj(43.23, -8.28); await DB.put({ id: 'big', nombre: 'Grande', tipo: 'abierta', creada: 1, exclusiones: [], config: { tractorId: SB.tractorDef, aperoId: SB.aperoDef, velocidad: 3 }, linde: { coords: Geo.toLL([[0, 0], [260, 20], [300, 180], [120, 230], [-20, 160]], P) } }); await openFinca('big'); applyS(); });
const r = await pg.evaluate(async () => {
  let ticks = 0, maxGap = 0, last = performance.now(); const iv = setInterval(() => { const n = performance.now(); maxGap = Math.max(maxGap, n - last); last = n; ticks++; }, 20);
  const prog = []; const t0 = performance.now(); const a = await planAsync(cur, S, {}, p => prog.push(+p.toFixed(2))); const tw = performance.now() - t0; clearInterval(iv);
  const t1 = performance.now(); const b = Planner.plan(cur, S, {}); const ts = performance.now() - t1;
  return { igual: a.stats.t.total.toFixed(3) === b.stats.t.total.toFixed(3) && a.parts.length === b.parts.length, min: Math.round(a.stats.t.total / 60), progreso: prog.length + ' avisos (' + prog.slice(0, 3).join(', ') + '…)', worker_ms: Math.round(tw), local_ms: Math.round(ts), pausaMaxPantalla_ms: Math.round(maxGap), maq: !!(a.params && a.params.maq) };
});
out.push('plan en segundo plano: ' + JSON.stringify(r));
await pg.evaluate(() => runPlan(cur.planOpt || {}, null, null)); await pg.waitForTimeout(150); out.push('barra de progreso: ' + await pg.evaluate(() => !!document.querySelector('.busyOv .bpB'))); await pg.waitForTimeout(4000);
out.push('revisión tras runPlan: ' + await pg.evaluate(() => $('toolTitle').textContent));
// b) compresión de rutas
const c = await pg.evaluate(async () => { const pts = []; let t = Date.now(); for (let i = 0; i < 3000; i++) pts.push([+(43.23 + i * 6e-6).toFixed(7), +(-8.28 + Math.sin(i / 50) * 2e-5).toFixed(7), 3.5, t += 1000, 1]);
  const tr = { id: 'zz', fincaId: 'big', inicio: Date.now(), estado: 'cerrado', sesiones: [{ inicio: Date.now(), pts, p3d: pts.slice(0, 500).map(p => [p[0], p[1], 52.345, 3.2, 5.1, p[3]]) }] };
  await DB.tPut(tr); const raw = await new Promise(ok => { const q = indexedDB.open('limpfinc'); q.onsuccess = () => { const g = q.result.transaction('trabajos').objectStore('trabajos').get('zz'); g.onsuccess = () => ok(g.result); }; });
  const back = await DB.tGet('zz');
  return { json: JSON.stringify(tr.sesiones).length, guardado: JSON.stringify(raw.sesiones).length, tipo: typeof raw.sesiones[0].pts, igual: JSON.stringify(back.sesiones) === JSON.stringify(tr.sesiones), memoriaIntacta: Array.isArray(tr.sesiones[0].pts) }; });
out.push('compresión: ' + JSON.stringify(c) + ' → ' + (c.json / c.guardado).toFixed(1) + ' veces menos');
await pg.waitForTimeout(3500);
out.push('Supabase trabajos (zz): ' + await pg.evaluate(async () => { const r = await __rem(JSON.stringify({ t: 'trabajos', op: 'select', uid: Sync.user.id, cols: '*' })); const d = JSON.parse(r).data.find(x => x.id === 'zz'); return d ? typeof d.data.sesiones[0].pts + ' ' + JSON.stringify(d.data).length + ' B' : 'no subido'; }));
// d) registro de errores
await pg.evaluate(() => { setTimeout(() => { throw new Error('error de prueba'); }, 10); Promise.reject(new Error('promesa de prueba')); });
await pg.waitForTimeout(2500);
out.push('errores guardados: ' + await pg.evaluate(async () => ((await DB.kvGet('errores')) || []).map(e => e.msg + (e.donde ? ' @' + e.donde.split('/').pop() : '') + ' [' + e.vista + ']').join(' | ')));
out.push('errores en Supabase: ' + await pg.evaluate(async () => { const r = await __rem(JSON.stringify({ t: 'errores', op: 'select', uid: Sync.user.id, cols: '*' })); return JSON.parse(r).data.length; }));
await pg.evaluate(() => almacenSheet()); await pg.waitForTimeout(500);
out.push('datos del móvil: ' + await pg.evaluate(() => document.querySelector('.sheet').innerText.split('\n').filter(l => /instalada|protegidos|Espacio|rutas|Versión/.test(l)).join(' · ')));
await pg.click('#alEr'); await pg.waitForTimeout(400); await pg.screenshot({ path: 'z45a.png' });
console.log(out.join('\n')); console.log('errores página (esperados los 2 de prueba):', errs.length); await br.close();
