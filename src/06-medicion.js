'use strict';
/* =========================================================
   MEDICIÓN POR GPS (a pie / tractor)
   ========================================================= */
let rec = null; // {target:'linde'|'excl', mode:'pie'|'tractor', pts:[], paused, line}
function lindeMenu() {
  if (busy()) return;
  sheet(`<h3>Linde de la finca</h3>
    <button class="opt" id="oPie">🚶 Medir a pie<small>Recorre el linde con el iPhone. Máxima precisión.</small></button>
    <button class="opt" id="oTrac">🚜 Medir con tractor<small>Recorre el interior junto al linde. Se corrige ${fmt(S.anchoTractor / 2 + S.holguraLinde, 2)} m hacia fuera.</small></button>
    <button class="opt" id="oDraw">✍️ Dibujar sobre el mapa<small>Toca los vértices sobre el mapa.</small></button>
    <button class="opt" id="oSig">🗺 Desde SIGPAC / referencia catastral<small>Descarga el linde oficial de la parcela.</small></button>
    <button class="opt" id="oFile">📥 Desde archivo<small>.json o GeoJSON con el contorno.</small></button>
    ${cur.linde ? '<button class="opt" id="oDel" style="color:var(--err)">🗑 Borrar linde</button>' : ''}`,
    () => {
      $('oPie').onclick = () => { closeSheet(); startRec('linde', 'pie'); };
      $('oTrac').onclick = () => { closeSheet(); tractorSetup(); };
      $('oDraw').onclick = () => { closeSheet(); startDraw('linde'); };
      $('oSig').onclick = () => sigpacSheet({ actual: true });
      $('oFile').onclick = () => { closeSheet(); lindeArchivo(); };
      if ($('oDel')) $('oDel').onclick = () => confirmSheet('¿Borrar el linde?', 'Borrar', async () => { cur.linde = null; await saveCur(); drawFinca(); }, true);
    });
}
function tractorSetup(target, puntos) {
  target = target || 'linde'; const ex = target === 'excl';
  sheet(`<h3>${ex ? 'Exclusión con tractor' : 'Medir con tractor'}${puntos ? ' · por puntos' : ''}</h3>
    <div class="note" style="margin-bottom:8px">${ex ? 'Rodea la zona por FUERA, con ella siempre al mismo lado y lo más pegado posible. La app desplaza el recorrido hacia DENTRO: medio ancho del tractor + holgura.' : 'Recorre la finca por dentro, con el linde siempre al mismo lado y el tractor lo más pegado posible. La app desplaza el recorrido hacia fuera: medio ancho del tractor + holgura.'}</div>
    <div class="srow"><span>Ancho tractor (m)</span><input class="inp" id="tAn" inputmode="decimal" value="${String(S.anchoTractor).replace('.', ',')}" style="width:100px;text-align:right"></div>
    <div class="srow"><span>Holgura lateral tractor–linde (m)</span><input class="inp" id="tHo" inputmode="decimal" value="${String(S.holguraLinde).replace('.', ',')}" style="width:100px;text-align:right"></div>
    <div class="note" id="tOff"></div>
    <button class="btn" id="tGo" style="margin-top:12px">Empezar</button>`,
    () => {
      const upd = () => { const a = parseFloat($('tAn').value.replace(',', '.')), h = parseFloat($('tHo').value.replace(',', '.')); $('tOff').textContent = isFinite(a + h) ? `Corrección hacia ${ex ? 'dentro' : 'fuera'}: ${fmt(a / 2 + h, 2)} m` : ''; };
      $('tAn').oninput = $('tHo').oninput = upd; upd();
      $('tGo').onclick = async () => {
        const a = parseFloat($('tAn').value.replace(',', '.')), h = parseFloat($('tHo').value.replace(',', '.'));
        if (!(a > 0) || !(h >= 0)) return toast('Valores no válidos');
        S.holguraLinde = h; await saveSB();
        const tr = getTr(cur && cur.config && cur.config.tractorId); if (tr && +tr.ancho_m !== a) { tr.ancho_m = a; await DB.cPut('tractores', tr); await loadCat(); }
        applyS();
        closeSheet(); startRec(target, 'tractor', puntos);
      };
    });
}
function startRec(target, mode, puntos) {
  startGPS(); keepAwake(true);
  rec = { target, mode, pts: [], state: puntos ? 'pause' : 'ready', paused: true, puntos: !!puntos, line: L.polyline([], { color: '#ff6f00', weight: 4 }).addTo(lyr.tmp) };
  followPos = true;
  $('tbMain').classList.add('hidden'); $('pRec').classList.remove('hidden');
  paintRec(); updRecStats();
  if (lastPos) map.setView([lastPos.lat, lastPos.lon], Math.max(map.getZoom(), 18));
}
function paintRec() {
  const st = rec.state, name = (rec.target === 'linde' ? 'Linde' : 'Exclusión') + ' · ' + (rec.mode === 'pie' ? 'a pie' : 'con tractor') + (rec.puntos ? ' · por puntos' : '');
  $('recTitle').textContent = rec.puntos ? name : { ready: 'Preparado · ', rec: 'Grabando · ', pause: 'En pausa · ' }[st] + name;

  const dot = $('recDot'); dot.className = 'dot' + (st === 'rec' ? ' rec' : st === 'ready' ? ' st-ready' : ' st-pause');
  const bp = $('bPause');
  bp.textContent = st === 'ready' ? '▶ Iniciar' : st === 'rec' ? '⏸ Pausar' : '▶ Continuar';
  bp.className = 'btn big ' + (st === 'rec' ? 'warn' : '');
  bp.classList.toggle('hidden', !!rec.puntos);
  $('bFin').classList.toggle('hidden', st === 'ready');
  $('bCorner').classList.toggle('hidden', st === 'ready');
  if (!rec.avg) $('bCorner').textContent = rec.puntos ? '📍 Punto ' + (rec.pts.filter(q => q.corner).length + 1) : '📍 Esquina';
  if (rec.puntos) { const nP = rec.pts.filter(q => q.corner).length; $('bFin').textContent = '✓ Terminar'; $('recHint').textContent = (rec.mode === 'tractor' ? (rec.target === 'excl' ? 'Con el tractor junto a cada vértice, por FUERA de la zona (se corrige hacia dentro). ' : 'Con el tractor junto a cada vértice, por DENTRO de la finca (se corrige hacia fuera). ') : 'Ponte en cada vértice. ') + `Pulsa «📍 Punto» y quédate quieto ${SB.promedioS || 10} s. Ve en orden alrededor de la zona. ${nP ? nP + ' punto' + (nP > 1 ? 's' : '') + (nP < 3 ? ' (mínimo 3)' : '. «Terminar» cierra el polígono.') : ''}`; return; }
  $('bFin').textContent = '■ Parar';
  const como = rec.target === 'excl' ? (rec.mode === 'tractor' ? 'Con tractor: rodea la zona por FUERA, lo más pegado posible. La app desplaza el trazado hacia dentro (' + fmt(S.anchoTractor / 2 + S.holguraLinde, 2) + ' m).' : 'A pie: camina POR EL BORDE de la zona a excluir.') : rec.mode === 'tractor'
    ? 'Con tractor: circula por DENTRO de la finca, lo más pegado posible al borde. La app desplaza el trazado hacia fuera (' + fmt(S.anchoTractor / 2 + S.holguraLinde, 2) + ' m).'
    : 'A pie: camina POR EL BORDE de la finca. Es la medición más precisa.';
  if (st === 'ready') $('recHint').textContent = como + ' Ve al punto de partida y pulsa «Iniciar».';
  else if (st === 'rec') $('recHint').textContent = 'Registrando el trazado… En cada esquina, párate y pulsa «📍 Esquina» (20 s quieto) para fijarla con más precisión. «Parar» al terminar.';
  else $('recHint').textContent = 'En pausa: no se registra nada. Pulsa «Continuar» y el trazado seguirá desde el último punto.';
}
function recPoint(p) {
  updRecStats(p);
  if (rec.avg) { if (p.acc <= S.umbralPrecision * 1.5 && (!rec.avg.s.length || p.t !== rec.avg.s[rec.avg.s.length - 1].t)) rec.avg.s.push(p); return; }
  if (rec.state !== 'rec') return;
  const last = rec.pts[rec.pts.length - 1];
  if (last && p.t - last.t < 900) return; // ~1 Hz
  rec.pts.push(p);
  if (p.acc <= S.umbralPrecision) rec.line.addLatLng([p.lat, p.lon]);
  if (rec.pts.length % 5 === 0) setActivo({ tipo: 'linde', fincaId: cur.id, t: Date.now(), rec: { target: rec.target, mode: rec.mode, pts: rec.pts } });
  updRecStats(p);
}
function updRecStats(p) {
  p = p || lastPos;
  if (p) {
    const a = p.acc; const el = $('sAcc');
    el.textContent = '±' + fmt(a, a < 10 ? 1 : 0) + ' m';
    el.className = a <= 5 ? 'acc-ok' : a <= S.umbralPrecision ? 'acc-mid' : 'acc-bad';
  }
  { const nc = rec.pts.filter(q => q.corner).length; $('sPts').textContent = (rec.pts.length - nc) + (nc ? ' · ' + nc + '📍' : ''); }
  const ll = rec.pts.filter(q => q.corner || q.acc <= S.umbralPrecision).map(q => [q.lat, q.lon]);
  $('sLen').textContent = fmt(Geo.lenLL(ll), 0) + ' m';
  if (p && rec.pts.length > 20 && ll.length && !rec.puntos) {
    const d = Geo.lenLL([ll[0], [p.lat, p.lon]]);
    $('recHint').textContent = d < 10 ? `Cerca del inicio (${fmt(d, 0)} m). Puedes terminar.` : `Distancia al inicio: ${fmt(d, 0)} m`;
  }
}
$('bPause').onclick = () => {
  if (!rec) return;
  if (rec.state === 'rec') { rec.state = 'pause'; rec.paused = true; paintRec(); markRec('pausa'); return; }
  if (!lastPos || gpsAge() > 10) return toast('Esperando señal GPS: el indicador de arriba a la izquierda debe estar en verde.', 4000);
  const first = rec.state === 'ready';
  rec.state = 'rec'; rec.paused = false; paintRec();
  setActivo({ tipo: 'linde', fincaId: cur.id, t: Date.now(), rec: { target: rec.target, mode: rec.mode, pts: rec.pts } });
  // punto actual: se marca en el mapa y se registra
  rec.pts.push(lastPos); rec.line.addLatLng([lastPos.lat, lastPos.lon]); updRecStats(lastPos);
  markRec(first ? 'inicio' : 'continuar');
  followPos = true; map.setView([lastPos.lat, lastPos.lon], Math.max(map.getZoom(), 19));
  if (lastPos.acc > S.umbralPrecision) toast(`Precisión baja (±${fmt(lastPos.acc, 0)} m): los puntos imprecisos se descartarán.`, 3500);
};
$('bCorner').onclick = () => {
  if (!rec || rec.state === 'ready') return;
  if (rec.avg) { clearInterval(rec.avg.tm); rec.avg = null; paintRec(); return toast('Esquina cancelada'); }   // segundo toque cancela
  if (!lastPos || gpsAge() > 10) return toast('Esperando señal GPS: el indicador de arriba a la izquierda debe estar en verde.', 4000);
  const DUR = rec.puntos ? Math.max(3, +SB.promedioS || 10) : 20; let n = DUR;
  rec.avg = { s: [], tm: null };
  $('bCorner').textContent = `⏳ ${n} s`; $('recHint').textContent = 'Quieto… promediando el GPS. Toca otra vez para cancelar.';
  try { speak(rec.puntos ? 'Punto. No te muevas' : 'Esquina. No te muevas', true); } catch { }
  rec.avg.tm = setInterval(() => {
    n--; if (!rec || !rec.avg) return;
    $('bCorner').textContent = `⏳ ${n} s`;
    if (n > 0) return;
    clearInterval(rec.avg.tm); const S0 = rec.avg.s; rec.avg = null;
    if (S0.length < Math.min(5, DUR - 1)) { paintRec(); return toast('Pocas lecturas con buena precisión: punto no guardado. Inténtalo de nuevo.', 4000); }
    let sw = 0, la = 0, lo = 0; S0.forEach(q => { const w = 1 / (q.acc * q.acc); sw += w; la += q.lat * w; lo += q.lon * w; });
    // la precisión de la media no baja de 1/√n·σ por errores correlados del GPS: se limita a la mitad de la precisión media
    const accMean = S0.reduce((s, q) => s + q.acc, 0) / S0.length, acc = Math.max(Math.sqrt(1 / sw), accMean / 2);
    const c = { lat: la / sw, lon: lo / sw, acc, t: Date.now(), corner: true, n: S0.length };
    rec.pts.push(c); rec.line.addLatLng([c.lat, c.lon]);
    const k = rec.pts.filter(q => q.corner).length;
    L.marker([c.lat, c.lon], { interactive: false, icon: L.divIcon({ className: '', html: `<div class="pin" style="background:#1565c0">${k}</div>`, iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(lyr.tmp);
    if (rec.puntos && k > 1) rec.line.setLatLngs(rec.pts.filter(q => q.corner).map(q => [q.lat, q.lon]).concat(k > 2 ? [[rec.pts.find(q => q.corner).lat, rec.pts.find(q => q.corner).lon]] : []));
    paintRec(); updRecStats(); toast(`📍 ${rec.puntos ? 'Punto' : 'Esquina'} ${k} guardado (±${fmt(acc, 1)} m, ${S0.length} lecturas)`, 3000);
    try { speak(`${rec.puntos ? 'Punto' : 'Esquina'} ${k} guardado`, true); } catch { }
  }, 1000);
};
function markRec(tipo) {
  const p = tipo === 'pausa' ? rec.pts[rec.pts.length - 1] : lastPos; if (!p) return;
  const st = { inicio: ['I', '#2e7d32'], pausa: ['❚❚', '#ef6c00'], continuar: ['▶', '#1565c0'] }[tipo];
  L.marker([p.lat, p.lon], { interactive: false, icon: L.divIcon({ className: '', html: `<div class="pin" style="background:${st[1]}">${st[0]}</div>`, iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(lyr.tmp);
}
$('bCancelRec').onclick = () => rec && rec.pts.length ? confirmSheet('¿Descartar el trazado registrado?', 'Descartar', endRec, true) : endRec();
$('bFin').onclick = () => {
  if (!rec || rec.state === 'ready') return;
  if (rec.avg) return toast('Espera a que termine la esquina (o tócala para cancelar)');
  if (rec.puntos && rec.pts.filter(q => q.corner).length < 3) return toast('Marca al menos 3 puntos');
  rec.state = 'pause'; rec.paused = true; paintRec();
  const r = processTrack(rec.pts, rec.target === 'excl' && rec.mode === 'tractor' ? 'tractorIn' : rec.mode, S);
  if (r.error) return toast(r.error, 4000);
  const { target, mode, pts } = rec;
  endRec();
  startReview(target, mode, pts, r);
};
function endRec() {
  if (rec) { if (rec.avg) clearInterval(rec.avg.tm); lyr.tmp.clearLayers(); setActivo(null); }
  rec = null; keepAwake(false); followPos = false; showMain();
}

/* Revisión del resultado antes de guardar */
let review = null;
function startReview(target, mode, pts, r) {
  review = { target, mode, pts, r };
  lyr.tmp.clearLayers();
  L.polyline(pts.filter(p => p.acc <= S.umbralPrecision).map(p => [p.lat, p.lon]), { color: '#ff6f00', weight: 2, opacity: .8, dashArray: '3 4' }).addTo(lyr.tmp);
  L.polygon(r.coords, { color: target === 'linde' ? '#1b5e20' : '#b71c1c', weight: 3, fillColor: target === 'linde' ? '#a5d6a7' : '#757575', fillOpacity: .4 }).addTo(lyr.tmp);
  map.fitBounds(L.latLngBounds(r.coords), { padding: [30, 30], maxZoom: 19 });
  const a = Geo.areaLL(r.coords);
  let warn = [];
  if (r.gap > 15) warn.push(`⚠️ El final queda a ${fmt(r.gap, 0)} m del inicio; se ha cerrado con línea recta.`);
  if (r.selfX) warn.push('⚠️ El polígono se cruza consigo mismo. Revísalo con «Editar».');
  if (r.used < r.total) warn.push(`${r.total - r.used} punto(s) descartados por precisión.`);
  if (r.nCorners) warn.unshift(`📍 ${r.nCorners} esquina(s) promediada(s), precisión media ±${fmt(r.accCorners, 1)} m.`);
  showTool(target === 'linde' ? 'Resultado: linde' : 'Resultado: exclusión',
    `Área ${fmtArea(a)} · Perímetro ${fmt(Geo.perimLL(r.coords), 0)} m · ${r.coords.length} vértices · Precisión media ±${fmt(r.accMed, 1)} m` +
    (r.offset ? ` · Corrección ${fmt(r.offset, 2)} m` : '') + (warn.length ? '<br>' + warn.join('<br>') : ''),
    [['Descartar', 'sec', () => { review = null; lyr.tmp.clearLayers(); showMain(); }],
     ['Guardar', '', async () => {
       await commitPolygon(target, r.coords, { metodo: mode, raw: compactPts(pts), offset: r.offset, accMed: r.accMed }); guiaExcl(true);
       review = null; lyr.tmp.clearLayers(); showMain();
     }]]);
}
const compactPts = pts => pts.map(p => p.corner ? [+p.lat.toFixed(8), +p.lon.toFixed(8), +p.acc.toFixed(2), p.t, 'E'] : [+p.lat.toFixed(7), +p.lon.toFixed(7), +p.acc.toFixed(1), p.t]);

async function commitPolygon(target, coords, meta) {
  setTimeout(fitFinca, 60);
  if (target === 'linde') {
    cur.linde = { coords, ...meta, fecha: Date.now() };
  } else {
    const n = (cur.exclusiones || []).length + 1;
    cur.exclusiones = cur.exclusiones || [];
    cur.exclusiones.push({ id: uid(), nombre: 'Exclusión ' + n, coords, metodo: meta.metodo, fecha: Date.now() });
    checkExclInside(coords);
  }
  await saveCur(); drawFinca(); toast('Guardado');
}
function checkExclInside(coords) {
  if (!cur.linde) return;
  const P = Geo.projFor(cur.linde.coords), L0 = Geo.toXY(cur.linde.coords, P);
  const out = coords.filter(c => !Geo.inPoly(P.fwd(c[0], c[1]), L0)).length;
  if (out) toast(`Aviso: ${out} vértice(s) de la exclusión quedan fuera del linde.`, 4000);
}
async function saveCur() {
  cur.mod = Date.now();
  if (cur.malla && cur.linde) { const r = genArboles(cur); if (!r.error) { cur.malla.arboles = r.arboles; cur.malla.sepFila = r.sepFila; cur.malla.sepFilas = r.sepFilas; } }
  await DB.put(cur);
}

