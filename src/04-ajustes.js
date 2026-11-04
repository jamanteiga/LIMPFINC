'use strict';
/* =========================================================
   AJUSTES
   ========================================================= */
function showSettings(desdeFinca) {
  const fv = desdeFinca && cur ? cur : null;
  view = 'set';
  if (fv) { stopGPS(); setHeader('‹ ' + fv.nombre, 'Ajustes', '', () => openFinca(fv.id)); $('mapWrap').classList.add('hidden'); $('bLay').classList.add('hidden'); }
  else setHeader('‹ Fincas', 'Ajustes', '', showList);
  $('vList').classList.add('hidden'); $('bNueva').classList.add('hidden'); $('vSet').classList.remove('hidden');
  let h = '';
  for (const [g, fields] of SET_FIELDS) {
    h += `<div class="sgrp">${g}</div><div class="card">`;
    for (const [k, lbl, t] of fields) {
      if (t === 'bool') h += `<div class="srow"><span>${lbl}</span><input type="checkbox" data-k="${k}" ${S[k] ? 'checked' : ''} style="width:auto"></div>`;
      else h += `<div class="srow"><span>${lbl}</span><input class="inp" data-k="${k}" ${t === 'text' ? '' : 'inputmode="decimal"'} value="${esc(t === 'text' ? S[k] : String(S[k]).replace('.', ','))}"></div>`;
    }
    h += '</div>';
  }
  h += `<div class="sgrp">Datos</div><div class="card">
    <button class="btn" id="bCat" style="margin-bottom:8px">🚜 Tractores, aperos y velocidades</button>
    <button class="btn sec" id="bCta" style="margin-bottom:8px">☁️ Cuenta y sincronización</button>
    <button class="btn sec" id="bGps" style="margin-bottom:8px">📡 Estado del GPS</button>
    <button class="btn sec" id="bFuel" style="margin-bottom:8px">⛽ Registrar repostaje (calibrar consumo)</button>
    <button class="btn sec" id="bExp" style="margin-bottom:8px">Exportar copia de seguridad (JSON)</button>
    <button class="btn sec" id="bImp" style="margin-bottom:8px">Importar copia de seguridad</button>
    <input type="file" id="fImp" accept=".json,application/json" class="hidden">
    <button class="btn sec" id="bAlm" style="margin-bottom:8px">💾 Datos del móvil, versión y registro de errores</button>
    <button class="btn sec" id="bDef">Restaurar valores por defecto</button></div>
    <div class="note" style="text-align:center">LIMPFINC ${VERSION}</div>`;
  $('setBody').innerHTML = h;
  $('setBody').querySelectorAll('[data-k]').forEach(inp => inp.onchange = async () => {
    const k = inp.dataset.k;
    if (inp.type === 'checkbox') S[k] = inp.checked;
    else if (typeof DEF[k] === 'string') S[k] = inp.value;
    else { const v = parseFloat(inp.value.replace(',', '.')); if (isFinite(v) && v >= 0) S[k] = v; else { toast('Valor no válido'); inp.value = String(S[k]).replace('.', ','); return; } }
    await saveSB(); toast('Guardado', 900);
  });
  $('bDef').onclick = () => confirmSheet('¿Restaurar todos los ajustes por defecto?', 'Restaurar', async () => { SB = { ...DEF, tractorDef: SB.tractorDef, aperoDef: SB.aperoDef }; await DB.kvPut('settings', SB); applyS(); showSettings(); });
  $('bExp').onclick = exportBackup; $('bAlm').onclick = almacenSheet;
  $('bFuel').onclick = repostajeSheet;
  $('bGps').onclick = gpsSheet; $('bCat').onclick = catSheet; $('bCta').onclick = cuentaSheet;
  $('bImp').onclick = () => $('fImp').click();
  $('fImp').onchange = importBackup;
}

async function exportBackup() {
  const data = { app: 'LIMPFINC', version: VERSION, fecha: new Date().toISOString(), settings: S, fincas: await DB.all(), trabajos: await DB.tAll(), repostajes: await DB.kvGet('repostajes'), filtros: await DB.kvGet('filtros') };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'LIMPFINC_' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
  SB.ultimaCopia = Date.now(); await DB.kvPut('settings', SB);
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
async function importBackup(e) {
  const file = e.target.files[0]; if (!file) return;
  try {
    const d = JSON.parse(await file.text());
    if (d.app !== 'LIMPFINC' || !Array.isArray(d.fincas)) throw 0;
    confirmSheet(`Importar ${d.fincas.length} finca(s)? Las que tengan el mismo identificador se sobrescriben.`, 'Importar', async () => {
      for (const f of d.fincas) await DB.put(f);
      for (const t of d.trabajos || []) await DB.tPut(t);
      if (d.repostajes) await DB.kvPut('repostajes', d.repostajes);
      if (d.filtros) await DB.kvPut('filtros', d.filtros);
      if (d.settings) { SB = { ...DEF, ...d.settings }; await DB.kvPut('settings', SB); applyS(); }
      toast('Importado'); showSettings();
    });
  } catch { toast('Archivo no válido'); }
  e.target.value = '';
}

