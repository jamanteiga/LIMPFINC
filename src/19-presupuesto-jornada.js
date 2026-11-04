'use strict';
/* =========================================================
   v1.8 — CORRECCIÓN DE LA MALLA CON EL TRABAJO REAL
   ========================================================= */
// las pasadas entre filas se reparten simétricas respecto al centro de la calle: su posición transversal,
// tomada «módulo» la separación entre filas, da el desplazamiento real de la malla; el giro, la concentración máxima
function corregirMallaDatos(f, trabs) {
  const M = f.malla; if (!M || !f.linde) return { error: 'La finca no tiene malla de árboles.' };
  const P = Geo.projFor(f.linde.coords), { A, ab, ac } = mallaVec(f, P);
  const u0 = Geo.nrm(ab); let n0 = [u0[1], -u0[0]]; if (ac[0] * n0[0] + ac[1] * n0[1] < 0) n0 = [-n0[0], -n0[1]];
  const sp = ac[0] * n0[0] + ac[1] * n0[1]; if (!(sp > 0.5)) return { error: 'Separación entre filas no válida.' };
  // puntos del apero trabajando, con rumbo paralelo a las filas
  const pts = [];
  for (const t of trabs) {
    const R = rebuildTrab(f, t); let prev = null;
    for (const o of R.outs) {
      if (!o) { prev = null; continue; }
      const q = P.fwd(o[0][0], o[0][1]);
      if (prev && o[1]) { const v = [q[0] - prev[0], q[1] - prev[1]], L_ = Math.hypot(v[0], v[1]); if (L_ > 0.3 && L_ < 8 && Math.abs((v[0] * u0[0] + v[1] * u0[1]) / L_) > 0.985) pts.push(q); }
      prev = q;
    }
  }
  // solo dentro de la zona arbolada (no cabeceras): entre la primera y la última fila
  const js = M.arboles.map(a => a[3]), jmin = Math.min(...js), jmax = Math.max(...js), tA = A[0] * n0[0] + A[1] * n0[1];
  const dentro = pts.filter(q => { const t = q[0] * n0[0] + q[1] * n0[1]; return t > tA + jmin * sp && t < tA + jmax * sp; });
  if (dentro.length < 150) return { error: `Hay pocos puntos de trabajo entre filas (${dentro.length}). Trabaja al menos unas cuantas calles y vuelve a probar.` };
  const piv = dentro.reduce((s, q) => [s[0] + q[0] / dentro.length, s[1] + q[1] / dentro.length], [0, 0]);
  let best = null;
  for (let d = -2; d <= 2.0001; d += 0.05) {
    const a = d * D2R, n = [n0[0] * Math.cos(a) - n0[1] * Math.sin(a), n0[0] * Math.sin(a) + n0[1] * Math.cos(a)];
    let C = 0, Sn = 0; for (const q of dentro) { const ph = 2 * Math.PI * ((q[0] - piv[0]) * n[0] + (q[1] - piv[1]) * n[1]) / sp; C += Math.cos(ph); Sn += Math.sin(ph); }
    const R = Math.hypot(C, Sn) / dentro.length; if (!best || R > best.R) best = { R, d, n, ph: Math.atan2(Sn, C) };
  }
  // centro de calle esperado: a media separación de la fila (en el sistema girado alrededor del pivote)
  const Ar = rotP(A, piv, best.d), tFila = ((Ar[0] - piv[0]) * best.n[0] + (Ar[1] - piv[1]) * best.n[1]);
  const tObs = best.ph / (2 * Math.PI) * sp, tEsp = tFila + sp / 2;
  let dt = ((tObs - tEsp) % sp + sp * 1.5) % sp - sp / 2;   // en (−sp/2, sp/2]
  return { dTheta: best.d, dt, R: best.R, n: dentro.length, piv, nVec: best.n, P, sp };
}
function rotP(p, c, deg) { const a = deg * D2R, x = p[0] - c[0], y = p[1] - c[1]; return [c[0] + x * Math.cos(a) - y * Math.sin(a), c[1] + x * Math.sin(a) + y * Math.cos(a)]; }
function aplicarCorreccion(f, r) {
  const M = f.malla, P = r.P, mv = ll => { const q = rotP(P.fwd(ll[0], ll[1]), r.piv, r.dTheta), s = [q[0] + r.nVec[0] * r.dt, q[1] + r.nVec[1] * r.dt]; return P.inv(s[0], s[1]).map(v => +v.toFixed(8)); };
  M.A = mv(M.A); M.B = mv(M.B); M.C = mv(M.C);
  if (M.bordes) M.bordes = M.bordes.map(b => [...mv(b), ...b.slice(2)]);
  if (M.medidos) M.medidos = M.medidos.map(b => [...mv(b), ...b.slice(2)]);
  M.correcciones = [...(M.correcciones || []), { fecha: Date.now(), giro: +r.dTheta.toFixed(2), desp: +r.dt.toFixed(2), fiab: +r.R.toFixed(2) }];
  const g = genArboles(f); if (!g.error) { M.arboles = g.arboles; M.sepFila = g.sepFila; M.sepFilas = g.sepFilas; }
}
async function corregirMallaSheet(f, trabSolo) {
  const trabs = trabSolo ? [trabSolo] : await DB.tByFinca(f.id);
  const r = corregirMallaDatos(f, trabs);
  if (r.error) return sheet(`<h3>🎯 Corregir malla</h3><div class="note">${esc(r.error)}</div>`);
  const fiable = r.R >= 0.45, util = Math.abs(r.dt) > 0.12 || Math.abs(r.dTheta) > 0.1;
  sheet(`<h3>🎯 Corregir malla con el trabajo real</h3>
    <div class="card"><div class="kv"><span>Puntos de trabajo entre filas</span><span>${r.n}</span></div>
      <div class="kv"><span>Giro de la malla</span><span>${r.dTheta >= 0 ? '+' : ''}${fmt(r.dTheta, 2)}°</span></div>
      <div class="kv"><span>Desplazamiento perpendicular a las filas</span><span>${r.dt >= 0 ? '+' : ''}${fmt(r.dt, 2)} m</span></div>
      <div class="kv"><span>Fiabilidad</span><span style="color:${fiable ? 'var(--pri)' : 'var(--warn)'}">${fmt(r.R * 100, 0)} %</span></div></div>
    <div class="note">${!fiable ? '⚠️ Las pasadas no son lo bastante regulares para corregir con seguridad. Trabaja más calles y repite.' : util ? 'Las pasadas reales indican que los árboles están algo desplazados respecto a la malla. Al aplicarlo se mueve la malla (no el linde).' : 'La malla ya coincide con el trabajo real: no hace falta corregir.'}</div>
    <div class="row" style="margin-top:10px"><button class="btn sec" id="cmN">Cancelar</button><button class="btn" id="cmS" ${fiable && util ? '' : 'disabled'}>Aplicar</button></div>`,
    () => {
      $('cmN').onclick = closeSheet;
      $('cmS').onclick = async () => { aplicarCorreccion(f, r); if (cur === f) await saveCur(); else await DB.put(f); closeSheet(); drawFinca(); toast(`Malla corregida: ${fmt(r.dTheta, 2)}° · ${fmt(r.dt, 2)} m${f.plan ? ' · recalcula el plan' : ''}`, 4000); };
    });
}

