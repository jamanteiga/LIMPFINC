'use strict';
/* =========================================================
   EXCLUSIONES
   ========================================================= */
function exclMenu() {
  if (busy()) return;
  const nM = (cur.exclusiones || []).length, nO = exclAbiertas(cur);
  sheet(`<h3>Zonas de exclusión</h3><div class="note" style="margin-bottom:8px">Rocas, pozos, zonas que no se pueden pisar. Se restan del área a limpiar.</div>
    <div class="srow"><span>Quedan exclusiones por medir</span><input type="checkbox" id="eExN" ${nO ? 'checked' : ''} style="width:auto"></div>
    <div class="note" id="eExS" style="margin-bottom:6px"></div>
    ${exclMetodosHTML()}
    ${(cur.exclusiones || []).length ? `<div class="sgrp">Existentes</div>` + cur.exclusiones.map(e => `<button class="opt" data-id="${e.id}">${esc(e.nombre)}<small>${fmtArea(Geo.areaLL(e.coords))} · tocar para editar o renombrar</small></button>`).join('') : ''}`,
    sh => {
      const est = v => { $('eExS').innerHTML = `Medidas: <b>${nM}</b>` + (v ? ' · se pueden añadir todas las que quieras.' : ' ✅ cerradas.'); };
      $('eExN').onchange = async () => { cur.exclPend = $('eExN').checked; est(cur.exclPend); await saveCur(); }; est(nO);
      exclMetodosBind(sh);
      sh.querySelectorAll('[data-id]').forEach(b => b.onclick = () => exclOpts(b.dataset.id));
    });
}
// formas de medir una exclusión (siempre se pueden añadir una o más)
const exclMetodosHTML = () => `<div class="sgrp">Con GPS, automático</div>
    <button class="opt" data-m="pie">🚶 Rodear a pie<small>Camina por el borde de la zona; se registra solo.</small></button>
    <button class="opt" data-m="trac">🚜 Rodear con el tractor<small>Por fuera de la zona, pegado a ella; se corrige hacia dentro medio ancho del tractor + holgura.</small></button>
    <div class="sgrp">Marcando puntos</div>
    <button class="opt" data-m="ptsPie">📍 Vértices con GPS, a pie<small>En cada vértice pulsas «Punto» (GPS promediado). Mínimo 3.</small></button>
    <button class="opt" data-m="ptsTrac">📍 Vértices con GPS, desde el tractor<small>Igual, con el tractor junto a cada vértice por fuera.</small></button>
    <button class="opt" data-m="draw">✍️ Tocando el mapa<small>Toca sus vértices en la pantalla.</small></button>
    <button class="opt" data-m="pto">⭕ Punto + radio<small>Árbol, poste, arqueta… varios seguidos (GPS o toque).</small></button>
    <div class="sgrp">Peligros</div>
    <button class="opt" data-m="pel">⚠️ Peligro tocando el mapa<small>Piedra, árbol caído, obstáculo o prohibido pasar: con señal en el mapa.</small></button>`;
