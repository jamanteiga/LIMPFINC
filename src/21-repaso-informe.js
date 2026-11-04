'use strict';
/* =========================================================
   v2.2 — Retomar ruta, repaso de zonas sin limpiar, informe anual, exportar peligros
   ========================================================= */

/* ---- 1. Retomar una ruta a medias: punto exacto donde quedó el plan ---- */
// recorre las pasadas del plan en orden y busca el primer tramo (≥ 3 m) que la ruta no limpió, a partir de la última pasada hecha
function puntoReanudar(R) {
  if (!R || !R.plan || !R.g) return null;
  const g = R.g, P = g.P, parts = R.plan.parts, info = planGuide(R.plan);
  const limpio = xy => { const c = Math.floor((xy[0] - g.x0) / g.cs), r = Math.floor((xy[1] - g.y0) / g.cs); if (c < 0 || r < 0 || c >= g.cols || r >= g.rows) return true; const k = r * g.cols + c; return !g.mask[k] || g.cnt[k] > 0 || (g.treeM && g.treeM[k]); };
  const muestras = parts.map((p, i) => {
    if (p.type !== 'trabajo') return null;
    const xy = Geo.toXY(p.ll, P), s = [];
    for (let j = 1; j < xy.length; j++) { const a = xy[j - 1], b = xy[j], L = Geo.dist(a, b), n = Math.max(1, Math.ceil(L)); for (let k = 0; k < n; k++) s.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); }
    if (xy.length) s.push(xy[xy.length - 1]);
    const ok = s.map(limpio); return { i, s, ok, frac: ok.filter(Boolean).length / (ok.length || 1) };
  });
  const hechas = muestras.filter(m => m && m.frac >= 0.5);
  if (!hechas.length) return null;   // aún no se hizo nada: se empieza por el inicio del plan
  // última posición de corte de la ruta → pasada hecha más cercana: ahí quedó el trabajo
  const ult = [...(R.outs || [])].reverse().find(o => o); let kLast = hechas[hechas.length - 1].i, j0 = 0;
  if (ult) { const q = P.fwd(ult[0][0], ult[0][1]); let bd = Infinity; hechas.forEach(m => m.s.forEach((x, j) => { const d = Geo.dist(x, q); if (d < bd) { bd = d; kLast = m.i; j0 = j; } })); }
  const tramo = (m, desde) => { for (let j = desde; j < m.s.length; j++) if (!m.ok[j] && !m.ok[Math.min(j + 1, m.s.length - 1)] && !m.ok[Math.min(j + 2, m.s.length - 1)]) { const ll = P.inv(m.s[j][0], m.s[j][1]); return { ll: [+ll[0].toFixed(7), +ll[1].toFixed(7)], part: m.i, lab: info[m.i] ? info[m.i].lab : 'Pasada', faltan: m.s.length - j }; } return null; };
  const busca = (desde, hasta) => { for (let i = desde; i <= hasta; i++) { const m = muestras[i]; if (!m) continue; const x = i === kLast ? tramo(m, j0) : m.frac < 0.6 ? tramo(m, 0) : null; if (x) return x; } return null; };
  const r = busca(kLast, parts.length - 1) || (() => { const x = busca(0, kLast - 1); return x ? { ...x, atras: true } : null; })();
  return r || { completo: true };
}
function resumeInit(R, trab) {
  const res = puntoReanudar(R);
  if (!res) return;
  if (res.completo) { setTimeout(() => toast('✅ El plan ya está recorrido en esta ruta. Para lo que quedó sin limpiar usa ⋯ › 🛤 Rutas › 🧹 Repaso de zonas sin limpiar.', 6000), 400); return; }
  trab.reanudar = { ll: res.ll, part: res.part, lab: res.lab, fecha: Date.now() };
  work.resume = { ...res, done: false, band: null, tSay: Date.now() };
  work.guide.part = res.part - 1;
  work.resLayer = L.layerGroup().addTo(map);
  L.marker(res.ll, { zIndexOffset: 950, interactive: false, icon: L.divIcon({ className: '', html: '<div class="pin" style="background:#ef6c00;width:30px;height:30px;line-height:30px;font-size:18px">↻</div>', iconSize: [30, 30], iconAnchor: [15, 15] }) }).addTo(work.resLayer);
  work.resLine = L.polyline([res.ll, res.ll], { color: '#ef6c00', weight: 4, dashArray: '8 8', interactive: false }).addTo(work.resLayer);
  const d = lastPos ? Geo.lenLL([[lastPos.lat, lastPos.lon], res.ll]) : null;
  toast(`↻ Reanudar en ${res.lab}${res.atras ? ' (tramo que quedó atrás)' : ''}${d != null ? ' · a ' + fmt(d, 0) + ' m' : ''}. Sigue la línea naranja.`, 6000);
  speak(`Punto de reanudación: ${res.lab.toLowerCase()}${d != null ? ', a ' + Math.round(d) + ' metros' : ''}`, true);
  resumeUpdate(lastPos);
}
function resumeTxt(p) {
  const R_ = work && work.resume; if (!R_ || R_.done || !p) return null;
  const P = Geo.proj(p.lat, p.lon), q = P.fwd(R_.ll[0], R_.ll[1]), d = Math.hypot(q[0], q[1]);
  let lado = ''; const h = rumboAvance();
  if (h && d > 3) { const u = [q[0] / d, q[1] / d], dot = u[0] * h.u[0] + u[1] * h.u[1], cr = h.u[0] * u[1] - h.u[1] * u[0]; lado = dot > 0.85 ? 'delante' : dot < -0.6 ? 'detrás' : cr > 0 ? 'a la izquierda' : 'a la derecha'; }
  return { d, lado };
}
function resumeUpdate(p) {
  const R_ = work && work.resume; if (!R_ || R_.done || !p) return;
  const r = resumeTxt(p); if (!r) return;
  if (work.resLine) work.resLine.setLatLngs([[p.lat, p.lon], R_.ll]);
  if (r.d <= Math.max(3, Math.min(p.acc || 3, 6))) {
    R_.done = true; if (work.resLayer) { map.removeLayer(work.resLayer); work.resLayer = null; }
    speak(`Punto de reanudación alcanzado. ${R_.lab}. Baja el apero y continúa`, true); toast(`✅ Punto de reanudación alcanzado: ${R_.lab}`, 4000);
    $('wPass').textContent = R_.lab; $('wNext').textContent = ''; return;
  }
  resumePaint(p);
  const band = r.d > 100 ? Math.round(r.d / 50) * 50 : r.d > 30 ? Math.round(r.d / 25) * 25 : r.d > 12 ? 15 : 8;
  if (band !== R_.band && (p.t || Date.now()) - R_.tSay > 6000) { R_.band = band; R_.tSay = p.t || Date.now(); speak(`Reanudación a ${Math.round(r.d)} metros${r.lado ? ', ' + r.lado : ''}`); }
}
function resumePaint(p) {
  const R_ = work && work.resume; if (!R_ || R_.done || !p) return; const r = resumeTxt(p); if (!r) return;
  $('wGuide').classList.remove('hidden');
  $('wPass').textContent = `↻ Reanudar ${R_.lab}: ${fmt(r.d, 0)} m${r.lado ? ' ' + r.lado : ''}`;
  $('wNext').textContent = 'Ve a la marca ↻ naranja (línea discontinua)';
}
function resumeEnd() { if (work && work.resLayer) { map.removeLayer(work.resLayer); work.resLayer = null; } }