/* =========================================================
   INCIDENCIAS CON UN TOQUE
   ========================================================= */
const INC = { falta: ['🌳', 'Falta árbol'], danado: ['🪵', 'Árbol dañado'], obst: ['🪨', 'Obstáculo'], sinl: ['🌿', 'Zona sin limpiar'], otra: ['📝', 'Otra'] };
function incidenciaSheet() {
  if (!cur) return;
  sheet(`<h3>📍 Incidencia aquí</h3>
    <div class="incg">${Object.entries(INC).filter(([k]) => k !== 'obst').map(([k, [e, t]]) => `<button class="btn sec big" data-i="${k}" style="margin:0">${e}<br><small style="font-size:14px">${t}</small></button>`).join('')}</div>
    <div class="note" style="margin-top:8px">Se guarda en la posición del apero (o la del GPS). Para piedras, árboles caídos u obstáculos usa el botón rojo ⚠️ Peligro.</div>`,
    sh => sh.querySelectorAll('[data-i]').forEach(b => b.onclick = () => registrarIncidencia(b.dataset.i)));
}
async function registrarIncidencia(tipo, nota) {
  const ll = work && work.last && work.last.cutLL ? work.last.cutLL : lastPos ? [lastPos.lat, lastPos.lon] : null;
  if (!ll) return toast('Sin posición GPS');
  const f = cur, inc = { id: uid(), tipo, ll: [+ll[0].toFixed(7), +ll[1].toFixed(7)], fecha: Date.now(), trabId: work ? work.trab.id : null, nota: nota || '', resuelta: false };
  f.incidencias = [...(f.incidencias || []), inc];
  if (tipo === 'falta' && f.malla && f.malla.arboles) {
    const P = Geo.projFor([ll]), q = P.fwd(ll[0], ll[1]); let bi = -1, bd = 2.5;
    f.malla.arboles.forEach((a, i) => { const d = Geo.dist(q, P.fwd(a[0], a[1])); if (d < bd) { bd = d; bi = i; } });
    if (bi >= 0) { const a = f.malla.arboles[bi], k = a[2] + ',' + a[3]; f.malla.faltas = [...new Set([...(f.malla.faltas || []), k])]; a[4] = 1; inc.arbol = k; }
  }
  if (tipo === 'obst') {
    const P = Geo.projFor([ll]), c = P.fwd(ll[0], ll[1]), xy = []; for (let k = 0; k < 16; k++) { const a = k / 16 * 2 * Math.PI; xy.push([c[0] + Math.cos(a), c[1] + Math.sin(a)]); }
    f.exclusiones = f.exclusiones || []; const ex = { id: uid(), nombre: 'Obstáculo ' + (f.exclusiones.length + 1), coords: Geo.toLL(xy, P).map(q => [+q[0].toFixed(8), +q[1].toFixed(8)]), metodo: 'incidencia', centro: inc.ll, radio: 1, fecha: Date.now() };
    f.exclusiones.push(ex); inc.exclId = ex.id;
  }
  await saveCur(); closeSheet(); drawFinca();
  speak(INC[tipo][1] + ' anotado', true); toast(`${INC[tipo][0]} ${INC[tipo][1]} anotado`);
}
function drawIncidencias(f, layer) {
  (f.incidencias || []).filter(i => !i.resuelta).forEach(i => L.marker(i.ll, { icon: L.divIcon({ className: '', html: `<div class="incpin">${INC[i.tipo][0]}</div>`, iconSize: [26, 26], iconAnchor: [13, 13] }) })
    .on('click', () => incOpts(f, i.id)).addTo(layer));
}
function incOpts(f, id) {
  const i = (f.incidencias || []).find(x => x.id === id); if (!i) return;
  sheet(`<h3>${INC[i.tipo][0]} ${INC[i.tipo][1]}</h3><div class="note">${new Date(i.fecha).toLocaleString('es-ES')}</div>
    <label class="f">Nota</label><input class="inp" id="icN" value="${esc(i.nota || '')}">
    <div class="row" style="margin-top:12px"><button class="btn err" id="icD">Eliminar</button><button class="btn sec" id="icR">✓ Resuelta</button><button class="btn" id="icS">Guardar</button></div>`,
    () => {
      $('icS').onclick = async () => { i.nota = $('icN').value.trim(); await saveCur(); closeSheet(); };
      $('icR').onclick = async () => { i.resuelta = true; i.nota = $('icN').value.trim(); await saveCur(); closeSheet(); drawFinca(); toast('Incidencia resuelta'); };
      $('icD').onclick = async () => {
        f.incidencias = f.incidencias.filter(x => x.id !== id);
        if (i.exclId) f.exclusiones = (f.exclusiones || []).filter(e => e.id !== i.exclId);
        if (i.arbol && f.malla) f.malla.faltas = (f.malla.faltas || []).filter(k => k !== i.arbol);
        await saveCur(); closeSheet(); drawFinca(); toast('Incidencia eliminada');
      };
    });
}
function incidenciasLista(f) {
  const L_ = (f.incidencias || []).slice().sort((a, b) => b.fecha - a.fecha);
  sheet(`<h3>📍 Incidencias · ${esc(f.nombre)}</h3>
    ${L_.length ? L_.map(i => `<button class="opt" data-id="${i.id}" style="${i.resuelta ? 'opacity:.55' : ''}">${INC[i.tipo][0]} ${INC[i.tipo][1]}${i.resuelta ? ' · resuelta' : ''}<small>${new Date(i.fecha).toLocaleDateString('es-ES')}${i.nota ? ' · ' + esc(i.nota) : ''}</small></button>`).join('') : '<div class="note">Sin incidencias. Se anotan durante el trabajo con el botón 📍.</div>'}
    <button class="btn sec" id="inA" style="margin-top:8px">＋ Anotar aquí (posición GPS)</button>`,
    sh => { sh.querySelectorAll('[data-id]').forEach(b => b.onclick = () => { closeSheet(); const i = f.incidencias.find(x => x.id === b.dataset.id); if (map) map.setView(i.ll, Math.max(map.getZoom(), 19)); incOpts(f, i.id); }); $('inA').onclick = incidenciaSheet; });
}

