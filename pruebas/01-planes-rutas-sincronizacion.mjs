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



// finca irregular 120x80 con una exclusión



const sh = async () => (await pg.textContent('.sheet')).replace(/\s+/g, ' ');
const fs_ = await import('fs');
const descarga = async fn => { const [dl] = await Promise.all([pg.waitForEvent('download'), fn()]); const p = '/tmp/claude-0/' + dl.suggestedFilename(); await dl.saveAs(p); const b = fs_.readFileSync(p); return [dl.suggestedFilename(), b.length, b.slice(0, 5).toString()]; };

await pg.evaluate(async () => { const { Geo, DB } = window.LIMPFINC, P = Geo.proj(43.22, -8.29), ll = xy => Geo.toLL(xy, P);
  await DB.put({ id: 'ab', nombre: 'Agra Grande', tipo: 'abierta', creada: 1, exclusiones: [], config: { velocidad: 3 }, linde: { coords: ll([[0, 0], [100, 0], [100, 60], [0, 60]]) } }); });
await pg.evaluate(() => showList()); await pg.waitForTimeout(300); await pg.click('.finca >> text=Agra Grande'); await pg.waitForTimeout(800);
// Plan 1 y Plan 2
await pg.tap('#tPlan'); await pg.waitForTimeout(300); await pg.tap('#oGo'); await pg.waitForTimeout(2500); await pg.tap('#toolBtns >> text=Guardar'); await pg.waitForTimeout(500);
console.log('toast:', (await pg.locator('.toast').allTextContents()).slice(-1));
await pg.tap('#tPlan'); await pg.waitForTimeout(300); console.log('menú plan:', (await sh()).slice(0, 120)); await pg.tap('#pRe2'); await pg.waitForTimeout(800); await pg.fill('#rAz', '0'); await pg.tap('#rCalc'); await pg.waitForTimeout(1500); await pg.tap('#rOk'); await pg.waitForTimeout(600);
console.log('planes:', await pg.evaluate(async () => (await window.LIMPFINC.DB.pByFinca('ab')).map(r => r.nombre + ' ' + r.plan.az + '°').join(', ')), '| activo', await pg.evaluate(() => window.LIMPFINC.cur.plan.num));
// trabajo 1 (con Plan 2): recorre media finca, anota una piedra
const pasar = async (ys, t0) => { let t = t0; for (const y of ys) for (let x = 3; x <= 97; x += 0.85) { t += 1000; await pg.evaluate(([x, y, t]) => { const { Geo } = window.LIMPFINC, P = Geo.proj(43.22, -8.29), q = Geo.toLL([[x, y]], P)[0]; __f(q[0], q[1], t); }, [ys.indexOf(y) % 2 ? 100 - x : x, y, t]); } return t; };
await pg.evaluate(() => { const { Geo } = window.LIMPFINC, P = Geo.proj(43.22, -8.29), q = Geo.toLL([[3, 3]], P)[0]; __f(q[0], q[1]); });
await pg.evaluate(() => { const c = incCfg(); c.g0 = [0, -9.81, 0]; c.g0Fecha = Date.now(); });   // 0° ya fijado hoy
await pg.tap('#tWork'); await pg.waitForTimeout(300); await pg.tap('#wNew').catch(() => {}); await pg.waitForTimeout(300); await pg.tap('#wPause'); await pg.waitForTimeout(200);
let t = await pasar([3, 4.6, 6.2, 7.8, 9.4, 11, 30, 31.6], Date.now());
await pg.tap('#wPel'); await pg.waitForTimeout(300); console.log('peligro hoja:', (await sh()).slice(0, 110)); await pg.screenshot({ path: 'v1_pel.png' }); await pg.tap('[data-p=piedra]'); await pg.waitForTimeout(400);
await pg.evaluate(() => endWork('cerrado')); await pg.waitForTimeout(900);
console.log('fin ruta 1:', (await pg.locator('.sheet h3').first().textContent()), '|', (await pg.locator('.toast').allTextContents()).slice(-1));
await pg.evaluate(() => closeSheet());
// trabajo 2 con el Plan 1
await pg.evaluate(async () => { const r = (await window.LIMPFINC.DB.pByFinca('ab')).find(x => x.num === 1), c = window.LIMPFINC.cur; c.plan = r.plan; c.planId = r.id; await saveCur(); });
const dichos = []; await pg.exposeFunction('__dice', x => dichos.push(x)); await pg.evaluate(() => { speechSynthesis.speak = u => window.__dice(u.text); });
await pg.tap('#tWork'); await pg.waitForTimeout(300); await pg.tap('#wNew').catch(() => {}); await pg.waitForTimeout(300); await pg.tap('#wPause'); await pg.waitForTimeout(200);
t = await pasar([3, 4.6, 6.2, 7.8, 9.4, 11, 12.6, 14.2, 15.8, 17.4, 19, 20.6, 22.2, 23.8, 25.4, 27, 28.6, 30.2, 31.8], t + 60000);
console.log('avisos de peligro por voz:', dichos.filter(d => /piedra/i.test(d)).slice(0, 2));
await pg.evaluate(() => endWork('abierto')); await pg.waitForTimeout(900); await pg.evaluate(() => closeSheet());
// rutas y análisis
await pg.evaluate(() => rutasSheet()); await pg.waitForTimeout(800); console.log('rutas:', (await sh()).slice(0, 420));
await pg.tap('#rtAn'); await pg.waitForTimeout(500); console.log('análisis:', (await sh()).replace(/\s+/g, ' ').slice(0, 700)); await pg.screenshot({ path: 'v2_analisis.png' });
await pg.tap('#anRo'); await pg.waitForTimeout(1500); await pg.screenshot({ path: 'v3_rojo.png' });
// planes: copiar, renombrar, eliminar
await pg.evaluate(() => planesSheet()); await pg.waitForTimeout(500); console.log('planes hoja:', (await sh()).slice(0, 400));
await pg.click('.sheet [data-id] >> nth=1'); await pg.waitForTimeout(300); await pg.tap('#poCp'); await pg.waitForTimeout(500);
await pg.click('.sheet [data-id] >> nth=0'); await pg.waitForTimeout(300); await pg.tap('#poEd'); await pg.fill('#peN', 'Plan norte-sur'); await pg.fill('#peT', 'probar con rumbo 0'); await pg.tap('#peOk'); await pg.waitForTimeout(500);
console.log('tras copiar y renombrar:', await pg.evaluate(async () => (await window.LIMPFINC.DB.pByFinca('ab')).map(r => r.num + ':' + r.nombre).join(' | ')));
// ruta: renombrar, copiar
await pg.evaluate(() => rutasSheet()); await pg.waitForTimeout(500); await pg.click('.sheet [data-id] >> nth=0'); await pg.waitForTimeout(300); await pg.tap('#tCp'); await pg.waitForTimeout(600);
console.log('rutas tras copiar:', await pg.evaluate(async () => (await window.LIMPFINC.DB.tByFinca('ab')).map(t => t.num + ':' + t.nombre + ':' + (t.planId ? 'plan' : '-')).join(' | ')));
await pg.waitForTimeout(3500);
console.log('Supabase planes:', store.planes ? [...store.planes.values()].map(r => r.data.nombre).join(', ') : 0, '| trabajos:', store.trabajos ? store.trabajos.size : 0);
await pg.reload(); await pg.waitForTimeout(1500); console.log('tras recargar, planes locales:', await pg.evaluate(async () => (await window.LIMPFINC.DB.gAll('planes')).length));
console.log('errores:', errs);
await br.close();
