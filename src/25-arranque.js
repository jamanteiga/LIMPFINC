'use strict';
/* ---------- Panel de herramienta genérico ---------- */
function showTool(title, hint, btns) {
  $('tbMain').classList.add('hidden'); $('pRec').classList.add('hidden'); $('pTool').classList.remove('hidden');
  $('toolTitle').textContent = title; $('toolHint').innerHTML = hint;
  const host = $('toolBtns'); host.innerHTML = '';
  btns.forEach(([txt, cls, fn, dis]) => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.textContent = txt; b.disabled = !!dis; b.onclick = fn; host.appendChild(b); });
}

$('tLinde').onclick = lindeMenu;
$('tExcl').onclick = exclMenu;
$('tEdit').onclick = editMenu;
$('tPlan').onclick = planMenu;
$('tWork').onclick = workMenu;
$('bLay').onclick = () => { if (!busy() || work) capasSheet(); };
$('tInfo').onclick = () => { if (!busy()) infoSheet(); };
$('tAj').onclick = () => { if (busy()) return toast('Termina o cancela la operación en curso'); ajustesFinca(); };
// ⚙️ Ajustes de la finca: máquina (tractor, apero, cortacésped), ancho, velocidad, precios y ajustes generales
function ajustesFinca() {
  const f = cur, c = f.config || {}, S0 = effS(f), tr0 = getTr(c.tractorId), ap0 = getAp(c.aperoId), n = v => String(v ?? '').replace('.', ',');
  sheet(`<h3>⚙️ Ajustes · ${esc(f.nombre)}</h3>
    <div class="sgrp">Máquina de esta finca</div>
    <div class="card">
      <label class="f" style="margin-top:0">Tractor / máquina</label><select class="inp" id="ajTr">${CAT.tractores.map(t => `<option value="${t.id}" ${t.id === (tr0 && tr0.id) ? 'selected' : ''}>${icoTr(t)} ${esc(t.nombre)}</option>`).join('')}</select>
      <label class="f">Apero</label><select class="inp" id="ajAp">${CAT.aperos.map(a => `<option value="${a.id}" ${a.id === (ap0 && ap0.id) ? 'selected' : ''}>${esc(a.nombre)} · ${labNom(a.labor)}</option>`).join('')}</select>
      <div class="row"><div><label class="f">Ancho de trabajo (m)</label><input class="inp" id="ajAn" inputmode="decimal" value="${n(S0.aperoAncho)}"></div>
        <div><label class="f">Velocidad (km/h)</label><input class="inp" id="ajVe" inputmode="decimal" value="${n(S0.velocidad)}"></div></div>
      <button class="btn" id="ajOk" style="margin-top:10px">${f.linde ? 'Guardar y calcular plan' : 'Guardar'}</button>
      <button class="lnk" id="ajAlt" style="margin-top:6px">🔄 Probar otra máquina sin cambiar la finca (plan alternativo, más parámetros)</button>
    </div>
    <div class="sgrp">Más ajustes</div>
    <button class="opt" id="ajCat">🚜 Tractores, aperos y cortacéspedes<small>Añadir o modificar máquinas, medidas y velocidades.</small></button>
    <button class="opt" id="ajPre">💶 Precios: gasóleo ${fmt(+SB.precioGasoil, 2)} €/L · ${fmt(+SB.precioHora, 0)} €/h · margen ${fmt(+SB.margen || 0, 0)} % · ${fmt(+SB.precioKm || 0, 2)} €/km</button>
    <button class="opt" id="ajBase">🏠 Base de salida<small>${esc(SB.baseDir || '')}${SB.base ? '' : ' · sin situar'}${cur.traslado && SB.base ? ' · a ' + fmt(cur.traslado.km, 1) + ' km de esta finca' : ''}</small></button>
    <button class="opt" id="ajSeg">📐 Seguridad: antivuelco y aviso de caída<small>${incCfg().on ? 'Inclinómetro activo al trabajar' : 'Inclinómetro desactivado'}${incCfg().caida ? ' · aviso de caída' + (incCfg().telefono ? ' a ' + esc(incCfg().contacto || incCfg().telefono) : ' (sin contacto)') : ''}</small></button>
    <button class="opt" id="ajApr">🧠 Lo aprendido de tus rutas</button>
    <button class="opt" id="ajGen">⚙️ Ajustes generales<small>Voz, GPS, unidades, planificación, monte, copia de seguridad.</small></button>`,
    () => {
      $('ajAp').onchange = () => { const a = getAp($('ajAp').value); if (a) { $('ajAn').value = n(+a.ancho_m); $('ajVe').value = n(velProp(a, f.tipo)); } };
      $('ajTr').onchange = () => { const ap = aperoPara(getTr($('ajTr').value), getAp($('ajAp').value)); if (ap) { $('ajAp').value = ap.id; $('ajAp').onchange(); } };
      $('ajOk').onclick = async () => {
        const an = parseFloat($('ajAn').value.replace(',', '.')), ve = parseFloat($('ajVe').value.replace(',', '.')), ap = getAp($('ajAp').value);
        if (!(an > 0.1 && an < 15)) return toast('Ancho no válido'); if (!(ve > 0 && ve < 30)) return toast('Velocidad no válida');
        f.config = { ...c, tractorId: $('ajTr').value, aperoId: $('ajAp').value, velocidad: ve, ancho: Math.abs(an - (+ap.ancho_m || 0)) > 1e-9 ? an : null };
        if (!f.config.ancho) delete f.config.ancho;
        await saveCur(); applyS(); closeSheet();
        toast(`Máquina: ${getTr(f.config.tractorId).nombre} + ${ap.nombre} · ${fmt(S.aperoAncho, 2)} m · ${fmt(ve, 1)} km/h`, 3500);
        if (f.linde && !(f.tipo === 'monte' && !(f.malla && f.malla.arboles && f.malla.arboles.length))) { const o = f.planOpt || { dirMode: 'auto', nHMode: 'auto' }, pl0 = f.plan; runPlan(o, pl0 && pl0.inicio || null, pl0 && pl0.fin || null); }
      };
      $('ajAlt').onclick = () => recalcSheet();
      $('ajCat').onclick = () => catSheet();
      $('ajPre').onclick = () => sheet(`<h3>💶 Precios</h3>${preciosHTML()}<div class="note">Precio (sin IVA) = coste × ${fmt(margenK(), 2)}. Cada ruta guarda el precio del gasóleo del día en que se hizo.</div>`, () => preciosBind(() => toast('Precios guardados')));
      $('ajApr').onclick = () => aprendizajeSheet(f); $('ajSeg').onclick = () => seguridadSheet();
      $('ajBase').onclick = () => baseSheet(async () => { try { await trasladoFinca(f); } catch (e) { } if (f.traslado) toast(`🏠 Base a ${fmt(f.traslado.km, 1)} km de ${f.nombre}${f.traslado.min ? ' (' + f.traslado.min + ' min)' : ''}`, 4000); });
      $('ajGen').onclick = () => { closeSheet(); showSettings(true); };
    });
}

