// PIPING · parte «herr»: se carga al usarla (la genera el empaquetado a partir de piping.js)
function hsv([r, g, b]) {
            r /= 255; g /= 255; b /= 255; const M = Math.max(r, g, b), m = Math.min(r, g, b), d = M - m;
            let h = 0; if (d) h = M === r ? ((g - b) / d) % 6 : M === g ? (b - r) / d + 2 : (r - g) / d + 4;
            return { h: (h * 60 + 360) % 360, s: M ? d / M : 0, v: M };
        }
function colorReservado(c) {
            const a = hsv(c);
            if (a.s < 0.4 || a.v < 0.35) return null; // grises, blancos, negros: libres
            for (const [n, h] of COLORES_RESERVADOS) { const b = hsv(rgbHex(h)); const dh = Math.min(Math.abs(a.h - b.h), 360 - Math.abs(a.h - b.h)); if (dh < 18) return n; }
            return null;
        }
function abrirLineasCapas__p() {
            const capas = capasActuales();
            const muestra = t => `<svg width="60" height="8"><line x1="0" y1="4" x2="60" y2="4" stroke="#334155" stroke-width="1.3" ${dashLinea(t) ? `stroke-dasharray="${dashLinea(t)}"` : ''}/></svg>`;
            const chk = (i, k, v) => `<td class="text-center"><input type="checkbox" ${v ? 'checked' : ''} onchange="cambiarCapa(${i}, '${k}', this.checked)"></td>`;
            document.getElementById('red-content').innerHTML = `
                <p class="text-[11px] text-slate-500 mb-2">Capas del archivo DXF de salida (Archivo &gt; Guardar como &gt; Dibujo CAD). Los cambios se guardan con el proyecto. El color se elige con el selector de color del sistema; no se admiten los colores reservados del cálculo (verde = correcto, rojo = no cumple, violeta = ruta crítica).</p>
                <div class="overflow-x-auto"><table class="w-full text-[11px]"><thead><tr class="text-left text-slate-500 border-b"><th class="py-1">Capa</th><th class="text-center">Visible</th><th class="text-center">Inutilizada</th><th class="text-center">Bloqueada</th><th class="text-center">Imprimible</th><th>Color</th><th>Tipo de línea</th><th>Grosor de línea</th><th>Transparencia (%)</th><th>Uso en PIPING</th><th></th></tr></thead><tbody>
                ${capas.map((c, i) => { const base = CAPAS_BASE.includes(c.nombre); return `<tr class="border-b border-slate-100">
                    <td class="py-1 font-bold">${base ? esc(c.nombre) : `<input value="${esc(c.nombre)}" onchange="cambiarCapa(${i}, 'nombre', this.value)" class="border rounded p-0.5 w-20">`}</td>
                    ${chk(i, 'visible', c.visible !== false)}${chk(i, 'inutilizada', !!c.inutilizada)}${chk(i, 'bloqueada', !!c.bloqueada)}${chk(i, 'imprimible', c.imprimible !== false)}
                    <td class="whitespace-nowrap"><input type="color" value="${hexRGB(c.color)}" onchange="cambiarCapa(${i}, 'color', this.value)" class="w-7 h-5 align-middle border rounded cursor-pointer" title="Elegir color del sistema"> ${c.color.join(',')}</td>
                    <td class="whitespace-nowrap">${muestra(c.tipo)}<select onchange="cambiarCapa(${i}, 'tipo', this.value)" class="border rounded p-0.5 ml-1">${TIPOS_LINEA.map(t => `<option ${t === tipoLineaDXF(c.tipo) ? 'selected' : ''}>${t}</option>`).join('')}</select></td>
                    <td><select onchange="cambiarCapa(${i}, 'grosor', this.value)" class="border rounded p-0.5">${GROSORES_DXF.map(g => `<option value="${g}" ${Math.abs(g - c.grosor) < 1e-6 ? 'selected' : ''}>${g.toFixed(2).replace('.', ',')} mm</option>`).join('')}</select></td>
                    <td><input type="number" min="0" max="90" step="5" value="${+c.transparencia || 0}" onchange="cambiarCapa(${i}, 'transparencia', this.value)" class="border rounded p-0.5 w-14"></td>
                    <td><input value="${esc(c.uso || '')}" onchange="cambiarCapa(${i}, 'uso', this.value)" class="border rounded p-0.5 w-72"></td>
                    <td>${base ? '' : `<button onclick="borrarCapa(${i})" title="Eliminar capa" class="text-rose-600 px-1"><i class="fa-solid fa-trash-can"></i></button>`}</td></tr>`; }).join('')}
                </tbody></table></div>
                <p class="text-[10px] text-slate-400 mt-2">Formato DXF 2000 (AC1015), unidades en mm de papel: el color se exporta como el color AutoCAD (ACI) más próximo y la transparencia se guarda en el proyecto (DXF 2000 no la admite). Las capas 0, Bord, Dim, Hid, Hidden, Marca, Object, Text y Tratt las usa PIPING y no se pueden borrar ni renombrar. Para DWG: abre el DXF en AutoCAD (o con ODA File Converter) y guárdalo como DWG.</p>`;
            document.getElementById('red-footer').innerHTML = `<div class="flex gap-2 w-full text-xs">
                <button onclick="anadirCapa()" class="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded"><i class="fa-solid fa-plus mr-1"></i>Nueva capa</button>
                <button onclick="capasComoPredeterminadas()" class="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded" title="Las usarán los proyectos nuevos en este navegador">Guardar como predeterminadas</button>
                <button onclick="restablecerCapas()" class="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded">Valores de fábrica</button>
                <span class="flex-1"></span>
                <button onclick="cerrarModalRed()" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium">Cerrar</button></div>`;
            document.querySelector('#modal-red h3 span').innerHTML = '<i class="fa-solid fa-layer-group text-blue-600 mr-1.5"></i> Líneas y capas';
            document.querySelector('#modal-red > div').style.width = 'min(1260px, 97vw)';
            document.getElementById('modal-red').style.display = 'flex';
        }
