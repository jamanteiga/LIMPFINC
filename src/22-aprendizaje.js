'use strict';
/* =========================================================
   v2.3 — El plan aprende de las rutas reales: velocidad en zona normal, giros, traslados y zonas lentas
   ========================================================= */
const APR = { cel: 2, maxRutas: 8, lento: 0.7 };
const aprRef = f => { let la = 0, lo = 0; f.linde.coords.forEach(p => { la += p[0]; lo += p[1]; }); return [la / f.linde.coords.length, lo / f.linde.coords.length]; };
// tiempo que el plan asigna a cada tramo (con los parámetros sin aprender)
function tPlanParte(p, S2) {
  const L = Geo.lenLL(p.ll), vw = S2.velocidad / 3.6, vg = (S2.velocidadGiro || 3) / 3.6, vt = (S2.velocidadTraslado || 5) / 3.6;
  if (p.type === 'trabajo') return L / vw;
  if (p.type === 'giro') return L / vg;
  if (p.type === 'reversa') return L / vg + 2 * (S2.tCambioSentido || 4);
  return L / vt + (S2.tManiobra || 20);
}
// reproduce una ruta sobre su plan: tiempo real en cada tramo y velocidad real por celdas de 2 m
function reproducirRuta(f, t, plan) {
  const g = Grid(f), S2 = effS(f, t.cfg || f.config), tr = Tracker(g, plan, S2, t.inicio), parts = plan.parts;
  const P = Geo.proj(...aprRef(f)), per = parts.map(() => ({ real: 0, a: Infinity, b: -Infinity, n: 0 })), cells = new Map();
  const sigTrab = parts.map((_, k) => { for (let j = k + 1; j < parts.length; j++) if (parts[j].type === 'trabajo') return j; return -1; });
  const man = { giro: [0, 0, 0], tras: [0, 0, 0] };
  t.sesiones.forEach(ses => {
    tr.reset(); let prev = null, ult = null;   // ult: última lectura en una pasada {k, t}
    ses.pts.forEach(pt => {
      const r = tr.add(pt); if (!r.valid || !r.cut || !r.dev) { prev = null; return; }
      const tt = pt[3] / 1000;
      if (prev && r.dev.d < 4) {
        const dt = Math.min(10, tt - prev.t), k = r.dev.part;
        if (dt > 0 && k >= 0) {
          const q = per[k]; q.real += dt; q.n++; q.a = Math.min(q.a, r.dev.into); q.b = Math.max(q.b, r.dev.into);
          if (parts[k].type === 'trabajo' && pt[4] && prev.part === k) {
            const ll = r.cutLL, xy = P.fwd(ll[0], ll[1]), key = Math.floor(xy[0] / APR.cel) + ',' + Math.floor(xy[1] / APR.cel);
            const c = cells.get(key) || [0, 0, 0]; c[0] += Geo.dist(prev.cut, r.cut); c[1] += dt; c[2]++; cells.set(key, c);
          }
        }
      }
      const alin = tr.h && r.dev.dir ? Math.abs(tr.h[0] * r.dev.dir[0] + tr.h[1] * r.dev.dir[1]) : 0;
      if (r.dev.d < 1.5 && alin > 0.97 && parts[r.dev.part] && parts[r.dev.part].type === 'trabajo') {
        const k = r.dev.part;
        if (ult && k !== ult.k && sigTrab[ult.k] === k && tt - ult.t < 600) {
          let tp = 0, tras = false; for (let j = ult.k + 1; j < k; j++) { tp += tPlanParte(parts[j], S2); if (parts[j].type === 'tras') tras = true; }
          if (tp > 0) { const g = tras ? man.tras : man.giro; g[0] += tt - ult.t; g[1] += tp; g[2]++; }
        }
        if (!ult || k === ult.k || sigTrab[ult.k] === k || k > ult.k) ult = { k, t: tt };
      }
      prev = { t: tt, cut: r.cut, part: r.dev ? r.dev.part : -1 };
    });
  });
  // tramos hechos (recorridos en ≥ 70 % de su longitud)
  return { giro: man.giro, tras: man.tras, cells };
}
async function aprenderFinca(f, silencio) {
  if (!f || !f.linde) return null;
  const pcF = new Map((await DB.pByFinca(f.id)).map(r => [r.id, r])), pc = planesCache;
  const trs = (await DB.tByFinca(f.id)).filter(t => t.sesiones && t.sesiones.some(s => s.pts.length > 5)).slice(0, APR.maxRutas);
  const tot = { giro: [0, 0, 0], tras: [0, 0, 0] }, cells = new Map(), usadas = [];
  planesCache = pcF;
  try {
    for (const t of trs) {
      const pr = t.planId && pcF.get(t.planId), plan = pr ? pr.plan : null; if (!plan) continue;
      const mk = ((t.cfg || {}).tractorId) + '|' + ((t.cfg || {}).aperoId); if (tot.maq && mk !== tot.maq) continue; tot.maq = mk;   // solo rutas con la misma máquina
      const r = reproducirRuta(f, t, plan); usadas.push(t.id);
      ['giro', 'tras'].forEach(k => { for (let i = 0; i < 3; i++) tot[k][i] += r[k][i]; });
      r.cells.forEach((c, key) => { const a = cells.get(key) || [0, 0, 0]; a[0] += c[0]; a[1] += c[1]; a[2] += c[2]; cells.set(key, a); });
    }
  } finally { planesCache = pc; }
  if (!usadas.length) { if (!silencio) toast('Aún no hay rutas hechas con un plan guardado en esta finca'); return null; }
  // velocidad en zona normal y zonas lentas
  const vc = [...cells.entries()].filter(([, c]) => c[2] >= 3 && c[1] >= 2).map(([key, c]) => ({ key, v: c[0] / c[1], c }));
  let vNormal = null, lentas = [], aLentas = 0;
  if (vc.length >= 10) {
    const vs = vc.map(x => x.v).sort((a, b) => a - b), med = vs[Math.floor(vs.length / 2)];
    const norm = vc.filter(x => x.v >= APR.lento * med), sd = norm.reduce((s, x) => s + x.c[0], 0), st = norm.reduce((s, x) => s + x.c[1], 0);
    vNormal = st > 0 ? sd / st * 3.6 : null;
    lentas = vc.filter(x => x.v < APR.lento * med).map(x => { const [i, j] = x.key.split(',').map(Number); return [i, j, +Math.max(0.15, x.v / (vNormal / 3.6)).toFixed(2)]; });
    aLentas = lentas.length * APR.cel * APR.cel;
  }
  const fac = (g, nMin, sMin) => g[2] >= nMin && g[1] >= sMin ? Math.max(0.4, Math.min(3, g[0] / g[1])) : null;
  const S2 = effS(f), old = f.aprende || {};
  const tU = trs.find(t => t.id === usadas[0]), cU = (tU && tU.cfg) || f.config || {};
  const a = { v: 1, fecha: Date.now(), rutas: usadas, maquina: cU.tractorId + '|' + cU.aperoId, nRutas: usadas.length, ref: aprRef(f), geomKey: geomKey(f),
    vConfig: S2.velocidad, vNormal: vNormal && vNormal > 0.5 && vNormal < 20 ? +vNormal.toFixed(2) : null,
    fGiro: fac(tot.giro, 3, 30), nGiros: tot.giro[2], tGiroReal: tot.giro[2] ? tot.giro[0] / tot.giro[2] : null, tGiroPlan: tot.giro[2] ? tot.giro[1] / tot.giro[2] : null,
    fTras: fac(tot.tras, 2, 20), nTras: tot.tras[2],
    lentas: { cel: APR.cel, cells: lentas, area: aLentas }, usar: old.usar !== false };
  f.aprende = a; await DB.put(f); if (cur && cur.id === f.id) cur.aprende = a;
  // aprendizaje general por tractor + apero (giros y traslados) para fincas sin rutas
  const key = a.maquina; SB.aprendeG = SB.aprendeG || {};
  if (a.fGiro || a.fTras) { const G = SB.aprendeG[key] || {}; SB.aprendeG[key] = { fGiro: a.fGiro || G.fGiro || null, fTras: a.fTras || G.fTras || null, fecha: Date.now(), finca: f.nombre }; await DB.kvPut('settings', SB); }
  return a;
}
// parámetros del plan con lo aprendido
function aprendS(f, S_) {
  if (f && f.aprende && f.aprende.usar === false) return null;
  const key = (S_.tractorId || (f.config || {}).tractorId) + '|' + (S_.aperoId || (f.config || {}).aperoId);
  const a = f && f.aprende && (!f.aprende.maquina || f.aprende.maquina === key) ? f.aprende : null;   // solo con la misma máquina
  const G = SB.aprendeG ? SB.aprendeG[key] : null;
  const fG = (a && a.fGiro) || (G && G.fGiro) || null, fT = (a && a.fTras) || (G && G.fTras) || null;
  if (!a && !fG && !fT) return null;
  if (a && a.usar === false) return null;
  const S1 = { ...S_ };
  if (a && a.vNormal) S1.velocidad = a.vNormal;
  if (fG) { S1.velocidadGiro = (S_.velocidadGiro || 3) / fG; S1.tCambioSentido = (S_.tCambioSentido || 4) * fG; }
  if (fT) { S1.velocidadTraslado = (S_.velocidadTraslado || 5) / fT; S1.tManiobra = (S_.tManiobra || 20) * fT; }
  return { S1, a, fG, fT, general: !a || (!a.fGiro && !!G) };
}
// tiempo extra por las zonas lentas que cruzan las pasadas
function ajustarLentas(f, pl, A) {
  const a = A.a; if (!a || !a.lentas || !a.lentas.cells.length || a.geomKey !== geomKey(f)) return 0;
  const P = Geo.proj(...a.ref), m = new Map(a.lentas.cells.map(c => [c[0] + ',' + c[1], c[2]])), v = A.S1.velocidad / 3.6;
  let extra = 0;
  pl.parts.forEach(p => { if (p.type !== 'trabajo') return; const xy = Geo.toXY(p.ll, P);
    for (let i = 1; i < xy.length; i++) { const L = Geo.dist(xy[i - 1], xy[i]), n = Math.max(1, Math.ceil(L)); for (let k = 0; k < n; k++) { const x = xy[i - 1][0] + (xy[i][0] - xy[i - 1][0]) * (k + .5) / n, y = xy[i - 1][1] + (xy[i][1] - xy[i - 1][1]) * (k + .5) / n, r = m.get(Math.floor(x / a.lentas.cel) + ',' + Math.floor(y / a.lentas.cel)); if (r) extra += (L / n) / v * (1 / r - 1); } } });
  return extra;
}
// después del planificador: máquina usada y, si hay, lo aprendido (zonas lentas, velocidad real…)
function aprPost(f, S_, A, pl) {
  if (!pl || pl.error) return pl;
  const maq = { tractor: S_.tractor, tipo: S_.tipoTractor, apero: S_.aperoNombre, ancho: S_.aperoAncho, tractorId: S_.tractorId, aperoId: S_.aperoId };
  if (pl.params) pl.params.maq = maq;
  if (!A) return pl;
  const extra = ajustarLentas(f, pl, A), st = pl.stats;
  if (extra > 0) { st.t.trabajo += extra; st.t.total += extra; st.litros = st.t.total / 3600 * A.S1.consumo; st.haH = st.area.objetivo / 1e4 / (st.t.total / 3600); }
  pl.params.v = A.S1.velocidad;
  pl.aprendido = { nRutas: A.a ? A.a.nRutas : 0, vNormal: A.a ? A.a.vNormal : null, vConfig: S_.velocidad, fGiro: A.fG, fTras: A.fT, extraLentas: extra, general: A.general, fecha: A.a ? A.a.fecha : null };
  return pl;
}
const planBase = Planner.plan;
Planner.plan = (f, S_, opt) => { const A = aprendS(f, S_); return aprPost(f, S_, A, planBase(f, A ? A.S1 : S_, opt)); };
// cálculo en segundo plano (Web Worker): la pantalla no se congela en fincas grandes; si falla, se calcula aquí
let planW = null, planWid = 0;
function planAsync(f, S_, opt, onProg) {
  const A = aprendS(f, S_), S1 = A ? A.S1 : S_;
  return new Promise(ok => {
    let hecho = false; const fin = pl => { if (hecho) return; hecho = true; ok(pl); };
    const local = () => setTimeout(() => { try { fin(Planner.plan(f, S_, opt)); } catch (e) { fin({ error: 'Error en el cálculo: ' + e.message }); } }, 30);
    let w; try { w = planW || (planW = new Worker('trabajador-plan.js?v=' + VERSION)); } catch (e) { return local(); }
    const id = ++planWid;
    const h = e => {
      if (!e.data || e.data.id !== id) return;
      if (e.data.prog != null) { if (onProg) onProg(e.data.prog); return; }
      w.removeEventListener('message', h);
      fin(e.data.err ? { error: 'Error en el cálculo: ' + e.data.err } : aprPost(f, S_, A, e.data.pl));
    };
    w.addEventListener('message', h);
    w.onerror = ev => { ev.preventDefault && ev.preventDefault(); registrarError('trabajador del plan: ' + (ev.message || 'error'), ''); planW = null; local(); };
    let fc; try { fc = structuredClone(f); } catch (e) { fc = JSON.parse(JSON.stringify(f)); }
    try { w.postMessage({ id, f: fc, S: { ...S1 }, opt: { ...opt } }); } catch (e) { w.removeEventListener('message', h); local(); }
  });
}
function busyPlan(txt) {
  const ov = document.createElement('div'); ov.className = 'busyOv';
  ov.innerHTML = `<div>${txt || 'Calculando plan…'}<br><small>Optimizando dirección y orden de pasadas</small><div style="height:8px;background:#e0e0e0;border-radius:4px;margin-top:10px;overflow:hidden"><div class="bpB" style="height:100%;width:3%;background:#2e7d32;transition:width .2s"></div></div></div>`;
  document.body.appendChild(ov);
  return { prog: p => { const b = ov.querySelector('.bpB'); if (b) b.style.width = Math.max(3, Math.round(p * 100)) + '%'; }, close: () => ov.remove() };
}
const aprTxt = ap => ap ? `🧠 Con lo aprendido${ap.nRutas ? ' de ' + ap.nRutas + ' ruta' + (ap.nRutas > 1 ? 's' : '') : ' (general del tractor y apero)'}: ${ap.vNormal ? fmt(ap.vNormal, 1) + ' km/h reales' : 'velocidad configurada'}${ap.fGiro ? ' · giros ×' + fmt(ap.fGiro, 2) : ''}${ap.fTras ? ' · traslados ×' + fmt(ap.fTras, 2) : ''}${ap.extraLentas > 30 ? ' · zonas lentas +' + fmt(ap.extraLentas / 60, 0) + ' min' : ''}` : '';
async function aprendizajeSheet(f) {
  f = f || cur; let a = f.aprende;
  if (!a || a.geomKey !== geomKey(f)) { showBusy('Aprendiendo de las rutas…'); try { a = await aprenderFinca(f, true); } finally { hideBusy(); } }
  if (!a) return sheet(`<h3>🧠 Lo aprendido · ${esc(f.nombre)}</h3><div class="note">Aún no hay rutas hechas con un plan guardado en esta finca. Al terminar cada ruta, LIMPFINC mide tu velocidad real, lo que tardas en cada giro y en los traslados, y las zonas donde vas más lento; los planes siguientes usan esos datos.</div>`);
  const S2 = effS(f), pc = v => (v > 1 ? '+' : '') + fmt((v - 1) * 100, 0) + ' %';
  sheet(`<h3>🧠 Lo aprendido · ${esc(f.nombre)}</h3>
    <div class="note">De ${a.nRutas} ruta${a.nRutas > 1 ? 's' : ''} · actualizado ${fFecha(a.fecha)}</div>
    <div class="card">
      <div class="kv"><span>Velocidad de trabajo configurada</span><span>${fmt(S2.velocidad, 1)} km/h</span></div>
      <div class="kv"><span><b>Velocidad real (zona normal)</b></span><span><b>${a.vNormal ? fmt(a.vNormal, 1) + ' km/h' : 'faltan datos'}</b></span></div>
      <div class="kv"><span>Giro medio: plan → real</span><span>${a.tGiroReal ? fmt(a.tGiroPlan, 0) + ' s → <b>' + fmt(a.tGiroReal, 0) + ' s</b>' : '–'}${a.fGiro ? ' (' + pc(a.fGiro) + ')' : a.nGiros ? ' · pocos giros' : ''}</span></div>
      <div class="kv"><span>Traslados</span><span>${a.fTras ? pc(a.fTras) + ' sobre el plan' : a.nTras ? 'pocos datos' : '–'}</span></div>
      <div class="kv"><span>Zonas lentas (&lt; ${fmt(APR.lento * 100, 0)} % de tu velocidad)</span><span>${fmtArea(a.lentas.area)}</span></div>
    </div>
    <div class="srow"><span>Usar lo aprendido al calcular planes</span><input type="checkbox" id="apU" ${a.usar !== false ? 'checked' : ''} style="width:auto"></div>
    <div class="note">Se usa la velocidad real de la zona normal y, en las zonas lentas, el tiempo extra que de verdad tardas. Giros y traslados se escalan con lo medido. Se actualiza al terminar cada ruta (últimas ${APR.maxRutas}).</div>
    <button class="btn" id="apPl" style="margin-top:8px">🧭 Calcular plan nuevo con lo aprendido</button>
    <div class="row" style="margin-top:8px"><button class="btn sec" id="apZ">${CFG.lentas ? '🙈 Ocultar' : '🟧 Ver'} zonas lentas</button><button class="btn sec" id="apR">🔄 Volver a aprender</button></div>
    <button class="lnk" id="apO" style="color:var(--err);margin-top:10px">Olvidar lo aprendido en esta finca</button>`,
    () => {
      $('apU').onchange = async () => { a.usar = $('apU').checked; f.aprende = a; await DB.put(f); toast(a.usar ? '🧠 Los planes usarán lo aprendido' : 'Los planes usarán la velocidad configurada'); };
      $('apPl').onclick = () => { closeSheet(); if (cur.tipo === 'monte' && !(cur.malla && cur.malla.arboles && cur.malla.arboles.length)) return toast('Marca primero los árboles'); applyS(); const o = cur.planOpt || { dirMode: 'auto', nHMode: 'auto' }, pl0 = cur.plan; runPlan(o, pl0 && pl0.inicio || null, pl0 && pl0.fin || null); };
      $('apZ').onclick = () => { CFG.lentas = !CFG.lentas; saveCfg(); closeSheet(); drawFinca(); if (CFG.lentas) toast('🟧 Zonas lentas: cuanto más oscuro, más lento', 3500); };
      $('apR').onclick = async () => { closeSheet(); showBusy('Aprendiendo de las rutas…'); try { await aprenderFinca(f); } finally { hideBusy(); } aprendizajeSheet(f); };
      $('apO').onclick = () => confirmSheet('¿Olvidar lo aprendido en esta finca? Los planes volverán a la velocidad configurada.', 'Olvidar', async () => { delete f.aprende; await DB.put(f); if (cur && cur.id === f.id) delete cur.aprende; drawFinca(); toast('Olvidado'); }, true);
    });
}
function drawLentas(f, layer) {
  const a = f.aprende; if (!CFG.lentas || !a || !a.lentas || !a.lentas.cells.length || a.geomKey !== geomKey(f)) return;
  const P = Geo.proj(...a.ref), c = a.lentas.cel;
  a.lentas.cells.forEach(([i, j, r]) => { const p0 = P.inv(i * c, j * c), p1 = P.inv((i + 1) * c, (j + 1) * c);
    L.rectangle([p0, p1], { stroke: false, fillColor: r < 0.4 ? '#bf360c' : r < 0.55 ? '#ef6c00' : '#ffa726', fillOpacity: .6, interactive: false }).addTo(layer); });
}
async function aprenderTrasRuta(f, trab) {
  try {
    const a0 = f.aprende, a = await aprenderFinca(f, true); if (!a) return;
    const partes = [];
    if (a.vNormal) partes.push(`velocidad real ${fmt(a.vNormal, 1)} km/h`);
    if (a.tGiroReal) partes.push(`giro medio ${fmt(a.tGiroReal, 0)} s`);
    if (a.lentas.area > 20) partes.push(`${fmtArea(a.lentas.area)} lentas`);
    if (partes.length) setTimeout(() => toast(`🧠 Aprendido de ${nomRuta(trab)}: ${partes.join(' · ')}. ${a0 ? '' : 'Los próximos planes lo usarán.'}`, 6000), 4000);
  } catch (e) { console.warn('aprender', e); }
}

