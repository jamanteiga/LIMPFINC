'use strict';
/* ---------- Filtro de Kalman (velocidad constante, por eje) ---------- */
const KF_Q = 0.5;            // densidad espectral de aceleración (m²/s³)
const kfR = acc => Math.max(1, acc * acc * 0.5);
// en línea (tiempo real): devuelve posición filtrada, velocidad y desviación típica
function KF2(q = KF_Q) {
  let x = null, P = null, tl = 0, rej = 0;
  return {
    step(z, acc, t) {
      const r = kfR(acc);
      if (!x || rej >= 3) { x = [[z[0], 0], [z[1], 0]]; P = [[r, 0, 0, 4], [r, 0, 0, 4]]; tl = t; rej = 0; return { p: z.slice(), v: [0, 0], speed: 0, sigma: Math.sqrt(r) }; }
      const dt = Math.max(0.05, Math.min(10, t - tl));
      const xp = [], Pp = [];
      for (let k = 0; k < 2; k++) {
        const [p0, v0] = x[k], [a, b, c, d] = P[k];
        xp[k] = [p0 + v0 * dt, v0];
        Pp[k] = [a + dt * (b + c) + dt * dt * d + q * dt ** 3 / 3, b + dt * d + q * dt * dt / 2, c + dt * d + q * dt * dt / 2, d + q * dt];
      }
      const iy = [z[0] - xp[0][0], z[1] - xp[1][0]], S0 = Pp[0][0] + r, S1 = Pp[1][0] + r;
      if (iy[0] * iy[0] / S0 + iy[1] * iy[1] / S1 > 25) { rej++; return { reject: true }; }   // salto > 5σ
      rej = 0; tl = t;
      for (let k = 0; k < 2; k++) {
        const [a, b, c, d] = Pp[k], Sk = a + r, k0 = a / Sk, k1 = c / Sk;
        x[k] = [xp[k][0] + k0 * iy[k], xp[k][1] + k1 * iy[k]];
        P[k] = [(1 - k0) * a, (1 - k0) * b, c - k1 * a, d - k1 * b];
      }
      return { p: [x[0][0], x[1][0]], v: [x[0][1], x[1][1]], speed: Math.hypot(x[0][1], x[1][1]), sigma: Math.sqrt((P[0][0] + P[1][0]) / 2) };
    }
  };
}
// fuera de línea (linde): filtro hacia delante + suavizado hacia atrás (Rauch-Tung-Striebel)
function kfSmooth(xy, acc, t, q = KF_Q) {
  const n = xy.length; if (n < 3) return xy.slice();
  const out = xy.map(() => [0, 0]);
  for (let k = 0; k < 2; k++) {
    const xf = [], Pf = [], xp = [], Pp = [];
    for (let i = 0; i < n; i++) {
      const z = xy[i][k], r = kfR(acc[i]);
      let xpi, Ppi;
      if (i === 0) { xpi = [z, 0]; Ppi = [r, 0, 0, 4]; }
      else {
        const dt = Math.max(0.05, Math.min(10, t[i] - t[i - 1])), [p0, v0] = xf[i - 1], [a, b, c, d] = Pf[i - 1];
        xpi = [p0 + v0 * dt, v0];
        Ppi = [a + dt * (b + c) + dt * dt * d + q * dt ** 3 / 3, b + dt * d + q * dt * dt / 2, c + dt * d + q * dt * dt / 2, d + q * dt];
      }
      xp[i] = xpi; Pp[i] = Ppi;
      const [a, b, c, d] = Ppi, Sk = a + r, k0 = a / Sk, k1 = c / Sk, iy = z - xpi[0];
      xf[i] = [xpi[0] + k0 * iy, xpi[1] + k1 * iy]; Pf[i] = [(1 - k0) * a, (1 - k0) * b, c - k1 * a, d - k1 * b];
    }
    let xs = xf[n - 1];
    out[n - 1][k] = xs[0];
    for (let i = n - 2; i >= 0; i--) {
      const dt = Math.max(0.05, Math.min(10, t[i + 1] - t[i])), [a, b, c, d] = Pf[i], [e, f, g, h] = Pp[i + 1];
      // C = Pf·Fᵀ·inv(Pp), con F = [[1,dt],[0,1]]
      const m00 = a + b * dt, m01 = b, m10 = c + d * dt, m11 = d, det = e * h - f * g || 1e-12;
      const i00 = h / det, i01 = -f / det, i10 = -g / det, i11 = e / det;
      const C00 = m00 * i00 + m01 * i10, C01 = m00 * i01 + m01 * i11, C10 = m10 * i00 + m11 * i10, C11 = m10 * i01 + m11 * i11;
      const d0 = xs[0] - xp[i + 1][0], d1 = xs[1] - xp[i + 1][1];
      xs = [xf[i][0] + C00 * d0 + C01 * d1, xf[i][1] + C10 * d0 + C11 * d1];
      out[i][k] = xs[0];
    }
  }
  return out;
}