/* ---- 2. Repaso de zonas sin limpiar: plan corto solo por lo rojo ---- */
function rasterLibre(g, clear, clearT) {
  // distancias (m) de cada celda a lo prohibido: fuera del linde/exclusiones y troncos (por separado)
  const { cols, rows, cs, mask } = g, N = cols * rows, INF = 1e9;
  const dist = isBad => { const d = new Float32Array(N);
    for (let k = 0; k < N; k++) d[k] = isBad(k) ? 0 : INF;
    const a = 1, b = Math.SQRT2;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const k = r * cols + c; if (!d[k]) continue; let v = d[k];
      if (c > 0) v = Math.min(v, d[k - 1] + a); if (r > 0) { v = Math.min(v, d[k - cols] + a); if (c > 0) v = Math.min(v, d[k - cols - 1] + b); if (c < cols - 1) v = Math.min(v, d[k - cols + 1] + b); } d[k] = v; }
    for (let r = rows - 1; r >= 0; r--) for (let c = cols - 1; c >= 0; c--) { const k = r * cols + c; if (!d[k]) continue; let v = d[k];
      if (c < cols - 1) v = Math.min(v, d[k + 1] + a); if (r < rows - 1) { v = Math.min(v, d[k + cols] + a); if (c < cols - 1) v = Math.min(v, d[k + cols + 1] + b); if (c > 0) v = Math.min(v, d[k + cols - 1] + b); } d[k] = v; }
    return d; };
  const dO = dist(k => !mask[k]), dT = g.treeM ? dist(k => g.treeM[k]) : null, lim = clear / cs, limT = (clearT != null ? clearT : clear) / cs;
  // sinArboles: pasadas por la calle ya separadas de los troncos por construcción (como el plan)
  const ok = (xy, sinArboles) => { const c = Math.floor((xy[0] - g.x0) / cs), r = Math.floor((xy[1] - g.y0) / cs); if (c < 0 || r < 0 || c >= cols || r >= rows) return false; const k = r * cols + c; return dO[k] >= lim && (sinArboles || !dT || dT[k] >= limT); };
  return { ok };
}
// camino libre entre dos puntos: recto si cabe; si no, A* en rejilla de 1 m y tensado de la cuerda
function caminoLibre(a, b, L_, g) {
  const recto = (p, q) => { const n = Math.max(1, Math.ceil(Geo.dist(p, q) / (g.cs * 2))); for (let i = 0; i <= n; i++) if (!L_.ok([p[0] + (q[0] - p[0]) * i / n, p[1] + (q[1] - p[1]) * i / n])) return false; return true; };
  if (recto(a, b)) return [a, b];
  const s = 1, X0 = g.x0, Y0 = g.y0, C = Math.ceil(g.cols * g.cs / s), Rr = Math.ceil(g.rows * g.cs / s);
  const free = (i, j) => i >= 0 && j >= 0 && i < C && j < Rr && L_.ok([X0 + (i + .5) * s, Y0 + (j + .5) * s]);
  const cel = p => [Math.floor((p[0] - X0) / s), Math.floor((p[1] - Y0) / s)];
  const near = p => { const [i0, j0] = cel(p); for (let rr = 0; rr < 6; rr++) for (let di = -rr; di <= rr; di++) for (let dj = -rr; dj <= rr; dj++) if (free(i0 + di, j0 + dj)) return [i0 + di, j0 + dj]; return null; };
  const A = near(a), B = near(b); if (!A || !B) return [a, b];
  const key = (i, j) => j * C + i, gS = new Map([[key(...A), 0]]), from = new Map(), open = [[Math.hypot(A[0] - B[0], A[1] - B[1]), A[0], A[1]]], done = new Set();
  let found = false, it = 0;
  while (open.length && it++ < 200000) {
    let bi = 0; for (let k = 1; k < open.length; k++) if (open[k][0] < open[bi][0]) bi = k;
    const [, i, j] = open[bi]; open[bi] = open[open.length - 1]; open.pop();
    const k0 = key(i, j); if (done.has(k0)) continue; done.add(k0);
    if (i === B[0] && j === B[1]) { found = true; break; }
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const ni = i + di, nj = j + dj; if (!free(ni, nj)) continue; const nk = key(ni, nj); if (done.has(nk)) continue;
      const ng = gS.get(k0) + Math.hypot(di, dj); if (ng < (gS.get(nk) ?? Infinity)) { gS.set(nk, ng); from.set(nk, k0); open.push([ng + Math.hypot(ni - B[0], nj - B[1]), ni, nj]); }
    }
  }
  if (!found) return [a, b];
  const pth = []; let k = key(...B); while (k != null) { pth.push([X0 + (k % C + .5) * s, Y0 + (Math.floor(k / C) + .5) * s]); k = from.get(k); }
  pth.reverse(); const full = [a, ...pth, b], out = [a]; let i = 0;
  while (i < full.length - 1) { let j = full.length - 1; while (j > i + 1 && !recto(full[i], full[j])) j--; out.push(full[j]); i = j; }
  return out;
}
function rumboPlan(f) {
  if (f.plan && f.plan.parts) { const sw = f.plan.parts.filter(p => p.swath && p.ll.length > 1).sort((a, b) => Geo.lenLL(b.ll) - Geo.lenLL(a.ll))[0]; if (sw) { const P = Geo.projFor(sw.ll), a = P.fwd(...sw.ll[0]), b = P.fwd(...sw.ll[sw.ll.length - 1]); return Math.atan2(b[1] - a[1], b[0] - a[0]); } }
  const P = Geo.projFor(f.linde.coords), xy = Geo.toXY(f.linde.coords, P); let best = 0, ang = 0;
  xy.forEach((p, i) => { const q = xy[(i + 1) % xy.length], L = Geo.dist(p, q); if (L > best) { best = L; ang = Math.atan2(q[1] - p[1], q[0] - p[0]); } });
  return ang;
}
function planRepaso(f, t, o) {
  o = o || {};
  const T0 = performance.now(), R = rebuildTrab(f, t), g = R.g, S2 = R.S2 || effS(f), cs = g.cs;
  const w = S2.aperoAncho, wEff = Math.max(0.5, w - (S2.solape != null ? +S2.solape : 0.1)), minA = o.minArea != null ? o.minArea : 0.5;
  const L_ = rasterLibre(g, w / 2 + 0.35, w / 2 + 0.2);
  let th = rumboPlan(f);
  const M = f.malla; if (M && M.A && M.B && M.nAB > 1) { try { const ab = mallaVec(f, g.P).ab; th = Math.atan2(ab[1], ab[0]); } catch (e) { } }
  const ux = [Math.cos(th), Math.sin(th)], vy = [-ux[1], ux[0]];
  // celdas rojas en coordenadas (u, v)
  const red = []; let nRed = 0;
  for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) { const k = r * g.cols + c; if (!g.mask[k] || g.cnt[k] || (g.treeM && g.treeM[k])) continue; nRed++; const x = g.x0 + (c + .5) * cs, y = g.y0 + (r + .5) * cs; red.push([x * ux[0] + y * ux[1], x * vy[0] + y * vy[1]]); }
  if (!nRed) return { vacio: true };
  const v0 = Math.min(...red.map(p => p[1])), strips = new Map(), toXY = (u, v) => [u * ux[0] + v * vy[0], u * ux[1] + v * vy[1]];
  // monte: dos pasadas por calle, arrimadas a cada hilera (como el plan); fuera de la arboleda, franjas normales
  let lanes = null, vr0 = 0, vr1 = 0;
  if (M && M.arboles && M.arboles.length >= 6) {
    const vs = M.arboles.filter(a => !a[4]).map(a => { const q = g.P.fwd(a[0], a[1]); return q[0] * vy[0] + q[1] * vy[1]; }).sort((a, b) => a - b), rows = []; let grp = [vs[0]];
    for (let i = 1; i < vs.length; i++) { if (vs[i] - vs[i - 1] > 1) { rows.push(grp.reduce((q, x) => q + x, 0) / grp.length); grp = []; } grp.push(vs[i]); } rows.push(grp.reduce((q, x) => q + x, 0) / grp.length);
    if (rows.length >= 2) {
      const cpas = (+(M.diam || S2.diamTronco || 500)) / 2000 + (S2.holguraTronco || 0.3) + w / 2; lanes = [];
      for (let i = 0; i + 1 < rows.length; i++) { const a = rows[i], b = rows[i + 1]; if (b - a < 2 * cpas) lanes.push((a + b) / 2); else lanes.push(a + cpas, b - cpas); }
      vr0 = rows[0]; vr1 = rows[rows.length - 1];
    }
  }
  red.forEach(p => {
    let key, v;
    if (lanes && p[1] > vr0 && p[1] < vr1) { let bi = 0; lanes.forEach((x, i) => { if (Math.abs(x - p[1]) < Math.abs(lanes[bi] - p[1])) bi = i; }); if (Math.abs(lanes[bi] - p[1]) > w / 2) return; key = 'm' + bi; v = lanes[bi]; }
    else { const sI = Math.floor((p[1] - v0) / wEff); key = 'g' + sI; v = v0 + (sI + .5) * wEff; }
    (strips.get(key) || strips.set(key, { v, m: key[0] === 'm', us: [] }).get(key)).us.push(p[0]);
  });
  const segs = [];
  for (const [, st] of strips) {
    const us = st.us.sort((a, b) => a - b);
    const ivs = []; let a = us[0], b = us[0], n = 1;
    for (let i = 1; i < us.length; i++) { if (us[i] - b <= 2) { b = us[i]; n++; } else { ivs.push([a, b, n]); a = b = us[i]; n = 1; } }
    ivs.push([a, b, n]);
    for (const [ua, ub, cnt] of ivs) {
      if (cnt * cs * cs < minA) continue;
      let A = ua - 0.6, B = ub + 0.6; if (B - A < 2) { const m = (A + B) / 2; A = m - 1; B = m + 1; }
      const vc = st.v;
      let best = null;
      for (const dv of st.m ? [0, 0.1, -0.1] : [0, 0.3, -0.3, 0.6, -0.6, 0.85, -0.85]) {
        const runs = []; let run = null;
        for (let u = A; u <= B + 1e-9; u += cs) { const p = toXY(u, vc + dv); if (L_.ok(p, st.m)) { if (!run) run = [u, u]; run[1] = u; } else if (run) { runs.push(run); run = null; } }
        if (run) runs.push(run);
        const len = runs.reduce((q, r) => q + r[1] - r[0], 0);
        if (!best || len > best.len + 0.3) best = { len, runs, v: vc + dv };
      }
      if (best) best.runs.filter(r => r[1] - r[0] >= 0.75).forEach(r => segs.push([toXY(r[0], best.v), toXY(r[1], best.v)]));
    }
  }
  if (!segs.length) return { vacio: true, inalc: nRed * cs * cs };
  // orden: vecino más próximo desde el inicio y 2-opt con inversión de sentido
  const P = g.P, ini = o.inicio ? P.fwd(o.inicio[0], o.inicio[1]) : segs[0][0];
  const seq = [], used = new Set(); let pos = ini;
  while (seq.length < segs.length) { let bj = -1, bd = Infinity, br = false; segs.forEach((s, j) => { if (used.has(j)) return; const d0 = Geo.dist(pos, s[0]), d1 = Geo.dist(pos, s[1]); if (d0 < bd) { bd = d0; bj = j; br = false; } if (d1 < bd) { bd = d1; bj = j; br = true; } }); used.add(bj); seq.push({ j: bj, r: br }); pos = br ? segs[bj][0] : segs[bj][1]; }
  const en = x => x.r ? segs[x.j][1] : segs[x.j][0], ex = x => x.r ? segs[x.j][0] : segs[x.j][1];
  let mejora = true, it = 0;
  while (mejora && it++ < 40) { mejora = false;
    for (let i = 0; i < seq.length - 1; i++) for (let k = i + 1; k < seq.length; k++) {
      const pa = i ? ex(seq[i - 1]) : ini, nb = k + 1 < seq.length ? en(seq[k + 1]) : null;
      const antes = Geo.dist(pa, en(seq[i])) + (nb ? Geo.dist(ex(seq[k]), nb) : 0), despues = Geo.dist(pa, ex(seq[k])) + (nb ? Geo.dist(en(seq[i]), nb) : 0);
      if (despues < antes - 0.01) { const mid = seq.slice(i, k + 1).reverse().map(x => ({ j: x.j, r: !x.r })); seq.splice(i, k - i + 1, ...mid); mejora = true; }
    } }
  // partes del plan (traslados con el apero levantado por zona libre; pasadas de repaso)
  const parts = [], arrows = []; pos = ini; let Ltr = 0, Lw = 0, nTr = 0;
  seq.forEach(x => { const a = en(x), b = ex(x);
    if (Geo.dist(pos, a) > 0.5) { const c = caminoLibre(pos, a, L_, g); parts.push({ type: 'tras', xy: c }); Ltr += Geo.perim(c, false); nTr++; }
    parts.push({ type: 'trabajo', xy: [a, b], swath: true }); Lw += Geo.dist(a, b);
    arrows.push({ xy: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], az: (Math.atan2(b[0] - a[0], b[1] - a[1]) * 180 / Math.PI + 360) % 360 }); pos = b; });
  // superficie roja que alcanzan las pasadas
  const cov = new Uint8Array(g.cols * g.rows), rr = w / 2;
  parts.filter(p => p.type === 'trabajo').forEach(p => { const [a, b] = p.xy, dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-12;
    const c0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - rr - g.x0) / cs)), c1 = Math.min(g.cols - 1, Math.floor((Math.max(a[0], b[0]) + rr - g.x0) / cs));
    const r0 = Math.max(0, Math.floor((Math.min(a[1], b[1]) - rr - g.y0) / cs)), r1 = Math.min(g.rows - 1, Math.floor((Math.max(a[1], b[1]) + rr - g.y0) / cs));
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const x = g.x0 + (c + .5) * cs, y = g.y0 + (r + .5) * cs; let tt = ((x - a[0]) * dx + (y - a[1]) * dy) / L2; tt = tt < 0 ? 0 : tt > 1 ? 1 : tt; if ((x - a[0] - tt * dx) ** 2 + (y - a[1] - tt * dy) ** 2 <= rr * rr) cov[r * g.cols + c] = 1; } });
  let nCub = 0; for (let k = 0; k < cov.length; k++) if (cov[k] && g.mask[k] && !g.cnt[k] && !(g.treeM && g.treeM[k])) nCub++;
  const aRed = nRed * cs * cs, aCub = nCub * cs * cs;
  const vw = S2.velocidad / 3.6, vt = (S2.velocidadTraslado || 5) / 3.6;
  const tW = Lw / vw, tT = Ltr / vt + nTr * (S2.tManiobra || 20), tTot = tW + tT;
  const toLL = xy => Geo.toLL(xy, P).map(q => [+q[0].toFixed(7), +q[1].toFixed(7)]);
  return {
    fecha: Date.now(), geomKey: geomKey(f), az: Math.round(((90 - th * 180 / Math.PI) % 180 + 180) % 180), nH: 0, nHauto: 0, need: 0, ms: Math.round(performance.now() - T0), warn: [], inicio: o.inicio || null, fin: null, hlFinal: false,
    repaso: { rutaId: t.id, ruta: nomRuta(t), rojo: aRed, cubre: aCub, minArea: minA },
    params: { w, s: wEff, R: S2.radioGiro, marchaAtras: !!S2.marchaAtras, v: S2.velocidad, consumo: S2.consumo },
    parts: parts.filter(p => Geo.perim(p.xy, false) > 0.05).map(p => ({ type: p.type, ll: toLL(p.xy), swath: !!p.swath })),
    arrows: arrows.map(a => ({ ll: toLL([a.xy])[0], az: Math.round(a.az) })), missed: [],
    stats: { nPasadas: seq.length, nVueltas: 0, nObs: 0, giros: { U: 0, K: 0, O: 0, rodeo: 0, tras: nTr }, esquinas: 0,
      L: { trabajo: Lw, giro: 0, reversa: 0, traslado: Ltr, total: Lw + Ltr }, t: { trabajo: tW, giros: 0, traslado: tT, esquinas: 0, total: tTot },
      litros: tTot / 3600 * S2.consumo, area: { objetivo: aRed, cubierta: aCub, noAlcanzada: Math.max(0, aRed - aCub), cobertura: aRed ? aCub / aRed : 0, franjaArboles: 0, coberturaAlcanzable: aRed ? aCub / aRed : 0 },
      monte: false, haH: aCub / 1e4 / (tTot / 3600 || 1) }
  };
}
async function repasoSheet(t) {
  if (!t) { const trs = await numerarRutas(cur); t = trs.find(x => x.id === viewTrab) || trs[0]; if (!t) return toast('Aún no hay rutas de trabajo'); }
  sheet(`<h3>🧹 Repaso de zonas sin limpiar</h3><div class="note">Plan corto solo por las zonas rojas de <b>${esc(nomRuta(t))}</b> (${fFecha(t.inicio)}). Pasadas en el sentido del plan; los traslados van con el apero levantado y sin salir del linde ni pisar exclusiones o troncos.</div>
    <div class="srow"><span>Ignorar manchas menores de (m²)</span><input class="inp" id="rpM" inputmode="decimal" value="0,5" style="width:80px;text-align:right"></div>
    <div class="srow"><span>Empezar en mi posición GPS</span><input type="checkbox" id="rpG" ${lastPos ? 'checked' : ''} style="width:auto"></div>
    <button class="btn" id="rpOk" style="margin-top:10px">Calcular repaso</button>`,
    () => { $('rpOk').onclick = async () => {
      const minArea = Math.max(0, parseFloat($('rpM').value.replace(',', '.')) || 0), ini = $('rpG').checked && lastPos ? [lastPos.lat, lastPos.lon] : null;
      closeSheet(); showBusy('Calculando el repaso…'); await new Promise(r => setTimeout(r, 30));
      let pl; try { await cargarPlanes(cur); pl = planRepaso(cur, t, { minArea, inicio: ini }); } catch (e) { hideBusy(); return toast('Error en el repaso: ' + e.message, 5000); } hideBusy();
      if (pl.vacio) return toast(pl.inalc ? `Lo que queda sin limpiar (${fmtArea(pl.inalc)}) no se alcanza sin salir del linde o tocar troncos.` : `✅ ${nomRuta(t)} no dejó zonas sin limpiar.`, 5000);
      viewTrab = t.id; trabCache = null; CFG.pendiente = true; saveCfg(); drawFinca(); planReview(pl); setTimeout(fitFinca, 60);
    }; });
}