/* =========================================================
   PRESUPUESTO Y PARTE DE TRABAJO (PDF con jsPDF, MIT)
   ========================================================= */
const margenK = () => 1 + (+SB.margen || 0) / 100;
function costePlan(pl, f) { f = f || cur; const h = pl.stats.t.total / 3600, tr = trasladoCoste(f, h), c = pl.stats.litros * (+SB.precioGasoil || 0) + h * (+SB.precioHora || 0) + tr.coste; return { coste: c, precio: c * margenK(), traslado: tr }; }
// coste de una ruta con los precios guardados al hacerla (el gasóleo cambia mucho)
function costeRuta(t, f) {
  const r = t.resumen || {}, P_ = t.precios || {}, pg = P_.gasoil != null ? +P_.gasoil : +SB.precioGasoil || 0, ph = P_.hora != null ? +P_.hora : +SB.precioHora || 0;
  // traslado: un viaje de ida y vuelta por cada día con sesiones
  const dias = new Set((t.sesiones || []).filter(x => x.pts && x.pts.length).map(x => new Date(x.inicio).toDateString())).size || 1;
  const kmIda = P_.kmIda != null ? +P_.kmIda : f && f.traslado ? f.traslado.km : 0, pk = P_.km != null ? +P_.km : +SB.precioKm || 0, kmTot = kmIda * 2 * dias, cT = kmTot * pk;
  const c = (r.litros || 0) * pg + (r.horas || 0) * ph + cT;
  return { cG: (r.litros || 0) * pg, cH: (r.horas || 0) * ph, cT, kmTot, dias, pk, coste: c, precio: c * margenK(), pg, ph };
}
// traslado desde la base: ida y vuelta por cada jornada (horas de trabajo / horas por jornada)
function trasladoCoste(f, h) {
  const T = f && f.traslado && SB.base && f.traslado.key === trasladoKey(f) ? f.traslado : null; if (!T) return { coste: 0, km: 0, viajes: 0, T: null };
  const viajes = Math.max(1, Math.ceil((h || 0) / (+SB.horasJornada || 8) - 1e-9)), km = T.km * 2 * viajes;
  return { coste: km * (+SB.precioKm || 0), km, viajes, T };
}
const centroLL = ll => [ll.reduce((a, p) => a + p[0], 0) / ll.length, ll.reduce((a, p) => a + p[1], 0) / ll.length];
const trasladoKey = f => SB.base && f && f.linde ? SB.base.lat.toFixed(5) + ',' + SB.base.lon.toFixed(5) + '|' + centroLL(f.linde.coords).map(v => v.toFixed(4)).join(',') : null;
const fetchT = (url, ms) => { const ac = new AbortController(), tm = setTimeout(() => ac.abort(), ms || 8000); return fetch(url, { signal: ac.signal }).finally(() => clearTimeout(tm)); };
// distancia por carretera (OSRM, libre); sin red: línea recta × 1,35
async function trasladoFinca(f) {
  if (!SB.base || !f || !f.linde) return null;
  const key = trasladoKey(f); if (f.traslado && f.traslado.key === key && f.traslado.fuente !== 'estimado') return f.traslado;
  const [la, lo] = centroLL(f.linde.coords); let km = null, min = null, fuente = 'estimado';
  try { const r = await fetchT(`https://router.project-osrm.org/route/v1/driving/${SB.base.lon},${SB.base.lat};${lo},${la}?overview=false`, 8000), j = await r.json(); if (j.routes && j.routes[0]) { km = j.routes[0].distance / 1000; min = j.routes[0].duration / 60; fuente = 'carretera'; } } catch (e) { }
  if (km == null) km = Geo.lenLL([[SB.base.lat, SB.base.lon], [la, lo]]) / 1000 * 1.35;
  f.traslado = { key, km: +km.toFixed(2), min: min != null ? Math.round(min) : null, fuente, fecha: Date.now() }; await DB.put(f);
  return f.traslado;
}
async function geocodificar(dir) {
  const out = [];
  const qs = [dir, dir.replace(/\b\d+\b,?/g, '').replace(/\b\d{5}\b/g, '').replace(/\s+,/g, ',').trim()];
  for (const q of qs) {
    try { const r = await fetchT(`https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=es&accept-language=es&q=${encodeURIComponent(q)}`), j = await r.json(); j.forEach(x => out.push({ lat: +x.lat, lon: +x.lon, nom: x.display_name })); } catch (e) { }
    if (out.length) break;
    try { const r = await fetchT(`https://photon.komoot.io/api/?limit=5&q=${encodeURIComponent(q)}`), j = await r.json(); (j.features || []).forEach(x => out.push({ lat: x.geometry.coordinates[1], lon: x.geometry.coordinates[0], nom: [x.properties.name, x.properties.street, x.properties.city || x.properties.county, x.properties.state].filter(Boolean).join(', ') })); } catch (e) { }
    if (out.length) break;
  }
  return out;
}
// 🏠 base de salida (Carballal 20, Cabanas, Abegondo por defecto)
function baseSheet(onOk) {
  const b = SB.base;
  sheet(`<h3>🏠 Base de salida</h3>
    <label class="f">Dirección</label><input class="inp" id="bsD" value="${esc(SB.baseDir || '')}">
    <div class="note" id="bsE">${b ? `Fijada: ${b.lat.toFixed(5)}, ${b.lon.toFixed(5)} (${esc(b.fuente)})` : 'Aún sin situar.'}</div>
    <button class="btn" id="bsG" style="margin-top:8px">📍 Estoy en la base: usar mi GPS</button>
    <button class="btn sec" id="bsB" style="margin-top:8px">🔎 Buscar la dirección</button>
    ${map && cur ? '<button class="btn sec" id="bsM" style="margin-top:8px">👆 Tocar en el mapa</button>' : ''}
    <div id="bsR"></div>`,
    () => {
      const fijar = async (lat, lon, fuente) => {
        SB.base = { lat: +lat.toFixed(6), lon: +lon.toFixed(6), fuente, fecha: Date.now() }; SB.baseDir = $('bsD') ? $('bsD').value.trim() : SB.baseDir; await DB.kvPut('settings', SB);
        toast('🏠 Base fijada: se recalculan los traslados', 3000); closeSheet(); onOk && onOk();
      };
      $('bsG').onclick = () => { if (!lastPos || gpsAge() > 15) { startGPS(); return toast('Esperando señal GPS. Inténtalo en unos segundos.', 3500); } fijar(lastPos.lat, lastPos.lon, 'GPS ±' + fmt(lastPos.acc, 0) + ' m'); };
      $('bsB').onclick = async () => {
        SB.baseDir = $('bsD').value.trim(); $('bsR').innerHTML = '<div class="note">Buscando…</div>';
        const R = await geocodificar(SB.baseDir);
        $('bsR').innerHTML = R.length ? '<div class="note">Elige el resultado correcto. En aldeas suele situar el lugar, no el número: si estás en la base, mejor el GPS.</div>' + R.map((x, i) => `<button class="opt" data-i="${i}">${esc(x.nom)}<small>${x.lat.toFixed(5)}, ${x.lon.toFixed(5)}</small></button>`).join('') : '<div class="card warnc">Sin resultados (o sin conexión). Usa el GPS estando en la base o toca en el mapa.</div>';
        $('bsR').querySelectorAll('[data-i]').forEach(bt => bt.onclick = () => { const x = R[+bt.dataset.i]; fijar(x.lat, x.lon, 'dirección: ' + x.nom.slice(0, 60)); });
      };
      if ($('bsM')) $('bsM').onclick = () => { closeSheet(); followPos = false; toast('👆 Toca la base en el mapa (aleja el mapa si hace falta)', 4000); map.once('click', e => { SB.baseDir = SB.baseDir; fijar(e.latlng.lat, e.latlng.lng, 'mapa'); }); };
    });
}
function presupuestoDatos(f) {
  const Sf = effS(f), a = fincaAreas(f);
  let h, lit, fuente;
  if (f.plan && !planStale(f)) { h = f.plan.stats.t.total / 3600; lit = f.plan.stats.litros; fuente = 'plan calculado'; }
  else { const vm = Sf.velocidad / 3.6, we = Math.max(0.3, Sf.aperoAncho - (Sf.solape || 0)); h = a.neta / (we * vm * 0.75) / 3600; lit = h * Sf.consumo; fuente = 'estimación por superficie (sin plan)'; }
  const tr = trasladoCoste(f, h), cG = lit * (+SB.precioGasoil || 0), cH = h * (+SB.precioHora || 0), cT = tr.coste, coste = cG + cH + cT, margen = coste * (margenK() - 1), porHora = coste + margen;
  const ferr = SB.ferrado > 0 ? a.neta / SB.ferrado : 0, porFerr = ferr * (+SB.precioFerrado || 0);
  return { h, lit, cG, cH, cT, tr, coste, margen, porHora, ferr, porFerr, area: a.neta, fuente, Sf };
}
function preciosHTML() {
  const n = v => String(v ?? '').replace('.', ',');
  return `<div class="card"><div class="srow"><span><b>Gasóleo (€/L)</b>${SB.precioGasoilFecha ? `<br><small style="color:var(--sub)">actualizado ${new Date(SB.precioGasoilFecha).toLocaleDateString('es-ES')}</small>` : ''}</span><input class="inp" id="ppG" inputmode="decimal" value="${n(SB.precioGasoil)}" style="width:90px;text-align:right"></div>
    <div class="srow"><span>Máquina y operario, coste (€/h)</span><input class="inp" id="ppH" inputmode="decimal" value="${n(SB.precioHora)}" style="width:90px;text-align:right"></div>
    <div class="srow"><span>Margen sobre el coste (%)</span><input class="inp" id="ppM" inputmode="decimal" value="${n(SB.margen)}" style="width:90px;text-align:right"></div>
    <div class="srow"><span>Traslado desde la base (€/km)</span><input class="inp" id="ppK" inputmode="decimal" value="${n(SB.precioKm)}" style="width:90px;text-align:right"></div>
    <div class="srow"><span>🏠 Base<br><small style="color:var(--sub)">${esc(SB.baseDir || '')}${SB.base ? '' : ' · <b style="color:var(--err)">sin situar</b>'}</small></span><button class="btn sec" id="ppB" style="width:auto;padding:8px 12px">${SB.base ? 'Cambiar' : 'Situar'}</button></div></div>`;
}
function preciosBind(onCh) {
  const rd = id => parseFloat($(id).value.replace(',', '.'));
  ['ppG', 'ppH', 'ppM', 'ppK'].forEach(id => $(id).onchange = async () => {
    const g = rd('ppG'), h = rd('ppH'), m = rd('ppM'), k = rd('ppK');
    if (!(g >= 0 && g < 10) || !(h >= 0 && h < 1000) || !(m >= 0 && m < 1000) || !(k >= 0 && k < 100)) return toast('Valor no válido');
    if (g !== +SB.precioGasoil) SB.precioGasoilFecha = Date.now();
    SB.precioGasoil = g; SB.precioHora = h; SB.margen = m; SB.precioKm = k; await DB.kvPut('settings', SB); applyS(); onCh && onCh();
  });
  $('ppB').onclick = () => baseSheet(() => onCh && onCh(true));
}
function presupuestoSheet(f) {
  const e = v => fmt(v, 2) + ' €';
  sheet(`<h3>💶 Presupuesto · ${esc(f.nombre)}</h3>
    ${preciosHTML()}
    <div id="prRes"></div>
    <button class="btn" id="prPdf">📄 Presupuesto en PDF</button>`,
    () => {
      const pinta = () => { const d = presupuestoDatos(f); $('prRes').innerHTML = `<div class="note">Basado en: ${d.fuente} · ${esc(d.Sf.tractor || '')} + ${esc(d.Sf.aperoNombre || '')} (${fmt(d.Sf.aperoAncho, 2)} m) a ${fmt(d.Sf.velocidad, 1)} km/h.</div>
      <div class="card">
      <div class="kv"><span>Superficie a limpiar</span><span>${fmtArea(d.area)}</span></div>
      <div class="kv"><span>Tiempo</span><span>${fmtH(d.h)}</span></div>
      <div class="kv"><span>Gasóleo</span><span>${fmt(d.lit, 1)} L × ${fmt(+SB.precioGasoil, 2)} €/L = ${e(d.cG)}</span></div>
      <div class="kv"><span>Máquina y operario</span><span>${fmt(d.h, 2)} h × ${fmt(+SB.precioHora, 2)} €/h = ${e(d.cH)}</span></div>
      <div class="kv"><span>Traslado desde la base${d.tr.T ? `<br><small style="color:var(--sub)">${fmt(d.tr.T.km, 1)} km ida${d.tr.T.min ? ' (' + d.tr.T.min + ' min)' : ''} × 2 × ${d.tr.viajes} viaje${d.tr.viajes > 1 ? 's' : ''} = ${fmt(d.tr.km, 1)} km × ${fmt(+SB.precioKm, 2)} €/km${d.tr.T.fuente === 'estimado' ? ' · estimado (sin ruta)' : ''}</small>` : '<br><small style="color:var(--err)">Sitúa la base para calcularlo</small>'}</span><span>${e(d.cT)}</span></div>
      <div class="kv"><span>Coste</span><span>${e(d.coste)}</span></div>
      <div class="kv"><span>Margen ${fmt(+SB.margen || 0, 0)} %</span><span>${e(d.margen)}</span></div>
      <div class="kv" style="font-size:18px"><span><b>Precio (sin IVA)</b></span><span><b>${e(d.porHora)}</b></span></div>
      ${+SB.precioFerrado > 0 ? `<div class="kv"><span>Precio por ferrado (${fmt(d.ferr, 1)} × ${fmt(+SB.precioFerrado, 2)} €)</span><span><b>${e(d.porFerr)}</b></span></div>` : ''}
      </div>`; $('prPdf').onclick = () => pdfDoc(f, null, d); };
      const todo = async () => { $('prRes').innerHTML = '<div class="note">Calculando el traslado desde la base…</div>'; try { await trasladoFinca(f); } catch (e) { } pinta(); };
      preciosBind(base => base ? presupuestoSheet(f) : pinta()); todo();
    });
}
function cargarJsPDF() {
  if (window.jspdf) return Promise.resolve();
  return new Promise((ok, ko) => { const sc = document.createElement('script'); sc.src = 'lib/jspdf.umd.min.js'; sc.onload = ok; sc.onerror = () => ko(new Error('sin conexión')); document.head.appendChild(sc); });
}
// croquis de la finca en un lienzo (sin teselas): linde, exclusiones, árboles, plan, recorrido real e incidencias
function croquis(f, trab, W, H) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  if (!f.linde) return cv;
  const P = Geo.projFor(f.linde.coords), L0 = Geo.toXY(f.linde.coords, P), xs = L0.map(p => p[0]), ys = L0.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), k = Math.min((W - 40) / (x1 - x0 || 1), (H - 40) / (y1 - y0 || 1));
  const T = ll => { const q = P.fwd(ll[0], ll[1]); return [20 + (q[0] - x0) * k + ((W - 40) - (x1 - x0) * k) / 2, H - 20 - (q[1] - y0) * k - ((H - 40) - (y1 - y0) * k) / 2]; };
  const poly = (ll, st, fill, w, dash) => { g.beginPath(); ll.forEach((p, i) => { const [x, y] = T(p); i ? g.lineTo(x, y) : g.moveTo(x, y); }); if (fill) { g.closePath(); g.fillStyle = fill; g.fill(); } g.strokeStyle = st; g.lineWidth = w; g.setLineDash(dash || []); g.stroke(); g.setLineDash([]); };
  poly(f.linde.coords, '#1b5e20', '#e8f5e9', 3);
  (f.exclusiones || []).forEach(e => poly([...e.coords, e.coords[0]], '#b71c1c', '#bdbdbd', 1.5));
  if (f.plan && !trab) f.plan.parts.forEach(p => poly(p.ll, p.type === 'trabajo' ? '#1565c0' : '#90caf9', null, p.type === 'trabajo' ? 1.2 : 0.8, p.type === 'tras' ? [2, 4] : null));
  if (f.malla && f.malla.arboles) { g.fillStyle = '#33691e'; f.malla.arboles.forEach(a => { if (a[4]) return; const [x, y] = T(a); g.beginPath(); g.arc(x, y, Math.max(1, k * 0.3), 0, 7); g.fill(); }); }
  if (trab) { const R = rebuildTrab(f, trab); let run = []; const fl = () => { if (run.length > 1) poly(run, '#7b1fa2', null, Math.max(1.5, k * 0.6)); run = []; }; R.outs.forEach(o => { if (!o || !o[1]) { fl(); if (o) run = [o[0]]; } else run.push(o[0]); }); fl(); }
  g.font = '20px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  (f.incidencias || []).filter(i => !i.resuelta).forEach(i => { const [x, y] = T(i.ll); g.fillText(INC[i.tipo][0], x, y); });
  // norte y escala
  g.fillStyle = '#000'; g.font = 'bold 18px sans-serif'; g.fillText('N ↑', W - 30, 22);
  const m = [5, 10, 20, 50, 100, 200, 500].find(v => v * k > 60) || 1000; g.fillRect(20, H - 12, m * k, 3); g.font = '13px sans-serif'; g.textAlign = 'left'; g.fillText(m + ' m', 24 + m * k, H - 11);
  return cv;
}
async function pdfDoc(f, trab, pres) {
  try { await cargarJsPDF(); } catch (e) { return toast('No se pudo cargar el generador de PDF: ' + e.message, 4000); }
  const { jsPDF } = window.jspdf, doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const titular = SB.titular || (Sync.user ? Sync.user.email.replace(/@.*/, '') : '');
  const tx = v => String(v).replace(/²/g, '2').replace(/[–—]/g, '-').replace(/≈/g, '~').replace(/[^\x00-\xFF€]/g, '');   // fuentes estándar del PDF
  let y = 16; const ln = (t, v, b) => { doc.setFont('helvetica', b ? 'bold' : 'normal'); doc.text(tx(t), 16, y); if (v != null) doc.text(tx(v), 194, y, { align: 'right' }); y += 6.5; };
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text(trab ? 'Parte de trabajo' : 'Presupuesto', 16, y); doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleDateString('es-ES'), 194, y, { align: 'right' }); y += 7;
  doc.setFontSize(12); doc.text(tx(`${f.nombre}${titular ? ' · ' + titular : ''}`), 16, y); y += 4;
  const img = croquis(f, trab, 1400, 900).toDataURL('image/jpeg', 0.85); doc.addImage(img, 'JPEG', 16, y, 178, 114); y += 120;
  doc.setFontSize(11);
  const a = fincaAreas(f), Sf = effS(f);
  ln('Superficie', `${fmtArea(a.neta)}`);
  if (f.sigpac && f.sigpac.parcelas) ln('SIGPAC', f.sigpac.parcelas.map(p => `${p.provincia}:${p.municipio}:${p.poligono}:${p.parcela}`).join(', '));
  ln('Máquina', `${Sf.tractor || ''} + ${Sf.aperoNombre || ''} (${fmt(Sf.aperoAncho, 2)} m)`.slice(0, 80));
  if (trab) {
    const r = trab.resumen || resumenTrab(trab, rebuildTrab(f, trab)); if (!trab.resumen) trab.resumen = r; const K = costeRuta(trab, f), cG = K.cG, cH = K.cH;
    ln('Fecha del trabajo', `${new Date(trab.inicio).toLocaleString('es-ES')} – ${new Date(trab.fin || trab.inicio).toLocaleTimeString('es-ES')}`);
    ln('Tiempo total · con apero', `${fmtH(r.horas)} · ${fmtH(r.horasOn)}`); ln('Superficie limpia · cobertura', `${fmtArea(r.limpia)} · ${fmt(r.cobertura * 100, 1)} %`);
    ln('Combustible', `${fmt(r.litros, 1)} L`); ln('Rendimiento', `${r.haH == null ? '–' : fmt(r.haH, 2) + ' ha/h'}`);
    const inc = (f.incidencias || []).filter(i => i.trabId === trab.id); if (inc.length) ln('Incidencias', inc.map(i => INC[i.tipo][1] + (i.nota ? ' (' + i.nota + ')' : '')).join('; ').slice(0, 90));
    y += 2; ln(`Gasóleo (${fmt(K.pg, 2)} €/L)`, `${fmt(cG, 2)} €`); ln(`Tractor y operario (${fmt(K.ph, 2)} €/h)`, `${fmt(cH, 2)} €`); if (K.cT) ln(`Traslado (${fmt(K.kmTot, 1)} km × ${fmt(K.pk, 2)} €/km)`, `${fmt(K.cT, 2)} €`); ln('Coste', `${fmt(K.coste, 2)} €`); ln(`Margen ${fmt(+SB.margen || 0, 0)} %`, `${fmt(K.precio - K.coste, 2)} €`); ln('PRECIO (sin IVA)', `${fmt(K.precio, 2)} €`, true);
  } else {
    const d = pres || presupuestoDatos(f);
    ln('Tiempo previsto', `${fmtH(d.h)} (${d.fuente})`); ln('Gasóleo previsto', `${fmt(d.lit, 1)} L × ${fmt(+SB.precioGasoil, 2)} €/L = ${fmt(d.cG, 2)} €`);
    ln('Máquina y operario', `${fmt(d.h, 2)} h × ${fmt(+SB.precioHora, 2)} €/h = ${fmt(d.cH, 2)} €`);
    if (d.tr && d.tr.T) ln('Traslado desde la base', `${fmt(d.tr.km, 1)} km (${d.tr.viajes} viaje${d.tr.viajes > 1 ? 's' : ''} ida y vuelta) × ${fmt(+SB.precioKm, 2)} €/km = ${fmt(d.cT, 2)} €`);
    ln('Coste', `${fmt(d.coste, 2)} €`); ln(`Margen ${fmt(+SB.margen || 0, 0)} %`, `${fmt(d.margen, 2)} €`); ln('PRECIO (sin IVA)', `${fmt(d.porHora, 2)} €`, true);
    if (+SB.precioFerrado > 0) ln(`Precio por ferrado (${fmt(d.ferr, 1)} ferr.)`, `${fmt(d.porFerr, 2)} €`, true);
    doc.setFontSize(9); doc.text('Presupuesto orientativo calculado con LIMPFINC. Impuestos no incluidos.', 16, 287);
  }
  doc.save(safeName(f.nombre) + (trab ? '_parte_' + new Date(trab.inicio).toISOString().slice(0, 10) : '_presupuesto') + '.pdf');
}

