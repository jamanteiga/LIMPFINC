'use strict';
/* =========================================================
   CATÁLOGO: tractores, aperos y velocidades estándar
   ========================================================= */
let CAT = { tractores: [], aperos: [], velocidades: [] };
const LABORES = [['desbroce', 'Desbroce'], ['trituracion', 'Trituración'], ['siega', 'Siega'], ['grada', 'Grada'], ['arado', 'Arado'], ['cultivador', 'Cultivador'], ['fresado', 'Fresado'], ['cesped', 'Corte de césped'], ['otro', 'Otra labor']];
const VEGET = [['ligera', 'Ligera'], ['media', 'Media'], ['densa', 'Densa']];
// velocidades orientativas (km/h) por labor y vegetación: ligera, media, densa — editables
const VEL_STD = { desbroce: [3.5, 3.0, 2.0], trituracion: [2.5, 2.0, 1.5], siega: [6, 5, 4], grada: [8, 7, 6], arado: [5, 4.5, 4], cultivador: [7, 6, 5], fresado: [3, 2.5, 2], cesped: [6, 5, 3.5], otro: [4, 3, 2.5] };
const labNom = k => (LABORES.find(l => l[0] === k) || [k, k])[1];
const vegNom = k => (VEGET.find(l => l[0] === k) || [k, k])[1];
const TIPOS_TR = [['agricola', '🚜', 'Tractor agrícola'], ['cortacesped', '🛻', 'Tractor cortacésped'], ['pie', '🚶', 'Cortacésped a pie (convencional)'], ['motocultor', '⚙️', 'Motocultor / desbrozadora de operario']];
const tipoTr = t => !t ? 'agricola' : t.tipo || (+t.radio_giro_m < 1 && +t.ancho_m < 1 ? 'pie' : +t.radio_giro_m < 2 ? 'cortacesped' : 'agricola');
const icoTr = t => (TIPOS_TR.find(x => x[0] === tipoTr(t)) || TIPOS_TR[0])[1];
const nomTipoTr = t => (TIPOS_TR.find(x => x[0] === tipoTr(t)) || TIPOS_TR[0])[2];
// velocidad propuesta al elegir máquina: la del apero (césped, etc.); en desbroce, la del tipo de finca
const velProp = (ap, tipoF) => ap && ap.labor !== 'desbroce' && +ap.velocidad_kmh > 0 ? +ap.velocidad_kmh : velDef(tipoF);
// apero adecuado al cambiar de máquina (cortacésped a pie → cortacésped convencional…)
function aperoPara(tr, apActual) {
  const ti = tipoTr(tr), ces = CAT.aperos.filter(a => a.labor === 'cesped').sort((a, b) => a.ancho_m - b.ancho_m);
  if (ti === 'pie' || ti === 'motocultor') return (apActual && apActual.labor === 'cesped' && apActual.ancho_m <= 0.8) ? apActual : ces.find(a => a.id === 'ap-cesped-053') || ces[0] || apActual;
  if (ti === 'cortacesped') return apActual && apActual.labor === 'cesped' ? apActual : ces[ces.length - 1] || apActual;
  return apActual && apActual.labor === 'cesped' ? getAp(SB.aperoDef) : apActual;
}
const TR_FIELDS = [['nombre', 'Modelo', 'text'], ['tipo', 'Tipo de máquina', 'ttipo'], ['potencia_cv', 'Potencia (CV)'], ['ancho_m', 'Ancho (m)'], ['longitud_m', 'Longitud sin apero (m)'], ['radio_giro_m', 'Radio de giro mínimo (m)'], ['deposito_l', 'Depósito de gasoil (L)'], ['marcha_atras', 'Maniobras con marcha atrás', 'bool'], ['notas', 'Notas', 'text']];
const AP_FIELDS = [['nombre', 'Nombre', 'text'], ['labor', 'Labor', 'labor'], ['ancho_m', 'Ancho de trabajo (m)'], ['longitud_m', 'Longitud del apero (m)'], ['enganche', 'Enganche', 'enganche'], ['distancia_gps_m', 'Distancia iPhone → centro del apero (m)'], ['desplazamiento_m', 'Desplazamiento lateral (m, + derecha)'], ['solape_m', 'Solape entre pasadas (m)'], ['velocidad_kmh', 'Velocidad de trabajo típica (km/h)'], ['consumo_lh', 'Consumo con este apero (L/h)'], ['potencia_cv', 'Potencia necesaria (CV)'], ['tdf_rpm', 'Toma de fuerza (rpm)'], ['notas', 'Notas', 'text']];

