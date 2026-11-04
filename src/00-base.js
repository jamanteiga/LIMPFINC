'use strict';
/* =========================================================
   LIMPFINC · F1 — Fincas, linde, exclusiones, área
   ========================================================= */
const VERSION = '2.9.0';

/* ---------- Ajustes por defecto ---------- */
const DEF = {
  voz:true, altoContraste:false, umbralAuto:true, autoPausa:120, ferrado:436, verFerrados:true,
  tractor:'New Holland TN95F', potencia:95,
  radioGiro:4.0, marchaAtras:true,
  aperoNombre:'Desbrozadora de cadenas', aperoAncho:1.70, offsetApero:2.0,
  velocidad:3.0, consumo:5.0, tractorDef:null, aperoDef:null, offline:false, solape:0.10, umbralDesv:1.0,
  anchoTractor:1.70, longTractorApero:5.0,
  umbralPrecision:8, holguraLinde:0.5,
  mallaX:3.5, mallaY:3.5, holguraTronco:0.30, diamTronco:500, promedioS:10,
  mapaBase:'OpenStreetMap',
  velAbierta:3.0, velMonte:2.3, ladoArbol:'der', distArbol:1.0,
  precioGasoil:1.10, precioHora:35, precioFerrado:0, margen:70, precioKm:1.5, horasJornada:8, paradaMin:20, base:{ lat:43.213143, lon:-8.297486, fuente:'dirección: lugar de Carballal, Cabanas, Abegondo' }, baseDir:'Carballal 20, Cabanas, 15318 Abegondo (A Coruña)', titular:'', velCarretera:20, consumoTraslado:3, pendMax:25, ultimaCopia:0,
  consumoAuto:true, velocidadGiro:3.0, velocidadTraslado:5.0, tCambioSentido:4, tManiobra:20, tEsquina:15, margenObstaculo:0.30
};
const SET_FIELDS = [
  ['Trabajo',[['paradaMin','Parada mínima en el mapa de velocidad (s)'],['velAbierta','Velocidad por defecto, finca abierta (km/h)'],['velMonte','Velocidad por defecto, monte / arbolada (km/h)'],['consumoAuto','Usar consumo calibrado en repostajes','bool'],['umbralDesv','Umbral desviación mínimo (m)'],['umbralAuto','Umbral automático según precisión GPS','bool'],['autoPausa','Pausa automática si está parado (s, 0 = no)'],['voz','Avisos por voz en el modo trabajo','bool'],['altoContraste','Alto contraste en el modo trabajo','bool']]],
  ['Planificación',[['velocidadGiro','Velocidad en giros (km/h)'],['velocidadTraslado','Velocidad en traslados (km/h)'],['tCambioSentido','Tiempo cambio de sentido (s)'],
    ['tManiobra','Maniobra al iniciar traslado (s)'],['tEsquina','Maniobra en esquina (s)'],['margenObstaculo','Margen a exclusiones (m)']]],
  ['Unidades',[['verFerrados','Mostrar superficie también en ferrados','bool'],['ferrado','Ferrado de tu comarca (m²)']]],
  ['Medición GPS',[['umbralPrecision','Descartar puntos con precisión peor que (m)'],['promedioS','Segundos de promedio GPS por punto (árboles, exclusiones)'],['holguraLinde','Holgura lateral tractor–linde (m)']]],
  ['Costes (presupuestos y partes)',[['precioGasoil','Gasóleo (€/L)'],['precioHora','Tractor y operario, coste (€/h)'],['margen','Margen sobre el coste (%)'],['precioKm','Traslado desde la base (€/km)'],['horasJornada','Horas de trabajo por jornada (viajes a la finca)'],['baseDir','Dirección de la base','text'],['precioFerrado','Precio por ferrado (€; 0 = no usar)'],['titular','Titular / empresa en los PDF','text']]],
  ['Jornada',[['velCarretera','Velocidad por carretera entre fincas (km/h)'],['consumoTraslado','Consumo en traslado (L/h)']]],
  ['Seguridad',[['pendMax','Avisar de pendiente mayor que (%) · 0 = no avisar']]],
  ['Monte',[['mallaX','Separación entre filas (m)'],['mallaY','Separación en fila (m)'],['holguraTronco','Holgura al tronco (m)'],['diamTronco','Diámetro medio del tronco (mm)']]]
];

