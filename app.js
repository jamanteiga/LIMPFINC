/* Test Celador SERGAS - lógica de la aplicación */
(function () {
"use strict";

var VERSION_APP = 9;
var ACIERTO = 0.5, SEG_PREG = 30, N_BAT = 50, SIM_T = 50, SIM_P = 50, SIM_MIN = 150;
var TEMAS = {
  1: "Funciones, vigilancia y accesos", 2: "Utensilios y mobiliario", 3: "Movilización y traslados",
  4: "Quirófano, hospitalización y salud mental", 5: "Fallecidos, autopsias y mortuorio",
  6: "Suministros y almacén", 7: "Farmacia, esterilización, higiene y reprografía",
  8: "Urgencias y ambulancias", 9: "Informática", 10: "Género y violencia de género"
};
var MODOS = { bateria: "Batería", falladas: "Repaso", simulacro: "Simulacro" };
var BANCO = window.BANCO || [], PORID = {};
BANCO.forEach(function (p) { PORID[p.id] = p; });

/* ---------- almacenamiento ---------- */
function lee(k, def) { try { var v = localStorage.getItem("celador." + k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
function guarda(k, v) { try { localStorage.setItem("celador." + k, JSON.stringify(v)); } catch (e) {} }
function borra(k) { try { localStorage.removeItem("celador." + k); } catch (e) {} }

var cfg = lee("cfg", {}); if (typeof cfg.pen !== "number") cfg.pen = 0.125; if (!cfg.tipo) cfg.tipo = "M"; if (!Array.isArray(cfg.temas)) cfg.temas = []; if (!cfg.nivel) cfg.nivel = "X"; if (typeof cfg.nombre !== "string") cfg.nombre = "Belén";
var hist = lee("hist", []), est = lee("q", {}), cur = lee("cur", null);
var vista = { v: "inicio", tab: "est", per: 7, graf: "pct", res: null, filtro: "todas" }, tic = null, visto = 0;

/* ---------- utilidades ---------- */
var $app = document.getElementById("app"), $nav = document.getElementById("nav"), $modal = document.getElementById("modal");
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
function num(n, d) { return Number(n).toFixed(d === undefined ? 2 : d).replace(".", ","); }
function pct(a, t) { return t ? Math.round(a * 100 / t) : 0; }
function mmss(s) { s = Math.max(0, Math.round(s)); var m = Math.floor(s / 60); return (m < 10 ? "0" : "") + m + ":" + (s % 60 < 10 ? "0" : "") + (s % 60); }
function fecha(ts) { var d = new Date(ts); return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }) + " " + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }); }
function baraja(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function tema(id) { return Math.floor(id / 1000); }
function falladasPend() { return BANCO.filter(function (p) { return est[p.id] && est[p.id].u === 0; }); }

/* ---------- selección de preguntas ---------- */
function ponderadas(pool, n) { // prioriza las menos vistas
  return pool.map(function (p) {
    var e = est[p.id], vistas = e ? e.ok + e.ko : 0;
    return { p: p, k: Math.pow(Math.random(), Math.pow(1 + vistas, 1.5)) };
  }).sort(function (a, b) { return b.k - a.k; }).slice(0, n).map(function (x) { return x.p; });
}
function enPool(p) { // filtros de la batería: tipo, temas y nivel
  return (cfg.tipo === "M" || p.k === cfg.tipo) && (!cfg.temas.length || cfg.temas.indexOf(p.t) >= 0) && (cfg.nivel !== "D" || p.d === 1) && (cfg.nivel !== "K" || p.tec === 1);
}
function eligeBateria() {
  var pool = BANCO.filter(enPool);
  var n = Math.min(N_BAT, pool.length);
  var fall = baraja(pool.filter(function (p) { return est[p.id] && est[p.id].u === 0; })).slice(0, Math.round(n * 0.27));
  var ids = {}; fall.forEach(function (p) { ids[p.id] = 1; });
  var libres = pool.filter(function (p) { return !ids[p.id]; }), falta = n - fall.length, resto;
  if (cfg.nivel === "X") { // unas dos de cada tres, difíciles
    var cupo = Math.round(falta * 2 / 3), dif = ponderadas(libres.filter(function (p) { return p.tec === 1; }), Math.round(cupo / 2)); // la mitad del cupo, técnicas
    dif.forEach(function (p) { ids[p.id] = 1; });
    dif = dif.concat(ponderadas(libres.filter(function (p) { return p.d === 1 && !ids[p.id]; }), cupo - dif.length));
    dif.forEach(function (p) { ids[p.id] = 1; });
    resto = dif.concat(ponderadas(libres.filter(function (p) { return !ids[p.id]; }), falta - dif.length));
  } else resto = ponderadas(libres, falta);
  var lista = fall.concat(resto);
  lista.forEach(function (p) { ids[p.id] = 1; });
  // Garantiza siempre N_BAT preguntas: primero con lo que quede del filtro, después con otras
  // de los mismos temas (cualquier tipo o nivel) y, por último, con cualquier pregunta del banco.
  [pool, BANCO.filter(function (p) { return !cfg.temas.length || cfg.temas.indexOf(p.t) >= 0; }), BANCO].forEach(function (fuente) {
    if (lista.length >= N_BAT) return;
    ponderadas(fuente.filter(function (p) { return !ids[p.id]; }), N_BAT - lista.length).forEach(function (p) { ids[p.id] = 1; lista.push(p); });
  });
  return baraja(lista);
}
function eligeSimulacro() {
  var t = baraja(ponderadas(BANCO.filter(function (p) { return p.k === "T"; }), SIM_T));
  var s = baraja(ponderadas(BANCO.filter(function (p) { return p.k === "P"; }), SIM_P));
  return t.concat(s);
}

/* ---------- ciclo del test ---------- */
function empieza(modo) {
  var ps, inm = true, dur;
  if (modo === "simulacro") { ps = eligeSimulacro(); inm = false; dur = Math.round(SIM_MIN * 60 * ps.length / (SIM_T + SIM_P)); }
  else if (modo === "falladas") { ps = baraja(falladasPend()).slice(0, N_BAT); dur = ps.length * SEG_PREG; }
  else { ps = eligeBateria(); dur = ps.length * SEG_PREG; }
  if (!ps.length) return;
  var ahora = Date.now();
  cur = {
    modo: modo, inm: inm, pen: cfg.pen, i: 0, t0: ahora, fin: ahora + dur * 1000, dur: dur,
    ps: ps.map(function (p) { return { id: p.id, ord: baraja([0, 1, 2, 3]) }; }),
    r: ps.map(function () { return -1; }), tq: ps.map(function () { return 0; })
  };
  guarda("cur", cur); visto = ahora; ir("test");
}
function enPausa() { return cur && cur.rest != null; }
function resta() { return enPausa() ? cur.rest : cur.fin - Date.now(); } // milisegundos que quedan
function pausa() { if (enPausa()) return; acumula(); cur.rest = Math.max(0, cur.fin - Date.now()); visto = 0; guarda("cur", cur); }
function reanuda() { if (!enPausa()) return; cur.fin = Date.now() + cur.rest; delete cur.rest; visto = Date.now(); guarda("cur", cur); }
function acumula() { // suma el tiempo de la pregunta en pantalla
  if (!cur || enPausa()) return; var ahora = Math.min(Date.now(), cur.fin);
  if (visto && !(cur.inm && cur.r[cur.i] >= 0 && cur.fijado)) cur.tq[cur.i] += Math.max(0, ahora - visto);
  visto = ahora;
}
function mueve(i) { reanuda(); acumula(); cur.fijado = cur.inm && cur.r[i] >= 0; cur.i = i; guarda("cur", cur); pinta(); window.scrollTo(0, 0); }
function blanco(desde, dir) { for (var j = desde + dir; j >= 0 && j < cur.r.length; j += dir) if (cur.r[j] < 0) return j; return -1; }
function responde(j) {
  if (!(cur.inm && cur.r[cur.i] >= 0)) reanuda();
  if (cur.inm) { if (cur.r[cur.i] >= 0) return; acumula(); cur.r[cur.i] = j; cur.fijado = true; }
  else { cur.r[cur.i] = cur.r[cur.i] === j ? -1 : j; }
  guarda("cur", cur); pinta();
}
function finaliza(agotado) {
  if (!cur) return; acumula(); clearInterval(tic); tic = null;
  var ok = 0, ko = 0, bl = 0, tResp = 0, det = [];
  cur.ps.forEach(function (q, i) {
    var r = cur.r[i], orig = r < 0 ? -1 : q.ord[r], e = est[q.id] || (est[q.id] = { ok: 0, ko: 0, u: -1 });
    if (orig < 0) bl++; else { tResp += cur.tq[i]; if (orig === 0) { ok++; e.ok++; e.u = 1; } else { ko++; e.ko++; e.u = 0; } }
    det.push([q.id, orig, Math.round(cur.tq[i] / 100) / 10]);
  });
  var n = cur.ps.length, seg = Math.max(0, Math.min(cur.dur, Math.round(cur.dur - resta() / 1000)));
  var h = { id: Date.now(), ts: Date.now(), modo: cur.modo, n: n, ok: ok, ko: ko, bl: bl, pen: cur.pen,
    pts: ok * ACIERTO - ko * cur.pen, max: n * ACIERTO, seg: seg, tpp: ok + ko ? tResp / 1000 / (ok + ko) : 0, agot: !!agotado, det: det };
  hist.push(h); guarda("hist", hist); guarda("q", est); cur = null; borra("cur");
  vista.res = h; vista.filtro = "todas"; ir("res");
}

/* ---------- navegación ---------- */
function ir(v) { vista.v = v; pinta(); window.scrollTo(0, 0); }
function pinta() {
  clearInterval(tic); tic = null;
  var enTest = vista.v === "test";
  $nav.style.display = enTest ? "none" : "flex"; $app.className = enTest ? "sin-nav" : "";
  if (enTest && !cur) vista.v = "inicio";
  ({ inicio: vInicio, test: vTest, res: vRes, act: vAct, aj: vAjustes })[vista.v]();
  if (!enTest) $nav.innerHTML = [["inicio", "Inicio", "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"],
    ["act", "Actividad", "M3 12h4l3-8 4 16 3-8h4"], ["aj", "Ajustes", "M4 6h16M4 12h16M4 18h16M8 4v4M16 10v4M10 16v4"]].map(function (b) {
    return '<button data-a="ir" data-v="' + b[0] + '" class="' + ((vista.v === b[0] || (b[0] === "act" && vista.v === "res")) ? "on" : "") +
      '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + b[2] + '"/></svg>' + b[1] + "</button>";
  }).join("");
}

/* ---------- inicio ---------- */
function vInicio() {
  var nT = BANCO.filter(function (p) { return p.k === "T"; }).length, nP = BANCO.length - nT, pend = falladasPend().length;
  var pool = BANCO.filter(enPool).length, nD = BANCO.filter(function (p) { return p.d === 1; }).length;
  var nb = Math.min(N_BAT, BANCO.length), h = "";
  h += '<header class="cab"><h1>Celador/a del SERGAS</h1><p>Parte específica · ' + BANCO.length + " preguntas (" + nT + " de teoría, " + nP + " supuestos; " + nD + " de nivel difícil)<br>Versión " + VERSION_APP + "</p></header><div class=\"cont\">";
  if (cur) h += '<div class="carta"><div class="et">Test en curso</div><h2>Tienes un ' + MODOS[cur.modo].toLowerCase() + ' sin terminar</h2><div class="et">' + (enPausa() ? "En pausa: quedan " : "El tiempo sigue corriendo: quedan ") + mmss(resta() / 1000) +
    '</div><div class="fila"><button class="btn" data-a="continuar">Continuar</button><button class="btn sec" data-a="descartar">Descartar</button></div></div>';
  h += '<div class="carta"><div class="et">Entrenador</div><h2>Batería de ' + nb + ' preguntas</h2><div class="et">' + mmss(nb * SEG_PREG) + " min · acierto +0,5 · fallo −" + num(cfg.pen, 3) + " · en blanco 0</div>";
  h += '<div class="seg">' + [["M", "Mixto"], ["T", "Teoría"], ["P", "Supuestos"]].map(function (o) { return '<button data-a="tipo" data-v="' + o[0] + '" class="' + (cfg.tipo === o[0] ? "on" : "") + '">' + o[1] + "</button>"; }).join("") + "</div>";
  h += '<div class="seg">' + [["T", "Todas"], ["X", "Mezcla"], ["D", "Difíciles"], ["K", "Técnicas"]].map(function (o) { return '<button data-a="nivel" data-v="' + o[0] + '" class="' + (cfg.nivel === o[0] ? "on" : "") + '">' + o[1] + "</button>"; }).join("") + "</div>";
  h += '<div class="chips"><button class="chip ' + (cfg.temas.length ? "" : "on") + '" data-a="tema" data-v="0">Todos los temas</button>' + Object.keys(TEMAS).map(function (t) {
    return '<button class="chip ' + (cfg.temas.indexOf(+t) >= 0 ? "on" : "") + '" data-a="tema" data-v="' + t + '" title="' + esc(TEMAS[t]) + '">T' + t + "</button>"; }).join("") + "</div>";
  if (pool < N_BAT) h += '<div class="aviso info" style="margin-top:10px"><strong>Solo hay ' + pool + ' preguntas con estos filtros</strong>La batería se completa hasta ' + nb + ' con otras preguntas' + (cfg.temas.length ? " de los mismos temas." : ".") + "</div>";
  if (cfg.temas.length) h += '<div class="et" style="margin-top:8px">' + cfg.temas.map(function (t) { return "T" + t + ": " + TEMAS[t]; }).join(" · ") + "</div>";
  h += '<button class="btn" data-a="empieza" data-v="bateria"' + (nb && !cur ? "" : " disabled") + ">Empieza tu práctica</button></div>";
  h += '<div class="carta"><div class="et">Refuerzo</div><h2>Repaso de falladas</h2><div class="et">' + (pend ? pend + " preguntas pendientes de acertar. Batería de " + Math.min(N_BAT, pend) + "." : "No tienes preguntas falladas pendientes.") +
    '</div><button class="btn sec" data-a="empieza" data-v="falladas"' + (pend && !cur ? "" : " disabled") + ">Repasar falladas</button></div>";
  h += '<div class="carta"><div class="et">Formato de examen</div><h2>Simulacro del primer ejercicio</h2><div class="et">' + SIM_T + " preguntas teóricas + " + SIM_P + " de supuestos prácticos · " + SIM_MIN +
    ' min · 0 a 50 puntos · corrección al final</div><button class="btn sec" data-a="empieza" data-v="simulacro"' + (cur ? " disabled" : "") + ">Hacer simulacro</button></div>";
  var s = agrega(periodo(7));
  if (s.n) h += '<div class="carta"><div class="et">Últimos 7 días · ' + s.tests + " test</div>" + tri(s) + '<button class="btn sec" data-a="ir" data-v="act">Ver estadísticas</button></div>';
  $app.innerHTML = h + "</div>";
}

/* ---------- test ---------- */
function vTest() {
  var n = cur.ps.length, i = cur.i, q = cur.ps[i], p = PORID[q.id], r = cur.r[i], resuelta = cur.inm && r >= 0;
  var hechas = cur.r.filter(function (x) { return x >= 0; }).length, h = "";
  h += '<div class="barra-t"><button data-a="salir">Finalizar</button><span>' + (i + 1) + " / " + n + '</span><button data-a="pausa" class="bpausa' + (enPausa() ? " on" : "") + '" style="margin-left:auto" aria-pressed="' + (enPausa() ? "true" : "false") + '">' + (enPausa() ? "▶ Reanudar" : "⏸ Parar") + '</button><span class="reloj" id="reloj" style="margin-left:0"></span></div>';
  if (enPausa()) h += '<div class="aviso info" style="margin:10px 16px 0" role="status"><strong>Tiempo en pausa</strong>Se reanuda solo al contestar, al cambiar de pregunta o al pulsar Reanudar.</div>';
  h += '<div class="prog"><i style="width:' + pct(hechas, n) + '%"></i></div><div class="puntos">' + cur.ps.map(function (x, j) {
    var c = ""; if (cur.r[j] >= 0) c = cur.inm ? (x.ord[cur.r[j]] === 0 ? "ok" : "ko") : "hecha";
    return '<button data-a="salta" data-v="' + j + '" class="' + c + (j === i ? " act" : "") + '" aria-label="Pregunta ' + (j + 1) + '">' + (j + 1) + "</button>"; }).join("") + "</div>";
  h += '<div class="cont" style="padding-top:10px"><span class="tag">Tema ' + p.t + '</span><span class="tag">' + (p.k === "P" ? "Supuesto práctico" : "Teoría") + "</span>" + (p.tec ? '<span class="tag">Técnica</span>' : p.d ? '<span class="tag">Difícil</span>' : "") + '<p class="preg">' + esc(p.q) + "</p>";
  q.ord.forEach(function (o, j) {
    var c = ""; if (resuelta) { if (o === 0) c = "ok"; else if (j === r) c = "ko"; } else if (j === r) c = "sel";
    h += '<button class="op ' + c + '" data-a="resp" data-v="' + j + '"' + (resuelta ? " disabled" : "") + "><b>" + "ABCD"[j] + "</b><span>" + esc(p.o[o]) + "</span></button>";
  });
  if (resuelta) {
    var bien = q.ord[r] === 0;
    h += '<div class="aviso ' + (bien ? "ok" : "ko") + '" role="status"><strong>' + (bien ? "Correcta (+0,5)" : "Incorrecta (−" + num(cur.pen, 3) + ")") + "</strong>" +
      (bien ? "" : "La respuesta correcta es la " + "ABCD"[q.ord.indexOf(0)] + ". ") + esc(p.e) + "</div>";
  }
  var ant, sig;
  if (cur.inm) { ant = blanco(i, -1); sig = blanco(i, 1); } else { ant = i > 0 ? i - 1 : -1; sig = i < n - 1 ? i + 1 : -1; }
  h += '<div class="fila"><button class="btn sec" data-a="salta" data-v="' + ant + '"' + (ant < 0 ? " disabled" : "") + '>Anterior</button><button class="btn sec" data-a="salta" data-v="' + sig + '"' + (sig < 0 ? " disabled" : "") + ">Siguiente</button></div>";
  if (cur.inm) h += '<div class="et" style="margin-top:8px;text-align:center">Anterior y Siguiente saltan a la pregunta en blanco más próxima.</div>';
  if (hechas === n || (!cur.inm && i === n - 1)) h += '<button class="btn verde" data-a="' + (hechas === n ? "fin" : "salir") + '">Terminar y ver resultado</button>';
  $app.innerHTML = h + "</div>";
  var $r = document.getElementById("reloj");
  function reloj() { if (!cur) return; var s = resta() / 1000; if (s <= 0 && !enPausa()) return finaliza(true); $r.textContent = mmss(cur.dur - s) + " / " + mmss(cur.dur); $r.className = "reloj" + (enPausa() ? " pausa" : s < 60 ? " poco" : ""); }
  reloj(); if (cur) tic = setInterval(reloj, 500);
}

/* ---------- resultado ---------- */
function tri(s) {
  var t = s.ok + s.ko + s.bl;
  return '<div class="tri" role="img" aria-label="Acertadas ' + s.ok + ", falladas " + s.ko + ", sin contestar " + s.bl + '"><i style="flex:' + s.ok + ';background:var(--ok)"></i><i style="flex:' + s.ko + ';background:var(--ko)"></i><i style="flex:' + s.bl + ';background:var(--bl)"></i></div>' +
    '<div class="tres">' + [["Acertadas", s.ok, s.vok], ["Falladas", s.ko, s.vko], ["Sin contestar", s.bl, s.vbl]].map(function (x) {
      return '<div><div class="et">' + x[0] + '</div><div class="n">' + pct(x[1], t) + "<small>%</small></div><div class=\"et\">" + x[1] + " preg." + (x[2] === undefined ? "" : "<br>" + (x[2] > 0 ? "+" : "") + x[2] + " pts variación") + "</div></div>"; }).join("") + "</div>";
}
function porTema(lista) {
  var m = {};
  lista.forEach(function (h) { h.det.forEach(function (d) { var t = tema(d[0]), x = m[t] || (m[t] = [0, 0, 0]); x[d[1] < 0 ? 2 : d[1] === 0 ? 0 : 1]++; }); });
  var ks = Object.keys(m); if (!ks.length) return "";
  return '<table class="tabla"><tr><th>Tema</th><th>Acert.</th><th>Fall.</th><th>Blanco</th><th>% acierto</th></tr>' + ks.map(function (t) {
    var x = m[t]; return "<tr><td>T" + t + " " + esc(TEMAS[t] || "") + "</td><td>" + x[0] + "</td><td>" + x[1] + "</td><td>" + x[2] + "</td><td>" + pct(x[0], x[0] + x[1] + x[2]) + " %</td></tr>"; }).join("") + "</table>";
}
function vRes() {
  var r = vista.res; if (!r) return ir("act");
  var h = '<header class="cab"><h1>' + MODOS[r.modo] + " · " + fecha(r.ts) + "</h1><p>" + r.n + " preguntas" + (r.agot ? " · tiempo agotado" : "") + '</p></header><div class="cont">';
  h += '<div class="carta"><div class="et">Nota</div><div class="nota">' + num(r.pts) + " <small>/ " + num(r.max, r.max % 1 ? 1 : 0) + " · equivale a " + num(Math.max(0, r.pts) * 10 / r.max) + " sobre 10</small></div>";
  if (r.modo === "simulacro") h += '<div class="aviso ' + (r.pts >= r.max / 2 ? "ok" : "ko") + '" style="margin-top:12px"><strong>' + (r.pts >= r.max / 2 ? "Alcanza" : "No alcanza") + " el 50 % de la puntuación</strong>Referencia habitual para superar el ejercicio; confírmala en las bases de la convocatoria.</div>";
  h += tri(r) + '<h3>Tiempo</h3><div class="et">Total: ' + mmss(r.seg) + " min · Media por pregunta respondida: " + num(r.tpp, 1) + " s · Penalización aplicada: −" + num(r.pen, 3) + "</div></div>";
  h += '<div class="carta"><h2>Por temas</h2>' + porTema([r]) + "</div>";
  h += '<div class="carta"><h2>Revisión</h2><div class="seg">' + [["todas", "Todas"], ["ko", "Falladas"], ["bl", "En blanco"]].map(function (o) { return '<button data-a="filtro" data-v="' + o[0] + '" class="' + (vista.filtro === o[0] ? "on" : "") + '">' + o[1] + "</button>"; }).join("") + "</div>";
  var k = 0;
  r.det.forEach(function (d, i) {
    var p = PORID[d[0]]; if (!p) return;
    var st = d[1] < 0 ? "bl" : d[1] === 0 ? "ok" : "ko"; if (vista.filtro !== "todas" && vista.filtro !== st) return; k++;
    h += '<div class="rev"><span class="tag">' + (i + 1) + '</span><span class="tag">T' + p.t + '</span><span class="tag">' + (st === "ok" ? "Acertada" : st === "ko" ? "Fallada" : "En blanco") + '</span><span class="tag">' + num(d[2], 1) + " s</span><p><strong>" + esc(p.q) + "</strong></p>" +
      (st === "ko" ? '<div class="r" style="color:var(--ko)">Tu respuesta: ' + esc(p.o[d[1]]) + "</div>" : "") + '<div class="r" style="color:var(--ok)">Correcta: ' + esc(p.o[0]) + '</div><div class="r et">' + esc(p.e) + "</div></div>";
  });
  if (!k) h += '<div class="et" style="padding:12px 0">Ninguna pregunta en este filtro.</div>';
  h += '</div><button class="btn" data-a="empieza" data-v="bateria">Nueva batería</button><button class="btn sec" data-a="ir" data-v="inicio">Volver al inicio</button></div>';
  $app.innerHTML = h;
}

/* ---------- estadísticas ---------- */
function periodo(dias, desfase) {
  if (!dias) return hist.slice();
  var fin = Date.now() - (desfase || 0) * dias * 864e5, ini = fin - dias * 864e5;
  return hist.filter(function (h) { return h.ts > ini && h.ts <= fin; });
}
function agrega(l) { var s = { ok: 0, ko: 0, bl: 0, tests: l.length, n: 0 }; l.forEach(function (h) { s.ok += h.ok; s.ko += h.ko; s.bl += h.bl; }); s.n = s.ok + s.ko + s.bl; return s; }
function nota10(h) { return Math.max(0, h.pts) * 10 / h.max; }
function grafico(l) {
  var W = 340, H = 190, L = 30, R = 8, T = 8, B = 22, m = vista.graf, series, max;
  if (m === "pct") { max = 100; series = [["var(--ok)", l.map(function (h) { return pct(h.ok, h.n); }), "Acertadas"], ["var(--ko)", l.map(function (h) { return pct(h.ko, h.n); }), "Falladas"], ["var(--bl)", l.map(function (h) { return pct(h.bl, h.n); }), "Sin contestar"]]; }
  else if (m === "nota") { max = 10; series = [["var(--naranja)", l.map(nota10), "Nota sobre 10"]]; }
  else { var v = l.map(function (h) { return h.tpp; }); max = Math.max(10, Math.ceil(Math.max.apply(null, v) / 10) * 10); series = [["var(--verde-osc)", v, "Segundos por pregunta"]]; }
  function x(i) { return l.length < 2 ? L + (W - L - R) / 2 : L + i * (W - L - R) / (l.length - 1); }
  function y(v) { return T + (H - T - B) * (1 - v / max); }
  var s = '<svg class="graf" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Evolución por test">';
  for (var g = 0; g <= 4; g++) { var gv = max * g / 4; s += '<line class="rej" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(gv) + '" y2="' + y(gv) + '"/><text x="' + (L - 5) + '" y="' + (y(gv) + 4) + '" text-anchor="end">' + Math.round(gv) + "</text>"; }
  series.forEach(function (se) {
    if (l.length > 1) s += '<polyline fill="none" stroke="' + se[0] + '" stroke-width="2.2" stroke-linejoin="round" points="' + se[1].map(function (v, i) { return x(i).toFixed(1) + "," + y(v).toFixed(1); }).join(" ") + '"/>';
    se[1].forEach(function (v, i) { s += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="3" fill="' + se[0] + '"/>'; });
  });
  [0, l.length - 1].forEach(function (i, k) { if (k && !i) return; var d = new Date(l[i].ts); s += '<text x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="' + (l.length < 2 ? "middle" : k ? "end" : "start") + '">' + d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) + "</text>"; });
  return s + '</svg><div class="ley">' + series.map(function (se) { return '<span><i style="background:' + se[0] + '"></i>' + se[2] + "</span>"; }).join("") + "</div>";
}
function tendencia() {
  var l = hist.slice(-10); if (l.length < 4) return '<div class="aviso info"><strong>Evolución</strong>Haz al menos 4 test para ver si mejoras o empeoras.</div>';
  var mit = Math.floor(l.length / 2), med = function (a) { return a.reduce(function (s, h) { return s + nota10(h); }, 0) / a.length; };
  var a = med(l.slice(0, l.length - mit)), b = med(l.slice(-mit)), d = b - a;
  var c = Math.abs(d) < 0.3 ? ["info", "Estable"] : d > 0 ? ["ok", "Mejorando"] : ["ko", "Empeorando"];
  return '<div class="aviso ' + c[0] + '"><strong>' + c[1] + " (" + (d > 0 ? "+" : "") + num(d) + " puntos sobre 10)</strong>Media de los últimos " + mit + " test: " + num(b) + ". Media de los " + (l.length - mit) + " anteriores: " + num(a) + ".</div>";
}
function vAct() {
  var h = '<header class="cab"><h1>Actividad</h1><p>' + hist.length + ' test realizados</p></header><div class="cont"><div class="carta" style="padding:8px"><div class="seg" style="margin:0">' +
    [["est", "Estadísticas"], ["his", "Historial de test"]].map(function (o) { return '<button data-a="tab" data-v="' + o[0] + '" class="' + (vista.tab === o[0] ? "on" : "") + '">' + o[1] + "</button>"; }).join("") + "</div></div>";
  if (!hist.length) { $app.innerHTML = h + '<div class="carta"><h2>Aún no hay datos</h2><div class="et">Cuando termines tu primer test aparecerán aquí las estadísticas.</div></div></div>'; return; }
  if (vista.tab === "his") {
    h += '<div class="carta"><table class="tabla"><tr><th>Fecha</th><th>Tipo</th><th>A / F / B</th><th>Nota</th></tr>' + hist.slice().reverse().map(function (x) {
      return '<tr class="clic" data-a="ver" data-v="' + x.id + '"><td>' + fecha(x.ts) + "</td><td>" + MODOS[x.modo] + "</td><td>" + x.ok + " / " + x.ko + " / " + x.bl + "</td><td><strong>" + num(x.pts) + "</strong> / " + num(x.max, x.max % 1 ? 1 : 0) + "</td></tr>"; }).join("") + '</table><div class="et" style="margin-top:8px">Toca un test para revisarlo.</div></div>';
  } else {
    var l = periodo(vista.per), s = agrega(l);
    h += '<div class="carta"><h2>Así está tu preparación</h2><div class="seg">' + [[7, "7 días"], [30, "30 días"], [0, "Todo"]].map(function (o) { return '<button data-a="per" data-v="' + o[0] + '" class="' + (vista.per === o[0] ? "on" : "") + '">' + o[1] + "</button>"; }).join("") + "</div>";
    if (!s.n) h += '<div class="et" style="margin-top:12px">Sin test en este periodo.</div></div>';
    else {
      if (vista.per) { var a = agrega(periodo(vista.per, 1)); if (a.n) { s.vok = pct(s.ok, s.n) - pct(a.ok, a.n); s.vko = pct(s.ko, s.n) - pct(a.ko, a.n); s.vbl = pct(s.bl, s.n) - pct(a.bl, a.n); } }
      var tp = l.reduce(function (t, x) { return t + x.tpp * (x.ok + x.ko); }, 0) / Math.max(1, s.ok + s.ko);
      h += tri(s) + '<div class="et" style="margin-top:10px">' + s.tests + " test · " + s.n + " preguntas · tiempo medio por pregunta respondida: " + num(tp, 1) + " s" + (s.vok === undefined && vista.per ? " · sin datos del periodo anterior para comparar" : "") + "</div></div>";
      h += '<div class="carta"><h2>Tu progreso</h2><div class="seg">' + [["pct", "Porcentaje"], ["nota", "Nota"], ["t", "Tiempo"]].map(function (o) { return '<button data-a="graf" data-v="' + o[0] + '" class="' + (vista.graf === o[0] ? "on" : "") + '">' + o[1] + "</button>"; }).join("") +
        '</div><div style="margin-top:12px">' + grafico(l.slice(-20)) + '</div><div class="et" style="margin-top:6px">Un punto por test' + (l.length > 20 ? " (últimos 20)" : "") + ".</div></div>";
      h += tendencia() + '<div class="carta"><h2>Por temas</h2>' + porTema(l) + "</div>";
    }
  }
  $app.innerHTML = h + "</div>";
}

/* ---------- ajustes ---------- */
function vAjustes() {
  var h = '<header class="cab"><h1>Ajustes</h1><p>Los datos se guardan solo en este dispositivo</p></header><div class="cont">';
  h += '<div class="carta"><h2>Puntuación</h2><div class="et">Acierto +0,5. En blanco 0. En el examen el fallo resta 1/4 del valor del acierto (0,125).</div><h3>Penalización por fallo</h3><input type="number" id="pen" min="0" max="0.5" step="0.005" value="' + cfg.pen + '"><button class="btn sec" data-a="pen">Guardar penalización</button></div>';
  h += '<div class="carta"><h2>Mensaje de ánimo</h2><div class="et">Nombre que aparece en el mensaje al empezar cada test. Déjalo vacío para un mensaje sin nombre.</div><h3>Nombre</h3><input type="text" id="nombre" maxlength="30" value="' + esc(cfg.nombre) + '" style="font:inherit;padding:9px;border:1.5px solid var(--linea);border-radius:8px;background:var(--carta);color:var(--tinta);width:100%"><button class="btn sec" data-a="nombre">Guardar nombre</button></div>';
  h += '<div class="carta"><h2>Copia de seguridad</h2><div class="et">Exporta el historial para llevarlo a otro dispositivo o guardarlo.</div><button class="btn sec" data-a="exporta">Exportar copia</button><h3>Importar copia</h3><input type="file" id="imp" accept="application/json,.json"><button class="btn rojo" data-a="borra">Borrar todos los datos</button></div>';
  h += '<div class="carta"><h2>Banco de preguntas</h2><table class="tabla"><tr><th>Tema</th><th>Teoría</th><th>Supuestos</th><th>Difíciles</th></tr>' + Object.keys(TEMAS).map(function (t) {
    var a = BANCO.filter(function (p) { return p.t === +t; }), s = a.filter(function (p) { return p.k === "P"; }).length;
    return "<tr><td>T" + t + " " + esc(TEMAS[t]) + "</td><td>" + (a.length - s) + "</td><td>" + s + "</td><td>" + a.filter(function (p) { return p.d === 1; }).length + "</td></tr>"; }).join("") + "</table></div>";
  h += '<div class="carta"><h2>Instalar la app</h2><div class="et">iPhone / iPad (Safari): Compartir → Añadir a pantalla de inicio.<br>Android (Chrome): menú ⋮ → Instalar aplicación.<br>Windows 11 (Edge o Chrome): icono de instalar en la barra de direcciones, o menú → Aplicaciones → Instalar este sitio como aplicación.</div></div>';
  $app.innerHTML = h + "</div>";
  document.getElementById("imp").onchange = function (ev) {
    var f = ev.target.files[0]; if (!f) return; var fr = new FileReader();
    fr.onload = function () { try { var d = JSON.parse(fr.result); if (!Array.isArray(d.hist)) throw 0;
      confirma("Se sustituirán los datos de este dispositivo por los de la copia (" + d.hist.length + " test).", "Importar", function () { hist = d.hist; est = d.q || {}; if (d.cfg) cfg = d.cfg; guarda("hist", hist); guarda("q", est); guarda("cfg", cfg); ir("act"); });
    } catch (e) { avisa("El archivo no es una copia válida."); } };
    fr.readAsText(f);
  };
}
function exporta() {
  var nombre = "celador-copia-" + new Date().toISOString().slice(0, 10) + ".json", txt = JSON.stringify({ v: 1, hist: hist, q: est, cfg: cfg });
  try { var f = new File([txt], nombre, { type: "application/json" }); if (navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f], title: nombre }).catch(function () {}); return; } } catch (e) {}
  var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "application/json" })); a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
}

