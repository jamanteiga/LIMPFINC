'use strict';
/* =========================================================
   F4 — MONTE / PLANTACIÓN: malla de árboles
   ========================================================= */
function genArboles(f) {
  const P = Geo.projFor(f.linde.coords), { A, ab, ac } = mallaVec(f, P);
  const det = ab[0] * ac[1] - ab[1] * ac[0];
  if (Math.abs(det) < 1e-6) return { error: 'Los árboles B y C están alineados con A: elige C en la otra dirección.' };
  const lin = Geo.toXY(f.linde.coords, P), exs = (f.exclusiones || []).map(e => Geo.toXY(e.coords, P));
  const ij = v => { const x = v[0] - A[0], y = v[1] - A[1]; return [(x * ac[1] - y * ac[0]) / det, (ab[0] * y - ab[1] * x) / det]; };
  let i0 = Infinity, i1 = -Infinity, j0 = Infinity, j1 = -Infinity;
  lin.forEach(v => { const [i, j] = ij(v); i0 = Math.min(i0, i); i1 = Math.max(i1, i); j0 = Math.min(j0, j); j1 = Math.max(j1, j); });
  if ((i1 - i0) * (j1 - j0) > 200000) return { error: 'Malla demasiado grande: revisa los árboles marcados y los recuentos.' };
  const faltas = new Set(f.malla.faltas || []), out = [];
  const borde = f.malla.modo === 'borde' && f.malla.poly && f.malla.poly.length >= 3, diseno = f.malla.modo === 'diseno' || f.malla.modo === 'medidos';
  let linIn = lin;
  if (diseno) {   // plantación teórica: nudos dentro del linde, a la distancia de margen indicada
    const m = +f.malla.margen || 0;
    if (m > 0 && window.ClipperLib) { const C = ClipperLib, SC = 1000, co = new C.ClipperOffset(2, 20), o = new C.Paths(); co.AddPath(lin.map(p => ({ X: Math.round(p[0] * SC), Y: Math.round(p[1] * SC) })), C.JoinType.jtMiter, C.EndType.etClosedPolygon); co.Execute(o, -m * SC); if (!o.length) return { error: 'La distancia al linde es demasiado grande para esta finca.' }; linIn = o.reduce((a, b) => Math.abs(C.Clipper.Area(a)) >= Math.abs(C.Clipper.Area(b)) ? a : b).map(q => [q.X / SC, q.Y / SC]); }
    i0 = Infinity; i1 = -Infinity; j0 = Infinity; j1 = -Infinity;
    linIn.forEach(v => { const [i, j] = ij(v); i0 = Math.min(i0, i); i1 = Math.max(i1, i); j0 = Math.min(j0, j); j1 = Math.max(j1, j); });
    if ((i1 - i0) * (j1 - j0) > 400000) return { error: 'Malla demasiado grande: revisa las separaciones.' };
  }
  if (borde) {   // la plantación es el polígono que forman los árboles de borde (en índices de la retícula)
    const pi = f.malla.poly.map(q => q[0]), pj = f.malla.poly.map(q => q[1]);
    i0 = Math.min(...pi); i1 = Math.max(...pi); j0 = Math.min(...pj); j1 = Math.max(...pj);
    if ((i1 - i0 + 1) * (j1 - j0 + 1) > 400000) return { error: 'Malla demasiado grande: revisa los árboles de borde.' };
  } else if (!diseno) {
    // la plantación es el paralelogramo A–B–C definido por los árboles de esquina
    i0 = Math.max(i0, 0); i1 = Math.min(i1, f.malla.nAB - 1); j0 = Math.max(j0, 0); j1 = Math.min(j1, f.malla.nAC - 1);
  }
  for (let i = Math.ceil(i0 - 1e-6); i <= Math.floor(i1 + 1e-6); i++) for (let j = Math.ceil(j0 - 1e-6); j <= Math.floor(j1 + 1e-6); j++) {
    const p = [A[0] + i * ab[0] + j * ac[0], A[1] + i * ab[1] + j * ac[1]];
    if (borde) { if (!inPolyIdx([i, j], f.malla.poly)) continue; if (exs.some(e => Geo.inPoly(p, e))) continue; }
    else if (!Geo.inPoly(p, diseno ? linIn : lin) || exs.some(e => Geo.inPoly(p, e))) continue;
    const ll = P.inv(p[0], p[1]);
    out.push([+ll[0].toFixed(7), +ll[1].toFixed(7), i, j, faltas.has(i + ',' + j) ? 1 : 0]);
  }
  return { arboles: out, sepFila: Math.hypot(...ab), sepFilas: Math.abs((ab[0] * ac[1] - ab[1] * ac[0]) / Math.hypot(...ab)) };
}
// punto dentro o sobre el borde de un polígono en índices enteros (i, j)
function inPolyIdx(p, poly) {
  const n = poly.length;
  for (let k = 0; k < n; k++) {   // sobre una arista
    const a = poly[k], b = poly[(k + 1) % n], cr = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    if (Math.abs(cr) < 1e-9 && p[0] >= Math.min(a[0], b[0]) - 1e-9 && p[0] <= Math.max(a[0], b[0]) + 1e-9 && p[1] >= Math.min(a[1], b[1]) - 1e-9 && p[1] <= Math.max(a[1], b[1]) + 1e-9) return true;
  }
  return Geo.inPoly(p, poly);
}
function drawArboles(f, layer) {
  if (!f.malla || !f.malla.arboles) return;
  const ren = L.canvas({ padding: .3 }), r = Math.max(0.15, (+(f.malla.diam || S.diamTronco || 500)) / 2000);
  f.malla.arboles.forEach(a => L.circle([a[0], a[1]], a[4]
    ? { renderer: ren, radius: r, color: '#9e9e9e', weight: 1.5, fill: false, interactive: false }
    : { renderer: ren, radius: r, color: '#fff', weight: 0.8, fillColor: '#33691e', fillOpacity: 1, interactive: false }).addTo(layer));
  if (f.malla.medidos) f.malla.medidos.forEach(b => L.circle([b[0], b[1]], { renderer: ren, radius: Math.max(0.8, r + 0.4), color: '#0277bd', weight: 2.5, fill: false, interactive: false }).addTo(layer));
  if (f.malla.modo === 'diseno' && f.malla.A) L.circle(f.malla.A, { renderer: ren, radius: Math.max(0.6, r + 0.35), color: '#6a1b9a', weight: 2.5, dashArray: '3 3', fill: false, interactive: false }).addTo(layer);
  if (f.malla.bordes) f.malla.bordes.forEach(b => L.circle([b[0], b[1]], { renderer: ren, radius: b[2] ? 0.9 : 0.7, color: b[2] ? '#c62828' : '#f9a825', weight: 2, fill: false, interactive: false }).addTo(layer));
}
/* ---- Malla a partir de los árboles del borde (esquinas + intermedios), recorriendo el perímetro en orden ---- */
function fitBorde(pts, esq, sFila, sFilas, exacta) {
  // pts: [[x,y]] en orden por el perímetro; esq: [bool]
  const n = pts.length, ci = esq.map((e, i) => e ? i : -1).filter(i => i >= 0);
  if (n < 4) return { error: 'Marca al menos 4 árboles, en orden alrededor de la plantación (esquinas, intermedios y los de las esquinas redondeadas).' };
  // direcciones de filas: histograma (ponderado por longitud) de los tramos entre árboles marcados consecutivos
  const segs = []; for (let k = 0; k < n; k++) { const p = pts[k], q = pts[(k + 1) % n], v = [q[0] - p[0], q[1] - p[1]], L = Math.hypot(v[0], v[1]); if (L > 1) segs.push({ v, L, th: ((Math.atan2(v[1], v[0]) / D2R) % 180 + 180) % 180 }); }
  const h = new Float64Array(180); segs.forEach(sg => { for (let d = -4; d <= 4; d++) h[(Math.round(sg.th) + d + 180) % 180] += sg.L * (1 - Math.abs(d) / 5); });
  const adist = (x, y) => { const d = Math.abs(x - y) % 180; return Math.min(d, 180 - d); };
  let p1 = 0; for (let t = 1; t < 180; t++) if (h[t] > h[p1]) p1 = t;
  let p2 = -1; for (let t = 0; t < 180; t++) if (adist(t, p1) >= 30 && (p2 < 0 || h[t] > h[p2])) p2 = t;
  if (p2 < 0 || h[p2] <= 0) return { error: 'No se distinguen dos direcciones de filas: marca árboles de al menos dos lados de la plantación, en orden.' };
  const dirMedia = pk => { let x = 0, y = 0; segs.filter(sg => adist(sg.th, pk) <= 6).forEach(sg => { const u = [Math.cos(pk * D2R), Math.sin(pk * D2R)], sgn = sg.v[0] * u[0] + sg.v[1] * u[1] >= 0 ? 1 : -1; x += sgn * sg.v[0]; y += sgn * sg.v[1]; }); return Geo.nrm([x, y]); };
  const ua = dirMedia(p1), ub = dirMedia(p2);
  // búsqueda de la retícula rígida (giro ±2,5°, separación 0,85–1,25 × la orientativa) que mejor encaja con los árboles marcados
  const rot = (u, a) => [u[0] * Math.cos(a) - u[1] * Math.sin(a), u[0] * Math.sin(a) + u[1] * Math.cos(a)];
  const P0 = pts[0], rel = pts.map(p => [p[0] - P0[0], p[1] - P0[1]]);
  let best = null;
  const prueba = (A, B) => {
    const det = A[0] * B[1] - A[1] * B[0]; if (Math.abs(det) < 1e-6) return;
    let ox = 0, oy = 0; const ij = new Array(n);
    for (let k = 0; k < n; k++) { const d = rel[k]; ij[k] = [Math.round((d[0] * B[1] - d[1] * B[0]) / det), Math.round((A[0] * d[1] - A[1] * d[0]) / det)]; }
    for (let k = 0; k < n; k++) { ox += rel[k][0] - ij[k][0] * A[0] - ij[k][1] * B[0]; oy += rel[k][1] - ij[k][0] * A[1] - ij[k][1] * B[1]; }
    ox /= n; oy /= n;
    let e = 0; for (let k = 0; k < n; k++) { const d = [rel[k][0] - ox, rel[k][1] - oy], a = (d[0] * B[1] - d[1] * B[0]) / det, b = (A[0] * d[1] - A[1] * d[0]) / det, ra = Math.round(a), rb = Math.round(b); ij[k] = [ra, rb]; const rx = d[0] - ra * A[0] - rb * B[0], ry = d[1] - ra * A[1] - rb * B[1]; e += rx * rx + ry * ry; }
    e /= Math.hypot(A[0], A[1]) * Math.hypot(B[0], B[1]);   // normalizado: una retícula más fina no «encaja» mejor por ser más fina
    if (!best || e < best.e - 1e-12) best = { e, A, B, ij: ij.map(q => q.slice()) };
  };
  for (let ra = -2.5; ra <= 2.5001; ra += 0.5) for (let rb = -2.5; rb <= 2.5001; rb += 0.5) {
    const da = rot(ua, ra * D2R), db = rot(ub, rb * D2R);
    const F = exacta ? [1] : Array.from({ length: 41 }, (_, k) => 0.85 + k * 0.01);
    for (const fa of F) for (const fb of F) prueba([da[0] * sFila * fa, da[1] * sFila * fa], [db[0] * sFilas * fb, db[1] * sFilas * fb]);
  }
  const idx = best.ij; const i0 = idx[0][0], j0 = idx[0][1]; for (const q of idx) { q[0] -= i0; q[1] -= j0; }
  let O = pts[0], A = best.A, B = best.B;
  const sol3 = (M, v) => { const m = M.map((r, i) => [...r, v[i]]); for (let c = 0; c < 3; c++) { let pv = c; for (let r = c + 1; r < 3; r++) if (Math.abs(m[r][c]) > Math.abs(m[pv][c])) pv = r; [m[c], m[pv]] = [m[pv], m[c]]; if (Math.abs(m[c][c]) < 1e-9) return null; for (let r = 0; r < 3; r++) if (r !== c) { const f = m[r][c] / m[c][c]; for (let k = c; k < 4; k++) m[r][k] -= f * m[c][k]; } } return m.map((r, i) => r[3] / r[i]); };
  {  // ajuste fino por mínimos cuadrados con los índices fijados: p = O + i·A + j·B
    const N = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], bx = [0, 0, 0], by = [0, 0, 0];
    idx.forEach((q, k) => { const r = [1, q[0], q[1]]; for (let a = 0; a < 3; a++) { for (let b = 0; b < 3; b++) N[a][b] += r[a] * r[b]; bx[a] += r[a] * pts[k][0]; by[a] += r[a] * pts[k][1]; } });
    const X = sol3(N, bx), Y = sol3(N, by);
    if (X && Y) { O = [X[0], Y[0]]; A = [X[1], Y[1]]; B = [X[2], Y[2]]; }
    else { O = [P0[0] - 0, P0[1] - 0]; }
  }
  const det = A[0] * B[1] - A[1] * B[0];
  const cerrado = new Set(idx.map(q => q.join(','))).size === n;   // sin dos árboles en el mismo nudo
  const maxFrac = 0;
  const res = idx.map(([i, j], k) => Math.hypot(O[0] + i * A[0] + j * B[0] - pts[k][0], O[1] + i * A[1] + j * B[1] - pts[k][1]));
  const rms = Math.sqrt(res.reduce((s, r) => s + r * r, 0) / res.length);
  const lados = ci.length < 2 ? [] : ci.map((c, k) => { const d = ci[(k + 1) % ci.length], di = idx[d][0] - idx[c][0], dj = idx[d][1] - idx[c][1]; return { de: c + 1, a: d + 1, arboles: Math.max(Math.abs(di), Math.abs(dj)) + 1, diag: di !== 0 && dj !== 0 }; });
  return { lados, O, A, B, idx, rms, maxRes: Math.max(...res), cerrado, maxFrac, sepFila: Math.hypot(...A), sepFilas: Math.abs(det ? (A[0] * B[1] - A[1] * B[0]) / Math.hypot(...A) : 0), pasoB: Math.hypot(...B) };
}
function avgGPS(seg, onTick, cb) {
  startGPS(); const S0 = []; let n = seg;
  const tm = setInterval(() => {
    if (lastPos && gpsAge() < 3 && lastPos.acc <= S.umbralPrecision) S0.push(lastPos);
    n--; onTick(n, S0.length);
    if (n <= 0) {
      clearInterval(tm);
      if (S0.length < 3) return cb(null);
      let sw = 0, la = 0, lo = 0; S0.forEach(p => { const w = 1 / (p.acc * p.acc); sw += w; la += p.lat * w; lo += p.lon * w; });
      cb([la / sw, lo / sw], Math.sqrt(1 / sw), S0.length);
    }
  }, 1000);
  return tm;
}
let bordeW = null;
function mallaBorde() {
  bordeW = { pts: [], esq: [], tipo: 'E', avg: null };
  map.on('click', bordeClick); bordePanel();
}
function bordePanel() {
  const W = bordeW, nE = W.esq.filter(Boolean).length;
  lyr.tmp.clearLayers();
  if (W.pts.length > 1) L.polyline(W.pts, { color: '#33691e', weight: 2, dashArray: '5 4', interactive: false }).addTo(lyr.tmp);
  W.pts.forEach((p, i) => L.marker(p, { interactive: false, icon: L.divIcon({ className: '', html: `<div class="pin" style="background:${W.esq[i] ? '#c62828' : '#f9a825'};${W.esq[i] ? '' : 'width:18px;height:18px;line-height:18px;font-size:10px'}">${i + 1}</div>`, iconSize: W.esq[i] ? [22, 22] : [18, 18], iconAnchor: W.esq[i] ? [11, 11] : [9, 9] }) }).addTo(lyr.tmp));
  showTool(`Árboles del borde · ${W.pts.length} (${nE} esquinas)`,
    `<div class="seg" id="bdT" style="margin:4px 0 6px"><button data-v="E" class="${W.tipo === 'E' ? 'on' : ''}">🔴 Esquina</button><button data-v="M" class="${W.tipo === 'M' ? 'on' : ''}">🟡 Intermedio</button></div>
     Recorre el borde <b>en orden</b> (a pie o en tractor). Colócate junto al tronco y pulsa «GPS», o toca el árbol en el mapa. En esquinas redondeadas marca varios árboles de la curva como intermedios.`,
    [['Cancelar', 'sec', bordeCancel], ['Deshacer', 'sec', () => { if (W.avg) return; W.pts.pop(); W.esq.pop(); bordePanel(); }, !W.pts.length],
     ['GPS (' + (SB.promedioS || 10) + ' s)', '', bordeGPS], ['Terminar', '', bordeFin, W.pts.length < 4]]);
  $('bdT').querySelectorAll('button').forEach(b => b.onclick = () => { W.tipo = b.dataset.v; bordePanel(); });
}
function bordeCancel() { if (bordeW && bordeW.avg) clearInterval(bordeW.avg); map.off('click', bordeClick); bordeW = null; lyr.tmp.clearLayers(); showMain(); }
function bordeClick(e) { if (!bordeW || bordeW.avg) return; bordeAdd([+e.latlng.lat.toFixed(7), +e.latlng.lng.toFixed(7)]); }
function bordeAdd(ll) { bordeW.pts.push(ll); bordeW.esq.push(bordeW.tipo === 'E'); if (bordeW.tipo === 'E' && bordeW.pts.length > 1) bordeW.tipo = 'M'; bordePanel(); }
function bordeGPS() {
  if (bordeW.avg) return;
  $('toolHint').innerHTML = 'Promediando GPS… No te muevas.';
  bordeW.avg = avgGPS(SB.promedioS || 10, (n, k) => { $('toolHint').innerHTML = `Promediando GPS… ${n} s · ${k} lecturas`; }, (ll, acc) => {
    bordeW.avg = null;
    if (!ll) { toast('Precisión GPS insuficiente: toca el árbol en el mapa'); return bordePanel(); }
    toast(`Árbol ${bordeW.pts.length + 1} (±${fmt(acc, 1)} m)`); bordeAdd(ll);
  });
}
function bordeFin() {
  const W = bordeW; map.off('click', bordeClick);
  const M0 = cur.malla || {};
  const num = v => String(v).replace('.', ',');
  sheet(`<h3>Generar malla</h3>
    <div class="note">${W.pts.length} árboles de borde · ${W.esq.filter(Boolean).length} esquinas.</div>
    <div class="srow"><span>Separación entre árboles en la fila (m)</span><input class="inp" id="bdY" inputmode="decimal" value="${num(M0.sFila || S.mallaY)}" style="width:90px;text-align:right"></div>
    <div class="srow"><span>Separación entre filas (m)</span><input class="inp" id="bdX" inputmode="decimal" value="${num(M0.sFilas || S.mallaX)}" style="width:90px;text-align:right"></div>
    <div class="srow"><span>Las separaciones son exactas (conocidas)</span><input type="checkbox" id="bdE" ${M0.exacta ? 'checked' : ''} style="width:auto"></div>
    <div class="note">Sin marcar: valores orientativos (malla 3,5–4,0 m) y la separación real se calcula con los árboles marcados. Si la conoces con exactitud, márcalo: el ajuste es mucho más robusto.</div>
    <div class="srow"><span>Diámetro medio del tronco (mm)</span><input class="inp" id="bdD" inputmode="numeric" value="${M0.diam || S.diamTronco || 500}" style="width:90px;text-align:right"></div>
    <div id="bdR"></div>
    <div class="row" style="margin-top:12px"><button class="btn sec" id="bdV">‹ Seguir marcando</button><button class="btn sec" id="bdC">Calcular</button><button class="btn" id="bdOk" disabled>Generar</button></div>`,
    () => {
      let res = null;
      const P = Geo.projFor(cur.linde ? cur.linde.coords : W.pts), xy = W.pts.map(p => P.fwd(p[0], p[1]));
      const n = id => parseFloat(($(id).value || '').replace(',', '.'));
      $('bdV').onclick = () => { closeSheet(); map.on('click', bordeClick); bordePanel(); };
      $('bdC').onclick = () => {
        const sF = n('bdY'), sFs = n('bdX'), dm = n('bdD');
        if (!(sF > 0.5 && sFs > 0.5)) return toast('Separaciones no válidas');
        if (!(dm > 0 && dm < 3000)) return toast('Diámetro no válido');
        const r = fitBorde(xy, W.esq, sF, sFs, $('bdE').checked);
        if (r.error) { $('bdR').innerHTML = `<div class="card warnc">${esc(r.error)}</div>`; $('bdOk').disabled = true; return; }
        const ll = q => P.inv(q[0], q[1]).map(v => +v.toFixed(8));
        const malla = { modo: 'borde', A: ll(r.O), B: ll([r.O[0] + r.A[0], r.O[1] + r.A[1]]), C: ll([r.O[0] + r.B[0], r.O[1] + r.B[1]]), nAB: 2, nAC: 2, nominal: false,
          poly: r.idx, bordes: W.pts.map((p, i) => [p[0], p[1], W.esq[i] ? 1 : 0, r.idx[i][0], r.idx[i][1]]), diam: Math.round(dm), sFila: sF, sFilas: sFs, exacta: $('bdE').checked, rms: r.rms, faltas: (M0.modo === 'borde' ? M0.faltas : []) || [] };
        const tmp = { ...cur, malla, linde: cur.linde || { coords: W.pts } }, g = genArboles(tmp);
        if (g.error) { $('bdR').innerHTML = `<div class="card warnc">${esc(g.error)}</div>`; $('bdOk').disabled = true; return; }
        res = { ...malla, arboles: g.arboles, sepFila: g.sepFila, sepFilas: g.sepFilas };
        const malo = r.rms > Math.min(sF, sFs) * 0.25 || !r.cerrado;
        $('bdR').innerHTML = `<div class="card" style="background:${malo ? '#fff3e0' : '#e8f5e9'}">
          <div class="kv"><span><b>Árboles generados</b></span><span><b>${g.arboles.length}</b></span></div>
          <div class="kv"><span>Separación en fila (real)</span><span>${fmt(r.sepFila, 2)} m</span></div>
          <div class="kv"><span>Separación entre filas (real)</span><span>${fmt(r.sepFilas, 2)} m</span></div>
          <div class="kv"><span>Error medio árboles marcados</span><span>±${fmt(r.rms, 2)} m (máx ${fmt(r.maxRes, 2)})</span></div>
          ${r.lados.length ? '' : '<div style="font-size:13px;margin-top:6px">Sin esquinas marcadas (borde redondeado): la malla sigue el contorno de los árboles marcados.</div>'}
          <div style="margin-top:6px;font-size:13px;${r.lados.length ? '' : 'display:none'}"><b>Árboles por lado</b> (compruébalos en la finca):<br>${r.lados.map(l => `Esquina ${l.de} → ${l.a}: <b>${l.arboles}</b>${l.diag ? ' (en diagonal)' : ''}`).join('<br>')}</div>
          ${r.cerrado ? '' : '<div class="kv" style="color:var(--warn)"><span>⚠️ Dos árboles marcados caen en el mismo nudo</span><span>revisa el orden o la separación</span></div>'}
          ${r.rms > Math.min(sF, sFs) * 0.25 ? '<div style="color:var(--warn)">⚠️ Error alto: algún árbol mal marcado o separación orientativa muy distinta.</div>' : ''}</div>`;
        $('bdOk').disabled = false;
        lyr.tmp.clearLayers(); drawArboles({ malla: res }, lyr.tmp);
      };
      $('bdOk').onclick = async () => {
        if (!res) return;
        cur.malla = res; await saveCur(); closeSheet(); bordeW = null; lyr.tmp.clearLayers(); showMain(); drawFinca();
        toast(`${res.arboles.length} árboles en la malla`);
      };
      $('bdC').click();
    });
}

