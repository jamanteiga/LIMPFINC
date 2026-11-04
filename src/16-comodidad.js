'use strict';
/* =========================================================
   v1.1 — COMODIDAD: deshacer, recuperación, mapa general, tiempo, notas y fotos
   ========================================================= */

/* ---- Deshacer ---- */
function toastUndo(msg, undo, ms = 6000) {
  const t = document.createElement('div'); t.className = 'toast undo';
  t.innerHTML = `<span>${esc(msg)}</span><button>Deshacer</button>`;
  document.body.appendChild(t);
  const tm = setTimeout(() => t.remove(), ms);
  t.querySelector('button').onclick = async () => { clearTimeout(tm); t.remove(); try { await undo(); toast('Deshecho'); } catch (e) { toast('No se pudo deshacer: ' + e.message); } };
}
async function borrarFinca(f) {
  const trs = await DB.tByFinca(f.id), fts = (await DB.gAll('fotos')).filter(x => x.fincaId === f.id);
  for (const t of trs) await DB.raw.tDel(t.id);
  for (const x of fts) await DB.gDel('fotos', x.id);
  for (const x of await DB.pByFinca(f.id)) await DB.gDel('planes', x.id);
  await DB.del(f.id);                        // en Supabase, los trabajos y fotos se borran en cascada
  try { const a = await DB.kvGet('activo'); if (a && a.fincaId === f.id) await DB.raw.kvPut('activo', null); } catch { }
  if (cur && cur.id === f.id) { cur = null; stopGPS(); }
  showList();
  toastUndo(`«${f.nombre}» eliminada`, async () => {
    const c = { ...f }; delete c._sync; await DB.put(c);
    for (const t of trs) { const x = { ...t }; delete x._sync; await DB.tPut(x); }
    for (const x of fts) { const y = { ...x }; delete y._sync; await DB.cPut('fotos', y); }
    showList();
  });
}

/* ---- Recuperar lo que estaba en marcha si la app se cerró ---- */
async function setActivo(a) { try { await DB.raw.kvPut('activo', a); } catch { } }
async function comprobarActivo() {
  const a = await DB.kvGet('activo'); if (!a) return;
  const f = await DB.get(a.fincaId); if (!f) return setActivo(null);
  const min = Math.round((Date.now() - a.t) / 60000);
  if (min > 72 * 60) return setActivo(null);
  const cuando = min < 60 ? `hace ${min} min` : `hace ${Math.round(min / 60)} h`;
  const que = a.tipo === 'trabajo' ? `un trabajo en «${esc(f.nombre)}»` : `la medición del ${a.rec.target === 'linde' ? 'linde' : 'exclusión'} de «${esc(f.nombre)}» (${a.rec.pts.length} puntos)`;
  sheet(`<h3>⏯ Hay algo a medias</h3><div class="note" style="margin-bottom:10px">La app se cerró con ${que} en marcha (${cuando}).</div>
    <button class="btn" id="raGo" style="margin-bottom:8px">▶ Continuar donde lo dejé</button>
    <button class="btn sec" id="raNo">Descartar</button>`, () => {
    $('raGo').onclick = async () => {
      closeSheet(); await openFinca(f.id);
      if (a.tipo === 'trabajo') {
        const t = await DB.tGet(a.trabId);
        if (!t) return setActivo(null);
        await startWork(t); toast('Trabajo recuperado. Pulsa «▶ Continuar» para seguir.', 4500);
      } else {
        startRec(a.rec.target, a.rec.mode);
        rec.pts = a.rec.pts; rec.state = 'pause'; rec.paused = true;
        rec.line.setLatLngs(rec.pts.filter(q => q.corner || q.acc <= S.umbralPrecision).map(q => [q.lat, q.lon]));
        paintRec(); updRecStats(); toast('Medición recuperada. Pulsa «▶ Continuar» para seguir.', 4500);
      }
    };
    $('raNo').onclick = () => { setActivo(null); closeSheet(); };
  });
}

