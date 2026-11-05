'use strict';
/* =========================================================
   F3 — TRABAJO EN TIEMPO REAL
   Registro, posición de corte, cobertura, desviaciones, indicadores
   ========================================================= */

/* ---- Rejilla de cobertura (celdas de 0,25 m) ---- */
function Grid(f) {
  const P = Geo.projFor(f.linde.coords);
  const lin = Geo.toXY(f.linde.coords, P), exs = (f.exclusiones || []).map(e => Geo.toXY(e.coords, P));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  lin.forEach(p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
  x0 -= 4; y0 -= 4; x1 += 4; y1 += 4;
  let cs = 0.25; while (((x1 - x0) / cs) * ((y1 - y0) / cs) > 4e6) cs *= 2;
  const cols = Math.ceil((x1 - x0) / cs), rows = Math.ceil((y1 - y0) / cs), N = cols * rows;
  const mask = new Uint8Array(N), cnt = new Uint8Array(N), lastT = new Float32Array(N).fill(-1e9);
  const fill = (poly, val) => {
    for (let r = 0; r < rows; r++) {
      const y = y0 + (r + .5) * cs, xs = [];
      for (let i = 0, n = poly.length; i < n; i++) { const a = poly[i], b = poly[(i + 1) % n]; if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1])); }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const c0 = Math.max(0, Math.ceil((xs[k] - x0) / cs - .5)), c1 = Math.min(cols - 1, Math.floor((xs[k + 1] - x0) / cs - .5));
        for (let c = c0; c <= c1; c++) mask[r * cols + c] = val;
      }
    }
  };
  fill(lin, 1); exs.forEach(e => fill(e, 0));
  let nMask = 0; for (let i = 0; i < N; i++) nMask += mask[i];
  // troncos (diámetro/2 + holgura): no se pintan como «sin limpiar»
  let treeM = null;
  if (f.malla && f.malla.arboles && f.malla.arboles.length) {
    treeM = new Uint8Array(N); const rr = (+(f.malla.diam || S.diamTronco || 500)) / 2000 + (S.holguraTronco || 0.3), n_ = Math.ceil(rr / cs);
    f.malla.arboles.forEach(a => { const q = P.fwd(a[0], a[1]), c0 = Math.floor((q[0] - x0) / cs), r0 = Math.floor((q[1] - y0) / cs); for (let dr = -n_; dr <= n_; dr++) for (let dc = -n_; dc <= n_; dc++) { const r_ = r0 + dr, c_ = c0 + dc; if (r_ < 0 || c_ < 0 || r_ >= rows || c_ >= cols) continue; if (Math.hypot(x0 + (c_ + .5) * cs - q[0], y0 + (r_ + .5) * cs - q[1]) <= rr) treeM[r_ * cols + c_] = 1; } });
  }
  const g = { P, x0, y0, cs, cols, rows, mask, cnt, treeM, nMask, nClean: 0, nOver: 0 };
  g.stamp = (a, b, w, t) => {
    const r = w / 2, r2 = r * r;
    const c0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - r - x0) / cs)), c1 = Math.min(cols - 1, Math.floor((Math.max(a[0], b[0]) + r - x0) / cs));
    const r0 = Math.max(0, Math.floor((Math.min(a[1], b[1]) - r - y0) / cs)), r1 = Math.min(rows - 1, Math.floor((Math.max(a[1], b[1]) + r - y0) / cs));
    const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-12;
    for (let rr = r0; rr <= r1; rr++) {
      const y = y0 + (rr + .5) * cs;
      for (let c = c0; c <= c1; c++) {
        const x = x0 + (c + .5) * cs;
        let tt = ((x - a[0]) * dx + (y - a[1]) * dy) / L2; tt = tt < 0 ? 0 : tt > 1 ? 1 : tt;
        const ex = x - a[0] - tt * dx, ey = y - a[1] - tt * dy;
        if (ex * ex + ey * ey > r2) continue;
        const k = rr * cols + c;
        if (t - lastT[k] > 15) { const v = cnt[k]; if (v < 255) { cnt[k] = v + 1; if (mask[k]) { if (v === 0) g.nClean++; else if (v === 1) g.nOver++; } } }
        lastT[k] = t;
      }
    }
  };
  g.areas = () => ({ objetivo: g.nMask * cs * cs, limpia: g.nClean * cs * cs, solape: g.nOver * cs * cs });
  let cv = null;
  g.render = cfg => {
    if (!cv) { cv = document.createElement('canvas'); cv.width = cols; cv.height = rows; }
    const ctx = cv.getContext('2d'), im = ctx.createImageData(cols, rows), d = im.data;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const k = r * cols + c, v = cnt[k], o = ((rows - 1 - r) * cols + c) * 4;
      let col = null;
      if (v >= 2 && cfg.solape) col = [253, 216, 53, 185];
      else if (v >= 1 && cfg.limpia) col = [27, 94, 32, 150];
      else if (v === 0 && mask[k] && cfg.pendiente && !(treeM && treeM[k])) col = [229, 30, 30, 215];
      if (col) { d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = col[3]; }
    }
    ctx.putImageData(im, 0, 0); return cv.toDataURL();
  };
  g.bounds = () => { const a = P.inv(x0, y0), b = P.inv(x0 + cols * cs, y0 + rows * cs); return [[a[0], a[1]], [b[0], b[1]]]; };
  return g;
}