/* ---- 4. Informe anual en PDF ---- */
async function informeSheet(soloFinca) {
  const trs = await DB.tAll(), anyos = [...new Set(trs.map(t => new Date(t.inicio).getFullYear()).concat(new Date().getFullYear()))].sort((a, b) => b - a);
  sheet(`<h3>📄 Informe anual y hoja de cálculo</h3><div class="note">Horas, gasóleo, coste y fechas de limpieza de cada ruta del año, con el cumplimiento de la franja contra incendios (limpia entre el 1 de octubre anterior y el 31 de mayo).</div>
    ${preciosHTML()}<div class="note">El gasóleo de cada ruta se cuenta al precio que tenía al hacerla; las rutas antiguas, al precio actual.</div>
    <label class="f">Año</label><select class="inp" id="iaA">${anyos.map(a => `<option>${a}</option>`).join('')}</select>
    ${soloFinca ? `<button class="btn" id="iaF" style="margin-top:12px">📄 Informe de ${esc(soloFinca.nombre)}</button>` : ''}
    <button class="btn ${soloFinca ? 'sec' : ''}" id="iaT" style="margin-top:8px">📄 Informe de todas las fincas</button>
    <div class="sgrp">📊 Hoja de cálculo: todas las rutas del año</div>
    <div class="note">Una fila por ruta (horas, paradas, superficie, cobertura, gasóleo, traslado, coste y precio) y una hoja de resumen por finca. ODS para LibreOffice; XLSX para Excel; CSV para cualquiera.</div>
    ${soloFinca ? `<div class="srow"><span>${esc(soloFinca.nombre)}</span><span style="display:flex;gap:6px"><button class="btn sec" data-x="f:csv" style="width:auto;padding:8px 10px">CSV</button><button class="btn sec" data-x="f:ods" style="width:auto;padding:8px 10px">ODS</button><button class="btn sec" data-x="f:xlsx" style="width:auto;padding:8px 10px">XLSX</button></span></div>` : ''}
    <div class="srow"><span>Todas las fincas</span><span style="display:flex;gap:6px"><button class="btn sec" data-x="t:csv" style="width:auto;padding:8px 10px">CSV</button><button class="btn sec" data-x="t:ods" style="width:auto;padding:8px 10px">ODS</button><button class="btn sec" data-x="t:xlsx" style="width:auto;padding:8px 10px">XLSX</button></span></div>`,
    () => {
      preciosBind();
      const go = async fs => { const y = +$('iaA').value; closeSheet(); showBusy('Preparando el informe…'); try { await informeAnual(fs, y); } catch (e) { toast('Error: ' + e.message, 5000); } finally { hideBusy(); } };
      if ($('iaF')) $('iaF').onclick = () => go([soloFinca]);
      $('iaT').onclick = async () => go((await DB.all()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
      document.querySelectorAll('.sheet [data-x]').forEach(b => b.onclick = async () => { const [qu, fm] = b.dataset.x.split(':'), y = +$('iaA').value; const fs = qu === 'f' ? [soloFinca] : (await DB.all()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')); closeSheet(); exportarRutas(fs, y, fm); });
    });
}
function franjaIncendios(f, trs, y) {
  const ini = new Date(y - 1, 9, 1).getTime(), fin = new Date(y, 4, 31, 23, 59).getTime();
  const ok = trs.filter(t => t.inicio >= ini && t.inicio <= fin && t.resumen && (t.resumen.cobertura >= 0.85 || t.estado === 'cerrado')).map(t => t.inicio);
  const man = f.mant && f.mant.ultimaManual >= ini && f.mant.ultimaManual <= fin ? [f.mant.ultimaManual] : [];
  const fechas = ok.concat(man).sort((a, b) => a - b);
  return fechas.length ? 'Cumplida: limpia el ' + new Date(fechas[fechas.length - 1]).toLocaleDateString('es-ES') : 'No consta limpieza entre 01/10/' + (y - 1) + ' y 31/05/' + y;
}
async function informeAnual(fincas, y) {
  try { await cargarJsPDF(); } catch (e) { return toast('No se pudo cargar el generador de PDF: ' + e.message, 4000); }
  const { jsPDF } = window.jspdf, doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const tx = v => String(v).replace(/²/g, '2').replace(/[–—]/g, '-').replace(/≈/g, '~').replace(/[^\x00-\xFF€]/g, '');
  const titular = SB.titular || (Sync.user ? Sync.user.email.replace(/@.*/, '') : '');
  const fMap = new Map(fincas.map(f => [f.id, f])), pG = +SB.precioGasoil || 0, pH = +SB.precioHora || 0, cuesta = t => costeRuta(t, fMap.get(t.fincaId)).coste;
  if (SB.base) for (const f of fincas) { try { await trasladoFinca(f); } catch (e) { } }
  const a0 = new Date(y, 0, 1).getTime(), a1 = new Date(y + 1, 0, 1).getTime();
  const datos = [];
  for (const f of fincas) {
    const todas = await DB.tByFinca(f.id), pc = planesCache; let pcF = null;
    for (const t of todas) if (!t.resumen && f.linde) { if (!pcF) { pcF = new Map((await DB.pByFinca(f.id)).map(r => [r.id, r])); } planesCache = pcF; try { t.resumen = resumenTrab(t, rebuildTrab(f, t)); } catch (e) { } planesCache = pc; }
    todas.forEach(t => { if (t.resumen) t.resumen = { horas: sesHoras(t), litros: 0, limpia: 0, cobertura: 0, ...t.resumen }; if (t.resumen && !(t.resumen.litros > 0)) t.resumen.litros = t.resumen.horas * (effS(f, t.cfg || f.config).consumo || 0); });
    const trs = todas.filter(t => t.inicio >= a0 && t.inicio < a1 && t.resumen).sort((a, b) => a.inicio - b.inicio);
    const tot = trs.reduce((s, t) => ({ h: s.h + t.resumen.horas, l: s.l + t.resumen.litros, e: s.e + cuesta(t), a: s.a + t.resumen.limpia }), { h: 0, l: 0, e: 0, a: 0 });
    datos.push({ f, trs, todas, tot });
  }
  const T = datos.reduce((s, d) => ({ h: s.h + d.tot.h, l: s.l + d.tot.l, e: s.e + d.tot.e, a: s.a + d.tot.a, n: s.n + d.trs.length }), { h: 0, l: 0, e: 0, a: 0, n: 0 });
  let y_ = 16;
  const cab = (t1, t2) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text(tx(t1), 16, 16); doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text(tx(`${titular ? titular + ' · ' : ''}${new Date().toLocaleDateString('es-ES')}`), 194, 16, { align: 'right' }); if (t2) { doc.setFontSize(12); doc.text(tx(t2), 16, 23); } y_ = t2 ? 30 : 24; };
  const tabla = (cols, filas, neg) => {
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); let x = 16; cols.forEach(c => { doc.text(tx(c[0]), c[2] === 'r' ? x + c[1] - 1 : x, y_, c[2] === 'r' ? { align: 'right' } : undefined); x += c[1]; }); y_ += 2; doc.line(16, y_, 194, y_); y_ += 4.5;
    filas.forEach((fi, i) => { if (y_ > 280) { doc.addPage(); y_ = 16; } doc.setFont('helvetica', neg && i === filas.length - 1 ? 'bold' : 'normal'); let x2 = 16; cols.forEach((c, j) => { doc.text(tx(fi[j]), c[2] === 'r' ? x2 + c[1] - 1 : x2, y_, c[2] === 'r' ? { align: 'right' } : undefined); x2 += c[1]; }); y_ += 5.2; });
  };
  const e2 = v => fmt(v, 2) + ' €', ha = a => fmt(a / 1e4, 2);
  // resumen general
  cab(`Informe anual ${y}`, `${fincas.length === 1 ? fincas[0].nombre : fincas.length + ' fincas'} · LIMPFINC`);
  doc.setFontSize(10); doc.text(tx(`Coste con el precio del gasóleo de cada ruta (actual ${fmt(pG, 2)} €/L) y tractor y operario ${fmt(pH, 2)} €/h · precio = coste + margen ${fmt(+SB.margen || 0, 0)} %`), 16, y_); y_ += 7;
  const pr2 = v => e2(v * margenK());
  tabla([['Finca', 38], ['Rutas', 12, 'r'], ['Horas', 20, 'r'], ['Gasóleo L', 18, 'r'], ['Coste', 22, 'r'], ['Precio', 24, 'r'], ['ha', 16, 'r'], ['', 4], ['Franja inc.', 24]],
    [...datos.map(d => [d.f.nombre.slice(0, 22), d.trs.length, fmtH(d.tot.h), fmt(d.tot.l, 1), e2(d.tot.e), pr2(d.tot.e), ha(d.tot.a), '', d.f.mant && d.f.mant.incendios ? (franjaIncendios(d.f, d.todas, y).startsWith('Cumplida') ? 'Cumplida' : 'NO CONSTA') : '-']),
     ['TOTAL', T.n, fmtH(T.h), fmt(T.l, 1), e2(T.e), pr2(T.e), ha(T.a), '', '']], true);
  // una página por finca
  for (const d of datos) {
    const f = d.f; doc.addPage(); cab(`${f.nombre}`, `Informe ${y}`);
    if (f.linde) { const img = croquis(f, d.trs[d.trs.length - 1] || null, 1400, 760).toDataURL('image/jpeg', 0.82); doc.addImage(img, 'JPEG', 16, y_, 178, 97); y_ += 102; }
    const a = f.linde ? fincaAreas(f) : null, m = estadoMant(f, d.todas.filter(t => t.resumen && t.resumen.cobertura >= 0.85).reduce((mx, t) => Math.max(mx, t.inicio), 0));
    doc.setFontSize(10); const ln = (t, v) => { doc.setFont('helvetica', 'normal'); doc.text(tx(t), 16, y_); doc.text(tx(v), 194, y_, { align: 'right' }); y_ += 5.5; };
    if (a) ln('Superficie', fmtArea(a.neta));
    if (f.sigpac && f.sigpac.parcelas) ln('SIGPAC', f.sigpac.parcelas.map(p => `${p.provincia}:${p.municipio}:${p.poligono}:${p.parcela}`).join(', ').slice(0, 80));
    ln('Tipo', f.tipo === 'monte' ? 'Monte / plantación' : 'Abierta');
    if (f.mant && f.mant.incendios) ln(`Franja contra incendios (campaña ${y})`, franjaIncendios(f, d.todas, y));
    ln('Mantenimiento', m.txt);
    const pel = (f.peligros || []).length, inc = (f.incidencias || []).filter(i => i.fecha >= a0 && i.fecha < a1).length;
    ln('Peligros anotados · incidencias del año', `${pel} · ${inc}`);
    y_ += 3;
    if (!d.trs.length) { doc.text(tx(`Sin rutas de trabajo en ${y}.`), 16, y_); continue; }
    const m2 = v => fmt(v, 0) + ' m2';
    tabla([['Ruta', 26], ['Fecha', 20], ['Horas', 18, 'r'], ['Litros', 14, 'r'], ['Coste', 20, 'r'], ['Precio', 22, 'r'], ['Limpia', 20, 'r'], ['Cobert.', 14, 'r'], ['', 3], ['Plan', 21]],
      [...d.trs.map(t => { const r = t.resumen, pr = t.planResumen ? t.planResumen.nombre : ''; return [nomRuta(t).slice(0, 16), new Date(t.inicio).toLocaleDateString('es-ES'), fmtH(r.horas), fmt(r.litros, 1), e2(cuesta(t)), pr2(cuesta(t)), m2(r.limpia), fmt(r.cobertura * 100, 0) + ' %', '', pr.slice(0, 12)]; }),
       ['TOTAL', '', fmtH(d.tot.h), fmt(d.tot.l, 1), e2(d.tot.e), pr2(d.tot.e), m2(d.tot.a), '', '', '']], true);
  }
  const n = doc.getNumberOfPages(); for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.text(tx(`LIMPFINC · Informe ${y} · página ${i} de ${n}`), 105, 292, { align: 'center' }); }
  doc.save((fincas.length === 1 ? safeName(fincas[0].nombre) + '_' : '') + 'informe_' + y + '.pdf');
  toast('📄 Informe ' + y + ' generado');
}

/* ---- 5. Exportar peligros (KML / GPX) para TopoGPS, OsmAnd, QGIS… ---- */
function pelKML(fs) {
  const col = { piedra: 'ff1c1cb7', arbol: 'ff1c4a6d', otro: 'ff0080ff', prohibido: 'ff0000d5' };
  let k = `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Peligros LIMPFINC</name>` +
    Object.keys(PEL).map(t => `<Style id="p_${t}"><IconStyle><color>${col[t]}</color><scale>1.2</scale></IconStyle><LineStyle><color>${col[t]}</color><width>2</width></LineStyle><PolyStyle><color>55${col[t].slice(2)}</color></PolyStyle></Style>`).join('');
  fs.forEach(f => { if (!(f.peligros || []).length) return; k += `<Folder><name>${esc(f.nombre)}</name>`;
    f.peligros.forEach(p => { const d = `${PEL[p.tipo][1]} · radio ${fmt(p.radio, 1)} m · ${new Date(p.fecha).toLocaleDateString('es-ES')}${p.nota ? ' · ' + p.nota : ''}`;
      k += `<Placemark><name>${esc(PEL[p.tipo][1])}</name><description>${esc(d)}</description><styleUrl>#p_${p.tipo}</styleUrl><MultiGeometry><Point><coordinates>${p.ll[1]},${p.ll[0]},0</coordinates></Point><Polygon><outerBoundaryIs><LinearRing><coordinates>${[...circuloLL(p.ll, p.radio), circuloLL(p.ll, p.radio)[0]].map(q => q[1] + ',' + q[0] + ',0').join(' ')}</coordinates></LinearRing></outerBoundaryIs></Polygon></MultiGeometry></Placemark>`; });
    k += '</Folder>'; });
  return k + '</Document></kml>';
}
function pelGPX(fs) {
  let g = `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="LIMPFINC" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>Peligros LIMPFINC</name></metadata>`;
  fs.forEach(f => (f.peligros || []).forEach(p => { g += `<wpt lat="${p.ll[0]}" lon="${p.ll[1]}"><time>${new Date(p.fecha).toISOString()}</time><name>${esc(PEL[p.tipo][1])}</name><desc>${esc(`${f.nombre} · radio ${fmt(p.radio, 1)} m${p.nota ? ' · ' + p.nota : ''}`)}</desc><sym>Danger Area</sym><type>${p.tipo}</type></wpt>`; }));
  return g + '</gpx>';
}
function exportarPeligros(fs, fmtX, nombre) {
  const n = fs.reduce((s, f) => s + (f.peligros || []).length, 0); if (!n) return toast('No hay peligros que exportar');
  if (fmtX === 'kml') download(nombre + '_peligros.kml', pelKML(fs), 'application/vnd.google-earth.kml+xml');
  else download(nombre + '_peligros.gpx', pelGPX(fs), 'application/gpx+xml');
  toast(`📤 ${n} peligro${n > 1 ? 's' : ''} exportado${n > 1 ? 's' : ''}`);
}
function exportPelSheet(f) {
  sheet(`<h3>📤 Exportar peligros</h3><div class="note">Piedras, árboles caídos y obstáculos como puntos (y círculo del radio en KML). GPX para TopoGPS, OsmAnd o Garmin; KML para QGIS, Marble o TopoGPS.</div>
    ${f ? `<div class="sgrp">${esc(f.nombre)} (${(f.peligros || []).length})</div><div class="row"><button class="btn sec" id="xpFk">KML</button><button class="btn sec" id="xpFg">GPX</button></div>` : ''}
    <div class="sgrp">Todas las fincas</div><div class="row"><button class="btn sec" id="xpTk">KML</button><button class="btn sec" id="xpTg">GPX</button></div>`,
    () => {
      if (f) { $('xpFk').onclick = () => exportarPeligros([f], 'kml', safeName(f.nombre)); $('xpFg').onclick = () => exportarPeligros([f], 'gpx', safeName(f.nombre)); }
      $('xpTk').onclick = async () => exportarPeligros(await DB.all(), 'kml', 'fincas'); $('xpTg').onclick = async () => exportarPeligros(await DB.all(), 'gpx', 'fincas');
    });
}

