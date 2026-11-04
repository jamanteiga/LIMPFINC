'use strict';
/* =========================================================
   IMPORTAR / EXPORTAR FINCAS (.json LIMPFINC, copia de seguridad, GeoJSON)
   ========================================================= */
async function exportarFincaJSON(f) {
  const trabajos = (await DB.tByFinca(f.id)).map(strip), fotos = (await DB.gAll('fotos')).filter(x => x.fincaId === f.id).map(strip);
  const d = { app: 'LIMPFINC', tipo: 'finca', version: VERSION, fecha: new Date().toISOString(), finca: strip(f), trabajos, fotos };
  download(safeName(f.nombre) + '.limpfinc.json', JSON.stringify(d), 'application/json');
  toast('Finca exportada: ' + f.nombre + '.limpfinc.json');
}
// convierte cualquier formato admitido en una lista de {finca, trabajos, fotos}
function leerImport(d, nombreArchivo) {
  const base = (nombreArchivo || 'Finca').replace(/\.(limpfinc\.)?(geo)?json$/i, '');
  const out = [];
  const ll = c => { // admite [lat,lon] o [lon,lat]
    const [a, b] = c; return a > 27 && a < 72 && b > -32 && b < 45 ? [+a, +b] : [+b, +a];
  };
  const anillo = r => { const pts = r.map(c => [+c[1], +c[0]]); if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop(); return pts; };
  const nuevaF = (nombre, coords, excl, extra) => ({ id: uid(), nombre, tipo: 'abierta', creada: Date.now(), exclusiones: (excl || []).map((e, i) => ({ id: uid(), nombre: 'Exclusión ' + (i + 1), coords: e, metodo: 'importado' })), linde: coords && coords.length >= 3 ? { coords, metodo: 'importado' } : null, notas: '', ...(extra || {}) });
  if (d && d.app === 'LIMPFINC' && d.tipo === 'finca' && d.finca) out.push({ finca: d.finca, trabajos: d.trabajos || [], fotos: d.fotos || [] });
  else if (d && d.app === 'LIMPFINC' && Array.isArray(d.fincas)) d.fincas.forEach(f => out.push({ finca: f, trabajos: (d.trabajos || []).filter(t => t.fincaId === f.id), fotos: [] }));
  else if (d && (d.type === 'FeatureCollection' || d.type === 'Feature' || d.type === 'Polygon' || d.type === 'MultiPolygon')) {
    const feats = d.type === 'FeatureCollection' ? d.features : d.type === 'Feature' ? [d] : [{ type: 'Feature', properties: {}, geometry: d }];
    let n = 0;
    for (const ft of feats) {
      const g = ft && ft.geometry, pr = (ft && ft.properties) || {};
      if (!g) continue;
      if (pr.tipo && pr.tipo !== 'linde') continue;          // exportaciones de LIMPFINC: solo el linde
      const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : g.type === 'LineString' ? [[g.coordinates]] : [];
      for (const pc of polys) {
        n++;
        const nombre = pr.nombre || pr.name || pr.NOMBRE || pr.Name || pr.label || (feats.length > 1 || polys.length > 1 ? `${base} ${n}` : base);
        out.push({ finca: nuevaF(String(nombre), anillo(pc[0]), pc.slice(1).map(anillo)), trabajos: [], fotos: [] });
      }
    }
  }
  else if (Array.isArray(d) && d.length && (d[0].linde || d[0].nombre)) d.forEach(f => out.push({ finca: f.id ? f : { ...f, id: uid() }, trabajos: [], fotos: [] }));
  else if (d && (d.linde || d.coords || d.coordinates)) {
    const c = d.linde && d.linde.coords ? d.linde.coords : (d.coords || d.coordinates);
    out.push({ finca: d.id && d.linde ? d : nuevaF(d.nombre || d.name || base, c.map(ll), null, { tipo: d.tipo === 'monte' ? 'monte' : 'abierta' }), trabajos: [], fotos: [] });
  }
  else if (Array.isArray(d) && d.length >= 3 && Array.isArray(d[0])) out.push({ finca: nuevaF(base, d.map(ll)), trabajos: [], fotos: [] });
  return out.filter(x => x.finca && x.finca.nombre);
}
async function importarFincas(file) {
  let items;
  try { items = leerImport(JSON.parse(await file.text()), file.name); }
  catch (e) { return toast('El archivo no es un JSON válido', 4000); }
  if (!items.length) return toast('No se encontró ninguna finca en el archivo (admite .json de LIMPFINC, copia de seguridad o GeoJSON con polígonos)', 6000);
  const existentes = await DB.all();
  const choca = it => existentes.find(f => normName(f.nombre) === normName(it.finca.nombre));
  const nCh = items.filter(choca).length;
  let modo = 'copia';
  sheet(`<h3>📥 Importar ${items.length === 1 ? 'finca' : items.length + ' fincas'}</h3>
    <div class="card">${items.map(it => { const f = it.finca; return `<div class="kv"><span>${f.tipo === 'monte' ? '🌲' : '🌾'} ${esc(f.nombre)}${choca(it) ? ' <b style="color:var(--warn)">· ya existe</b>' : ''}</span><span>${f.linde ? fmtArea(Geo.areaLL(f.linde.coords)) : 'sin linde'}${it.trabajos.length ? ' · ' + it.trabajos.length + ' trab.' : ''}</span></div>`; }).join('')}</div>
    ${nCh ? `<label class="f">Si ya existe una finca con el mismo nombre</label>
      <div class="seg" id="imM"><button data-v="copia">Crear copia</button><button data-v="reemplazar">Reemplazar</button><button data-v="omitir">Omitir</button></div>` : ''}
    <button class="btn" id="imOk" style="margin-top:12px">Importar</button>`,
    () => {
      if ($('imM')) { const seg = $('imM'), paint = () => seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === modo)); seg.querySelectorAll('button').forEach(b => b.onclick = () => { modo = b.dataset.v; paint(); }); paint(); }
      $('imOk').onclick = async () => {
        let nOk = 0, nOm = 0;
        for (const it of items) {
          const f = JSON.parse(JSON.stringify(it.finca)); delete f._sync;
          const ex = choca(it);
          if (ex && modo === 'omitir') { nOm++; continue; }
          if (ex && modo === 'reemplazar') { f.id = ex.id; }
          else {
            if (ex) { let nm = f.nombre + ' (importada)', k = 2; while (existentes.some(x => normName(x.nombre) === normName(nm))) nm = `${f.nombre} (importada ${k++})`; f.nombre = nm; }
            if (existentes.some(x => x.id === f.id) || !f.id) f.id = uid();
          }
          if (!f.config) f.config = { tractorId: SB.tractorDef, aperoId: SB.aperoDef, velocidad: velDef(f.tipo), vegetacion: 'media' };
          if (!getTr(f.config.tractorId) || !CAT.tractores.some(t => t.id === f.config.tractorId)) f.config.tractorId = SB.tractorDef;
          if (!CAT.aperos.some(a => a.id === f.config.aperoId)) f.config.aperoId = SB.aperoDef;
          f.exclusiones = f.exclusiones || [];
          await DB.put(f); existentes.push(f); nOk++;
          for (const t of it.trabajos) { const x = { ...t, fincaId: f.id }; delete x._sync; if (!(ex && modo === 'reemplazar')) x.id = uid(); await DB.tPut(x); }
          for (const ph of it.fotos) { const x = { ...ph, fincaId: f.id }; delete x._sync; if (!(ex && modo === 'reemplazar')) x.id = uid(); await DB.cPut('fotos', x); }
        }
        closeSheet(); toast(`${nOk} finca(s) importada(s)${nOm ? ` · ${nOm} omitida(s)` : ''}`, 3500); showList();
      };
    });
}

