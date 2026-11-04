'use strict';
/* =========================================================
   SUPABASE: sesión y sincronización (local primero, nube después)
   ========================================================= */
const SUPA_URL = 'https://wuarkraddnndmgvfnkmm.supabase.co';
const SUPA_KEY = 'sb_publishable_qF-x44yXSydPBojMk_GOUg_TM34uXFI';
const CAT_COLS = {
  tractores: ['nombre', 'tipo', 'potencia_cv', 'ancho_m', 'longitud_m', 'radio_giro_m', 'deposito_l', 'marcha_atras', 'notas'],
  aperos: ['nombre', 'labor', 'ancho_m', 'longitud_m', 'enganche', 'distancia_gps_m', 'desplazamiento_m', 'solape_m', 'velocidad_kmh', 'consumo_lh', 'potencia_cv', 'tdf_rpm', 'notas'],
  velocidades: ['labor', 'vegetacion', 'velocidad_kmh', 'notas']
};
const ORDER = ['fincas', 'planes', 'tractores', 'aperos', 'velocidades', 'ajustes', 'fotos', 'trabajos'];
const iso = ms => new Date(ms || Date.now()).toISOString();
const strip = o => { const c = { ...o }; delete c._sync; return c; };
const Remote = {
  c: null,
  init() { if (!this.c && window.supabase) this.c = window.supabase.createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'limpfinc-auth' } }); return !!this.c; },
  async session() { if (!this.init()) return null; const { data } = await this.c.auth.getSession(); return data.session; },
  async login(email, pass) { this.init(); const { data, error } = await this.c.auth.signInWithPassword({ email, password: pass }); if (error) throw error; return data.session; },
  async logout() { if (this.c) await this.c.auth.signOut(); },
  async list(t, cols = '*') { const { data, error } = await this.c.from(t).select(cols); if (error) throw error; return data; },
  async getIn(t, ids) { const out = []; for (let i = 0; i < ids.length; i += 50) { const { data, error } = await this.c.from(t).select('*').in('id', ids.slice(i, i + 50)); if (error) throw error; out.push(...data); } return out; },
  async upsert(t, row, conflict) { const { error } = await this.c.from(t).upsert(row, conflict ? { onConflict: conflict } : undefined); if (error) throw error; },
  async del(t, id) { const { error } = await this.c.from(t).delete().eq('id', id); if (error) throw error; }
};
const Sync = {
  user: null, busy: false, state: 'off', err: '', pend: 0, last: 0, due: 0, tm: null,
  async mark(table, id, op) {
    if (!this.user) return;
    await DB.gPut('outbox', { key: table + ':' + id, table, id, op, t: Date.now() });
    this.count();
    this.schedule(table === 'trabajos' && work ? 90000 : 2500);
  },
  schedule(ms) {
    if (!this.user) return;
    const due = Date.now() + ms;
    if (this.tm && this.due <= due) return;        // ya hay una sincronización antes
    clearTimeout(this.tm); this.due = due; this.tm = setTimeout(() => { this.tm = null; this.flush(); }, ms);
  },
  async count() { try { this.pend = (await DB.gAll('outbox')).length; } catch { } this.paint(); },
  paint() {
    const el = $('syncSt'); if (!el) return;
    if (!this.user) { el.textContent = ''; el.title = ''; return; }
    el.textContent = this.busy ? '☁️⟳' : !navigator.onLine ? '☁️✕' : this.state === 'err' ? '☁️⚠️' : this.pend ? '☁️' + this.pend : '☁️✓';
  },
  async flush(force) {
    if (!this.user || this.busy || !navigator.onLine) return;
    this.busy = true; this.paint();
    try {
      const items = (await DB.gAll('outbox')).sort((a, b) => ORDER.indexOf(a.table) - ORDER.indexOf(b.table) || a.t - b.t);
      for (const it of items) {
        try { await this.push(it); }
        catch (e) {
          if (it.table === 'fotos') { this.fotosErr = e.message; continue; }
          if (it.table === 'planes') { this.planesErr = e.message; continue; }          // tabla de planes aún no creada (supabase_limpfinc_v200.sql)          // tabla de fotos aún no creada: se reintenta más tarde
          if (e && (e.code === '23503' || e.code === '42501')) console.warn('descartado', it, e); else throw e;
        }
        const cur_ = await DB.gGet('outbox', it.key); if (cur_ && cur_.t === it.t) await DB.gDel('outbox', it.key);
      }
      this.state = 'ok'; this.err = ''; this.last = Date.now();
    } catch (e) { this.state = 'err'; this.err = (e && e.message) || String(e); }
    finally { this.busy = false; this.count(); if (view === 'list' && !document.querySelector('.sheet')) showList(); }
  },
  async push(it) {
    const T = it.table;
    if (it.op === 'del') { if (T !== 'ajustes') await Remote.del(T, it.id); return; }
    if (T === 'fincas') { const f = await DB.get(it.id); if (!f) return; await Remote.upsert('fincas', { id: f.id, nombre: f.nombre, tipo: f.tipo, data: strip(f), updated_at: iso(f.mod) }); f._sync = f.mod; await DB.raw.put(f); return; }
    if (T === 'trabajos') { const t = await DB.tGet(it.id); if (!t) return; await Remote.upsert('trabajos', { id: t.id, finca_id: t.fincaId, data: strip(packT(t)), updated_at: iso(t.mod) }); t._sync = t.mod; await DB.raw.tPut(t); return; }
    if (T === 'ajustes') {
      const mod = (await DB.kvGet('ajustesMod')) || Date.now();
      await Remote.upsert('ajustes', { user_id: this.user.id, data: { settings: SB, repostajes: await DB.kvGet('repostajes'), filtros: await DB.kvGet('filtros'), capas: await DB.kvGet('capas') }, updated_at: iso(mod) }, 'user_id');
      return;
    }
    if (T === 'planes') { const x = await DB.gGet('planes', it.id); if (!x) return; await Remote.upsert('planes', { id: x.id, finca_id: x.fincaId, data: strip(x), updated_at: iso(x.mod) }); x._sync = x.mod; await DB.gPut('planes', x); this.planesErr = ''; return; }
    if (T === 'fotos') { const x = await DB.gGet('fotos', it.id); if (!x) return; await Remote.upsert('fotos', { id: x.id, finca_id: x.fincaId, caption: x.caption, lat: x.lat, lon: x.lon, img: x.img, fecha: iso(x.fecha), updated_at: iso(x.mod) }); x._sync = x.mod; await DB.gPut('fotos', x); return; }
    const o = await DB.gGet(T, it.id); if (!o) return;
    const row = { id: o.id, updated_at: iso(o.mod) }; CAT_COLS[T].forEach(k => row[k] = o[k] ?? null);
    if (T === 'tractores' && this.sinTipo) delete row.tipo;
    try { await Remote.upsert(T, row); } catch (e) { if (T === 'tractores' && /tipo/.test(e.message || '') && !this.sinTipo) { this.sinTipo = true; delete row.tipo; await Remote.upsert(T, row); } else throw e; } o._sync = o.mod; await DB.gPut(T, o);
  },
  async pull() {
    if (!this.user || !navigator.onLine) return;
    this.busy = true; this.paint();
    try {
      const pend = new Set((await DB.gAll('outbox')).map(x => x.key));
      // tablas con contenido JSON (fincas, trabajos): primero solo id+fecha, luego lo que cambió
      for (const [T, getAll, put, del, toLocal] of [
        ['fincas', () => DB.all(), o => DB.raw.put(o), id => DB.raw.del(id), r => ({ ...r.data, id: r.id, nombre: r.nombre, tipo: r.tipo })],
        ['trabajos', () => DB.tAll(), o => DB.raw.tPut(o), id => DB.raw.tDel(id), r => ({ ...r.data, id: r.id, fincaId: r.finca_id })]
      ]) {
        const rem = await Remote.list(T, 'id,updated_at'), loc = await getAll(), lmap = new Map(loc.map(o => [o.id, o])), need = [];
        for (const r of rem) { const l = lmap.get(r.id), rm = Date.parse(r.updated_at); if (pend.has(T + ':' + r.id)) continue; if (!l || rm > (l.mod || 0)) need.push(r.id); }
        for (const r of await Remote.getIn(T, need)) { const rm = Date.parse(r.updated_at); await put({ ...toLocal(r), mod: rm, _sync: rm }); }
        const rset = new Set(rem.map(r => r.id));
        for (const l of loc) if (!rset.has(l.id) && !pend.has(T + ':' + l.id)) { if (l._sync) await del(l.id); else await this.mark(T, l.id, 'up'); }
      }
      for (const T of ['tractores', 'aperos', 'velocidades']) {
        const rem = await Remote.list(T), loc = await DB.gAll(T), lmap = new Map(loc.map(o => [o.id, o]));
        for (const r of rem) { if (pend.has(T + ':' + r.id)) continue; const l = lmap.get(r.id), rm = Date.parse(r.updated_at); if (!l || rm > (l.mod || 0)) { const o = { id: r.id, mod: rm, _sync: rm }; CAT_COLS[T].forEach(k => o[k] = r[k]); if (l && o.tipo === undefined && l.tipo) o.tipo = l.tipo; await DB.gPut(T, o); } }
        const rset = new Set(rem.map(r => r.id));
        for (const l of loc) if (!rset.has(l.id) && !pend.has(T + ':' + l.id)) { if (l._sync) await DB.gDel(T, l.id); else await this.mark(T, l.id, 'up'); }
      }
      try {   // planes numerados
        const rem = await Remote.list('planes', 'id,updated_at'), loc = await DB.gAll('planes'), lmap = new Map(loc.map(o => [o.id, o])), need = [];
        for (const r of rem) { const l = lmap.get(r.id), rm = Date.parse(r.updated_at); if (!pend.has('planes:' + r.id) && (!l || rm > (l.mod || 0))) need.push(r.id); }
        for (const r of await Remote.getIn('planes', need)) { const rm = Date.parse(r.updated_at); await DB.gPut('planes', { ...r.data, id: r.id, fincaId: r.finca_id, mod: rm, _sync: rm }); }
        const rset = new Set(rem.map(r => r.id));
        for (const l of loc) if (!rset.has(l.id) && !pend.has('planes:' + l.id)) { if (l._sync) await DB.gDel('planes', l.id); else await this.mark('planes', l.id, 'up'); }
        this.planesErr = '';
      } catch (e) { this.planesErr = e.message; }
      try {   // fotos: primero id+fecha, luego solo las que faltan
        const rem = await Remote.list('fotos', 'id,updated_at'), loc = await DB.gAll('fotos'), lmap = new Map(loc.map(o => [o.id, o])), need = [];
        for (const r of rem) { const l = lmap.get(r.id), rm = Date.parse(r.updated_at); if (!pend.has('fotos:' + r.id) && (!l || rm > (l.mod || 0))) need.push(r.id); }
        for (const r of await Remote.getIn('fotos', need)) { const rm = Date.parse(r.updated_at); await DB.gPut('fotos', { id: r.id, fincaId: r.finca_id, caption: r.caption, lat: r.lat, lon: r.lon, img: r.img, fecha: Date.parse(r.fecha), mod: rm, _sync: rm }); }
        const rset = new Set(rem.map(r => r.id));
        for (const l of loc) if (!rset.has(l.id) && !pend.has('fotos:' + l.id)) { if (l._sync) await DB.gDel('fotos', l.id); else await this.mark('fotos', l.id, 'up'); }
        this.fotosErr = '';
      } catch (e) { this.fotosErr = e.message; }
      const aj = await Remote.list('ajustes');
      if (aj[0]) {
        const rm = Date.parse(aj[0].updated_at), lm = (await DB.kvGet('ajustesMod')) || 0;
        if (rm > lm && !pend.has('ajustes:me')) {
          const d = aj[0].data || {};
          if (d.settings) { SB = { ...DEF, ...d.settings }; await DB.raw.kvPut('settings', SB); }
          for (const k of ['repostajes', 'filtros', 'capas']) if (d[k] != null) await DB.raw.kvPut(k, d[k]);
          if (d.capas) CFG = { ...CFG_DEF, ...d.capas };
          await DB.raw.kvPut('ajustesMod', rm);
        }
      } else await this.mark('ajustes', 'me', 'up');
      this.state = 'ok'; this.err = ''; this.last = Date.now();
    } catch (e) { this.state = 'err'; this.err = (e && e.message) || String(e); }
    finally { this.busy = false; this.count(); await migrarVelocidad(); }
    await loadCat(); await seedCat(); applyS();
    await this.flush();
  }
};
window.addEventListener('online', () => { Sync.paint(); Sync.flush(); });
window.addEventListener('offline', () => Sync.paint());
let lastPull = 0;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Sync.user && !work && Date.now() - lastPull > 60000) { lastPull = Date.now(); Sync.pull().then(() => { if (view === 'list') showList(); }); }
  if (document.visibilityState === 'hidden' && Sync.user) Sync.flush();
});

