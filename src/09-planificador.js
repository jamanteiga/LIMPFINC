'use strict';
function mallaVec(f, P) {
  const M = f.malla, A = P.fwd(M.A[0], M.A[1]), B = P.fwd(M.B[0], M.B[1]), C = P.fwd(M.C[0], M.C[1]);
  let ab = [(B[0] - A[0]) / (M.nAB - 1), (B[1] - A[1]) / (M.nAB - 1)], ac = [(C[0] - A[0]) / (M.nAC - 1), (C[1] - A[1]) / (M.nAC - 1)];
  if (M.nominal) { const a = Geo.nrm(ab), c = Geo.nrm(ac); ab = [a[0] * S.mallaY, a[1] * S.mallaY]; ac = [c[0] * S.mallaX, c[1] * S.mallaX]; }
  return { A, ab, ac };
}

/* =========================================================
   PLANIFICADOR (F2) — finca abierta
   Vueltas perimetrales + pasadas paralelas + giros U / K / Ω
   ========================================================= */
const Planner = (() => {
  const SC = 1000; // Clipper trabaja en enteros (mm)
  const CL = () => window.ClipperLib;
  const toC = xy => xy.map(p => ({ X: Math.round(p[0] * SC), Y: Math.round(p[1] * SC) }));
  const frC = pa => pa.map(q => [q.X / SC, q.Y / SC]);
  const areaP = p => Math.abs(CL().Clipper.Area(p)) / SC / SC;
  const areaC = ps => Math.abs(ps.reduce((s, p) => s + CL().Clipper.Area(p), 0)) / SC / SC;
  function off(paths, d, round, miter = 3) {
    const C = CL(); const co = new C.ClipperOffset(miter, 0.02 * SC);
    co.AddPaths(paths, round ? C.JoinType.jtRound : C.JoinType.jtMiter, C.EndType.etClosedPolygon);
    const s = new C.Paths(); co.Execute(s, d * SC); return s;
  }
  function boolOp(op, a, b) {
    const C = CL(); const c = new C.Clipper();
    c.AddPaths(a, C.PolyType.ptSubject, true); if (b && b.length) c.AddPaths(b, C.PolyType.ptClip, true);
    const s = new C.Paths();
    c.Execute(op === 'diff' ? C.ClipType.ctDifference : op === 'int' ? C.ClipType.ctIntersection : C.ClipType.ctUnion, s, C.PolyFillType.pftNonZero, C.PolyFillType.pftNonZero);
    return s;
  }
  function clipLines(lines, region) {
    const C = CL(); const c = new C.Clipper();
    lines.forEach(l => c.AddPath(toC(l), C.PolyType.ptSubject, false));
    c.AddPaths(region, C.PolyType.ptClip, true);
    const tree = new C.PolyTree();
    c.Execute(C.ClipType.ctIntersection, tree, C.PolyFillType.pftNonZero, C.PolyFillType.pftNonZero);
    return C.Clipper.OpenPathsFromPolyTree(tree).map(frC);
  }
  /* ---- anillos (polilíneas cerradas) ---- */
  function mkRing(xy) { const n = xy.length, cum = [0]; for (let i = 0; i < n; i++) cum.push(cum[i] + Geo.dist(xy[i], xy[(i + 1) % n])); return { xy, cum, L: cum[n] }; }
  function projRing(r, p) {
    let best = { d: Infinity }; const n = r.xy.length;
    for (let i = 0; i < n; i++) {
      const a = r.xy[i], b = r.xy[(i + 1) % n], ab = [b[0] - a[0], b[1] - a[1]], L2 = ab[0] * ab[0] + ab[1] * ab[1] || 1e-12;
      let t = ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / L2; t = Math.max(0, Math.min(1, t));
      const q = [a[0] + ab[0] * t, a[1] + ab[1] * t], d = Geo.dist(p, q);
      if (d < best.d) best = { d, q, i, s: r.cum[i] + t * Math.sqrt(L2) };
    }
    return best;
  }
  function ringWalk(r, A, B, wantPath) {
    let d1 = B.s - A.s; if (d1 < 0) d1 += r.L; const d2 = r.L - d1; const fwd = d1 <= d2, len = Math.min(d1, d2);
    if (!wantPath) return { len };
    const n = r.xy.length, pts = [A.q];
    if (fwd) { for (let c = 0, k = (A.i + 1) % n; c < n; c++, k = (k + 1) % n) { const arc = (r.cum[k] - A.s + r.L) % r.L; if (arc >= d1 || arc === 0 && c > 0) break; pts.push(r.xy[k]); } }
    else { for (let c = 0, k = A.i; c < n; c++, k = (k - 1 + n) % n) { const arc = (A.s - r.cum[k] + r.L) % r.L; if (arc >= d2) break; pts.push(r.xy[k]); } }
    pts.push(B.q); return { len, pts };
  }
  const plen = xy => { let s = 0; for (let i = 1; i < xy.length; i++) s += Geo.dist(xy[i - 1], xy[i]); return s; };
  function corners(xy, closed) {
    let c = 0; const n = xy.length;
    for (let i = closed ? 0 : 1; i < (closed ? n : n - 1); i++) {
      const a = xy[(i - 1 + n) % n], b = xy[i], d = xy[(i + 1) % n];
      const h1 = Math.atan2(b[1] - a[1], b[0] - a[0]), h2 = Math.atan2(d[1] - b[1], d[0] - b[0]);
      let dh = Math.abs(h2 - h1); if (dh > Math.PI) dh = 2 * Math.PI - dh;
      if (dh > Math.PI / 4) c++;
    }
    return c;
  }
  function rotateTo(xy, p) { let bi = 0, bd = Infinity; xy.forEach((q, i) => { const d = Geo.dist(p, q); if (d < bd) { bd = d; bi = i; } }); const r = xy.slice(bi).concat(xy.slice(0, bi)); return r.concat([r[0]]); }

  /* ---- cabecera necesaria ---- */
  function headlandNeed(S) {
    const w = S.aperoAncho, we = w - Math.min(S.solape, w / 2), R = S.radioGiro;
    const fr = Math.max(0.5, S.longTractorApero - S.offsetApero - 0.5);      // voladizo delantero desde eje trasero
    const ro = Math.hypot(R + S.anchoTractor / 2, fr);                         // radio exterior esquina delantera
    let need = S.offsetApero + ro + 0.3;
    if (!S.marchaAtras) { const ad = Math.min(we, 2 * R); const h = Math.sqrt(Math.max(0, 4 * R * R - (ad / 2 + R) ** 2)); need = S.offsetApero + h + ro + 0.3; }
    return need;
  }

  /* ---- plan principal ---- */
  function plan(f, S, opt = {}) {
    const T0 = performance.now();
    const P = Geo.projFor(f.linde.coords);
    const fieldXY = Geo.ccw(Geo.toXY(f.linde.coords, P));
    const field = [toC(fieldXY)];
    const obs = (f.exclusiones || []).map(e => toC(Geo.ccw(Geo.toXY(e.coords, P))));
    const w = S.aperoAncho, s = Math.min(S.solape, w / 2), we = w - s, R = S.radioGiro;
    const vw = S.velocidad / 3.6, vg = S.velocidadGiro / 3.6, vt = S.velocidadTraslado / 3.6;
    const need = headlandNeed(S);
    const nHauto = 1 + Math.ceil(Math.max(0, need - w) / we);
    const nH = opt.nH > 0 ? Math.round(opt.nH) : nHauto;
    const warn = [];
    const monte = f.tipo === 'monte' && f.malla && f.malla.arboles && f.malla.arboles.length >= 2;
    let nHm = nH, treeRows = null;
    const radioT = monte ? (+(f.malla.diam || S.diamTronco || 500)) / 2000 : 0;
    if (monte) {
      const hT = S.holguraTronco + radioT, vivos = f.malla.arboles.filter(a => !a[4]).map(a => P.fwd(a[0], a[1]));
      let dmin = Infinity;
      for (const t of vivos) for (let i = 0; i < fieldXY.length; i++) {
        const a = fieldXY[i], b = fieldXY[(i + 1) % fieldXY.length], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-12;
        let u = ((t[0] - a[0]) * dx + (t[1] - a[1]) * dy) / L2; u = Math.max(0, Math.min(1, u));
        dmin = Math.min(dmin, Math.hypot(t[0] - a[0] - u * dx, t[1] - a[1] - u * dy));
      }
      const kMax = dmin >= hT + w ? Math.floor((dmin - hT - w) / we) + 1 : 0;
      nHm = Math.min(nH, kMax);
      if (dmin - hT < need) warn.push(`Los árboles exteriores están a ${fmt(Math.max(0, dmin - hT), 1)} m del linde y para girar dentro de la finca hacen falta ${fmt(need, 1)} m: las calles se trabajan hasta ${fmt(need, 1)} m del linde y ahí se gira. Revisa la distancia de los árboles exteriores.`);
      else if (nHm < nHauto) warn.push(`Cabecera libre entre árboles y linde: ${fmt(Math.max(0, dmin - hT), 1)} m → ${nHm} de ${nHauto} vueltas necesarias. Los giros requerirán maniobras o salir de la finca.`);
    }

    // anillos de cabecera
    const hl = [];
    for (let k = 0; k < (monte ? nHm : nH); k++) {
      const ps = off(field, -(w / 2 + k * we)).filter(p => areaP(p) > 4);
      if (!ps.length) break;
      hl.push(ps.map(p => Geo.ccw(frC(p))));
    }
    if (!hl.length && !monte) return { error: 'La finca es demasiado pequeña para este tractor y apero: no cabe el giro dentro del linde. Prueba con el cortacésped (Recalcular › Tractor / máquina).' };
    if (hl.length < nH && !monte) warn.push('La finca se cubre solo con vueltas perimetrales.');
    const inner = hl.length ? off(field, -(w + (hl.length - 1) * we)) : off(field, -w / 2);
    if (!inner.length) return { error: 'La finca es demasiado pequeña para este tractor y apero: no cabe el giro dentro del linde. Prueba con el cortacésped (Recalcular › Tractor / máquina).' };
    const marg = S.margenObstaculo;
    const obsInf = obs.length ? off(obs, w / 2 + marg, true) : [];
    const region = obsInf.length ? boolOp('diff', inner, obsInf) : inner;
    // las pasadas acaban a la distancia necesaria para girar sin salirse del linde (apero + tractor + radio de giro)
    const fieldGiro = off(field, -need);
    const regionP = fieldGiro.length ? boolOp('int', region, fieldGiro) : region;
    if (!fieldGiro.length) warn.push('La finca es demasiado estrecha para girar dentro: no hay sitio para las vueltas del tractor.');
    const obsRings = obs.map(o => { const ps = off([o], w / 2 + marg, true); if (!ps.length) return null; const big = ps.reduce((a, b) => areaP(a) >= areaP(b) ? a : b); return mkRing(Geo.ccw(frC(big))); });
    if (obs.length) {
      const hlZone = boolOp('diff', field, inner);
      if (areaC(boolOp('int', obsInf, hlZone)) > 0.5) warn.push('Hay exclusiones dentro de la zona de cabecera: revisa ahí los giros.');
    }
    // anillo de traslado (centro de la cabecera)
    const trRingXY = (hl.length ? hl[Math.floor((hl.length - 1) / 2)] : inner.map(p => Geo.ccw(frC(p)))).reduce((a, b) => Geo.area(a) >= Geo.area(b) ? a : b);
    const trRing = mkRing(trRingXY);

    /* pasadas para un azimut */
    const regionPts = region.flatMap(frC);
    function extent(u, n) {
      let tmin = Infinity, tmax = -Infinity, smin = Infinity, smax = -Infinity;
      for (const p of regionPts) { const t = p[0] * n[0] + p[1] * n[1], q = p[0] * u[0] + p[1] * u[1]; if (t < tmin) tmin = t; if (t > tmax) tmax = t; if (q < smin) smin = q; if (q > smax) smax = q; }
      return { tmin, tmax, smin, smax };
    }
    function swaths(az) {
      const u = [Math.sin(az * D2R), Math.cos(az * D2R)], n = [u[1], -u[0]];
      if (!regionPts.length) return { segs: [], u, n, lines: 0, az };
      const { tmin, tmax } = extent(u, n);
      const ts = [], t1 = tmin + w / 2 - s, tN = tmax - w / 2 + s;
      if (tN <= t1) ts.push((tmin + tmax) / 2);
      else { for (let t = t1; t < tN - 1e-6; t += we) ts.push(t); if (tN - ts[ts.length - 1] > 0.25 * we) ts.push(tN); }
      return makeSegs(u, n, ts, az);
    }
    /* monte: pasadas por calles entre filas de árboles */
    function rowSwaths() {
      const { A, ab, ac } = mallaVec(f, P);
      const u = Geo.nrm(ab); let n = [u[1], -u[0]];
      if (ac[0] * n[0] + ac[1] * n[1] < 0) n = [-n[0], -n[1]];
      const sp = ac[0] * n[0] + ac[1] * n[1], tA = A[0] * n[0] + A[1] * n[1], az = ((Math.atan2(u[0], u[1]) / D2R) + 360) % 180;
      if (!regionPts.length) return { segs: [], u, n, lines: 0, az };
      const js = f.malla.arboles.map(a => a[3]), j0 = Math.min(...js), j1 = Math.max(...js);
      const hT = S.holguraTronco + radioT, c1 = hT + w / 2, c2 = sp - hT - w / 2, cs = [];
      if (c2 <= c1 + 0.05) { cs.push(sp / 2); warn.push('Calle más estrecha que apero + holguras: una pasada centrada por calle.'); }
      else {
        // dos pasadas por calle: una arrimada a cada hilera de árboles (se acepta el solape para dejarla bien limpia)
        cs.push(c1, c2);
        if (c2 - c1 > w + 0.02) warn.push(`Calle de ${fmt(sp, 2)} m: con dos pasadas arrimadas a los árboles queda en el centro una franja de ${fmt(c2 - c1 - w, 2)} m sin limpiar.`);
      }
      const { tmin, tmax } = extent(u, n), ts = [];
      for (let j = j0; j < j1; j++) cs.forEach(c => ts.push(tA + j * sp + c));
      for (let t = tA + j0 * sp - c1; t > tmin - w / 2 + s; t -= we) ts.push(t);
      for (let t = tA + j1 * sp + c1; t < tmax + w / 2 - s; t += we) ts.push(t);
      // franjas de árboles (no accesibles)
      const rows = new Map();
      f.malla.arboles.forEach(a => { const q = P.fwd(a[0], a[1]), sv = q[0] * u[0] + q[1] * u[1]; const r = rows.get(a[3]) || [Infinity, -Infinity]; rows.set(a[3], [Math.min(r[0], sv), Math.max(r[1], sv)]); });
      treeRows = [...rows.entries()].map(([j, [s0, s1]]) => { const t = tA + j * sp; return [[u[0] * (s0 - hT) + n[0] * t, u[1] * (s0 - hT) + n[1] * t], [u[0] * (s1 + hT) + n[0] * t, u[1] * (s1 + hT) + n[1] * t]]; });
      return makeSegs(u, n, ts.sort((a, b) => a - b), az);
    }
    function makeSegs(u, n, ts, az) {
      const { smin, smax } = extent(u, n);
      const lines = ts.map(t => [[u[0] * (smin - 5) + n[0] * t, u[1] * (smin - 5) + n[1] * t], [u[0] * (smax + 5) + n[0] * t, u[1] * (smax + 5) + n[1] * t]]);
      const segs = [];
      for (const pl of clipLines(lines, regionP)) {
        if (pl.length < 2) continue;
        let a = pl[0], b = pl[pl.length - 1];
        if ((b[0] - a[0]) * u[0] + (b[1] - a[1]) * u[1] < 0) [a, b] = [b, a];
        const len = Geo.dist(a, b); if (len < 1) continue;
        segs.push({ a, b, len });
      }
      return { segs, u, n, lines: ts.length, az };
    }
    const tU = Math.PI * R / vg;
    const quick = sw => sw.segs.reduce((q, g) => q + g.len, 0) / vw + sw.segs.length * tU + Math.max(0, sw.segs.length - sw.lines) * 45;

    // candidatos de dirección
    let cands;
    if (monte) cands = ['rows'];
    else if (opt.az != null && isFinite(opt.az)) cands = [((opt.az % 180) + 180) % 180];
    else {
      const sc = []; for (let a = 0; a < 180; a++) sc.push([a, quick(swaths(a))]);
      sc.sort((x, y) => x[1] - y[1]); cands = [];
      const far = a => cands.every(c => Math.min(Math.abs(c - a), 180 - Math.abs(c - a)) >= 3);
      // direcciones de los 3 lados más largos del linde (pasadas paralelas a lindes)
      const edges = fieldXY.map((p, i) => { const q = fieldXY[(i + 1) % fieldXY.length]; return [Geo.dist(p, q), ((Math.round(Math.atan2(q[0] - p[0], q[1] - p[1]) / D2R) % 180) + 180) % 180]; }).sort((x, y) => y[0] - x[0]);
      for (const [, a] of edges.slice(0, 3)) if (far(a)) cands.push(a);
      for (const [a] of sc) { if (far(a) && cands.every(c => Math.min(Math.abs(c - a), 180 - Math.abs(c - a)) >= 8)) cands.push(a); if (cands.length >= 6) break; }
    }

    // clasificación de extremos
    function kindAt(p) {
      for (let i = 0; i < obsRings.length; i++) { const r = obsRings[i]; if (r && projRing(r, p).d < 0.25) return { kind: 'obs', obs: i }; }
      return { kind: 'hl' };
    }
    const projCache = new Map();
    const pjT = p => { const k = p[0].toFixed(3) + ',' + p[1].toFixed(3); let v = projCache.get(k); if (!v) { v = projRing(trRing, p); projCache.set(k, v); } return v; };

    function trans(E, N) {
      const h = E.h, nl = [-h[1], h[0]], d = [N.p[0] - E.p[0], N.p[1] - E.p[1]];
      const du = d[0] * h[0] + d[1] * h[1], dv = d[0] * nl[0] + d[1] * nl[1], ad = Math.abs(dv);
      const dot = h[0] * N.h[0] + h[1] * N.h[1];
      if (E.kind === 'hl' && N.kind === 'hl' && dot < -0.99 && Math.abs(du) < 25 && ad > 0.05) {
        if (ad >= 2 * R - 1e-6) { const L = Math.PI * R + (ad - 2 * R) + Math.abs(du); return { type: 'U', L, t: L / vg }; }
        if (S.marchaAtras) { const L = Math.PI * R + (2 * R - ad) + Math.abs(du); return { type: 'K', L, t: L / vg + 2 * S.tCambioSentido }; }
        const th = Math.atan2(Math.sqrt(Math.max(0, 4 * R * R - (ad / 2 + R) ** 2)), ad / 2 + R);
        const L = R * (Math.PI + 4 * th) + Math.abs(du); return { type: 'O', L, t: L / vg };
      }
      if (E.kind === 'obs' && N.kind === 'obs' && E.obs === N.obs && dot > 0.99 && ad < 0.05 && du > 0) {
        const r = obsRings[E.obs]; const L = ringWalk(r, projRing(r, E.p), projRing(r, N.p)).len;
        return { type: 'rodeo', L, t: L / vg };
      }
      let L;
      if (E.kind === 'hl' && N.kind === 'hl') { const A = pjT(E.p), B = pjT(N.p); L = A.d + ringWalk(trRing, A, B).len + B.d; }
      else L = Geo.dist(E.p, N.p) * 1.2;
      return { type: 'tras', L, t: L / vt + S.tManiobra };
    }

    // traslado desde la salida de una pasada (o un punto) hasta el punto final, por la cabecera si se puede
    function toEnd(E, endP) {
      if (!endP) return { L: 0, xy: [] };
      if (E.kind === 'hl' && trRing.L > 0) { const A = pjT(E.p), B = projRing(trRing, endP); const w_ = ringWalk(trRing, A, B, true); const L = A.d + w_.len + B.d; if (L < Geo.dist(E.p, endP) * 3) return { L, xy: [E.p, ...w_.pts, endP] }; }
      return { L: Geo.dist(E.p, endP) * 1.2, xy: [E.p, endP] };
    }
    function solve(sw, startP, endP) {
      const segs = sw.segs, N = segs.length; if (!N) return { seq: [], cost: 0, ex: [], en: [] };
      const u = sw.u, mu = [-u[0], -u[1]], ex = [], en = [];
      segs.forEach((g, i) => {
        const ka = kindAt(g.a), kb = kindAt(g.b);
        ex[2 * i] = { p: g.b, h: u, ...kb }; ex[2 * i + 1] = { p: g.a, h: mu, ...ka };
        en[2 * i] = { p: g.a, h: u, ...ka }; en[2 * i + 1] = { p: g.b, h: mu, ...kb };
      });
      const M = 2 * N, C = new Float64Array(M * M), C0 = new Float64Array(M);
      for (let i = 0; i < M; i++) for (let j = 0; j < M; j++) C[i * M + j] = (i >> 1) === (j >> 1) ? 1e9 : trans(ex[i], en[j]).t;
      for (let j = 0; j < M; j++) C0[j] = Geo.dist(startP, en[j].p) / vt;
      const CE = new Float64Array(M); if (endP) for (let j = 0; j < M; j++) CE[j] = toEnd(ex[j], endP).L / vt;
      const cost = q => { let c = C0[q[0]] + CE[q[q.length - 1]]; for (let k = 1; k < q.length; k++) c += C[q[k - 1] * M + q[k]]; return c; };
      function greedy() {
        const used = new Uint8Array(N), q = []; let cur = -1;
        for (let k = 0; k < N; k++) { let best = -1, bc = Infinity; for (let j = 0; j < M; j++) { if (used[j >> 1]) continue; const c = (cur < 0 ? C0[j] : C[cur * M + j]) + (k === N - 1 ? CE[j] : 0); if (c < bc) { bc = c; best = j; } } used[best >> 1] = 1; q.push(best); cur = best; }
        return q;
      }
      // barrido en zigzag; con punto final se prueban los dos sentidos y las dos paridades
      function bous(rev, par) {
        const idx = segs.map((g, i) => i).sort((a, b) => { const ta = (segs[a].a[0] * sw.n[0] + segs[a].a[1] * sw.n[1]), tb = (segs[b].a[0] * sw.n[0] + segs[b].a[1] * sw.n[1]); return ta - tb || (segs[a].a[0] * u[0] + segs[a].a[1] * u[1]) - (segs[b].a[0] * u[0] + segs[b].a[1] * u[1]); });
        if (rev) idx.reverse();
        return idx.map((i, k) => 2 * i + ((k + par) & 1));
      }
      function twoOpt(q, ms) {
        const n = q.length, tEnd = performance.now() + ms; let imp = true;
        while (imp && performance.now() < tEnd) {
          imp = false;
          for (let i = -1; i < n - 1; i++) for (let j = i + 1; j < n; j++) {
            const a = i < 0 ? C0[q[i + 1]] : C[q[i] * M + q[i + 1]], b = j < n - 1 ? C[q[j] * M + q[j + 1]] : CE[q[j]];
            const fj = q[j] ^ 1, fi = q[i + 1] ^ 1;
            const a2 = i < 0 ? C0[fj] : C[q[i] * M + fj], b2 = j < n - 1 ? C[fi * M + q[j + 1]] : CE[fi];
            if (a2 + b2 < a + b - 1e-6) {
              let x = i + 1, y = j; while (x < y) { const t = q[x]; q[x] = q[y] ^ 1; q[y] = t ^ 1; x++; y--; } if (x === y) q[x] ^= 1;
              imp = true;
            }
          }
        }
        return q;
      }
      const budget = Math.max(150, 1200 / cands.length);
      const ini = endP ? [greedy(), bous(0, 0), bous(0, 1), bous(1, 0), bous(1, 1)] : [greedy(), bous(0, 0)];
      const sols = ini.map(q => twoOpt(q, budget / ini.length)).map(q => ({ q, c: cost(q) })).sort((a, b) => a.c - b.c);
      return { seq: sols[0].q, cost: sols[0].c, ex, en };
    }

    /* fase 1: vueltas perimetrales (espiral hacia dentro) */
    const lindeXY = fieldXY;
    let startP = opt.start ? P.fwd(opt.start[0], opt.start[1]) : lindeXY[0];
    const endP = opt.end ? P.fwd(opt.end[0], opt.end[1]) : null;
    const hlFinal = opt.hlFinal && hl.length > 0;
    let nCorners = 0;
    // vueltas perimetrales: al principio, de fuera a dentro; al final, de dentro a fuera acabando junto al punto final
    function rings(from, order, endNear) {
      const out = []; let c = from;
      order.forEach((k, idx) => {
        const left = hl[k].slice();
        while (left.length) {
          let bi = 0, bd = Infinity; left.forEach((r, i) => r.forEach(q => { const d = Geo.dist(c, q); if (d < bd) { bd = d; bi = i; } }));
          const ring = left.splice(bi, 1)[0], ultimo = idx === order.length - 1 && !left.length;
          const loop = rotateTo(ring, ultimo && endNear ? endNear : c);
          const d0 = Geo.dist(c, loop[0]);
          out.push({ type: out.length === 0 ? 'tras' : (d0 > 2.5 * we ? 'tras' : 'giro'), xy: [c, loop[0]] });
          out.push({ type: 'trabajo', xy: loop, ring: true });
          nCorners += corners(ring, true); c = loop[0];
        }
      });
      return { parts: out, cur: c };
    }
    const pre = []; let cur = startP;
    if (!hlFinal) { const r = rings(startP, hl.map((_, k) => k), null); pre.push(...r.parts); cur = r.cur; }
    /* fase 2: vueltas alrededor de exclusiones */
    const oleft = obsRings.filter(Boolean).map(r => r.xy);
    while (oleft.length) {
      let bi = 0, bd = Infinity; oleft.forEach((r, i) => r.forEach(q => { const d = Geo.dist(cur, q); if (d < bd) { bd = d; bi = i; } }));
      const loop = rotateTo(oleft.splice(bi, 1)[0], cur);
      pre.push({ type: 'tras', xy: [cur, loop[0]] }); pre.push({ type: 'trabajo', xy: loop, ring: true }); cur = loop[0];
    }
    /* fase 3: pasadas, se evalúan los candidatos */
    let best = null, kk = 0;
    for (const az of cands) {
      if (opt.onProgress) opt.onProgress(kk++ / cands.length);
      const sw = az === 'rows' ? rowSwaths() : swaths(az), so = solve(sw, cur, endP);
      if (!best || so.cost < best.so.cost) best = { sw, so, az: Math.round(sw.az) };
    }
    const { sw, so } = best, parts = pre.slice();
    const cnt = { U: 0, K: 0, O: 0, rodeo: 0, tras: 0 };

    // geometría de transiciones
    function turnGeom(E, N, type) {
      const h = E.h, nl = [-h[1], h[0]], d = [N.p[0] - E.p[0], N.p[1] - E.p[1]];
      const du = d[0] * h[0] + d[1] * h[1], dv = d[0] * nl[0] + d[1] * nl[1];
      const W = (x, y) => [E.p[0] + x * h[0] + y * nl[0], E.p[1] + x * h[1] + y * nl[1]];
      const sg = dv >= 0 ? 1 : -1, u0 = Math.max(0, du);
      const arc = (cx, cy, a0, a1, dir) => {
        let sw_ = a1 - a0;
        if (dir > 0) { while (sw_ <= 1e-9) sw_ += 2 * Math.PI; while (sw_ > 2 * Math.PI) sw_ -= 2 * Math.PI; }
        else { while (sw_ >= -1e-9) sw_ -= 2 * Math.PI; while (sw_ < -2 * Math.PI) sw_ += 2 * Math.PI; }
        const ns = Math.max(4, Math.ceil(Math.abs(sw_) * R / 0.5)), o = [];
        for (let i = 0; i <= ns; i++) { const a = a0 + sw_ * i / ns; o.push(W(cx + R * Math.cos(a), cy + R * Math.sin(a))); }
        return o;
      };
      const ang = (cx, cy, x, y) => Math.atan2(y - cy, x - cx);
      const preS = du > 0 ? [W(0, 0)] : [], postS = du < 0 ? [W(du, dv)] : [];
      if (type === 'U' || type === 'K') {
        const a1 = arc(u0, sg * R, -sg * Math.PI / 2, 0, sg), a2 = arc(u0, dv - sg * R, 0, sg * Math.PI / 2, sg);
        if (type === 'U') return [{ type: 'giro', xy: [...preS, ...a1, ...a2, ...postS] }];
        return [{ type: 'giro', xy: [...preS, ...a1] }, { type: 'reversa', xy: [a1[a1.length - 1], a2[0]] }, { type: 'giro', xy: [...a2, ...postS] }];
      }
      // Ω
      const ad = Math.abs(dv), hh = Math.sqrt(Math.max(0, 4 * R * R - (ad / 2 + R) ** 2));
      const c1 = [u0, -sg * R], c3 = [u0, dv + sg * R], c2 = [u0 + hh, dv / 2];
      const t1 = [(c1[0] + c2[0]) / 2, (c1[1] + c2[1]) / 2], t2 = [(c2[0] + c3[0]) / 2, (c2[1] + c3[1]) / 2];
      const A1 = arc(c1[0], c1[1], ang(c1[0], c1[1], u0, 0), ang(c1[0], c1[1], t1[0], t1[1]), -sg);
      const A2 = arc(c2[0], c2[1], ang(c2[0], c2[1], t1[0], t1[1]), ang(c2[0], c2[1], t2[0], t2[1]), sg);
      const A3 = arc(c3[0], c3[1], ang(c3[0], c3[1], t2[0], t2[1]), ang(c3[0], c3[1], u0, dv), -sg);
      return [{ type: 'giro', xy: [...preS, ...A1, ...A2, ...A3, ...postS] }];
    }
    const arrows = [];
    so.seq.forEach((v, k) => {
      const g = sw.segs[v >> 1], dir = v & 1, a = dir ? g.b : g.a, b = dir ? g.a : g.b;
      if (k === 0) parts.push({ type: 'tras', xy: [cur, a] });
      else {
        const E = so.ex[so.seq[k - 1]], N = so.en[v], tr = trans(E, N);
        if (tr.type === 'U' || tr.type === 'K' || tr.type === 'O') { cnt[tr.type]++; parts.push(...turnGeom(E, N, tr.type)); }
        else if (tr.type === 'rodeo') { cnt.rodeo++; const r = obsRings[E.obs]; parts.push({ type: 'giro', xy: [E.p, ...ringWalk(r, projRing(r, E.p), projRing(r, N.p), true).pts, N.p] }); }
        else {
          cnt.tras++;
          if (E.kind === 'hl' && N.kind === 'hl') { const A = pjT(E.p), B = pjT(N.p); parts.push({ type: 'tras', xy: [E.p, ...ringWalk(trRing, A, B, true).pts, N.p] }); }
          else parts.push({ type: 'tras', xy: [E.p, N.p] });
        }
      }
      parts.push({ type: 'trabajo', xy: [a, b], swath: true });
      arrows.push({ xy: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], az: (Math.atan2(b[0] - a[0], b[1] - a[1]) / D2R + 360) % 360 });
    });
    // posición tras la última pasada
    let fin = cur, finE = null;
    if (so.seq.length) { const v = so.seq[so.seq.length - 1]; finE = so.ex[v]; fin = finE.p; }
    if (hlFinal) { const r = rings(fin, hl.map((_, k) => k).reverse(), endP); parts.push(...r.parts); fin = r.cur; finE = { p: fin, kind: 'hl' }; }
    if (endP && Geo.dist(fin, endP) > 0.5) { const t_ = toEnd(finE || { p: fin, kind: 'x' }, endP); cnt.tras++; parts.push({ type: 'tras', xy: t_.xy.length ? t_.xy : [fin, endP] }); }

    /* estadísticas */
    const L = { trabajo: 0, giro: 0, reversa: 0, tras: 0 };
    parts.forEach(p => { p.len = plen(p.xy); L[p.type] += p.len; });
    const tTrab = L.trabajo / vw, tGiro = (L.giro + L.reversa) / vg + cnt.K * 2 * S.tCambioSentido, tTras = L.tras / vt + cnt.tras * S.tManiobra, tEsq = nCorners * S.tEsquina;
    const tTot = tTrab + tGiro + tTras + tEsq; // s

    /* cobertura teórica */
    const C = CL(), co = new C.ClipperOffset(2, 0.05 * SC);
    parts.filter(p => p.type === 'trabajo').forEach(p => { const xy = p.ring ? p.xy.slice(0, -1) : p.xy; co.AddPath(toC(xy), C.JoinType.jtRound, p.ring ? C.EndType.etClosedLine : C.EndType.etOpenButt); });
    const covered = new C.Paths(); co.Execute(covered, w / 2 * SC);
    const work = obs.length ? boolOp('diff', field, obs) : field;
    const aWork = areaC(work), aCov = areaC(boolOp('int', work, covered));
    const missed = boolOp('diff', work, covered).filter(p => areaP(p) > 0.5 && C.Clipper.Orientation(p));
    const aMiss = Math.max(0, aWork - aCov);
    let aTree = 0;
    if (monte && treeRows && treeRows.length) {
      const co2 = new C.ClipperOffset(2, 0.05 * SC); treeRows.forEach(l => co2.AddPath(toC(l), C.JoinType.jtSquare, C.EndType.etOpenButt));
      const strips = new C.Paths(); co2.Execute(strips, (S.holguraTronco + radioT) * SC);
      aTree = areaC(boolOp('int', work, strips));
    }

    const toLL = xy => Geo.toLL(xy, P).map(q => [+q[0].toFixed(7), +q[1].toFixed(7)]);
    return {
      fecha: Date.now(), geomKey: geomKey(f), az: best.az, nH: hl.length, inicio: opt.start || null, fin: opt.end || null, hlFinal: !!hlFinal, nHauto, need, ms: Math.round(performance.now() - T0), warn,
      params: { w, s, R, marchaAtras: !!S.marchaAtras, v: S.velocidad, consumo: S.consumo },
      parts: parts.filter(p => p.len > 0.05).map(p => ({ type: p.type, ll: toLL(p.xy), swath: !!p.swath })),
      arrows: arrows.map(a => ({ ll: toLL([a.xy])[0], az: Math.round(a.az) })),
      missed: missed.map(p => toLL(frC(p))),
      stats: {
        nPasadas: sw.segs.length, nVueltas: hl.length, nObs: obsRings.filter(Boolean).length,
        giros: cnt, esquinas: nCorners,
        L: { trabajo: L.trabajo, giro: L.giro, reversa: L.reversa, traslado: L.tras, total: L.trabajo + L.giro + L.reversa + L.tras },
        t: { trabajo: tTrab, giros: tGiro, traslado: tTras, esquinas: tEsq, total: tTot },
        litros: tTot / 3600 * S.consumo,
        area: { objetivo: aWork, cubierta: aCov, noAlcanzada: aMiss, cobertura: aWork ? aCov / aWork : 0, franjaArboles: aTree, coberturaAlcanzable: aWork - aTree > 0 ? Math.min(1, aCov / (aWork - aTree)) : 0 },
        monte,
        haH: aWork / 10000 / (tTot / 3600)
      }
    };
  }
  return { plan, headlandNeed };
})();

function geomKey(f) {
  const M = f.tipo === 'monte' && f.malla ? [f.malla.A, f.malla.B, f.malla.C, f.malla.diam, f.malla.margen, (f.malla.faltas || []).length, (f.malla.arboles || []).length] : null;
  const s = JSON.stringify(M ? [f.linde && f.linde.coords, (f.exclusiones || []).map(e => e.coords), M] : [f.linde && f.linde.coords, (f.exclusiones || []).map(e => e.coords)]);
  let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36) + s.length.toString(36);
}

