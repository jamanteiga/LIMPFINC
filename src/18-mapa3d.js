'use strict';
/* =========================================================
   MAPA 3D DEL TERRENO — puntos con altura cada 2 s durante el trabajo
   ========================================================= */
async function puntos3D(f) {
  const out = [];
  for (const t of await DB.tByFinca(f.id)) (t.sesiones || []).forEach(ses => (ses.p3d || []).forEach(q => out.push(q)));
  return out.sort((a, b) => a[5] - b[5]);
}
// modelo digital del terreno por celdas: media ponderada (1/σ²) con rechazo de valores atípicos, relleno de huecos y suavizado
function construirMDT(f, pts, opt = {}) {
  const off = +((f.cota && f.cota.offset) || 0), umbral = opt.umbralV || 15;
  const base = f.linde ? f.linde.coords : pts.map(q => [q[0], q[1]]);
  const P = Geo.projFor(base), lin = f.linde ? Geo.toXY(f.linde.coords, P) : null;
  const v = pts.filter(q => q[4] == null || q[4] <= umbral).map(q => { const xy = P.fwd(q[0], q[1]); return { x: xy[0], y: xy[1], z: q[2] + off, w: 1 / Math.max(1, q[4] || 5) ** 2 }; });
  if (v.length < 10) return { error: `Hay ${v.length} puntos 3D válidos: necesitas al menos 10. Se registran solos cada 2 s al trabajar con el tractor.` };
  const xs = (lin || v.map(q => [q.x, q.y])).map(q => q[0] ?? q.x), ys = (lin || v.map(q => [q.x, q.y])).map(q => q[1] ?? q.y);
  let x0 = Math.min(...xs, ...v.map(q => q.x)), x1 = Math.max(...xs, ...v.map(q => q.x)), y0 = Math.min(...ys, ...v.map(q => q.y)), y1 = Math.max(...ys, ...v.map(q => q.y));
  // celda: unas 5 lecturas por celda de media (promediar reduce el ruido vertical del GPS), entre 1 y 10 m
  const area = Math.max(1, (x1 - x0) * (y1 - y0)), areaPts = lin ? Math.abs(Geo.area(lin)) : area, c = opt.celda || Math.min(10, Math.max(1, Math.round(Math.sqrt(areaPts * 5 / v.length) * 2) / 2));
  const nx = Math.max(2, Math.ceil((x1 - x0) / c) + 1), ny = Math.max(2, Math.ceil((y1 - y0) / c) + 1);
  if (nx * ny > 250000) return { error: 'Zona demasiado grande para el modelo.' };
  const cells = new Array(nx * ny);
  v.forEach(q => { const i = Math.round((q.x - x0) / c), j = Math.round((q.y - y0) / c), k = j * nx + i; (cells[k] || (cells[k] = [])).push(q); });
  const z = new Float64Array(nx * ny).fill(NaN), nP = new Uint16Array(nx * ny);
  let sres = 0, nres = 0;
  for (let k = 0; k < cells.length; k++) {
    let L_ = cells[k]; if (!L_) continue;
    if (L_.length >= 4) { const zs = L_.map(q => q.z).sort((a, b) => a - b), med = zs[zs.length >> 1], mad = zs.map(x => Math.abs(x - med)).sort((a, b) => a - b)[zs.length >> 1] || 0.5; L_ = L_.filter(q => Math.abs(q.z - med) <= 3 * 1.4826 * mad + 0.5); }
    let sw = 0, sz = 0; L_.forEach(q => { sw += q.w; sz += q.w * q.z; }); z[k] = sz / sw; nP[k] = L_.length;
    if (L_.length > 1) L_.forEach(q => { sres += (q.z - z[k]) ** 2; nres++; });
  }
  const dentro = k => { if (!lin) return true; const i = k % nx, j = (k / nx) | 0; return Geo.inPoly([x0 + i * c, y0 + j * c], lin); };
  // relleno de huecos (IDW, radio 4 celdas) solo dentro del linde
  const fill = new Uint8Array(nx * ny), z2 = Float64Array.from(z);
  for (let k = 0; k < z.length; k++) {
    if (!isNaN(z[k]) || !dentro(k)) continue;
    const i = k % nx, j = (k / nx) | 0; let sw = 0, sz = 0;
    for (let dj = -4; dj <= 4; dj++) for (let di = -4; di <= 4; di++) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue; const zz = z[jj * nx + ii]; if (isNaN(zz)) continue; const w = 1 / (di * di + dj * dj); sw += w; sz += w * zz; }
    if (sw > 0) { z2[k] = sz / sw; fill[k] = 1; }
  }
  // suavizado 3×3 (1-2-1)
  const z3 = Float64Array.from(z2);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i; if (isNaN(z2[k])) continue; let sw = 0, sz = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue; const zz = z2[jj * nx + ii]; if (isNaN(zz)) continue; const w = (di ? 1 : 2) * (dj ? 1 : 2); sw += w; sz += w * zz; }
    z3[k] = sz / sw;
  }
  let zmin = Infinity, zmax = -Infinity, nV = 0; for (let k = 0; k < z3.length; k++) if (!isNaN(z3[k])) { zmin = Math.min(zmin, z3[k]); zmax = Math.max(zmax, z3[k]); nV++; }
  const rango = zmax - zmin, eq = opt.eq || (rango < 2 ? 0.25 : rango < 5 ? 0.5 : rango < 15 ? 1 : rango < 40 ? 2 : 5);
  const M = { P, x0, y0, c, nx, ny, z: z3, fill, nP, zmin, zmax, eq, n: pts.length, nUsados: v.length, celdasMedidas: nV - fill.reduce((a, b) => a + b, 0), celdas: nV, sigma: nres ? Math.sqrt(sres / nres) : null, off };
  M.curvas = curvasNivel(M);
  return M;
}
// curvas de nivel por «marching squares» sobre los centros de celda, unidas en polilíneas
function curvasNivel(M) {
  const { nx, ny, z, c, x0, y0, eq } = M, out = [];
  const lv0 = Math.ceil(M.zmin / eq) * eq;
  for (let lv = lv0; lv <= M.zmax + 1e-9; lv += eq) {
    const segs = [];
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = z[j * nx + i], b = z[j * nx + i + 1], d = z[(j + 1) * nx + i], e = z[(j + 1) * nx + i + 1];
      if (isNaN(a) || isNaN(b) || isNaN(d) || isNaN(e)) continue;
      const P_ = [[i, j, a], [i + 1, j, b], [i + 1, j + 1, e], [i, j + 1, d]], cr = [];
      for (let k = 0; k < 4; k++) { const p = P_[k], q = P_[(k + 1) % 4]; if ((p[2] < lv) !== (q[2] < lv)) { const t = (lv - p[2]) / (q[2] - p[2]); cr.push([x0 + (p[0] + t * (q[0] - p[0])) * c, y0 + (p[1] + t * (q[1] - p[1])) * c]); } }
      if (cr.length === 2) segs.push(cr); else if (cr.length === 4) { segs.push([cr[0], cr[1]]); segs.push([cr[2], cr[3]]); }
    }
    // unir segmentos por extremos
    const key = p => p[0].toFixed(3) + ',' + p[1].toFixed(3), ends = new Map();
    segs.forEach((sg, i) => { for (const p of sg) { const k = key(p); (ends.get(k) || ends.set(k, []).get(k)).push(i); } });
    const used = new Uint8Array(segs.length);
    for (let s0 = 0; s0 < segs.length; s0++) {
      if (used[s0]) continue; used[s0] = 1; const line = [segs[s0][0], segs[s0][1]];
      for (const dir of [1, 0]) {
        for (;;) {
          const tip = dir ? line[line.length - 1] : line[0], cand = (ends.get(key(tip)) || []).find(i => !used[i]); if (cand == null) break;
          used[cand] = 1; const sg = segs[cand], nxt = key(sg[0]) === key(tip) ? sg[1] : sg[0];
          if (dir) line.push(nxt); else line.unshift(nxt);
        }
      }
      if (line.length >= 3) out.push({ z: +lv.toFixed(2), xy: line, maestra: Math.abs(lv / (eq * 5) - Math.round(lv / (eq * 5))) < 1e-6 });
    }
  }
  return out;
}
const hipso = t => { // 0..1 → color (verde-amarillo-marrón-blanco)
  const st = [[0, [30, 110, 80]], [0.25, [100, 160, 70]], [0.5, [215, 200, 95]], [0.75, [190, 120, 60]], [1, [130, 70, 50]]];
  t = Math.max(0, Math.min(1, t)); let k = 0; while (k < st.length - 2 && t > st[k + 1][0]) k++;
  const [t0, a] = st[k], [t1, b] = st[k + 1], u = (t - t0) / (t1 - t0); return a.map((x, i) => Math.round(x + u * (b[i] - x)));
};
function dibujarMDT(M, layer) {
  layer.clearLayers();
  const ren = L.canvas({ padding: .3 }), { P, x0, y0, c, nx, ny, z } = M, r = M.zmax - M.zmin || 1;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i; if (isNaN(z[k])) continue;
    const [R, G, B] = hipso((z[k] - M.zmin) / r), a = P.inv(x0 + (i - .5) * c, y0 + (j - .5) * c), b = P.inv(x0 + (i + .5) * c, y0 + (j + .5) * c);
    L.rectangle([a, b], { renderer: ren, stroke: false, fillColor: `rgb(${R},${G},${B})`, fillOpacity: M.fill[k] ? .45 : .7, interactive: false }).addTo(layer);
  }
  M.curvas.forEach(cv => L.polyline(cv.xy.map(q => P.inv(q[0], q[1])), { renderer: ren, color: '#4e342e', weight: cv.maestra ? 2 : 1, opacity: .9, interactive: false }).addTo(layer));
}
let m3dVista = null;
async function mapa3DSheet(f) {
  const pts = await puntos3D(f);
  const M = construirMDT(f, pts);
  const tieneVista = view !== 'list' && cur === f;
  if (M.error) return sheet(`<h3>🏔 Mapa 3D del terreno</h3><div class="note">${esc(M.error)}</div>
    <div class="card" style="font-size:14px">Al trabajar (botón <b>Trabajo</b>) la app guarda, aparte de la trayectoria, un punto con su altura cada 2 segundos. Con varias pasadas por la finca el modelo se va afinando.</div>`);
  const dz = M.zmax - M.zmin; M.pend = pendientesMDT(M);
  let pmax = 0, nF = 0, nT = 0; M.pend.forEach(v => { if (!isNaN(v)) { nT++; pmax = Math.max(pmax, v); if (v > (+S.pendMax || 25)) nF++; } }); const pFuerte = nT ? nF / nT * 100 : 0;
  sheet(`<h3>🏔 Mapa 3D · ${esc(f.nombre)}</h3>
    <div class="card">
      <div class="kv"><span>Puntos 3D registrados</span><span>${M.n} (${M.nUsados} válidos)</span></div>
      <div class="kv"><span>Cota mínima · máxima</span><span>${fmt(M.zmin, 1)} · ${fmt(M.zmax, 1)} m</span></div>
      <div class="kv"><span>Desnivel</span><span>${fmt(dz, 1)} m</span></div>
      <div class="kv"><span>Malla del modelo</span><span>${fmt(M.c, 1)} m · ${M.celdasMedidas} celdas medidas${M.celdas > M.celdasMedidas ? ' + ' + (M.celdas - M.celdasMedidas) + ' interpoladas' : ''}</span></div>
      <div class="kv"><span>Dispersión vertical en celda</span><span>${M.sigma != null ? '±' + fmt(M.sigma, 1) + ' m' : '—'}</span></div>
      <div class="kv"><span>Curvas de nivel</span><span>cada ${fmt(M.eq, 2)} m</span></div>
      <div class="kv"><span>Corrección de cota</span><span>${M.off ? (M.off > 0 ? '+' : '') + fmt(M.off, 2) + ' m' : 'ninguna'}</span></div>
    </div>
    ${tieneVista ? `<button class="opt" id="m3Map">${m3dVista ? '🙈 Quitar del mapa' : '🗺 Ver sobre el mapa (colores y curvas de nivel)'}</button>` : ''}
    ${tieneVista ? `<button class="opt" id="m3Pen">⛰ Zonas con pendiente &gt; ${fmt(+S.pendMax || 25, 0)} %<small>Máxima ${fmt(pmax, 0)} % · ${fmt(pFuerte, 1)} % de la finca por encima. Al trabajar avisa por voz al entrar.</small></button>` : ''}
    <button class="opt" id="m3V">🧊 Ver en 3D<small>Gira con un dedo, acerca con dos.</small></button>
    <button class="opt" id="m3Cot">📏 Ajustar cotas con un punto conocido<small>La altura del GPS del iPhone tiene error de varios metros; con una cota conocida se corrige todo.</small></button>
    <div class="sgrp">Exportar mapa 3D</div>
    <button class="opt" id="m3Kml">🌍 KML / KMZ-compatible<small>TopoGPS, QGIS, Marble, OsmAnd. Curvas de nivel y puntos con altura.</small></button>
    <button class="opt" id="m3Gpx">🛰 GPX<small>TopoGPS, OsmAnd, Garmin… Puntos de cota y curvas de nivel con elevación.</small></button>
    <button class="opt" id="m3Geo">🧩 GeoJSON 3D<small>QGIS, web. Puntos y líneas con Z.</small></button>
    <button class="opt" id="m3Dxf">📐 DXF 3D (AutoCAD)<small>UTM ETRS89: puntos GPS, superficie TIN (3DFACE) y curvas de nivel en 3D.</small></button>
    <button class="opt" id="m3Xyz">🧮 XYZ (UTM)<small>Modelo en malla regular. QGIS, Global Mapper, Civil 3D.</small></button>
    <button class="opt" id="m3Csv">📄 CSV de puntos GPS 3D<small>Fecha, lat, lon, altura, precisiones y UTM. Excel.</small></button>`,
    () => {
      if ($('m3Map')) $('m3Map').onclick = () => { closeSheet(); if (m3dVista) { lyr.m3d.clearLayers(); m3dVista = null; } else { dibujarMDT(M, lyr.m3d); m3dVista = f.id; toast(`Mapa 3D: ${fmt(M.zmin, 1)}–${fmt(M.zmax, 1)} m · curvas cada ${fmt(M.eq, 2)} m`, 4000); } };
      $('m3V').onclick = () => { closeSheet(); visor3D(f, M, pts); };
      if ($('m3Pen')) $('m3Pen').onclick = () => { closeSheet(); dibujarPendiente(M, lyr.m3d, +S.pendMax || 25); m3dVista = f.id; toast(`⛰ Rojo: pendiente > ${fmt(+S.pendMax || 25, 0)} % · naranja: cerca del límite`, 4000); };
      $('m3Cot').onclick = () => cotaSheet(f, M);
      const nb = safeName(f.nombre) + '_mapa3D';
      $('m3Kml').onclick = () => download(nb + '.kml', kml3D(f, M, pts), 'application/vnd.google-earth.kml+xml');
      $('m3Gpx').onclick = () => download(nb + '.gpx', gpx3D(f, M), 'application/gpx+xml');
      $('m3Geo').onclick = () => download(nb + '.geojson', geo3D(f, M, pts), 'application/geo+json');
      $('m3Dxf').onclick = () => download(nb + '.dxf', dxf3D(f, M, pts), 'application/dxf');
      $('m3Xyz').onclick = () => download(nb + '.xyz', xyz3D(f, M), 'text/plain');
      $('m3Csv').onclick = () => download(nb + '_puntos.csv', csv3D(f, pts), 'text/csv');
    });
}
function cotaSheet(f, M) {
  sheet(`<h3>📏 Ajustar cotas</h3>
    <div class="note">Colócate en un punto de cota conocida (vértice geodésico, clavo de nivelación, o la cota que da el visor del IGN para ese punto) y escribe su altura. La app promedia el GPS 15 s y calcula la corrección.</div>
    <div class="srow"><span>Cota conocida (m)</span><input class="inp" id="ctK" inputmode="decimal" style="width:110px;text-align:right"></div>
    <button class="btn" id="ctGo" style="margin-top:8px">📍 Medir aquí (15 s)</button>
    <div class="srow" style="margin-top:14px"><span>…o corrección manual (m)</span><input class="inp" id="ctM" inputmode="decimal" value="${String(M.off || 0).replace('.', ',')}" style="width:110px;text-align:right"></div>
    <button class="btn sec" id="ctOk" style="margin-top:8px">Guardar corrección manual</button>`,
    () => {
      const guardar = async v => { f.cota = { offset: +v.toFixed(2), fecha: Date.now() }; if (cur === f) await saveCur(); else await DB.put(f); closeSheet(); toast(`Corrección de cota: ${v >= 0 ? '+' : ''}${fmt(v, 2)} m`); m3dVista = null; lyr.m3d && lyr.m3d.clearLayers(); };
      $('ctOk').onclick = () => { const v = parseFloat($('ctM').value.replace(',', '.')); if (!isFinite(v)) return toast('Valor no válido'); guardar(v); };
      $('ctGo').onclick = () => {
        const k = parseFloat($('ctK').value.replace(',', '.')); if (!isFinite(k)) return toast('Escribe la cota conocida');
        startGPS(); const A = []; let n = 15; $('ctGo').disabled = true;
        const tm = setInterval(() => {
          if (lastPos && gpsAge() < 3 && lastPos.alt != null) A.push(lastPos.alt);
          $('ctGo').textContent = `Midiendo… ${--n} s · ${A.length} lecturas`;
          if (n <= 0) { clearInterval(tm); if (A.length < 5) { $('ctGo').disabled = false; $('ctGo').textContent = '📍 Medir aquí (15 s)'; return toast('El GPS no da altura ahora mismo'); } A.sort((a, b) => a - b); guardar(k - A[A.length >> 1]); }
        }, 1000);
      };
    });
}
/* ---- visor 3D (three.js, MIT) ---- */
function cargarThree() {
  if (window.THREE) return Promise.resolve();
  return new Promise((ok, ko) => { const sc = document.createElement('script'); sc.src = 'lib/three.min.js'; sc.onload = ok; sc.onerror = () => ko(new Error('sin conexión')); document.head.appendChild(sc); });
}
async function visor3D(f, M, pts) {
  try { await cargarThree(); } catch (e) { return toast('No se pudo cargar el visor 3D: ' + e.message, 4000); }
  const T = window.THREE, wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;inset:0;z-index:1450;background:#dfe7ee;display:flex;flex-direction:column';
  wrap.innerHTML = `<div style="padding:calc(var(--safe-t) + 8px) 12px 8px;display:flex;align-items:center;gap:8px;background:#fff;border-bottom:1px solid var(--line)">
    <button class="lnk" id="v3X" style="margin:0;font-size:17px">‹ Cerrar</button><b style="flex:1;text-align:center">${esc(f.nombre)} · 3D</b><span style="width:60px"></span></div>
    <div id="v3C" style="flex:1;position:relative;touch-action:none"></div>
    <div style="padding:8px 12px calc(var(--safe-b) + 8px);background:#fff;border-top:1px solid var(--line)">
      <div class="seg" id="v3E">${[1, 2, 5, 10].map(v => `<button data-v="${v}">×${v}</button>`).join('')}</div>
      <div class="note" style="margin-top:6px">Exageración vertical · ${fmt(M.zmin, 1)}–${fmt(M.zmax, 1)} m · <label><input type="checkbox" id="v3P" style="width:auto"> puntos GPS</label></div></div>`;
  document.body.appendChild(wrap);
  const host = $('v3C'), W = () => host.clientWidth, H = () => host.clientHeight;
  const rnd = new T.WebGLRenderer({ antialias: true }); rnd.setPixelRatio(Math.min(2, devicePixelRatio)); rnd.setSize(W(), H()); host.appendChild(rnd.domElement);
  const scn = new T.Scene(); scn.background = new T.Color(0xdfe7ee);
  const cam = new T.PerspectiveCamera(45, W() / H(), 0.5, 20000);
  scn.add(new T.HemisphereLight(0xffffff, 0x445544, 0.55)); const sun = new T.DirectionalLight(0xffffff, 0.55); sun.position.set(-1, 2, 1.5); scn.add(sun);
  const { nx, ny, c, z } = M, cx = (nx - 1) * c / 2, cy = (ny - 1) * c / 2, zm = (M.zmin + M.zmax) / 2;
  const ext = Math.max(nx, ny) * c, dz = (M.zmax - M.zmin) || 1;
  let ex = [10, 5, 2, 1].find(v => v * dz <= ext * 0.18) || 1, malla = null, nube = null;
  $('v3E').querySelectorAll('button').forEach(x => x.classList.toggle('on', +x.dataset.v === ex));
  const construir = () => {
    if (malla) { scn.remove(malla); malla.geometry.dispose(); }
    const pos = new Float32Array(nx * ny * 3), col = new Float32Array(nx * ny * 3), idx = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i, zz = isNaN(z[k]) ? M.zmin : z[k]; pos.set([i * c - cx, (zz - zm) * ex, -(j * c - cy)], k * 3); const [R, G, B] = hipso((zz - M.zmin) / (M.zmax - M.zmin || 1)); col.set([R / 255, G / 255, B / 255], k * 3); }
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, d = a + nx, e = d + 1; if (!isNaN(z[a]) && !isNaN(b < z.length ? z[b] : NaN) && !isNaN(z[d])) idx.push(a, d, b); if (!isNaN(z[b]) && !isNaN(z[d]) && !isNaN(z[e])) idx.push(b, d, e); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    malla = new T.Mesh(g, new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide })); scn.add(malla);
    if (nube) { scn.remove(nube); nube.geometry.dispose(); nube = null; }
    if ($('v3P') && $('v3P').checked) {
      const pp = new Float32Array(pts.length * 3); pts.forEach((q, k) => { const xy = M.P.fwd(q[0], q[1]); pp.set([xy[0] - M.x0 - cx, (q[2] + M.off - zm) * ex, -(xy[1] - M.y0 - cy)], k * 3); });
      const g2 = new T.BufferGeometry(); g2.setAttribute('position', new T.BufferAttribute(pp, 3)); nube = new T.Points(g2, new T.PointsMaterial({ color: 0x1565c0, size: 3, sizeAttenuation: false })); scn.add(nube);
    }
  };
  construir();
  const fovH = 2 * Math.atan(Math.tan(22.5 * D2R) * Math.min(1, W() / H()));
  let th = 0.6, ph = 0.95, R = ext * 0.5 / Math.tan(fovH / 2);
  const pinta = () => { cam.position.set(R * Math.sin(ph) * Math.sin(th), R * Math.cos(ph), R * Math.sin(ph) * Math.cos(th)); cam.lookAt(0, 0, 0); rnd.render(scn, cam); };
  pinta();
  const ptrs = new Map(); let d0 = 0;
  host.addEventListener('pointerdown', e => { host.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; d0 = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
  host.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId)) return; const p0 = ptrs.get(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 1) { th -= (e.clientX - p0[0]) * 0.008; ph = Math.max(0.08, Math.min(1.5, ph - (e.clientY - p0[1]) * 0.006)); }
    else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (d0) R = Math.max(5, Math.min(20000, R * d0 / d)); d0 = d; }
    pinta();
  });
  const fin = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) d0 = 0; };
  host.addEventListener('pointerup', fin); host.addEventListener('pointercancel', fin);
  host.addEventListener('wheel', e => { e.preventDefault(); R = Math.max(5, Math.min(20000, R * (e.deltaY > 0 ? 1.1 : 0.9))); pinta(); }, { passive: false });
  $('v3E').querySelectorAll('button').forEach(b => b.onclick = () => { ex = +b.dataset.v; $('v3E').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); construir(); pinta(); });
  $('v3P').onchange = () => { construir(); pinta(); };
  const rs = () => { cam.aspect = W() / H(); cam.updateProjectionMatrix(); rnd.setSize(W(), H()); pinta(); }; addEventListener('resize', rs);
  $('v3X').onclick = () => { removeEventListener('resize', rs); rnd.dispose(); wrap.remove(); };
}
/* ---- exportaciones del mapa 3D ---- */
const llM = (M, xy) => M.P.inv(xy[0], xy[1]);
function celdasMDT(M) { const o = []; for (let j = 0; j < M.ny; j++) for (let i = 0; i < M.nx; i++) { const k = j * M.nx + i; if (!isNaN(M.z[k])) o.push({ i, j, z: M.z[k], fill: M.fill[k], ll: llM(M, [M.x0 + i * M.c, M.y0 + j * M.c]) }); } return o; }
function kml3D(f, M, pts) {
  const sty = `<Style id="cv"><LineStyle><color>ff2a3a4e</color><width>1.5</width></LineStyle></Style><Style id="cvm"><LineStyle><color>ff1a2a3e</color><width>3</width></LineStyle></Style>
    <Style id="pt"><IconStyle><scale>0.4</scale></IconStyle><LabelStyle><scale>0.6</scale></LabelStyle></Style>
    <Style id="gps"><IconStyle><color>ffc06515</color><scale>0.3</scale></IconStyle><LabelStyle><scale>0</scale></LabelStyle></Style>
    <Style id="linde"><LineStyle><color>ff205e1b</color><width>3</width></LineStyle><PolyStyle><fill>0</fill></PolyStyle></Style>`;
  const cv = M.curvas.map(c => `<Placemark><name>${fmt(c.z, 2)} m</name><styleUrl>#${c.maestra ? 'cvm' : 'cv'}</styleUrl><LineString><altitudeMode>absolute</altitudeMode><coordinates>${c.xy.map(q => { const l = llM(M, q); return `${l[1].toFixed(7)},${l[0].toFixed(7)},${c.z.toFixed(2)}`; }).join(' ')}</coordinates></LineString></Placemark>`).join('');
  const paso = Math.max(1, Math.round(Math.sqrt(celdasMDT(M).length / 1500)));
  const md = celdasMDT(M).filter(q => q.i % paso === 0 && q.j % paso === 0).map(q => `<Placemark><name>${fmt(q.z, 1)}</name><styleUrl>#pt</styleUrl><Point><altitudeMode>absolute</altitudeMode><coordinates>${q.ll[1].toFixed(7)},${q.ll[0].toFixed(7)},${q.z.toFixed(2)}</coordinates></Point></Placemark>`).join('');
  const pg = pts.slice(0, 4000).map(q => `<Placemark><styleUrl>#gps</styleUrl><TimeStamp><when>${new Date(q[5]).toISOString()}</when></TimeStamp><Point><altitudeMode>absolute</altitudeMode><coordinates>${q[1]},${q[0]},${(q[2] + M.off).toFixed(2)}</coordinates></Point></Placemark>`).join('');
  const li = f.linde ? `<Placemark><name>Linde</name><styleUrl>#linde</styleUrl><LineString><tessellate>1</tessellate><coordinates>${[...f.linde.coords, f.linde.coords[0]].map(p => `${p[1]},${p[0]},0`).join(' ')}</coordinates></LineString></Placemark>` : '';
  return `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${esc(f.nombre)} · mapa 3D</name>
<description>Modelo del terreno LIMPFINC. Cotas ${fmt(M.zmin, 1)}–${fmt(M.zmax, 1)} m, curvas cada ${M.eq} m, malla ${M.c} m. ${M.off ? 'Corrección de cota ' + M.off + ' m.' : 'Alturas del GPS del iPhone sin corregir.'}</description>${sty}
<Folder><name>Linde</name>${li}</Folder><Folder><name>Curvas de nivel (${M.eq} m)</name>${cv}</Folder><Folder><name>Puntos de cota del modelo</name>${md}</Folder><Folder><name>Puntos GPS 3D (cada 2 s)</name><visibility>0</visibility>${pg}</Folder></Document></kml>`;
}
function gpx3D(f, M) {
  const paso = Math.max(1, Math.round(Math.sqrt(celdasMDT(M).length / 1500)));
  const wpt = celdasMDT(M).filter(q => q.i % paso === 0 && q.j % paso === 0).map(q => `<wpt lat="${q.ll[0].toFixed(7)}" lon="${q.ll[1].toFixed(7)}"><ele>${q.z.toFixed(2)}</ele><name>${fmt(q.z, 1)}</name></wpt>`).join('\n');
  const trk = M.curvas.map(c => `<trk><name>Curva ${fmt(c.z, 2)} m</name><trkseg>${c.xy.map(q => { const l = llM(M, q); return `<trkpt lat="${l[0].toFixed(7)}" lon="${l[1].toFixed(7)}"><ele>${c.z.toFixed(2)}</ele></trkpt>`; }).join('')}</trkseg></trk>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="LIMPFINC" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>${esc(f.nombre)} · mapa 3D</name></metadata>\n${wpt}\n${trk}\n</gpx>`;
}
function geo3D(f, M, pts) {
  const F = [];
  M.curvas.forEach(c => F.push({ type: 'Feature', properties: { tipo: 'curva_nivel', cota: c.z, maestra: c.maestra }, geometry: { type: 'LineString', coordinates: c.xy.map(q => { const l = llM(M, q); return [+l[1].toFixed(7), +l[0].toFixed(7), c.z]; }) } }));
  celdasMDT(M).forEach(q => F.push({ type: 'Feature', properties: { tipo: 'mdt', cota: +q.z.toFixed(2), interpolado: !!q.fill }, geometry: { type: 'Point', coordinates: [+q.ll[1].toFixed(7), +q.ll[0].toFixed(7), +q.z.toFixed(2)] } }));
  pts.forEach(q => F.push({ type: 'Feature', properties: { tipo: 'gps3d', fecha: new Date(q[5]).toISOString(), prec_h: q[3], prec_v: q[4] }, geometry: { type: 'Point', coordinates: [q[1], q[0], +(q[2] + M.off).toFixed(2)] } }));
  return JSON.stringify({ type: 'FeatureCollection', name: f.nombre + ' mapa 3D', features: F });
}
function xyz3D(f, M) {
  const zone = Math.floor((celdasMDT(M)[0].ll[1] + 180) / 6) + 1;
  return `# ${f.nombre} - MDT LIMPFINC - ETRS89 UTM ${zone}N - malla ${M.c} m\n` + celdasMDT(M).map(q => { const u = utm(q.ll[0], q.ll[1], zone); return `${u[0].toFixed(3)} ${u[1].toFixed(3)} ${q.z.toFixed(3)}`; }).join('\n');
}
function csv3D(f, pts) {
  const off = +((f.cota && f.cota.offset) || 0), zone = pts.length ? Math.floor((pts[0][1] + 180) / 6) + 1 : 29;
  return `fecha_hora;lat;lon;altura_m;prec_horizontal_m;prec_vertical_m;utm_x;utm_y;huso\n` + pts.map(q => { const u = utm(q[0], q[1], zone); return `${new Date(q[5]).toISOString()};${q[0]};${q[1]};${String((q[2] + off).toFixed(2)).replace('.', ',')};${String(q[3]).replace('.', ',')};${q[4] == null ? '' : String(q[4]).replace('.', ',')};${u[0].toFixed(3).replace('.', ',')};${u[1].toFixed(3).replace('.', ',')};${zone}`; }).join('\n');
}
function dxf3D(f, M, pts) {
  const zone = Math.floor((celdasMDT(M)[0].ll[1] + 180) / 6) + 1, U = ll => utm(ll[0], ll[1], zone), F = v => v.toFixed(3);
  const o = ['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '6', '0', 'ENDSEC', '0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LAYER', '70', '5'];
  [['PUNTOS_GPS_3D', 5], ['MDT_TIN', 3], ['CURVAS_NIVEL', 32], ['CURVAS_MAESTRAS', 30], ['LINDE', 3]].forEach(([n, c]) => o.push('0', 'LAYER', '2', n, '70', '0', '62', String(c), '6', 'CONTINUOUS'));
  o.push('0', 'ENDTAB', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES');
  pts.forEach(q => { const u = U(q); o.push('0', 'POINT', '8', 'PUNTOS_GPS_3D', '10', F(u[0]), '20', F(u[1]), '30', F(q[2] + M.off)); });
  const V = (i, j) => { const k = j * M.nx + i; if (isNaN(M.z[k])) return null; const u = U(llM(M, [M.x0 + i * M.c, M.y0 + j * M.c])); return [u[0], u[1], M.z[k]]; };
  const face = (a, b, c_) => o.push('0', '3DFACE', '8', 'MDT_TIN', '10', F(a[0]), '20', F(a[1]), '30', F(a[2]), '11', F(b[0]), '21', F(b[1]), '31', F(b[2]), '12', F(c_[0]), '22', F(c_[1]), '32', F(c_[2]), '13', F(c_[0]), '23', F(c_[1]), '33', F(c_[2]));
  for (let j = 0; j < M.ny - 1; j++) for (let i = 0; i < M.nx - 1; i++) { const a = V(i, j), b = V(i + 1, j), d = V(i, j + 1), e = V(i + 1, j + 1); if (a && b && d) face(a, b, d); if (b && e && d) face(b, e, d); }
  M.curvas.forEach(cv => { const ly = cv.maestra ? 'CURVAS_MAESTRAS' : 'CURVAS_NIVEL'; o.push('0', 'POLYLINE', '8', ly, '66', '1', '70', '8', '10', '0', '20', '0', '30', '0'); cv.xy.forEach(q => { const u = U(llM(M, q)); o.push('0', 'VERTEX', '8', ly, '10', F(u[0]), '20', F(u[1]), '30', F(cv.z), '70', '32'); }); o.push('0', 'SEQEND', '8', ly); });
  if (f.linde) { o.push('0', 'POLYLINE', '8', 'LINDE', '66', '1', '70', '1'); f.linde.coords.forEach(p => { const u = U(p); o.push('0', 'VERTEX', '8', 'LINDE', '10', F(u[0]), '20', F(u[1]), '30', '0'); }); o.push('0', 'SEQEND', '8', 'LINDE'); }
  o.push('0', 'ENDSEC', '0', 'EOF');
  return o.join('\r\n');
}