/* Proceso de un recorrido GPS a polígono */
function processTrack(pts, mode, S) {
  const corners = pts.filter(p => p.corner);
  const good = pts.filter(p => !p.corner && p.acc <= S.umbralPrecision);
  if (good.length < 5 && corners.length < 3) return { error: 'Muy pocos puntos válidos (' + good.length + ' puntos, ' + corners.length + ' esquinas). Revisa la precisión GPS.' };
  const all = [...good, ...corners];
  const P = Geo.projFor(all.map(p => [p.lat, p.lon]));
  let xy;
  if (good.length < 5) {
    // solo esquinas: el polígono son las esquinas en el orden en que se tomaron
    xy = corners.map(c => P.fwd(c.lat, c.lon));
  } else {
    xy = kfSmooth(good.map(p => P.fwd(p.lat, p.lon)), good.map(p => p.acc), good.map(p => p.t / 1000));
    // tolerancia según el tamaño: 1 m en fincas grandes, hasta 0,3 m en jardines y fincas pequeñas
    const A0 = Math.abs(Geo.area(xy)), eps = Math.min(1, Math.max(0.3, Math.sqrt(A0) / 60));
    xy = Geo.decimate(xy, eps);
    while (xy.length > 4 && Geo.dist(xy[xy.length - 1], xy[0]) < eps) xy.pop();  // cola que solapa el inicio
    xy = Geo.dpClosed(xy, eps);
    xy = Geo.mergeClose(xy, 2 * eps);
    // las esquinas promediadas sustituyen al vértice cercano o se insertan en el lado más próximo
    corners.forEach(c => {
      const q = P.fwd(c.lat, c.lon);
      let bi = -1, bd = Infinity; xy.forEach((v, i) => { const d = Geo.dist(v, q); if (d < bd) { bd = d; bi = i; } });
      if (bd < Math.min(10, Math.max(2, Math.sqrt(A0) / 4))) { xy[bi] = q; return; }
      let be = 0, bde = Infinity;
      for (let i = 0; i < xy.length; i++) {
        const a = xy[i], b = xy[(i + 1) % xy.length], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-12;
        let u = ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / L2; u = Math.max(0, Math.min(1, u));
        const d = Math.hypot(q[0] - a[0] - u * dx, q[1] - a[1] - u * dy); if (d < bde) { bde = d; be = i; }
      }
      xy.splice(be + 1, 0, q);
    });
    // entre esquinas los lados se simplifican más (solo se conservan quiebros reales > 2 m)
    if (corners.length >= 2) {
      const cq = corners.map(c => P.fwd(c.lat, c.lon));
      const isC = v => cq.some(q => q[0] === v[0] && q[1] === v[1]);
      const ci = xy.map((v, i) => isC(v) ? i : -1).filter(i => i >= 0);
      if (ci.length >= 2) {
        const out = [];
        for (let k = 0; k < ci.length; k++) {
          const a = ci[k], b = ci[(k + 1) % ci.length];
          const seg = []; for (let i = a; ; i = (i + 1) % xy.length) { seg.push(xy[i]); if (i === b) break; }
          const simp = Geo.dp(seg, 2.0); simp.pop(); out.push(...simp);
        }
        xy = out;
      }
    }
  }
  if (xy.length < 3) return { error: 'El recorrido no forma un polígono.' };
  xy = Geo.ccw(xy);
  let off = 0;
  if (mode === 'tractor') {
    off = S.anchoTractor / 2 + S.holguraLinde;
    xy = Geo.offsetOut(xy, off);
  } else if (mode === 'tractorIn') {   // exclusión rodeada con el tractor por fuera: se desplaza hacia dentro
    off = -(S.anchoTractor / 2 + S.holguraLinde);
    let ok = false;
    if (window.ClipperLib) { const C = ClipperLib, K = 1000, co = new C.ClipperOffset(2, 20), o = new C.Paths(); co.AddPath(xy.map(p => ({ X: Math.round(p[0] * K), Y: Math.round(p[1] * K) })), C.JoinType.jtRound, C.EndType.etClosedPolygon); co.Execute(o, off * K);
      const big = o.filter(pa => Math.abs(C.Clipper.Area(pa)) / K / K > 0.3).sort((a, b) => Math.abs(C.Clipper.Area(b)) - Math.abs(C.Clipper.Area(a)))[0];
      if (big) { xy = Geo.ccw(big.map(q => [q.X / K, q.Y / K])); ok = true; } }
    if (!ok) { const cx = xy.reduce((a, p) => a + p[0], 0) / xy.length, cy = xy.reduce((a, p) => a + p[1], 0) / xy.length; xy = []; for (let k = 0; k < 16; k++) xy.push([cx + 0.6 * Math.cos(k / 16 * 2 * Math.PI), cy + 0.6 * Math.sin(k / 16 * 2 * Math.PI)]); }
  }
  const seq = good.length >= 5 ? good : corners;
  const gap = Geo.dist(P.fwd(seq[0].lat, seq[0].lon), P.fwd(seq[seq.length - 1].lat, seq[seq.length - 1].lon));
  return {
    coords: Geo.toLL(xy, P), offset: off, gap: good.length >= 5 ? gap : 0,
    selfX: Geo.selfIntersects(xy),
    used: good.length, total: pts.length - corners.length, nCorners: corners.length,
    accMed: all.reduce((s, p) => s + p.acc, 0) / all.length,
    accCorners: corners.length ? corners.reduce((s, p) => s + p.acc, 0) / corners.length : null
  };
}