async function loadCat() { for (const k of Object.keys(CAT)) CAT[k] = (await DB.gAll(k)).sort((a, b) => String(a.nombre || a.labor).localeCompare(String(b.nombre || b.labor))); }
async function seedCat() {
  let ch = false;
  if (!CAT.tractores.length) {
    const t = { id: uid(), nombre: SB.tractor || 'New Holland TN95F', potencia_cv: SB.potencia || 95, ancho_m: SB.anchoTractor || 1.7, longitud_m: 3.5, radio_giro_m: SB.radioGiro || 4, deposito_l: null, marcha_atras: SB.marchaAtras !== false, notas: '' };
    await DB.cPut('tractores', t); SB.tractorDef = t.id; ch = true;
  }
  if (!CAT.aperos.length) {
    const a = { id: uid(), nombre: (SB.aperoNombre || 'Desbrozadora de cadenas') + ' ' + fmt(SB.aperoAncho || 1.7, 2) + ' m', labor: 'desbroce', ancho_m: SB.aperoAncho || 1.7, longitud_m: Math.max(0.5, (SB.longTractorApero || 5) - 3.5), enganche: 'suspendido', distancia_gps_m: SB.offsetApero || 2, desplazamiento_m: 0, solape_m: SB.solape ?? 0.1, velocidad_kmh: 3.0, consumo_lh: SB.consumo || 5, potencia_cv: null, tdf_rpm: 540, notas: '' };
    await DB.cPut('aperos', a); SB.aperoDef = a.id; ch = true;
  }
  if (!CAT.velocidades.length) {
    for (const [lab] of LABORES) for (let i = 0; i < 3; i++) await DB.cPut('velocidades', { id: uid(), labor: lab, vegetacion: VEGET[i][0], velocidad_kmh: VEL_STD[lab][i], notas: 'orientativa' });
    ch = true;
  }
  if (ch) { await loadCat(); await DB.kvPut('settings', SB); }
  await asegurarCortacesped();
}
const velStd = (labor, veg) => { const v = CAT.velocidades.find(x => x.labor === labor && x.vegetacion === (veg || 'media')); return v ? +v.velocidad_kmh : null; };
const getTr = id => CAT.tractores.find(x => x.id === id) || CAT.tractores.find(x => x.id === SB.tractorDef) || CAT.tractores[0];
const getAp = id => CAT.aperos.find(x => x.id === id) || CAT.aperos.find(x => x.id === SB.aperoDef) || CAT.aperos[0];

/* Ajustes efectivos: generales + tractor + apero + velocidad de la finca (o del trabajo) */
const DERIVED = ['tractor', 'potencia', 'radioGiro', 'marchaAtras', 'aperoNombre', 'aperoAncho', 'offsetApero', 'desplazamiento', 'solape', 'consumo', 'anchoTractor', 'longTractorApero', 'labor'];
function effS(f, cfg) {
  const c = cfg || (f && f.config) || {}, tr = getTr(c.tractorId), ap = getAp(c.aperoId), o = { ...SB };
  o.tractorId = tr ? tr.id : null; o.aperoId = ap ? ap.id : null; o.tipoTractor = tipoTr(tr);
  if (tr) Object.assign(o, { tractor: tr.nombre, potencia: +tr.potencia_cv || 0, anchoTractor: +tr.ancho_m || 1.7, radioGiro: +tr.radio_giro_m || 4, marchaAtras: tr.marcha_atras !== false });
  if (ap) Object.assign(o, { aperoNombre: ap.nombre, aperoAncho: +ap.ancho_m || 1.7, offsetApero: +ap.distancia_gps_m || 0, desplazamiento: +ap.desplazamiento_m || 0, solape: +ap.solape_m || 0, consumo: +ap.consumo_lh || SB.consumo, labor: ap.labor });
  o.longTractorApero = (tr ? +tr.longitud_m || 3.5 : 3.5) + (ap ? +ap.longitud_m || 1.5 : 1.5);
  o.velocidad = +c.velocidad || velDef(f && f.tipo);
  // ajustes propios de la finca (opcionales): solape, consumo, velocidad en giros
  if (c.solape != null && c.solape !== '') o.solape = +c.solape;
  if (+c.ancho > 0) o.aperoAncho = +c.ancho;
  if (+c.consumo > 0) o.consumo = +c.consumo;
  if (+c.velGiro > 0) o.velocidadGiro = +c.velGiro;
  return o;
}
function applyS() { S = effS(cur); }
async function saveSB() {
  const c = (cur && cur.config) || {};
  for (const k of Object.keys(S)) { if (DERIVED.includes(k) || (k === 'velocidad' && cur) || (k === 'velocidadGiro' && +c.velGiro > 0)) continue; SB[k] = S[k]; }
  await DB.kvPut('settings', SB);
}