/* =========================================================
   MANTENIMIENTO: cuándo toca volver a limpiar
   ========================================================= */
function estadoMant(f, ultimaTrab) {
  const m = f.mant || {}, ult = Math.max(ultimaTrab || 0, m.ultimaManual || 0), hoy = new Date();
  const meses = +m.meses || 12;
  let venc = ult ? new Date(ult) : null; if (venc) venc.setMonth(venc.getMonth() + meses);
  if (m.incendios) {
    // franja de biomasa: limpia antes del 31 de mayo de cada campaña (vale lo hecho desde el 1 de octubre anterior)
    let D = new Date(hoy.getFullYear(), 4, 31, 23, 59); if (hoy > D) D = new Date(hoy.getFullYear() + 1, 4, 31, 23, 59);
    const ini = new Date(D.getFullYear() - 1, 9, 1);
    if (!(ult && ult >= ini.getTime())) venc = !venc || D < venc ? D : venc;
  }
  if (!ult && !m.incendios) return { st: 'nunca', txt: 'sin limpiezas registradas', col: '#9e9e9e' };
  const dias = Math.round((venc - hoy) / 864e5);
  if (dias < 0) return { st: 'venc', txt: `vencida hace ${-dias} días`, col: '#c62828', venc, dias };
  if (dias <= 30) return { st: 'pronto', txt: `toca en ${dias} días (${venc.toLocaleDateString('es-ES')})`, col: '#ef6c00', venc, dias };
  return { st: 'ok', txt: `al día hasta ${venc.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}`, col: '#2e7d32', venc, dias };
}

