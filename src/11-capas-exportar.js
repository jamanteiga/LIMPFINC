'use strict';
/* =========================================================
   F5 — FILTROS DE CAPAS, HISTÓRICO, EXPORTACIÓN
   ========================================================= */
const CFG_DEF = { area: true, excl: true, arboles: true, plan: true, noAlc: false, real: true, desv: true, limpia: true, solape: true, pendiente: false, lentas: false, inclina: true };
let CFG = { ...CFG_DEF }, viewTrab = null;
const CAPAS = [
  ['area', 'Área finca (linde)', '#a5d6a7'], ['excl', 'Exclusiones', '#757575'], ['arboles', 'Árboles', '#33691e'],
  ['plan', 'Trayectoria ideal', '#1565c0'], ['noAlc', 'Zonas no alcanzadas (plan)', '#ff9800'],
  ['real', 'Trayectoria real', '#7b1fa2'], ['desv', 'Desviaciones', '#d50000'],
  ['limpia', 'Área real limpia', '#1b5e20'], ['solape', 'Solape (≥ 2 pasadas)', '#fdd835'], ['pendiente', 'Zonas sin limpiar (rojo)', '#d32f2f'], ['lentas', 'Zonas lentas (aprendidas)', '#ef6c00'], ['inclina', 'Puntos de inclinación 📐', '#d50000']
];
const PRESETS_DEF = [
  { nombre: 'Todo', cfg: { ...CFG_DEF, noAlc: true, pendiente: true } },
  { nombre: 'Plan', cfg: { area: true, excl: true, arboles: true, plan: true, noAlc: true, real: false, desv: false, limpia: false, solape: false, pendiente: false } },
  { nombre: 'Ideal vs real', cfg: { area: true, excl: true, arboles: false, plan: true, noAlc: false, real: true, desv: true, limpia: false, solape: false, pendiente: false } },
  { nombre: 'Cobertura', cfg: { area: false, excl: true, arboles: false, plan: false, noAlc: false, real: false, desv: false, limpia: true, solape: true, pendiente: true } }
];
async function saveCfg() { try { await DB.kvPut('capas', CFG); } catch { } }

/* Dibujo del trabajo seleccionado (fuera del modo trabajo) */
async function drawTrabView() {
  lyr.real.clearLayers(); lyr.desv.clearLayers(); if (lyr.cov) { map.removeLayer(lyr.cov); lyr.cov = null; }
  if (work) { drawRuns(work.outs, CFG, lyr.real, lyr.desv); drawCov(work.g); return; }
  if (!cur || !cur.linde) return;
  const trs = await DB.tByFinca(cur.id);
  const t = trs.find(x => x.id === viewTrab) || (viewTrab === 'none' ? null : trs[0]);
  if (!t || !(CFG.real || CFG.desv || CFG.limpia || CFG.solape || CFG.pendiente)) return;
  const key = t.id + ':' + t.sesiones.reduce((s, x) => s + x.pts.length, 0) + ':' + geomKey(cur) + ':' + (cur.plan ? cur.plan.fecha : 0);
  if (!trabCache || trabCache.key !== key) trabCache = { key, ...rebuildTrab(cur, t) };
  drawRuns(trabCache.outs, CFG, lyr.real, lyr.desv);
  drawCov(trabCache.g);
}

