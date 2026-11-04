'use strict';
/* =========================================================
   LISTA DE FINCAS
   ========================================================= */
async function showList() {
  if (view === 'overview' && lyr.over) lyr.over.clearLayers();
  view = 'list'; cur = null; applyS();
  $('vLogin').classList.add('hidden');
  setHeader('📡 GPS', 'LIMPFINC', '⚙︎', gpsSheet, showSettings);
  $('vList').classList.remove('hidden'); $('bNueva').classList.remove('hidden');
  $('vSet').classList.add('hidden'); $('mapWrap').classList.add('hidden');
  const fs = (await DB.all()).sort((a, b) => b.mod - a.mod);
  const el = $('fincaList');
  const pend = Sync.user ? (await DB.gAll('outbox')).length : 0;
  const nube = !window.supabase ? `<div class="card warnc">⚠️ No se pudo cargar Supabase (¿sin conexión?). Los datos se guardan en el móvil. <button class="lnk" id="lRe" style="display:inline;margin:0">Reintentar</button></div>`
    : !Sync.user ? `<div class="card warnc">📱 Sin sesión: las fincas solo están en este móvil. <button class="lnk" id="lIn" style="display:inline;margin:0">Iniciar sesión</button></div>`
    : Sync.state === 'err' ? `<div class="card warnc">⚠️ Error al guardar en Supabase: ${esc(Sync.err)} <button class="lnk" id="lDg" style="display:inline;margin:0">Diagnóstico</button></div>`
    : pend ? `<div class="card warnc" style="background:#e3f2fd;color:#0d47a1">☁️ ${pend} cambio(s) pendiente(s) de subir…</div>` : '';
  const ver = `<div class="note" style="text-align:center;margin-top:14px">LIMPFINC v${VERSION} · ${Sync.user ? '☁️ ' + esc(Sync.user.email) + (Sync.last ? ' · sincronizado ' + new Date(Sync.last).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '') : '📱 solo este dispositivo'}</div>`;
  if (!fs.length) { el.innerHTML = nube + `<div class="empty">No hay fincas.<br>Pulsa «Nueva finca» para empezar<br>o importa una desde un archivo.</div><button class="btn sec" id="lImp">📥 Importar finca (.json, GeoJSON)</button>` + ver; bindNube(); return; }
  const ult = await DB.kvGet('ultima'), fu = fs.find(f => f.id === ult), estF = await estadoFincas();
  const MT = Object.fromEntries(fs.map(f => [f.id, estadoMant(f, (estF[f.id] || {}).ultima)])), nV = fs.filter(f => MT[f.id].st === 'venc').length, nP = fs.filter(f => MT[f.id].st === 'pronto').length;
  const diasCopia = SB.ultimaCopia ? Math.floor((Date.now() - SB.ultimaCopia) / 864e5) : null;
  const J = SB.jornada && SB.jornada.ids && Date.now() - SB.jornada.fecha < 864e5 * 2 ? SB.jornada : null, jSig = J ? J.ids.map(id => fs.find(f => f.id === id)).find(f => f && !((estF[f.id] || {}).ultima > J.fecha)) : null;
  const avisos = (nV || nP ? `<div class="card warnc" style="${nV ? '' : 'background:#fff3e0;color:#e65100'}">🗓 ${nV ? `<b>${nV}</b> finca${nV > 1 ? 's' : ''} con la limpieza vencida` : ''}${nV && nP ? ' · ' : ''}${nP ? `<b>${nP}</b> vence${nP > 1 ? 'n' : ''} en menos de 30 días` : ''}</div>` : '')
    + (jSig ? `<button class="card lastc" id="lJor" style="background:#f3e5f5"><span style="font-size:24px">🗓</span><span>Jornada: siguiente finca<small>${esc(jSig.nombre)}</small></span></button>` : '')
    + (fs.length && (diasCopia == null || diasCopia >= 7) ? `<div class="card" style="background:#e3f2fd;color:#0d47a1;font-size:14px">💾 ${diasCopia == null ? 'Aún no has descargado ninguna copia de seguridad' : `Hace ${diasCopia} días de la última copia de seguridad`}. <button class="lnk" id="lCop" style="display:inline;margin:0">Descargar ahora</button></div>` : '');
  const top = (fu ? `<button class="card lastc" id="lLast"><span style="font-size:24px">▶</span><span>Continuar con ${esc(fu.nombre)}<small>${fu.linde ? fmtArea(fincaAreas(fu).neta) : 'sin linde'}${fu.plan ? ' · plan ' + fmtH(fu.plan.stats.t.total / 3600) : ''}</small></span></button>` : '')
    + `<div class="row" style="margin-bottom:10px"><button class="btn sec" id="lMap">🗺 Mapa de fincas</button><button class="btn sec" id="lJo">🗓 Jornada</button><button class="btn sec" id="lImp">📥 Importar</button></div><div class="row" style="margin:-4px 0 10px"><button class="btn sec" id="lInf">📄 Informe / 📊 Excel</button><button class="btn sec" id="lPel">⚠️ Exportar peligros</button></div>`;
  el.innerHTML = nube + avisos + top + (fs.length > 4 ? `<input class="inp" id="fBus" placeholder="🔍 Buscar finca…" style="margin-bottom:10px">` : '') + fs.map(f => {
    const a = fincaAreas(f), c = f.config || {};
    return `<div class="card fcard" data-n="${esc(normName(f.nombre))}"><div class="finca" data-id="${f.id}">
      <div class="ic">${f.tipo === 'monte' ? '🌲' : '🌾'}</div>
      <div style="flex:1;min-width:0"><div class="t">${esc(f.nombre)}</div>
      <div class="s"><span style="color:${MT[f.id].col}">●</span> ${f.tipo === 'monte' ? 'Monte' : 'Abierta'} · ${f.linde ? fmtArea(a.neta) : 'sin linde'} · ${fmt(+c.velocidad || SB.velocidad || 3, 1)} km/h${f.plan ? '<br>Plan ' + fmtH(f.plan.stats.t.total / 3600) + ' · ' + fmt(f.plan.stats.litros, 1) + ' L' : ''}${Sync.user && !f._sync ? ' · <span style="color:var(--warn)">sin subir</span>' : ''}</div></div>
      <div style="color:#c7c7cc;font-size:22px">›</div></div>
      <div class="facts"><button data-a="edit" data-f="${f.id}">✎ Editar</button><button data-a="copy" data-f="${f.id}">⧉ Copiar</button><button data-a="exp" data-f="${f.id}">📤 Exportar</button><button data-a="del" data-f="${f.id}" class="rojo">🗑 Eliminar</button><button class="fmore" data-m="${f.id}" aria-label="Más opciones">⋯</button></div></div>`;
  }).join('') + ver;
  el.querySelectorAll('.finca').forEach(c => c.onclick = e => { if (e.target.closest('.fmore')) return; openFinca(c.dataset.id); });
  el.querySelectorAll('.fmore').forEach(b => b.onclick = () => fincaAcciones(fs.find(f => f.id === b.dataset.m)));
  el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    const f = fs.find(x => x.id === b.dataset.f); if (!f) return;
    if (b.dataset.a === 'edit') { cur = f; applyS(); fincaForm(f, true); }
    else if (b.dataset.a === 'copy') copiarFinca(f);
    else if (b.dataset.a === 'exp') exportarFincaJSON(f);
    else if (b.dataset.a === 'del') confirmSheet(`¿Eliminar «${esc(f.nombre)}» y todos sus trabajos?`, 'Eliminar', () => borrarFinca(f), true);
  });
  if ($('lLast')) $('lLast').onclick = () => openFinca(fu.id);
  avisoInstalar(el);
  $('lMap').onclick = verMapaFincas; $('lJo').onclick = jornadaSheet; $('lInf').onclick = () => informeSheet(null); $('lPel').onclick = () => exportPelSheet(null);
  if ($('lJor')) $('lJor').onclick = () => openFinca(jSig.id);
  if ($('lCop')) $('lCop').onclick = async () => { await exportBackup(); showList(); };
  el.querySelectorAll('.fcard').forEach(c => { const id = c.querySelector('.finca').dataset.id, m = MT[id]; if (m && m.st !== 'nunca') c.querySelector('.s').insertAdjacentHTML('beforeend', `<br><span style="color:${m.col};font-size:13px">Limpieza: ${m.txt}</span>`); });
  if ($('fBus')) $('fBus').oninput = e => { const q = normName(e.target.value); el.querySelectorAll('.fcard').forEach(c => c.classList.toggle('hidden', !!q && !c.dataset.n.includes(q))); };
  bindNube();
}
function bindNube() {
  if ($('lImp')) $('lImp').onclick = () => $('fImpF').click();
  if ($('lRe')) $('lRe').onclick = () => location.reload();
  if ($('lIn')) $('lIn').onclick = () => loginView();
  if ($('lDg')) $('lDg').onclick = diagnostico;
}
// acciones sobre una finca desde la lista
function fincaAcciones(f) {
  sheet(`<h3>${f.tipo === 'monte' ? '🌲' : '🌾'} ${esc(f.nombre)}</h3>
    <button class="opt" id="aOpen">🗺 Abrir en el mapa</button>
    <button class="opt" id="aEdit">✎ Editar (nombre, tipo, tractor, apero, velocidad)</button>
    ${f.linde ? '<button class="opt" id="aRec">🔄 Recalcular plan (velocidad y parámetros)</button>' : ''}
    <button class="opt" id="aNot">📝 Notas y fotos</button>
    <button class="opt" id="aExp">📤 Exportar finca (.json para importar)</button>
    ${f.linde ? '<button class="opt" id="aTie">🌦 Tiempo (5 días)</button>' : ''}
    <button class="opt" id="aCopy">⧉ Copiar finca<small>Duplica linde, exclusiones, árboles, plan y configuración (sin trabajos).</small></button>
    <button class="opt" id="aDel" style="color:var(--err)">🗑 Eliminar</button>`,
    () => {
      $('aOpen').onclick = () => { closeSheet(); openFinca(f.id); };
      $('aEdit').onclick = () => { cur = f; applyS(); fincaForm(f, true); };
      if ($('aRec')) $('aRec').onclick = () => { cur = f; applyS(); recalcSheet(true); };
      $('aCopy').onclick = () => copiarFinca(f);
      $('aDel').onclick = () => confirmSheet(`¿Eliminar «${esc(f.nombre)}» y todos sus trabajos?`, 'Eliminar', () => borrarFinca(f), true);
      $('aNot').onclick = () => notasSheet(f);
      $('aExp').onclick = () => { closeSheet(); exportarFincaJSON(f); };
      if ($('aTie')) $('aTie').onclick = () => tiempoSheet(f);
    });
}
async function copiarFinca(f) {
  let nombre = f.nombre + ' (copia)', n = 2;
  while (await findByName(nombre)) nombre = `${f.nombre} (copia ${n++})`;
  sheet(`<h3>Copiar finca</h3><label class="f">Nombre de la copia</label><input class="inp" id="cpN" value="${esc(nombre)}">
    <button class="btn" id="cpOk" style="margin-top:12px">Crear copia</button>`, () => {
    $('cpOk').onclick = async () => {
      const nm = $('cpN').value.trim(); if (!nm) return toast('Indica un nombre');
      if (await findByName(nm)) return toast('Ya existe una finca con ese nombre');
      const c = JSON.parse(JSON.stringify(f)); delete c._sync;
      Object.assign(c, { id: uid(), nombre: nm, creada: Date.now() });
      await DB.put(c); closeSheet(); toast('Copia creada: ' + nm); if (view === 'list') showList(); else openFinca(c.id);
    };
  });
}