/* =========================================================
   JORNADA CON VARIAS FINCAS
   ========================================================= */
function datosJornadaFinca(f) {
  const d = presupuestoDatos(f), c = f.linde ? Geo.toLL([Geo.toXY(f.linde.coords, Geo.projFor(f.linde.coords)).reduce((s, q, _, a) => [s[0] + q[0] / a.length, s[1] + q[1] / a.length], [0, 0])], Geo.projFor(f.linde.coords))[0] : null;
  const ent = f.plan && f.plan.parts.length ? f.plan.parts[0].ll[0] : c, sal = f.plan && f.plan.parts.length ? f.plan.parts.at(-1).ll.at(-1) : c;
  return { f, h: d.h, lit: d.lit, ent, sal, cG: d.cG, cH: d.cH };
}
function ordenJornada(items, inicio, vuelta) {
  const km = (a, b) => Geo.lenLL([a, b]) / 1000 * 1.35;   // distancia por camino ≈ 1,35 × en línea recta
  const coste = ord => { let s = 0, p = inicio; ord.forEach(i => { if (p) s += km(p, items[i].ent); p = items[i].sal; }); if (vuelta && inicio && p) s += km(p, inicio); return s; };
  const n = items.length; let best = [...Array(n).keys()], bc = coste(best);
  if (n <= 8) { const perm = (a, k) => { if (k === a.length) { const c = coste(a); if (c < bc) { bc = c; best = a.slice(); } return; } for (let i = k; i < a.length; i++) { [a[k], a[i]] = [a[i], a[k]]; perm(a, k + 1); [a[k], a[i]] = [a[i], a[k]]; } }; perm([...Array(n).keys()], 0); }
  else { let imp = true; while (imp) { imp = false; for (let i = 0; i < n - 1; i++) for (let j = i + 1; j < n; j++) { const c = best.slice(); c.splice(i, j - i + 1, ...best.slice(i, j + 1).reverse()); const cc = coste(c); if (cc < bc - 1e-9) { best = c; bc = cc; imp = true; } } } }
  return { orden: best, km: bc };
}
async function jornadaSheet() {
  const fs = (await DB.all()).filter(f => f.linde).sort((a, b) => a.nombre.localeCompare(b.nombre));
  if (!fs.length) return toast('No hay fincas con linde');
  const est = await estadoFincas(), J = SB.jornada || {};
  sheet(`<h3>🗓 Jornada</h3><div class="note">Marca las fincas del día. La app propone el orden de visita y calcula tiempos, traslados y gasóleo.</div>
    <div class="card">${fs.map(f => { const mt = estadoMant(f, (est[f.id] || {}).ultima); return `<label class="kv" style="cursor:pointer"><span><input type="checkbox" data-id="${f.id}" ${(J.ids || []).includes(f.id) ? 'checked' : ''}> ${f.tipo === 'monte' ? '🌲' : '🌾'} ${esc(f.nombre)}</span><span style="color:${mt.col};font-size:12px">${mt.st === 'ok' ? '' : mt.txt}</span></label>`; }).join('')}</div>
    <div class="srow"><span>Salir desde mi posición y volver</span><input type="checkbox" id="jvV" ${J.vuelta !== false ? 'checked' : ''} style="width:auto"></div>
    <button class="btn" id="jvC" style="margin-top:8px">Calcular jornada</button><div id="jvR"></div>`,
    () => {
      $('jvC').onclick = () => {
        const ids = [...document.querySelectorAll('.sheet input[data-id]')].filter(x => x.checked).map(x => x.dataset.id);
        if (!ids.length) return toast('Marca al menos una finca');
        const vuelta = $('jvV').checked, inicio = vuelta && lastPos ? [lastPos.lat, lastPos.lon] : null;
        const items = ids.map(id => datosJornadaFinca(fs.find(f => f.id === id))), { orden, km } = ordenJornada(items, inicio, vuelta);
        const vC = +SB.velCarretera || 20, hT = km / vC, litT = hT * (+SB.consumoTraslado || 3);
        const hW = items.reduce((s, i) => s + i.h, 0), litW = items.reduce((s, i) => s + i.lit, 0);
        const cT = litT * (+SB.precioGasoil || 0) + hT * (+SB.precioHora || 0), cW = items.reduce((s, i) => s + i.cG + i.cH, 0);
        SB.jornada = { ids: orden.map(k => items[k].f.id), vuelta, fecha: Date.now(), inicio }; DB.kvPut('settings', SB);
        $('jvR').innerHTML = `<div class="card" style="background:#e8f5e9;margin-top:10px">
          ${orden.map((k, n) => `<div class="kv"><span><b>${n + 1}.</b> ${esc(items[k].f.nombre)}</span><span>${fmtH(items[k].h)} · ${fmt(items[k].lit, 1)} L</span></div>`).join('')}
          <div class="kv"><span>Traslados (≈ ${fmt(km, 1)} km a ${fmt(vC, 0)} km/h)</span><span>${fmtH(hT)} · ${fmt(litT, 1)} L</span></div>
          <div class="kv"><span><b>Total jornada</b></span><span><b>${fmtH(hW + hT)} · ${fmt(litW + litT, 1)} L</b></span></div>
          ${+SB.precioHora || +SB.precioGasoil ? `<div class="kv"><span>Coste estimado</span><span>${fmt(cW + cT, 2)} €</span></div>` : ''}</div>
          <div class="row"><button class="btn sec" id="jvM">🗺 Ver ruta</button><button class="btn" id="jvG">▶ Empezar: ${esc(items[orden[0]].f.nombre)}</button></div>`;
        $('jvM').onclick = () => { closeSheet(); verMapaFincas(); };
        $('jvG').onclick = () => { closeSheet(); openFinca(items[orden[0]].f.id); };
      };
      if ((J.ids || []).length) $('jvC').click();
    });
}
async function dibujarJornada(layer) {
  const J = SB.jornada; if (!J || !J.ids || !J.ids.length || Date.now() - J.fecha > 864e5 * 2) return;
  const fs = await DB.all(), items = J.ids.map(id => fs.find(f => f.id === id)).filter(f => f && f.linde).map(datosJornadaFinca);
  const ruta = []; if (J.inicio) ruta.push(J.inicio); items.forEach(i => { ruta.push(i.ent); ruta.push(i.sal); }); if (J.vuelta && J.inicio) ruta.push(J.inicio);
  L.polyline(ruta, { color: '#6a1b9a', weight: 3, dashArray: '8 6', interactive: false }).addTo(layer);
  items.forEach((i, n) => L.marker(i.ent, { interactive: false, icon: L.divIcon({ className: '', html: `<div class="pin" style="background:#6a1b9a">${n + 1}</div>`, iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(layer));
}

/* =========================================================
   PENDIENTE: zonas fuertes a partir del mapa 3D y aviso al entrar
   ========================================================= */
function pendientesMDT(M) {
  const { nx, ny, z, c } = M, s = new Float32Array(nx * ny).fill(NaN);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i; if (isNaN(z[k])) continue;
    const zx1 = i + 1 < nx ? z[k + 1] : NaN, zx0 = i > 0 ? z[k - 1] : NaN, zy1 = j + 1 < ny ? z[k + nx] : NaN, zy0 = j > 0 ? z[k - nx] : NaN;
    const gx = !isNaN(zx1) && !isNaN(zx0) ? (zx1 - zx0) / (2 * c) : !isNaN(zx1) ? (zx1 - z[k]) / c : !isNaN(zx0) ? (z[k] - zx0) / c : 0;
    const gy = !isNaN(zy1) && !isNaN(zy0) ? (zy1 - zy0) / (2 * c) : !isNaN(zy1) ? (zy1 - z[k]) / c : !isNaN(zy0) ? (z[k] - zy0) / c : 0;
    s[k] = 100 * Math.hypot(gx, gy);
  }
  return s;
}
function dibujarPendiente(M, layer, umbral) {
  layer.clearLayers(); const s = M.pend || (M.pend = pendientesMDT(M)), ren = L.canvas({ padding: .3 });
  for (let j = 0; j < M.ny; j++) for (let i = 0; i < M.nx; i++) {
    const k = j * M.nx + i; if (!(s[k] > umbral * 0.8)) continue;
    const a = M.P.inv(M.x0 + (i - .5) * M.c, M.y0 + (j - .5) * M.c), b = M.P.inv(M.x0 + (i + .5) * M.c, M.y0 + (j + .5) * M.c);
    L.rectangle([a, b], { renderer: ren, stroke: false, fillColor: s[k] > umbral ? '#d50000' : '#ff9100', fillOpacity: s[k] > umbral ? .55 : .35, interactive: false }).addTo(layer);
  }
}
function pendienteEn(M, ll) {
  if (!M) return null; const q = M.P.fwd(ll[0], ll[1]), i = Math.round((q[0] - M.x0) / M.c), j = Math.round((q[1] - M.y0) / M.c);
  if (i < 0 || j < 0 || i >= M.nx || j >= M.ny) return null; const s = M.pend || (M.pend = pendientesMDT(M)), v = s[j * M.nx + i]; return isNaN(v) ? null : v;
}
async function prepararPendienteTrabajo() {
  if (!work || work.pendM !== undefined) return; work.pendM = null;
  try { const pts = await puntos3D(cur); if (pts.length >= 30) { const M = construirMDT(cur, pts); if (!M.error) { M.pend = pendientesMDT(M); work.pendM = M; } } } catch (e) { }
}
function avisoPendiente(p) {
  if (!work || !work.pendM || !(+S.pendMax > 0)) return;
  if (work.tPend && p.t - work.tPend < 3000) return; work.tPend = p.t;
  const v = pendienteEn(work.pendM, [p.lat, p.lon]); if (v == null) return;
  if (v > S.pendMax && !work.enPend) { work.enPend = true; speak(`Atención: pendiente fuerte, ${Math.round(v)} por ciento`, true); toast(`⛰ Pendiente ${Math.round(v)} %`, 3000); }
  else if (v < S.pendMax * 0.8) work.enPend = false;
}