async function capasSheet() {
  const trs = cur ? await DB.tByFinca(cur.id) : [];
  const pres = (await DB.kvGet('filtros')) || [];
  const sel = viewTrab && trs.some(t => t.id === viewTrab) ? viewTrab : viewTrab === 'none' ? 'none' : (trs[0] ? trs[0].id : 'none');
  sheet(`<h3>Capas y filtros</h3>
    <div class="sgrp">Filtros</div>
    <div class="chips">${[...PRESETS_DEF, ...pres].map((p, i) => `<button class="chip" data-p="${i}">${esc(p.nombre)}${i >= PRESETS_DEF.length ? ' <span data-del="' + (i - PRESETS_DEF.length) + '">✕</span>' : ''}</button>`).join('')}</div>
    <div class="sgrp">Capas</div>
    <div class="card">${CAPAS.map(([k, n, c]) => `<label class="srow" style="cursor:pointer"><span><i class="sw" style="background:${c}"></i>${n}</span><input type="checkbox" data-k="${k}" ${CFG[k] ? 'checked' : ''} style="width:auto"></label>`).join('')}</div>
    <div class="sgrp">Trabajo mostrado</div>
    <select class="inp" id="cTrab">${trs.map(t => `<option value="${t.id}" ${t.id === sel ? 'selected' : ''}>${new Date(t.inicio).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })} · ${t.estado}${t.resumen ? ' · ' + fmt(t.resumen.cobertura * 100, 0) + ' %' : ''}</option>`).join('')}<option value="none" ${sel === 'none' ? 'selected' : ''}>Ninguno</option></select>
    <button class="btn sec" id="cSave" style="margin-top:12px">💾 Guardar combinación actual como filtro</button>`,
    sh => {
      sh.querySelectorAll('[data-k]').forEach(i => i.onchange = () => { CFG[i.dataset.k] = i.checked; saveCfg(); drawFinca(); });
      $('cTrab').onchange = e => { viewTrab = e.target.value; trabCache = null; drawFinca(); };
      sh.querySelectorAll('.chip').forEach(b => b.onclick = async ev => {
        const d = ev.target.dataset.del;
        if (d != null) { pres.splice(+d, 1); await DB.kvPut('filtros', pres); return capasSheet(); }
        CFG = { ...CFG_DEF, ...[...PRESETS_DEF, ...pres][+b.dataset.p].cfg }; saveCfg(); drawFinca(); capasSheet();
      });
      $('cSave').onclick = () => sheet(`<h3>Nuevo filtro</h3><label class="f">Nombre</label><input class="inp" id="fpN" placeholder="p. ej. Revisión desvíos"><button class="btn" id="fpOk" style="margin-top:12px">Guardar</button>`,
        () => { $('fpOk').onclick = async () => { const n = $('fpN').value.trim(); if (!n) return toast('Indica un nombre'); pres.push({ nombre: n, cfg: { ...CFG } }); await DB.kvPut('filtros', pres); capasSheet(); }; });
    });
}