/* ---------- diálogos ---------- */
var accionModal = null;
function confirma(txt, boton, fn) { accionModal = fn; $modal.innerHTML = '<div class="modal"><div class="carta"><p style="margin-top:0">' + esc(txt) + '</p><div class="fila"><button class="btn sec" data-a="mno">Cancelar</button><button class="btn" data-a="msi">' + esc(boton) + "</button></div></div></div>"; }
var ANIMOS = ["¡Ánimo, {n}, tú puedes!", "¡A por ello, {n}!", "¡Vamos, {n}, que esta plaza es tuya!", "{n}, respira hondo y a por todas.", "¡Tú puedes con esto y con más, {n}!", "Cada test te acerca a la plaza, {n}. ¡Adelante!", "¡Confía en ti, {n}! Lo llevas bien preparado.", "¡Mucha fuerza, {n}! Pregunta a pregunta."];
function animo(fn) { // mensaje de ánimo antes de empezar; el tiempo arranca al pulsar el botón
  var n = (cfg.nombre || "").trim(), t = ANIMOS[Math.floor(Math.random() * ANIMOS.length)];
  t = n ? t.replace("{n}", n) : ["¡Ánimo, tú puedes!", "¡A por ello!", "¡Vamos, que esta plaza es tuya!", "Respira hondo y a por todas.", "¡Confía en ti! Lo llevas bien preparado."][Math.floor(Math.random() * 5)];
  accionModal = fn;
  $modal.innerHTML = '<div class="modal"><div class="carta" style="text-align:center" role="dialog" aria-live="polite"><p style="font-size:1.35rem;font-weight:800;margin:6px 0 4px">' + esc(t) + '</p><p class="et" style="margin:0">El tiempo empieza al pulsar el botón.</p><button class="btn" data-a="msi">¡Vamos!</button></div></div>';
}
function avisa(txt) { accionModal = null; $modal.innerHTML = '<div class="modal"><div class="carta"><p style="margin-top:0">' + esc(txt) + '</p><button class="btn" data-a="mno">Aceptar</button></div></div>'; }

