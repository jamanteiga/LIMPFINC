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
  Object.defineProperty(window, 'speechSynthesis', { value: { speak(u) { (window.__said = window.__said || []).push(u.text); }, cancel() {}, getVoices: () => [], pending: false } }); window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  window.__f = (lat, lon, ts) => cb && cb({ coords: { latitude: lat, longitude: lon, accuracy: 4, altitude: window.__alt ?? null, altitudeAccuracy: 3 }, timestamp: ts || Date.now() }); });
await pg.goto('http://localhost:8765/'); await pg.waitForTimeout(400);
await pg.fill('#lMail', 'j@x.es'); await pg.fill('#lPass', 'ok'); await pg.click('#lGo'); await pg.waitForTimeout(1500);
await pg.evaluate(async () => { const { Geo, DB, Planner, S } = window.LIMPFINC; const P = Geo.proj(43.22, -8.29), ll = xy => Geo.toLL(xy, P);
  for (const [id, n, o] of [['g', 'A Gándará', 0], ['l', 'Leira Nova', 150], ['m', 'Monte', 300]]) { const f = { id, nombre: n, tipo: 'abierta', creada: 1, exclusiones: [], linde: { coords: ll([[o, 0], [o + 100, 0], [o + 100, 60], [o, 60]]) } }; if (id !== 'm') f.plan = Planner.plan(f, S, {}); await DB.put(f); }
  await DB.tPut({ id: 't1', fincaId: 'g', inicio: Date.now() - 864e5 * 3, fin: Date.now() - 864e5 * 3, estado: 'cerrado', sesiones: [], resumen: { cobertura: 0.95 } }); });
await pg.evaluate(() => showList()); await pg.waitForTimeout(400);
const out = [], txt = async () => pg.evaluate(() => (document.querySelector('.sheet') || {}).innerText || '');
const first = async () => (await txt()).split('\n').filter(l => l.trim() && l.trim() !== '✕')[0];
await pg.evaluate(async () => { await openFinca('g'); await asegurarPlanGuardado(cur); await saveCur(); });
// ruta simulada que sigue el plan hasta la mitad (GPS 2 m por delante de la posición de corte)
const nPts = await pg.evaluate(async () => {
  const P = Geo.projFor(cur.linde.coords), xy = []; cur.plan.parts.forEach(p => Geo.toXY(p.ll, P).forEach(q => xy.push(q)));
  const cum = [0]; for (let i = 1; i < xy.length; i++) cum.push(cum[i - 1] + Geo.dist(xy[i - 1], xy[i]));
  const at = s => { let i = 1; while (i < cum.length - 1 && cum[i] < s) i++; const t = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1); return [xy[i - 1][0] + (xy[i][0] - xy[i - 1][0]) * t, xy[i - 1][1] + (xy[i][1] - xy[i - 1][1]) * t]; };
  const Ltot = cum[cum.length - 1], t0 = Date.now() - 3 * 3600e3, pts = [];
  for (let s = 0, k = 0; s < Ltot * 0.45; s += 0.8, k++) { const q = at(s + 2), ll = P.inv(q[0], q[1]); pts.push([+ll[0].toFixed(7), +ll[1].toFixed(7), 3, t0 + k * 1000, 1]); }
  const t = { id: 'r1', fincaId: cur.id, num: 1, nombre: 'Ruta 1', inicio: t0, estado: 'abierto', planId: cur.planId, planFecha: cur.plan.fecha, cfg: { ...cur.config }, sesiones: [{ inicio: t0, fin: pts[pts.length - 1][3], pts }] };
  t.resumen = resumenTrab(t, rebuildTrab(cur, t)); await DB.tPut(t); window.__Lplan = Ltot; return pts.length; });
