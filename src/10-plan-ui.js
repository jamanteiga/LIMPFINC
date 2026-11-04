'use strict';
/* =========================================================
   PLAN — interfaz
   ========================================================= */
let planRev = null;
const PLAN_STYLE = {
  trabajo: { color: '#1565c0', weight: 3.5, opacity: .95 },
  giro: { color: '#1e88e5', weight: 2, opacity: .85 },
  reversa: { color: '#1e88e5', weight: 2, opacity: .9, dashArray: '4 4' },
  tras: { color: '#64b5f6', weight: 2, opacity: .9, dashArray: '1 6' }
};
function drawPlan(pl, layer) {
  layer.clearLayers();
  if (!pl) return;
  if (CFG.noAlc) pl.missed.forEach(m => L.polygon(m, { color: '#ef6c00', weight: 1, fillColor: '#ff9800', fillOpacity: .55, interactive: false }).addTo(layer));
  pl.parts.forEach(p => L.polyline(p.ll, { ...PLAN_STYLE[p.type], interactive: false }).addTo(layer));
  pl.arrows.forEach(a => L.marker(a.ll, { interactive: false, icon: L.divIcon({ className: '', html: `<div class="arr" style="transform:rotate(${a.az}deg)"></div>`, iconSize: [12, 12], iconAnchor: [6, 6] }) }).addTo(layer));
  const all = pl.parts; if (!all.length) return;
  const st = all[0].ll[0], en = all[all.length - 1].ll[all[all.length - 1].ll.length - 1];
  L.marker(st, { interactive: false, icon: L.divIcon({ className: '', html: '<div class="pin" style="background:#2e7d32">I</div>', iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(layer);
  L.marker(en, { interactive: false, icon: L.divIcon({ className: '', html: '<div class="pin" style="background:#c62828">F</div>', iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(layer);
}
const planStale = f => f.plan && f.plan.geomKey !== geomKey(f);

function planMenu() {
  if (busy()) return;
  if (!cur.linde) return toast('Primero define el linde de la finca');
  if (cur.tipo === 'monte' && !(cur.malla && cur.malla.arboles && cur.malla.arboles.length)) { toast('Marca primero los árboles (Arboleda)'); return mallaMenu(); }
  if (!window.ClipperLib) return toast('No se ha cargado la librería de geometría. Revisa la conexión.');
  const nEx = (cur.exclusiones || []).length;
  if (exclAbiertas(cur) && !planMenu._ok) {
    return sheet(`<h3>¿Quedan exclusiones?</h3><div class="note">Hay <b>${nEx}</b> medida${nEx === 1 ? '' : 's'} y no has indicado que estén todas. El plan no sabrá esquivar las que falten.</div>
      <button class="opt" id="pxM">📍 Medir la exclusión ${nEx + 1}</button>
      <button class="opt" id="pxN">✅ No hay más: calcular</button>
      <button class="opt" id="pxC" style="color:var(--sub)">Calcular igualmente (siguen abiertas)</button>`, () => {
        $('pxM').onclick = () => { closeSheet(); guiaExcl(); };
        $('pxC').onclick = () => { closeSheet(); planMenu._ok = true; try { planMenu(); } finally { planMenu._ok = false; } };
        $('pxN').onclick = async () => { cur.exclPend = false; await saveCur(); closeSheet(); planMenu(); };
      });
  }
  if (!cur.plan) return planOptions();
  const st = cur.plan.stats;
  sheet(`<h3>Plan de trabajo</h3>
    ${planStale(cur) ? '<div class="card" style="background:#fff3e0;color:#e65100">⚠️ El linde, las exclusiones o la arboleda han cambiado. Recalcula el plan.</div>' : ''}
    <div class="card">
      <div class="kv"><span>Tiempo estimado</span><span>${fmtH(st.t.total / 3600)}</span></div>
      <div class="kv"><span>Combustible</span><span>${fmt(st.litros, 1)} L</span></div>
      <div class="kv"><span>Cobertura teórica</span><span>${fmt(st.area.cobertura * 100, 1)} %</span></div>
    </div>
    <div class="note">${cur.plan.num ? esc(nomPlan({ num: cur.plan.num, nombre: (planesCache.get(cur.planId) || {}).nombre })) : ''}</div>
    <button class="opt" id="pDet">📋 Ver detalle</button>
    <button class="opt" id="pLis">📚 Planes guardados</button>
    <button class="opt" id="pPre">💶 Presupuesto</button>
    <button class="opt" id="pRe2">🔄 Recalcular con otra velocidad / parámetros</button>
    <button class="opt" id="pRe">🧭 Cambiar dirección, punto de inicio o final</button>
    ${cur.tipo === 'monte' ? '<button class="opt" id="pMal">🌳 Arboleda (marcar árboles)</button>' : ''}
    <button class="opt" id="pVis">${CFG.plan ? '🙈 Ocultar plan' : '👁 Mostrar plan'}</button>
    <button class="opt" id="pMis">${CFG.noAlc ? '⬜ Ocultar zonas no alcanzadas' : '🟧 Mostrar zonas no alcanzadas'}</button>
    <button class="opt" id="pDel" style="color:var(--err)">🗑 Borrar plan</button>`,
    () => {
      $('pDet').onclick = () => planDetail(cur.plan); $('pLis').onclick = planesSheet; $('pPre').onclick = () => presupuestoSheet(cur);
      $('pRe').onclick = planOptions; $('pRe2').onclick = () => recalcSheet();
      $('pVis').onclick = () => { CFG.plan = !CFG.plan; saveCfg(); closeSheet(); drawFinca(); };
      $('pMis').onclick = () => { CFG.noAlc = !CFG.noAlc; saveCfg(); closeSheet(); drawFinca(); };
      if ($('pMal')) $('pMal').onclick = () => { closeSheet(); mallaMenu(); };
      $('pDel').onclick = () => confirmSheet('¿Borrar el plan?', 'Borrar', async () => { cur.plan = null; await saveCur(); drawFinca(); }, true);
    });
}

function planOptions() {
  const o = { dirMode: 'auto', az: 0, nHMode: 'auto', nH: 0, start: 'gps', end: 'libre', hl: 'ini', ...(cur.planOpt || {}) };
  if (o.start === 'prev' && !o.startLL) o.start = 'gps'; if (o.end === 'prev' && !o.endLL) o.end = 'libre';
  const need = Planner.headlandNeed(S), we = S.aperoAncho - Math.min(S.solape, S.aperoAncho / 2);
  const nHauto = 1 + Math.ceil(Math.max(0, need - S.aperoAncho) / we);
  sheet(`<h3>Calcular plan</h3>
    ${cur.tipo === 'monte' ? '<div class="note">Monte: pasadas paralelas a las filas de árboles (A→B), ' + 'dos por calle con superposición.</div>' : ''}
    <label class="f" ${cur.tipo === 'monte' ? 'style="display:none"' : ''}>Dirección de las pasadas</label>
    <div class="seg" id="oDir" ${cur.tipo === 'monte' ? 'style="display:none"' : ''}><button data-v="auto">Automática (óptima)</button><button data-v="man">Manual</button></div>
    <div class="srow ${o.dirMode === 'man' ? '' : 'hidden'}" id="oAzR"><span>Azimut (° desde el norte, 0–179)</span><input class="inp" id="oAz" inputmode="decimal" value="${o.az}" style="width:90px;text-align:right"></div>
    <label class="f">Vueltas perimetrales (cabecera)</label>
    <div class="seg" id="oNH"><button data-v="auto">Auto (${nHauto})</button><button data-v="man">Manual</button></div>
    <div class="srow ${o.nHMode === 'man' ? '' : 'hidden'}" id="oNHR"><span>Número de vueltas</span><input class="inp" id="oNHv" inputmode="numeric" value="${o.nH || nHauto}" style="width:90px;text-align:right"></div>
    <div class="note">Cabecera necesaria para girar: ${fmt(need, 1)} m → ${nHauto} vueltas de ${fmt(we, 2)} m.</div>
    <label class="f">Punto de inicio (entrada del tractor)</label>
    <div class="seg" id="oSt"><button data-v="gps">Mi posición</button><button data-v="map">Tocar en mapa</button>${o.startLL ? '<button data-v="prev">📌 Anterior</button>' : '<button data-v="v0">1.er vértice</button>'}</div>
    <label class="f">Punto final (salida del tractor)</label>
    <div class="seg" id="oEn"><button data-v="libre">Libre</button><button data-v="ini">= Inicio</button><button data-v="map">Tocar en mapa</button>${o.endLL ? '<button data-v="prev">📌 Anterior</button>' : ''}</div>
    <label class="f">Vueltas perimetrales</label>
    <div class="seg" id="oHf"><button data-v="ini">Al principio</button><button data-v="fin">Al final</button></div>
    <div class="note" id="oHfN"></div>
    <div class="card" style="margin-top:12px;font-size:13px;color:var(--sub)">
      Apero ${fmt(S.aperoAncho, 2)} m · solape ${fmt(S.solape, 2)} m · R giro ${fmt(S.radioGiro, 1)} m · marcha atrás ${S.marchaAtras ? 'sí' : 'no'} ·
      ${fmt(S.velocidad, 1)} km/h trabajo · ${fmt(S.velocidadGiro, 1)} km/h giro · ${fmt(S.consumo, 1)} L/h. <i>Se cambian en Ajustes.</i></div>
    <button class="btn" id="oGo">Calcular</button>`,
    () => {
      const segs = { oDir: 'dirMode', oNH: 'nHMode', oSt: 'start', oEn: 'end', oHf: 'hl' };
      const nota = () => { $('oHfN').textContent = o.hl === 'fin' ? 'Primero las pasadas; las vueltas al linde al final, de dentro hacia fuera, acabando junto al punto final. Limpia las marcas de los giros.' : 'Primero las vueltas al linde (deja sitio limpio para girar); luego las pasadas.'; };
      for (const [id, key] of Object.entries(segs)) {
        const el = $(id); const paint = () => el.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === o[key]));
        el.querySelectorAll('button').forEach(b => b.onclick = () => { o[key] = b.dataset.v; paint(); nota(); $('oAzR').classList.toggle('hidden', o.dirMode !== 'man'); $('oNHR').classList.toggle('hidden', o.nHMode !== 'man'); });
        paint();
      }
      nota();
      $('oGo').onclick = async () => {
        o.az = parseFloat($('oAz').value.replace(',', '.')) || 0; o.nH = parseInt($('oNHv').value) || 0;
        cur.planOpt = o; await saveCur(); closeSheet();
        let st = null;
        if (o.start === 'gps') {
          if (lastPos && Geo.lenLL([[lastPos.lat, lastPos.lon], cur.linde.coords[0]]) < 2000) st = [lastPos.lat, lastPos.lon];
          else toast('Sin posición GPS cercana: se usa el primer vértice', 3000);
        } else if (o.start === 'prev') st = o.startLL;
        const ir = async (a, b) => {
          if (a) o.startLL = a; if (b) o.endLL = b; cur.planOpt = o; await saveCur();
          runPlan(o, a, o.end === 'ini' ? (a || cur.linde.coords[0]) : b);
        };
        if (o.start === 'map' || o.end === 'map') pickPoints(o, st, ir);
        else ir(st, o.end === 'prev' ? o.endLL : null);
      };
    });
}
// pantalla única para colocar inicio (I) y final (F) antes de calcular; marcas arrastrables
function pickPoints(o, st0, cb) {
  const qI = o.start === 'map', qF = o.end === 'map';
  let I = qI ? (o.startLL || null) : st0, F = qF ? (o.endLL || null) : null, modo = qI && !I ? 'I' : qF && !F ? 'F' : qI ? 'I' : 'F';
  planRev = { picking: true }; lyr.tmp.clearLayers();
  const ico = (c, l) => L.divIcon({ className: '', html: `<div class="pin" style="background:${c};width:30px;height:30px;line-height:30px;font-size:15px">${l}</div>`, iconSize: [30, 30], iconAnchor: [15, 15] });
  const mk = {};
  const put = (k, ll) => {
    if (k === 'I') I = ll; else F = ll;
    if (mk[k]) mk[k].setLatLng(ll);
    else { mk[k] = L.marker(ll, { draggable: k === 'I' ? qI : qF, icon: ico(k === 'I' ? '#2e7d32' : '#c62828', k), zIndexOffset: 2000 }).addTo(lyr.tmp); mk[k].on('dragend', e => { const p = e.target.getLatLng(); if (k === 'I') I = [+p.lat.toFixed(7), +p.lng.toFixed(7)]; else F = [+p.lat.toFixed(7), +p.lng.toFixed(7)]; panel(); }); }
  };
  if (I) put('I', I); if (F) put('F', F);
  const listo = () => (!qI || I) && (!qF || F);
  const fin = ok => { map.off('click', onTap); planRev = null; lyr.tmp.clearLayers(); if (ok) cb(I, F); else showMain(); };
  function panel() {
    const seg = qI && qF ? `<div class="seg" id="ppSeg" style="margin:6px 0"><button data-v="I" class="${modo === 'I' ? 'on' : ''}">🟢 Inicio ${I ? '✓' : ''}</button><button data-v="F" class="${modo === 'F' ? 'on' : ''}">🔴 Final ${F ? '✓' : ''}</button></div>` : '';
    const txt = modo === 'I' ? 'Toca en el mapa por dónde <b>entra</b> el tractor (I).' : 'Toca en el mapa por dónde quieres <b>acabar</b> (F).';
    showTool(qI && qF ? 'Inicio y final' : qI ? 'Punto de inicio' : 'Punto final', seg + txt + '<br><small>Puedes tocar de nuevo o arrastrar la marca para corregirla.</small>',
      [['Cancelar', 'sec', () => fin(false)], ['Calcular plan', '', () => fin(true), !listo()]]);
    if ($('ppSeg')) $('ppSeg').querySelectorAll('button').forEach(b => b.onclick = () => { modo = b.dataset.v; panel(); });
  }
  function onTap(e) {
    const ll = [+e.latlng.lat.toFixed(7), +e.latlng.lng.toFixed(7)];
    put(modo, ll);
    if (modo === 'I' && qF && !F) modo = 'F';   // tras el inicio, pasa solo a colocar el final
    panel();
  }
  map.on('click', onTap); panel();
  if (!qI && I) toast('Inicio fijado (verde). Toca el mapa para colocar el final.', 3000);
}
// marca un punto en el mapa (se puede tocar varias veces para corregir y luego confirmar)
function pickPoint(titulo, hint, color, letra, cb, otro) {
  planRev = { picking: true }; lyr.tmp.clearLayers();
  const pin = (ll, c, l) => L.marker(ll, { interactive: false, icon: L.divIcon({ className: '', html: `<div class="pin" style="background:${c}">${l}</div>`, iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(lyr.tmp);
  if (otro) pin(otro, '#2e7d32', 'I');
  let ll = null, mk = null;
  const fin = ok => { map.off('click', onPick); planRev = null; lyr.tmp.clearLayers(); if (ok) cb(ll); else showMain(); };
  const btns = () => showTool(titulo, hint + (ll ? '<br>Puedes tocar otra vez para corregirlo.' : ''), [['Cancelar', 'sec', () => fin(false)], ['Usar este punto', '', () => fin(true), !ll]]);
  function onPick(e) { ll = [+e.latlng.lat.toFixed(7), +e.latlng.lng.toFixed(7)]; if (mk) mk.setLatLng(ll); else mk = pin(ll, color, letra); btns(); }
  map.on('click', onPick); btns();
}
async function runPlan(o, start, end) {
  const B = busyPlan();
  const pl = await planAsync(cur, S, { az: o.dirMode === 'man' ? o.az : null, nH: o.nHMode === 'man' ? o.nH : 0, start, end, hlFinal: o.hl === 'fin' }, B.prog);
  B.close();
  if (pl.error) { toast(pl.error, 4000); showMain(); return; }
  planReview(pl);
}
// hoja de recálculo: cambia velocidad y otros parámetros, compara y guarda
function recalcSheet(desdeLista) {
  const f = cur, c = { ...(f.config || {}) }, S0 = effS(f), pl0 = f.plan, o = f.planOpt || { dirMode: 'auto', nHMode: 'auto' };
  const num = v => String(v ?? '').replace('.', ',');
  sheet(`<h3>Recalcular plan · ${esc(f.nombre)}</h3>
    ${pl0 ? `<div class="card"><div class="kv"><span>Plan actual</span><span>${fmtH(pl0.stats.t.total / 3600)} · ${fmt(pl0.stats.litros, 1)} L · ${fmt(S0.velocidad, 1)} km/h</span></div></div>` : '<div class="note">La finca aún no tiene plan: se calculará uno nuevo.</div>'}
    <div class="card">
      <div class="srow"><span><b>Velocidad de trabajo (km/h)</b></span><input class="inp" id="rVel" inputmode="decimal" value="${num(S0.velocidad)}" style="width:90px;text-align:right"></div>
      <div class="srow"><span>Tractor / máquina</span><select class="inp" id="rTr" style="width:170px">${CAT.tractores.map(t => `<option value="${t.id}" ${t.id === (c.tractorId || SB.tractorDef) ? 'selected' : ''}>${icoTr(t)} ${esc(t.nombre)}</option>`).join('')}</select></div>
      <div class="srow"><span>Apero</span><select class="inp" id="rAp" style="width:170px">${CAT.aperos.map(a => `<option value="${a.id}" ${a.id === (c.aperoId || SB.aperoDef) ? 'selected' : ''}>${esc(a.nombre)}</option>`).join('')}</select></div>
      <div class="srow"><span><b>Ancho de trabajo del apero (m)</b></span><input class="inp" id="rAnc" inputmode="decimal" value="${num(S0.aperoAncho)}" style="width:90px;text-align:right"></div>
      <button class="lnk" id="rCat" style="margin:2px 0 6px">＋ Añadir otro tractor, cortacésped o apero</button>
      <div class="srow"><span>Solape entre pasadas (m)</span><input class="inp" id="rSol" inputmode="decimal" value="${num(S0.solape)}" style="width:90px;text-align:right"></div>
      <div class="srow"><span>Velocidad en giros (km/h)</span><input class="inp" id="rVg" inputmode="decimal" value="${num(S0.velocidadGiro)}" style="width:90px;text-align:right"></div>
      <div class="srow"><span>Consumo (L/h)</span><input class="inp" id="rCon" inputmode="decimal" value="${num(S0.consumo)}" style="width:90px;text-align:right"></div>
      <div class="srow"><span>Vueltas de cabecera (vacío = auto)</span><input class="inp" id="rNH" inputmode="numeric" value="${o.nHMode === 'man' ? o.nH : ''}" style="width:90px;text-align:right"></div>
      ${f.tipo !== 'monte' ? `<div class="srow"><span>Rumbo pasadas ° (vacío = óptimo)</span><input class="inp" id="rAz" inputmode="decimal" value="${o.dirMode === 'man' ? o.az : ''}" style="width:90px;text-align:right"></div>` : ''}
    </div>
    ${(() => { const A = aprendS(f, S0); return A ? `<div class="note">🧠 Se aplica lo aprendido: ${A.a && A.a.vNormal ? 'velocidad real ' + fmt(A.a.vNormal, 1) + ' km/h en lugar de la configurada' : 'velocidad configurada'}${A.fG ? ', giros ×' + fmt(A.fG, 2) : ''}${A.fT ? ', traslados ×' + fmt(A.fT, 2) : ''}. Se desactiva en ⋯ › 🧠 Lo aprendido.</div>` : ''; })()}
    <div id="rRes"></div>
    <div class="row"><button class="btn sec" id="rCalc">Calcular</button><button class="btn" id="rOk" disabled>Guardar y usar</button></div>
    <button class="btn sec" id="rAlt" disabled style="margin-top:8px">💾 Guardar como plan alternativo<small style="display:block;font-size:12px;font-weight:400">Sin cambiar la máquina ni el plan activo de la finca</small></button>`,
    () => {
      let nuevo = null, cfgN = null, optN = null;
      // al cambiar el apero se proponen sus valores
      $('rAp').onchange = () => { const a = getAp($('rAp').value); if (a) { $('rSol').value = num(+a.solape_m || 0); $('rCon').value = num(+a.consumo_lh || SB.consumo); $('rAnc').value = num(+a.ancho_m); $('rVel').value = num(velProp(a, f.tipo)); } };
      $('rTr').onchange = () => { const ap = aperoPara(getTr($('rTr').value), getAp($('rAp').value)); if (ap) { $('rAp').value = ap.id; $('rAp').onchange(); } };
      $('rCat').onclick = () => catSheet();
      $('rCalc').onclick = async () => {
        const n = id => { const t = ($(id) ? $(id).value : '').trim().replace(',', '.'); return t === '' ? null : parseFloat(t); };
        const vel = n('rVel'); if (!(vel > 0 && vel < 30)) return toast('Velocidad no válida');
        const ap = getAp($('rAp').value);
        cfgN = { ...c, velocidad: vel, tractorId: $('rTr').value, aperoId: $('rAp').value };
        const sol = n('rSol'), vg = n('rVg'), con = n('rCon');
        cfgN.solape = sol != null && Math.abs(sol - (+ap.solape_m || 0)) > 1e-9 ? sol : null;
        const anc = n('rAnc'); if (anc != null && !(anc > 0.1 && anc < 15)) return toast('Ancho no válido');
        cfgN.ancho = anc != null && Math.abs(anc - (+ap.ancho_m || 0)) > 1e-9 ? anc : null;
        cfgN.consumo = con != null && Math.abs(con - (+ap.consumo_lh || 0)) > 1e-9 ? con : null;
        cfgN.velGiro = vg != null && Math.abs(vg - SB.velocidadGiro) > 1e-9 ? vg : null;
        const nh = n('rNH'), az = n('rAz');
        optN = { ...o, nHMode: nh ? 'man' : 'auto', nH: nh || 0, dirMode: az != null ? 'man' : 'auto', az: az != null ? az : o.az };
        const S1 = effS(f, cfgN);
        const start = pl0 ? (pl0.inicio || (pl0.parts[0] ? pl0.parts[0].ll[0] : null)) : null, end = pl0 ? pl0.fin : null;
        const bt = $('rCalc'), tb = bt.textContent; bt.disabled = true; bt.textContent = 'Calculando… 0 %';
        nuevo = await planAsync(f, S1, { az: optN.dirMode === 'man' ? optN.az : null, nH: optN.nHMode === 'man' ? optN.nH : 0, start, end, hlFinal: !!(pl0 && pl0.hlFinal) }, p => { bt.textContent = 'Calculando… ' + Math.round(p * 100) + ' %'; });
        bt.disabled = false; bt.textContent = tb; if (!$('rRes')) return;
        if (nuevo.error) { $('rRes').innerHTML = `<div class="card warnc">${esc(nuevo.error)}</div>`; $('rOk').disabled = true; return; }
        const st = nuevo.stats, d = pl0 ? (st.t.total - pl0.stats.t.total) / 60 : null, dl = pl0 ? st.litros - pl0.stats.litros : null;
        const sg = v => (v > 0 ? '+' : '') + fmt(v, 1);
        $('rRes').innerHTML = `<div class="card" style="background:#e8f5e9">
          <div class="kv"><span><b>Nuevo plan</b></span><span>${fmtH(st.t.total / 3600)} · ${fmt(st.litros, 1)} L</span></div>
          ${pl0 ? `<div class="kv"><span>Diferencia</span><span>${sg(d)} min · ${sg(dl)} L</span></div>` : ''}
          <div class="kv"><span>Rendimiento</span><span>${fmt(st.haH, 2)} ha/h · ${fmt(st.litros / (st.area.objetivo / 1e4 || 1), 1)} L/ha</span></div>
          <div class="kv"><span>Pasadas · giros U/K/Ω</span><span>${st.nPasadas} · ${st.giros.U}/${st.giros.K}/${st.giros.O}</span></div>
          <div class="kv"><span>Cobertura teórica</span><span>${fmt(st.area.cobertura * 100, 1)} %</span></div></div>`;
        $('rOk').disabled = false; $('rAlt').disabled = false;
      };
      $('rAlt').onclick = async () => {
        if (!nuevo || nuevo.error) return;
        const rec = await guardarPlanAlt(f, nuevo, cfgN, optN); closeSheet();
        toast(`${nomPlan(rec)} guardado como alternativo: ${fmtH(nuevo.stats.t.total / 3600)} · ${fmt(nuevo.stats.litros, 1)} L. Está en ⋯ › 🧭 Planes guardados.`, 5000);
      };
      $('rOk').onclick = async () => {
        if (!nuevo || nuevo.error) return;
        f.config = cfgN; f.planOpt = optN; await guardarPlan(f, nuevo, 'recalculado', cfgN); cur = f; applyS();
        await saveCur(); closeSheet(); toast(`Plan guardado: ${fmtH(nuevo.stats.t.total / 3600)} · ${fmt(nuevo.stats.litros, 1)} L`, 3500);
        if (desdeLista || view === 'list') showList(); else drawFinca();
      };
      $('rCalc').click();
    });
}
// recalcula el plan con la configuración actual (tractor, apero, velocidad) y lo guarda
async function recalcPlan() {
  if (!cur || !cur.linde) return toast('La finca no tiene linde');
  if (cur.tipo === 'monte' && !(cur.malla && cur.malla.arboles && cur.malla.arboles.length)) return toast('Marca primero los árboles (Arboleda)');
  applyS();
  const o = cur.planOpt || {}, start = cur.plan && cur.plan.parts[0] ? cur.plan.parts[0].ll[0] : null;
  const B = busyPlan('Recalculando plan…'); const pl = await planAsync(cur, S, { az: o.dirMode === 'man' ? o.az : null, nH: o.nHMode === 'man' ? o.nH : 0, start }, B.prog); B.close();
  if (pl.error) return toast('No se pudo recalcular: ' + pl.error, 4000);
  cur.plan = pl; await saveCur(); drawFinca();
  toast(`Plan recalculado a ${fmt(S.velocidad, 1)} km/h: ${fmtH(pl.stats.t.total / 3600)} · ${fmt(pl.stats.litros, 1)} L`, 4500);
}
function planReview(pl) {
  planRev = { pl };
  lyr.plan.clearLayers(); drawPlan(pl, lyr.tmp);
  const st = pl.stats;
  if (pl.repaso) return showTool('🧹 Repaso calculado',
    `<b>${fmtH(st.t.total / 3600)}</b> · <b>${fmt(st.litros, 1)} L</b> · ${st.nPasadas} pasadas de repaso · ${fmt(st.L.trabajo, 0)} m con apero<br>Sin limpiar en ${esc(pl.repaso.ruta)}: ${fmtArea(pl.repaso.rojo)} · se alcanza ${fmtArea(pl.repaso.cubre)} (${fmt(st.area.cobertura * 100, 0)} %)${pl.repaso.rojo - pl.repaso.cubre > Math.max(2, pl.repaso.rojo * 0.02) ? '<br>El resto está pegado al linde, a exclusiones o a troncos, o son manchas menores de ' + fmt(pl.repaso.minArea, 1) + ' m².' : ''}`,
    [['Descartar', 'sec', () => { planRev = null; lyr.tmp.clearLayers(); drawFinca(); showMain(); }],
     ['Detalle', 'sec', () => planDetail(pl)],
     ['Guardar y usar', '', async () => { const rec = await guardarPlan(cur, pl, 'repaso'); rec.nombre = nomPlan(rec) + ' (repaso de ' + pl.repaso.ruta + ')'; await DB.pPut(rec); planesCache.set(rec.id, rec); CFG.plan = true; saveCfg(); await saveCur(); toast(`${nomPlan(rec)} activo. Pulsa Trabajar para hacerlo; el plan completo sigue en ⋯ › 🧭 Planes guardados.`, 6000); planRev = null; lyr.tmp.clearLayers(); drawFinca(); showMain(); }]]);
  showTool('Plan calculado',
    `<b>${fmtH(st.t.total / 3600)}</b> · <b>${fmt(st.litros, 1)} L</b> · ${fmt(st.haH, 2)} ha/h · cobertura ${fmt(st.area.cobertura * 100, 1)} %<br>
     ${pl.aprendido ? aprTxt(pl.aprendido) + '<br>' : ''}${st.monte ? 'Franja de árboles no accesible ' + fmtArea(st.area.franjaArboles) + ' · cobertura alcanzable ' + fmt(st.area.coberturaAlcanzable * 100, 1) + ' %<br>' : ''}Rumbo ${pl.az}° · ${st.nVueltas} vueltas perimetrales · ${st.nPasadas} pasadas · giros U ${st.giros.U} / K ${st.giros.K} / Ω ${st.giros.O}` +
    (pl.warn.length ? '<br>⚠️ ' + pl.warn.join('<br>⚠️ ') : ''),
    [['Descartar', 'sec', () => { planRev = null; lyr.tmp.clearLayers(); drawFinca(); showMain(); }],
     ['Detalle', 'sec', () => planDetail(pl)],
     ['Guardar', '', async () => { const rec = await guardarPlan(cur, pl, 'calculado'); CFG.plan = true; saveCfg(); await saveCur(); toast(nomPlan(rec) + ' guardado'); planRev = null; lyr.tmp.clearLayers(); drawFinca(); showMain(); }]]);
}
function planDetail(pl) {
  const st = pl.stats, m = v => fmt(v, 0) + ' m', h = s => fmtH(s / 3600);
  sheet(`<h3>Detalle del plan</h3>
    <div class="card">
      ${pl.aprendido ? `<div class="note" style="margin-bottom:6px">${aprTxt(pl.aprendido)}</div>` : ''}
      <div class="kv"><span>Rumbo de pasadas</span><span>${pl.az}°</span></div>
      <div class="kv"><span>Vueltas perimetrales</span><span>${st.nVueltas}${pl.nH !== pl.nHauto ? ' (auto ' + pl.nHauto + ')' : ''}</span></div>
      <div class="kv"><span>Cabecera necesaria</span><span>${fmt(pl.need, 1)} m</span></div>
      <div class="kv"><span>Vueltas a exclusiones</span><span>${st.nObs}</span></div>
      <div class="kv"><span>Pasadas interiores</span><span>${st.nPasadas}</span></div>
      <div class="kv"><span>Giros U / K (marcha atrás) / Ω</span><span>${st.giros.U} / ${st.giros.K} / ${st.giros.O}</span></div>
      <div class="kv"><span>Rodeos de exclusión</span><span>${st.giros.rodeo}</span></div>
      <div class="kv"><span>Traslados</span><span>${st.giros.tras}</span></div>
      <div class="kv"><span>Esquinas con maniobra</span><span>${st.esquinas}</span></div>
    </div>
    <div class="card"><h3>Recorrido</h3>
      <div class="kv"><span>Trabajando</span><span>${m(st.L.trabajo)}</span></div>
      <div class="kv"><span>Giros</span><span>${m(st.L.giro)}</span></div>
      <div class="kv"><span>Marcha atrás</span><span>${m(st.L.reversa)}</span></div>
      <div class="kv"><span>Traslados</span><span>${m(st.L.traslado)}</span></div>
      <div class="kv"><span>Total trayectoria ideal</span><span>${m(st.L.total)}</span></div>
    </div>
    <div class="card"><h3>Tiempo y combustible</h3>
      <div class="kv"><span>Trabajando</span><span>${h(st.t.trabajo)}</span></div>
      <div class="kv"><span>Giros y maniobras</span><span>${h(st.t.giros + st.t.esquinas)}</span></div>
      <div class="kv"><span>Traslados</span><span>${h(st.t.traslado)}</span></div>
      <div class="kv"><span>Total</span><span>${h(st.t.total)}</span></div>
      <div class="kv"><span>Combustible (${fmt(pl.params.consumo, 1)} L/h)</span><span>${fmt(st.litros, 1)} L</span></div>
      <div class="kv"><span>Rendimiento</span><span>${fmt(st.haH, 2)} ha/h · ${fmt(st.litros / (st.area.objetivo / 10000 || 1), 1)} L/ha</span></div>
      <div class="kv"><span>Tiempo productivo</span><span>${fmt(st.t.trabajo / st.t.total * 100, 0)} %</span></div>
    </div>
    <div class="card"><h3>Superficie</h3>
      <div class="kv"><span>A limpiar</span><span>${fmtArea(st.area.objetivo)}</span></div>
      <div class="kv"><span>Cubierta por el plan</span><span>${fmtArea(st.area.cubierta)}</span></div>
      <div class="kv"><span>No alcanzada (esquinas, bordes)</span><span>${fmtArea(st.area.noAlcanzada)}</span></div>
      <div class="kv"><span>Cobertura teórica</span><span>${fmt(st.area.cobertura * 100, 1)} %</span></div>
      ${st.monte ? `<div class="kv"><span>Franja de árboles (holgura ${fmt(S.holguraTronco, 2)} m)</span><span>${fmtArea(st.area.franjaArboles)}</span></div>
      <div class="kv"><span>Cobertura alcanzable</span><span>${fmt(st.area.coberturaAlcanzable * 100, 1)} %</span></div>` : ''}
    </div>
    <div class="note">Azul continuo: trabajo · azul fino: giros · discontinuo: marcha atrás · punteado: traslado. Calculado en ${pl.ms} ms.</div>`);
}