/* =========================================================
   ARRANQUE
   ========================================================= */
(async () => {
  try {
    await DB.open();
    const s = await DB.kvGet('settings'); if (s) SB = { ...DEF, ...s };
    if (SB.mapaBase && !['OpenStreetMap', 'OpenTopoMap'].includes(SB.mapaBase)) SB.mapaBase = 'OpenStreetMap';
    if (SB.ferrado === 437) { SB.ferrado = 436; await DB.kvPut('settings', SB); }   // ferrado de Abegondo
    const c = await DB.kvGet('capas'); if (c) CFG = { ...CFG_DEF, ...c };
    await loadCat(); applyS(); await migrarVelocidad();
  } catch (e) { toast('Error de almacenamiento: ' + e.message, 5000); }
  $('syncSt').onclick = () => Sync.state === 'err' ? diagnostico() : cuentaSheet(); $('lGo').onclick = doLogin; $('lPass').onkeydown = e => { if (e.key === 'Enter') doLogin(); };
  $('lOff').onclick = async () => { SB.offline = true; await DB.raw.kvPut('settings', SB); await seedCat(); applyS(); showList(); };
  let ses = null;
  try { ses = await Remote.session(); } catch (e) { }
  if (ses) { Sync.user = ses.user; Sync.paint(); await showList(); comprobarActivo(); Sync.pull().then(() => { if (view === 'list' && !document.querySelector('.sheet')) showList(); }); }
  else if (!SB.offline && window.supabase) { loginView(); }
  else { await seedCat(); applyS(); await showList(); comprobarActivo(); }
  almacenamiento().catch(() => {});   // pide que el navegador no borre los datos
  swRegistrar();
  subirErrores();
})();
window.LIMPFINC = { Geo, processTrack, DB, Planner, Sync, Remote, get CAT() { return CAT; }, get SB() { return SB; }, get map() { return map; }, get S() { return S; }, get cur() { return cur; } }; // para pruebas