out.push('puntos ruta: ' + nPts);
await pg.evaluate(() => workMenu()); await pg.waitForTimeout(600);
out.push('menu: ' + (await txt()).match(/Continuar[^\n]*\n?[^\n]*/)[0].replace(/\n/g, ' | '));
// posición a ~40 m del punto de reanudación
const res = await pg.evaluate(async () => { const t = await DB.tGet ? null : null; const tr = (await DB.tByFinca(cur.id))[0]; const q = puntoReanudar(rebuildTrab(cur, tr)); return q; });
out.push('reanudar: ' + JSON.stringify(res));
const P0 = await pg.evaluate(r => { const P = Geo.proj(r.ll[0], r.ll[1]); const a = P.inv(-30, -28); return a; }, res);
for (let k = 0; k < 4; k++) await pg.evaluate(([a, k]) => __f(a[0] + k * 0.000003, a[1], Date.now() + k * 1000), [P0, k]);
await pg.click('#wCont'); await pg.waitForTimeout(800);
out.push('panel: ' + await pg.evaluate(() => $('wPass').textContent + ' / ' + $('wNext').textContent));
// acercarse en línea recta
await pg.evaluate(async ([r, a]) => { const P = Geo.proj(r.ll[0], r.ll[1]); const s = P.fwd(a[0], a[1]); for (let k = 1; k <= 45; k++) { const f = k / 45, q = P.inv(s[0] * (1 - f), s[1] * (1 - f)); __f(q[0], q[1], Date.now() + 5000 + k * 1100); await new Promise(z => setTimeout(z, 15)); } }, [res, P0]);
await pg.waitForTimeout(300);
out.push('voz: ' + (await pg.evaluate(() => window.__said.filter(t => /reanud/i.test(t)).join(' | '))));
out.push('panel2: ' + await pg.evaluate(() => $('wPass').textContent + ' · resume.done=' + work.resume.done + ' · guide.part=' + work.guide.part));
await pg.screenshot({ path: 'z36a.png' });
await pg.evaluate(() => endWork('abierto')); await pg.waitForTimeout(500); await pg.evaluate(() => closeSheet());
// repaso
await pg.evaluate(async () => { const t = (await DB.tByFinca(cur.id))[0]; repasoSheet(t); }); await pg.waitForTimeout(300);
await pg.evaluate(() => { $('rpG').checked = false; }); await pg.click('#rpOk'); await pg.waitForTimeout(2500);
out.push('repaso: ' + await pg.evaluate(() => $('toolTitle').textContent + ' :: ' + $('toolHint').innerText.replace(/\n/g, ' | ')));
const chk = await pg.evaluate(() => { const pl = planRev.pl, P = Geo.projFor(cur.linde.coords), lin = Geo.toXY(cur.linde.coords, P);
  const pip = (q, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  let n = 0, fuera = 0; pl.parts.forEach(p => { const xy = Geo.toXY(p.ll, P); for (let i = 1; i < xy.length; i++) for (let k = 0; k <= 10; k++) { const q = [xy[i - 1][0] + (xy[i][0] - xy[i - 1][0]) * k / 10, xy[i - 1][1] + (xy[i][1] - xy[i - 1][1]) * k / 10]; n++; if (!pip(q, lin)) fuera++; } });
  return `pasadas ${pl.stats.nPasadas}, traslados ${pl.stats.giros.tras}, ${Math.round(pl.stats.t.total / 60)} min, puntos fuera del linde ${fuera}/${n}, ${pl.ms} ms`; });
out.push('repaso chk: ' + chk);
await pg.screenshot({ path: 'z36b.png' });
await pg.evaluate(() => [...document.querySelectorAll('#toolBtns button')].find(b => /Guardar/.test(b.textContent)).click()); await pg.waitForTimeout(600);
out.push('activo: ' + await pg.evaluate(async () => { await cargarPlanes(cur); return [...planesCache.values()].map(r => r.num + ':' + r.nombre + ':' + r.origen).join(' ; ') + ' · cur.plan.repaso=' + !!cur.plan.repaso; }));
// peligro + exportación
await pg.evaluate(async () => { cur.peligros = [{ id: 'pz', tipo: 'piedra', ll: cur.linde.coords[0].map(v => v + 0.00005), radio: 1, fecha: Date.now(), nota: 'grande' }]; await saveCur(); });
const dl = async fn => { const [d] = await Promise.all([pg.waitForEvent('download'), pg.evaluate(fn)]); const p = await d.path(); return { n: d.suggestedFilename(), s: fs.readFileSync(p, 'utf8') }; };
const gx = await dl(() => exportarPeligros([cur], 'gpx', 'A')); out.push('gpx: ' + gx.n + ' ' + gx.s.match(/<wpt[^>]*>.*?<\/wpt>/)[0].slice(0, 160));
const kx = await dl(() => exportarPeligros([cur], 'kml', 'A')); out.push('kml: ' + kx.n + ' placemarks=' + (kx.s.match(/<Placemark>/g) || []).length + ' polygon=' + kx.s.includes('<Polygon>'));
const gF = await dl(async () => download('x.gpx', buildGPX(await exportData()), 'application/gpx+xml')); out.push('gpx finca con wpt: ' + gF.s.includes('<wpt'));
// informe anual
await pg.evaluate(() => informeSheet(cur)); await pg.waitForTimeout(400); out.push('informe sheet: ' + await first());
console.log(out.join('\n')); out.length = 0; await pg.click('#iaT'); await pg.waitForTimeout(4000); console.log('toast:', await pg.evaluate(() => [...document.querySelectorAll('.toast,#toast')].map(e => e.textContent).join('|')), errs); const [d] = await Promise.all([pg.waitForEvent('download', { timeout: 20000 }), pg.evaluate(async () => informeAnual([cur], new Date().getFullYear()))]); const pth = await d.path(); fs.copyFileSync(pth, 'z36.pdf'); out.push('pdf: ' + d.suggestedFilename() + ' ' + fs.statSync('z36.pdf').size + ' bytes');
console.log(out.join('\n')); console.log('errores:', errs); await br.close();