/* ---- Mapa con todas las fincas ---- */
async function estadoFincas() {
  const trs = await DB.tAll(), out = {};
  for (const t of trs) { const o = out[t.fincaId] = out[t.fincaId] || { abierto: false, ultima: 0, cob: null }; if (t.estado === 'abierto') o.abierto = true; const fin = t.fin || t.inicio; if (t.estado === 'cerrado' && fin > o.ultima) { o.ultima = fin; o.cob = t.resumen ? t.resumen.cobertura : null; } }
  return out;
}
async function verMapaFincas() {
  view = 'overview'; cur = null; applyS();
  setHeader('‹ Lista', 'Mapa de fincas', '', showList, null);
  ['vList', 'vSet', 'bNueva', 'vLogin'].forEach(i => $(i).classList.add('hidden'));
  $('mapWrap').classList.remove('hidden'); $('tbMain').classList.add('hidden'); $('bLay').classList.add('hidden');
  ['pRec', 'pTool', 'pWork'].forEach(i => $(i).classList.add('hidden'));
  initMap(); setTimeout(() => map.invalidateSize(), 50);
  ['finca', 'plan', 'real', 'desv', 'tmp', 'edit', 'fotos'].forEach(k => lyr[k] && lyr[k].clearLayers()); if (lyr.cov) { map.removeLayer(lyr.cov); lyr.cov = null; }
  lyr.over.clearLayers(); startGPS();
  const fs = await DB.all(), est = await estadoFincas(), all = [];
  dibujarJornada(lyr.over);
  const COL = { limpia: '#2e7d32', curso: '#ef6c00', plan: '#1565c0', pend: '#757575' };
  let sin = 0;
  fs.forEach(f => {
    if (!f.linde) { sin++; return; }
    const e = est[f.id] || {}, st = e.abierto ? 'curso' : e.ultima && (e.cob == null || e.cob >= 0.85) ? 'limpia' : f.plan ? 'plan' : 'pend';
    const txt = { limpia: 'Limpia el ' + new Date(e.ultima).toLocaleDateString('es-ES'), curso: 'Trabajo en curso', plan: 'Con plan, sin limpiar', pend: 'Pendiente (sin plan)' }[st];
    const pg = L.polygon(f.linde.coords, { color: COL[st], weight: 2.5, fillColor: COL[st], fillOpacity: .35 }).addTo(lyr.over);
    pg.bindTooltip(esc(f.nombre), { permanent: true, direction: 'center', className: 'ovlab' });
    pg.on('click', () => sheet(`<h3>${f.tipo === 'monte' ? '🌲' : '🌾'} ${esc(f.nombre)}</h3><div class="card">
      <div class="kv"><span>Estado</span><span style="color:${COL[st]}">${txt}</span></div>
      <div class="kv"><span>Superficie</span><span>${fmtArea(fincaAreas(f).neta)}</span></div>
      ${f.plan ? `<div class="kv"><span>Plan</span><span>${fmtH(f.plan.stats.t.total / 3600)} · ${fmt(f.plan.stats.litros, 1)} L</span></div>` : ''}</div>
      <div class="row"><button class="btn sec" id="ovT">🌦 Tiempo</button><button class="btn" id="ovO">Abrir</button></div>`, () => {
      $('ovO').onclick = () => { closeSheet(); lyr.over.clearLayers(); openFinca(f.id); };
      $('ovT').onclick = () => tiempoSheet(f);
    }));
    all.push(...f.linde.coords);
  });
  if (all.length) map.fitBounds(L.latLngBounds(all), { padding: [30, 30], maxZoom: 18, animate: false });
  else if (lastPos) map.setView([lastPos.lat, lastPos.lon], 14);
  toast(`🟩 limpia · 🟧 en curso · 🟦 con plan · ⬜ pendiente${sin ? ` · ${sin} sin linde` : ''}`, 5000);
}