let mallaW = null;
function mallaMenu() {
  if (busy()) return;
  if (!cur.linde) return toast('Primero define el linde de la finca');
  const M = cur.malla;
  if (!M || M.modo !== 'medidos') { closeSheet(); return mallaMedidos(); }
  const n = M.arboles.length;
  sheet(`<h3>🌳 Arboleda</h3>
    <div class="card">
      <div class="kv"><span>Árboles</span><span>${n}</span></div>
      <div class="kv"><span>Patrón</span><span>${Math.round(M.sFila * 1000)} × ${Math.round(M.sFilas * 1000)} mm · ${Math.round(M.az)}°</span></div>
      <div class="kv"><span>Diámetro</span><span>${M.diam} mm</span></div>
      <div class="kv"><span>Árboles marcados</span><span>${M.medidos.length} · ±${fmt(M.rms || 0, 2)} m</span></div>
    </div>
    <button class="opt" id="mMas">🌳 Marcar más árboles</button>
    <button class="opt" id="mPat">✎ Cambiar patrón, diámetro o distancia al linde</button>
    <button class="opt" id="mDel" style="color:var(--err)">🗑 Borrar arboleda</button>`,
    () => {
      $('mMas').onclick = () => { closeSheet(); mallaMedidos(); };
      $('mPat').onclick = () => medidosFin(M.medidos.map(b => [b[0], b[1]]), M);
      $('mDel').onclick = () => confirmSheet('¿Borrar la arboleda y los árboles marcados?', 'Borrar', async () => { cur.malla = null; await saveCur(); drawFinca(); }, true);
    });
}
/* ---- Diseño teórico: árbol de referencia (ficticio) + patrón ---- */
function ladoLargo(coords) {
  const P = Geo.projFor(coords), xy = Geo.ccw(Geo.toXY(coords, P)); let bi = 0, bl = 0;
  xy.forEach((p, i) => { const q = xy[(i + 1) % xy.length], l = Geo.dist(p, q); if (l > bl) { bl = l; bi = i; } });
  const a = xy[bi], b = xy[(bi + 1) % xy.length], u = Geo.nrm([b[0] - a[0], b[1] - a[1]]);
  return { P, a, u, nIn: [-u[1], u[0]], az: ((Math.atan2(u[0], u[1]) / D2R) % 180 + 180) % 180 };
}
function mallaDiseno(M0) {
  if (!cur.linde) return toast('Primero define el linde de la finca');
  M0 = M0 && M0.modo === 'diseno' ? M0 : null;
  const LL = ladoLargo(cur.linde.coords), num = v => String(+(+v).toFixed(2)).replace('.', ',');
  const st = { ref: M0 ? M0.A : null, azMode: M0 && M0.azMan ? 'man' : 'auto' };
  sheet(`<h3>🧪 Plantación de diseño</h3>
    <div class="note">Patrón teórico a partir de un árbol de referencia (ficticio). Úsalo con el linde de SIGPAC o cuando aún no has marcado árboles.</div>
    <div class="srow"><span>Separación entre árboles en la fila (m)</span><input class="inp" id="dzY" inputmode="decimal" value="${num(M0 ? M0.sFila : S.mallaY)}" style="width:90px;text-align:right"></div>
    <div class="srow"><span>Separación entre filas (m)</span><input class="inp" id="dzX" inputmode="decimal" value="${num(M0 ? M0.sFilas : S.mallaX)}" style="width:90px;text-align:right"></div>
    <label class="f">Orientación de las filas</label>
    <div class="seg" id="dzO"><button data-v="auto">Paralela al lado más largo (${Math.round(LL.az)}°)</button><button data-v="man">Rumbo manual</button></div>
    <div class="srow ${st.azMode === 'man' ? '' : 'hidden'}" id="dzAzR"><span>Rumbo de las filas (° desde el norte)</span><input class="inp" id="dzAz" inputmode="decimal" value="${num(M0 ? M0.az : LL.az)}" style="width:90px;text-align:right"></div>
    <div class="srow"><span>Ángulo entre filas y columnas (°)</span><input class="inp" id="dzAng" inputmode="decimal" value="${num(M0 ? M0.ang || 90 : 90)}" style="width:90px;text-align:right"></div>
    <div class="srow"><span>Distancia mínima de los árboles al linde (m)</span><input class="inp" id="dzM" inputmode="decimal" value="${num(M0 ? M0.margen : Math.max(2, S.mallaX / 2))}" style="width:90px;text-align:right"></div>
    <div class="srow"><span>Diámetro medio del tronco (mm)</span><input class="inp" id="dzD" inputmode="numeric" value="${M0 ? M0.diam : S.diamTronco || 500}" style="width:90px;text-align:right"></div>
    <label class="f">Árbol de referencia (ficticio)</label>
    <div class="seg" id="dzR"><button data-v="auto">Automático (esquina del lado largo)</button><button data-v="map">Tocar en el mapa</button>${M0 ? '<button data-v="keep">El actual</button>' : ''}</div>
    <button class="btn" id="dzOk" style="margin-top:12px">Generar arboleda</button>`,
    () => {
      let refMode = M0 ? 'keep' : 'auto';
      const paintSeg = (id, v) => $(id).querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
      $('dzO').querySelectorAll('button').forEach(b => b.onclick = () => { st.azMode = b.dataset.v; paintSeg('dzO', st.azMode); $('dzAzR').classList.toggle('hidden', st.azMode !== 'man'); }); paintSeg('dzO', st.azMode);
      $('dzR').querySelectorAll('button').forEach(b => b.onclick = () => { refMode = b.dataset.v; paintSeg('dzR', refMode); }); paintSeg('dzR', refMode);
      $('dzOk').onclick = () => {
        const n = id => parseFloat(($(id).value || '').replace(',', '.'));
        const sF = n('dzY'), sFs = n('dzX'), mg = n('dzM'), dm = n('dzD'), ang = n('dzAng') || 90, az = st.azMode === 'man' ? n('dzAz') : LL.az;
        if (!(sF > 0.5 && sFs > 0.5)) return toast('Separaciones no válidas'); if (!(mg >= 0)) return toast('Distancia al linde no válida'); if (!(dm > 0 && dm < 3000)) return toast('Diámetro no válido'); if (!(ang >= 30 && ang <= 150) || !isFinite(az)) return toast('Orientación no válida');
        const cfg = { sF, sFs, mg, dm, ang, az, azMan: st.azMode === 'man' };
        if (refMode === 'map') {
          closeSheet(); planRev = { picking: true };
          showTool('Árbol de referencia', 'Toca en el mapa dónde está (o estaría) un árbol de la plantación. La malla se encaja a ese árbol.', [['Cancelar', 'sec', () => { map.off('click', onR); planRev = null; showMain(); }]]);
          const onR = e => { map.off('click', onR); planRev = null; showMain(); generarDiseno(cfg, [e.latlng.lat, e.latlng.lng]); };
          map.on('click', onR); return;
        }
        let ref = refMode === 'keep' && M0 ? M0.A : null;
        if (!ref) { const L2 = ladoLargo(cur.linde.coords), d = mg + Math.min(sF, sFs) / 2, q = [L2.a[0] + L2.u[0] * d + L2.nIn[0] * d, L2.a[1] + L2.u[1] * d + L2.nIn[1] * d]; ref = L2.P.inv(q[0], q[1]); }
        closeSheet(); generarDiseno(cfg, ref);
      };
    });
}
async function generarDiseno(cfg, ref) {
  const P = Geo.projFor(cur.linde.coords), O = P.fwd(ref[0], ref[1]);
  const ua = [Math.sin(cfg.az * D2R), Math.cos(cfg.az * D2R)], bAz = cfg.az - cfg.ang, ub = [Math.sin(bAz * D2R), Math.cos(bAz * D2R)];
  const A = [O[0] + ua[0] * cfg.sF, O[1] + ua[1] * cfg.sF], B = [O[0] + ub[0] * cfg.sFs, O[1] + ub[1] * cfg.sFs];
  const ll = q => P.inv(q[0], q[1]).map(v => +v.toFixed(8));
  const faltas = cur.malla && cur.malla.modo === 'diseno' ? cur.malla.faltas || [] : [];
  const malla = { modo: 'diseno', A: ll(O), B: ll(A), C: ll(B), nAB: 2, nAC: 2, nominal: false, sFila: cfg.sF, sFilas: cfg.sFs, margen: cfg.mg, diam: Math.round(cfg.dm), az: +cfg.az.toFixed(2), azMan: cfg.azMan, ang: cfg.ang, faltas };
  const g = genArboles({ ...cur, malla });
  if (g.error) return toast(g.error, 4000);
  if (!g.arboles.length) return toast('Con esos valores no cabe ningún árbol: revisa la distancia al linde.', 4000);
  cur.malla = { ...malla, arboles: g.arboles, sepFila: g.sepFila, sepFilas: g.sepFilas };
  if (cur.tipo !== 'monte') { cur.tipo = 'monte'; if (cur.config && Math.abs(+cur.config.velocidad - velDef('abierta')) < 1e-6) cur.config.velocidad = velDef('monte'); }
  await saveCur(); drawFinca();
  sheet(`<h3>🌳 Arboleda de diseño</h3>
    <div class="card"><div class="kv"><span>Árboles</span><span><b>${g.arboles.length}</b></span></div>
      <div class="kv"><span>Patrón</span><span>${fmt(cfg.sF, 2)} × ${fmt(cfg.sFs, 2)} m · ${Math.round(cfg.az)}°</span></div>
      <div class="kv"><span>Diámetro · distancia al linde</span><span>${Math.round(cfg.dm)} mm · ${fmt(cfg.mg, 1)} m</span></div></div>
    <div class="note">El círculo morado discontinuo es el árbol de referencia. Puedes cambiar patrón, diámetro o referencia en <b>Malla › ✎ Modificar patrón</b>.</div>
    <button class="btn" id="dzPl" style="margin-top:10px">🧭 ${cur.plan ? 'Recalcular' : 'Calcular'} trayectorias de diseño</button>`,
    () => { $('dzPl').onclick = () => { closeSheet(); if (cur.plan) { lyr.plan.clearLayers(); planOptions(); } else planMenu(); }; });
}
// malla real (árboles del borde): cambiar patrón → se reajusta con los árboles ya marcados
function patronBorde(M) {
  const num = v => String(+(+v).toFixed(2)).replace('.', ',');
  sheet(`<h3>✎ Patrón de la arboleda</h3>
    <div class="srow"><span>Separación en la fila (m)</span><input class="inp" id="pbY" inputmode="decimal" value="${num(M.exacta ? M.sFila : M.sepFila)}" style="width:90px;text-align:right"></div>
    <div class="srow"><span>Separación entre filas (m)</span><input class="inp" id="pbX" inputmode="decimal" value="${num(M.exacta ? M.sFilas : M.sepFilas)}" style="width:90px;text-align:right"></div>
    <div class="srow"><span>Usarlas como exactas</span><input type="checkbox" id="pbE" checked style="width:auto"></div>
    <div class="srow"><span>Diámetro medio del tronco (mm)</span><input class="inp" id="pbD" inputmode="numeric" value="${M.diam || S.diamTronco}" style="width:90px;text-align:right"></div>
    <button class="btn" id="pbOk" style="margin-top:10px">Reajustar malla</button>`,
    () => {
      $('pbOk').onclick = async () => {
        const n = id => parseFloat(($(id).value || '').replace(',', '.')), sF = n('pbY'), sFs = n('pbX'), dm = n('pbD');
        if (!(sF > 0.5 && sFs > 0.5 && dm > 0 && dm < 3000)) return toast('Valores no válidos');
        const P = Geo.projFor(cur.linde.coords), xy = M.bordes.map(b => P.fwd(b[0], b[1])), r = fitBorde(xy, M.bordes.map(b => !!b[2]), sF, sFs, $('pbE').checked);
        if (r.error) return toast(r.error, 4000);
        const ll = q => P.inv(q[0], q[1]).map(v => +v.toFixed(8));
        const nm = { ...M, A: ll(r.O), B: ll([r.O[0] + r.A[0], r.O[1] + r.A[1]]), C: ll([r.O[0] + r.B[0], r.O[1] + r.B[1]]), poly: r.idx, bordes: M.bordes.map((b, i) => [b[0], b[1], b[2], r.idx[i][0], r.idx[i][1]]), diam: Math.round(dm), sFila: sF, sFilas: sFs, exacta: $('pbE').checked, rms: r.rms };
        const g = genArboles({ ...cur, malla: nm }); if (g.error) return toast(g.error, 4000);
        cur.malla = { ...nm, arboles: g.arboles, sepFila: g.sepFila, sepFilas: g.sepFilas }; await saveCur(); closeSheet(); drawFinca();
        toast(`${g.arboles.length} árboles · ±${fmt(r.rms, 2)} m${cur.plan ? ' · recalcula el plan' : ''}`, 3500);
      };
    });
}
/* ---- Patrón a partir de varios árboles marcados (en cualquier orden) + linde ---- */
// busca rumbo, origen (y opcionalmente separaciones) de una retícula que pase por todos los árboles marcados
function fitMedidos(pts, sF, sFs, exacta, ang, dirs) {
  // dirs: rumbos candidatos [[az, ±tolerancia]] (p. ej. árboles 1 y 2 de la misma fila, o lados del linde); vacío = libre
  const n = pts.length; if (n < 3) return { error: 'Marca al menos 3 árboles (mejor 5–8, repartidos por filas distintas).' };
  ang = ang || 90;
  const P0 = pts[0], rel = pts.map(p => [p[0] - P0[0], p[1] - P0[1]]);
  const ext = Math.max(1, ...rel.map(d => Math.hypot(d[0], d[1])));
  const evalua = (az, fa, fb, full) => {
    const ua = [Math.sin(az * D2R), Math.cos(az * D2R)], bz = az - ang, ub = [Math.sin(bz * D2R), Math.cos(bz * D2R)];
    const A = [ua[0] * sF * fa, ua[1] * sF * fa], B = [ub[0] * sFs * fb, ub[1] * sFs * fb], det = A[0] * B[1] - A[1] * B[0];
    let ca = 0, sa = 0, cb = 0, sb = 0;
    const fa_ = new Float64Array(n), fb_ = new Float64Array(n);
    for (let k = 0; k < n; k++) { const d = rel[k], a = (d[0] * B[1] - d[1] * B[0]) / det, b = (A[0] * d[1] - A[1] * d[0]) / det; fa_[k] = a; fb_[k] = b; ca += Math.cos(2 * Math.PI * a); sa += Math.sin(2 * Math.PI * a); cb += Math.cos(2 * Math.PI * b); sb += Math.sin(2 * Math.PI * b); }
    const oa = Math.atan2(sa, ca) / (2 * Math.PI), ob = Math.atan2(sb, cb) / (2 * Math.PI);
    let e = 0; for (let k = 0; k < n; k++) { const da = fa_[k] - oa - Math.round(fa_[k] - oa), db = fb_[k] - ob - Math.round(fb_[k] - ob), x = da * A[0] + db * B[0], y = da * A[1] + db * B[1]; e += x * x + y * y; }
    e /= Math.hypot(A[0], A[1]) * Math.hypot(B[0], B[1]);
    if (!full) return e;
    const ij = []; for (let k = 0; k < n; k++) ij.push([Math.round(fa_[k] - oa), Math.round(fb_[k] - ob)]);
    return { e, A, B, ij, O: [P0[0] + oa * A[0] + ob * B[0], P0[1] + oa * A[1] + ob * B[1]], az, fa, fb };
  };
  // paso de rumbo según la extensión de los árboles marcados (que el error en el más lejano sea < 1/4 de separación)
  const paso = Math.max(0.05, Math.min(1, Math.atan(0.25 * Math.min(sF, sFs) / ext) / D2R));
  const F = exacta ? [1] : Array.from({ length: 17 }, (_, k) => 0.85 + k * 0.025);
  let bE = Infinity, bP = null; const porAz = new Map();
  const rangos = dirs && dirs.length ? dirs.map(([c, t]) => [c - t, c + t]) : [[0, 180]];
  for (const [a0, a1] of rangos) for (let az = a0; az < a1 + 1e-9; az += paso) for (const fa of F) for (const fb of F) { const e = evalua(az, fa, fb); if (e < bE) { bE = e; bP = [az, fa, fb]; } const kz = Math.round(az) % 180; if (!porAz.has(kz) || e < porAz.get(kz)) porAz.set(kz, e); }
  // afinado alrededor del mejor
  for (let d = -paso; d <= paso + 1e-9; d += paso / 5) for (const da of exacta ? [0] : [-0.01, -0.005, 0, 0.005, 0.01]) for (const db of exacta ? [0] : [-0.01, -0.005, 0, 0.005, 0.01]) { const e = evalua(bP[0] + d, bP[1] + da, bP[2] + db); if (e < bE) { bE = e; bP = [bP[0] + d, bP[1] + da, bP[2] + db]; } }
  let best = evalua(bP[0], bP[1], bP[2], true);
  // ambigüedad: otra solución claramente distinta casi igual de buena
  const dAz = (x, y) => { const d = Math.abs(x - y) % 180; return Math.min(d, 180 - d); };
  let seg = Infinity; porAz.forEach((e, kz) => { if (dAz(kz, best.az) > 4) seg = Math.min(seg, e); });
  const segundo = isFinite(seg) ? { e: seg } : null;
  let { O, A, B, ij } = best;
  if (!exacta && n >= 6) {   // ajuste fino por mínimos cuadrados con los índices fijados
    const N = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], bx = [0, 0, 0], by = [0, 0, 0];
    ij.forEach((q, k) => { const r = [1, q[0], q[1]]; for (let a = 0; a < 3; a++) { for (let b = 0; b < 3; b++) N[a][b] += r[a] * r[b]; bx[a] += r[a] * pts[k][0]; by[a] += r[a] * pts[k][1]; } });
    const sol = (M, v) => { const m = M.map((r, i) => [...r, v[i]]); for (let c = 0; c < 3; c++) { let pv = c; for (let r = c + 1; r < 3; r++) if (Math.abs(m[r][c]) > Math.abs(m[pv][c])) pv = r; [m[c], m[pv]] = [m[pv], m[c]]; if (Math.abs(m[c][c]) < 1e-9) return null; for (let r = 0; r < 3; r++) if (r !== c) { const f = m[r][c] / m[c][c]; for (let k = c; k < 4; k++) m[r][k] -= f * m[c][k]; } } return m.map((r, i) => r[3] / r[i]); };
    const X = sol(N, bx), Y = sol(N, by); if (X && Y) { O = [X[0], Y[0]]; A = [X[1], Y[1]]; B = [X[2], Y[2]]; }
  }
  const res = ij.map((q, k) => Math.hypot(O[0] + q[0] * A[0] + q[1] * B[0] - pts[k][0], O[1] + q[0] * A[1] + q[1] * B[1] - pts[k][1]));
  const rms = Math.sqrt(res.reduce((s, r) => s + r * r, 0) / n), filas = new Set(ij.map(q => q[1])).size, cols = new Set(ij.map(q => q[0])).size;
  return { O, A, B, idx: ij, rms, maxRes: Math.max(...res), az: ((Math.atan2(A[0], A[1]) / D2R) % 180 + 180) % 180, sepFila: Math.hypot(...A), sepFilas: Math.abs((A[0] * B[1] - A[1] * B[0]) / Math.hypot(...A)),
    ambiguo: (!dirs || !dirs.length) && !!(segundo && segundo.e < best.e * 1.6) || filas < 2 && cols < 2 || n < (dirs && dirs.length ? 3 : 6), filas, cols };
}
let medW = null;
function mallaMedidos() {
  if (!cur.linde) return toast('Primero define el linde (p. ej. desde SIGPAC)');
  medW = { pts: (cur.malla && cur.malla.medidos ? cur.malla.medidos.map(b => [b[0], b[1]]) : []), avg: null };
  map.on('click', medClick); medPanel();
}
function medPanel() {
  const W = medW; lyr.tmp.clearLayers();
  W.pts.forEach((p, i) => L.marker(p, { interactive: false, icon: L.divIcon({ className: '', html: `<div class="pin" style="background:#0277bd">${i + 1}</div>`, iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(lyr.tmp));
  const dist = +SB.distArbol || 1.0;
  showTool(`🌳 Árboles marcados: ${W.pts.length}`, `Pulsa <b>MARCAR ÁRBOL</b> al pasar a la altura de cada árbol: se guarda a <b>${fmt(dist, 2)} m a tu derecha</b> (sentido de avance). Marca exteriores e interiores, los que quieras.
     <div class="srow" style="margin:6px 0 0"><span>Distancia a tu derecha</span><span style="display:flex;gap:6px;align-items:center"><button class="btn sec" id="mdDm" style="width:40px;padding:6px 0">−</button><b style="min-width:52px;text-align:center">${Math.round(dist * 1000)} mm</b><button class="btn sec" id="mdDp" style="width:40px;padding:6px 0">＋</button></span></div>`,
    [['↶', 'sec', () => { if (W.avg) return; W.pts.pop(); medPanel(); }, !W.pts.length], ['🌳 MARCAR ÁRBOL', '', medPaso], ['Terminar', 'sec', () => { map.off('click', medClick); medidosFin(W.pts, cur.malla && cur.malla.modo === 'medidos' ? cur.malla : null); }, W.pts.length < 3]]);
  const st = d => { SB.distArbol = Math.max(0, Math.min(3, Math.round(((+SB.distArbol || 1.0) + d) * 20) / 20)); DB.kvPut('settings', SB); medPanel(); };
  $('mdDm').onclick = () => st(-0.05); $('mdDp').onclick = () => st(0.05);
  const bM = [...document.querySelectorAll('#toolBtns button')].find(b => /MARCAR/.test(b.textContent)); if (bM) bM.style.cssText += ';flex:2.2;font-size:19px;font-weight:700;min-height:64px';
  const cancel = document.createElement('button'); cancel.className = 'lnk'; cancel.textContent = 'Cancelar'; cancel.style.cssText = 'margin:6px 0 0'; cancel.onclick = medCancel; $('toolHint').appendChild(cancel);
  const r = rumboAvance(); if (W.pts.length || r) $('toolTitle').textContent += r ? ' · rumbo ✓' : ' · camina para fijar el rumbo';
}
// árbol al pasar: posición GPS actual desplazada al lado indicado, perpendicular al sentido de avance
function medPaso() {
  if (!lastPos || gpsAge() > 4) return toast('Sin posición GPS reciente');
  if (lastPos.acc > Math.max(S.umbralPrecision || 8, 8)) return toast(`GPS poco preciso (±${fmt(lastPos.acc, 1)} m): espera un momento`);
  const r = rumboAvance(); if (!r) return toast('Camina unos pasos para saber el sentido de avance', 3500);
  const d = +SB.distArbol || 1.0, sg = 1, P = Geo.proj(lastPos.lat, lastPos.lon);   // siempre a la derecha del avance
  const q = P.inv(sg * r.u[1] * d, -sg * r.u[0] * d);   // derecha del avance = (uy, −ux)
  medW.pts.push([+q[0].toFixed(8), +q[1].toFixed(8)]); speak('Árbol ' + medW.pts.length);
  toast(`🌳 Árbol ${medW.pts.length} (±${fmt(lastPos.acc, 1)} m)`, 1200); medPanel();
}
function medCancel() { if (medW && medW.avg) clearInterval(medW.avg); map.off('click', medClick); medW = null; lyr.tmp.clearLayers(); showMain(); }
function medClick(e) { if (!medW || medW.avg) return; medW.pts.push([+e.latlng.lat.toFixed(7), +e.latlng.lng.toFixed(7)]); medPanel(); }
function medGPS() {
  if (medW.avg) return;
  medW.avg = avgGPS(SB.promedioS || 10, (n, k) => { $('toolHint').innerHTML = `Promediando GPS… ${n} s · ${k} lecturas. No te muevas.`; }, (ll, acc) => {
    medW.avg = null;
    if (!ll) { toast('Precisión GPS insuficiente: espera o toca el árbol en el mapa'); return medPanel(); }
    medW.pts.push([+ll[0].toFixed(8), +ll[1].toFixed(8)]); toast(`Árbol ${medW.pts.length} (±${fmt(acc, 1)} m)`); medPanel();
  });
}
function medidosFin(pts, M0) {
  const num = v => String(+(+v).toFixed(2)).replace('.', ',');
  const P = Geo.projFor(cur.linde.coords), xy = pts.map(p => P.fwd(p[0], p[1])), lin = Geo.toXY(cur.linde.coords, P);
  // distancia de cada árbol marcado al linde: los exteriores marcan hasta dónde llega la arboleda
  const dLin = q => { let m = Infinity; for (let i = 0; i < lin.length; i++) { const a = lin[i], b = lin[(i + 1) % lin.length], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-12; let u = ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / L2; u = Math.max(0, Math.min(1, u)); m = Math.min(m, Math.hypot(q[0] - a[0] - u * dx, q[1] - a[1] - u * dy)); } return m; };
  const dMin = Math.min(...xy.map(dLin)), sF0 = M0 ? M0.sFila : S.mallaY, sFs0 = M0 ? M0.sFilas : S.mallaX;
  const mAuto = Math.max(0, dMin - 0.4 * Math.min(sF0, sFs0));
  sheet(`<h3>🌳 Arboleda desde ${pts.length} árboles</h3>
    <div class="srow"><span>Patrón: separación en la fila (mm)</span><input class="inp" id="mdY" inputmode="numeric" value="${Math.round(sF0 * 1000)}" style="width:100px;text-align:right"></div>
    <div class="srow"><span>Patrón: separación entre filas (mm)</span><input class="inp" id="mdX" inputmode="numeric" value="${Math.round(sFs0 * 1000)}" style="width:100px;text-align:right"></div>
    <div class="srow"><span>Diámetro del árbol (mm)</span><input class="inp" id="mdD" inputmode="numeric" value="${M0 ? M0.diam : S.diamTronco || 500}" style="width:100px;text-align:right"></div>
    <div class="srow"><span>Árboles hasta (m del linde)</span><input class="inp" id="mdM" inputmode="decimal" value="${num(M0 && M0.margen != null ? M0.margen : mAuto)}" style="width:100px;text-align:right"></div>
    <div class="note">El árbol marcado más próximo al linde está a ${num(dMin)} m. La arboleda llega hasta ahí (no se ponen árboles más cerca del linde).</div>
    <div id="mdR"></div>
    <div class="row" style="margin-top:12px"><button class="btn sec" id="mdV">‹ Marcar más</button><button class="btn" id="mdOk" disabled>Generar arboleda</button></div>`,
    () => {
      let res = null, tm = null;
      const n = id => parseFloat(($(id).value || '').replace(',', '.'));
      $('mdV').onclick = () => { closeSheet(); if (!medW) medW = { pts: pts.slice(), avg: null }; map.on('click', medClick); medPanel(); };
      const calc = () => {
        const sF = n('mdY') / 1000, sFs = n('mdX') / 1000, mg = n('mdM'), dm = n('mdD');
        if (!(sF > 0.5 && sFs > 0.5 && mg >= 0 && dm > 0 && dm < 3000)) { $('mdR').innerHTML = '<div class="card warnc">Valores no válidos</div>'; $('mdOk').disabled = true; return; }
        // orientación: libre y, como alternativa, paralela a los lados del linde; se queda la que mejor encaja
        const lx = lin.map((p, i) => { const q = lin[(i + 1) % lin.length]; return [Geo.dist(p, q), ((Math.atan2(q[0] - p[0], q[1] - p[1]) / D2R) % 180 + 180) % 180]; }).sort((a, b) => b[0] - a[0]).slice(0, 4).flatMap(([, az]) => [[az, 4], [(az + 90) % 180, 4]]);
        const rL = fitMedidos(xy, sF, sFs, true, 90, lx), rF = fitMedidos(xy, sF, sFs, true, 90, null);
        const r = rL.error ? rF : rF.error ? rL : (rL.rms <= rF.rms * 1.15 ? rL : rF);
        if (r.error) { $('mdR').innerHTML = `<div class="card warnc">${esc(r.error)}</div>`; $('mdOk').disabled = true; return; }
        const ll = q => P.inv(q[0], q[1]).map(v => +v.toFixed(8));
        const malla = { modo: 'medidos', A: ll(r.O), B: ll([r.O[0] + r.A[0], r.O[1] + r.A[1]]), C: ll([r.O[0] + r.B[0], r.O[1] + r.B[1]]), nAB: 2, nAC: 2, nominal: false,
          medidos: pts.map((p, i) => [p[0], p[1], r.idx[i][0], r.idx[i][1]]), sFila: sF, sFilas: sFs, exacta: true, ang: 90, margen: mg, diam: Math.round(dm), rms: r.rms, az: +r.az.toFixed(2), faltas: (M0 && M0.faltas) || [] };
        const g = genArboles({ ...cur, malla });
        if (g.error) { $('mdR').innerHTML = `<div class="card warnc">${esc(g.error)}</div>`; $('mdOk').disabled = true; return; }
        res = { ...malla, arboles: g.arboles, sepFila: g.sepFila, sepFilas: g.sepFilas };
        const mal = r.ambiguo || r.rms > Math.min(sF, sFs) * 0.25;
        $('mdR').innerHTML = `<div class="card" style="background:${mal ? '#fff3e0' : '#e8f5e9'}">
          <div class="kv"><span><b>Árboles en la finca</b></span><span><b>${g.arboles.length}</b></span></div>
          <div class="kv"><span>Rumbo de las filas</span><span>${Math.round(r.az)}°</span></div>
          <div class="kv"><span>Desviación de tus árboles marcados</span><span>±${fmt(r.rms, 2)} m</span></div>
          ${mal ? '<div style="color:var(--warn);margin-top:4px">⚠️ Encaje poco seguro: marca más árboles, separados y en filas distintas (exteriores e interiores).</div>' : ''}</div>`;
        $('mdOk').disabled = false;
        lyr.tmp.clearLayers(); drawArboles({ malla: res }, lyr.tmp);
      };
      ['mdY', 'mdX', 'mdD', 'mdM'].forEach(id => $(id).oninput = () => { clearTimeout(tm); tm = setTimeout(calc, 400); });
      $('mdOk').onclick = async () => {
        if (!res) return;
        if (cur.tipo !== 'monte') { cur.tipo = 'monte'; if (cur.config && Math.abs(+cur.config.velocidad - velDef('abierta')) < 1e-6) cur.config.velocidad = velDef('monte'); }
        cur.malla = res; S.mallaY = res.sFila; S.mallaX = res.sFilas; S.diamTronco = res.diam; await saveSB(); await saveCur(); closeSheet(); medW = null; lyr.tmp.clearLayers(); showMain(); drawFinca();
        sheet(`<h3>🌳 Arboleda generada</h3><div class="card"><div class="kv"><span>Árboles</span><span><b>${res.arboles.length}</b></span></div><div class="kv"><span>Marcados por ti</span><span>${pts.length} (círculos azules)</span></div></div>
          <button class="btn" id="mdPl" style="margin-top:10px">🧭 ${cur.plan ? 'Recalcular' : 'Calcular'} plan de trabajo</button>`, () => { $('mdPl').onclick = () => { closeSheet(); if (cur.plan) { lyr.plan.clearLayers(); planOptions(); } else planMenu(); }; });
      };
      calc();
    });
}
// tras traer o medir el linde de un monte sin malla: proponer la malla
function guiaMalla() {
  if (!cur || cur.tipo !== 'monte' || !cur.linde || cur.malla) return false;
  setTimeout(() => { closeSheet(); toast('🌳 Marca árboles: pulsa MARCAR ÁRBOL al pasar junto a cada uno', 4000); mallaMedidos(); }, 700);
  return true;
}
function mallaMetodo() {
  sheet(`<h3>Malla de árboles</h3>
    <button class="opt" id="mmB">🌳 Árboles del borde (recomendado)<small>Marca en orden, a pie o en tractor, los árboles de las esquinas y algunos intermedios de cada lado. La app ajusta la malla completa.</small></button>
    <button class="opt" id="mmM">📍 Varios árboles con GPS + linde<small>Marca algunos árboles reales (en cualquier orden). La app ajusta el patrón y lo extiende a todo el linde (p. ej. el de SIGPAC).</small></button>
    <button class="opt" id="mmD">🧪 Diseño teórico (árbol ficticio)<small>Sin medir árboles: p. ej. con el linde de SIGPAC. Indicas el patrón y un árbol de referencia; la app dibuja la arboleda y calcula las trayectorias de diseño.</small></button>
    <button class="opt" id="mmA">📐 Tres árboles A–B–C<small>Plantación rectangular: esquina, final de fila y final de columna.</small></button>`, () => {
    $('mmB').onclick = () => { closeSheet(); mallaBorde(); };
    $('mmD').onclick = () => mallaDiseno();
    $('mmM').onclick = () => { closeSheet(); mallaMedidos(); };
    $('mmA').onclick = () => { closeSheet(); mallaWizard(); };
  });
}
function mallaWizard() {
  mallaW = { pts: [], step: 0, avg: null };
  map.on('click', mallaClick); mallaStep();
}
const MALLA_TXT = [
  ['Árbol A', 'Árbol de una ESQUINA de la plantación.'],
  ['Árbol B', 'Último árbol de la MISMA FILA que A (dirección de trabajo).'],
  ['Árbol C', 'Último árbol en la OTRA dirección, en la misma columna que A.']
];
function mallaStep() {
  const k = mallaW.step;
  lyr.tmp.clearLayers();
  mallaW.pts.forEach((p, i) => L.marker(p, { icon: L.divIcon({ className: '', html: `<div class="pin" style="background:#33691e">${'ABC'[i]}</div>`, iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(lyr.tmp));
  if (mallaW.pts.length > 1) L.polyline([mallaW.pts[0], mallaW.pts[1]], { color: '#33691e', dashArray: '4 4' }).addTo(lyr.tmp);
  if (mallaW.pts.length > 2) L.polyline([mallaW.pts[0], mallaW.pts[2]], { color: '#33691e', dashArray: '4 4' }).addTo(lyr.tmp);
  showTool(MALLA_TXT[k][0] + ' (' + (k + 1) + '/3)', MALLA_TXT[k][1] + '<br>Toca el árbol en la ortofoto o colócate junto al tronco y pulsa «GPS».',
    [['Cancelar', 'sec', mallaCancel], ['Atrás', 'sec', () => { if (mallaW.avg) return; mallaW.pts.pop(); mallaW.step = Math.max(0, mallaW.step - 1); mallaStep(); }, k === 0], ['GPS (15 s)', '', mallaGPS]]);
}
function mallaCancel() { if (mallaW && mallaW.avg) clearInterval(mallaW.avg); map.off('click', mallaClick); mallaW = null; lyr.tmp.clearLayers(); showMain(); }
function mallaClick(e) { if (!mallaW || mallaW.avg) return; mallaSet([e.latlng.lat, e.latlng.lng]); }
function mallaGPS() {
  startGPS(); const S0 = []; let n = 15;
  $('toolHint').innerHTML = 'Promediando GPS… 15 s. No te muevas.';
  mallaW.avg = setInterval(() => {
    if (lastPos && lastPos.acc <= S.umbralPrecision) S0.push(lastPos);
    n--; $('toolHint').innerHTML = `Promediando GPS… ${n} s · ${S0.length} lecturas`;
    if (n <= 0) {
      clearInterval(mallaW.avg); mallaW.avg = null;
      if (S0.length < 3) { toast('Precisión GPS insuficiente; toca el árbol en el mapa'); return mallaStep(); }
      let sw = 0, la = 0, lo = 0; S0.forEach(p => { const w = 1 / (p.acc * p.acc); sw += w; la += p.lat * w; lo += p.lon * w; });
      toast(`Posición promediada (±${fmt(Math.sqrt(1 / sw), 1)} m)`);
      mallaSet([la / sw, lo / sw]);
    }
  }, 1000);
}
function mallaSet(ll) {
  mallaW.pts.push(ll); mallaW.step++;
  if (mallaW.step < 3) return mallaStep();
  map.off('click', mallaClick);
  const [A, B, C] = mallaW.pts, dAB = Geo.lenLL([A, B]), dAC = Geo.lenLL([A, C]);
  const old = cur.malla;
  const nAB0 = Math.max(2, Math.round(dAB / S.mallaY) + 1), nAC0 = Math.max(2, Math.round(dAC / S.mallaX) + 1);
  sheet(`<h3>Recuento de árboles</h3>
    <div class="note">A–B mide ${fmt(dAB, 1)} m · A–C mide ${fmt(dAC, 1)} m.</div>
    <div class="srow"><span>Árboles en la fila A–B (contando A y B)</span><input class="inp" id="mAB" inputmode="numeric" value="${nAB0}" style="width:80px;text-align:right"></div>
    <div class="srow"><span>Árboles en la columna A–C (contando A y C)</span><input class="inp" id="mAC" inputmode="numeric" value="${nAC0}" style="width:80px;text-align:right"></div>
    <div class="note" id="mSep"></div>
    <div class="srow"><span>Usar separación nominal (${fmt(S.mallaX, 1)} × ${fmt(S.mallaY, 1)} m) con la orientación medida</span><input type="checkbox" id="mNom" ${old && old.nominal ? 'checked' : ''} style="width:auto"></div>
    <div class="row" style="margin-top:12px"><button class="btn sec" id="mCan">Cancelar</button><button class="btn" id="mOk">Generar malla</button></div>`,
    () => {
      const upd = () => { const a = parseInt($('mAB').value), c = parseInt($('mAC').value); if (a > 1 && c > 1) { const sa = dAB / (a - 1), sc = dAC / (c - 1); const bad = Math.abs(sa - S.mallaY) / S.mallaY > .15 || Math.abs(sc - S.mallaX) / S.mallaX > .15; $('mSep').innerHTML = `Separación medida: ${fmt(sa, 2)} m en fila · ${fmt(sc, 2)} m entre filas${bad ? '<br><span style="color:var(--warn)">⚠️ Difiere más de un 15 % de la nominal: revisa los recuentos.</span>' : ''}`; } };
      $('mAB').oninput = $('mAC').oninput = upd; upd();
      $('mCan').onclick = () => { closeSheet(); mallaCancel(); };
      $('mOk').onclick = async () => {
        const nAB = parseInt($('mAB').value), nAC = parseInt($('mAC').value);
        if (!(nAB > 1 && nAC > 1)) return toast('Recuentos no válidos (mínimo 2)');
        const tmp = { ...cur, malla: { A, B, C, nAB, nAC, nominal: $('mNom').checked, faltas: [] } };
        const r = genArboles(tmp); if (r.error) return toast(r.error, 4000);
        cur.malla = { ...tmp.malla, arboles: r.arboles, sepFila: r.sepFila, sepFilas: r.sepFilas };
        await saveCur(); closeSheet(); mallaW = null; lyr.tmp.clearLayers(); showMain(); drawFinca();
        toast(`${r.arboles.length} árboles en la malla`);
      };
    });
}
function faltasMode() {
  const set = new Set(cur.malla.faltas || []);
  const onC = e => {
    const P = Geo.projFor(cur.linde.coords), q = P.fwd(e.latlng.lat, e.latlng.lng);
    let bi = -1, bd = Infinity; cur.malla.arboles.forEach((a, i) => { const d = Geo.dist(q, P.fwd(a[0], a[1])); if (d < bd) { bd = d; bi = i; } });
    if (bi < 0 || bd > 1.6) return;
    const a = cur.malla.arboles[bi], k = a[2] + ',' + a[3];
    if (set.has(k)) { set.delete(k); a[4] = 0; } else { set.add(k); a[4] = 1; }
    lyr.finca.clearLayers(); drawArboles(cur, lyr.finca);
  };
  map.on('click', onC);
  const fin = async save => { map.off('click', onC); if (save) { cur.malla.faltas = [...set]; await saveCur(); } else { const r = genArboles(cur); cur.malla.arboles = r.arboles; } showMain(); drawFinca(); };
  showTool('Faltas de árboles', 'Toca un árbol para marcarlo como falta (gris) o volver a activarlo.', [['Cancelar', 'sec', () => fin(false)], ['Guardar', '', () => fin(true)]]);
}