/* Pantalla de acceso */
function loginView(msg) {
  view = 'login';
  setHeader('', 'LIMPFINC', '', null, null);
  ['vList', 'vSet', 'mapWrap', 'bNueva'].forEach(i => $(i).classList.add('hidden'));
  $('vLogin').classList.remove('hidden');
  $('lErr').textContent = msg || '';
}
async function doLogin() {
  let email = $('lMail').value.trim().toLowerCase(); const pass = $('lPass').value;
  if (email && !email.includes('@')) email += '@estructura.app.invalid';   // mismo usuario que en ESTRUCTURA: basta con el nombre
  if (!email || !pass) return ($('lErr').textContent = 'Indica email y contraseña');
  $('lGo').disabled = true; $('lErr').textContent = 'Entrando…';
  try {
    const ses = await Remote.login(email, pass);
    Sync.user = ses.user; SB.offline = false; await DB.raw.kvPut('settings', SB);
    $('vLogin').classList.add('hidden');
    toast('Sesión iniciada. Sincronizando…');
    await Sync.pull(); await showList(); comprobarActivo();
  } catch (e) { $('lErr').textContent = 'No se pudo entrar: ' + (e.message || e); }
  finally { $('lGo').disabled = false; }
}
async function diagnostico() {
  const res = [], ok = (n, t) => res.push(`<div class="kv"><span>${n}</span><span style="color:${t === true ? 'var(--pri)' : 'var(--err)'};text-align:right;max-width:60%">${t === true ? '✓' : '✗ ' + esc(t)}</span></div>`);
  sheet(`<h3>🩺 Diagnóstico de Supabase</h3><div class="card" id="dgBody">Comprobando…</div>`);
  ok('Librería Supabase cargada', !!window.supabase || 'no cargó (sin conexión o bloqueada)');
  ok('Conexión a internet', navigator.onLine || 'sin conexión');
  let ses = null; try { ses = await Remote.session(); } catch (e) { }
  ok('Sesión iniciada', ses ? true : 'no hay sesión: inicia sesión');
  if (ses) {
    for (const t of ['fincas', 'trabajos', 'tractores', 'aperos', 'velocidades', 'ajustes', 'fotos']) {
      try {
        const { error, count } = await Remote.c.from(t).select('*', { count: 'exact', head: true });
        ok(`Tabla ${t}${error ? '' : ' (' + count + ' filas)'}`, error ? (/does not exist|schema cache|find the table/i.test(error.message) ? (t === 'fotos' ? 'no existe: ejecuta supabase_limpfinc_v110.sql' : 'no existe: ejecuta supabase_limpfinc.sql') : error.message) : true); }
      catch (e) { ok('Tabla ' + t, e.message); }
    }
    try { await Remote.upsert('ajustes', { user_id: ses.user.id, data: { settings: SB }, updated_at: iso(Date.now()) }, 'user_id'); ok('Escritura de prueba', true); }
    catch (e) { ok('Escritura de prueba', e.message); }
    const pend = (await DB.gAll('outbox')).length, loc = (await DB.all()).length, sub = (await DB.all()).filter(f => f._sync).length;
    ok(`Fincas en el móvil: ${loc} · subidas: ${sub}`, sub === loc ? true : (loc - sub) + ' sin subir');
    ok(`Cambios pendientes en cola: ${pend}`, pend === 0 ? true : 'pendientes');
    if (Sync.err) ok('Último error', Sync.err);
  }
  const b = $('dgBody'); if (b) b.innerHTML = res.join('') + (ses ? `<button class="btn" id="dgFix" style="margin-top:10px">⬆️ Subir todo ahora</button>` : `<button class="btn" id="dgIn" style="margin-top:10px">Iniciar sesión</button>`);
  if ($('dgFix')) $('dgFix').onclick = async () => {
    for (const f of await DB.all()) await DB.gPut('outbox', { key: 'fincas:' + f.id, table: 'fincas', id: f.id, op: 'up', t: Date.now() });
    for (const t of await DB.tAll()) await DB.gPut('outbox', { key: 'trabajos:' + t.id, table: 'trabajos', id: t.id, op: 'up', t: Date.now() });
    for (const T of ['tractores', 'aperos', 'velocidades', 'fotos']) for (const o of await DB.gAll(T)) await DB.gPut('outbox', { key: T + ':' + o.id, table: T, id: o.id, op: 'up', t: Date.now() });
    await Sync.flush(); diagnostico();
  };
  if ($('dgIn')) $('dgIn').onclick = () => { closeSheet(); loginView(); };
}
function cuentaSheet() {
  const u = Sync.user;
  sheet(`<h3>Cuenta y sincronización</h3>
    ${u ? `<div class="card"><div class="kv"><span>Usuario</span><span>${esc(u.email)}</span></div>
      <div class="kv"><span>Estado</span><span>${Sync.state === 'err' ? '⚠️ Error' : navigator.onLine ? '✓ Conectado' : '✕ Sin conexión'}</span></div>
      <div class="kv"><span>Cambios pendientes de subir</span><span>${Sync.pend}</span></div>
      <div class="kv"><span>Última sincronización</span><span>${Sync.last ? new Date(Sync.last).toLocaleTimeString('es-ES') : '–'}</span></div></div>
      ${Sync.err ? `<div class="card" style="background:#ffebee;color:#b71c1c">${esc(Sync.err)}</div>` : ''}
      <button class="btn" id="kSync" style="margin-bottom:8px">🔄 Sincronizar ahora</button>
      <button class="btn sec" id="kDg" style="margin-bottom:8px">🩺 Diagnóstico</button>
      <button class="btn sec" id="kOut">Cerrar sesión</button>`
      : `<div class="note" style="margin-bottom:8px">Sin sesión: los datos solo están en este dispositivo.</div><button class="btn" id="kIn">Iniciar sesión en Supabase</button>`}`,
    () => {
      if ($('kSync')) $('kSync').onclick = async () => { closeSheet(); await Sync.pull(); toast(Sync.state === 'ok' ? 'Sincronizado' : 'Error: ' + Sync.err, 3500); if (view === 'list') showList(); };
      if ($('kDg')) $('kDg').onclick = diagnostico;
      if ($('kOut')) $('kOut').onclick = () => confirmSheet('¿Cerrar sesión? Los datos de este dispositivo se mantienen.', 'Cerrar sesión', async () => { await Remote.logout(); Sync.user = null; Sync.paint(); loginView(); });
      if ($('kIn')) $('kIn').onclick = () => { closeSheet(); loginView(); };
    });
}