/* ---------- Rutas comprimidas (v2.9): puntos GPS en texto por diferencias, 4–5 veces menos espacio ---------- */
// pts: [lat, lon, precisión, t, apero]; p3d: [lat, lon, altura, prec. H, prec. V, t]. Sin pérdidas a la precisión con que se guardan.
const CODEC = { pts: [1e7, 1e7, 10, 1, 1], p3d: [1e7, 1e7, 1000, 10, 10, 1] };
function packPts(a, esc) {
  if (!Array.isArray(a) || !a.length) return a;
  const prev = esc.map(() => 0), out = [];
  for (const p of a) {
    const r = [];
    for (let i = 0; i < esc.length; i++) { const v = p[i]; if (v == null || !isFinite(v)) { r.push('_'); continue; } const q = Math.round(v * esc[i]); r.push((q - prev[i]).toString(36)); prev[i] = q; }
    while (r.length > 2 && r[r.length - 1] === '0') r.pop();   // columnas finales sin cambio: se omiten
    out.push(r.join(','));
  }
  return 'z1:' + out.join(';');
}
function unpackPts(s, esc) {
  if (typeof s !== 'string' || !s.startsWith('z1:')) return s;
  const prev = esc.map(() => 0), out = [];
  for (const row of s.slice(3).split(';')) {
    const r = row.split(','), p = [];
    for (let i = 0; i < esc.length; i++) { if (r[i] === '_') { p.push(null); continue; } prev[i] += r[i] ? parseInt(r[i], 36) : 0; p.push(+(prev[i] / esc[i]).toFixed(esc[i] >= 1e7 ? 7 : esc[i] >= 1000 ? 3 : esc[i] >= 10 ? 1 : 0)); }
    out.push(p);
  }
  return out;
}
const packT = t => !t || !t.sesiones ? t : { ...t, sesiones: t.sesiones.map(s => ({ ...s, pts: packPts(s.pts, CODEC.pts), ...(s.p3d ? { p3d: packPts(s.p3d, CODEC.p3d) } : {}) })) };
const unpackT = t => !t || !t.sesiones ? t : { ...t, sesiones: t.sesiones.map(s => ({ ...s, pts: unpackPts(s.pts, CODEC.pts) || [], ...(s.p3d ? { p3d: unpackPts(s.p3d, CODEC.p3d) } : {}) })) };

/* ---------- IndexedDB ---------- */
const velDef = tipo => tipo === 'monte' ? (+SB.velMonte || 2.3) : (+SB.velAbierta || 3);
const DB = (() => {
  let db;
  const open = () => new Promise((res, rej) => {
    const r = indexedDB.open('limpfinc', 5);
    r.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('fincas')) d.createObjectStore('fincas', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
      if (!d.objectStoreNames.contains('trabajos')) d.createObjectStore('trabajos', { keyPath: 'id' });
      for (const st of ['tractores', 'aperos', 'velocidades', 'fotos', 'planes']) if (!d.objectStoreNames.contains(st)) d.createObjectStore(st, { keyPath: 'id' });
      if (!d.objectStoreNames.contains('outbox')) d.createObjectStore('outbox', { keyPath: 'key' });
    };
    r.onsuccess = () => { db = r.result; res(); };
    r.onerror = () => rej(r.error);
  });
  const tx = (st, mode, fn) => new Promise((res, rej) => {
    const t = db.transaction(st, mode), s = t.objectStore(st); const q = fn(s);
    t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error);
  });
  return {
    open,
    all: () => tx('fincas', 'readonly', s => s.getAll()),
    get: id => tx('fincas', 'readonly', s => s.get(id)),
    put: f => tx('fincas', 'readwrite', s => s.put(f)),
    del: id => tx('fincas', 'readwrite', s => s.delete(id)),
    kvGet: k => tx('kv', 'readonly', s => s.get(k)),
    kvPut: (k, v) => tx('kv', 'readwrite', s => s.put(v, k)),
    tAll: async () => (await tx('trabajos', 'readonly', s => s.getAll())).map(unpackT),
    tByFinca: async fid => (await tx('trabajos', 'readonly', s => s.getAll())).filter(t => t.fincaId === fid).map(unpackT).sort((a, b) => b.inicio - a.inicio),
    tPut: t => tx('trabajos', 'readwrite', s => s.put(packT(t))),
    tDel: id => tx('trabajos', 'readwrite', s => s.delete(id)),
    tGet: async id => unpackT(await tx('trabajos', 'readonly', s => s.get(id))),
    gAll: st => tx(st, 'readonly', s => s.getAll()),
    gGet: (st, id) => tx(st, 'readonly', s => s.get(id)),
    gPut: (st, o) => tx(st, 'readwrite', s => s.put(o)),
    gDel: (st, id) => tx(st, 'readwrite', s => s.delete(id))
  };
})();
// toda escritura local se anota para subirla a Supabase (DB.raw = sin anotar, para lo que llega de la nube)
DB.raw = { put: DB.put, del: DB.del, tPut: DB.tPut, tDel: DB.tDel, kvPut: DB.kvPut };
DB.put = async f => { f.mod = Date.now(); await DB.raw.put(f); Sync.mark('fincas', f.id, 'up'); };
DB.del = async id => { await DB.raw.del(id); Sync.mark('fincas', id, 'del'); };
DB.tPut = async t => { t.mod = Date.now(); await DB.raw.tPut(t); Sync.mark('trabajos', t.id, 'up'); };
DB.tDel = async id => { await DB.raw.tDel(id); Sync.mark('trabajos', id, 'del'); };
DB.kvPut = async (k, v) => { await DB.raw.kvPut(k, v); if (['settings', 'repostajes', 'filtros', 'capas'].includes(k)) { await DB.raw.kvPut('ajustesMod', Date.now()); Sync.mark('ajustes', 'me', 'up'); } };
DB.cPut = async (st, o) => { o.mod = Date.now(); await DB.gPut(st, o); Sync.mark(st, o.id, 'up'); };
DB.pByFinca = async fid => (await DB.gAll('planes')).filter(r => r.fincaId === fid).sort((a, b) => a.num - b.num);
DB.pPut = async r => { r.mod = Date.now(); await DB.gPut('planes', r); Sync.mark('planes', r.id, 'up'); };
DB.pDel = async id => { await DB.gDel('planes', id); Sync.mark('planes', id, 'del'); };
DB.cDel = async (st, id) => { await DB.gDel(st, id); Sync.mark(st, id, 'del'); };

