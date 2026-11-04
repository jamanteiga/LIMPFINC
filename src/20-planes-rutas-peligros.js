'use strict';
/* =========================================================
   v2.0 — PLANES NUMERADOS, RUTAS DE TRABAJO NUMERADAS, ANÁLISIS Y PELIGROS
   ========================================================= */
let planesCache = new Map();
async function cargarPlanes(f) { planesCache = new Map((await DB.pByFinca(f.id)).map(r => [r.id, r])); return planesCache; }
async function guardarPlanAlt(f, pl, cfg, opt) {   // se guarda sin activarlo ni cambiar la máquina de la finca
  const recs = await DB.pByFinca(f.id), num = recs.reduce((m, r) => Math.max(m, r.num || 0), 0) + 1;
  const rec = { id: uid(), fincaId: f.id, num, nombre: 'Plan ' + num, fecha: Date.now(), origen: 'alternativo', nota: '', plan: pl, cfg: { ...cfg }, opt: opt || null };
  pl.id = rec.id; pl.num = num; await DB.pPut(rec); if (cur === f) planesCache.set(rec.id, rec); return rec;
}
async function guardarPlan(f, pl, origen, cfg) {
  const recs = await DB.pByFinca(f.id), num = recs.reduce((m, r) => Math.max(m, r.num || 0), 0) + 1;
  const rec = { id: uid(), fincaId: f.id, num, nombre: 'Plan ' + num, fecha: Date.now(), origen: origen || 'calculado', nota: '', plan: pl, cfg: { ...(cfg || f.config || {}) } };
  pl.id = rec.id; pl.num = num; f.plan = pl; f.planId = rec.id;
  await DB.pPut(rec); if (cur === f) planesCache.set(rec.id, rec);
  return rec;
}
async function asegurarPlanGuardado(f) {   // planes de versiones anteriores: pasan a ser «Plan 1»
  if (!f.plan) return null;
  if (f.planId && (planesCache.has(f.planId) || (await DB.pByFinca(f.id)).some(r => r.id === f.planId))) return f.planId;
  const rec = await guardarPlan(f, f.plan, 'anterior'); await DB.put(f); return rec.id;
}
async function numerarRutas(f) {
  const trs = (await DB.tByFinca(f.id)).sort((a, b) => a.inicio - b.inicio); let max = trs.reduce((m, t) => Math.max(m, t.num || 0), 0);
  for (const t of trs) if (!t.num) { t.num = ++max; await DB.tPut(t); }
  return trs.reverse();
}
const maqTxt = pa => pa && pa.maq ? `${(TIPOS_TR.find(x => x[0] === pa.maq.tipo) || TIPOS_TR[0])[1]} ${pa.maq.tractor || ''} + ${pa.maq.apero || ''} · ${fmt(pa.maq.ancho, 2)} m` : '';
const nomRuta = t => t.nombre || ('Ruta ' + (t.num || '?'));
const nomPlan = r => r.nombre || ('Plan ' + r.num);
const fFecha = ts => new Date(ts).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });

/* ---- Planes ---- */
async function planesSheet() {
  await asegurarPlanGuardado(cur); await cargarPlanes(cur);
  const recs = [...planesCache.values()].sort((a, b) => b.num - a.num), trs = await numerarRutas(cur);
  if (!recs.length) return sheet(`<h3>🧭 Planes · ${esc(cur.nombre)}</h3><div class="note">Aún no hay planes. Calcula uno en <b>Plan</b>.</div>`);
  sheet(`<h3>🧭 Planes · ${esc(cur.nombre)}</h3>
    <div class="note">Cada plan calculado o recalculado se guarda con su número. Las rutas de trabajo guardan el plan con el que se hicieron.</div>
    ${recs.map(r => { const st = r.plan.stats, us = trs.filter(t => t.planId === r.id).map(nomRuta); return `<button class="opt" data-id="${r.id}">${r.id === cur.planId ? '✅ ' : ''}<b>${esc(nomPlan(r))}</b>${r.plan.aprendido ? ' 🧠' : ''} · ${fFecha(r.fecha)}
      <small>${r.plan.params.maq ? esc(maqTxt(r.plan.params)) + '<br>' : ''}${r.origen === 'alternativo' ? 'alternativo · ' : ''}${fmtH(st.t.total / 3600)} · ${fmt(st.litros, 1)} L · ${st.nPasadas} pasadas · rumbo ${r.plan.az}° · ${fmt(r.plan.params.v, 1)} km/h${us.length ? ' · usado en ' + us.join(', ') : ''}${r.nota ? '<br>' + esc(r.nota) : ''}</small></button>`; }).join('')}
    ${recs.length > 1 ? '<button class="btn sec" id="plCmp" style="margin-top:6px">📊 Comparar planes</button>' : ''}`,
    sh => {
      sh.querySelectorAll('[data-id]').forEach(b => b.onclick = () => planOptsSheet(planesCache.get(b.dataset.id)));
      if ($('plCmp')) $('plCmp').onclick = async () => { $('plCmp').textContent = 'Calculando…'; try { await trasladoFinca(cur); } catch (e) { } compararPlanes(recs); };
    });
}
function planOptsSheet(r) {
  sheet(`<h3>${esc(nomPlan(r))}</h3><div class="note">${fFecha(r.fecha)} · ${r.origen}</div>
    ${r.plan.params && r.plan.params.maq ? `<div class="card">${esc(maqTxt(r.plan.params))}</div>` : ''}
    ${r.id !== cur.planId ? '<button class="opt" id="poUse">✅ Usar este plan (verlo en el mapa y trabajar con él; la finca pasa a usar su máquina)</button>' : '<div class="card" style="background:#e8f5e9">✅ Es el plan activo de la finca</div>'}
    <button class="opt" id="poDet">📋 Detalle</button>
    <button class="opt" id="poEd">✎ Nombre y nota</button>
    <button class="opt" id="poCp">⧉ Copiar (nuevo número)</button>
    <button class="opt" id="poRe">🔄 Modificar: recalcular con otros parámetros</button>
    <button class="opt" id="poDel" style="color:var(--err)">🗑 Eliminar</button>`,
    () => {
      if ($('poUse')) $('poUse').onclick = async () => { cur.plan = r.plan; cur.planId = r.id; if (r.cfg && r.cfg.tractorId) { cur.config = { ...r.cfg }; if (r.opt) cur.planOpt = r.opt; applyS(); } await saveCur(); CFG.plan = true; closeSheet(); drawFinca(true); toast(nomPlan(r) + ' activo'); };
      $('poDet').onclick = () => planDetail(r.plan);
      $('poEd').onclick = () => sheet(`<h3>✎ ${esc(nomPlan(r))}</h3><label class="f">Nombre</label><input class="inp" id="peN" value="${esc(nomPlan(r))}"><label class="f">Nota</label><input class="inp" id="peT" value="${esc(r.nota || '')}"><button class="btn" id="peOk" style="margin-top:10px">Guardar</button>`,
        () => { $('peOk').onclick = async () => { r.nombre = $('peN').value.trim() || ('Plan ' + r.num); r.nota = $('peT').value.trim(); await DB.pPut(r); closeSheet(); planesSheet(); }; });
      $('poCp').onclick = async () => { const recs = await DB.pByFinca(cur.id), num = recs.reduce((m, x) => Math.max(m, x.num), 0) + 1; const c = { ...JSON.parse(JSON.stringify(r)), id: uid(), num, nombre: 'Plan ' + num + ' (copia de ' + nomPlan(r) + ')', fecha: Date.now(), origen: 'copia' }; delete c._sync; c.plan.id = c.id; c.plan.num = num; await DB.pPut(c); planesCache.set(c.id, c); toast(c.nombre + ' creado'); planesSheet(); };
      $('poRe').onclick = async () => { if (r.id !== cur.planId) { cur.plan = r.plan; cur.planId = r.id; await saveCur(); } recalcSheet(); };
      $('poDel').onclick = () => confirmSheet(`¿Eliminar ${esc(nomPlan(r))}? Las rutas hechas con él conservan su resumen.`, 'Eliminar', async () => {
        await DB.pDel(r.id); planesCache.delete(r.id);
        if (cur.planId === r.id) { cur.plan = null; cur.planId = null; await saveCur(); drawFinca(); }
        toast(nomPlan(r) + ' eliminado'); planesSheet();
      }, true);
    });
}
function compararPlanes(recs) {
  const rows = [['Fecha', r => new Date(r.fecha).toLocaleDateString('es-ES')], ['Máquina', r => r.plan.params.maq ? esc(r.plan.params.maq.tractor + ' + ' + r.plan.params.maq.apero) : '–'], ['Ancho', r => fmt(r.plan.params.w, 2) + ' m'],
    ['Coste', r => fmt(costePlan(r.plan).coste, 2) + ' €'], ['Precio (+' + fmt(+SB.margen || 0, 0) + ' %)', r => fmt(costePlan(r.plan).precio, 2) + ' €'], ['Tiempo', r => fmtH(r.plan.stats.t.total / 3600)], ['Litros', r => fmt(r.plan.stats.litros, 1)],
    ['Pasadas', r => r.plan.stats.nPasadas], ['Giros U/K/Ω', r => `${r.plan.stats.giros.U}/${r.plan.stats.giros.K}/${r.plan.stats.giros.O}`], ['Recorrido', r => fmt(r.plan.stats.L.total, 0) + ' m'],
    ['Cobertura teórica', r => fmt(r.plan.stats.area.cobertura * 100, 1) + ' %'], ['Rumbo', r => r.plan.az + '°'], ['Velocidad', r => fmt(r.plan.params.v, 1) + ' km/h']];
  const best = recs.reduce((a, b) => costePlan(b.plan).coste < costePlan(a.plan).coste ? b : a);
  sheet(`<h3>📊 Comparar planes</h3><div style="overflow-x:auto"><table class="cmp"><tr><th></th>${recs.map(r => `<th>${esc(nomPlan(r))}${r === best ? ' ⭐' : ''}</th>`).join('')}</tr>
    ${rows.map(([n, f]) => `<tr><th>${n}</th>${recs.map(r => `<td>${f(r)}</td>`).join('')}</tr>`).join('')}</table></div><div class="note">⭐ el plan más barato (gasóleo ${fmt(+SB.precioGasoil, 2)} €/L + ${fmt(+SB.precioHora, 2)} €/h${cur.traslado && SB.base ? ` + traslado desde la base ${fmt(cur.traslado.km, 1)} km a ${fmt(+SB.precioKm, 2)} €/km, ida y vuelta por jornada` : ''}).</div>`);
}