/* Histórico y comparación */
async function historicoSheet() {
  const trs = await DB.tByFinca(cur.id);
  if (!trs.length) return toast('Aún no hay trabajos registrados en esta finca');
  for (const t of trs) if (!t.resumen) { t.resumen = resumenTrab(t, rebuildTrab(cur, t)); }
  const pc = v => v == null ? '–' : fmt(v * 100, 0) + ' %';
  sheet(`<h3>Histórico · ${esc(cur.nombre)}</h3>
    ${trs.map(t => `<button class="opt" data-id="${t.id}">${new Date(t.inicio).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })} ${t.estado === 'abierto' ? '<b style="color:var(--warn)">· abierto</b>' : ''}
      <small>${fmtH(t.resumen.horas)} · ${fmtArea(t.resumen.limpia)} · cobertura ${pc(t.resumen.cobertura)} · η ${pc(t.resumen.eta)} · ${fmt(t.resumen.litros, 1)} L</small></button>`).join('')}
    ${trs.length > 1 ? '<button class="btn sec" id="hCmp" style="margin-top:6px">📊 Comparar trabajos</button>' : ''}`,
    sh => {
      sh.querySelectorAll('[data-id]').forEach(b => b.onclick = () => trabOpts(trs.find(t => t.id === b.dataset.id)));
      if ($('hCmp')) $('hCmp').onclick = () => compararSheet(trs);
    });
}
function trabOpts(t) {
  sheet(`<h3>${esc(nomRuta(t))}</h3><div class="note">${fFecha(t.inicio)}${planDeRuta(t) ? ' · ' + esc(planDeRuta(t).nombre) : ''}</div>
    <button class="opt" id="tVer">🗺 Ver en el mapa</button>
    <button class="opt" id="tRoj">🔴 Ver zonas sin limpiar</button>
    <button class="opt" id="tRep">🧹 Repaso de zonas sin limpiar<small>Plan corto solo por lo rojo.</small></button>
    <button class="opt" id="tVel">🎨 Velocidad y paradas<small>La ruta coloreada por velocidad y las paradas marcadas.</small></button>
    <button class="opt" id="tRes">📋 Resumen</button>
    <button class="opt" id="tAn">📊 Analizar frente al plan</button>
    <button class="opt" id="tEd">✎ Nombre y nota</button>
    <button class="opt" id="tCp">⧉ Copiar</button>
    <button class="opt" id="tPdf">📄 Parte en PDF</button>
    ${t.estado === 'abierto' ? '<button class="opt" id="tCont">▶️ Continuar desde donde quedó</button><button class="opt" id="tCer">✅ Marcar como finalizado</button>' : ''}
    <button class="opt" id="tDel" style="color:var(--err)">🗑 Eliminar</button>`,
    () => {
      $('tVer').onclick = () => { viewTrab = t.id; trabCache = null; closeSheet(); drawFinca(); };
      $('tRes').onclick = () => resumenSheet(t); $('tVel').onclick = () => verVelocidad(t);
      $('tRoj').onclick = () => verSinLimpiar(t); $('tRep').onclick = () => repasoSheet(t);
      $('tAn').onclick = () => analizarRutas([t]);
      $('tPdf').onclick = () => pdfDoc(cur, t);
      $('tCp').onclick = () => copiarRuta(t);
      $('tEd').onclick = () => sheet(`<h3>✎ ${esc(nomRuta(t))}</h3><label class="f">Nombre</label><input class="inp" id="teN" value="${esc(nomRuta(t))}"><label class="f">Nota</label><input class="inp" id="teT" value="${esc(t.nota || '')}"><button class="btn" id="teOk" style="margin-top:10px">Guardar</button>`,
        () => { $('teOk').onclick = async () => { t.nombre = $('teN').value.trim() || ('Ruta ' + t.num); t.nota = $('teT').value.trim(); await DB.tPut(t); closeSheet(); rutasSheet(); }; });
      if ($('tCont')) $('tCont').onclick = () => { closeSheet(); startWork(t); };
      if ($('tCer')) $('tCer').onclick = async () => { t.estado = 'cerrado'; t.resumen = resumenTrab(t, rebuildTrab(cur, t)); await DB.tPut(t); closeSheet(); toast('Trabajo finalizado'); };
      $('tDel').onclick = () => confirmSheet('¿Eliminar este trabajo y su recorrido?', 'Eliminar', async () => {
        await DB.tDel(t.id); trabCache = null; if (viewTrab === t.id) viewTrab = null; drawFinca();
        toastUndo('Trabajo eliminado', async () => { const x = { ...t }; delete x._sync; await DB.tPut(x); trabCache = null; drawFinca(); });
      }, true);
    });
}
function compararSheet(trs) {
  const rows = [
    ['Fecha', t => new Date(t.inicio).toLocaleDateString('es-ES')],
    ['Estado', t => t.estado], ['Tiempo', t => fmtH(t.resumen.horas)],
    ['Limpia', t => fmtArea(t.resumen.limpia)], ['Cobertura', t => fmt(t.resumen.cobertura * 100, 1) + ' %'],
    ['Solape', t => fmt(t.resumen.solapePct * 100, 1) + ' %'], ['L real', t => fmt(t.resumen.L, 0) + ' m'],
    ['η', t => t.resumen.eta == null ? '–' : fmt(t.resumen.eta * 100, 1) + ' %'],
    ['Desv. media', t => t.resumen.devMed == null ? '–' : fmt(t.resumen.devMed, 2) + ' m'],
    ['v media', t => t.resumen.vMedia == null ? '–' : fmt(t.resumen.vMedia, 2) + ' km/h'],
    ['Litros', t => fmt(t.resumen.litros, 1)], ['ha/h', t => t.resumen.haH == null ? '–' : fmt(t.resumen.haH, 2)],
    ['L/ha', t => t.resumen.LHa == null ? '–' : fmt(t.resumen.LHa, 1)]
  ];
  sheet(`<h3>Comparación de trabajos</h3><div style="overflow-x:auto"><table class="cmp">
    ${rows.map(([n, f]) => `<tr><th>${n}</th>${trs.map(t => `<td>${f(t)}</td>`).join('')}</tr>`).join('')}</table></div>`);
}