/* ---------- UI del catálogo ---------- */
function catSheet() {
  const card = (list, kind) => list.map(o => `<button class="opt" data-k="${kind}" data-id="${o.id}">${kind === 'tractores' ? icoTr(o) : '🔧'} ${esc(o.nombre)}${(kind === 'tractores' ? SB.tractorDef : SB.aperoDef) === o.id ? ' <b style="color:var(--pri)">· predeterminado</b>' : ''}
    <small>${kind === 'tractores' ? `${nomTipoTr(o)} · ${fmt(+o.potencia_cv || 0, 0)} CV · ancho ${fmt(+o.ancho_m, 2)} m · radio ${fmt(+o.radio_giro_m, 1)} m` : `${labNom(o.labor)} · ${fmt(+o.ancho_m, 2)} m · ${fmt(+o.velocidad_kmh || 0, 1)} km/h · ${fmt(+o.consumo_lh || 0, 1)} L/h`}</small></button>`).join('');
  sheet(`<h3>Tractores, aperos y velocidades</h3>
    <div class="sgrp">Tractores</div>${card(CAT.tractores, 'tractores')}<button class="btn sec" id="cNT" style="margin-bottom:6px">＋ Nuevo tractor</button>
    <div class="sgrp">Aperos</div>${card(CAT.aperos, 'aperos')}<button class="btn sec" id="cNA" style="margin-bottom:6px">＋ Nuevo apero</button>
    <div class="sgrp">Velocidades estándar</div><button class="opt" id="cVel">📏 Velocidad por labor y vegetación<small>Valores orientativos editables; se proponen al crear o editar una finca.</small></button>
    <div class="note">${Sync.user ? '☁️ Se guardan en Supabase.' : '📱 Solo en este dispositivo (sin sesión de Supabase).'}</div>`,
    sh => {
      sh.querySelectorAll('[data-k]').forEach(b => b.onclick = () => catForm(b.dataset.k, CAT[b.dataset.k].find(o => o.id === b.dataset.id)));
      $('cNT').onclick = () => plantillaSheet('tractores'); $('cNA').onclick = () => plantillaSheet('aperos'); $('cVel').onclick = velSheet;
    });
}
const PLANTILLAS = {
  tractores: [
    { nombre: 'Tractor cortacésped', tipo: 'cortacesped', potencia_cv: 22, ancho_m: 1.2, longitud_m: 2.4, radio_giro_m: 0.9, deposito_l: 12, marcha_atras: true, notas: 'Plantilla: ajústala a tu máquina' },
    { nombre: 'Cortacésped autopropulsado (a pie)', tipo: 'pie', potencia_cv: 4, ancho_m: 0.6, longitud_m: 1.6, radio_giro_m: 0.4, deposito_l: 1.5, marcha_atras: true, notas: 'Plantilla: el iPhone lo lleva el operario' }],
  aperos: [
    { nombre: 'Cortacésped 1,07 m', labor: 'cesped', ancho_m: 1.07, longitud_m: 0.8, enganche: 'suspendido', distancia_gps_m: 0.6, desplazamiento_m: 0, solape_m: 0.08, velocidad_kmh: 5, consumo_lh: 1.8, potencia_cv: 20, tdf_rpm: null, notas: 'Plantilla: ajusta ancho de corte y velocidad' },
    { nombre: 'Cortacésped 0,53 m', labor: 'cesped', ancho_m: 0.53, longitud_m: 0.6, enganche: 'suspendido', distancia_gps_m: 0.5, desplazamiento_m: 0, solape_m: 0.05, velocidad_kmh: 3.5, consumo_lh: 0.6, potencia_cv: 4, tdf_rpm: null, notas: 'Plantilla' },
    { nombre: 'Desbrozadora de martillos 1,60 m', labor: 'trituracion', ancho_m: 1.6, longitud_m: 1.2, enganche: 'suspendido', distancia_gps_m: 2, desplazamiento_m: 0, solape_m: 0.1, velocidad_kmh: 3, consumo_lh: 6, potencia_cv: 50, tdf_rpm: 540, notas: 'Plantilla' }]
};
function plantillaSheet(kind) {
  sheet(`<h3>${kind === 'tractores' ? 'Nuevo tractor' : 'Nuevo apero'}</h3>
    <button class="opt" data-p="-1">✎ En blanco</button>
    <div class="sgrp">Plantillas</div>
    ${PLANTILLAS[kind].map((t, i) => `<button class="opt" data-p="${i}">${kind === 'tractores' ? '🚜' : '🔧'} ${esc(t.nombre)}<small>${kind === 'tractores' ? `ancho ${fmt(t.ancho_m, 2)} m · radio de giro ${fmt(t.radio_giro_m, 1)} m` : `${labNom(t.labor)} · corte ${fmt(t.ancho_m, 2)} m · ${fmt(t.velocidad_kmh, 1)} km/h`}</small></button>`).join('')}`,
    sh => sh.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { const i = +b.dataset.p; catForm(kind, i < 0 ? null : { ...PLANTILLAS[kind][i], id: uid() }, true); }));
}
function catForm(kind, o, plantilla) {
  const isT = kind === 'tractores', F = isT ? TR_FIELDS : AP_FIELDS, nuevo = !o || !!plantilla;
  o = o || (isT ? { id: uid(), nombre: '', tipo: 'agricola', potencia_cv: 90, ancho_m: 1.8, longitud_m: 3.5, radio_giro_m: 4, deposito_l: null, marcha_atras: true, notas: '' }
    : { id: uid(), nombre: '', labor: 'desbroce', ancho_m: 1.8, longitud_m: 1.5, enganche: 'suspendido', distancia_gps_m: 2, desplazamiento_m: 0, solape_m: 0.1, velocidad_kmh: 3, consumo_lh: 5, potencia_cv: null, tdf_rpm: 540, notas: '' });
  const inp = ([k, lbl, t]) => {
    const v = o[k];
    if (t === 'bool') return `<div class="srow"><span>${lbl}</span><input type="checkbox" data-f="${k}" ${v !== false ? 'checked' : ''} style="width:auto"></div>`;
    if (t === 'labor') return `<div class="srow"><span>${lbl}</span><select class="inp" data-f="${k}" style="width:150px">${LABORES.map(([a, b]) => `<option value="${a}" ${v === a ? 'selected' : ''}>${b}</option>`).join('')}</select></div>`;
    if (t === 'ttipo') return `<div class="srow"><span>${lbl}</span><select class="inp" data-f="${k}" style="width:190px">${TIPOS_TR.map(([a, ic, b]) => `<option value="${a}" ${tipoTr(o) === a ? 'selected' : ''}>${ic} ${b}</option>`).join('')}</select></div>`;
    if (t === 'enganche') return `<div class="srow"><span>${lbl}</span><select class="inp" data-f="${k}" style="width:150px">${[['suspendido', 'Suspendido (3 puntos)'], ['arrastrado', 'Arrastrado']].map(([a, b]) => `<option value="${a}" ${v === a ? 'selected' : ''}>${b}</option>`).join('')}</select></div>`;
    if (t === 'text') return `<label class="f">${lbl}</label><input class="inp" data-f="${k}" value="${esc(v || '')}">`;
    return `<div class="srow"><span>${lbl}</span><input class="inp" data-f="${k}" inputmode="decimal" value="${v == null ? '' : String(v).replace('.', ',')}" style="width:100px;text-align:right"></div>`;
  };
  const defKey = isT ? 'tractorDef' : 'aperoDef';
  sheet(`<h3>${nuevo ? (isT ? 'Nuevo tractor' : 'Nuevo apero') : esc(o.nombre)}</h3>
    <div class="card">${F.map(inp).join('')}
      <div class="srow"><span>Predeterminado para fincas nuevas</span><input type="checkbox" id="cDef" ${SB[defKey] === o.id ? 'checked' : ''} style="width:auto"></div></div>
    <div class="row">${nuevo ? '' : '<button class="btn err" id="cDel">Eliminar</button>'}<button class="btn" id="cOk">Guardar</button></div>`,
    sh => {
      if (!isT) sh.querySelector('[data-f="labor"]').onchange = e => { const v = velStd(e.target.value, 'media'); if (v) sh.querySelector('[data-f="velocidad_kmh"]').value = String(v).replace('.', ','); };
      $('cOk').onclick = async () => {
        for (const [k, , t] of F) {
          const el = sh.querySelector(`[data-f="${k}"]`);
          if (t === 'bool') o[k] = el.checked; else if (['text', 'labor', 'enganche', 'ttipo'].includes(t)) o[k] = el.value.trim();
          else { const s = el.value.trim().replace(',', '.'); o[k] = s === '' ? null : parseFloat(s); if (s !== '' && !isFinite(o[k])) return toast('Valor no válido: ' + k); }
        }
        if (!o.nombre) return toast('Indica un nombre');
        if (!(o.ancho_m > 0)) return toast('El ancho debe ser mayor que 0');
        await DB.cPut(kind, o);
        if ($('cDef').checked) SB[defKey] = o.id; else if (SB[defKey] === o.id) SB[defKey] = null;
        await DB.kvPut('settings', SB); await loadCat(); applyS(); toast('Guardado'); catSheet();
      };
      if (!nuevo) $('cDel').onclick = async () => {
        const usos = (await DB.all()).filter(f => f.config && f.config[isT ? 'tractorId' : 'aperoId'] === o.id).length;
        if (CAT[kind].length <= 1) return toast('Debe quedar al menos uno');
        confirmSheet(`¿Eliminar «${esc(o.nombre)}»?${usos ? ` Lo usan ${usos} finca(s), que pasarán a usar el predeterminado.` : ''}`, 'Eliminar', async () => {
          await DB.cDel(kind, o.id); if (SB[defKey] === o.id) SB[defKey] = null; await DB.kvPut('settings', SB); await loadCat(); applyS(); catSheet();
        }, true);
      };
    });
}
function velSheet() {
  sheet(`<h3>Velocidades estándar (km/h)</h3><div class="note" style="margin-bottom:8px">Orientativas: ajústalas a tu experiencia. Se proponen al crear o editar fincas.</div>
    <div class="card" style="padding:8px"><table class="cmp" style="width:100%"><tr><th>Labor</th>${VEGET.map(v => `<th style="text-align:center">${v[1]}</th>`).join('')}</tr>
    ${LABORES.map(([l, n]) => `<tr><th>${n}</th>${VEGET.map(([v]) => { const r = CAT.velocidades.find(x => x.labor === l && x.vegetacion === v); return `<td><input class="inp" data-l="${l}" data-v="${v}" inputmode="decimal" value="${r ? String(r.velocidad_kmh).replace('.', ',') : ''}" style="width:60px;padding:6px;text-align:center"></td>`; }).join('')}</tr>`).join('')}</table></div>
    <button class="btn" id="vOk">Guardar</button>`,
    sh => {
      $('vOk').onclick = async () => {
        for (const el of sh.querySelectorAll('[data-l]')) {
          const val = parseFloat(el.value.replace(',', '.')); if (!(val > 0)) continue;
          let r = CAT.velocidades.find(x => x.labor === el.dataset.l && x.vegetacion === el.dataset.v);
          if (r && +r.velocidad_kmh === val) continue;
          r = r || { id: uid(), labor: el.dataset.l, vegetacion: el.dataset.v, notas: '' }; r.velocidad_kmh = val;
          await DB.cPut('velocidades', r);
        }
        await loadCat(); toast('Velocidades guardadas'); catSheet();
      };
    });
}

