'use strict';
// LIMPFINC — cálculo del plan en segundo plano (Web Worker): la pantalla sigue respondiendo en fincas grandes.
// Usa los mismos ficheros que la app: Clipper, geometría y planificador.
self.window = self;
let S = {};   // lo usa mallaVec (separaciones nominales)
const fmt = (v, d = 0) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const V = new URL(self.location.href).searchParams.get('v') || '';
importScripts('lib/clipper.js', 'src/01-geo.js?v=' + V, 'src/09-planificador.js?v=' + V);
self.onmessage = e => {
  const { id, f, S: S1, opt } = e.data;
  S = S1;
  let last = 0;
  try {
    const pl = Planner.plan(f, S1, { ...opt, onProgress: p => { const t = Date.now(); if (t - last > 120) { last = t; self.postMessage({ id, prog: p }); } } });
    self.postMessage({ id, pl });
  } catch (err) { self.postMessage({ id, err: err.message || String(err) }); }
};
