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
const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block', acceptDownloads: true });
await ctx.exposeFunction('__rem', rem);
const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.route('**/cdnjs.cloudflare.com/**', r => { const u = r.request().url(); if (u.includes('jspdf')) return r.fulfill({ path: D + '../lib/jspdf.umd.min.js', contentType: 'application/javascript' }); if (u.includes('xlsx')) return r.fulfill({ path: D + '../lib/xlsx.full.min.js', contentType: 'application/javascript' }); if (u.includes('three')) return r.fulfill({ path: D + '../lib/three.min.js', contentType: 'application/javascript' }); r.fulfill({ path: D + '../lib/' + (u.endsWith('.css') ? 'leaflet.css' : 'leaflet.js') }); });
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
await pg.evaluate(async () => { await openFinca('g'); await asegurarPlanGuardado(cur); await saveCur();
  const P = Geo.projFor(cur.linde.coords), xs = Geo.toXY(cur.linde.coords, P).map(p => p[0]), x0 = Math.min(...xs);
  const segs = []; cur.plan.parts.forEach(p => { const xy = Geo.toXY(p.ll, P); for (let i = 1; i < xy.length; i++) segs.push([xy[i - 1], xy[i], p.type]); });
  const along = []; let acc = 0; segs.forEach(s => { along.push(acc); acc += Geo.dist(s[0], s[1]); });
  const at = d => { let i = 0; while (i < segs.length - 1 && along[i + 1] < d) i++; const s = segs[i], L = Geo.dist(s[0], s[1]) || 1, t = Math.min(1, (d - along[i]) / L); return [s[0][0] + (s[1][0] - s[0][0]) * t, s[0][1] + (s[1][1] - s[0][1]) * t, s[2]]; };
  const t0 = new Date(new Date().getFullYear(), 4, 10, 9, 0).getTime(), pts = []; let tms = t0, d = 0, st1 = false, st2 = false;
  while (d < acc * 0.5) { const q = at(d), ty = q[2]; let v = ty === 'trabajo' ? 3 : 1.5; if (ty === 'trabajo' && q[0] - x0 > 40 && q[0] - x0 < 60) v = 1.2;
    const g = at(d + 2), ll = P.inv(g[0], g[1]);
    const stop = (!st1 && d > 300) ? (st1 = true, 90) : (!st2 && d > 900) ? (st2 = true, 30) : 0;
    for (let k = 0; k <= stop; k++) { pts.push([+ll[0].toFixed(7), +ll[1].toFixed(7), 3, tms, ty === 'trabajo' ? 1 : 0]); tms += 1000; }
    if (!stop) { } d += v / 3.6; }
  const t = { id: 'rv', fincaId: cur.id, num: 1, nombre: 'Ruta 1', inicio: t0, fin: tms, estado: 'cerrado', planId: cur.planId, cfg: { ...cur.config }, precios: { gasoil: 1.3, hora: 35, km: 1.5, kmIda: 9.4 }, sesiones: [{ inicio: t0, fin: tms, pts }] };
  t.resumen = resumenTrab(t, rebuildTrab(cur, t)); await DB.tPut(t); });
const A = await pg.evaluate(async () => { const t = (await DB.tByFinca(cur.id)).find(x => x.id === 'rv'); const A = analisisVelocidad(t); return { segs: A.segs.length, paradas: A.paradas.map(p => Math.round(p.dur)), vMed: A.vMed && +A.vMed.toFixed(2), p10: A.p10 && +A.p10.toFixed(2), p50: A.p50 && +A.p50.toFixed(2), p90: A.p90 && +A.p90.toFixed(2) }; });
out.push('análisis: ' + JSON.stringify(A));
await pg.evaluate(async () => { const t = (await DB.tByFinca(cur.id)).find(x => x.id === 'rv'); trabOpts(t); }); await pg.waitForTimeout(300); await pg.click('#tVel'); await pg.waitForTimeout(800);
out.push('panel: ' + await pg.evaluate(() => $('toolTitle').textContent + ' :: ' + $('toolHint').innerText.replace(/\n/g, ' | ')));
await pg.screenshot({ path: 'z43a.png' });
await pg.evaluate(() => [...document.querySelectorAll('#toolBtns button')].find(b => /Cerrar/.test(b.textContent)).click());
// exportar
const dl = async sel => { const [d] = await Promise.all([pg.waitForEvent('download', { timeout: 20000 }), pg.click(sel)]); const p = 'z43_' + d.suggestedFilename(); fs.copyFileSync(await d.path(), p); return p; };
await pg.evaluate(() => informeSheet(cur)); await pg.waitForTimeout(400); await pg.screenshot({ path: 'z43b.png' });
const csv = await dl('[data-x="f:csv"]'); await pg.waitForTimeout(300);
await pg.evaluate(() => informeSheet(cur)); await pg.waitForTimeout(300); const ods = await dl('[data-x="t:ods"]'); await pg.waitForTimeout(300);
await pg.evaluate(() => informeSheet(cur)); await pg.waitForTimeout(300); const xlsx = await dl('[data-x="t:xlsx"]');
out.push('ficheros: ' + [csv, ods, xlsx].map(p => p + ' ' + fs.statSync(p).size + ' B').join(' · '));
out.push('csv: ' + fs.readFileSync(csv, 'utf8').split('\n').slice(0, 2).map(l => l.slice(0, 400)).join('\n     '));
console.log(out.join('\n')); console.log('errores:', errs); await br.close();
