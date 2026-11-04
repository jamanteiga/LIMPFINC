'use strict';
/* =========================================================
   v2.7 — Mapa de velocidad y paradas · exportar rutas a hoja de cálculo
   ========================================================= */
let velVista = null;
// segmentos con velocidad (km/h) y paradas (≥ paradaMin s dentro de 3 m) de una ruta, a partir de los puntos GPS
function analisisVelocidad(t) {
  const segs = [], paradas = [], minS = +SB.paradaMin || 20;
  let tMov = 0, dMov = 0, tPar = 0;
  (t.sesiones || []).forEach(ses => {
    const pts = (ses.pts || []).filter(p => p[2] <= (S.umbralPrecision || 8) * 1.5); if (pts.length < 2) return;
    const P = Geo.proj(pts[0][0], pts[0][1]), xy = pts.map(p => P.fwd(p[0], p[1]));
    // velocidad suavizada: distancia en una ventana de ±2 puntos
    for (let i = 1; i < pts.length; i++) {
      const a = Math.max(0, i - 3), b = Math.min(pts.length - 1, i + 2), dt = (pts[b][3] - pts[a][3]) / 1000;
      let d = 0; for (let k = a + 1; k <= b; k++) d += Geo.dist(xy[k - 1], xy[k]);
      const v = dt > 0 ? d / dt * 3.6 : 0, dt1 = (pts[i][3] - pts[i - 1][3]) / 1000;
      if (dt1 > 30) continue;   // hueco en el registro
      segs.push({ a: [pts[i - 1][0], pts[i - 1][1]], b: [pts[i][0], pts[i][1]], v, on: !!pts[i][4], t: pts[i][3] });
      if (v >= 0.4) { tMov += dt1; dMov += Geo.dist(xy[i - 1], xy[i]); }
    }
    // paradas: el tractor permanece dentro de 3 m durante ≥ minS
    let i = 0;
    while (i < pts.length) {
      let j = i; while (j + 1 < pts.length && Geo.dist(xy[i], xy[j + 1]) <= 3 && (pts[j + 1][3] - pts[j][3]) < 30000) j++;
      const dur = (pts[j][3] - pts[i][3]) / 1000;
      if (dur >= minS) { let la = 0, lo = 0; for (let k = i; k <= j; k++) { la += pts[k][0]; lo += pts[k][1]; } paradas.push({ ll: [la / (j - i + 1), lo / (j - i + 1)], ini: pts[i][3], dur, on: !!pts[i][4] }); tPar += dur; i = j + 1; }
      else i++;
    }
  });
  const vs = segs.filter(s => s.on && s.v >= 0.4).map(s => s.v).sort((a, b) => a - b), q = p => vs.length ? vs[Math.min(vs.length - 1, Math.floor(p * vs.length))] : null;
  return { segs, paradas, tMov, tPar, vMed: tMov > 0 ? dMov / tMov * 3.6 : null, p10: q(0.1), p50: q(0.5), p90: q(0.9) };
}
const durTxt = s => s >= 3600 ? Math.floor(s / 3600) + ' h ' + Math.round(s % 3600 / 60) + ' min' : s >= 60 ? Math.floor(s / 60) + ' min ' + Math.round(s % 60) + ' s' : Math.round(s) + ' s';
function velColor(v, ref) { const r = v / ref; return r < 0.15 ? '#424242' : r < 0.5 ? '#d50000' : r < 0.8 ? '#ff6d00' : r < 1.1 ? '#2e7d32' : '#1565c0'; }
function verVelocidad(t) {
  if (!map) return;
  const A = analisisVelocidad(t), ref = (t.cfg && +t.cfg.velocidad) || S.velocidad || 3;
  if (!A.segs.length) return toast('Esta ruta no tiene puntos GPS suficientes');
  quitarVelocidad(); closeSheet();
  const lay = L.layerGroup().addTo(map); velVista = { t, lay, A, paradas: true };
  // tramos agrupados por color para no crear miles de líneas
  let run = null; const flush = () => { if (run && run.ll.length > 1) L.polyline(run.ll, { color: run.c, weight: run.on ? 5 : 3, opacity: run.on ? .95 : .6, dashArray: run.on ? null : '4 6', interactive: false }).addTo(lay); };
  A.segs.forEach(s => { const c = velColor(s.v, ref); if (!run || run.c !== c || run.on !== s.on || Geo.lenLL([run.ll[run.ll.length - 1], s.a]) > 1) { flush(); run = { c, on: s.on, ll: [s.a] }; } run.ll.push(s.b); }); flush();
  const pinta = () => {
    if (velVista.pLay) lay.removeLayer(velVista.pLay); velVista.pLay = L.layerGroup().addTo(lay); if (!velVista.paradas) return;
    A.paradas.forEach((p, k) => L.marker(p.ll, { zIndexOffset: 800, icon: L.divIcon({ className: '', html: `<div class="pin" style="background:#37474f;width:auto;min-width:22px;padding:0 5px;border-radius:11px;font-size:11px;white-space:nowrap">⏸ ${p.dur >= 60 ? Math.round(p.dur / 60) + "'" : Math.round(p.dur) + '"'}</div>`, iconSize: null, iconAnchor: [14, 11] }) })
      .on('click', () => toast(`⏸ Parada ${k + 1}: ${durTxt(p.dur)} · ${new Date(p.ini).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} · apero ${p.on ? 'en trabajo' : 'levantado'}`, 4000)).addTo(velVista.pLay));
  };
  pinta();
  const ley = [['#d50000', `< ${fmt(ref * 0.5, 1)}`], ['#ff6d00', `${fmt(ref * 0.5, 1)}–${fmt(ref * 0.8, 1)}`], ['#2e7d32', `${fmt(ref * 0.8, 1)}–${fmt(ref * 1.1, 1)}`], ['#1565c0', `> ${fmt(ref * 1.1, 1)}`], ['#424242', 'parado']];
  const largas = A.paradas.slice().sort((a, b) => b.dur - a.dur).slice(0, 3);
  showTool(`🎨 Velocidad · ${nomRuta(t)}`,
    `<div style="display:flex;flex-wrap:wrap;gap:4px 10px;margin-bottom:4px">${ley.map(([c, x]) => `<span style="white-space:nowrap"><i style="display:inline-block;width:14px;height:6px;background:${c};border-radius:3px;vertical-align:middle"></i> ${x}</span>`).join('')}<span>km/h (ref. ${fmt(ref, 1)})</span></div>
     Media en marcha <b>${A.vMed ? fmt(A.vMed, 1) : '–'} km/h</b> · con apero p10/p50/p90: ${A.p10 ? fmt(A.p10, 1) + ' / ' + fmt(A.p50, 1) + ' / ' + fmt(A.p90, 1) : '–'}<br>
     <b>${A.paradas.length}</b> parada${A.paradas.length === 1 ? '' : 's'} ≥ ${+SB.paradaMin || 20} s · <b>${durTxt(A.tPar)}</b> parado${largas.length ? ' · más largas: ' + largas.map(p => durTxt(p.dur)).join(', ') : ''}`,
    [['Cerrar', 'sec', () => { quitarVelocidad(); showMain(); }], ['⏸ Paradas', '', () => { velVista.paradas = !velVista.paradas; pinta(); }]]);
  map.fitBounds(L.latLngBounds(A.segs.map(s => s.a)), { padding: [30, 30], maxZoom: 19 });
}
function quitarVelocidad() { if (velVista) { map.removeLayer(velVista.lay); velVista = null; } }

