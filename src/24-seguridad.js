'use strict';
/* =========================================================
   v2.8 — Seguridad: inclinómetro antivuelco y aviso de persona caída
   ========================================================= */
const INC_DEF = { on: true, aviso: 15, peligro: 20, vuelco: 40, golpeG: 3, inmovilMin: 10, respuestaS: 60, contacto: '', telefono: '', g0: null, inv: false, caida: true };
const incCfg = () => (SB.incl = { ...INC_DEF, ...(SB.incl || {}) });
const esIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const INCL = { on: false, gF: null, lin: 0, roll: 0, pitch: 0, t: 0, est: 'ok', since: {}, lastSay: 0, lastMd: 0, anchor: null, anchorT: 0, md: null, ac: null, tick: null };
// ---- sonido (WebAudio; se desbloquea con un toque)
function incAudio() { try { if (!INCL.ac) INCL.ac = new (window.AudioContext || window.webkitAudioContext)(); if (INCL.ac.state === 'suspended') INCL.ac.resume(); } catch (e) { } return INCL.ac; }
function pitido(f, dur, vol) { const ac = incAudio(); if (!ac) return; const o = ac.createOscillator(), g = ac.createGain(); o.type = 'square'; o.frequency.value = f || 1800; g.gain.value = vol || 0.25; o.connect(g).connect(ac.destination); const t = ac.currentTime; g.gain.setValueAtTime(vol || 0.25, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.15)); o.start(t); o.stop(t + (dur || 0.15) + 0.02); }
function sirena(on) {
  const ac = incAudio(); if (!ac) return;
  if (!on) { if (INCL.sir) { try { INCL.sir.o.stop(); } catch (e) { } INCL.sir = null; } return; }
  if (INCL.sir) return; const o = ac.createOscillator(), g = ac.createGain(), l = ac.createOscillator(), lg = ac.createGain();
  o.type = 'sawtooth'; o.frequency.value = 1200; l.frequency.value = 1.6; lg.gain.value = 500; l.connect(lg).connect(o.frequency); g.gain.value = 0.35; o.connect(g).connect(ac.destination); o.start(); l.start(); INCL.sir = { o, l };
}
// ---- marco del vehículo: gravedad calibrada (o el eje del móvil más próximo) y eje de avance
const v3 = { dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], n: a => { const m = Math.hypot(...a) || 1; return a.map(x => x / m); }, sub: (a, b) => a.map((x, i) => x - b[i]), k: (a, s) => a.map(x => x * s) };
function incMarco() {
  const c = incCfg(); let g0 = c.g0;
  if (!g0 && INCL.gF) { const a = INCL.gF.map(Math.abs), i = a.indexOf(Math.max(...a)); g0 = [0, 0, 0]; g0[i] = Math.sign(INCL.gF[i]) * 9.81; }   // sin calibrar: el móvil va recto en su soporte
  if (!g0) return null;
  const gh = v3.n(g0), a = gh.map(Math.abs), eje = a.indexOf(Math.max(...a));
  // avance: pantalla hacia el conductor (vertical o apaisado) → −z; móvil tumbado → la parte de arriba (+y) hacia delante
  let f = eje === 2 ? [0, 1, 0] : [0, 0, -1]; if (c.inv) f = v3.k(f, -1);
  f = v3.n(v3.sub(f, v3.k(gh, v3.dot(f, gh))));
  const abajo = esIOS ? 1 : -1;   // iOS da la gravedad hacia abajo; Android, la reacción hacia arriba
  return { gh, f, r: v3.cross(gh, f), abajo, montaje: eje === 2 ? 'tumbado' : eje === 1 ? 'vertical' : 'apaisado' };
}
function onMotion(e) {
  const ag = e.accelerationIncludingGravity; if (!ag || ag.x == null) return;
  const now = performance.now(), dt = INCL.t ? Math.min(0.5, (now - INCL.t) / 1000) : 0.02; INCL.t = now;
  const v = [ag.x, ag.y, ag.z];
  if (!INCL.gF) INCL.gF = v; else { const k = dt / (0.8 + dt); INCL.gF = INCL.gF.map((x, i) => x + k * (v[i] - x)); }
  const li = e.acceleration && e.acceleration.x != null ? Math.hypot(e.acceleration.x, e.acceleration.y, e.acceleration.z) : Math.hypot(...v3.sub(v, INCL.gF));
  INCL.lin = li; if (li >= incCfg().golpeG * 9.81) incGolpe(li);
}
function incCalc() {
  const M = incMarco(); if (!M || !INCL.gF) return null;
  const g = v3.n(INCL.gF);
  INCL.roll = Math.asin(Math.max(-1, Math.min(1, v3.dot(g, M.r)))) * 180 / Math.PI;           // + = lado derecho más bajo
  INCL.pitch = M.abajo * Math.asin(Math.max(-1, Math.min(1, v3.dot(g, M.f)))) * 180 / Math.PI;  // + = morro hacia abajo
  return M;
}
async function incStart(silencio) {
  const c = incCfg(); if (!c.on) return false; incAudio();
  if (INCL.on) return true;
  if (typeof DeviceMotionEvent === 'undefined') { if (!silencio) toast('Este dispositivo no tiene sensor de movimiento'); return false; }
  try {
    if (typeof DeviceMotionEvent.requestPermission === 'function') { const r = await DeviceMotionEvent.requestPermission(); if (r !== 'granted') { incChip('perm'); if (!silencio) toast('Sin permiso de movimiento: toca 📐 para activarlo', 4000); return false; } }
  } catch (e) { incChip('perm'); return false; }
  window.addEventListener('devicemotion', onMotion); INCL.on = true; INCL.est = 'ok'; INCL.since = {};
  INCL.anchor = lastPos ? [lastPos.lat, lastPos.lon] : null; INCL.anchorT = Date.now();
  clearInterval(INCL.tick); INCL.tick = setInterval(incTick, 100); incChip(); return true;
}
function incStop() { window.removeEventListener('devicemotion', onMotion); INCL.on = false; clearInterval(INCL.tick); INCL.tick = null; INCL.gF = null; incChip('off'); incOverlay(null); }
function incChip(modo) {
  let el = $('incChip');
  if (!el) { el = document.createElement('button'); el.id = 'incChip'; el.className = 'gpsChip'; el.style.cssText = 'left:8px;top:52px;z-index:1100;font-size:15px;padding:7px 12px'; el.onclick = async () => { if (!INCL.on && !(await incStart())) return; ceroSheet(); }; $('mapWrap').appendChild(el); }
  if (modo === 'off') { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  if (modo === 'perm') { el.innerHTML = '📐 Toca para activar'; el.style.background = '#fff3e0'; return; }
  const lr = Math.abs(INCL.roll), hoy = calHoy();
  el.style.background = INCL.est === 'peligro' ? '#d50000' : INCL.est === 'aviso' ? '#ff9800' : hoy ? 'rgba(255,255,255,.97)' : '#fff3e0'; el.style.color = INCL.est === 'peligro' ? '#fff' : '#222';
  el.innerHTML = `📐 ${Math.round(lr)}°${lr >= 1 ? (INCL.roll > 0 ? ' der' : ' izq') : ''}${hoy ? '' : ' · <b>fijar 0°</b>'}`;
}
const calHoy = () => { const c = incCfg(); return !!(c.g0 && c.g0Fecha && new Date(c.g0Fecha).toDateString() === new Date().toDateString()); };
async function fijarCero() {
  if (!INCL.on && !(await incStart())) return false;
  await new Promise(r => setTimeout(r, 800));   // deja asentarse el filtro
  const m = []; for (let i = 0; i < 15; i++) { await new Promise(r => setTimeout(r, 100)); if (INCL.gF) m.push(INCL.gF.slice()); }
  if (m.length < 5) { toast('Sin datos del sensor de movimiento'); return false; }
  const c = incCfg(); c.g0 = [0, 1, 2].map(i => m.reduce((a, v) => a + v[i], 0) / m.length); c.g0Fecha = Date.now();
  await DB.kvPut('settings', SB); INCL.since = {}; INCL.est = 'ok'; incChip();
  speak('Inclinómetro a cero', true); toast('🎯 0° fijado en esta posición de trabajo', 3000); return true;
}
function ceroSheet(inicio) {
  const c = incCfg(), hoy = calHoy();
  sheet(`<h3>📐 Inclinómetro lateral</h3>
    <div style="text-align:center;font-size:52px;font-weight:900;margin:4px 0" id="czV">–</div>
    <div class="note" style="text-align:center">${hoy ? '0° fijado hoy a las ' + new Date(c.g0Fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : inicio ? '<b>Primer trabajo de hoy:</b> fija el 0° antes de empezar.' : c.g0Fecha ? 'Último 0°: ' + fFecha(c.g0Fecha) + '. Fíjalo de nuevo hoy.' : 'Aún no has fijado el 0°.'}</div>
    <div class="card">1. Móvil puesto en su soporte, en su posición normal de trabajo.<br>2. Tractor parado en terreno llano.<br>3. Pulsa el botón y no lo toques 3 s.</div>
    <button class="btn" id="czOk" style="font-size:20px;padding:18px">🎯 Fijar 0° aquí</button>
    <button class="lnk" id="czAj" style="margin-top:10px">⚙️ Ajustes de seguridad (avisos, contacto de emergencia…)</button>
    ${inicio ? '<button class="lnk" id="czNo" style="margin-top:6px;color:var(--sub)">Ahora no</button>' : ''}`,
    () => {
      const iv = setInterval(() => { const el = $('czV'); if (!el) return clearInterval(iv); const lr = Math.abs(INCL.roll); el.textContent = Math.round(lr) + '°' + (lr >= 1 ? (INCL.roll > 0 ? ' der' : ' izq') : ''); }, 250);
      $('czOk').onclick = async () => { const b = $('czOk'); b.disabled = true; b.textContent = 'Midiendo… no lo toques'; const ok = await fijarCero(); if (ok) closeSheet(); else { b.disabled = false; b.textContent = '🎯 Fijar 0° aquí'; } };
      $('czAj').onclick = () => seguridadSheet();
      if ($('czNo')) $('czNo').onclick = closeSheet;
    });
}
function incOverlay(txt, rojo) {
  let el = $('incOv');
  if (!txt) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'incOv'; el.style.cssText = 'position:fixed;left:8px;right:8px;top:calc(env(safe-area-inset-top) + 60px);z-index:4000;border-radius:16px;padding:14px;text-align:center;font-weight:800;font-size:26px;color:#fff;box-shadow:0 4px 18px rgba(0,0,0,.4);pointer-events:none'; document.body.appendChild(el); }
  el.style.background = rojo ? '#d50000' : '#ef6c00'; el.innerHTML = txt;
}
function incTick() {
  const M = incCalc(); if (!M) return;
  const c = incCfg(), now = Date.now(), lr = Math.abs(INCL.roll), fb = Math.abs(INCL.pitch);
  const dura = (k, cond, s) => { if (cond) { INCL.since[k] = INCL.since[k] || now; return now - INCL.since[k] >= s * 1000; } INCL.since[k] = 0; return false; };
  // vuelco: inclinación imposible de trabajo mantenida 2 s
  if (c.caida && dura('vuelco', Math.max(lr, fb) >= c.vuelco, 2)) manDown('vuelco');
  const pel = dura('pel', lr >= c.peligro, 1), avi = dura('avi', lr >= c.aviso, 1.5);
  const est = pel ? 'peligro' : avi ? 'aviso' : lr < c.aviso - 2 ? 'ok' : INCL.est;
  const lado = INCL.roll > 0 ? 'a la derecha' : 'a la izquierda', ang = Math.round(lr);
  if (est !== INCL.est) { INCL.est = est; INCL.lastSay = 0; if (est !== 'ok') incRegistrar(est, ang, lado); }
  if (est === 'peligro') { incOverlay(`⚠️ PELIGRO DE VUELCO<br><span style="font-size:44px">${ang}°</span> ${lado}`, true); if (now - INCL.lastSay > 4000) { INCL.lastSay = now; speak(`Peligro de vuelco. ${ang} grados ${lado}`, true); } if (now % 600 < 120) pitido(2200, 0.12, 0.35); }
  else if (est === 'aviso') { incOverlay(`Precaución: ${ang}° ${lado}`); if (now - INCL.lastSay > 8000) { INCL.lastSay = now; speak(`Precaución. Inclinación ${ang} grados ${lado}`, true); pitido(1500, 0.2); } }
  else incOverlay(null);
  if (now % 500 < 110) incChip();
  // inmóvil durante el trabajo (no cuenta la pausa manual)
  if (c.caida && work && !(work.paused && !work.autoPaused) && lastPos) {
    const p = [lastPos.lat, lastPos.lon];
    if (!INCL.anchor || Geo.lenLL([INCL.anchor, p]) > 8) { INCL.anchor = p; INCL.anchorT = now; }
    else if (now - INCL.anchorT > c.inmovilMin * 60000) { INCL.anchorT = now; manDown('inmovil'); }
  } else INCL.anchorT = now;
}
async function incRegistrar(nivel, ang, lado) {
  if (!cur || !lastPos) return; const ll = [+lastPos.lat.toFixed(7), +lastPos.lon.toFixed(7)];
  cur.inclinaciones = cur.inclinaciones || [];
  const prev = cur.inclinaciones.find(x => Geo.lenLL([x.ll, ll]) < 5);
  if (prev) { if (ang > prev.ang) Object.assign(prev, { ang, lado, nivel, fecha: Date.now() }); prev.n = (prev.n || 1) + 1; }
  else cur.inclinaciones.push({ id: uid(), ll, ang, lado, nivel, fecha: Date.now(), n: 1, trabId: work ? work.trab.id : null });
  try { await saveCur(); drawFinca(); } catch (e) { }
}
function drawInclinaciones(f, layer) {
  if (CFG.inclina === false) return;
  (f.inclinaciones || []).forEach(x => L.marker(x.ll, { zIndexOffset: 850, icon: L.divIcon({ className: '', html: `<div class="pin" style="background:${x.nivel === 'peligro' ? '#d50000' : '#ef6c00'};width:auto;min-width:26px;padding:0 5px;border-radius:12px;font-size:11px;white-space:nowrap">📐 ${x.ang}°</div>`, iconSize: null, iconAnchor: [16, 11] }) })
    .on('click', () => toast(`📐 ${x.nivel === 'peligro' ? 'Peligro de vuelco' : 'Precaución'}: ${x.ang}° ${x.lado} · ${fFecha(x.fecha)}${x.n > 1 ? ' · ' + x.n + ' veces' : ''}`, 4000)).addTo(layer));
}
// ---- persona caída: golpe, vuelco o inmóvil → «¿Estás bien?» → alarma y aviso al contacto
function incGolpe(li) { if (!incCfg().caida || !work) return; manDown('golpe', li); }
function manDown(tipo, extra) {
  const c = incCfg(), now = Date.now();
  if (INCL.md || now - INCL.lastMd < 30000) return; INCL.lastMd = now;
  const txt = { vuelco: 'Posible vuelco', golpe: 'Golpe fuerte detectado', inmovil: `Sin moverte desde hace ${fmt(c.inmovilMin, 0)} min`, prueba: 'Prueba del aviso' }[tipo];
  const ov = document.createElement('div'); ov.id = 'mdOv';
  ov.style.cssText = 'position:fixed;inset:0;z-index:6000;background:#b71c1c;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;gap:14px';
  document.body.appendChild(ov);
  INCL.md = { tipo, t0: now, fase: 'pregunta', ov, ll: lastPos ? [lastPos.lat, lastPos.lon, lastPos.acc] : null };
  let n = tipo === 'prueba' ? 10 : c.respuestaS;
  const fin = async resp => {
    clearInterval(INCL.md.iv); sirena(false); ov.remove();
    if (cur) { cur.alarmas = cur.alarmas || []; cur.alarmas.push({ tipo, fecha: now, ll: INCL.md.ll, respuesta: resp }); if (cur.alarmas.length > 50) cur.alarmas.shift(); try { await saveCur(); } catch (e) { } }
    INCL.md = null; INCL.anchorT = Date.now(); speak(resp === 'ok' ? 'De acuerdo' : 'Alarma detenida', true);
  };
  const pinta = () => {
    if (INCL.md.fase === 'pregunta') ov.innerHTML = `<div style="font-size:22px;font-weight:700">⚠️ ${txt}</div><div style="font-size:40px;font-weight:900">¿ESTÁS BIEN?</div>
      <div style="font-size:64px;font-weight:900">${n}</div><div>Si no respondes, sonará la alarma y se preparará el aviso${c.telefono ? ' a ' + esc(c.contacto || c.telefono) : ''}.</div>
      <button id="mdOk" style="background:#fff;color:#1b5e20;border:0;border-radius:18px;font-size:30px;font-weight:900;padding:26px 30px;width:100%;max-width:420px">✅ ESTOY BIEN</button>
      <button id="mdYa" style="background:transparent;color:#fff;border:2px solid #fff;border-radius:14px;font-size:18px;padding:12px;width:100%;max-width:420px">🆘 Necesito ayuda ya</button>`;
    else {
      const ll = INCL.md.ll, url = ll ? `https://www.openstreetmap.org/?mlat=${ll[0].toFixed(6)}&mlon=${ll[1].toFixed(6)}#map=18/${ll[0].toFixed(6)}/${ll[1].toFixed(6)}` : '';
      const msg = `LIMPFINC · ${txt}${cur ? ' en ' + cur.nombre : ''} a las ${new Date(now).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}. No responde. Posición: ${ll ? ll[0].toFixed(6) + ', ' + ll[1].toFixed(6) + ' (±' + Math.round(ll[2] || 0) + ' m) ' + url : 'sin GPS'}`;
      INCL.md.msg = msg;
      const tel = (c.telefono || '').replace(/[^\d+]/g, '');
      ov.innerHTML = `<div style="font-size:34px;font-weight:900">🆘 ALARMA</div><div style="font-size:18px">${txt}. Pide ayuda:</div>
        ${tel ? `<a href="sms:${tel}&body=${encodeURIComponent(msg)}" style="display:block;background:#fff;color:#b71c1c;border-radius:16px;font-size:22px;font-weight:900;padding:18px;width:100%;max-width:420px;text-decoration:none">📩 Enviar SMS a ${esc(c.contacto || c.telefono)}</a>
        <a href="tel:${tel}" style="display:block;background:#fff;color:#b71c1c;border-radius:16px;font-size:20px;font-weight:800;padding:14px;width:100%;max-width:420px;text-decoration:none">📞 Llamar a ${esc(c.contacto || c.telefono)}</a>` : '<div style="background:#fff3;border-radius:12px;padding:10px">Sin contacto de emergencia: añádelo en ⚙️ Ajustes › 📐 Seguridad</div>'}
        <a href="tel:112" style="display:block;background:#fff;color:#b71c1c;border-radius:16px;font-size:22px;font-weight:900;padding:16px;width:100%;max-width:420px;text-decoration:none">📞 Llamar al 112</a>
        ${navigator.share ? '<button id="mdSh" style="background:transparent;color:#fff;border:2px solid #fff;border-radius:14px;font-size:18px;padding:12px;width:100%;max-width:420px">📤 Compartir posición (WhatsApp, Telegram…)</button>' : ''}
        <button id="mdOk" style="background:transparent;color:#fff;border:2px solid #fff;border-radius:14px;font-size:18px;padding:12px;width:100%;max-width:420px">Estoy bien: parar alarma</button>`;
      if ($('mdSh')) $('mdSh').onclick = () => navigator.share({ title: 'LIMPFINC · aviso', text: msg }).catch(() => { });
    }
    $('mdOk').onclick = () => fin(INCL.md.fase === 'pregunta' ? 'ok' : 'alarma-parada');
    if ($('mdYa')) $('mdYa').onclick = () => alarma();
  };
  const alarma = () => { INCL.md.fase = 'alarma'; clearInterval(INCL.md.iv); pinta(); sirena(true); speak('Alarma. Posible accidente.', true); INCL.md.iv = setInterval(() => speak('Alarma. Posible accidente. Llamar al uno uno dos.', true), 15000); };
  pinta(); speak(`${txt}. ¿Estás bien? Toca la pantalla`, true); pitido(1800, 0.3, 0.4);
  INCL.md.iv = setInterval(() => { n--; if (n <= 0) return alarma(); const el = ov.querySelector('div:nth-child(3)'); if (el) el.textContent = n; if (n % 2 === 0) pitido(1800, 0.2, 0.4); if (n % 10 === 0) speak('¿Estás bien?', true); }, 1000);
}
// ---- hoja de ajustes de seguridad
function seguridadSheet() {
  const c = incCfg(), n = v => String(v ?? '').replace('.', ','), M = INCL.on ? incCalc() : null;
  const pts = (cur && cur.inclinaciones) || [], al = (cur && cur.alarmas) || [];
  sheet(`<h3>📐 Seguridad</h3>
    <div class="card">
      <div class="srow"><span><b>Inclinómetro antivuelco</b><br><small style="color:var(--sub)">Se activa al trabajar. El iPhone fijo en la cabina, con la pantalla encendida.</small></span><input type="checkbox" id="sgOn" ${c.on ? 'checked' : ''} style="width:auto"></div>
      <div class="kv"><span>Inclinación lateral ahora</span><span id="sgNow">${INCL.on ? `${Math.round(Math.abs(INCL.roll))}° ${INCL.roll > 0 ? 'der' : 'izq'}` : 'sensor parado'}</span></div>
      <div class="kv"><span>Posición 0°</span><span>${c.g0Fecha ? (calHoy() ? '✅ fijada hoy ' + new Date(c.g0Fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 'fijada ' + fFecha(c.g0Fecha) + ' · hay que fijarla hoy') : 'sin fijar'}</span></div>
      <button class="btn" id="sgCal" style="margin-top:8px">🎯 Fijar 0° (móvil en su posición de trabajo, tractor en llano)</button>
      <div class="note">Se pide al empezar el primer trabajo de cada día. Tocando 📐 en el mapa se puede volver a fijar.</div>
      <div class="srow"><span>La pantalla mira hacia delante (no al conductor)</span><input type="checkbox" id="sgInv" ${c.inv ? 'checked' : ''} style="width:auto"></div>
      <div class="row"><div><label class="f">Precaución lateral (°)</label><input class="inp" id="sgA" inputmode="decimal" value="${n(c.aviso)}"></div><div><label class="f">Peligro lateral (°)</label><input class="inp" id="sgP" inputmode="decimal" value="${n(c.peligro)}"></div></div>
      <div class="note">Cada aviso queda marcado 📐 en el mapa de la finca.</div>
    </div>
    <div class="card">
      <div class="srow"><span><b>Aviso de persona caída</b><br><small style="color:var(--sub)">Golpe fuerte, vuelco (≥ ${c.vuelco}°) o inmóvil trabajando → «¿Estás bien?» → alarma.</small></span><input type="checkbox" id="sgMd" ${c.caida ? 'checked' : ''} style="width:auto"></div>
      <label class="f">Contacto de emergencia</label><input class="inp" id="sgCn" placeholder="Nombre" value="${esc(c.contacto)}">
      <input class="inp" id="sgTe" type="tel" placeholder="Teléfono (+34 6…)" value="${esc(c.telefono)}" style="margin-top:6px">
      <div class="row"><div><label class="f">Inmóvil (min)</label><input class="inp" id="sgIm" inputmode="decimal" value="${n(c.inmovilMin)}"></div><div><label class="f">Tiempo para responder (s)</label><input class="inp" id="sgRs" inputmode="decimal" value="${n(c.respuestaS)}"></div></div>
      <div class="row"><div><label class="f">Golpe (g)</label><input class="inp" id="sgG" inputmode="decimal" value="${n(c.golpeG)}"></div><div><label class="f">Vuelco (°)</label><input class="inp" id="sgV" inputmode="decimal" value="${n(c.vuelco)}"></div></div>
      <div class="note">El iPhone no deja que una app web envíe el SMS sola: la alarma lo deja escrito con tu posición y solo hay que pulsar «Enviar». Con la pantalla bloqueada o la app cerrada no vigila.</div>
      <button class="btn sec" id="sgT" style="margin-top:8px">🔔 Probar el aviso (10 s)</button>
    </div>
    ${pts.length ? `<div class="sgrp">Puntos de inclinación en ${esc(cur.nombre)} (${pts.length})</div>${pts.slice().sort((a, b) => b.ang - a.ang).slice(0, 8).map(x => `<div class="kv"><span>📐 ${x.ang}° ${esc(x.lado)}${x.n > 1 ? ' · ' + x.n + ' veces' : ''}</span><span>${fFecha(x.fecha)}</span></div>`).join('')}<button class="lnk" id="sgBo" style="color:var(--err)">Borrar los puntos de inclinación</button>` : ''}
    ${al.length ? `<div class="sgrp">Avisos de caída (${al.length})</div>${al.slice(-5).reverse().map(x => `<div class="kv"><span>${x.tipo} · ${x.respuesta === 'ok' ? '✅ respondió' : '🆘 alarma'}</span><span>${fFecha(x.fecha)}</span></div>`).join('')}` : ''}`,
    () => {
      const rd = id => parseFloat($(id).value.replace(',', '.'));
      const guarda = async () => {
        const v = { on: $('sgOn').checked, inv: $('sgInv').checked, caida: $('sgMd').checked, aviso: rd('sgA'), peligro: rd('sgP'), inmovilMin: rd('sgIm'), respuestaS: rd('sgRs'), golpeG: rd('sgG'), vuelco: rd('sgV'), contacto: $('sgCn').value.trim(), telefono: $('sgTe').value.trim() };
        if (!(v.aviso > 2 && v.aviso < v.peligro && v.peligro < 45 && v.inmovilMin >= 1 && v.respuestaS >= 10 && v.golpeG >= 1.5 && v.vuelco > v.peligro)) return toast('Revisa los valores');
        Object.assign(incCfg(), v); await DB.kvPut('settings', SB); if (!v.on && INCL.on) incStop();
      };
      document.querySelectorAll('.sheet input').forEach(i => i.onchange = guarda);
      $('sgCal').onclick = async () => { const b = $('sgCal'); b.disabled = true; b.textContent = 'Midiendo… no lo toques'; if (await fijarCero()) seguridadSheet(); else { b.disabled = false; b.textContent = '🎯 Fijar 0°'; } };
      $('sgT').onclick = async () => { await guarda(); closeSheet(); incAudio(); manDown('prueba'); };
      if ($('sgBo')) $('sgBo').onclick = () => confirmSheet('¿Borrar los puntos de inclinación de esta finca?', 'Borrar', async () => { cur.inclinaciones = []; await saveCur(); drawFinca(); }, true);
      if (INCL.on) { const iv = setInterval(() => { const el = $('sgNow'); if (!el) return clearInterval(iv); el.textContent = `${Math.round(Math.abs(INCL.roll))}° ${INCL.roll > 0 ? 'der' : 'izq'}`; }, 300); }
    });
}