function setHeader(left, title, right, onL, onR) {
  const enFinca = left === '‹ Fincas';
  $('hTitle').classList.toggle('sw', enFinca); $('hTitle').onclick = enFinca ? () => { if (!busy()) fincaSwitcher(); } : null;
  $('hLeft').textContent = left; $('hTitle').textContent = title; $('hRight').textContent = right;
  $('hLeft').onclick = onL || null; $('hRight').onclick = onR || null;
}

$('bNueva').onclick = nuevaFinca;
$('fImpF').onchange = async e => { const file = e.target.files[0]; e.target.value = ''; if (file) importarFincas(file); };

const normName = n => n.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
async function findByName(nombre, exceptId) { const k = normName(nombre); return (await DB.all()).find(f => normName(f.nombre) === k && f.id !== exceptId); }

/* Alta: 1) nombre → 2) si no existe, tipo y modo de medición del linde */
function nuevaFinca() {
  sheet(`<h3>Nueva finca</h3>
    <label class="f">Nombre de la finca</label><input class="inp" id="nNom" placeholder="p. ej. Leira do Souto" autocomplete="off">
    <button class="btn" id="nOk" style="margin-top:14px">Continuar</button>
    <div class="note" style="margin:16px 0 6px;text-align:center">o bien</div>
    <button class="opt" id="nAqui" style="border:2px solid var(--pri)">📍 Estoy en la finca: elegirla en el mapa SIGPAC<small>El mapa se abre en tu posición GPS con las parcelas SIGPAC; tocas la tuya y listo.</small></button>
    <button class="opt" id="nImp">📥 Importar finca desde archivo<small>.json de LIMPFINC, copia de seguridad o GeoJSON</small></button>
    <button class="opt" id="nSig">🗺 Desde SIGPAC / referencia catastral<small>Descarga el linde oficial de la parcela</small></button>`,
    () => {
      $('nImp').onclick = () => { closeSheet(); $('fImpF').click(); };
      $('nAqui').onclick = async () => {
        const nombre = $('nNom').value.trim();
        if (nombre) { const ex = await findByName(nombre); if (ex) { closeSheet(); toast(`«${ex.nombre}» ya existe: se abre`); openFinca(ex.id); return; } }
        closeSheet(); sigpacMapa({ nombre, aqui: true });
      };
      $('nSig').onclick = async () => {
        const nombre = $('nNom').value.trim();
        if (nombre) { const ex = await findByName(nombre); if (ex) { closeSheet(); toast(`«${ex.nombre}» ya existe: se abre`); openFinca(ex.id); return; } }
        sigpacSheet({ nombre });
      };
      const go = async () => {
        const nombre = $('nNom').value.trim(); if (!nombre) return toast('Indica un nombre');
        const ex = await findByName(nombre);
        if (ex) { closeSheet(); toast(`«${ex.nombre}» ya existe: se abre`); openFinca(ex.id); return; }
        nuevaFincaMedir(nombre);
      };
      $('nOk').onclick = go; $('nNom').onkeydown = e => { if (e.key === 'Enter') go(); };
      setTimeout(() => $('nNom').focus(), 50);
    });
}
// campos de configuración comunes a alta y edición
function cfgHTML(cfg, tipo) {
  return `<label class="f">Tipo</label>
    <div class="seg" id="xTipo"><button data-v="abierta">🌾 Abierta</button><button data-v="monte">🌲 Monte / plantación</button></div>
    <label class="f">Tractor / máquina</label><select class="inp" id="xTr">${CAT.tractores.map(t => `<option value="${t.id}" ${t.id === cfg.tractorId ? 'selected' : ''}>${icoTr(t)} ${esc(t.nombre)}</option>`).join('')}</select>
    <label class="f">Apero</label><select class="inp" id="xAp">${CAT.aperos.map(a => `<option value="${a.id}" ${a.id === cfg.aperoId ? 'selected' : ''}>${esc(a.nombre)} · ${labNom(a.labor)}</option>`).join('')}</select>
    <div class="row"><div><label class="f">Vegetación</label><select class="inp" id="xVeg">${VEGET.map(([v, n]) => `<option value="${v}" ${v === (cfg.vegetacion || 'media') ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <div><label class="f">Velocidad de trabajo (km/h)</label><input class="inp" id="xVel" inputmode="decimal" value="${String(cfg.velocidad || 3).replace('.', ',')}"></div></div>
    <div class="note" id="xStd"></div>`;
}
function cfgBind(cfg, tipo, onTipo) {
  const seg = $('xTipo'), paint = () => seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === tipo));
  seg.querySelectorAll('button').forEach(b => b.onclick = () => { const v0 = parseFloat($('xVel').value.replace(',', '.')); if (Math.abs(v0 - velDef(tipo)) < 1e-6) $('xVel').value = String(velDef(b.dataset.v)).replace('.', ','); tipo = b.dataset.v; paint(); onTipo && onTipo(tipo); }); paint();
  const std = () => { const ap = getAp($('xAp').value), v = ap && velStd(ap.labor, $('xVeg').value); $('xStd').innerHTML = v ? `Estándar ${labNom(ap.labor).toLowerCase()} · vegetación ${vegNom($('xVeg').value).toLowerCase()}: <b>${fmt(v, 1)} km/h</b> <button class="lnk" id="xUse" style="display:inline;margin:0 0 0 6px">usar</button>` : ''; if ($('xUse')) $('xUse').onclick = () => { $('xVel').value = String(v).replace('.', ','); }; };
  $('xVeg').onchange = std; std();
  $('xAp').onchange = () => { $('xVel').value = String(velProp(getAp($('xAp').value), tipo)).replace('.', ','); std(); };
  $('xTr').onchange = () => { const ap = aperoPara(getTr($('xTr').value), getAp($('xAp').value)); if (ap && ap.id !== $('xAp').value) { $('xAp').value = ap.id; toast('Apero: ' + ap.nombre); } $('xAp').onchange(); };
  return () => { const v = parseFloat($('xVel').value.replace(',', '.')); if (!(v > 0 && v < 30)) { toast('Velocidad no válida'); return null; } return { tipo, cfg: { tractorId: $('xTr').value, aperoId: $('xAp').value, vegetacion: $('xVeg').value, velocidad: v } }; };
}
// v2.1: exclusiones sin número fijo: «¿hay exclusiones?» Sí/No; se añaden una tras otra hasta «No hay más»
const exclAbiertas = f => f.exclPend != null ? !!f.exclPend : (+f.exclObj || 0) > (f.exclusiones || []).length;
const exclStepHTML = (id, on) => `<div class="srow"><span>¿Hay zonas de exclusión?<br><small style="color:var(--sub)">Rocas, pozos, edificaciones, árboles aislados… Las que sean: se miden una tras otra.</small></span>
  <span class="seg" id="${id}" style="width:auto;margin:0"><button data-v="0" class="${on ? '' : 'on'}" style="padding:8px 12px">No</button><button data-v="1" class="${on ? 'on' : ''}" style="padding:8px 12px">Sí</button></span></div>`;
function exclStepBind(id, onCh) { const el = $(id); let v = !!el.querySelector('[data-v="1"].on'); el.querySelectorAll('button').forEach(b => b.onclick = () => { v = b.dataset.v === '1'; el.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); onCh && onCh(v); }); return () => v; }
// guía: tras medir el linde o una exclusión, propone la siguiente hasta completar las indicadas
function guiaExcl(trasMedir) {
  if (!cur || !cur.linde) return;
  if (trasMedir && guiaMalla()) return;
  const n = (cur.exclusiones || []).length;
  if (!exclAbiertas(cur)) return;
  setTimeout(() => sheet(`<h3>Exclusión ${n + 1}</h3>
    <div class="note" style="margin-bottom:8px">${n ? `Llevas <b>${n}</b> medida${n > 1 ? 's' : ''}. ` : ''}Mide la siguiente zona que no se debe pisar. Añade todas las que haya; cuando acabes pulsa «No hay más».</div>
    ${exclMetodosHTML()}
    <button class="opt" id="gNo" style="color:var(--ok,#2a2)">✅ No hay más exclusiones<small>Cerrar con ${n} medida${n === 1 ? '' : 's'}. Podrás añadir más en ⋯ › Exclusiones.</small></button>
    <button class="opt" id="gLuego" style="color:var(--sub)">Más tarde<small>Se recordará al calcular el plan.</small></button>`,
    () => {
      exclMetodosBind(document.querySelector('.sheet'));
      $('gLuego').onclick = closeSheet;
      $('gNo').onclick = async () => { cur.exclPend = false; await saveCur(); closeSheet(); toast(`✅ Exclusiones cerradas: ${n}. Ya puedes calcular el plan.`, 3500); };
    }), trasMedir ? 700 : 0);
}
function nuevaFincaMedir(nombre) {
  const cfg0 = { tractorId: SB.tractorDef || (CAT.tractores[0] || {}).id, aperoId: SB.aperoDef || (CAT.aperos[0] || {}).id, vegetacion: 'media', velocidad: velDef('abierta') };
  let leer;
  sheet(`<h3>${esc(nombre)}</h3><div class="note" style="margin-bottom:6px">Finca nueva: configúrala y elige cómo medir su superficie.</div>
    ${cfgHTML(cfg0, 'abierta')}
    ${exclStepHTML('nExN', false)}
    <label class="f">Medición del linde</label>
    <button class="opt" id="nPie">🚶 A pie<small>Recorre el linde con el iPhone. Máxima precisión.</small></button>
    <button class="opt" id="nTrac">🚜 Con tractor<small>Recorre el interior junto al linde; se corrige hacia fuera.</small></button>
    <button class="opt" id="nSigM">🗺 Desde SIGPAC / referencia catastral<small>Linde oficial de la parcela, sin recorrerla.</small></button>
    <button class="opt" id="nFile">📥 Linde desde archivo<small>.json o GeoJSON con el contorno.</small></button>
    <button class="opt" id="nLuego" style="color:var(--sub)">Más tarde<small>Crear la finca sin medir.</small></button>`,
    () => {
      leer = cfgBind(cfg0, 'abierta'); const leerEx = exclStepBind('nExN');
      const crear = async modo => {
        const v = leer(); if (!v) return;
        const now = Date.now(), nf = { id: uid(), nombre, tipo: v.tipo, config: v.cfg, notas: '', creada: now, mod: now, linde: null, exclusiones: [], exclPend: leerEx() };
        await DB.put(nf); closeSheet(); await openFinca(nf.id);
        if (modo === 'pie') startRec('linde', 'pie'); else if (modo === 'tractor') tractorSetup();
        else if (modo === 'sigpac') sigpacSheet({ actual: true }); else if (modo === 'file') lindeArchivo();
      };
      $('nSigM').onclick = () => crear('sigpac'); $('nFile').onclick = () => crear('file');
      $('nPie').onclick = () => crear('pie'); $('nTrac').onclick = () => crear('tractor'); $('nLuego').onclick = () => crear(null);
    });
}
function fincaForm(f, desdeLista) {
  const cfg0 = { ...(f.config || {}) }; let leer;
  sheet(`<h3>Editar finca</h3>
    <label class="f">Nombre</label><input class="inp" id="fNom" value="${esc(f.nombre)}">
    ${cfgHTML(cfg0, f.tipo)}
    ${exclStepHTML('fExN', exclAbiertas(f))}
    <div class="note">${(f.exclusiones || []).length} medida(s).</div>
    <div class="sgrp">Mantenimiento</div>
    <div class="srow"><span>Volver a limpiar cada (meses)</span><input class="inp" id="fMm" inputmode="numeric" value="${(f.mant && f.mant.meses) || 12}" style="width:80px;text-align:right"></div>
    <div class="srow"><span>Franja contra incendios (limpia antes del 31 de mayo)</span><input type="checkbox" id="fMi" ${f.mant && f.mant.incendios ? 'checked' : ''} style="width:auto"></div>
    <div class="srow"><span>Última limpieza hecha sin la app</span><input class="inp" type="date" id="fMu" value="${f.mant && f.mant.ultimaManual ? new Date(f.mant.ultimaManual).toISOString().slice(0, 10) : ''}" style="width:160px"></div>
    <label class="f">Notas</label><input class="inp" id="fNot" value="${esc(f.notas || '')}">
    <div class="row" style="margin-top:14px"><button class="btn err" id="fDel">Eliminar</button><button class="btn" id="fOk">Guardar</button></div>`,
    () => {
      leer = cfgBind(cfg0, f.tipo); const leerEx = exclStepBind('fExN');
      $('fOk').onclick = async () => {
        const nombre = $('fNom').value.trim(); if (!nombre) { toast('Indica un nombre'); return; }
        if (await findByName(nombre, f.id)) return toast('Ya existe otra finca con ese nombre');
        const v = leer(); if (!v) return;
        const cambio = JSON.stringify(v.cfg) !== JSON.stringify({ tractorId: cfg0.tractorId, aperoId: cfg0.aperoId, vegetacion: cfg0.vegetacion || 'media', velocidad: cfg0.velocidad }) || v.tipo !== f.tipo;
        Object.assign(f, { nombre, tipo: v.tipo, config: v.cfg, notas: $('fNot').value.trim(), exclPend: leerEx(), mant: { meses: Math.max(1, parseInt($('fMm').value) || 12), incendios: $('fMi').checked, ultimaManual: $('fMu').value ? Date.parse($('fMu').value + 'T12:00') : null } });
        delete f.refCat;
        await DB.put(f); closeSheet(); cur = f; applyS();
        if (cambio && f.plan) await recalcPlan();
        if (desdeLista) { showList(); return; } setHeader('‹ Fincas', f.nombre, '⋯', volverLista, fincaMenu);
        if (!guiaMalla()) guiaExcl();
      };
      $('fDel').onclick = () => confirmSheet(`¿Eliminar «${esc(f.nombre)}» y todos sus datos?`, 'Eliminar', () => borrarFinca(f), true);
      if (desdeLista) $('fOk').insertAdjacentHTML('beforebegin', '');
    });
}

function fincaAreas(f) {
  const bruta = f.linde ? Geo.areaLL(f.linde.coords) : 0;
  const excl = (f.exclusiones || []).reduce((s, e) => s + Geo.areaLL(e.coords), 0);
  return { bruta, excl, neta: Math.max(0, bruta - excl), perim: f.linde ? Geo.perimLL(f.linde.coords) : 0 };
}

