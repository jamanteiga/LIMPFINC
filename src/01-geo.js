'use strict';
/* ---------- Geometría (plano local métrico, WGS84) ---------- */
const D2R = Math.PI / 180;
const Geo = {
  proj(lat0, lon0) {
    const a = 6378137, e2 = 6.69437999014e-3, s = Math.sin(lat0 * D2R), w = 1 - e2 * s * s;
    const N = a / Math.sqrt(w), M = a * (1 - e2) / (w * Math.sqrt(w));
    const kx = N * Math.cos(lat0 * D2R) * D2R, ky = M * D2R;
    return { fwd: (lat, lon) => [(lon - lon0) * kx, (lat - lat0) * ky], inv: (x, y) => [lat0 + y / ky, lon0 + x / kx] };
  },
  projFor(ll) { // ll: [[lat,lon],...]
    let la = 0, lo = 0; ll.forEach(p => { la += p[0]; lo += p[1]; });
    return Geo.proj(la / ll.length, lo / ll.length);
  },
  toXY(ll, P) { return ll.map(p => P.fwd(p[0], p[1])); },
  toLL(xy, P) { return xy.map(p => P.inv(p[0], p[1])); },
  dist: (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]),
  signedArea(xy) { let s = 0; for (let i = 0, n = xy.length; i < n; i++) { const a = xy[i], b = xy[(i + 1) % n]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; },
  area: xy => Math.abs(Geo.signedArea(xy)),
  perim(xy, closed = true) { let s = 0; for (let i = 0; i < xy.length - (closed ? 0 : 1); i++) s += Geo.dist(xy[i], xy[(i + 1) % xy.length]); return s; },
  lenLL(ll) { if (ll.length < 2) return 0; const P = Geo.projFor(ll); return Geo.perim(Geo.toXY(ll, P), false); },
  areaLL(ll) { if (ll.length < 3) return 0; const P = Geo.projFor(ll); return Geo.area(Geo.toXY(ll, P)); },
  perimLL(ll) { if (ll.length < 2) return 0; const P = Geo.projFor(ll); return Geo.perim(Geo.toXY(ll, P), true); },
  decimate(xy, dmin) { if (!xy.length) return []; const o = [xy[0]]; for (const p of xy) if (Geo.dist(o[o.length - 1], p) >= dmin) o.push(p); return o; },
  smooth(xy, k) { // media móvil abierta, ventana 2k+1
    const n = xy.length; if (n < 2 * k + 1) return xy.slice();
    return xy.map((_, i) => { let sx = 0, sy = 0, c = 0; for (let j = Math.max(0, i - k); j <= Math.min(n - 1, i + k); j++) { sx += xy[j][0]; sy += xy[j][1]; c++; } return [sx / c, sy / c]; });
  },
  dp(xy, eps) { // Douglas-Peucker
    if (xy.length < 3) return xy.slice();
    const keep = new Uint8Array(xy.length); keep[0] = keep[xy.length - 1] = 1;
    const st = [[0, xy.length - 1]];
    while (st.length) {
      const [i, j] = st.pop(); let dm = 0, im = -1; const a = xy[i], b = xy[j];
      const L = Geo.dist(a, b) || 1e-9;
      for (let k = i + 1; k < j; k++) { const p = xy[k]; const d = Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / L; if (d > dm) { dm = d; im = k; } }
      if (dm > eps && im > 0) { keep[im] = 1; st.push([i, im], [im, j]); }
    }
    return xy.filter((_, i) => keep[i]);
  },
  dpClosed(xy, eps) { // anillo cerrado: se parte por el punto más alejado del primero
    if (xy.length < 4) return xy.slice();
    let k = 1, dm = 0; xy.forEach((p, i) => { const d = Geo.dist(xy[0], p); if (d > dm) { dm = d; k = i; } });
    const a = Geo.dp(xy.slice(0, k + 1), eps), b = Geo.dp([...xy.slice(k), xy[0]], eps);
    return [...a.slice(0, -1), ...b.slice(0, -1)];
  },
  mergeClose(xy, dmin) { // fusiona vértices a menos de dmin
    const o = [];
    for (const p of xy) { const q = o[o.length - 1]; if (q && Geo.dist(p, q) < dmin) { q[0] = (q[0] + p[0]) / 2; q[1] = (q[1] + p[1]) / 2; } else o.push(p.slice()); }
    while (o.length > 3 && Geo.dist(o[0], o[o.length - 1]) < dmin) o.pop();
    return o;
  },
  ccw(xy) { return Geo.signedArea(xy) < 0 ? xy.slice().reverse() : xy; },
  offsetOut(xy, d) { // desplaza polígono CCW hacia fuera d metros (inglete limitado)
    const n = xy.length, o = [];
    for (let i = 0; i < n; i++) {
      const p0 = xy[(i - 1 + n) % n], p1 = xy[i], p2 = xy[(i + 1) % n];
      const n1 = Geo.nrm([p1[1] - p0[1], -(p1[0] - p0[0])]), n2 = Geo.nrm([p2[1] - p1[1], -(p2[0] - p1[0])]);
      let m = Geo.nrm([n1[0] + n2[0], n1[1] + n2[1]]); const c = m[0] * n1[0] + m[1] * n1[1];
      const f = d / Math.max(c, 0.5);
      o.push([p1[0] + m[0] * f, p1[1] + m[1] * f]);
    }
    return o;
  },
  nrm(v) { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; },
  segX(a, b, c, d) {
    const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
    return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
  },
  selfIntersects(xy) {
    const n = xy.length;
    for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (Geo.segX(xy[i], xy[(i + 1) % n], xy[j], xy[(j + 1) % n])) return true;
    }
    return false;
  },
  inPoly(p, xy) {
    let c = false;
    for (let i = 0, j = xy.length - 1; i < xy.length; j = i++) {
      const a = xy[i], b = xy[j];
      if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }
};