/* ---- Rutas de trabajo ---- */
async function rutasSheet() {
  await cargarPlanes(cur); const trs = await numerarRutas(cur);
  if (!trs.length) return toast('Aún no hay rutas de trabajo en esta finca');
  for (const t of trs) if (!t.resumen) t.resumen = resumenTrab(t, rebuildTrab(cur, t));
  const pc = v => v == null ? '–' : fmt(v * 100, 0) + ' %';
  sheet(`<h3>🛤 Rutas de trabajo · ${esc(cur.nombre)}</h3>
    ${trs.map(t => { const pr = planDeRuta(t); return `<button class="opt" data-id="${t.id}"><b>${esc(nomRuta(t))}</b> · ${fFecha(t.inicio)} ${t.estado === 'abierto' ? '<b style="color:var(--warn)">· abierta</b>' : ''}
      <small>${pr ? esc(pr.nombre) + ' · ' : 'sin plan · '}${fmtH(t.resumen.horas)} · ${fmtArea(t.resumen.limpia)} · cobertura ${pc(t.resumen.cobertura)} · ${fmt(t.resumen.litros, 1)} L${t.nota ? '<br>' + esc(t.nota) : ''}</small></button>`; }).join('')}
    <button class="btn" id="rtAn" style="margin-top:6px">📊 Analizar rutas frente al plan</button>`,
    sh => { sh.querySelectorAll('[data-id]').forEach(b => b.onclick = () => trabOpts(trs.find(t => t.id === b.dataset.id))); $('rtAn').onclick = () => analizarRutas(trs); });
}
function planDeRuta(t) {
  const r = t.planId && planesCache.get(t.planId);
  if (r) return { nombre: nomPlan(r), plan: r.plan };
  if (t.planResumen) return { nombre: t.planResumen.nombre + ' (eliminado)', resumen: t.planResumen };
  return null;
}
// lo que el plan habría necesitado para limpiar la misma superficie que la ruta (proporcional a la cobertura)
function planEquiv(t) {
  const r = t.resumen, pr = planDeRuta(t); if (!pr || (pr.plan && pr.plan.repaso)) return null;
  const T = pr.plan ? pr.plan.stats.t.total / 3600 : pr.resumen.t, Lt = pr.plan ? pr.plan.stats.litros : pr.resumen.litros, Lm = pr.plan ? pr.plan.stats.L.total : pr.resumen.L, c = Math.min(1, r.cobertura || 0);
  return { t: T * c, litros: Lt * c, L: Lm * c, tTot: T, litrosTot: Lt };
}
function etaRuta(t) { const q = planEquiv(t); return q && t.resumen.L > 0 ? q.L / t.resumen.L : null; }
function efectividad(t) {   // cobertura × cumplimiento del tiempo del plan (máx. 1) × η (para la superficie limpiada)
  const r = t.resumen, q = planEquiv(t), ft = q && r.horas > 0 ? Math.min(1, q.t / r.horas) : 1, e = etaRuta(t), eta = e == null ? 1 : Math.min(1, e);
  return r.cobertura * ft * eta;
}
function analizarRutas(trs) {
  const pr = t => planDeRuta(t), pT = t => { const q = planEquiv(t); return q ? q.t : null; }, pL = t => { const q = planEquiv(t); return q ? q.litros : null; };
  const pc = v => v == null ? '–' : fmt(v * 100, 1) + ' %', dif = (a, b) => a == null || b == null ? '' : ` <small style="color:${a <= b ? '#2e7d32' : '#c62828'}">(${a > b ? '+' : ''}${fmt((a - b) / b * 100, 0)} %)</small>`;
  const rows = [
    ['Plan', t => pr(t) ? esc(pr(t).nombre) : '–'], ['Fecha', t => new Date(t.inicio).toLocaleDateString('es-ES')],
    ['Tiempo real', t => fmtH(t.resumen.horas) + dif(t.resumen.horas, pT(t))], ['Tiempo plan (misma superficie)', t => pT(t) == null ? '–' : fmtH(pT(t))],
    ['Gasóleo real', t => fmt(t.resumen.litros, 1) + ' L' + dif(t.resumen.litros, pL(t))], ['Gasóleo plan (misma superficie)', t => pL(t) == null ? '–' : fmt(pL(t), 1) + ' L'],
    ['Cobertura', t => pc(t.resumen.cobertura)], ['Sin limpiar', t => fmtArea(t.resumen.pendiente)],
    ['η recorrido (plan / real)', t => pc(etaRuta(t))], ['Desviación media', t => t.resumen.devMed == null ? '–' : fmt(t.resumen.devMed, 2) + ' m'],
    ['Solape', t => pc(t.resumen.solapePct)], ['<b>Efectividad</b>', t => `<b>${pc(efectividad(t))}</b>`]];
  const esRep = t => { const q = planDeRuta(t); return !!(q && q.plan && q.plan.repaso); }, cand = trs.filter(t => !esRep(t)).length ? trs.filter(t => !esRep(t)) : trs;
  const best = cand.reduce((a, b) => efectividad(b) > efectividad(a) ? b : a);
  sheet(`<h3>📊 Análisis de rutas</h3><div style="overflow-x:auto"><table class="cmp"><tr><th></th>${trs.map(t => `<th>${esc(nomRuta(t))}${t === best ? ' ⭐' : ''}</th>`).join('')}</tr>
    ${rows.map(([n, f]) => `<tr><th>${n}</th>${trs.map(t => `<td>${f(t)}</td>`).join('')}</tr>`).join('')}</table></div>
    <div class="note">⭐ <b>${esc(nomRuta(best))}</b> fue la más efectiva. Efectividad = cobertura × cumplimiento del tiempo del plan × η. En verde/rojo, la diferencia con el plan.</div>
    <div class="row" style="margin-top:8px"><button class="btn sec" id="anRo">🔴 Zonas sin limpiar</button><button class="btn sec" id="anRp">🧹 Repaso</button></div>`,
    () => { $('anRo').onclick = () => verSinLimpiar(best); $('anRp').onclick = () => repasoSheet(best); });
}
function verSinLimpiar(t) {
  viewTrab = t.id; trabCache = null; CFG.pendiente = true; CFG.limpia = true; CFG.real = true; CFG.area = false; saveCfg(); closeSheet(); drawFinca(true);
  const r = t.resumen || {}; toast(`🔴 ${nomRuta(t)}: en rojo lo que no pasó la desbrozadora (${fmtArea(r.pendiente || 0)})`, 5000);
}
async function copiarRuta(t) {
  const trs = await DB.tByFinca(cur.id), num = trs.reduce((m, x) => Math.max(m, x.num || 0), 0) + 1;
  const c = { ...JSON.parse(JSON.stringify(t)), id: uid(), num, nombre: 'Ruta ' + num + ' (copia de ' + nomRuta(t) + ')' }; delete c._sync; c.estado = 'cerrado';
  await DB.tPut(c); toast(c.nombre + ' creada'); rutasSheet();
}

