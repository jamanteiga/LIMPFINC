'use strict';
/* =========================================================
   v2.9 — Registro de errores (se carga lo primero para no perder ninguno)
   ========================================================= */
const ERRLOG = { lista: [], pend: false };
function registrarError(msg, donde, pila) {
  try {
    const e = {
      t: Date.now(), v: VERSION, msg: String(msg || '').slice(0, 400), donde: String(donde || '').slice(0, 200), pila: String(pila || '').slice(0, 900),
      vista: typeof view !== 'undefined' ? view : '', finca: typeof cur !== 'undefined' && cur ? cur.nombre : '', trabajando: typeof work !== 'undefined' && !!work,
      online: navigator.onLine, ua: navigator.userAgent.slice(0, 160)
    };
    const u = ERRLOG.lista[ERRLOG.lista.length - 1];
    if (u && u.msg === e.msg && u.donde === e.donde && e.t - u.t < 5000) { u.n = (u.n || 1) + 1; } else ERRLOG.lista.push(e);
    if (ERRLOG.lista.length > 100) ERRLOG.lista.splice(0, ERRLOG.lista.length - 100);
    guardarErrores();
  } catch (x) { }
}
function guardarErrores() {
  if (ERRLOG.pend) return; ERRLOG.pend = true;
  setTimeout(async () => {
    ERRLOG.pend = false;
    try { if (typeof DB !== 'undefined' && DB.kvPut) { const prev = (await DB.kvGet('errores')) || []; const ids = new Set(prev.map(x => x.t + x.msg)); await DB.kvPut('errores', prev.concat(ERRLOG.lista.filter(x => !ids.has(x.t + x.msg))).slice(-100)); ERRLOG.lista = []; } } catch (x) { }
    subirErrores();
  }, 1500);
}
// sube los errores a Supabase (tabla «errores», si existe); si no hay sesión o tabla, se quedan en el móvil
async function subirErrores() {
  try {
    if (typeof Sync === 'undefined' || !Sync.user || !navigator.onLine || !window.supabase || typeof Remote === 'undefined' || !Remote.upsert) return;
    const L_ = (await DB.kvGet('errores')) || [], pend = L_.filter(x => !x.sub); if (!pend.length) return;
    for (const x of pend) { await Remote.upsert('errores', { id: x.t + '-' + (x.msg.length + x.donde.length), data: x, updated_at: new Date(x.t).toISOString() }); x.sub = 1; }
    await DB.kvPut('errores', L_);
  } catch (x) { }
}
window.addEventListener('error', e => { const tg = e.target; if (tg && tg !== window && tg.tagName) { if (/^(SCRIPT|LINK)$/.test(tg.tagName)) registrarError('No se pudo cargar ' + (tg.src || tg.href), ''); return; } registrarError(e.message, (e.filename || '').replace(location.origin, '') + ':' + e.lineno + ':' + e.colno, e.error && e.error.stack); }, true);
window.addEventListener('unhandledrejection', e => { const r = e.reason || {}; registrarError('Promesa: ' + (r.message || r), '', r.stack); });