/* ---------- Utilidades UI ---------- */
const $ = id => document.getElementById(id);
const fmt = (v, d = 0) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtArea = m2 => (m2 >= 10000 ? fmt(m2 / 10000, 3) + ' ha' : fmt(m2, 0) + ' m²') + (S.verFerrados && S.ferrado > 0 && m2 > 0 ? ' · ' + fmt(m2 / S.ferrado, m2 / S.ferrado < 100 ? 1 : 0) + ' ferr.' : '');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function toast(msg, ms = 2500) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), ms); }
function sheet(html, onReady) {
  const host = $('sheetHost');
  host.innerHTML = `<div class="sheetBg"></div><div class="sheet"><div class="grab"></div><button class="shX" aria-label="Cerrar">✕</button>${html}</div>`;
  host.querySelector('.sheetBg').onclick = closeSheet; host.querySelector('.shX').onclick = closeSheet;
  onReady && onReady(host.querySelector('.sheet'));
}
function closeSheet() { $('sheetHost').innerHTML = ''; }
function confirmSheet(msg, okTxt, cb, danger) {
  sheet(`<h3>${msg}</h3><div class="row" style="margin-top:12px"><button class="btn sec" id="cNo">Cancelar</button><button class="btn ${danger ? 'err' : ''}" id="cOk">${okTxt}</button></div>`,
    () => { $('cNo').onclick = closeSheet; $('cOk').onclick = () => { closeSheet(); cb(); }; });
}
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- Estado ---------- */
let SB = { ...DEF }, S = { ...DEF };   // SB: ajustes generales guardados · S: efectivos (con tractor, apero y velocidad de la finca)
let cur = null;           // finca abierta
let view = 'list';