/* ---- Peligros: piedras grandes, árboles caídos y obstáculos peligrosos (quedan en la finca) ---- */
const PEL = { piedra: ['🪨', 'Piedra grande', 1.0], arbol: ['🪵', 'Árbol caído / tronco', 2.0], otro: ['⚠️', 'Obstáculo peligroso', 1.5], prohibido: ['⛔', 'Prohibido pasar', 2.0] };
// señal de tráfico en el mapa: triángulo de peligro con el tipo dentro, o dirección prohibida
function senalPel(tipo, big) {
  const z = big ? 40 : 32;
  if (tipo === 'prohibido') return `<svg width="${z}" height="${z}" viewBox="0 0 32 32" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))"><circle cx="16" cy="16" r="14.5" fill="#d50000" stroke="#fff" stroke-width="2"/><rect x="6.5" y="12.5" width="19" height="7" rx="1.5" fill="#fff"/></svg>`;
  return `<div style="position:relative;width:${z}px;height:${z}px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))"><svg width="${z}" height="${z}" viewBox="0 0 32 30"><path d="M16 2.5 L30 27.5 H2 Z" fill="#fff" stroke="#d50000" stroke-width="3.2" stroke-linejoin="round"/></svg><span style="position:absolute;left:0;right:0;top:${big ? 13 : 10}px;text-align:center;font-size:${big ? 15 : 12}px;line-height:1">${PEL[tipo][0]}</span></div>`;
}
const iconPel = (tipo, big) => L.divIcon({ className: '', html: senalPel(tipo, big), iconSize: [big ? 40 : 32, big ? 40 : 32], iconAnchor: [big ? 20 : 16, big ? 20 : 16] });
// marcar peligros tocando el mapa (varios seguidos)
let pelTap = null;
function peligroTocar() {
  if (!map || !cur) return;
  const elegir = ll => {
    lyr.tmp.clearLayers(); L.marker(ll, { icon: iconPel('otro', true), interactive: false, zIndexOffset: 1000 }).addTo(lyr.tmp);
    sheet(`<h3>⚠️ ¿Qué hay aquí?</h3>
      <div class="incg">${Object.entries(PEL).map(([k, [e, t]]) => `<button class="btn big" data-p="${k}" style="margin:0;background:#fff;color:#222;border:2px solid #d50000;display:flex;flex-direction:column;align-items:center;gap:4px">${senalPel(k)}<small style="font-size:14px">${t}</small></button>`).join('')}</div>
      <div class="note" style="margin-top:8px">Queda guardado en la finca, los planes lo esquivan y avisa por voz al acercarte.</div>`,
      sh => sh.querySelectorAll('[data-p]').forEach(b => b.onclick = async () => { lyr.tmp.clearLayers(); await registrarPeligro(b.dataset.p, [ll.lat, ll.lng]); if (pelTap) toast('Toca otro punto o pulsa «Terminar»', 2500); }));
  };
  if (work) { toast('👆 Toca en el mapa el punto del peligro', 3500); followPos = false; map.once('click', e => { elegir(e.latlng); setTimeout(() => { followPos = true; }, 8000); }); return; }
  pelTap = { h: e => elegir(e.latlng) }; map.on('click', pelTap.h); followPos = false;
  showTool('⚠️ Peligros: toca el mapa', 'Toca donde está la piedra, el árbol caído, el obstáculo o la zona prohibida. Puedes marcar varios seguidos.', [['Terminar', '', () => { if (pelTap) map.off('click', pelTap.h); pelTap = null; lyr.tmp.clearLayers(); showMain(); drawFinca(); }]]);
}
function peligroSheet() {
  if (!cur) return;
  sheet(`<h3>⚠️ Peligro aquí</h3>
    <div class="incg">${Object.entries(PEL).map(([k, [e, t]]) => `<button class="btn big" data-p="${k}" style="margin:0;background:#c62828">${e}<br><small style="font-size:14px">${t}</small></button>`).join('')}</div>
    <button class="btn sec" id="pgTap" style="margin-top:8px">👆 Marcarlo tocando el mapa</button>
    <div class="note" style="margin-top:8px">Los botones lo guardan en la posición del apero. Queda en la finca: se esquiva en los planes y avisa por voz al acercarte. Se puede eliminar cuando quieras en ⋯ › ⚠️ Peligros.</div>`,
    sh => { sh.querySelectorAll('[data-p]').forEach(b => b.onclick = () => registrarPeligro(b.dataset.p)); $('pgTap').onclick = () => { closeSheet(); peligroTocar(); }; });
}
function circuloLL(ll, r) { const P = Geo.projFor([ll]), c = P.fwd(ll[0], ll[1]), xy = []; for (let k = 0; k < 16; k++) { const a = k / 16 * 2 * Math.PI; xy.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]); } return Geo.toLL(xy, P).map(q => [+q[0].toFixed(8), +q[1].toFixed(8)]); }
async function registrarPeligro(tipo, llTocado) {
  const ll = llTocado || (work && work.last && work.last.cutLL ? work.last.cutLL : lastPos ? [lastPos.lat, lastPos.lon] : null);
  if (!ll) return toast('Sin posición GPS');
  const f = cur, r = PEL[tipo][2], p = { id: uid(), tipo, ll: [+ll[0].toFixed(7), +ll[1].toFixed(7)], radio: r, fecha: Date.now(), nota: '', trabId: work ? work.trab.id : null, origen: llTocado ? 'mapa' : 'gps' };
  f.exclusiones = f.exclusiones || []; const ex = { id: uid(), nombre: PEL[tipo][1], coords: circuloLL(p.ll, r), metodo: 'peligro', centro: p.ll, radio: r, fecha: Date.now() };
  f.exclusiones.push(ex); p.exclId = ex.id; f.peligros = [...(f.peligros || []), p];
  await saveCur(); closeSheet(); drawFinca();
  speak(PEL[tipo][1] + ' anotado', true); toast(`${PEL[tipo][0]} ${PEL[tipo][1]} guardado en la finca`);
}
function drawPeligros(f, layer) {
  (f.peligros || []).forEach(p => L.marker(p.ll, { zIndexOffset: 900, icon: iconPel(PEL[p.tipo] ? p.tipo : 'otro') })
    .on('click', () => peligroOpts(f, p.id)).addTo(layer));
}
function peligroOpts(f, id) {
  const p = (f.peligros || []).find(x => x.id === id); if (!p) return;
  sheet(`<h3>${PEL[p.tipo][0]} ${PEL[p.tipo][1]}</h3><div class="note">${fFecha(p.fecha)}</div>
    <div class="srow"><span>Radio a esquivar (m)</span><input class="inp" id="pgR" inputmode="decimal" value="${String(p.radio).replace('.', ',')}" style="width:90px;text-align:right"></div>
    <label class="f">Nota</label><input class="inp" id="pgN" value="${esc(p.nota || '')}">
    <div class="row" style="margin-top:12px"><button class="btn err" id="pgD">Eliminar</button><button class="btn" id="pgS">Guardar</button></div>`,
    () => {
      $('pgS').onclick = async () => { const r = parseFloat($('pgR').value.replace(',', '.')); if (!(r > 0 && r < 30)) return toast('Radio no válido'); p.radio = r; p.nota = $('pgN').value.trim(); const ex = (f.exclusiones || []).find(e => e.id === p.exclId); if (ex) { ex.coords = circuloLL(p.ll, r); ex.radio = r; } await saveCur(); closeSheet(); drawFinca(); toast('Guardado' + (f.plan ? ' · recalcula el plan' : '')); };
      $('pgD').onclick = () => confirmSheet(`¿Eliminar ${PEL[p.tipo][1].toLowerCase()}?`, 'Eliminar', async () => { f.peligros = f.peligros.filter(x => x.id !== id); f.exclusiones = (f.exclusiones || []).filter(e => e.id !== p.exclId); await saveCur(); drawFinca(); toast('Eliminado' + (f.plan ? ' · recalcula el plan' : '')); }, true);
    });
}
function peligrosLista(f) {
  const L_ = (f.peligros || []).slice().sort((a, b) => b.fecha - a.fecha);
  sheet(`<h3>⚠️ Peligros · ${esc(f.nombre)}</h3>
    ${L_.length ? L_.map(p => `<button class="opt" data-id="${p.id}">${PEL[p.tipo][0]} ${PEL[p.tipo][1]}<small>${new Date(p.fecha).toLocaleDateString('es-ES')} · radio ${fmt(p.radio, 1)} m${p.nota ? ' · ' + esc(p.nota) : ''}</small></button>`).join('') : '<div class="note">Sin peligros. Se anotan durante el trabajo con el botón ⚠️.</div>'}
    <div class="row" style="margin-top:8px"><button class="btn sec" id="pgA">＋ Aquí (GPS)</button><button class="btn sec" id="pgT">👆 Tocando el mapa</button><button class="btn sec" id="pgX">📤 Exportar KML/GPX</button></div>`,
    sh => { $('pgX').onclick = () => exportPelSheet(f); $('pgT').onclick = () => { closeSheet(); peligroTocar(); }; sh.querySelectorAll('[data-id]').forEach(b => b.onclick = () => { closeSheet(); const p = f.peligros.find(x => x.id === b.dataset.id); if (map) map.setView(p.ll, Math.max(map.getZoom(), 19)); peligroOpts(f, p.id); }); $('pgA').onclick = peligroSheet; });
}
function avisoPeligros(p) {
  if (!work || !cur || !(cur.peligros || []).length) return;
  if (work.tPel && p.t - work.tPel < 2000) return; work.tPel = p.t; work.pelDicho = work.pelDicho || {};
  const P = Geo.proj(p.lat, p.lon);
  for (const q of cur.peligros) {
    const a = P.fwd(q.ll[0], q.ll[1]), d = Math.hypot(a[0], a[1]) - q.radio;
    if (d < 12 && (!work.pelDicho[q.id] || p.t - work.pelDicho[q.id] > 60000)) { work.pelDicho[q.id] = p.t; speak(`Atención: ${PEL[q.tipo][1].toLowerCase()} a ${Math.max(1, Math.round(d))} metros`, true); toast(`${PEL[q.tipo][0]} ${PEL[q.tipo][1]} a ${Math.max(1, Math.round(d))} m`, 3000); break; }
  }
}