/* ---------- eventos ---------- */
var AC = {
  ir: function (v) { ir(v); },
  tipo: function (v) { cfg.tipo = v; guarda("cfg", cfg); pinta(); },
  nivel: function (v) { cfg.nivel = v; guarda("cfg", cfg); pinta(); },
  tema: function (v) { v = +v; if (!v) cfg.temas = []; else { var k = cfg.temas.indexOf(v); if (k >= 0) cfg.temas.splice(k, 1); else cfg.temas.push(v); cfg.temas.sort(function (a, b) { return a - b; }); } guarda("cfg", cfg); pinta(); },
  empieza: function (v) { if (!cur) animo(function () { empieza(v); }); },
  continuar: function () { if (!enPausa()) visto = Date.now(); if (resta() <= 0 && !enPausa()) finaliza(true); else ir("test"); },
  pausa: function () { if (enPausa()) reanuda(); else pausa(); pinta(); },
  descartar: function () { confirma("Se descartará el test en curso sin guardarlo.", "Descartar", function () { cur = null; borra("cur"); pinta(); }); },
  resp: function (v) { responde(+v); },
  salta: function (v) { if (+v >= 0) mueve(+v); },
  fin: function () { finaliza(false); },
  salir: function () { var b = cur.r.filter(function (x) { return x < 0; }).length; confirma(b ? "Quedan " + b + " preguntas en blanco. ¿Terminar y ver la nota?" : "¿Terminar y ver la nota?", "Terminar", function () { finaliza(false); }); },
  filtro: function (v) { vista.filtro = v; pinta(); },
  tab: function (v) { vista.tab = v; pinta(); },
  per: function (v) { vista.per = +v; pinta(); },
  graf: function (v) { vista.graf = v; pinta(); },
  ver: function (v) { vista.res = hist.filter(function (h) { return h.id === +v; })[0]; vista.filtro = "todas"; ir("res"); },
  pen: function () { var v = parseFloat(String(document.getElementById("pen").value).replace(",", ".")); if (isNaN(v) || v < 0 || v > 0.5) return avisa("Introduce un valor entre 0 y 0,5."); cfg.pen = v; guarda("cfg", cfg); avisa("Penalización guardada: −" + num(v, 3) + " por fallo. Se aplicará a los próximos test."); },
  nombre: function () { cfg.nombre = String(document.getElementById("nombre").value).trim(); guarda("cfg", cfg); avisa(cfg.nombre ? "Guardado. Los mensajes dirán: " + cfg.nombre + "." : "Guardado. Los mensajes irán sin nombre."); },
  exporta: exporta,
  borra: function () { confirma("Se borrarán el historial y las estadísticas de este dispositivo. No se puede deshacer.", "Borrar", function () { hist = []; est = {}; cur = null; borra("hist"); borra("q"); borra("cur"); ir("inicio"); }); },
  mno: function () { $modal.innerHTML = ""; accionModal = null; },
  msi: function () { var f = accionModal; $modal.innerHTML = ""; accionModal = null; if (f) f(); }
};
document.addEventListener("click", function (ev) {
  var el = ev.target.closest ? ev.target.closest("[data-a]") : null; if (!el || el.disabled) return;
  var f = AC[el.getAttribute("data-a")]; if (f) f(el.getAttribute("data-v"));
});
document.addEventListener("visibilitychange", function () {
  if (!cur || vista.v !== "test") return;
  if (document.hidden) { acumula(); visto = 0; guarda("cur", cur); } else if (!enPausa()) { visto = Date.now(); if (cur.fin <= Date.now()) finaliza(true); }
});
window.addEventListener("pagehide", function () { if (cur && vista.v === "test") { acumula(); guarda("cur", cur); } });

if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(function () {});
pinta();
})();
