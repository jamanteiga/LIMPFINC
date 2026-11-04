'use strict';
/* =========================================================
   DIBUJO MANUAL
   ========================================================= */
let draw = null;
function startDraw(target) {
  draw = { target, pts: [] };
  draw.layer = L.polygon([], { color: target === 'linde' ? '#1b5e20' : '#b71c1c', weight: 2.5, dashArray: '5 4', fillOpacity: .25 }).addTo(lyr.tmp);
  draw.mk = L.layerGroup().addTo(lyr.tmp);
  map.on('click', drawClick);
  drawPanel();
}
function drawPanel() {
  const n = draw.pts.length;
  showTool(draw.target === 'linde' ? 'Dibujar linde' : 'Dibujar exclusión',
    n < 3 ? `Toca el mapa para añadir vértices (${n}/3 mínimo).` : `${n} vértices · ${fmtArea(Geo.areaLL(draw.pts))}`,
    [['Cancelar', 'sec', () => endDraw()], ['Deshacer', 'sec', () => { draw.pts.pop(); drawUpd(); }, !n],
     ['Terminar', '', async () => {
       const P = Geo.projFor(draw.pts); let xy = Geo.ccw(Geo.toXY(draw.pts, P));
       if (Geo.selfIntersects(xy)) toast('Aviso: el polígono se cruza consigo mismo', 3500);
       const coords = Geo.toLL(xy, P), t = draw.target; endDraw();
       await commitPolygon(t, coords, { metodo: 'manual' }); guiaExcl(true);
     }, n < 3]]);
}
function drawClick(e) { draw.pts.push([e.latlng.lat, e.latlng.lng]); drawUpd(); }
function drawUpd() {
  draw.layer.setLatLngs(draw.pts); draw.mk.clearLayers();
  draw.pts.forEach(p => L.marker(p, { icon: vIcon(draw.target === 'excl'), interactive: false }).addTo(draw.mk));
  drawPanel();
}
function endDraw() { map.off('click', drawClick); lyr.tmp.clearLayers(); draw = null; showMain(); }
const vIcon = (ex, del) => L.divIcon({ className: '', html: `<div class="vtx ${ex ? 'ex' : ''} ${del ? 'del' : ''}"></div>`, iconSize: [18, 18], iconAnchor: [9, 9] });
const midIcon = L.divIcon({ className: '', html: '<div class="mid"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });

/* =========================================================
   EDICIÓN DE VÉRTICES
   ========================================================= */
let edit = null;
function editMenu() {
  if (busy()) return;
  const items = [];
  if (cur.linde) items.push(['linde', null, '⬠ Linde', `${cur.linde.coords.length} vértices`]);
  (cur.exclusiones || []).forEach(e => items.push(['excl', e.id, '⛔ ' + esc(e.nombre), `${e.coords.length} vértices · ${fmtArea(Geo.areaLL(e.coords))}`]));
  if (!items.length) return toast('No hay nada que editar todavía');
  sheet(`<h3>¿Qué quieres editar?</h3>` + items.map((it, i) => `<button class="opt" data-i="${i}">${it[2]}<small>${it[3]}</small></button>`).join(''),
    sh => sh.querySelectorAll('.opt').forEach(b => b.onclick = () => { closeSheet(); const it = items[+b.dataset.i]; startEdit(it[0], it[1]); }));
}
function startEdit(kind, id) {
  const src = kind === 'linde' ? cur.linde.coords : cur.exclusiones.find(e => e.id === id).coords;
  edit = { kind, id, pts: src.map(p => p.slice()), delMode: false };
  lyr.finca.clearLayers(); drawFincaExcept(kind, id);
  edit.poly = L.polygon(edit.pts, { color: kind === 'linde' ? '#1b5e20' : '#b71c1c', weight: 3, fillColor: kind === 'linde' ? '#a5d6a7' : '#757575', fillOpacity: .35 }).addTo(lyr.edit);
  editMarkers(); editPanel();
}
function drawFincaExcept(kind, id) {
  if (cur.linde && kind !== 'linde') L.polygon(cur.linde.coords, { color: '#1b5e20', weight: 2, fillColor: '#a5d6a7', fillOpacity: .2, interactive: false }).addTo(lyr.finca);
  (cur.exclusiones || []).forEach(e => { if (!(kind === 'excl' && e.id === id)) L.polygon(e.coords, { color: '#b71c1c', weight: 1.5, dashArray: '6 4', fillColor: '#757575', fillOpacity: .4, interactive: false }).addTo(lyr.finca); });
}
function editMarkers() {
  lyr.edit.eachLayer(l => { if (l !== edit.poly) lyr.edit.removeLayer(l); });
  const ex = edit.kind === 'excl';
  edit.pts.forEach((p, i) => {
    const m = L.marker(p, { icon: vIcon(ex, edit.delMode), draggable: !edit.delMode, zIndexOffset: 500 }).addTo(lyr.edit);
    m.on('drag', e => { edit.pts[i] = [e.latlng.lat, e.latlng.lng]; edit.poly.setLatLngs(edit.pts); });
    m.on('dragend', () => { editMarkers(); editPanel(); });
    m.on('click', () => {
      if (!edit.delMode) return;
      if (edit.pts.length <= 3) return toast('Mínimo 3 vértices');
      const quitado = edit.pts.splice(i, 1)[0]; edit.poly.setLatLngs(edit.pts); editMarkers(); editPanel();
      toastUndo('Vértice borrado', async () => { if (!edit) return; edit.pts.splice(i, 0, quitado); edit.poly.setLatLngs(edit.pts); editMarkers(); editPanel(); }, 4000);
    });
  });
  if (!edit.delMode) edit.pts.forEach((p, i) => {
    const q = edit.pts[(i + 1) % edit.pts.length];
    const m = L.marker([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], { icon: midIcon, zIndexOffset: 400 }).addTo(lyr.edit);
    m.on('click', () => { edit.pts.splice(i + 1, 0, [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]); edit.poly.setLatLngs(edit.pts); editMarkers(); editPanel(); });
  });
}
function editPanel() {
  const name = edit.kind === 'linde' ? 'linde' : cur.exclusiones.find(e => e.id === edit.id).nombre;
  const btns = [['Cancelar', 'sec', () => endEdit(false)],
    [edit.delMode ? 'Mover' : 'Borrar vért.', edit.delMode ? 'warn' : 'sec', () => { edit.delMode = !edit.delMode; editMarkers(); editPanel(); }]];
  if (edit.kind === 'excl') btns.push(['Eliminar', 'err', () => confirmSheet(`¿Eliminar «${esc(name)}»?`, 'Eliminar', async () => {
    const ex = cur.exclusiones.find(e => e.id === edit.id), f0 = cur;
    cur.exclusiones = cur.exclusiones.filter(e => e.id !== edit.id); await saveCur(); endEdit(false);
    toastUndo(`«${ex.nombre}» eliminada`, async () => { f0.exclusiones.push(ex); if (cur === f0) { await saveCur(); drawFinca(); } else await DB.put(f0); });
  }, true)]);
  btns.push(['Guardar', '', () => endEdit(true)]);
  showTool('Editar ' + name,
    (edit.delMode ? 'Toca un vértice para borrarlo.' : 'Arrastra los vértices. Toca ○ para insertar uno nuevo.') + ` · ${edit.pts.length} vértices · ${fmtArea(Geo.areaLL(edit.pts))}`,
    btns);
}
async function endEdit(save) {
  if (save) {
    const P = Geo.projFor(edit.pts); const xy = Geo.toXY(edit.pts, P);
    if (Geo.selfIntersects(xy)) toast('Aviso: el polígono se cruza consigo mismo', 3500);
    const coords = Geo.toLL(Geo.ccw(xy), P);
    if (edit.kind === 'linde') { cur.linde.coords = coords; cur.linde.editado = Date.now(); }
    else { const e = cur.exclusiones.find(e => e.id === edit.id); e.coords = coords; checkExclInside(coords); }
    await saveCur(); toast('Guardado');
  }
  lyr.edit.clearLayers(); edit = null; drawFinca(); showMain();
}

