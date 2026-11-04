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
  Object.defineProperty(window, 'speechSynthesis', { value: { speak(u) { (window.__said = window.__said || []).push(u.text); }, cancel() {}, getVoices: () => [], pending: false } }); window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  window.__f = (lat, lon, ts) => cb && cb({ coords: { latitude: lat, longitude: lon, accuracy: 4, altitude: window.__alt ?? null, altitudeAccuracy: 3 }, timestamp: ts || Date.now() }); });
await pg.goto('http://localhost:8765/'); await pg.waitForTimeout(400);
await pg.fill('#lMail', 'j@x.es'); await pg.fill('#lPass', 'ok'); await pg.click('#lGo'); await pg.waitForTimeout(1500);
await pg.evaluate(async () => { const { Geo, DB, Planner, S } = window.LIMPFINC; const P = Geo.proj(43.22, -8.29), ll = xy => Geo.toLL(xy, P);
  for (const [id, n, o] of [['g', 'A Gándará', 0], ['l', 'Leira Nova', 150], ['m', 'Monte', 300]]) { const f = { id, nombre: n, tipo: 'abierta', creada: 1, exclusiones: [], linde: { coords: ll([[o, 0], [o + 100, 0], [o + 100, 60], [o, 60]]) } }; if (id !== 'm') f.plan = Planner.plan(f, S, {}); await DB.put(f); }
  await DB.tPut({ id: 't1', fincaId: 'g', inicio: Date.now() - 864e5 * 3, fin: Date.now() - 864e5 * 3, estado: 'cerrado', sesiones: [], resumen: { cobertura: 0.95 } }); });
await pg.evaluate(() => showList()); await pg.waitForTimeout(400);
const out = [];
const mot = async (deg, secs, lin) => { await pg.evaluate(async ([deg, secs, lin]) => { const r = deg * Math.PI / 180; const n = Math.round(secs * 50);
  for (let i = 0; i < n; i++) { window.dispatchEvent(new DeviceMotionEvent('devicemotion', { accelerationIncludingGravity: { x: 9.81 * Math.sin(r), y: -9.81 * Math.cos(r), z: 0 }, acceleration: { x: lin || 0, y: 0, z: 0 }, interval: 20 })); await new Promise(z => setTimeout(z, 20)); } }, [deg, secs, lin]); };
await pg.evaluate(async () => { await openFinca('g'); SB.incl = { ...(SB.incl || {}), respuestaS: 10, inmovilMin: 0.1, contacto: 'María', telefono: '+34 600 111 222' }; __f(cur.linde.coords[0][0] + 0.0001, cur.linde.coords[0][1] + 0.0001, Date.now()); });
await pg.evaluate(() => startWork(null)); await pg.waitForTimeout(800);
await pg.evaluate(() => { work.paused = true; work.autoPaused = false; });   // pausa manual: no cuenta como inmóvil
await mot(3, 1); out.push('llano: ' + await pg.evaluate(() => $('incChip').textContent + ' · est ' + INCL.est));
await mot(17, 2.5); out.push('17°: ' + await pg.evaluate(() => INCL.est + ' · ' + ($('incOv') ? $('incOv').textContent : '-') + ' · chip ' + $('incChip').textContent));
await mot(23, 2); out.push('23°: ' + await pg.evaluate(() => INCL.est + ' · ' + ($('incOv') ? $('incOv').textContent : '-')));
await pg.screenshot({ path: 'z44a.png' });
await mot(-21, 2); out.push('-21°: ' + await pg.evaluate(() => ($('incOv') ? $('incOv').textContent : '-')));
await mot(2, 1.5); out.push('vuelta a llano: overlay=' + await pg.evaluate(() => !!$('incOv')) + ' · puntos ' + JSON.stringify(await pg.evaluate(() => cur.inclinaciones.map(x => x.ang + '° ' + x.nivel + ' ' + x.lado))));
out.push('voz: ' + await pg.evaluate(() => window.__said.filter(t => /incl|vuelco/i.test(t)).slice(0, 4).join(' | ')));
// vuelco
await mot(50, 3); out.push('50°: ' + await pg.evaluate(() => ($('mdOv') ? $('mdOv').innerText.replace(/\n+/g, ' | ').slice(0, 160) : 'sin aviso')));
await pg.click('#mdOk'); await pg.waitForTimeout(300); await mot(2, 1);
// golpe sin respuesta → alarma
await pg.evaluate(() => { INCL.lastMd = 0; work.paused = false; }); await mot(2, 0.2, 40);
out.push('golpe: ' + await pg.evaluate(() => ($('mdOv') ? $('mdOv').innerText.split('\n').filter(Boolean).slice(0, 2).join(' | ') : 'sin aviso')));
await pg.waitForTimeout(11000);
out.push('alarma: ' + await pg.evaluate(() => $('mdOv').innerText.split('\n').filter(Boolean).slice(0, 5).join(' | ') + ' · sirena ' + !!INCL.sir));
out.push('sms: ' + await pg.evaluate(() => decodeURIComponent(document.querySelector('#mdOv a[href^="sms:"]').getAttribute('href')).slice(0, 230)));
await pg.screenshot({ path: 'z44b.png' });
await pg.click('#mdOk'); await pg.waitForTimeout(300);
// inmóvil (0,1 min = 6 s) trabajando sin pausa
await pg.evaluate(() => { INCL.lastMd = 0; INCL.anchorT = Date.now(); }); await mot(2, 7.5);
out.push('inmóvil: ' + await pg.evaluate(() => ($('mdOv') ? $('mdOv').innerText.split('\n').filter(Boolean)[0] : 'sin aviso')));
await pg.click('#mdOk');
out.push('registro alarmas: ' + await pg.evaluate(() => cur.alarmas.map(a => a.tipo + ':' + a.respuesta).join(', ')));
// hoja y calibración
await pg.evaluate(() => seguridadSheet()); await pg.waitForTimeout(300);
const calP = pg.click('#sgCal'); await mot(4, 3.6); await calP; await pg.waitForTimeout(500);
out.push('calibrado: ' + await pg.evaluate(() => JSON.stringify(SB.incl.g0.map(v => +v.toFixed(2))) + ' · ' + (document.querySelector('.sheet') ? document.querySelector('.sheet').innerText.split('\n').filter(l => /Montaje|Ahora/.test(l)).join(' ') : '')));
await mot(4, 1); out.push('tras calibrar a 4°: ' + await pg.evaluate(() => Math.round(INCL.roll) + '°'));
await pg.screenshot({ path: 'z44c.png' });
await pg.evaluate(() => { closeSheet(); endWork('cerrado'); }); await pg.waitForTimeout(500);
out.push('fin trabajo: sensor ' + await pg.evaluate(() => INCL.on));
console.log(out.join('\n')); console.log('errores:', errs); await br.close();