/* =========================================================
   SIGPAC (FEGA, datos abiertos) — linde oficial por códigos o referencia catastral
   ========================================================= */
const SIGPAC_API = 'https://sigpac-hubcloud.es/ogcapi/collections/recintos/items';
const USOS = { TA: 'Tierra arable', PS: 'Pastizal', PR: 'Pasto arbustivo', PA: 'Pasto con arbolado', FO: 'Forestal', FY: 'Frutales', FS: 'Frutos secos', VI: 'Viñedo', OV: 'Olivar', TH: 'Huerta', IV: 'Invernadero', CA: 'Viales', ED: 'Edificaciones', ZU: 'Zona urbana', AG: 'Agua', IM: 'Improductivo', ZC: 'Zona concentrada', CI: 'Cítricos', FL: 'Frutos secos y olivar', ZV: 'Zona censurada', MT: 'Matorral' };
const USOS_NO = ['CA', 'ED', 'ZU', 'AG', 'IM', 'ZV'];
function refcatSigpac(r) {   // 15001A50100103 → provincia 15, municipio 1, polígono 501, parcela 103
  const m = String(r || '').toUpperCase().replace(/[\s-]/g, '').match(/^(\d{2})(\d{3})([A-Z])(\d{3})(\d{5})/);
  return m ? { provincia: +m[1], municipio: +m[2], poligono: +m[4], parcela: +m[5] } : null;
}
function showBusy(t) { hideBusy(); const ov = document.createElement('div'); ov.className = 'busyOv'; ov.id = 'busyG'; ov.innerHTML = '<div>' + esc(t) + '</div>'; document.body.appendChild(ov); }
function hideBusy() { const x = document.getElementById('busyG'); if (x) x.remove(); }
const sgKey = p => [p.provincia, p.municipio, p.agregado || 0, p.zona || 0, p.poligono, p.parcela].join('-');
const sgTxt = p => `Pol. ${p.poligono} · Parc. ${p.parcela}`;
function sigpacSheet(o) {
  const u = SB.sigpacUlt || { provincia: 15, municipio: 1, agregado: 0, zona: 0 };
  const fld = (id, lab, v) => `<div><label class="f">${lab}</label><input class="inp" id="${id}" inputmode="numeric" value="${v ?? ''}"></div>`;
  sheet(`<h3>🗺 Finca desde SIGPAC</h3>
    ${o.actual ? '' : `<label class="f">Nombre de la finca</label><input class="inp" id="sgNom" value="${esc(o.nombre || '')}" placeholder="vacío = «Pol. X Parc. Y»">`}
    <button class="opt" id="sgMap" style="margin-top:10px">👆 Señalar la finca en el mapa SIGPAC<small>Se ven las parcelas SIGPAC sobre el mapa. Toca la tuya (o varias) y vuelve con su linde.</small></button>
    <label class="f" style="margin-top:14px">…o por referencia catastral / códigos SIGPAC</label>
    <input class="inp" id="sgRef" placeholder="Ref. catastral, p. ej. 15001A50100103" autocomplete="off" autocapitalize="characters">
    <div class="note">Rellena sola provincia, municipio, polígono y parcela. En zonas de concentración parcelaria SIGPAC puede usar otros números: si no la encuentra, usa el mapa.</div>
    <div class="row">${fld('sgPr', 'Provincia', u.provincia)}${fld('sgMu', 'Municipio', u.municipio)}</div>
    <div class="row">${fld('sgAg', 'Agregado', u.agregado)}${fld('sgZo', 'Zona', u.zona)}</div>
    <div class="row">${fld('sgPo', 'Polígono', '')}${fld('sgPa', 'Parcela', '')}</div>
    <div class="row">${fld('sgRe', 'Recinto (vacío = todos)', '')}<div></div></div>
    <button class="btn" id="sgGo" style="margin-top:12px">Buscar en SIGPAC</button>
    <div id="sgRes"></div>`,
    () => {
      const nom = () => ($('sgNom') ? $('sgNom').value.trim() : '');
      $('sgMap').onclick = () => { const n = nom(); closeSheet(); sigpacMapa({ ...o, nombre: n || o.nombre }); };
      $('sgRef').oninput = () => { const r = refcatSigpac($('sgRef').value); if (r) { $('sgPr').value = r.provincia; $('sgMu').value = r.municipio; $('sgPo').value = r.poligono; $('sgPa').value = r.parcela; $('sgAg').value = 0; $('sgZo').value = 0; } };
      $('sgGo').onclick = async () => {
        const q = {}; for (const [k, id] of [['provincia', 'sgPr'], ['municipio', 'sgMu'], ['agregado', 'sgAg'], ['zona', 'sgZo'], ['poligono', 'sgPo'], ['parcela', 'sgPa'], ['recinto', 'sgRe']]) { const v = $(id).value.trim(); if (v !== '') q[k] = parseInt(v, 10); }
        if (!(q.provincia && q.municipio != null && q.poligono && q.parcela)) return toast('Indica provincia, municipio, polígono y parcela');
        $('sgGo').disabled = true; $('sgGo').textContent = 'Consultando SIGPAC…'; $('sgRes').innerHTML = '';
        let feats;
        try { feats = await sigpacBuscar(q); }
        catch (e) { $('sgRes').innerHTML = `<div class="note" style="color:var(--err)">No se pudo consultar SIGPAC (${esc(e.message)}). Comprueba la conexión.</div>`; return; }
        finally { $('sgGo').disabled = false; $('sgGo').textContent = 'Buscar en SIGPAC'; }
        if (!feats.length) { $('sgRes').innerHTML = '<div class="note" style="color:var(--warn)">SIGPAC no tiene ninguna parcela con esos códigos. Prueba con «👆 Señalar la finca en el mapa SIGPAC».</div>'; return; }
        SB.sigpacUlt = { provincia: q.provincia, municipio: q.municipio, agregado: q.agregado || 0, zona: q.zona || 0 }; DB.kvPut('settings', SB);
        sigpacResultado({ ...o, nombre: nom() || o.nombre }, feats);
      };
    });
}
// usos de cada recinto (el servicio OGC no los trae): consulta recinfo en paralelo
async function sigpacUsos(feats) {
  const falta = feats.filter(f => !f.properties.uso_sigpac).slice(0, 40);
  await Promise.all(falta.map(async f => { const p = f.properties; try {
    const r = await fetch(`https://sigpac-hubcloud.es/servicioconsultassigpac/query/recinfo/${p.provincia}/${p.municipio}/${p.agregado || 0}/${p.zona || 0}/${p.poligono}/${p.parcela}/${p.recinto}.json`);
    const d = await r.json(); const x = Array.isArray(d) ? d[0] : d; if (x) { p.uso_sigpac = x.uso_sigpac; p.superficie = x.superficie; }
  } catch (e) { } }));
}
async function sigpacResultado(o, feats) {
  showBusy('Leyendo recintos de SIGPAC…'); try { await sigpacUsos(feats); } finally { hideBusy(); }
  const rec = feats.map(f => { const p = f.properties || {}, rings = (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates).map(pc => pc.map(r => r.map(c => [+c[1], +c[0]]))); return { p, n: p.recinto, uso: p.uso_sigpac || '', rings, area: rings.reduce((s, pc) => s + Geo.areaLL(pc[0]) - pc.slice(1).reduce((a, h) => a + Geo.areaLL(h), 0), 0) }; })
    .sort((a, b) => a.p.poligono - b.p.poligono || a.p.parcela - b.p.parcela || a.n - b.n);
  const parcelas = [...new Map(rec.map(r => [sgKey(r.p), r.p])).values()];
  const varias = parcelas.length > 1;
  sheet(`<h3>🗺 ${varias ? parcelas.length + ' parcelas SIGPAC' : sgTxt(parcelas[0])}</h3>
    <div class="note">Marca los recintos que forman la finca. Viales, edificaciones, agua e improductivo salen desmarcados.</div>
    <div class="card">${rec.map((r, i) => `<label class="kv" style="cursor:pointer"><span><input type="checkbox" data-i="${i}" ${USOS_NO.includes(r.uso) ? '' : 'checked'}> ${varias ? sgTxt(r.p) + ' · ' : ''}Rec. ${r.n} · ${esc(USOS[r.uso] || r.uso || '—')}</span><span>${fmtArea(r.area)}</span></label>`).join('')}</div>
    <div class="note" id="sgTot"></div>
    ${o.actual ? '' : `<label class="f">Tipo de finca</label><div class="seg" id="sgTipo"><button data-v="abierta" class="on">🌾 Abierta</button><button data-v="monte">🌲 Arbolada / plantación</button></div>
      <div id="sgAb">${exclStepHTML('sgExN', false)}<div class="note">Si dices «Sí», tras crearla te guía para medir una exclusión tras otra (a pie, punto + radio o dibujando) hasta que pulses «No hay más».</div></div>
      <div id="sgMo" class="hidden"><div class="note">Al crearla marcarás árboles con el botón 🌳 MARCAR ÁRBOL (a 1 m a tu derecha) y la app genera la arboleda dentro del linde.</div></div>`}
    <button class="btn" id="sgOk" style="margin-top:10px">${o.actual ? 'Usar como linde de la finca' : 'Crear finca'}</button>`,
    () => {
      let tipoN = 'abierta', malN = 'gps', leerEx = () => false;
      if ($('sgTipo')) {
        $('sgTipo').querySelectorAll('button').forEach(b => b.onclick = () => { tipoN = b.dataset.v; $('sgTipo').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); $('sgAb').classList.toggle('hidden', tipoN !== 'abierta'); $('sgMo').classList.toggle('hidden', tipoN !== 'monte'); });

        leerEx = exclStepBind('sgExN');
      }
      const cbs = [...document.querySelectorAll('.sheet input[type=checkbox]')];
      const sel = () => cbs.filter(x => x.checked).map(x => rec[+x.dataset.i]);
      const tot = () => { const s = sel(); $('sgTot').textContent = s.length ? `Seleccionado: ${fmtArea(s.reduce((a, r) => a + r.area, 0))}` : 'Marca al menos un recinto'; };
      cbs.forEach(x => x.onchange = tot); tot();
      $('sgOk').onclick = async () => {
        const s = sel(); if (!s.length) return toast('Marca al menos un recinto');
        const u2 = sigpacUnir(s); if (!u2) return toast('No se pudo formar el contorno');
        if (u2.partes > 1) toast(`Los recintos no son contiguos: se usa la parte mayor (${u2.partes} partes)`, 5000);
        const info = { parcelas: [...new Map(s.map(r => [sgKey(r.p), { provincia: r.p.provincia, municipio: r.p.municipio, agregado: r.p.agregado || 0, zona: r.p.zona || 0, poligono: r.p.poligono, parcela: r.p.parcela, recintos: s.filter(x => sgKey(x.p) === sgKey(r.p)).map(x => x.n) }])).values()] };
        const p0 = info.parcelas[0]; Object.assign(info, { provincia: p0.provincia, municipio: p0.municipio, agregado: p0.agregado, zona: p0.zona, poligono: p0.poligono, parcela: p0.parcela, recintos: p0.recintos });
        SB.sigpacUlt = { provincia: p0.provincia, municipio: p0.municipio, agregado: p0.agregado, zona: p0.zona }; DB.kvPut('settings', SB);
        if (o.actual) {
          closeSheet(); cur.sigpac = info;
          await commitPolygon('linde', u2.coords, { metodo: 'sigpac', sigpac: info });
          for (const h of u2.huecos) await commitPolygon('excl', h, { metodo: 'sigpac' });
          guiaExcl(true); return;
        }
        let nombre = (o.nombre || '').trim() || sgTxt(p0) + (info.parcelas.length > 1 ? ' +' + (info.parcelas.length - 1) : '');
        if (await findByName(nombre)) { let k = 2; while (await findByName(`${nombre} (${k})`)) k++; nombre = `${nombre} (${k})`; }
        const now = Date.now(), cfg = { tractorId: SB.tractorDef || (CAT.tractores[0] || {}).id, aperoId: SB.aperoDef || (CAT.aperos[0] || {}).id, vegetacion: 'media', velocidad: velDef(tipoN) };
        const exN = tipoN === 'abierta' && leerEx();
        const nf = { id: uid(), nombre, tipo: tipoN, config: cfg, notas: '', creada: now, mod: now, sigpac: info, exclPend: exN,
          linde: { coords: u2.coords, metodo: 'sigpac', sigpac: info, fecha: now },
          exclusiones: u2.huecos.map((h, i) => ({ id: uid(), nombre: 'Exclusión ' + (i + 1), coords: h, metodo: 'sigpac', fecha: now })) };
        await DB.put(nf); closeSheet(); await openFinca(nf.id); setTimeout(fitFinca, 80);
        toast(`Finca «${nombre}» creada desde SIGPAC · ${fmtArea(Geo.areaLL(u2.coords))}`, 4000);
        if (tipoN === 'monte') setTimeout(() => mallaMedidos(), 900);   // arbolada: árboles con GPS o árbol ficticio
        else if (exN) guiaExcl(true);   // abierta: medir exclusiones una tras otra
        else setTimeout(() => fincaForm(nf), 900);   // revisar nombre, tipo, tractor, apero y velocidad
      };
    });
}
/* ---- Mapa SIGPAC: el usuario toca su parcela y vuelve con el linde ---- */
function sigpacMapa(o) {
  const wrap = document.createElement('div'); wrap.id = 'sgWrap';
  wrap.style.cssText = 'position:fixed;inset:0;z-index:1400;background:var(--bg);display:flex;flex-direction:column';
  wrap.innerHTML = `<div style="padding:calc(var(--safe-t) + 8px) 12px 8px;display:flex;align-items:center;gap:8px;background:#fff;border-bottom:1px solid var(--line)">
      <button class="lnk" id="sgX" style="margin:0;font-size:17px">‹ Cancelar</button><b style="flex:1;text-align:center">Toca tu parcela</b><span style="width:70px"></span></div>
    <div id="sgM" style="flex:1"></div>
    <div style="padding:10px 12px calc(var(--safe-b) + 10px);background:#fff;border-top:1px solid var(--line)">
      <div class="note" id="sgInfo" style="margin-bottom:8px">Acércate hasta ver las parcelas SIGPAC (líneas naranjas).</div>
      <div class="row"><button class="btn sec" id="sgYo">📍 Mi posición</button><button class="btn" id="sgUse" disabled>Usar selección</button></div></div>`;
  document.body.appendChild(wrap);
  const m = window.__sgm = L.map('sgM', { zoomControl: false, preferCanvas: true, zoomSnap: 0.25, maxZoom: 21, attributionControl: true });
  const base = SB.mapaBase === 'OpenTopoMap'
    ? L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { subdomains: 'abc', maxNativeZoom: 17, maxZoom: 21, crossOrigin: true, attribution: '© OpenStreetMap · © OpenTopoMap' })
    : L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxNativeZoom: 19, maxZoom: 21, crossOrigin: true, attribution: '© OpenStreetMap' });
  base.addTo(m); m.attributionControl.addAttribution('Parcelas: SIGPAC © FEGA');
  const capa = L.layerGroup().addTo(m), selG = L.layerGroup().addTo(m);
  const feats = new Map(), sel = new Map();   // dn_pk → feature ; clave parcela → props
  let pend = 0, ultimaCaja = '';
  const aquiKey = () => { if (!lastPos) return null; const pt = [lastPos.lon, lastPos.lat]; for (const f of feats.values()) { const g = f.geometry, rings = g.type === 'Polygon' ? [g.coordinates] : g.coordinates; if (rings.some(pc => Geo.inPoly(pt, pc[0]))) return sgKey(f.properties); } return null; };
  const estilo = f => sel.has(sgKey(f.properties)) ? { color: '#1b5e20', weight: 3, fillColor: '#43a047', fillOpacity: .45 } : sgKey(f.properties) === m._aqui ? { color: '#1565c0', weight: 2.5, dashArray: '6 4', fillColor: '#64b5f6', fillOpacity: .18 } : { color: '#ef6c00', weight: 1.2, fillColor: '#ffb74d', fillOpacity: .06 };
  const pintar = () => {
    m._aqui = aquiKey();
    capa.clearLayers();
    for (const f of feats.values()) L.geoJSON(f, { style: () => estilo(f), onEachFeature: (ft, l) => l.on('click', () => tocar(ft)) }).addTo(capa);
    const n = sel.size; $('sgUse').disabled = !n;
    $('sgInfo').innerHTML = n ? `<b>${n === 1 ? sgTxt([...sel.values()][0]) : n + ' parcelas'}</b> seleccionada${n > 1 ? 's' : ''}. Toca otra para añadirla o la misma para quitarla.` : (m.getZoom() < 16 ? 'Acércate hasta ver las parcelas SIGPAC (líneas naranjas).' : m._aqui ? 'Estás en la parcela marcada en <b style="color:#1565c0">azul</b>. Tócala (y otras si la finca tiene varias).' : 'Toca tu parcela.');
  };
  const tocar = ft => { const k = sgKey(ft.properties); if (sel.has(k)) sel.delete(k); else sel.set(k, ft.properties); pintar(); };
  const cargar = async () => {
    if (m.getZoom() < 16) { if (!sel.size) capa.clearLayers(); pintar(); return; }
    const b = m.getBounds(), caja = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map(v => v.toFixed(5)).join(',');
    if (caja === ultimaCaja) return; ultimaCaja = caja; pend++; $('sgInfo').textContent = 'Cargando parcelas SIGPAC…';
    try {
      const r = await fetch(`${SIGPAC_API}?f=json&limit=1000&bbox=${caja}`); if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json(); for (const f of d.features || []) if (f.geometry) feats.set(f.properties.dn_pk || sgKey(f.properties) + '-' + f.properties.recinto, f);
      if (feats.size > 6000) { const keep = [...feats.entries()].slice(-3000); feats.clear(); keep.forEach(([k, v]) => feats.set(k, v)); }
    } catch (e) { toast('No se pudo consultar SIGPAC: ' + e.message, 4000); }
    finally { pend--; pintar(); }
  };
  m.on('moveend', () => { clearTimeout(m._t); m._t = setTimeout(cargar, 350); });
  const yo = () => { if (lastPos) m.setView([lastPos.lat, lastPos.lon], 18); else toast('Sin posición GPS todavía'); };
  const vista = SB.sigpacVista;
  if (o.aqui && lastPos) m.setView([lastPos.lat, lastPos.lon], 18);
  else if (cur && cur.linde && !o.aqui) m.setView(cur.linde.coords[0], 18);
  else if (lastPos) m.setView([lastPos.lat, lastPos.lon], 18);
  else if (vista) m.setView([vista[0], vista[1]], vista[2]);
  else m.setView([43.215, -8.29], 14);
  setTimeout(() => m.invalidateSize(), 50);
  // sin posición aún: arranca el GPS y centra en cuanto llegue (si el usuario no ha movido el mapa)
  let movido = false; m.on('dragstart zoomstart', () => { movido = true; });
  if (!watchId) try { startGPS(); } catch (e) { }
  let yoM = null; const yoT = setInterval(() => { if (!lastPos) return; const ll = [lastPos.lat, lastPos.lon]; if (!yoM) yoM = L.marker(ll, { icon: L.divIcon({ className: '', html: '<div class="pos"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }), interactive: false }).addTo(m); else yoM.setLatLng(ll); }, 1000);
  let tries = 0; const espera = setInterval(() => { if (++tries > 40 || movido) return clearInterval(espera); if (lastPos && (o.aqui || !(cur && cur.linde))) { clearInterval(espera); if (o.aqui || !vista || gpsAge() < 10) m.setView([lastPos.lat, lastPos.lon], 18); } }, 500);
  const cerrar = () => { clearInterval(espera); clearInterval(yoT); const c = m.getCenter(); SB.sigpacVista = [+c.lat.toFixed(5), +c.lng.toFixed(5), Math.max(16, m.getZoom())]; DB.kvPut('settings', SB); m.remove(); wrap.remove(); };
  $('sgX').onclick = cerrar; $('sgYo').onclick = yo;
  $('sgUse').onclick = async () => {
    showBusy('Descargando parcelas completas…');
    let all = [];
    try { for (const p of sel.values()) all = all.concat(await sigpacBuscar({ provincia: p.provincia, municipio: p.municipio, agregado: p.agregado || 0, zona: p.zona || 0, poligono: p.poligono, parcela: p.parcela })); }
    catch (e) { hideBusy(); return toast('No se pudo consultar SIGPAC: ' + e.message, 4000); }
    hideBusy(); if (!all.length) return toast('SIGPAC no devolvió recintos');
    cerrar(); sigpacResultado(o, all);
  };
}
async function sigpacBuscar(q) {
  const ps = new URLSearchParams({ f: 'json', limit: '500' }); for (const k in q) ps.set(k, q[k]);
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 25000);
  try {
    const r = await fetch(SIGPAC_API + '?' + ps, { signal: ctl.signal, headers: { Accept: 'application/geo+json, application/json' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    // el servicio no filtra por agregado/zona en todas las versiones: se filtra aquí también
    return (d.features || []).filter(f => { const p = f.properties || {}; return f.geometry && ['provincia', 'municipio', 'agregado', 'zona', 'poligono', 'parcela', 'recinto'].every(k => q[k] == null || p[k] == null || +p[k] === +q[k]); });
  } catch (e) { throw new Error(e.name === 'AbortError' ? 'sin respuesta' : e.message); }
  finally { clearTimeout(to); }
}
function sigpacUnir(rec) {   // une recintos contiguos → {coords, huecos, partes}
  const C = window.ClipperLib, all = rec.flatMap(r => r.rings.map(pc => pc[0])), P = Geo.projFor(all.flat()), SC = 1000;
  const toC = ll => Geo.toXY(ll, P).map(p => ({ X: Math.round(p[0] * SC), Y: Math.round(p[1] * SC) }));
  const c = new C.Clipper(); for (const r of rec) for (const pc of r.rings) { c.AddPath(toC(pc[0]), C.PolyType.ptSubject, true); }
  const u = new C.Paths(); c.Execute(C.ClipType.ctUnion, u, C.PolyFillType.pftNonZero, C.PolyFillType.pftNonZero);
  // cierra rendijas de menos de 10 cm entre recintos vecinos
  const co = new C.ClipperOffset(2, 20); co.AddPaths(u, C.JoinType.jtMiter, C.EndType.etClosedPolygon); const a = new C.Paths(); co.Execute(a, 0.05 * SC);
  const co2 = new C.ClipperOffset(2, 20); co2.AddPaths(a, C.JoinType.jtMiter, C.EndType.etClosedPolygon); const b = new C.Paths(); co2.Execute(b, -0.05 * SC);
  const fr = pa => Geo.toLL(Geo.mergeClose(pa.map(q => [q.X / SC, q.Y / SC]), 0.05), P).map(p => [+p[0].toFixed(8), +p[1].toFixed(8)]);
  const outs = b.filter(pa => C.Clipper.Orientation(pa)).sort((x, y) => Math.abs(C.Clipper.Area(y)) - Math.abs(C.Clipper.Area(x)));
  if (!outs.length) return null;
  const holes = b.filter(pa => !C.Clipper.Orientation(pa) && Math.abs(C.Clipper.Area(pa)) / SC / SC > 4 && C.Clipper.PointInPolygon(pa[0], outs[0]) === 1);
  return { coords: fr(outs[0]), huecos: holes.map(fr), partes: outs.length };
}
async function lindeArchivo() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,.geojson,application/json,application/geo+json';
  inp.onchange = async () => {
    const file = inp.files[0]; if (!file) return;
    let items; try { items = leerImport(JSON.parse(await file.text()), file.name); } catch (e) { return toast('El archivo no es un JSON válido', 4000); }
    const it = items.find(x => x.finca.linde && x.finca.linde.coords && x.finca.linde.coords.length >= 3);
    if (!it) return toast('El archivo no contiene ningún contorno', 4000);
    if (items.length > 1) toast('El archivo tiene varias fincas: se usa la primera', 4000);
    await commitPolygon('linde', it.finca.linde.coords, { metodo: 'importado' });
    for (const e of it.finca.exclusiones || []) if (e.coords && e.coords.length >= 3) await commitPolygon('excl', e.coords, { metodo: 'importado' });
    guiaExcl(true);
  };
  inp.click();
}
// v1.2.1: la velocidad por defecto es 3 km/h (las versiones iniciales guardaban 2,5)
async function asegurarCortacesped() {
  if (SB.migCesped || !CAT.tractores.length) return false;
  SB.migCesped = Date.now(); await DB.kvPut('settings', SB);
  if (!CAT.tractores.some(t => t.id === 'tr-pie')) await DB.cPut('tractores', { id: 'tr-pie', nombre: 'Cortacésped convencional (a pie)', tipo: 'pie', potencia_cv: 4, ancho_m: 0.6, longitud_m: 1.2, radio_giro_m: 0.4, deposito_l: 1.5, marcha_atras: true, notas: 'Para fincas muy pequeñas: el iPhone lo lleva el operario' });
  if (!CAT.aperos.some(a => a.id === 'ap-cesped-053')) await DB.cPut('aperos', { id: 'ap-cesped-053', nombre: 'Cortacésped convencional 0,53 m', labor: 'cesped', ancho_m: 0.53, longitud_m: 0.6, enganche: 'suspendido', distancia_gps_m: -0.6, desplazamiento_m: 0, solape_m: 0.05, velocidad_kmh: 2, consumo_lh: 0.6, potencia_cv: 4, tdf_rpm: null, notas: 'Cortacésped empujado: el corte va 0,6 m por delante del operario' });
  await loadCat(); return true;
}
async function migrarVelocidad() {
  try {
    let n = 0;
    if (+SB.velocidad === 2.5 || !(+SB.velocidad > 0)) { SB.velocidad = 3; await DB.kvPut('settings', SB); applyS(); n++; }
    if (!SB.migVelTipo2) {   // v1.9.1: abierta 3 km/h, monte 2,3 km/h en TODAS las fincas; árbol a 1,0 m
      SB.migVelTipo2 = Date.now(); SB.migVelTipo = SB.migVelTipo || Date.now(); if (+SB.velAbierta === 3.5) SB.velAbierta = 3; if (+SB.distArbol === 0.9) SB.distArbol = 1.0; SB.ladoArbol = 'der'; await DB.kvPut('settings', SB);
      for (const f of await DB.all()) { if (!f.config) continue; const v = velDef(f.tipo); if (+f.config.velocidad !== v) { f.config.velocidad = v; if (f.plan && f.linde) { try { f.plan = Planner.plan(f, effS(f), { start: f.plan.inicio, end: f.plan.fin, hlFinal: f.plan.hlFinal }); } catch (e) { } } await DB.put(f); n++; } }
    }
    if (!SB.migVelTipo) {   // v1.9: velocidad por defecto según el tipo (abierta 3,5 · monte 2,3 km/h)
      SB.migVelTipo = Date.now(); await DB.kvPut('settings', SB);
      for (const f of await DB.all()) if (f.config && +f.config.velocidad === 3) { f.config.velocidad = velDef(f.tipo); if (f.plan && f.linde) { try { f.plan = Planner.plan(f, effS(f), { start: f.plan.inicio, end: f.plan.fin, hlFinal: f.plan.hlFinal }); } catch (e) { } } await DB.put(f); n++; }
    }
    for (const a of CAT.aperos) if (a.labor === 'desbroce' && +a.velocidad_kmh === 2.5) { a.velocidad_kmh = 3; await DB.cPut('aperos', a); n++; }
    // labores nuevas (p. ej. corte de césped): se añaden sus velocidades estándar
    if (CAT.velocidades.length) for (const [lab] of LABORES) if (!CAT.velocidades.some(v => v.labor === lab)) { for (let i = 0; i < 3; i++) await DB.cPut('velocidades', { id: uid(), labor: lab, vegetacion: VEGET[i][0], velocidad_kmh: VEL_STD[lab][i], notas: 'orientativa' }); n++; }
    for (const f of await DB.all()) if (f.config && +f.config.velocidad === 2.5) {
      f.config.velocidad = 3;
      if (f.plan && f.linde) { try { f.plan = Planner.plan(f, effS(f), {}); } catch (e) { } }
      await DB.put(f); n++;
    }
    if (await asegurarCortacesped()) n++;
    if (n) { await loadCat(); applyS(); }
    return n;
  } catch (e) { return 0; }
}