/* ---- Seguimiento: posición de corte, desviación, longitudes ---- */
function Tracker(g, plan, S, t0) {
  const P = g.P, segs = [], cum = [], segPart = [], partEnd = [];
  let acc0 = 0;
  if (plan) plan.parts.forEach((p, k) => { const xy = Geo.toXY(p.ll, P); for (let i = 1; i < xy.length; i++) { segs.push([xy[i - 1][0], xy[i - 1][1], xy[i][0], xy[i][1]]); cum.push(acc0); segPart.push(k); acc0 += Geo.dist(xy[i - 1], xy[i]); } partEnd[k] = acc0; });
  let lastIdx = -1;
  const st = { buf: [], h: null, lastCut: null, lastP: null, L: 0, Lon: 0, Ldev: 0, devSum: 0, devMax: 0, Lplan: 0, tOn: 0, hasPlan: segs.length > 0 };
  // se compara con el tramo del plan que toca (ventana a lo largo del plan); si se pierde, búsqueda global
  function search(p, i0, i1) {
    let bd = Infinity, side = 0, bi = -1, bt = 0;
    for (let i = i0; i <= i1; i++) {
      const s = segs[i], dx = s[2] - s[0], dy = s[3] - s[1], L2 = dx * dx + dy * dy || 1e-12;
      let t = ((p[0] - s[0]) * dx + (p[1] - s[1]) * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = p[0] - s[0] - t * dx, ey = p[1] - s[1] - t * dy, d = Math.hypot(ex, ey);
      if (d < bd) { bd = d; side = Math.sign(dx * ey - dy * ex); bi = i; bt = t; }
    }
    const part = bi >= 0 ? segPart[bi] : -1, along = bi >= 0 ? cum[bi] + bt * Math.hypot(segs[bi][2] - segs[bi][0], segs[bi][3] - segs[bi][1]) : 0;
    const sg = bi >= 0 ? segs[bi] : null, sl = sg ? Math.hypot(sg[2] - sg[0], sg[3] - sg[1]) || 1 : 1;
    return { d: bd, side, i: bi, part, rem: part >= 0 ? partEnd[part] - along : 0, into: part > 0 ? along - partEnd[part - 1] : along, dir: sg ? [(sg[2] - sg[0]) / sl, (sg[3] - sg[1]) / sl] : null };
  }
  function nearest(p) {
    let r = null;
    if (lastIdx >= 0) {
      let i0 = lastIdx, i1 = lastIdx;
      while (i0 > 0 && cum[lastIdx] - cum[i0 - 1] < 15) i0--;
      while (i1 < segs.length - 1 && cum[i1 + 1] - cum[lastIdx] < 60) i1++;
      r = search(p, i0, i1);
      if (r.d > 6) r = null;
    }
    if (!r) r = search(p, 0, segs.length - 1);
    lastIdx = r.i; return r;
  }
  st.add = pt => {
    const [lat, lon, acc, tms, on] = pt;
    if (acc > S.umbralPrecision) return { valid: false };
    const p0 = P.fwd(lat, lon), t = (tms - t0) / 1000;
    if (st.lastP) { const dd = Geo.dist(st.lastP.raw, p0), dtt = t - st.lastP.t; if (dtt > 0 && dd / dtt > 8) return { valid: false }; }
    // filtro de Kalman: posición suavizada, velocidad y precisión estimada
    if (!st.kf) st.kf = KF2();
    const kf = st.kf.step(p0, acc, t);
    if (kf.reject) return { valid: false };
    const p = kf.p, accF = kf.sigma;
    let moving = kf.speed > 0.15, ds = 0, dt = 0;
    if (st.lastP) { ds = Geo.dist(st.lastP.p, p); dt = t - st.lastP.t; }
    st.lastP = { p, t, raw: p0 };
    // umbral de desvío: el fijado, o mayor si la precisión del GPS no da para más
    const thr = S.umbralAuto ? Math.max(S.umbralDesv, 1.5 * accF) : S.umbralDesv;
    st.buf.push(p); if (st.buf.length > 40) st.buf.shift();
    for (let i = st.buf.length - 2; i >= 0; i--) { const d = Geo.dist(st.buf[i], p); if (d >= 3) { st.h = [(p[0] - st.buf[i][0]) / d, (p[1] - st.buf[i][1]) / d]; break; } }
    const speed = kf.speed * 3.6;
    if (!st.h) return { valid: true, moving, speed, cut: null, thr, accF };
    const lat_ = S.desplazamiento || 0;   // desplazamiento lateral del apero (+ derecha)
    const cut = [p[0] - S.offsetApero * st.h[0] + lat_ * st.h[1], p[1] - S.offsetApero * st.h[1] - lat_ * st.h[0]];
    const dev = segs.length ? nearest(cut) : null;
    // solo cuenta como desvío en tramo recto, alineado con el plan (no en esquinas, giros ni al entrar/salir de pasada)
    if (dev) dev.ok = !!(dev.dir && Math.abs(st.h[0] * dev.dir[0] + st.h[1] * dev.dir[1]) > 0.9 && dev.into > 6 && dev.rem > 2);
    const flag = !!(dev && on && dev.ok && dev.d > thr);
    if (st.lastCut && moving) {
      const L = Geo.dist(st.lastCut, cut);
      st.L += L;
      if (on) { st.Lon += L; g.stamp(st.lastCut, cut, S.aperoAncho, t); st.tOn += dt; }
      if (dev && on) { st.Lplan += L; st.devSum += dev.d * L; if (flag) st.Ldev += L; if (dev.d > st.devMax) st.devMax = dev.d; }
    }
    if (moving || !st.lastCut) st.lastCut = cut;
    return { valid: true, moving, speed, cut, cutLL: P.inv(cut[0], cut[1]), dev, flag, on, thr, accF };
  };
  st.reset = () => { st.buf = []; st.lastCut = null; st.lastP = null; st.h = null; st.kf = null; };
  return st;
}

/* ---- Reconstrucción de un trabajo (rejilla + recorrido) ---- */
function sesHoras(trab) { return trab.sesiones.reduce((s, x) => s + Math.max(0, (x.fin || x.inicio) - x.inicio), 0) / 3.6e6; }
function rebuildTrab(f, trab) {
  const pRec = trab.planId && planesCache.get(trab.planId);
  const g = Grid(f), plan = pRec ? pRec.plan : trab.planFecha && f.plan && f.plan.fecha === trab.planFecha ? f.plan : null;
  const S2 = effS(f, trab.cfg || f.config);
  const tr = Tracker(g, plan, S2, trab.inicio), outs = [];
  trab.sesiones.forEach(ses => { tr.reset(); outs.push(null); ses.pts.forEach(pt => { const r = tr.add(pt); if (r.cut) outs.push([r.cutLL, r.on, r.flag]); }); });
  return { g, tr, outs, plan, S2 };
}
function resumenTrab(trab, R) {
  const a = R.g.areas(), horas = sesHoras(trab), tr = R.tr;
  const planL = R.plan ? R.plan.stats.L.total : null;
  return {
    horas, horasOn: tr.tOn / 3600, L: tr.L, Lon: tr.Lon,
    objetivo: a.objetivo, limpia: a.limpia, solape: a.solape, pendiente: Math.max(0, a.objetivo - a.limpia),
    cobertura: a.objetivo ? a.limpia / a.objetivo : 0, solapePct: a.limpia ? a.solape / a.limpia : 0,
    planL, eta: planL && tr.L > 0 ? planL / tr.L : null,
    planArea: R.plan ? R.plan.stats.area.objetivo : null,
    devMed: tr.Lplan ? tr.devSum / tr.Lplan : null, devMax: tr.hasPlan ? tr.devMax : null, devPct: tr.Lplan ? tr.Ldev / tr.Lplan : null,
    vMedia: tr.tOn > 0 ? tr.Lon / tr.tOn * 3.6 : null,
    litros: horas * (R.S2 || S).consumo, consumo: (R.S2 || S).consumo,
    haH: horas > 0 ? a.limpia / 1e4 / horas : null, LHa: a.limpia > 0 ? horas * (R.S2 || S).consumo / (a.limpia / 1e4) : null,
    planT: R.plan ? R.plan.stats.t.total / 3600 : null, planLitros: R.plan ? R.plan.stats.litros : null
  };
}

/* ---- Dibujo del recorrido real ---- */
function drawRuns(outs, cfg, layReal, layDev) {
  layReal.clearLayers(); layDev.clearLayers();
  let run = null, dev = null, prev = null;
  const flushRun = () => { if (run && run.ll.length > 1) L.polyline(run.ll, run.on ? { color: '#7b1fa2', weight: 3, opacity: .9, interactive: false } : { color: '#7b1fa2', weight: 2, opacity: .7, dashArray: '3 5', interactive: false }).addTo(layReal); };
  const flushDev = () => { if (dev && dev.length > 1) L.polyline(dev, { color: '#d50000', weight: 5, opacity: .9, interactive: false }).addTo(layDev); };
  for (const o of outs) {
    if (!o) { flushRun(); flushDev(); run = null; dev = null; prev = null; continue; }
    const [ll, on, flag] = o;
    if (cfg.real) { if (!run || run.on !== !!on) { flushRun(); run = { on: !!on, ll: prev ? [prev] : [] }; } run.ll.push(ll); }
    if (cfg.desv) { if (flag) { if (!dev) dev = prev ? [prev] : []; dev.push(ll); } else if (dev) { dev.push(ll); flushDev(); dev = null; } }
    prev = ll;
  }
  flushRun(); flushDev();
}

/* ---- Interfaz de trabajo ---- */
let work = null, trabCache = null;
async function workMenu() {
  if (busy()) return;
  if (!cur.linde) return toast('Primero define el linde de la finca');
  const trs = await DB.tByFinca(cur.id), abierto = trs.find(t => t.estado === 'abierto');
  const hasPlan = cur.plan && !planStale(cur);
  let reTxt = '';
  if (abierto) { try { await cargarPlanes(cur); const R0 = rebuildTrab(cur, abierto), q = puntoReanudar(R0); reTxt = q ? q.completo ? ' · plan ya recorrido' : ' · reanuda en ' + q.lab.toLowerCase() : ''; } catch (e) { } }
  sheet(`<h3>Trabajar</h3>
    ${hasPlan ? `<div class="note" style="margin-bottom:8px">Plan: ${fmtH(cur.plan.stats.t.total / 3600)} · ${fmt(cur.plan.stats.L.total, 0)} m de trayectoria ideal.</div>`
      : `<div class="card" style="background:#fff3e0;color:#e65100">Sin plan ${cur.plan ? 'actualizado' : ''}: se registrará cobertura y tiempo, pero no desviaciones ni eficiencia.</div>`}
    ${abierto ? `<button class="opt" id="wCont">▶️ Continuar ${esc(nomRuta(abierto))} desde donde quedó<small>${new Date(abierto.inicio).toLocaleDateString('es-ES')} · ${abierto.sesiones.length} sesión(es) · ${fmtH(sesHoras(abierto))}${abierto.resumen ? ' · ' + fmt(abierto.resumen.cobertura * 100, 0) + ' % limpio' : ''}${reTxt}. Te guía hasta el punto exacto.</small></button>` : ''}
    <button class="opt" id="wNew">🆕 Nuevo trabajo<small>${abierto ? 'El trabajo abierto quedará cerrado.' : 'Empieza con el apero en trabajo.'}</small></button>`,
    () => {
      if (abierto) $('wCont').onclick = () => { closeSheet(); startWork(abierto); };
      $('wNew').onclick = async () => {
        closeSheet();
        if (abierto) { const R = rebuildTrab(cur, abierto); abierto.estado = 'cerrado'; abierto.resumen = resumenTrab(abierto, R); await DB.tPut(abierto); }
        startWork(null);
      };
    });
}
async function startWork(trab) {
  incStart(true).then(ok => { if (ok && !calHoy()) setTimeout(() => { if (work) ceroSheet(true); }, 1800); });   // seguridad: permiso del sensor dentro del toque; 0° cada día
  const cont = !!trab;
  const hasPlan = cur.plan && !planStale(cur);
  if (!trab && cur.plan && !hasPlan) toast('⚠️ El plan está desactualizado (cambió el linde, una exclusión o un peligro): esta ruta se guarda sin plan. Recalcula el plan para compararla.', 6000);
  if (!trab) {
    if (hasPlan) await asegurarPlanGuardado(cur);
    const num = (await DB.tByFinca(cur.id)).reduce((m, t) => Math.max(m, t.num || 0), 0) + 1;
    trab = { id: uid(), fincaId: cur.id, num, nombre: 'Ruta ' + num, inicio: Date.now(), estado: 'abierto', planFecha: hasPlan ? cur.plan.fecha : null, planId: hasPlan ? cur.planId : null, cfg: { ...(cur.config || {}) }, sesiones: [] };
  }
  const R = rebuildTrab(cur, trab);
  R.tr.reset(); R.outs.push(null);
  work = { trab, ...R, ses: null, on: true, paused: true, ready: true, last: null, spd: 0, guide: { info: R.plan ? planGuide(R.plan) : [], part: -1, warned: false, devSince: 0, devSay: 0 } };
  paintTools();
  viewTrab = trab.id; trabCache = null;
  await DB.tPut(trab);
  startGPS(); keepAwake(true); followPos = true;
  $('tbMain').classList.add('hidden'); $('pTool').classList.add('hidden'); $('pWork').classList.remove('hidden');
  $('bLoc').classList.add('hidden');
  paintApero(); renderWork(); updWorkUI();
  $('wPause').textContent = '▶ Iniciar'; $('wPause').className = 'btn';
  toast('Colócate en el punto de inicio y pulsa «Iniciar»', 3500);
  work.tRender = setInterval(renderWork, 3000);
  work.tSave = setInterval(saveWork, 20000);
  if (lastPos) map.setView([lastPos.lat, lastPos.lon], Math.max(map.getZoom(), 19));
  if (cont && R.plan) { try { resumeInit(R, trab); } catch (e) { console.warn(e); } }
}
/* ---- Guiado en cabina: barra de luces + voz ---- */
let vozES = null;
function speak(txt, urgent) {
  if (!S.voz || !('speechSynthesis' in window)) return;
  try {
    if (!vozES) { const vs = speechSynthesis.getVoices(); vozES = vs.find(v => /^es[-_]ES/i.test(v.lang)) || vs.find(v => /^es/i.test(v.lang)) || null; }
    if (urgent) speechSynthesis.cancel();
    else if (speechSynthesis.pending) return;
    const u = new SpeechSynthesisUtterance(txt); u.lang = 'es-ES'; u.rate = 1.05; if (vozES) u.voice = vozES;
    speechSynthesis.speak(u);
  } catch (e) { }
}
// etiquetas y maniobra siguiente de cada tramo de trabajo del plan
function planGuide(plan) {
  const parts = plan.parts, info = [], nSw = parts.filter(p => p.swath).length, nRing = parts.filter(p => p.type === 'trabajo' && !p.swath).length;
  let kS = 0, kR = 0;
  parts.forEach((p, i) => {
    if (p.type !== 'trabajo') return;
    const lab = p.swath ? `Pasada ${++kS} de ${nSw}` : `Vuelta ${++kR} de ${nRing}`;
    let j = i + 1, rev = false, tras = false; while (j < parts.length && parts[j].type !== 'trabajo') { if (parts[j].type === 'reversa') rev = true; if (parts[j].type === 'tras') tras = true; j++; }
    let next = null;
    if (j < parts.length) {
      const a = parts[i].ll, e = a[a.length - 1], e0 = a[Math.max(0, a.length - 2)], n0 = parts[j].ll[0];
      const P = Geo.proj(e[0], e[1]), A = P.fwd(e0[0], e0[1]), N = P.fwd(n0[0], n0[1]);
      const cr = (0 - A[0]) * (N[1] - 0) - (0 - A[1]) * (N[0] - 0);
      const lado = cr > 0 ? 'izquierda' : 'derecha';
      const tipo = tras ? 'traslado' : rev ? 'giro con marcha atrás' : p.swath && parts[j].swath ? 'giro en U' : 'paso a la siguiente vuelta';
      const nl = parts[j].swath ? 'pasada ' + (kS + 1) : 'vuelta ' + (p.swath ? 1 : kR + 1);
      next = { avisar: p.swath || tras || parts[j].swath, txt: tras ? `traslado a la ${nl}` : `${tipo} a la ${lado}, ${nl}`, short: (tras ? '➜ Traslado' : rev ? '↩ Giro K' : p.swath && parts[j].swath ? '↻ Giro U' : '↪ Cambio') + ' ' + (tras ? '' : lado) + ' → ' + nl };
    }
    info[i] = { lab, next };
  });
  return info;
}
function guideUpdate(r, p) {
  const G = work.guide; if (!G || !r.dev || r.dev.part < 0) return;
  const now = (p && p.t) || Date.now(), pi = r.dev.part;
  // solo se avanza en el plan (los cruces sobre tramos ya hechos, p. ej. en cabecera, no cuentan)
  if (pi < G.part) { G.devSince = 0; return; }
  const inf = G.info[pi];
  if (inf && pi !== G.part) { G.part = pi; G.warned = false; speak(inf.lab, true); }
  else if (!inf && pi > G.part) G.part = pi;
  if (inf && inf.next && inf.next.avisar && r.dev.rem < 12 && !G.warned && r.moving) { G.warned = true; speak(`Fin en ${Math.max(5, Math.round(r.dev.rem / 5) * 5)} metros. Después, ${inf.next.txt}`); }
  // desvío mantenido > 3 s
  const enTrabajo = inf && work.on;
  if (enTrabajo && r.dev.ok && r.dev.d > (r.thr || S.umbralDesv)) {
    if (!G.devSince) G.devSince = now;
    if (now - G.devSince > 3000 && now - G.devSay > 8000) { G.devSay = now; speak(`Desvío de ${fmt(r.dev.d, 1)} metros. Corrige a la ${r.dev.side > 0 ? 'derecha' : 'izquierda'}`); }
  } else G.devSince = 0;
}
function drawBar(r) {
  const bar = $('wBar'), N = 15, c = 7;
  if (!bar.children.length) bar.innerHTML = Array.from({ length: N }, (_, i) => `<i class="${i === c ? 'c' : ''}"></i>`).join('');
  const cells = bar.children; for (let i = 0; i < N; i++) cells[i].className = i === c ? 'c' : '';
  if (!r || !r.dev) { $('wSteer').textContent = '–'; return; }
  const d = r.dev.d, sgn = r.dev.side > 0 ? -1 : 1;              // izquierda de la línea → luces a la izquierda
  const U = r.thr || S.umbralDesv;
  const k = Math.max(-c, Math.min(c, Math.round(sgn * d / (U * 2 / c))));
  const col = d <= U ? 'g' : d <= U * 2 ? 'o' : 'r';
  if (k === 0) cells[c].className = 'c g';
  else for (let i = 1; i <= Math.abs(k); i++) cells[c + Math.sign(k) * i].className = col;
  if (d <= U * .3) { $('wSteer').textContent = '✔ ' + fmt(d, 1) + ' m'; $('wSteer').style.color = '#2e7d32'; }
  else { $('wSteer').textContent = (r.dev.side > 0 ? 'Corrige ▶ ' : '◀ Corrige ') + fmt(d, 1) + ' m'; $('wSteer').style.color = col === 'g' ? '#2e7d32' : col === 'o' ? '#e65100' : '#c62828'; }
}
function paintTools() {
  $('wVoz').classList.toggle('off', !S.voz); $('wVoz').textContent = S.voz ? '🔊 Voz' : '🔇 Voz';
  document.body.classList.toggle('hc', !!S.altoContraste);
}
$('wVoz').onclick = async () => { S.voz = !S.voz; paintTools(); if (S.voz) speak('Voz activada', true); else try { speechSynthesis.cancel(); } catch { } try { await saveSB(); } catch { } };
$('wInc').onclick = () => incidenciaSheet(); $('wPel').onclick = () => peligroSheet();
$('wHC').onclick = async () => { S.altoContraste = !S.altoContraste; paintTools(); try { await saveSB(); } catch { } };
let gpsWasOk = null;
setInterval(() => {
  if (!work || work.paused) { gpsWasOk = null; return; }
  const ok = GPS.estado === 'ok' && gpsAge() < 5 && lastPos && lastPos.acc <= S.umbralPrecision;
  if (gpsWasOk === true && !ok) speak('Atención: señal GPS perdida', true);
  if (gpsWasOk === false && ok) speak('GPS recuperado');
  gpsWasOk = ok;
}, 1000);

function workPoint(p) {
  if (!work) return;
  // reanudación automática: tras una pausa automática, al moverse más de 6 m
  if (work.paused && work.autoPaused && work.pausePos && p.acc <= S.umbralPrecision && Geo.lenLL([work.pausePos, [p.lat, p.lon]]) > Math.max(6, p.acc * 1.5)) {
    work.autoPaused = false; work.paused = false;
    work.ses = { inicio: Date.now(), fin: Date.now(), pts: [] }; work.trab.sesiones.push(work.ses); work.tr.reset(); work.outs.push(null);
    $('wPause').textContent = '⏸ Pausar'; $('wPause').className = 'btn big sec'; keepAwake(true); work.lastMove = Date.now();
    speak('En marcha. Continuamos', true); toast('▶ Reanudado automáticamente');
  }
  resumeUpdate(p);
  if (work.paused) return;
  // puntos 3D para el mapa del terreno: cada 2 s, con su altura
  if (p.alt != null && isFinite(p.alt)) {
    const P3 = work.ses.p3d || (work.ses.p3d = []), l3 = P3[P3.length - 1];
    if (!l3 || p.t - l3[5] >= 2000) { P3.push([+p.lat.toFixed(7), +p.lon.toFixed(7), +p.alt.toFixed(2), +p.acc.toFixed(1), p.altAcc != null && isFinite(p.altAcc) ? +p.altAcc.toFixed(1) : null, p.t]); work.n3d = (work.n3d || 0) + 1; }
  }
  const pt = [+p.lat.toFixed(7), +p.lon.toFixed(7), +p.acc.toFixed(1), p.t, work.on ? 1 : 0];
  const last = work.ses.pts[work.ses.pts.length - 1];
  if (last && p.t - last[3] < 900) return;
  work.ses.pts.push(pt); work.ses.fin = p.t;
  const r = work.tr.add(pt);
  if (r.cut) work.outs.push([r.cutLL, r.on, r.flag]);
  if (r.valid) { work.last = r; work.spd = work.spd * .6 + (r.speed || 0) * .4; guideUpdate(r, p); }
  // pausa automática si el tractor lleva parado más de S.autoPausa segundos
  if (r.valid && (r.moving || !work.lastMove)) work.lastMove = Date.now();
  if (S.autoPausa > 0 && work.lastMove && Date.now() - work.lastMove > S.autoPausa * 1000) {
    work.paused = true; work.autoPaused = true; work.ses.fin = Date.now(); work.pausePos = [p.lat, p.lon];
    $('wPause').textContent = '▶ Continuar'; $('wPause').className = 'btn big';
    speak('Pausa automática. Parado', true); toast('⏸ Pausa automática (parado). Se reanuda al moverte.', 4000); saveWork();
  }
  updWorkUI(p);
  prepararPendienteTrabajo(); avisoPendiente(p); avisoPeligros(p);
}
function renderWork() {
  if (!work) return;
  drawRuns(work.outs, CFG, lyr.real, lyr.desv);
  drawCov(work.g);
  updWorkUI();
}
function drawCov(g) {
  if (lyr.cov) { map.removeLayer(lyr.cov); lyr.cov = null; }
  if (!(CFG.limpia || CFG.solape || CFG.pendiente)) return;
  lyr.cov = L.imageOverlay(g.render(CFG), g.bounds(), { interactive: false, className: 'covimg' }).addTo(map);
  lyr.cov.bringToBack();
}
function updWorkUI(p) {
  if (!work) return;
  p = p || lastPos; const r = work.last || {};
  const a = work.g.areas(), cov = a.objetivo ? a.limpia / a.objetivo : 0;
  const horas = sesHoras(work.trab) + (work.paused ? 0 : 0);
  $('wSpd').textContent = fmt(work.spd, 1);
  if (r.dev && work.tr.hasPlan) {
    const d = r.dev.d, bad = d > Math.max(S.umbralDesv, p ? p.acc : 0);
    $('wDev').textContent = (r.dev.side > 0 ? '◀ ' : r.dev.side < 0 ? '▶ ' : '') + fmt(d, 1);
    $('wDev').className = bad ? 'acc-bad' : d > S.umbralDesv * .6 ? 'acc-mid' : 'acc-ok';
    $('wDevL').textContent = r.dev.side > 0 ? 'Desvío (izq.) m' : r.dev.side < 0 ? 'Desvío (dcha.) m' : 'Desvío m';
  } else { $('wDev').textContent = '–'; $('wDev').className = ''; $('wDevL').textContent = 'Desvío m'; }
  $('wGuide').classList.toggle('hidden', !work.tr.hasPlan);
  if (work.tr.hasPlan) {
    drawBar(r.dev ? r : null);
    const back = r.dev && r.dev.part < work.guide.part, inf = r.dev && !back && work.guide.info[r.dev.part];
    $('wPass').textContent = inf ? `${inf.lab} · fin en ${fmt(Math.max(0, r.dev.rem), 0)} m` : r.dev ? 'Maniobra · sigue la línea azul' : 'Buscando posición en el plan…';
    $('wNext').textContent = inf && inf.next ? 'Después: ' + inf.next.short : '';
  }
  $('wCov').textContent = fmt(cov * 100, 1) + ' %';
  { const m = Math.round(horas * 60); $('wTime').textContent = Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0'); }
  $('wLit').textContent = fmt(horas * S.consumo, 1);
  const planL = work.plan ? work.plan.stats.L.total : 0;
  $('wEta').textContent = planL && work.tr.L > 20 ? fmt(Math.min(1.5, planL * cov / work.tr.L) * 100, 0) + ' %' : '–';
  resumePaint(p);
  if (p) { const el = $('wAcc'); el.textContent = '±' + fmt(r.accF != null ? r.accF : p.acc, 1) + ' m' + (r.thr ? ' · umbral ' + fmt(r.thr, 1) : ''); el.className = p.acc <= 5 ? 'acc-ok' : p.acc <= S.umbralPrecision ? 'acc-mid' : 'acc-bad'; }
}
function paintApero() {
  const b = $('wApero');
  b.textContent = work.on ? '🟢 APERO EN TRABAJO' : '⚪ APERO LEVANTADO';
  b.style.background = work.on ? 'var(--pri)' : '#9e9e9e';
}
$('wApero').onclick = () => { if (!work) return; work.on = !work.on; paintApero(); speak(work.on ? 'Apero en trabajo' : 'Apero levantado', true); };
$('wPause').onclick = async () => {
  if (!work) return;
  if (!work.paused) { work.paused = true; work.autoPaused = false; work.ses.fin = Date.now(); speak('En pausa', true); await saveWork(); $('wPause').textContent = '▶ Continuar'; $('wPause').className = 'btn'; return; }
  const go = () => { speak(work.ready ? (work.plan ? 'Trabajo iniciado. Sigue la línea azul.' : 'Trabajo iniciado.') : 'Continuamos', true); work.paused = false; work.ready = false; work.autoPaused = false; work.lastMove = Date.now();
    setActivo({ tipo: 'trabajo', fincaId: cur.id, trabId: work.trab.id, t: Date.now() }); work.ses = { inicio: Date.now(), fin: Date.now(), pts: [] }; work.trab.sesiones.push(work.ses); work.tr.reset(); work.outs.push(null); $('wPause').textContent = '⏸ Pausar'; $('wPause').className = 'btn sec'; keepAwake(true); };
  if (!lastPos || gpsAge() > 10) return toast('Esperando señal GPS: el indicador de arriba a la izquierda debe estar en verde.', 4000);
  if (lastPos.acc > S.umbralPrecision) return confirmSheet(`La precisión actual es ±${fmt(lastPos.acc, 0)} m. ¿Empezar igualmente?`, 'Empezar', go);
  go();
};
$('wEnd').onclick = () => {
  sheet(`<h3>Terminar</h3>
    <button class="opt" id="eFin">✅ Finalizar trabajo<small>La finca queda limpia (o se da por terminada).</small></button>
    <button class="opt" id="eOpen">⏸ Dejar abierto<small>Se continúa otro día desde donde se dejó.</small></button>
    <button class="opt" id="eFuel">⛽ Registrar repostaje<small>Calibra el consumo real (L/h).</small></button>`,
    () => {
      $('eFin').onclick = () => endWork('cerrado');
      $('eOpen').onclick = () => endWork('abierto');
      $('eFuel').onclick = () => repostajeSheet();
    });
};
async function saveWork() { if (!work) return; if (!work.paused && work.ses) work.ses.fin = Date.now(); try { await DB.tPut(work.trab); } catch (e) { toast('Error guardando: ' + e.message); } }
async function endWork(estado) {
  setTimeout(() => { if (ACT.nueva) actBanner(); }, 1500);
  closeSheet();
  const w = work; if (!w) return;
  if (!w.paused && w.ses) w.ses.fin = Date.now();
  w.trab.sesiones = w.trab.sesiones.filter(s => s.pts.length > 0);
  w.trab.sesiones.forEach(x => { const lp = x.pts[x.pts.length - 1]; if (lp) x.fin = Math.max(x.fin || 0, lp[3]); });
  w.trab.estado = estado; w.trab.fin = Date.now(); w.trab.precios = { gasoil: +SB.precioGasoil || 0, hora: +SB.precioHora || 0, km: +SB.precioKm || 0, kmIda: cur.traslado && SB.base && cur.traslado.key === trasladoKey(cur) ? cur.traslado.km : null, fecha: Date.now() };
  w.trab.resumen = resumenTrab(w.trab, w);
  if (w.plan) { const pr = w.trab.planId && planesCache.get(w.trab.planId); w.trab.planResumen = { nombre: pr ? nomPlan(pr) : 'Plan', t: w.plan.stats.t.total / 3600, litros: w.plan.stats.litros, L: w.plan.stats.L.total, fecha: w.plan.fecha }; }
  clearInterval(w.tRender); clearInterval(w.tSave); resumeEnd(); incStop();
  if (w.trab.sesiones.length) await DB.tPut(w.trab); else await DB.tDel(w.trab.id);
  setActivo(null);
  work = null; keepAwake(false); followPos = false; document.body.classList.remove('hc'); try { speechSynthesis.cancel(); } catch { }
  $('pWork').classList.add('hidden'); $('bLoc').classList.remove('hidden'); showMain();
  trabCache = null; drawFinca();
  if (w.trab.sesiones.length && w.trab.planId) aprenderTrasRuta(cur, w.trab);
  if (w.trab.sesiones.length) { resumenSheet(w.trab); toast(`💾 ${nomRuta(w.trab)} guardada${w.trab.planResumen ? ' con ' + w.trab.planResumen.nombre : ''}`, 3500); }
}
function resumenSheet(trab) {
  const r = trab.resumen; if (!r) return;
  const m = v => v == null ? '–' : fmt(v, 0) + ' m', pc = v => v == null ? '–' : fmt(v * 100, 1) + ' %';
  sheet(`<h3>${esc(nomRuta(trab))} · ${new Date(trab.inicio).toLocaleDateString('es-ES')} ${trab.estado === 'abierto' ? '(abierta)' : ''}</h3>
    <div class="card"><h3>Superficie</h3>
      <div class="kv"><span>Objetivo (finca − exclusiones)</span><span>${fmtArea(r.objetivo)}</span></div>
      <div class="kv"><span>Limpia real</span><span style="color:var(--pri)">${fmtArea(r.limpia)}</span></div>
      <div class="kv"><span>Pendiente (desviación de área)</span><span>${fmtArea(r.pendiente)} · ${pc(1 - r.cobertura)}</span></div>
      <div class="kv"><span>Cobertura</span><span>${pc(r.cobertura)}</span></div>
      <div class="kv"><span>Solape (≥ 2 pasadas)</span><span>${fmtArea(r.solape)} · ${pc(r.solapePct)}</span></div>
    </div>
    <div class="card"><h3>Trayectoria</h3>
      <div class="kv"><span>Ideal (plan)</span><span>${m(r.planL)}</span></div>
      <div class="kv"><span>Real</span><span>${m(r.L)}</span></div>
      <div class="kv"><span>Eficiencia η = ideal / real</span><span>${r.eta == null ? '–' : fmt(r.eta * 100, 1) + ' %'}</span></div>
      <div class="kv"><span>Desviación media / máx.</span><span>${r.devMed == null ? '–' : fmt(r.devMed, 2) + ' / ' + fmt(r.devMax, 1) + ' m'}</span></div>
      <div class="kv"><span>Recorrido desviado</span><span>${pc(r.devPct)}</span></div>
    </div>
    <div class="card"><h3>Tiempo y combustible</h3>
      <div class="kv"><span>Tiempo total</span><span>${fmtH(r.horas)}${r.planT ? ' (plan ' + fmtH(r.planT) + ')' : ''}</span></div>
      <div class="kv"><span>Con apero en trabajo</span><span>${fmtH(r.horasOn)}</span></div>
      <div class="kv"><span>Velocidad media de trabajo</span><span>${r.vMedia == null ? '–' : fmt(r.vMedia, 2) + ' km/h'}</span></div>
      <div class="kv"><span>Combustible (${fmt(r.consumo, 1)} L/h)</span><span>${fmt(r.litros, 1)} L${r.planLitros ? ' (plan ' + fmt(r.planLitros, 1) + ')' : ''}</span></div>
      <div class="kv"><span>Rendimiento</span><span>${r.haH == null ? '–' : fmt(r.haH, 2) + ' ha/h'} · ${r.LHa == null ? '–' : fmt(r.LHa, 1) + ' L/ha'}</span></div>
    </div>
    <div class="row"><button class="btn sec" id="rsPdf">📄 Parte en PDF</button>${cur && cur.tipo === 'monte' && cur.malla ? '<button class="btn sec" id="rsMal">🎯 Corregir malla</button>' : ''}</div>`, () => {
      $('rsPdf').onclick = () => pdfDoc(cur, trab);
      if ($('rsMal')) $('rsMal').onclick = () => corregirMallaSheet(cur, trab);
    });
}

/* ---- Repostajes y calibración del consumo ---- */
async function horasDesde(ts) {
  let h = 0;
  for (const t of await DB.tAll()) for (const s of t.sesiones) if (s.inicio >= ts) h += Math.max(0, (s.fin || s.inicio) - s.inicio) / 3.6e6;
  return h;
}
async function repostajeSheet() {
  const R = (await DB.kvGet('repostajes')) || { base: null, hist: [] };
  const h = R.base ? await horasDesde(R.base) : 0;
  sheet(`<h3>Repostaje</h3>
    ${R.base ? `<div class="note">Desde el último lleno (${new Date(R.base).toLocaleString('es-ES')}): <b>${fmtH(h)}</b> de motor registradas.</div>`
      : `<div class="note">Primer registro: llena el depósito y pulsa «Guardar» (sin litros). Desde ese momento se contarán las horas de trabajo.</div>`}
    <label class="f">Litros repostados hasta llenar</label><input class="inp" id="rL" inputmode="decimal" placeholder="${R.base ? 'p. ej. 18,5' : 'vacío en el primer lleno'}">
    <button class="btn" id="rOk" style="margin-top:12px">Guardar</button>
    ${R.hist.length ? '<div class="sgrp">Historial</div><div class="card">' + R.hist.slice(-8).reverse().map(x => `<div class="kv"><span>${new Date(x.fecha).toLocaleDateString('es-ES')} · ${fmt(x.litros, 1)} L · ${fmtH(x.horas)}</span><span>${fmt(x.lh, 2)} L/h</span></div>`).join('') + '</div>' : ''}`,
    () => {
      $('rOk').onclick = async () => {
        const l = parseFloat($('rL').value.replace(',', '.'));
        const now = Date.now();
        if (R.base && isFinite(l) && l > 0) {
          if (h < 0.25) return toast('Muy pocas horas registradas para calibrar (mín. 15 min)');
          R.hist.push({ fecha: now, litros: l, horas: h, lh: l / h });
          if (S.consumoAuto) {
            const last = R.hist.slice(-5), lh = +(last.reduce((s, x) => s + x.litros, 0) / last.reduce((s, x) => s + x.horas, 0)).toFixed(2);
            const ap = getAp(cur && cur.config && cur.config.aperoId); if (ap) { ap.consumo_lh = lh; await DB.cPut('aperos', ap); await loadCat(); }
            applyS();
          }
          toast(`Consumo medido: ${fmt(l / h, 2)} L/h` + (S.consumoAuto ? ` · aplicado al apero «${S.aperoNombre}»: ${fmt(S.consumo, 2)} L/h` : ''), 5000);
        } else toast('Depósito lleno registrado');
        R.base = now; await DB.kvPut('repostajes', R); closeSheet();
      };
    });
}