/* ---------- Exportación ---------- */
function utm(lat, lon, zone) {
  const a = 6378137, f = 1 / 298.257223563, e2 = f * (2 - f), ep2 = e2 / (1 - e2), k0 = 0.9996;
  zone = zone || Math.floor((lon + 180) / 6) + 1;
  const l0 = ((zone - 1) * 6 - 180 + 3) * D2R, phi = lat * D2R, lam = lon * D2R;
  const N = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2), T = Math.tan(phi) ** 2, C = ep2 * Math.cos(phi) ** 2, A = Math.cos(phi) * (lam - l0);
  const M = a * ((1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256) * phi - (3 * e2 / 8 + 3 * e2 ** 2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * phi) + (15 * e2 ** 2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * phi) - (35 * e2 ** 3 / 3072) * Math.sin(6 * phi));
  const x = k0 * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5 / 120) + 500000;
  let y = k0 * (M + N * Math.tan(phi) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A ** 4 / 24 + (61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6 / 720));
  if (lat < 0) y += 1e7;
  return [x, y, zone];
}
function download(name, text, type) {
  const blob = new Blob([text], { type }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
const safeName = s => s.replace(/[^\w\-áéíóúñÁÉÍÓÚÑ]+/g, '_');
async function exportData() {
  const trs = await DB.tByFinca(cur.id), t = trs.find(x => x.id === viewTrab) || trs[0] || null;
  let R = null; if (t) R = rebuildTrab(cur, t);
  const real = [];
  if (R) { let run = []; R.outs.forEach(o => { if (!o) { if (run.length > 1) real.push(run); run = []; } else run.push({ ll: o[0], on: o[1], flag: o[2] }); }); if (run.length > 1) real.push(run); }
  return { f: cur, t, R, real };
}
async function exportSheet() {
  const trs = await DB.tByFinca(cur.id);
  const t = trs.find(x => x.id === viewTrab) || trs[0];
  sheet(`<h3>Exportar · ${esc(cur.nombre)}</h3>
    <div class="note" style="margin-bottom:8px">Incluye linde, exclusiones, árboles, plan${t ? ' y el trabajo del ' + new Date(t.inicio).toLocaleDateString('es-ES') : ''}.</div>
    <button class="opt" id="xDxf">📐 DXF (AutoCAD)<small>ETRS89 / UTM, capas separadas.</small></button>
    <button class="opt" id="xKml">🌍 KML (QGIS, gvSIG, visores GIS)</button>
    <button class="opt" id="xGpx">🛰 GPX</button>
    <button class="opt" id="xJson">📦 JSON de LIMPFINC<small>Para importar la finca en otro móvil o guardarla.</small></button>
    <button class="opt" id="xGeo">🧩 GeoJSON</button>
    <button class="opt" id="xPel">⚠️ Peligros (KML / GPX)<small>Para TopoGPS, OsmAnd, QGIS o Garmin.</small></button>
    <button class="opt" id="xM3d">🏔 Mapa 3D del terreno<small>KML, GPX, GeoJSON, CSV, XYZ y DXF 3D.</small></button>
    ${t ? '<button class="opt" id="xCsv">📄 CSV de puntos GPS del trabajo</button>' : ''}`,
    () => {
      $('xDxf').onclick = async () => download(safeName(cur.nombre) + '.dxf', buildDXF(await exportData()), 'application/dxf');
      $('xKml').onclick = async () => download(safeName(cur.nombre) + '.kml', buildKML(await exportData()), 'application/vnd.google-earth.kml+xml');
      $('xGpx').onclick = async () => download(safeName(cur.nombre) + '.gpx', buildGPX(await exportData()), 'application/gpx+xml');
      $('xGeo').onclick = exportGeoJSON; $('xPel').onclick = () => exportPelSheet(cur); $('xM3d').onclick = () => mapa3DSheet(cur);
      $('xJson').onclick = () => exportarFincaJSON(cur);
      if ($('xCsv')) $('xCsv').onclick = () => {
        let s = 'sesion;fecha_hora;lat;lon;precision_m;apero\n';
        t.sesiones.forEach((x, i) => x.pts.forEach(p => { s += `${i + 1};${new Date(p[3]).toISOString()};${p[0]};${p[1]};${String(p[2]).replace('.', ',')};${p[4] ? 'trabajo' : 'levantado'}\n`; }));
        download(safeName(cur.nombre) + '_trabajo.csv', s, 'text/csv');
      };
    });
}
function buildDXF({ f, real }) {
  const zone = Math.floor((f.linde.coords[0][1] + 180) / 6) + 1;
  const U = ll => utm(ll[0], ll[1], zone);
  const out = ['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '6', '0', 'ENDSEC', '0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LAYER', '70', '10'];
  const layers = [['LINDE', 3], ['EXCLUSIONES', 8], ['ARBOLES', 94], ['PLAN_TRABAJO', 5], ['PLAN_GIROS', 4], ['PLAN_MARCHA_ATRAS', 4], ['PLAN_TRASLADOS', 151], ['REAL_TRABAJO', 6], ['REAL_LEVANTADO', 216], ['DESVIOS', 1], ['TEXTOS', 7]];
  layers.forEach(([n, c]) => out.push('0', 'LAYER', '2', n, '70', '0', '62', String(c), '6', 'CONTINUOUS'));
  out.push('0', 'ENDTAB', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES');
  const pl = (ll, layer, closed) => { out.push('0', 'POLYLINE', '8', layer, '66', '1', '70', closed ? '1' : '0'); ll.forEach(p => { const [x, y] = U(p); out.push('0', 'VERTEX', '8', layer, '10', x.toFixed(3), '20', y.toFixed(3), '30', '0'); }); out.push('0', 'SEQEND', '8', layer); };
  pl(f.linde.coords, 'LINDE', true);
  (f.exclusiones || []).forEach(e => pl(e.coords, 'EXCLUSIONES', true));
  if (f.malla && f.malla.arboles) f.malla.arboles.forEach(a => { if (a[4]) return; const [x, y] = U(a); out.push('0', 'CIRCLE', '8', 'ARBOLES', '10', x.toFixed(3), '20', y.toFixed(3), '30', '0', '40', '0.3'); });
  if (f.plan) f.plan.parts.forEach(p => pl(p.ll, { trabajo: 'PLAN_TRABAJO', giro: 'PLAN_GIROS', reversa: 'PLAN_MARCHA_ATRAS', tras: 'PLAN_TRASLADOS' }[p.type], false));
  real.forEach(run => {
    let cur_ = [], st = null;
    const flush = () => { if (cur_.length > 1) pl(cur_, st ? 'REAL_TRABAJO' : 'REAL_LEVANTADO', false); };
    run.forEach(q => { if (st !== q.on && cur_.length) { flush(); cur_ = [cur_[cur_.length - 1]]; } st = q.on; cur_.push(q.ll); }); flush();
    let d = [];
    run.forEach(q => { if (q.flag) d.push(q.ll); else { if (d.length > 1) pl(d, 'DESVIOS', false); d = []; } }); if (d.length > 1) pl(d, 'DESVIOS', false);
  });
  const c = U(f.linde.coords[0]);
  out.push('0', 'TEXT', '8', 'TEXTOS', '10', c[0].toFixed(3), '20', (c[1] + 3).toFixed(3), '30', '0', '40', '2', '1', `${f.nombre} - ETRS89 UTM ${zone}N - ${fmtArea(Geo.areaLL(f.linde.coords))}`);
  out.push('0', 'ENDSEC', '0', 'EOF');
  return out.join('\r\n');
}
function buildKML({ f, t, real }) {
  const c = ll => ll.map(p => `${p[1]},${p[0]},0`).join(' ');
  const ring = ll => c([...ll, ll[0]]);
  const sty = (id, line, w, fill) => `<Style id="${id}"><LineStyle><color>${line}</color><width>${w}</width></LineStyle><PolyStyle><color>${fill || '00000000'}</color></PolyStyle></Style>`;
  const pm = (name, st, geom) => `<Placemark><name>${esc(name)}</name><styleUrl>#${st}</styleUrl>${geom}</Placemark>`;
  const ls = ll => `<LineString><tessellate>1</tessellate><coordinates>${c(ll)}</coordinates></LineString>`;
  let k = `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${esc(f.nombre)}</name>` +
    sty('linde', 'ff205e1b', 3, '66a7d6a5') + sty('excl', 'ff1c1cb7', 2, '99757575') + sty('plan', 'ffc06515', 2) + sty('giro', 'ffe5881e', 1) + sty('tras', 'fff6b564', 1) + sty('real', 'ffa21f7b', 3) + sty('lev', '99a21f7b', 1) + sty('desv', 'ff0000d5', 4);
  k += `<Folder><name>Finca</name>` + pm('Linde', 'linde', `<Polygon><outerBoundaryIs><LinearRing><coordinates>${ring(f.linde.coords)}</coordinates></LinearRing></outerBoundaryIs></Polygon>`);
  (f.exclusiones || []).forEach(e => k += pm(e.nombre, 'excl', `<Polygon><outerBoundaryIs><LinearRing><coordinates>${ring(e.coords)}</coordinates></LinearRing></outerBoundaryIs></Polygon>`));
  if (f.malla && f.malla.arboles) k += pm('Árboles', 'linde', `<MultiGeometry>${f.malla.arboles.filter(a => !a[4]).map(a => `<Point><coordinates>${a[1]},${a[0]},0</coordinates></Point>`).join('')}</MultiGeometry>`);
  k += '</Folder>';
  if ((f.peligros || []).length) k += `<Folder><name>Peligros</name>${f.peligros.map(p => `<Placemark><name>${esc(PEL[p.tipo][1])}</name><description>${esc('radio ' + fmt(p.radio, 1) + ' m' + (p.nota ? ' · ' + p.nota : ''))}</description><Style><IconStyle><color>ff1c1cb7</color></IconStyle></Style><Point><coordinates>${p.ll[1]},${p.ll[0]},0</coordinates></Point></Placemark>`).join('')}</Folder>`;
  if (f.plan) k += `<Folder><name>Plan (ideal)</name>${f.plan.parts.map((p, i) => pm(`${i + 1} ${p.type}`, p.type === 'trabajo' ? 'plan' : p.type === 'tras' ? 'tras' : 'giro', ls(p.ll))).join('')}</Folder>`;
  if (real.length) {
    k += `<Folder><name>Real ${t ? new Date(t.inicio).toLocaleDateString('es-ES') : ''}</name>`;
    real.forEach((run, i) => { k += pm('Sesión ' + (i + 1), 'real', ls(run.map(q => q.ll))); let d = []; run.forEach(q => { if (q.flag) d.push(q.ll); else { if (d.length > 1) k += pm('Desvío', 'desv', ls(d)); d = []; } }); if (d.length > 1) k += pm('Desvío', 'desv', ls(d)); });
    k += '</Folder>';
  }
  return k + '</Document></kml>';
}
function buildGPX({ f, t }) {
  const pt = (p, tag, extra = '') => `<${tag} lat="${p[0]}" lon="${p[1]}">${extra}</${tag}>`;
  let g = `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="LIMPFINC" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>${esc(f.nombre)}</name></metadata>`;
  g += `<trk><name>Linde</name><trkseg>${[...f.linde.coords, f.linde.coords[0]].map(p => pt(p, 'trkpt')).join('')}</trkseg></trk>`;
  (f.exclusiones || []).forEach(e => g += `<trk><name>${esc(e.nombre)}</name><trkseg>${[...e.coords, e.coords[0]].map(p => pt(p, 'trkpt')).join('')}</trkseg></trk>`);
  (f.peligros || []).forEach(p => { g = g.replace('</metadata>', `</metadata><wpt lat="${p.ll[0]}" lon="${p.ll[1]}"><name>${esc(PEL[p.tipo][1])}</name><desc>${esc('radio ' + fmt(p.radio, 1) + ' m' + (p.nota ? ' · ' + p.nota : ''))}</desc><sym>Danger Area</sym></wpt>`); });
  if (f.plan) g += `<trk><name>Plan ideal</name>${f.plan.parts.map(p => `<trkseg>${p.ll.map(q => pt(q, 'trkpt')).join('')}</trkseg>`).join('')}</trk>`;
  if (t) g += `<trk><name>Trabajo ${new Date(t.inicio).toLocaleDateString('es-ES')}</name>${t.sesiones.map(s => `<trkseg>${s.pts.map(q => pt(q, 'trkpt', `<time>${new Date(q[3]).toISOString()}</time><hdop>${(q[2] / 5).toFixed(1)}</hdop>`)).join('')}</trkseg>`).join('')}</trk>`;
  return g + '</gpx>';
}

/* Menú de la finca (⋯) */
function fincaMenu() {
  if (busy()) return toast('Termina o cancela la operación en curso');
  sheet(`<h3>${esc(cur.nombre)}</h3>
    <button class="opt" id="fmCap">🗂 Capas y filtros</button>
    <button class="opt" id="fmPla">🧭 Planes guardados</button>
    <button class="opt" id="fmHis">🛤 Rutas de trabajo (guardadas y análisis)</button>
    <button class="opt" id="fmApr">🧠 Lo aprendido<small>Velocidad real, giros, traslados y zonas lentas de tus rutas.</small></button>
    <button class="opt" id="fmRep">🧹 Repaso de zonas sin limpiar<small>Plan corto por lo que quedó en rojo en una ruta.</small></button>
    <button class="opt" id="fmInf">📄 Informe anual (PDF) y hoja de cálculo</button>
    <button class="opt" id="fmPel">⚠️ Peligros (piedras, árboles caídos…)${(cur.peligros || []).length ? ' (' + cur.peligros.length + ')' : ''}</button>
    ${cur.tipo === 'monte' ? '<button class="opt" id="fmMal">🌳 Arboleda (marcar árboles)</button>' : ''}
    <button class="opt" id="fmInc">📍 Incidencias${(cur.incidencias || []).filter(i => !i.resuelta).length ? ' (' + cur.incidencias.filter(i => !i.resuelta).length + ')' : ''}</button>
    <button class="opt" id="fmPre">💶 Presupuesto</button>
    <button class="opt" id="fmM3d">🏔 Mapa 3D del terreno<small>Con los puntos con altura registrados cada 2 s al trabajar.</small></button>
    <button class="opt" id="fmExp">📤 Exportar (DXF, KML, GPX, GeoJSON, CSV)</button>
    <button class="opt" id="fmFuel">⛽ Registrar repostaje</button>
    <button class="opt" id="fmEd">✎ Editar finca (tractor, apero, velocidad)</button>
    ${cur.linde ? '<button class="opt" id="fmRe">🔄 Recalcular plan (velocidad y parámetros)</button>' : ''}
    <button class="opt" id="fmCp">⧉ Copiar finca</button>
    <button class="opt" id="fmNot">📝 Notas y fotos</button>
    ${cur.linde ? '<button class="opt" id="fmTie">🌦 Tiempo (5 días)</button>' : ''}
    <button class="opt" id="fmSw">📂 Cambiar de finca</button>
    <button class="opt" id="fmNew">＋ Nueva finca</button>`,
    () => {
      $('fmCap').onclick = capasSheet; $('fmHis').onclick = rutasSheet; $('fmPla').onclick = planesSheet; $('fmRep').onclick = () => repasoSheet(); $('fmApr').onclick = () => aprendizajeSheet(cur); $('fmInf').onclick = () => informeSheet(cur); $('fmPel').onclick = () => peligrosLista(cur); $('fmExp').onclick = exportSheet; $('fmM3d').onclick = () => mapa3DSheet(cur); $('fmInc').onclick = () => incidenciasLista(cur); $('fmPre').onclick = () => presupuestoSheet(cur);
      $('fmFuel').onclick = repostajeSheet; $('fmEd').onclick = () => fincaForm(cur);
      if ($('fmRe')) $('fmRe').onclick = () => recalcSheet();
      $('fmSw').onclick = fincaSwitcher; $('fmCp').onclick = () => copiarFinca(cur);
      $('fmNot').onclick = () => notasSheet(cur); if ($('fmTie')) $('fmTie').onclick = () => tiempoSheet(cur); $('fmNew').onclick = () => { closeSheet(); stopGPS(); showList(); nuevaFinca(); };
      if ($('fmMal')) $('fmMal').onclick = () => { closeSheet(); mallaMenu(); };
    });
}

