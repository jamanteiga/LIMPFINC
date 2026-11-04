'use strict';
/* =========================================================
   v2.9 — Versión nueva con un toque, protección de los datos del móvil y visor de errores
   ========================================================= */
const ACT = { reg: null, nueva: null, ver: '', recargar: false };
const esInstalada = () => window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
function swRegistrar() {
  if (!('serviceWorker' in navigator) || !(location.protocol === 'https:' || location.hostname === 'localhost')) return;
  navigator.serviceWorker.register('sw.js').then(reg => {
    if (!reg) return; ACT.reg = reg;
    if (reg.waiting && navigator.serviceWorker.controller) actAvisar(reg.waiting);
    reg.addEventListener('updatefound', () => { const w = reg.installing; if (w) w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) actAvisar(w); }); });
    reg.update().catch(() => { });
    setInterval(() => reg.update().catch(() => { }), 30 * 60000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => { }); });
  }).catch(e => registrarError('Service worker: ' + e.message, ''));
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (ACT.recargar) location.reload(); });
}
function actAvisar(w) {
  ACT.nueva = w;
  try { const ch = new MessageChannel(); ch.port1.onmessage = e => { ACT.ver = e.data || ''; actBanner(); }; w.postMessage({ type: 'VERSION' }, [ch.port2]); } catch (e) { }
  actBanner();
}
function actBanner() {
  if (!ACT.nueva) return;
  let el = $('actBan');
  if (!el) {
    el = document.createElement('div'); el.id = 'actBan';
    el.style.cssText = 'position:fixed;left:8px;right:8px;top:calc(env(safe-area-inset-top) + 58px);z-index:3500;background:#1b5e20;color:#fff;border-radius:14px;padding:10px 12px;display:flex;align-items:center;gap:10px;box-shadow:0 4px 16px rgba(0,0,0,.35);font-size:15px';
    document.body.appendChild(el);
  }
  const ocupado = !!work || busy();
  el.innerHTML = `<span style="flex:1">🔄 Nueva versión ${esc(ACT.ver)} disponible${ocupado ? '<br><small>Se podrá actualizar al terminar ' + (work ? 'el trabajo' : 'lo que estás haciendo') + '</small>' : ''}</span>
    ${ocupado ? '' : '<button id="actOk" style="background:#fff;color:#1b5e20;border:0;border-radius:10px;padding:10px 14px;font-weight:800;font-size:15px">Actualizar</button>'}
    <button id="actX" style="background:transparent;color:#fff;border:0;font-size:20px;padding:4px 6px">✕</button>`;
  if ($('actOk')) $('actOk').onclick = actualizarYa;
  $('actX').onclick = () => el.remove();
}
function actualizarYa() {
  if (work || busy()) return actBanner();
  ACT.recargar = true; const b = $('actOk'); if (b) { b.disabled = true; b.textContent = 'Actualizando…'; }
  try { ACT.nueva.postMessage({ type: 'SKIP_WAITING' }); } catch (e) { }
  setTimeout(() => location.reload(), 4000);   // por si el aviso de cambio no llega
}
// ---- protección de los datos del móvil
async function almacenamiento() {
  const st = navigator.storage || {}, o = { persist: null, usado: null, cuota: null, instalada: esInstalada() };
  try { if (st.persisted) o.persist = await st.persisted(); if (!o.persist && st.persist) o.persist = await st.persist(); } catch (e) { }
  try { if (st.estimate) { const e = await st.estimate(); o.usado = e.usage; o.cuota = e.quota; } } catch (e) { }
  return o;
}
const mb = b => b == null ? '–' : fmt(b / 1048576, b < 10485760 ? 1 : 0) + ' MB';
function avisoInstalar(cont) {
  if (!cont || esInstalada() || SB.avisoInstalarOff || !esIOS) return;
  const d = document.createElement('div'); d.className = 'card warnc'; d.style.marginBottom = '10px';
  d.innerHTML = `<b>📲 Instala LIMPFINC en la pantalla de inicio</b><br><small>Safari puede borrar los datos de una web que no se abre en 7 días. Instalada no los borra y además va a pantalla completa: botón Compartir (□↑) › «Añadir a pantalla de inicio».</small>
    <div style="text-align:right;margin-top:6px"><button class="lnk" id="instOk">Entendido</button></div>`;
  cont.prepend(d);
  $('instOk').onclick = async () => { SB.avisoInstalarOff = true; await DB.kvPut('settings', SB); d.remove(); };
}
async function almacenSheet() {
  const o = await almacenamiento(), errs = (await DB.kvGet('errores')) || [];
  const nT = (await DB.tAll()).length, nF = (await DB.all()).length;
  sheet(`<h3>💾 Datos del móvil</h3>
    <div class="card">
      <div class="kv"><span>App instalada en la pantalla de inicio</span><span>${o.instalada ? '✅ sí' : '⚠️ no'}</span></div>
      <div class="kv"><span>Datos protegidos (no se borran por falta de espacio)</span><span>${o.persist ? '✅ sí' : o.persist === false ? '⚠️ no' : '–'}</span></div>
      <div class="kv"><span>Espacio usado</span><span>${mb(o.usado)}${o.cuota ? ' de ' + mb(o.cuota) : ''}</span></div>
      <div class="kv"><span>Fincas · rutas guardadas</span><span>${nF} · ${nT}</span></div>
      <div class="kv"><span>Versión</span><span>${VERSION}</span></div>
    </div>
    <div class="note">${o.instalada ? '' : 'Instálala: Compartir (□↑) › «Añadir a pantalla de inicio». '}Las rutas se guardan comprimidas (4–5 veces menos espacio). Con sesión iniciada, todo está también en Supabase; además conviene exportar la copia de seguridad de vez en cuando.</div>
    <button class="btn sec" id="alCp" style="margin-top:8px">⬇️ Exportar copia de seguridad (JSON)</button>
    <button class="btn sec" id="alEr" style="margin-top:8px">🐞 Registro de errores (${errs.length})</button>
    ${ACT.reg ? '<button class="btn sec" id="alUp" style="margin-top:8px">🔄 Buscar versión nueva</button>' : ''}`,
    () => {
      $('alCp').onclick = () => { closeSheet(); exportBackup(); };
      $('alEr').onclick = erroresSheet;
      if ($('alUp')) $('alUp').onclick = async () => { try { await ACT.reg.update(); } catch (e) { } setTimeout(() => toast(ACT.nueva ? '🔄 Hay una versión nueva: pulsa «Actualizar» abajo' : '✅ Tienes la última versión (' + VERSION + ')', 3500), 1500); };
    });
}
async function erroresSheet() {
  const L_ = ((await DB.kvGet('errores')) || []).slice().reverse();
  const txt = L_.map(e => `[${new Date(e.t).toLocaleString('es-ES')}] v${e.v} · ${e.vista}${e.finca ? ' · ' + e.finca : ''}${e.trabajando ? ' · trabajando' : ''}${e.n > 1 ? ' · ×' + e.n : ''}\n${e.msg}${e.donde ? '\n  en ' + e.donde : ''}${e.pila ? '\n  ' + e.pila.split('\n').slice(0, 4).join('\n  ') : ''}`).join('\n\n');
  sheet(`<h3>🐞 Registro de errores</h3>
    ${L_.length ? `<div class="note">${L_.length} error${L_.length > 1 ? 'es' : ''} (los últimos 100). ${Sync.user ? 'Se suben también a Supabase (tabla «errores»).' : ''} Si algo falló en el campo, compártelo para revisarlo.</div>
    <pre style="white-space:pre-wrap;font-size:11px;max-height:45vh;overflow:auto;background:#f5f5f5;border-radius:8px;padding:8px">${esc(txt.slice(0, 20000))}</pre>
    <div class="row"><button class="btn sec" id="erSh">📤 Compartir / copiar</button><button class="btn sec" id="erDel">🗑 Vaciar</button></div>` : '<div class="note">✅ Sin errores registrados.</div>'}`,
    () => {
      if (!L_.length) return;
      $('erSh').onclick = async () => { const t = `LIMPFINC ${VERSION} · errores\n\n` + txt; try { if (navigator.share) await navigator.share({ title: 'LIMPFINC · errores', text: t }); else { await navigator.clipboard.writeText(t); toast('Copiado'); } } catch (e) { try { await navigator.clipboard.writeText(t); toast('Copiado'); } catch (x) { download('limpfinc_errores.txt', t, 'text/plain'); } } };
      $('erDel').onclick = () => confirmSheet('¿Vaciar el registro de errores?', 'Vaciar', async () => { await DB.kvPut('errores', []); toast('Registro vaciado'); }, true);
    });
}