function exclMetodosBind(sh) {
  const go = {
    pie: () => startRec('excl', 'pie'), trac: () => tractorSetup('excl'), ptsPie: () => startRec('excl', 'pie', true), ptsTrac: () => tractorSetup('excl', true),
    draw: () => startDraw('excl'), pto: () => exclPuntos(), pel: () => peligroTocar()
  };
  sh.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { closeSheet(); go[b.dataset.m](); });
}
// exclusiones rápidas: punto (GPS promediado o toque en el mapa) + radio → círculo de 16 lados; se encadenan
let ptoW = null;
function exclPuntos() {
  ptoW = { r: SB.radioExcl || 0.5, n: 0, avg: null };
  map.on('click', ptoClick); ptoPanel();
}
function ptoPanel() {
  const m = (cur.exclusiones || []).length;
  showTool('Exclusiones: punto + radio', `<div class="srow" style="margin:0 0 6px"><span>Radio (m)</span><span style="display:flex;gap:6px;align-items:center"><button class="btn sec" id="ptM" style="width:44px;padding:8px 0">−</button><b id="ptR" style="min-width:40px;text-align:center">${fmt(ptoW.r, 2)}</b><button class="btn sec" id="ptP" style="width:44px;padding:8px 0">＋</button></span></div>
    Colócate junto al objeto y pulsa «GPS», o tócalo en el mapa. ${ptoW.n ? `<b>${ptoW.n}</b> añadida${ptoW.n > 1 ? 's' : ''} · ` : ''}${m} en total.`,
    [['Terminar', 'sec', ptoFin], ['GPS (' + (SB.promedioS || 10) + ' s)', '', ptoGPS]]);
  const st = d => { ptoW.r = Math.max(0.1, Math.min(20, Math.round((ptoW.r + d) * 100) / 100)); SB.radioExcl = ptoW.r; $('ptR').textContent = fmt(ptoW.r, 2); };
  $('ptM').onclick = () => st(ptoW.r > 1 ? -0.25 : -0.05); $('ptP').onclick = () => st(ptoW.r >= 1 ? 0.25 : 0.05);
}
function ptoFin() { if (ptoW && ptoW.avg) clearInterval(ptoW.avg); map.off('click', ptoClick); ptoW = null; DB.kvPut('settings', SB); showMain(); guiaExcl(true); }
function ptoClick(e) { if (!ptoW || ptoW.avg) return; ptoAdd([e.latlng.lat, e.latlng.lng], null); }
async function ptoAdd(ll, acc) {
  const P = Geo.projFor([ll]), c = P.fwd(ll[0], ll[1]), xy = [];
  for (let k = 0; k < 16; k++) { const a = k / 16 * 2 * Math.PI; xy.push([c[0] + ptoW.r * Math.cos(a), c[1] + ptoW.r * Math.sin(a)]); }
  cur.exclusiones = cur.exclusiones || [];
  const n = cur.exclusiones.length + 1;
  cur.exclusiones.push({ id: uid(), nombre: 'Exclusión ' + n, coords: Geo.toLL(xy, P).map(q => [+q[0].toFixed(8), +q[1].toFixed(8)]), metodo: 'punto', centro: [+ll[0].toFixed(8), +ll[1].toFixed(8)], radio: ptoW.r, prec: acc, fecha: Date.now() });
  await saveCur(); drawFinca(); ptoW.n++;
  toast(`Exclusión ${n} · r ${fmt(ptoW.r, 2)} m${acc ? ' · ±' + fmt(acc, 1) + ' m' : ''}`);
  ptoPanel();
}
function ptoGPS() {
  if (ptoW.avg) return;
  const seg = SB.promedioS || 10;
  ptoW.avg = avgGPS(seg, (n, k) => { $('toolHint').innerHTML = `Promediando GPS… ${n} s · ${k} lecturas. No te muevas.`; }, (ll, acc) => {
    ptoW.avg = null;
    if (!ll) { toast('Precisión GPS insuficiente: espera o toca el objeto en el mapa'); return ptoPanel(); }
    ptoAdd(ll, acc);
  });
}
function exclOpts(id) {
  const e = cur.exclusiones.find(x => x.id === id);
  sheet(`<h3>${esc(e.nombre)}</h3><label class="f">Nombre</label><input class="inp" id="xN" value="${esc(e.nombre)}">
    <div class="row" style="margin-top:12px"><button class="btn err" id="xD">Eliminar</button><button class="btn sec" id="xE">Editar vértices</button><button class="btn" id="xS">Guardar</button></div>`,
    () => {
      $('xS').onclick = async () => { e.nombre = $('xN').value.trim() || e.nombre; await saveCur(); closeSheet(); drawFinca(); };
      $('xE').onclick = () => { closeSheet(); startEdit('excl', id); };
      $('xD').onclick = () => confirmSheet(`¿Eliminar «${esc(e.nombre)}»?`, 'Eliminar', async () => {
        const f0 = cur; cur.exclusiones = cur.exclusiones.filter(x => x.id !== id); await saveCur(); drawFinca();
        toastUndo(`«${e.nombre}» eliminada`, async () => { f0.exclusiones.push(e); if (cur === f0) { await saveCur(); drawFinca(); } else await DB.put(f0); });
      }, true);
    });
}

/* =========================================================
   DATOS DE LA FINCA
   ========================================================= */