function cambiarCapa(i, k, v) {
            const c = capasActuales()[i]; if (!c) return;
            if (k === 'color') {
                const rgb = rgbHex(v), r = colorReservado(rgb);
                if (r) { aviso(`Color no admitido: se confunde con el ${r} del cálculo. Elige otro.`, 'error'); abrirLineasCapas(); return; }
                c.color = rgb;
            } else if (k === 'nombre') {
                const n = String(v).trim();
                if (!n || /[<>\/":;?*|=,]/.test(n) || capasActuales().some((x, j) => j !== i && x.nombre.toLowerCase() === n.toLowerCase())) { aviso('Nombre de capa no válido o repetido.', 'error'); abrirLineasCapas(); return; }
                const antes = c.nombre; c.nombre = n;
                elementosRed.concat(elementosOtrasHojas()).forEach(e => { if (e.capa === antes) e.capa = n; });
            } else if (k === 'grosor') c.grosor = +v;
            else if (k === 'transparencia') c.transparencia = Math.max(0, Math.min(90, +v || 0));
            else c[k] = v;
            marcarCambios(true); abrirLineasCapas();
        }
function anadirCapa() {
            const capas = capasActuales(); let n = 1; while (capas.some(c => c.nombre === 'Capa' + n)) n++;
            capas.push({ nombre: 'Capa' + n, color: [255, 255, 255], tipo: 'Continuous', grosor: 0.25, uso: '', visible: true, inutilizada: false, bloqueada: false, imprimible: true, transparencia: 0 });
            marcarCambios(true); abrirLineasCapas();
        }
function borrarCapa(i) { const c = capasActuales()[i]; if (!c || CAPAS_BASE.includes(c.nombre)) return; if (!confirm(`¿Eliminar la capa ${c.nombre}?`)) return; opciones.capas.splice(i, 1); marcarCambios(true); abrirLineasCapas(); }
function restablecerCapas() { if (!confirm('¿Volver a los valores de fábrica de las capas en este proyecto?')) return; opciones.capas = CAPAS_DXF.map(capaPorDefecto); marcarCambios(true); abrirLineasCapas(); }
function pintarEditorAtajos__p() {
            const V = vistaAtajos, pest = (k, t, i) => `<button onclick="vistaAtajos.pestana='${k}'; pintarEditorAtajos()" class="px-3 py-1.5 -mb-px border rounded-t text-xs ${V.pestana === k ? 'bg-white border-slate-300 border-b-white font-bold text-blue-700' : 'bg-slate-50 border-transparent text-slate-600 hover:text-blue-700'}"><i class="fa-solid ${i} mr-1"></i>${t}</button>`;
            let h = `<div class="flex gap-1 border-b border-slate-300 mb-3">${pest('teclado', 'Teclado', 'fa-keyboard')}${pest('gestos', 'Gestos del ratón', 'fa-computer-mouse')}${pest('barra', 'Barra rápida', 'fa-bolt')}</div>`;
            if (V.pestana === 'barra') h += editorBarraRapida(); else
            if (V.pestana === 'teclado') {
                const cmds = listaComandos(), cats = [...new Set(cmds.map(c => c.cat))];
                const q = sinAcentos(V.texto);
                const lista = cmds.filter(c => (!V.cat || c.cat === V.cat) && (!q || sinAcentos(c.cat + ' ' + c.texto + ' ' + teclasDe(c.id).join(' ')).includes(q)));
                h += `<div class="flex flex-wrap gap-2 items-center mb-2 text-[11px]"><label>Categoría <select onchange="vistaAtajos.cat = this.value; pintarEditorAtajos()" class="border rounded p-1 ml-1"><option value="">Todas las órdenes</option>${cats.map(c => `<option ${c === V.cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
                    <label>Buscar <input id="atajos-buscar" value="${esc(V.texto)}" oninput="vistaAtajos.texto = this.value; clearTimeout(window.__tA); window.__tA = setTimeout(() => { pintarEditorAtajos(); const i = document.getElementById('atajos-buscar'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250)" class="border rounded p-1 ml-1 w-64" placeholder="orden, menú o tecla"></label>
                    <span class="flex-1"></span><span class="text-slate-400">${lista.length} órdenes · Esc, Intro, Retroceso y Tab están reservadas</span></div>
                    <div class="border rounded overflow-auto" style="max-height:55vh"><table class="w-full text-[11px]"><thead class="bg-slate-100 sticky top-0"><tr class="text-left text-slate-600"><th class="px-2 py-1 w-28">Categoría</th><th class="px-2">Orden</th><th class="px-2 w-72">Atajo(s)</th><th class="px-2 w-24"></th></tr></thead><tbody>
                    ${lista.map(c => { const t = teclasDe(c.id), cap = capturaAtajo === c.id, mod = !!CONF_ATAJOS.teclas[c.id];
                        return `<tr draggable="true" ondragstart="event.dataTransfer.setData('text/x-orden', '${esc(c.id).replace(/'/g, "\\'")}')" title="Arrastra a la barra rápida para añadirla" class="border-t border-slate-100 ${cap ? 'bg-amber-50' : 'hover:bg-slate-50'}"><td class="px-2 py-1 text-slate-500">${esc(c.cat)}</td><td class="px-2"><i class="fa-solid ${c.icono} text-blue-600 w-4 mr-1"></i>${esc(c.texto)}</td>
                        <td class="px-2">${cap ? '<span class="text-amber-700 font-bold">Pulsa la combinación de teclas… (Esc cancela)</span>' : t.map(k => `<span class="inline-flex items-center gap-0.5 mr-1">${kbd(k)}<button onclick="quitarAtajo('${esc(c.id).replace(/'/g, "\\'")}', '${k}')" title="Quitar" class="text-slate-400 hover:text-rose-600 px-0.5"><i class="fa-solid fa-xmark text-[9px]"></i></button></span>`).join('') + (mod ? '<span class="text-[9px] text-blue-600 ml-1">personalizado</span>' : '')}</td>
                        <td class="px-2 text-right"><button onclick="empezarCapturaAtajo('${esc(c.id).replace(/'/g, "\\'")}')" class="px-2 py-0.5 border rounded hover:bg-blue-50 text-blue-700"><i class="fa-solid fa-plus mr-1"></i>Asignar</button></td></tr>`; }).join('')}
                    </tbody></table></div>`;
            } else {
                const G = confGestos(), cmds = listaComandos(), dirs = G.n === 4 ? DIRS4 : DIRS8;
                h += `<div class="grid gap-4 text-[11px]" style="grid-template-columns: 1fr 330px"><div>
                    <label class="flex items-center gap-2 mb-2"><input type="checkbox" ${G.activo ? 'checked' : ''} onchange="confGestos().activo = this.checked; guardarConfAtajos(); pintarEditorAtajos()"> <b>Activar gestos del ratón</b></label>
                    <p class="text-slate-500 mb-2">Mantén pulsado el botón derecho sobre el lienzo, desplaza el ratón hacia una dirección y suelta: se ejecuta la orden de esa dirección. Un clic derecho sin desplazar abre el menú contextual, que muestra las mismas órdenes alrededor del cursor.</p>
                    <label class="block mb-3">Número de direcciones <select onchange="confGestos().n = +this.value; guardarConfAtajos(); pintarEditorAtajos()" class="border rounded p-1 ml-1"><option value="4" ${G.n === 4 ? 'selected' : ''}>4 direcciones</option><option value="8" ${G.n === 8 ? 'selected' : ''}>8 direcciones</option></select></label>
                    <table class="w-full"><tbody>${['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'].filter(d => dirs.includes(d)).map(d => `<tr class="border-t border-slate-100"><td class="py-1 pr-2 w-32 font-bold text-slate-600">${NOMBRE_DIR[d]}</td><td><select onchange="confGestos().dir['${d}'] = this.value; guardarConfAtajos(); pintarEditorAtajos()" class="border rounded p-1 w-full"><option value="">— sin orden —</option>${cmds.map(c => `<option value="${esc(c.id)}" ${G.dir[d] === c.id ? 'selected' : ''}>${esc(c.cat + ' › ' + c.texto)}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div>
                    <div><p class="font-bold text-slate-600 mb-1">Guía de gestos</p>${svgGuiaGestos(G, null, 300)}</div></div>`;
            }
            document.getElementById('red-content').innerHTML = h;
            document.getElementById('red-footer').innerHTML = `<div class="flex gap-2 w-full text-xs">
                <button onclick="restaurarAtajos()" class="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded">Restaurar valores predeterminados</button>
                <button onclick="copiarListaAtajos()" class="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded"><i class="fa-solid fa-copy mr-1"></i>Copiar lista</button>
                <span class="flex-1"></span>
                <button onclick="capturaAtajo = null; cerrarModalRed()" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium">Cerrar</button></div>`;
        }
function empezarCapturaAtajo(id) { capturaAtajo = id; document.activeElement && document.activeElement.blur(); pintarEditorAtajos(); }
function quitarAtajo(id, k) { CONF_ATAJOS.teclas[id] = teclasDe(id).filter(x => x !== k); guardarConfAtajos(); pintarEditorAtajos(); }
function restaurarAtajos() { if (!confirm('¿Volver a los atajos de teclado y gestos de fábrica?')) return; CONF_ATAJOS = { teclas: {} }; guardarConfAtajos(); pintarEditorAtajos(); }
function textoListaAtajos() {
            return listaComandos().filter(c => teclasDe(c.id).length).map(c => `${c.cat}\t${c.texto}\t${teclasDe(c.id).join(' / ')}`).join('\n');
        }
function copiarListaAtajos() { const t = 'Categoría\tOrden\tAtajo(s)\n' + textoListaAtajos(); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => aviso('Lista de atajos copiada al portapapeles.', 'ok'), () => aviso('No se ha podido copiar.', 'error')); }
function mostrarAtajosAyuda__p() {
            cerrarMenus();
            const cmds = listaComandos().filter(c => teclasDe(c.id).length), cats = [...new Set(cmds.map(c => c.cat))];
            const fijos = [['Intro / Espacio', 'Repetir la última orden (insertar el último componente en el cursor o trazar tubería)'], ['Clic en el panel', 'Coger un componente para insertar varios seguidos (Esc termina)'], ['Asas de la tubería', 'Arrastrar el extremo para cambiar la longitud (Mayús: 1 mm)'], ['Esc', 'Cancelar (trazado, zoom ventana, paleta, inserción) o quitar la selección'], ['Intro / doble clic', 'Terminar el trazado de tubería'], ['Retroceso', 'Quitar el último punto del trazado'], ['Ctrl / Mayús + clic', 'Añadir o quitar de la selección'], ['Arrastrar en vacío', 'Selección por ventana'], ['Rueda del ratón', 'Zoom en el punto del cursor'], ['Doble clic en un componente', 'Ventana de propiedades'], ['Botón derecho', 'Menú contextual con órdenes alrededor del cursor']];
            const G = confGestos();
            document.getElementById('red-content').innerHTML = `<p class="text-[11px] text-slate-500 mb-2">Atajos activos (se pueden cambiar en CAD &gt; Atajos de teclado…). La lista se amplía sola con cada orden nueva que tenga atajo.</p>
                <div class="grid grid-cols-2 gap-4 text-[11px]"><div>${cats.map(cat => `<p class="font-bold text-slate-600 uppercase mt-2 mb-1">${esc(cat)}</p><table class="w-full">${cmds.filter(c => c.cat === cat).map(c => `<tr class="border-t border-slate-100"><td class="py-0.5 pr-2">${esc(c.texto)}</td><td class="text-right whitespace-nowrap">${teclasDe(c.id).map(kbd).join(' ')}</td></tr>`).join('')}</table>`).join('')}</div>
                <div><p class="font-bold text-slate-600 uppercase mt-2 mb-1">Ratón y teclas fijas</p><table class="w-full">${fijos.map(([k, t]) => `<tr class="border-t border-slate-100"><td class="py-0.5 pr-2 whitespace-nowrap">${kbd(k)}</td><td>${esc(t)}</td></tr>`).join('')}</table>
                <p class="font-bold text-slate-600 uppercase mt-3 mb-1">Gestos del ratón ${G.activo ? '' : '(desactivados)'}</p>${svgGuiaGestos(G, null, 240)}</div></div>`;
            document.getElementById('red-footer').innerHTML = `<div class="flex gap-2 w-full text-xs"><button onclick="abrirEditorAtajos()" class="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded"><i class="fa-solid fa-pen mr-1"></i>Cambiar atajos...</button><span class="flex-1"></span><button onclick="cerrarModalRed()" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium">Cerrar</button></div>`;
            document.querySelector('#modal-red h3 span').innerHTML = '<i class="fa-solid fa-keyboard text-blue-600 mr-1.5"></i> Atajos de teclado';
            document.querySelector('#modal-red > div').style.width = 'min(1000px, 96vw)';
            document.getElementById('modal-red').style.display = 'flex';
        }
function editorBarraRapida__p() {
            const cmds = listaComandos(), en = barraRapida(), q = sinAcentos(vistaAtajos.textoBarra || '');
            const disp = cmds.filter(c => !en.includes(c.id) && (!q || sinAcentos(c.cat + ' ' + c.texto).includes(q))).slice(0, 200);
            const fila = (c, dentro, i) => `<div class="flex items-center gap-2 px-2 py-1 border-t border-slate-100 ${dentro ? 'cursor-move' : ''}" ${dentro ? `draggable="true" ondragstart="event.dataTransfer.setData('text/x-orden', '${esc(c.id).replace(/'/g, "\\'")}')"` : ''}><i class="fa-solid ${c.icono === 'fa-keyboard' ? 'fa-bolt' : c.icono} text-blue-600 w-4"></i><span class="flex-1">${esc(c.cat)} › ${esc(c.texto)}</span>${dentro
                ? `<button onclick="moverEnBarra(${i}, -1)" class="px-1 text-slate-500" title="Subir"><i class="fa-solid fa-arrow-up"></i></button><button onclick="moverEnBarra(${i}, 1)" class="px-1 text-slate-500" title="Bajar"><i class="fa-solid fa-arrow-down"></i></button><button onclick="CONF_ATAJOS.barra = barraRapida().filter((x, k) => k !== ${i}); guardarConfAtajos(); pintarBarraRapida(); pintarEditorAtajos()" class="px-1 text-rose-600" title="Quitar"><i class="fa-solid fa-xmark"></i></button>`
                : `<button onclick="CONF_ATAJOS.barra = [...barraRapida(), '${esc(c.id).replace(/'/g, "\\'")}']; guardarConfAtajos(); pintarBarraRapida(); pintarEditorAtajos()" class="px-2 border rounded text-blue-700">Añadir →</button>`}</div>`;
            return `<div class="grid grid-cols-2 gap-4 text-[11px]"><div><p class="font-bold text-slate-600 mb-1">Órdenes disponibles</p><input value="${esc(vistaAtajos.textoBarra || '')}" oninput="vistaAtajos.textoBarra = this.value; clearTimeout(window.__tB); window.__tB = setTimeout(() => { pintarEditorAtajos(); const i = document.querySelector('#red-content input'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250)" placeholder="Buscar" class="border rounded p-1 w-full mb-1"><div class="border rounded overflow-auto" style="max-height:48vh">${disp.map(c => fila(c, false)).join('')}</div></div>
                <div><p class="font-bold text-slate-600 mb-1">En la barra rápida (arrastra para ordenar; también puedes arrastrar órdenes de la pestaña Teclado a la barra)</p><div class="border rounded overflow-auto" style="max-height:52vh">${en.map((id, i) => { const c = cmds.find(x => x.id === id); return c ? fila(c, true, i) : ''; }).join('') || '<p class="p-2 text-slate-400 italic">Vacía</p>'}</div>
                <button onclick="CONF_ATAJOS.barra = BARRA_FABRICA.slice(); guardarConfAtajos(); pintarBarraRapida(); pintarEditorAtajos()" class="mt-2 px-2 py-1 border rounded">Barra de fábrica</button></div></div>`;
        }
function moverEnBarra(i, d) { const l = barraRapida().slice(), j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; CONF_ATAJOS.barra = l; guardarConfAtajos(); pintarBarraRapida(); pintarEditorAtajos(); }
async function matrizSeleccion__p() {
            cerrarMenus();
            const ids = idsSeleccion(), els = elementosRed.filter(e => ids.includes(e.id) && !esTablaHoja(e)); if (!els.length) { aviso('Selecciona los elementos a repetir.'); return; }
            const b = cajaDe(els), ancho = (b.x1 - b.x0) / PX_MM, alto = (b.y1 - b.y0) / PX_MM;
            const r = await dialogo('<i class="fa-solid fa-table-cells text-blue-600 mr-1.5"></i>Matriz', `<p>${els.length} elemento(s) seleccionados (${ancho.toFixed(0)} × ${alto.toFixed(0)} mm).</p>
                <div class="grid grid-cols-2 gap-2 mt-2"><label>Copias <input id="mz-n" type="number" min="1" max="50" value="1" class="border rounded p-1 w-20 ml-1"></label><span></span>
                <label>Separación X (mm) <input id="mz-dx" type="number" step="any" value="0" class="border rounded p-1 w-24 ml-1"></label><label>Separación Y (mm) <input id="mz-dy" type="number" step="any" value="${Math.ceil(alto + 10)}" class="border rounded p-1 w-24 ml-1"></label></div>
                <label class="block mt-2"><input id="mz-lin" type="checkbox"> Cada copia en una línea nueva</label><p class="text-[10px] text-slate-400 mt-1">Y positiva hacia abajo. Ejemplo: bombas en paralelo → 1 copia, Y = 25 mm.</p>`,
                [{ texto: 'Crear copias', valor: 'si', clase: 'bg-blue-600 hover:bg-blue-700 text-white' }, { texto: 'Cancelar', valor: null }]);
            if (r !== 'si') return;
            const v = { n: +document.getElementById('mz-n').value, dx: +document.getElementById('mz-dx').value, dy: +document.getElementById('mz-dy').value, lin: document.getElementById('mz-lin').checked };
            const n = Math.max(1, Math.min(50, Math.round(v.n || 1)));
            guardarEstado(); invalidarResultados();
            const todos = [];
            for (let i = 1; i <= n; i++) {
                const mapaL = {};
                const { nuevos } = clonarElementos(els, v.dx * PX_MM * i, v.dy * PX_MM * i, v.lin ? lid => { if (!mapaL[lid]) { const lo = lineaPorId(lid) || { tipo: 'principal' }; const nid = lo.tipo === 'principal' ? siguienteLinea('principal') : siguienteLinea('ramal', lo.padre); lineas.push(Object.assign({}, lo, { id: nid, desde: null })); mapaL[lid] = nid; } return mapaL[lid]; } : null);
                elementosRed.push(...nuevos); todos.push(...nuevos);
            }
            seleccion.clear(); todos.forEach(x => seleccion.add(x.id)); actualizarSeleccion(); renderArbol();
            aviso(`Matriz: ${n} copia(s), ${todos.length} elementos nuevos.`, 'ok');
        }
function compararEscenarios__p() {
            cerrarMenus();
            const E = proyecto.escenarios || {}, A = E.A, B = E.B || (ultimoCalculo ? fotoCalculo('Cálculo actual') : null);
            if (!A || !B) { aviso('Guarda el escenario A (y el B, o calcula la red para comparar con el cálculo actual).', 'error'); return; }
            const ids = [...new Set([...Object.keys(A.el), ...Object.keys(B.el)])];
            const d = (a, b, n = 2) => a == null || b == null ? '' : `<span class="${Math.abs(b - a) > 1e-6 ? (b > a ? 'text-rose-700' : 'text-emerald-700') : 'text-slate-400'}">${b - a >= 0 ? '+' : ''}${(b - a).toFixed(n)}</span>`;
            const f = (v, n = 2) => v == null || !isFinite(v) ? '—' : (+v).toFixed(n);
            const filas = ids.map(id => { const a = A.el[id] || {}, b = B.el[id] || {}, t = a.tag || b.tag;
                return `<tr class="border-t border-slate-100"><td class="py-0.5 pr-2 font-bold whitespace-nowrap">${esc(t)}</td><td>${f(a.Q)}</td><td>${f(b.Q)}</td><td>${d(a.Q, b.Q)}</td><td>${f(a.V)}</td><td>${f(b.V)}</td><td>${d(a.V, b.V)}</td><td>${f(a.hf, 3)}</td><td>${f(b.hf, 3)}</td><td>${d(a.hf, b.hf, 3)}</td><td>${f(a.pB ?? a.p)}</td><td>${f(b.pB ?? b.p)}</td><td>${d(a.pB ?? a.p, b.pB ?? b.p)}</td><td>${f(a.npshd)}</td><td>${f(b.npshd)}</td><td class="${a.estado === 'fallo' ? 'text-rose-600' : ''}">${a.estado || ''}</td><td class="${b.estado === 'fallo' ? 'text-rose-600' : ''}">${b.estado || ''}</td></tr>`; }).join('');
            document.getElementById('red-content').innerHTML = `<p class="text-[11px] mb-2"><b>A</b>: ${esc(A.nombre)} (${fechaHora(A.fecha)}) · ruta crítica ${f(A.hfCritica)} m · ${A.fallos} fallo(s) &nbsp; | &nbsp; <b>B</b>: ${esc(B.nombre)} (${fechaHora(B.fecha)}) · ruta crítica ${f(B.hfCritica)} m · ${B.fallos} fallo(s)</p>
                <div class="overflow-auto" style="max-height:62vh"><table class="w-full text-[11px]"><thead class="bg-slate-100 sticky top-0"><tr class="text-left text-slate-600"><th class="px-1">Elemento</th><th>Q A</th><th>Q B</th><th>ΔQ (m³/h)</th><th>V A</th><th>V B</th><th>ΔV (m/s)</th><th>hf A</th><th>hf B</th><th>Δhf (m)</th><th>p A</th><th>p B</th><th>Δp (bar)</th><th>NPSHd A</th><th>NPSHd B</th><th>Estado A</th><th>Estado B</th></tr></thead><tbody>${filas}</tbody></table></div>`;
            document.getElementById('red-footer').innerHTML = `<div class="flex gap-2 w-full text-xs"><button onclick="exportarComparacionEscenarios()" class="px-3 py-1.5 border rounded"><i class="fa-solid fa-file-excel mr-1"></i>Excel</button><span class="flex-1"></span><button onclick="cerrarModalRed()" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium">Cerrar</button></div>`;
            document.querySelector('#modal-red h3 span').innerHTML = '<i class="fa-solid fa-scale-balanced text-blue-600 mr-1.5"></i> Comparar escenarios A / B';
            document.querySelector('#modal-red > div').style.width = 'min(1250px, 97vw)';
            document.getElementById('modal-red').style.display = 'flex';
        }
function abrirVolumenVaso__p() {
            const fl = fluidoSeleccionado(); if (!fl.ok) { alert(fl.msg); return; }
            const cs = volumenCircuitos();
            if (!cs.length) { alert('No hay circuitos conectados.'); return; }
            const ts = +proyecto.tsMax > 0 ? +proyecto.tsMax : fl.T;
            const gl = fl.nombre.match(/(MEG|MPG) (\d+) %/);
            document.getElementById('red-content').innerHTML = `
                <p class="text-[11px] text-slate-500 mb-2">Volumen por circuito hidráulico. Vaso de expansión solo en circuitos cerrados (sin depósitos abiertos ni consumos): V vaso = V·Ce·Cp (UNE 100155), Ce = ρ(T llenado)/ρ(T máx) − 1, Cp = PM/(PM − Pm) en presión absoluta.</p>
                ${cs.map((c, i) => `<div class="border border-slate-200 rounded p-2 mb-2 text-[11px]" data-circ="${i}">
                    <p class="font-bold text-slate-700">Circuito ${i + 1} · líneas ${esc(c.lineas.join(', '))} ${c.abierto ? '<span class="text-slate-400">(abierto: no lleva vaso)</span>' : ''}</p>
                    <p>Volumen: tuberías ${fmt(c.Vtub, 1)} l + equipos ${fmt(c.Veq, 1)} l = <b>${fmt(c.V, 1)} l</b> <span class="text-slate-400">(volumen de equipos: campo "Volumen interior" de cada equipo)</span></p>
                    ${gl ? `<p>Glicol ${gl[1]} al ${gl[2]} % en masa: <b>${fmt(c.V / 1000 * fl.rho * (+gl[2] / 100), 1)} kg</b> ≈ ${fmt(c.V / 1000 * fl.rho * (+gl[2] / 100) / (gl[1] === 'MEG' ? 1.113 : 1.036), 1)} l de glicol puro</p>` : ''}
                    ${c.abierto ? '' : `<div class="grid grid-cols-4 gap-2 mt-1">
                        <label>T llenado (°C)<input type="number" step="any" class="vv-t1 w-full border rounded p-1" value="10"></label>
                        <label>T máx (°C)<input type="number" step="any" class="vv-t2 w-full border rounded p-1" value="${ts}"></label>
                        <label>Altura estática sobre el vaso (m)<input type="number" step="any" class="vv-h w-full border rounded p-1" value="${fmt(c.zmax - (c.vaso ? +c.vaso.cota || 0 : c.zmin), 2)}"></label>
                        <label>Tarado válvula de seguridad (bar man.)<input type="number" step="any" class="vv-psv w-full border rounded p-1" value="3"></label>
                    </div><p class="vv-res mt-1"></p>`}
                </div>`).join('')}`;
            const calc = () => document.querySelectorAll('#red-content [data-circ]').forEach(d => {
                const c = cs[+d.dataset.circ]; if (c.abierto) return;
                const t1 = +d.querySelector('.vv-t1').value, t2 = +d.querySelector('.vv-t2').value, h = +d.querySelector('.vv-h').value, psv = +d.querySelector('.vv-psv').value;
                const { Ce, Pm, PM, Cp, Vv, nor } = calcVaso(c.V, fl, t1, t2, h, psv);
                d.querySelector('.vv-res').innerHTML = isFinite(Cp) ? `Ce ${fmt(Ce, 4)} · Pm ${fmt(Pm, 2)} bar abs (precarga ≈ ${fmt(Pm - 1.01325, 2)} bar man.) · PM ${fmt(PM, 2)} bar abs · Cp ${fmt(Cp, 2)} → <b>V vaso ${fmt(Vv, 1)} l → ${nor ? nor + ' l' : 'varios vasos'}</b>` : '<span class="text-rose-600">La presión máxima debe superar la mínima: sube el tarado de la válvula de seguridad.</span>';
                c.resVaso = { t1, t2, h, psv, Ce, Pm, PM, Cp, Vv, nor };
            });
            document.getElementById('red-content').oninput = calc; calc();
            ultimoVolumen = cs;
            document.getElementById('red-footer').innerHTML = `<button onclick="cerrarModalRed()" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium">Cerrar</button>`;
            document.getElementById('modal-red').style.display = 'flex';
        }
function dimensionarBomba__p(eta) {
            const d = calcularDimBomba(eta);
            if (d.error) { alert(d.error); return; }
            ultimoDimBomba = d;
            mostrarDimBomba();
        }
function mostrarDimBomba() {
            const D = ultimoDimBomba; if (!D) return;
            const fila = (k, v) => `<tr><td class="pr-3 py-0.5 text-slate-500">${k}</td><td class="font-bold">${v}</td></tr>`;
            const bloques = D.circuitos.map((d, i) => {
                const b0 = elementosRed.find(e => e.id === d.bombas[0]);
                return `<div class="border border-slate-200 rounded p-2 mb-3">
                <p class="text-xs font-bold text-slate-700 mb-1">${D.circuitos.length > 1 ? `Circuito ${i + 1} · ` : ''}${esc(d.tags.join(', '))}${d.nB > 1 ? ' (iguales, en paralelo)' : ''}</p>
                <p class="text-[11px] text-slate-500 mb-1">Caudal necesario ${fQ(d.Qreq, 2)} ${lQ()} (${d.origenQ})${d.sumaCons && d.Qd && Math.abs(d.Qd - d.sumaCons) > 0.01 ? ` · <span class="text-amber-600">el caudal de diseño del proyecto es ${fQ(d.Qd, 2)} ${lQ()}</span>` : ''}</p>
                <div class="grid grid-cols-2 gap-3 text-[11px]">
                  <table>
                    ${fila('Punto necesario (por bomba)', `${fQ(d.Qb, 2)} ${lQ()} · ${fmt(d.Hreq, 2)} m`)}
                    ${fila('Punto de selección (+10 % H)', `${fQ(d.Qb, 2)} ${lQ()} · ${fmt(d.H, 2)} m = ${fP(d.Hbar, 2)} ${lP()}`)}
                    ${fila('NPSH disponible', `${fmt(d.npsh, 2)} m → NPSHr ≤ ${fmt(d.npsh - opciones.margenNPSH, 2)} m`)}
                    ${fila('Potencia hidráulica', `${fmt(d.Ph, 2)} kW`)}
                    ${fila('Potencia al eje (η ' + D.eta + ')', `${fmt(d.Peje, 2)} kW`)}
                    ${fila('Motor normalizado IEC (+15 %)', `${d.Pmotor} kW`)}
                  </table>
                  <table class="text-[10px]"><tr class="text-slate-500"><th class="text-left pr-2">Q total (${lQ()})</th><th class="text-left">H necesaria (m)</th></tr>
                    ${d.curva.map(p => `<tr><td>${fQ(p.Q, 2)}</td><td>${fmt(p.H, 2)}</td></tr>`).join('')}
                    <tr><td colspan="2" class="text-slate-400 pt-1">Q = 0: altura estática + presión mínima</td></tr></table>
                </div>
                <div class="mt-1">${graficoBombaSVG(d, b0, D.rho)}</div>
                <div class="text-right"><button onclick="cerrarModalRed(); preseleccionarBomba(${i})" class="px-2 py-1 border border-blue-300 text-blue-700 hover:bg-blue-50 rounded text-[11px] mr-1"><i class="fa-solid fa-list-check mr-1"></i>Preseleccionar de la base de datos...</button><button onclick="aplicarDimBomba(${i})" class="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px]">Aplicar a ${d.nB > 1 ? 'estas bombas' : 'esta bomba'}</button></div>
                </div>`;
            }).join('');
            document.getElementById('red-content').innerHTML = `
                <p class="text-[11px] text-slate-500 mb-2">Fluido: <b>${esc(D.fluido)}</b> · rendimiento η <input id="dim-eta" type="number" step="0.01" min="0.2" max="0.95" value="${D.eta}" class="border rounded p-0.5 w-16"> <button onclick="dimensionarBomba(parseFloat(document.getElementById('dim-eta').value))" class="text-blue-600 underline">recalcular</button></p>
                ${D.errores.length ? `<div class="bg-amber-50 border border-amber-200 text-amber-700 rounded p-2 mb-2 text-[11px]">${D.errores.map(esc).join('<br>')}</div>` : ''}
                ${bloques}
                <p class="text-[10px] text-slate-500"><span style="color:#2a78d6">━</span> Instalación · <span style="color:#eb6834">━</span> Bomba propuesta (H₀ = 1,2·H) · <span style="color:#1baf7a">┅</span> Bomba actual. Cuando tengas la curva del fabricante, sustituye la propuesta.</p>`;
            document.getElementById('red-footer').innerHTML = `<button onclick="cerrarModalRed()" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium">Cerrar</button>`;
            document.getElementById('modal-red').style.display = 'flex';
        }
function aplicarDimBomba(i) {
            const D = ultimoDimBomba, d = D && D.circuitos[i]; if (!d) return;
            guardarEstado(); invalidarResultados();
            elementosRed.filter(e => d.bombas.includes(e.id) || d.bombas.includes(e.reservaDe)).forEach(e => { e.caudal = +d.Qb.toFixed(3); e.presion = +d.Hbar.toFixed(3); e.h0 = +(d.Hbar * 1.2).toFixed(3); e.potenciaMotor = d.Pmotor; e.eta = D.eta; });
            mostrarDimBomba(); renderizarVectorial();
            alert(`${d.tags.join(', ')}: ${d.Qb.toFixed(2)} m³/h a ${d.Hbar.toFixed(2)} bar (${d.H.toFixed(1)} m), H₀ ${(d.Hbar * 1.2).toFixed(2)} bar, motor ${d.Pmotor} kW.`);
        }
PARTES_OK.herr = true;