/* ---- Exportar rutas a hoja de cálculo (CSV · ODS de LibreOffice · XLSX), con SheetJS (Apache 2.0) ---- */
function cargarXLSX() {
  if (window.XLSX) return Promise.resolve();
  return new Promise((ok, ko) => { const sc = document.createElement('script'); sc.src = 'lib/xlsx.full.min.js'; sc.onload = ok; sc.onerror = () => ko(new Error('sin conexión')); document.head.appendChild(sc); });
}
async function filasRutas(fincas, y) {
  const a0 = y ? new Date(y, 0, 1).getTime() : 0, a1 = y ? new Date(y + 1, 0, 1).getTime() : Infinity, filas = [];
  for (const f of fincas) {
    if (SB.base && f.linde) { try { await trasladoFinca(f); } catch (e) { } }
    const pcF = new Map((await DB.pByFinca(f.id)).map(r => [r.id, r])), pc = planesCache;
    const trs = (await DB.tByFinca(f.id)).filter(t => t.inicio >= a0 && t.inicio < a1).sort((a, b) => a.inicio - b.inicio);
    for (const t of trs) {
      if (!t.resumen && f.linde) { planesCache = pcF; try { t.resumen = resumenTrab(t, rebuildTrab(f, t)); } catch (e) { } planesCache = pc; }
      const r = { horas: sesHoras(t), horasOn: 0, L: 0, limpia: 0, cobertura: 0, litros: 0, ...(t.resumen || {}) };
      if (!(r.litros > 0)) r.litros = r.horas * (effS(f, t.cfg || f.config).consumo || 0);
      const K = costeRuta({ ...t, resumen: r }, f), pr = t.planId && pcF.get(t.planId), tr = getTr((t.cfg || {}).tractorId), ap = getAp((t.cfg || {}).aperoId), A = analisisVelocidad(t);
      filas.push({
        'Finca': f.nombre, 'Ruta': nomRuta(t), 'Inicio': new Date(t.inicio), 'Fin': t.fin ? new Date(t.fin) : null, 'Estado': t.estado || '',
        'Plan': pr ? nomPlan(pr) : t.planResumen ? t.planResumen.nombre : '', 'Máquina': tr ? tr.nombre : '', 'Apero': ap ? ap.nombre : '',
        'Horas': +r.horas.toFixed(3), 'Horas con apero': +(r.horasOn || 0).toFixed(3), 'Parado (h)': +(A.tPar / 3600).toFixed(3), 'Paradas': A.paradas.length,
        'Recorrido (m)': Math.round(r.L || 0), 'Velocidad media (km/h)': r.vMedia != null ? +r.vMedia.toFixed(2) : null,
        'Superficie limpia (m²)': Math.round(r.limpia || 0), 'Cobertura (%)': +((r.cobertura || 0) * 100).toFixed(1), 'Solape (%)': r.solapePct != null ? +(r.solapePct * 100).toFixed(1) : null,
        'Desviación media (m)': r.devMed != null ? +r.devMed.toFixed(2) : null, 'Gasóleo (L)': +r.litros.toFixed(2), 'Gasóleo (€/L)': +K.pg.toFixed(3),
        'Coste gasóleo (€)': +K.cG.toFixed(2), 'Máquina y operario (€/h)': +K.ph.toFixed(2), 'Coste máquina (€)': +K.cH.toFixed(2),
        'Traslado (km)': +K.kmTot.toFixed(1), 'Coste traslado (€)': +K.cT.toFixed(2), 'Coste total (€)': +K.coste.toFixed(2),
        ['Precio +' + (+SB.margen || 0) + ' % (€)']: +K.precio.toFixed(2), 'Nota': t.nota || ''
      });
    }
  }
  return filas;
}
function resumenFilas(filas) {
  const m = new Map(), suma = (o, k, v) => { o[k] = +((o[k] || 0) + (v || 0)).toFixed(2); };
  filas.forEach(r => { const o = m.get(r.Finca) || { 'Finca': r.Finca, 'Rutas': 0 }; o.Rutas++; ['Horas', 'Gasóleo (L)', 'Superficie limpia (m²)', 'Traslado (km)', 'Coste total (€)'].forEach(k => suma(o, k, r[k])); const kp = Object.keys(r).find(k => k.startsWith('Precio')); suma(o, 'Precio (€)', r[kp]); m.set(r.Finca, o); });
  const out = [...m.values()]; if (out.length > 1) { const T = { 'Finca': 'TOTAL', 'Rutas': 0 }; out.forEach(o => Object.keys(o).forEach(k => { if (k !== 'Finca') suma(T, k, o[k]); })); out.push(T); }
  return out;
}
const csvVal = v => v == null ? '' : v instanceof Date ? v.toLocaleString('es-ES') : typeof v === 'number' ? String(v).replace('.', ',') : /[;"\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
async function exportarRutas(fincas, y, formato) {
  showBusy('Preparando la hoja de cálculo…');
  try {
    const filas = await filasRutas(fincas, y); if (!filas.length) return toast(`No hay rutas${y ? ' en ' + y : ''}`);
    const nombre = (fincas.length === 1 ? safeName(fincas[0].nombre) + '_' : '') + 'rutas' + (y ? '_' + y : '');
    if (formato === 'csv') {
      const cols = Object.keys(filas[0]), txt = '﻿' + [cols.join(';'), ...filas.map(r => cols.map(c => csvVal(r[c])).join(';'))].join('\r\n');
      download(nombre + '.csv', txt, 'text/csv;charset=utf-8');
    } else {
      try { await cargarXLSX(); } catch (e) { return toast('No se pudo cargar SheetJS (sin conexión). Usa CSV.', 4000); }
      // fechas como número de serie (hora local exacta) con formato de fecha
      const ser = d => (d.getTime() - d.getTimezoneOffset() * 60000) / 864e5 + 25569, cols = Object.keys(filas[0]), dc = cols.filter(k => filas.some(r => r[k] instanceof Date));
      const wb = XLSX.utils.book_new(), ws = XLSX.utils.json_to_sheet(filas.map(r => { const o = { ...r }; dc.forEach(k => { if (o[k] instanceof Date) o[k] = formato === 'ods' ? o[k].toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ser(o[k]); }); return o; }));
      dc.forEach(k => { const ci = cols.indexOf(k); for (let i = 0; i < filas.length; i++) { const c = ws[XLSX.utils.encode_cell({ r: i + 1, c: ci })]; if (c && c.t === 'n') c.z = 'dd/mm/yyyy hh:mm'; } });
      ws['!cols'] = Object.keys(filas[0]).map(k => ({ wch: Math.max(10, Math.min(28, k.length + 2)) }));
      XLSX.utils.book_append_sheet(wb, ws, 'Rutas');
      const ws2 = XLSX.utils.json_to_sheet(resumenFilas(filas)); ws2['!cols'] = [{ wch: 28 }, { wch: 7 }, { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 13 }, { wch: 15 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Resumen por finca');
      XLSX.writeFile(wb, nombre + '.' + formato, { bookType: formato });
    }
    toast(`📊 ${filas.length} ruta${filas.length > 1 ? 's' : ''} exportada${filas.length > 1 ? 's' : ''} (${formato.toUpperCase()})`);
  } catch (e) { toast('Error al exportar: ' + e.message, 5000); } finally { hideBusy(); }
}