function infoSheet() {
  const a = fincaAreas(cur);
  const ancho = Math.max(0.1, S.aperoAncho - S.solape);
  const hPrev = a.neta / (ancho * S.velocidad * 1000); // h
  const met = { pie: 'A pie (GPS)', tractor: 'Con tractor (GPS)', manual: 'Dibujo manual' };
  sheet(`<h3>${esc(cur.nombre)}</h3>
    <div class="card">
      <div class="kv"><span>Tipo</span><span>${cur.tipo === 'monte' ? 'Monte / plantación' : 'Abierta'}</span></div>
      <div class="kv"><span>Tractor</span><span>${esc(S.tractor)}</span></div>
      <div class="kv"><span>Apero</span><span>${esc(S.aperoNombre)} (${fmt(S.aperoAncho, 2)} m)</span></div>
      <div class="kv"><span>Velocidad · vegetación</span><span>${fmt(S.velocidad, 1)} km/h · ${vegNom((cur.config || {}).vegetacion || 'media')}</span></div>
      <div class="kv"><span>Linde</span><span>${cur.linde ? met[cur.linde.metodo] || cur.linde.metodo : '—'}</span></div>
      ${cur.linde && cur.linde.accMed ? `<div class="kv"><span>Precisión media medición</span><span>±${fmt(cur.linde.accMed, 1)} m</span></div>` : ''}
      ${cur.linde && cur.linde.offset ? `<div class="kv"><span>Corrección tractor</span><span>${fmt(cur.linde.offset, 2)} m</span></div>` : ''}
    </div>
    <div class="card">
      <div class="kv"><span>Área total (linde)</span><span>${fmtArea(a.bruta)}</span></div>
      <div class="kv"><span>Exclusiones (${(cur.exclusiones || []).length})</span><span>− ${fmtArea(a.excl)}</span></div>
      <div class="kv"><span>Área a limpiar</span><span style="color:var(--pri)">${fmtArea(a.neta)}</span></div>
      <div class="kv"><span>Perímetro</span><span>${fmt(a.perim, 0)} m</span></div>
      <div class="kv"><span>Superficie en m²</span><span>${fmt(a.neta, 0)} m²</span></div>
    </div>
    ${cur.plan ? `<div class="card"><h3>Plan ${planStale(cur) ? '<span style="color:var(--warn)">(desactualizado)</span>' : ''}</h3>
      <div class="kv"><span>Tiempo</span><span>${fmtH(cur.plan.stats.t.total / 3600)}</span></div>
      <div class="kv"><span>Combustible</span><span>${fmt(cur.plan.stats.litros, 1)} L</span></div>
      <div class="kv"><span>Trayectoria ideal</span><span>${fmt(cur.plan.stats.L.total, 0)} m</span></div>
      <div class="kv"><span>Cobertura teórica</span><span>${fmt(cur.plan.stats.area.cobertura * 100, 1)} %</span></div></div>` : ''}
    ${a.neta > 0 && cur.tipo !== 'monte' && !cur.plan ? `<div class="card"><h3>Estimación preliminar</h3>
      <div class="kv"><span>Tiempo (sin giros)</span><span>${fmtH(hPrev)}</span></div>
      <div class="kv"><span>Combustible (sin giros)</span><span>${fmt(hPrev * S.consumo, 1)} L</span></div>
      <div class="note">Ancho efectivo ${fmt(ancho, 2)} m · ${fmt(S.velocidad, 1)} km/h · ${fmt(S.consumo, 1)} L/h. Calcula el plan (🧭) para incluir giros y traslados.</div></div>` : ''}
    ${cur.notas ? `<div class="note">${esc(cur.notas)}</div>` : ''}
    <button class="btn sec" id="iGeo" style="margin-top:4px">Exportar finca (GeoJSON)</button>`,
    () => { $('iGeo').onclick = exportGeoJSON; });
}
const fmtH = h => { const m = Math.round(h * 60); return Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') + ' min'; };
function exportGeoJSON() {
  const ring = c => { const r = c.map(p => [p[1], p[0]]); r.push(r[0]); return [r]; };
  const feats = [];
  if (cur.linde) feats.push({ type: 'Feature', properties: { tipo: 'linde', nombre: cur.nombre, area_m2: Math.round(Geo.areaLL(cur.linde.coords)) }, geometry: { type: 'Polygon', coordinates: ring(cur.linde.coords) } });
  (cur.exclusiones || []).forEach(e => feats.push({ type: 'Feature', properties: { tipo: 'exclusion', nombre: e.nombre, area_m2: Math.round(Geo.areaLL(e.coords)) }, geometry: { type: 'Polygon', coordinates: ring(e.coords) } }));
  if (cur.plan) cur.plan.parts.forEach((p, i) => feats.push({ type: 'Feature', properties: { tipo: 'plan_' + p.type, orden: i }, geometry: { type: 'LineString', coordinates: p.ll.map(q => [q[1], q[0]]) } }));
  const blob = new Blob([JSON.stringify({ type: 'FeatureCollection', features: feats }, null, 1)], { type: 'application/geo+json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = cur.nombre.replace(/[^\w\-]+/g, '_') + '.geojson'; a.click();
}