/* ---- El tiempo (Open-Meteo, libre y sin clave) ---- */
const WMO = c => c === 0 ? '☀️' : c <= 2 ? '🌤' : c === 3 ? '☁️' : c <= 48 ? '🌫' : c <= 57 ? '🌦' : c <= 67 ? '🌧' : c <= 77 ? '🌨' : c <= 82 ? '🌧' : c <= 86 ? '🌨' : '⛈';
const tiempoCache = {};
async function tiempoSheet(f) {
  if (!f.linde) return toast('La finca no tiene linde: no se puede situar');
  const c = f.linde.coords.reduce((a, p) => [a[0] + p[0] / f.linde.coords.length, a[1] + p[1] / f.linde.coords.length], [0, 0]);
  sheet(`<h3>🌦 Tiempo · ${esc(f.nombre)}</h3><div id="tmB" class="card">Consultando previsión…</div>`);
  try {
    const k = c.map(v => v.toFixed(3)).join(',');
    let d = tiempoCache[k] && Date.now() - tiempoCache[k].t < 3600000 ? tiempoCache[k].d : null;
    if (!d) {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${c[0].toFixed(4)}&longitude=${c[1].toFixed(4)}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max&timezone=Europe%2FMadrid&past_days=2&forecast_days=5`;
      const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status);
      d = (await r.json()).daily; tiempoCache[k] = { t: Date.now(), d };
    }
    const n = d.time.length, rows = [];
    for (let i = 2; i < n; i++) {
      const prev = (d.precipitation_sum[i - 1] || 0) + (d.precipitation_sum[i - 2] || 0), ll = d.precipitation_sum[i] || 0, pr = d.precipitation_probability_max[i] || 0, vi = d.wind_speed_10m_max[i] || 0, ra = d.wind_gusts_10m_max[i] || 0;
      const v = ll >= 5 || pr >= 70 ? ['❌', 'Lluvia'] : ra >= 50 || vi >= 35 ? ['⚠️', 'Viento fuerte'] : prev >= 15 ? ['⚠️', 'Terreno húmedo'] : ll >= 1 || pr >= 40 ? ['🟡', 'Posible lluvia'] : ['✅', 'Apto'];
      const fecha = new Date(d.time[i] + 'T12:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
      rows.push(`<tr><th>${fecha}</th><td>${WMO(d.weather_code[i])}</td><td>${Math.round(d.temperature_2m_max[i])}°/${Math.round(d.temperature_2m_min[i])}°</td><td>${fmt(ll, 1)} mm<br><small>${pr} %</small></td><td>${Math.round(vi)} km/h<br><small>rachas ${Math.round(ra)}</small></td><td>${v[0]}<br><small>${v[1]}</small></td></tr>`);
    }
    const llPrev = (d.precipitation_sum[0] || 0) + (d.precipitation_sum[1] || 0);
    $('tmB').outerHTML = `<div style="overflow-x:auto"><table class="cmp tmT"><tr><th>Día</th><th></th><th>Temp.</th><th>Lluvia</th><th>Viento</th><th>Desbroce</th></tr>${rows.join('')}</table></div>
      <div class="note" style="margin-top:8px">Lluvia de los 2 últimos días: ${fmt(llPrev, 1)} mm. Criterio orientativo: ❌ ≥ 5 mm o probabilidad ≥ 70 %; ⚠️ rachas ≥ 50 km/h (chispas con piedras) o ≥ 15 mm en 48 h (terreno blando). Datos: Open-Meteo (CC BY 4.0).</div>`;
  } catch (e) { const b = $('tmB'); if (b) b.textContent = 'No se pudo consultar el tiempo (¿sin conexión?): ' + e.message; }
}

/* ---- Notas y fotos de la finca ---- */
async function fotosDe(fid) { return (await DB.gAll('fotos')).filter(x => x.fincaId === fid).sort((a, b) => b.fecha - a.fecha); }
function redimensionar(file, max = 1280) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)), cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url); res(cv.toDataURL('image/jpeg', 0.72)); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('imagen no válida')); };
    img.src = url;
  });
}
async function notasSheet(f) {
  const fts = await fotosDe(f.id);
  sheet(`<h3>📝 Notas y fotos · ${esc(f.nombre)}</h3>
    <label class="f">Notas (accesos, portilla, piedras, contacto…)</label>
    <textarea class="inp" id="ntT" rows="4" style="resize:vertical">${esc(f.notas || '')}</textarea>
    <button class="btn sec" id="ntS" style="margin:8px 0 4px">Guardar notas</button>
    <div class="sgrp">Fotos (${fts.length})</div>
    <div class="fgrid">${fts.map(x => `<button class="fth" data-id="${x.id}" style="background-image:url(${x.img})"><span>${esc(x.caption || '')}</span></button>`).join('')}
      <label class="fth fadd">📷<span>Añadir</span><input type="file" id="ntF" accept="image/*" capture="environment" hidden></label></div>
    <div class="note">Si el GPS está activo, la foto queda situada en el mapa (📷).</div>`,
    sh => {
      $('ntS').onclick = async () => { f.notas = $('ntT').value.trim(); await DB.put(f); if (cur && cur.id === f.id) cur.notas = f.notas; toast('Notas guardadas'); };
      $('ntF').onchange = async e => {
        const file = e.target.files[0]; if (!file) return;
        try {
          const img = await redimensionar(file);
          const pos = lastPos && gpsAge() < 30 && lastPos.acc <= 30 ? lastPos : null;
          const x = { id: uid(), fincaId: f.id, img, caption: '', lat: pos ? +pos.lat.toFixed(7) : null, lon: pos ? +pos.lon.toFixed(7) : null, fecha: Date.now() };
          await DB.cPut('fotos', x); fotoSheet(f, x, true);
        } catch (er) { toast('No se pudo añadir la foto: ' + er.message); }
      };
      sh.querySelectorAll('[data-id]').forEach(b => b.onclick = () => fotoSheet(f, fts.find(x => x.id === b.dataset.id)));
    });
}
function fotoSheet(f, x, nueva) {
  sheet(`<img src="${x.img}" style="width:100%;border-radius:10px;margin-bottom:8px">
    <label class="f">Descripción</label><input class="inp" id="foC" value="${esc(x.caption || '')}" placeholder="p. ej. Piedra grande junto al regato">
    <div class="note">${new Date(x.fecha).toLocaleString('es-ES')}${x.lat ? ' · situada en el mapa' : ' · sin posición'}</div>
    <div class="row" style="margin-top:10px"><button class="btn err" id="foD">Eliminar</button>${x.lat && view === 'map' ? '<button class="btn sec" id="foM">Ver en mapa</button>' : ''}<button class="btn" id="foOk">${nueva ? 'Guardar' : 'Hecho'}</button></div>`,
    () => {
      $('foOk').onclick = async () => { const c = $('foC').value.trim(); if (c !== (x.caption || '')) { x.caption = c; await DB.cPut('fotos', x); } notasSheet(f); if (view === 'map') drawFotos(); };
      $('foD').onclick = async () => { await DB.cDel('fotos', x.id); notasSheet(f); if (view === 'map') drawFotos(); toastUndo('Foto eliminada', async () => { const y = { ...x }; delete y._sync; await DB.cPut('fotos', y); if (view === 'map') drawFotos(); }); };
      if ($('foM')) $('foM').onclick = () => { closeSheet(); map.setView([x.lat, x.lon], 19); };
    });
}
async function drawFotos() {
  if (!lyr.fotos) return; lyr.fotos.clearLayers(); if (!cur) return;
  for (const x of await fotosDe(cur.id)) if (x.lat) L.marker([x.lat, x.lon], { icon: L.divIcon({ className: '', html: '<div class="fpin">📷</div>', iconSize: [26, 26], iconAnchor: [13, 13] }) }).on('click', () => fotoSheet(cur, x)).addTo(lyr.fotos);
}


