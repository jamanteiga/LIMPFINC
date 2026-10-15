// PIPING · parte «informe»: se carga al usarla (la genera el empaquetado a partir de piping.js)
function filasModulosPED(ped) {
            const M = proyecto.pedModulos || {};
            return ped.filter(x => x.cat !== 'Fuera').map(x => { const m = M[x.linea] || {}, ops = modulosDe(x.cat), v = m.validado;
                return [x.linea, x.cat, m.modulo || (ops.length === 1 ? ops[0] : tradDoc('Pendiente de elegir')), ops.join(' / '), v ? `${v.categoria}${v.modulo ? ' · ' + v.modulo : ''} (${fechaDMA(v.fecha.slice(0, 10))})` : '—']; });
        }
function cargarDocx() {
            if (window.docx) return Promise.resolve(window.docx);
            return new Promise((ok, ko) => {
                const s = document.createElement('script');
                s.src = URL_DOCX;
                s.onload = () => window.docx ? ok(window.docx) : ko(new Error('La librería docx no se ha inicializado.'));
                s.onerror = () => ko(new Error('No se ha podido descargar la librería de Word (docx) desde jsDelivr. Comprueba la conexión a internet.'));
                document.head.appendChild(s);
            });
        }
function nsci(x, d = 3) {
            if (x == null || !isFinite(x)) return '—';
            if (x === 0) return '0';
            const [m, e] = (+x).toExponential(d).split('e');
            const ex = parseInt(e, 10);
            if (ex >= -2 && ex <= 4) return nf(x, Math.max(0, d - ex));
            return m.replace('.', ',') + '·10' + String(ex).split('').map(c => SUP[c] || '').join('');
        }
function mostrarAvisoProgreso(texto) {
            let d = document.getElementById('aviso-progreso');
            if (!texto) { if (d) d.remove(); return; }
            if (!d) { d = document.createElement('div'); d.id = 'aviso-progreso'; d.style.cssText = 'position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:3000;background:#1e3a8a;color:#fff;padding:8px 16px;border-radius:6px;font:12px sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.25)'; document.body.appendChild(d); }
            d.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i>${esc(texto)}`;
        }
function cargarJSZip() {
            if (window.JSZip) return Promise.resolve(window.JSZip);
            return new Promise((ok, ko) => { const s = document.createElement('script'); s.src = URL_JSZIP; s.onload = () => window.JSZip ? ok(window.JSZip) : ko(new Error('JSZip no se ha inicializado.')); s.onerror = () => ko(new Error('No se ha podido cargar JSZip (sin conexión).')); document.head.appendChild(s); });
        }
async function elegirPlantillaInforme__p() {
            let guardada = null; try { guardada = proyecto.cliente ? JSON.parse(localStorage.getItem(clavePlantilla()) || 'null') : null; } catch (e) { guardada = null; }
            const cli = esc(proyecto.cliente || '');
            const botones = [];
            if (guardada) botones.push({ texto: `Sí: plantilla de ${proyecto.cliente}`, valor: 'guardada', clase: 'bg-blue-600 hover:bg-blue-700 text-white' });
            botones.push({ texto: guardada ? 'Sí: otra plantilla...' : 'Sí: elegir plantilla (*.docx)...', valor: 'elegir', clase: guardada ? 'bg-white hover:bg-slate-50 border border-slate-300 text-slate-700' : 'bg-blue-600 hover:bg-blue-700 text-white' });
            botones.push({ texto: 'No: plantilla del programa', valor: 'no', clase: 'bg-white hover:bg-slate-50 border border-slate-300 text-slate-700' });
            botones.push({ texto: 'Cancelar', valor: null });
            const r = await dialogo('<i class="fa-solid fa-file-word text-blue-600 mr-1.5"></i>¿Usar una plantilla de Word?',
                `<p>Cliente: <b>${cli || '—'}</b>${guardada ? ` · plantilla guardada: <b>${esc(guardada.nombre)}</b> (${new Date(guardada.fecha).toLocaleDateString('es-ES')})` : ''}</p>
                 <p class="text-slate-400">La plantilla aporta página, cabecera, pie y estilos. Marcadores: <code>{{INFORME}}</code> (lugar del informe; sin él se añade al final con la portada del programa), <code>{{PROYECTO}}</code>, <code>{{CLIENTE}}</code>, <code>{{REF_CLIENTE}}</code>, <code>{{INSTALACION}}</code>, <code>{{DESCRIPCION}}</code>, <code>{{FECHA}}</code>, <code>{{REVISION}}</code>, <code>{{AUTOR}}</code>, <code>{{TITULO}}</code>.</p>
                 <p class="text-slate-400">La plantilla elegida se recuerda para este cliente.</p>`, botones);
            if (r == null) return 'cancelar';
            if (r === 'no') return null;
            let nombre, buffer;
            if (r === 'guardada') { nombre = guardada.nombre; buffer = b64aBuf(guardada.b64); }
            else {
                const f = await elegirArchivo('.docx,.dotx'); if (!f) return 'cancelar';
                nombre = f.name; buffer = await f.arrayBuffer();
                if (proyecto.cliente) { try { localStorage.setItem(clavePlantilla(), JSON.stringify({ nombre, fecha: new Date().toISOString(), b64: bufAb64(buffer) })); } catch (e) { aviso('La plantilla es demasiado grande para recordarla en el navegador; se usará solo esta vez.', 'error'); } }
            }
            try {
                const Z = await cargarJSZip(), zip = await Z.loadAsync(buffer), d = zip.file('word/document.xml');
                if (!d) throw new Error('no es un documento de Word (.docx)');
                const conMarcador = /\{\{\s*INFORME\s*\}\}/.test(textoXML(await d.async('string')));
                return { nombre, buffer, conMarcador };
            } catch (e) { alert('No se puede usar la plantilla ' + nombre + ': ' + e.message); return 'cancelar'; }
        }
function sustituirMarcadores(xml, valores) {
            return xml.replace(/\{(?:<[^>]+>)*\{((?:[^{}<]|<[^>]+>)+?)\}(?:<[^>]+>)*\}/g, (m, dentro) => {
                const clave = textoXML(dentro).trim().toUpperCase();
                if (!(clave in valores)) return m;
                const etiquetas = (m.match(/<[^>]+>/g) || []).join('');
                return esc(valores[clave]).replace(/"/g, '&quot;') + etiquetas;
            });
        }
async function aplicarPlantillaDocx(blob, plantilla) {
            const Z = await cargarJSZip();
            const nuestro = await Z.loadAsync(await blob.arrayBuffer()), pl = await Z.loadAsync(plantilla.buffer.slice(0));
            const leer = (z, f) => z.file(f) ? z.file(f).async('string') : Promise.resolve(null);
            const docO = await leer(nuestro, 'word/document.xml'), relsO = await leer(nuestro, 'word/_rels/document.xml.rels') || '';
            let docP = await leer(pl, 'word/document.xml'), relsP = await leer(pl, 'word/_rels/document.xml.rels') || '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
            const p = proyecto;
            const valores = { PROYECTO: p.numero, CLIENTE: p.cliente, REF_CLIENTE: p.refCliente, INSTALACION: p.instalacion, DESCRIPCION: p.descripcion, FECHA: p.fecha, REVISION: p.revision, AUTOR: p.autor, TITULO: 'Informe de cálculo hidráulico' };
            // 1) cuerpo del informe (sin la sección final)
            let cuerpo = docO.slice(docO.indexOf('<w:body>') + 8, docO.lastIndexOf('<w:sectPr'));
            // 2) relaciones que usa el cuerpo (imágenes, vínculos): se copian con identificadores nuevos
            const rels = {}; (relsO.match(/<Relationship\b[^>]*\/>/g) || []).forEach(r => { const id = (r.match(/Id="([^"]+)"/) || [])[1]; if (id) rels[id] = r; });
            const mapa = {}; let n = 0, nuevasRels = '';
            for (const [, id] of cuerpo.matchAll(/r:(?:embed|id|link)="([^"]+)"/g)) {
                if (mapa[id] || !rels[id]) continue;
                const r = rels[id], nid = 'rIdPiping' + (++n), tgt = (r.match(/Target="([^"]+)"/) || [])[1] || '';
                let r2 = r.replace(/Id="[^"]+"/, `Id="${nid}"`);
                if (!/TargetMode="External"/.test(r)) {
                    const src = 'word/' + tgt.replace(/^\/?word\//, ''), nombreF = 'media/piping_' + tgt.split('/').pop();
                    const f = nuestro.file(src); if (f) pl.file('word/' + nombreF, await f.async('uint8array'));
                    r2 = r2.replace(/Target="[^"]+"/, `Target="${nombreF}"`);
                }
                mapa[id] = nid; nuevasRels += r2;
            }
            cuerpo = cuerpo.replace(/r:(embed|id|link)="([^"]+)"/g, (m, a, id) => mapa[id] ? `r:${a}="${mapa[id]}"` : m);
            cuerpo = cuerpo.replace(/(<wp:docPr\b[^>]*\bid=")(\d+)"/g, (m, a, id) => a + (10000 + +id) + '"'); // identificadores de dibujo únicos
            relsP = relsP.replace('</Relationships>', nuevasRels + '</Relationships>');
            // 3) estilos: los de la plantilla mandan (mismo nombre de estilo); los que falten se añaden
            const stO = await leer(nuestro, 'word/styles.xml') || '', stPf = 'word/styles.xml';
            let stP = await leer(pl, stPf);
            if (stP) {
                const lista = x => (x.match(/<w:style\b[\s\S]*?<\/w:style>/g) || []).map(t => ({ t, id: (t.match(/w:styleId="([^"]+)"/) || [])[1], nombre: ((t.match(/<w:name w:val="([^"]+)"/) || [])[1] || '').toLowerCase() }));
                const deP = lista(stP), porNombre = {}, ids = new Set(deP.map(x => x.id)); deP.forEach(x => { porNombre[x.nombre] = x.id; });
                const mapaEst = {}; let anadir = '';
                lista(stO).forEach(x => { if (porNombre[x.nombre]) mapaEst[x.id] = porNombre[x.nombre]; else if (!ids.has(x.id)) anadir += x.t; });
                stP = stP.replace('</w:styles>', anadir + '</w:styles>'); pl.file(stPf, stP);
                cuerpo = cuerpo.replace(/(<w:(?:pStyle|rStyle|tblStyle) w:val=")([^"]+)"/g, (m, a, id) => a + (mapaEst[id] || id) + '"');
            } else pl.file(stPf, stO);
            // 4) espacios de nombres que usa el cuerpo y no declara la plantilla
            const raizO = docO.match(/<w:document\b[^>]*>/)[0], raizP = docP.match(/<w:document\b[^>]*>/)[0];
            let raizN = raizP;
            (raizO.match(/xmlns:\w+="[^"]*"/g) || []).forEach(ns => { const pref = ns.split('=')[0]; if (!raizN.includes(pref + '=')) raizN = raizN.replace(/>$/, ' ' + ns + '>'); });
            docP = docP.replace(raizP, raizN);
            // 5) marcadores de la plantilla y colocación del informe
            docP = sustituirMarcadores(docP, valores);
            let insertado = false;
            docP = docP.replace(/<w:p\b[\s\S]*?<\/w:p>/g, par => { if (!insertado && /\{\{\s*INFORME\s*\}\}/.test(textoXML(par))) { insertado = true; return cuerpo; } return par; });
            if (!insertado) { const k = docP.lastIndexOf('<w:sectPr'); const salto = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'; docP = docP.slice(0, k) + salto + cuerpo + docP.slice(k); }
            pl.file('word/document.xml', docP);
            pl.file('word/_rels/document.xml.rels', relsP);
            for (const f of Object.keys(pl.files).filter(f => /^word\/(header|footer)\d*\.xml$/.test(f))) pl.file(f, sustituirMarcadores(await pl.file(f).async('string'), valores));
            // 6) tipos de contenido (imágenes) y actualización de campos (índices) al abrir
            let ct = await leer(pl, '[Content_Types].xml');
            ['png', 'jpeg', 'jpg'].forEach(ext => { if (!new RegExp(`Extension="${ext}"`, 'i').test(ct)) ct = ct.replace('</Types>', `<Default Extension="${ext}" ContentType="image/${ext === 'jpg' ? 'jpeg' : ext}"/></Types>`); });
            ct = ct.replace(/application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.template\.main\+xml/, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'); // .dotx -> .docx
            pl.file('[Content_Types].xml', ct);
            let st = await leer(pl, 'word/settings.xml');
            if (st && !/<w:updateFields\b/.test(st)) {
                // el esquema fija el orden: updateFields va antes de hdrShapeDefaults, footnotePr, compat, rsids...
                const sig = ['<w:hdrShapeDefaults', '<w:footnotePr', '<w:endnotePr', '<w:compat', '<w:docVars', '<w:rsids', '<m:mathPr', '<w:attachedSchema', '<w:themeFontLang', '<w:clrSchemeMapping', '<w:doNotIncludeSubdocsInStats', '<w:doNotAutoCompressPictures', '<w:forceUpgrade', '<w:captions', '<w:readModeInkLockDown', '<w:smartTagType', '<sl:schemaLibrary', '<w:shapeDefaults', '<w:doNotEmbedSmartTags', '<w:decimalSymbol', '<w:listSeparator']
                    .map(t => st.indexOf(t)).filter(i => i >= 0);
                const k = sig.length ? Math.min(...sig) : st.lastIndexOf('</w:settings>');
                pl.file('word/settings.xml', st.slice(0, k) + '<w:updateFields w:val="true"/>' + st.slice(k));
            }
            return await pl.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        }
async function generarInforme__p() {
            if (escenarioBombas !== 'normal') {
                escenarioBombas = 'normal';
                const g = construirGrafoRed(), a = construirAristas(g), r = a.length ? calcularResultado(g, a) : { error: 'sin red' };
                if (!r.error) ultimoCalculo = { resultado: r.resultado, condiciones: r.condiciones, huella: huellaRed() };
                renderizarVectorial();
                alert('El informe parte del escenario normal (bombas de servicio); el de reserva se comprueba y se incluye aparte. Se ha vuelto al escenario normal.');
            }
            const c = comprobarInforme();
            if (c && c.tipo === 'datos') {
                alert('Para generar el informe faltan datos del proyecto:\n\n• ' + c.falta.join('\n• ') + '\n\nCompleta los datos; al guardarlos el informe continuará.');
                abrirDatosProyecto(() => generarInforme());
                return;
            }
            if (c && c.tipo === 'calculo') { alert('La red no está calculada o ha cambiado desde el último cálculo.\n\nEjecuta Cálculo > Calcular red y vuelve a Informe > Generar informe.'); return; }
            if (c && c.tipo === 'fallos') {
                const lista = c.fallos.slice(0, 25).map(f => '• ' + f).join('\n') + (c.fallos.length > 25 ? `\n… y ${c.fallos.length - 25} más` : '');
                alert('No se puede generar el informe: hay elementos que NO cumplen (en rojo en el plano).\n\n' + lista + '\n\nCorrige la red, recalcula y vuelve a intentarlo.');
                return;
            }
            const limpio = t => String(t || '').trim().replace(/[\\/:*?"<>|\r\n]+/g, '_');
            const nombre = `${limpio(proyecto.numero)}-${limpio(proyecto.instalacion)}-${new Date().toISOString().slice(0, 10)}-${limpio(proyecto.revision || '0')}.docx`; // NOMBREPROYECTO-INSTALACION-FECHA-REVISION
            // Plantilla de Word (por cliente) o la del programa
            const plantilla = await elegirPlantillaInforme();
            if (plantilla === 'cancelar') return;
            // El selector de destino se abre ANTES de generar (el navegador exige que venga de un clic reciente)
            let handle = null;
            if (window.showSaveFilePicker && !(navigator.userActivation && !navigator.userActivation.isActive)) {
                try {
                    handle = await window.showSaveFilePicker({ suggestedName: nombre, types: [{ description: 'Documento Word (*.docx)', accept: { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] } }] });
                } catch (err) { if (err.name === 'AbortError') return; handle = null; }
            }
            try {
                mostrarAvisoProgreso('Cargando la librería de Word…');
                const D = await cargarDocx();
                mostrarAvisoProgreso('Generando figuras y tablas…');
                const doc = await construirInforme(D, plantilla ? { unaSeccion: true, sinPortada: plantilla.conMarcador } : {});
                mostrarAvisoProgreso('Guardando el informe…');
                let blob = await D.Packer.toBlob(doc);
                if (plantilla) { mostrarAvisoProgreso('Aplicando la plantilla ' + plantilla.nombre + '…'); blob = await aplicarPlantillaDocx(blob, plantilla); }
                if (handle) {
                    const w = await handle.createWritable(); await w.write(blob); await w.close();
                } else {
                    const url = URL.createObjectURL(blob), a = document.createElement('a');
                    a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
                    setTimeout(() => URL.revokeObjectURL(url), 5000);
                }
                mostrarAvisoProgreso('Generando la comprobación por componente (Excel)…');
                let blobX = null, nombreX = nombre.replace(/\.docx$/i, '-comprobacion.xlsx');
                try { blobX = await generarComprobacionXLSX(); await guardarBlobComo(blobX, nombreX, 'Libro de Excel (*.xlsx)', { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }); } catch (ex) { console.error(ex); aviso('No se ha podido generar el Excel de comprobación: ' + ex.message, 'error'); }
                mostrarAvisoProgreso(null);
                abrirRevisionInforme(blob, handle ? handle.name : nombre, blobX, nombreX);   // se abren los dos para revisarlos
                if (false) alert(`Informe generado: ${handle ? handle.name : nombre}${plantilla ? '\nPlantilla: ' + plantilla.nombre : ''}\n\nAl abrirlo en Word acepta "actualizar campos" para rellenar los números de página de los índices (en LibreOffice: Herramientas > Actualizar > Actualizar todo).`);
            } catch (err) {
                console.error(err); mostrarAvisoProgreso(null);
                alert('No se ha podido generar el informe: ' + err.message);
            }
        }
function datosComprobacionRed() {
            const res = ultimoCalculo.resultado, fl = res.fluido, ars = res.aristas, de = id => ars.filter(a => a.el.id === id), rg = (fl.rho || 1000) * 9.80665, r3 = (x, d = 3) => x == null || !isFinite(x) ? '' : +(+x).toFixed(d);
            const estado = e => e.estado === 'fallo' ? 'NO CUMPLE' : (e.esLineaCritica ? 'Cumple · crítica' : 'Cumple');
            const bombas = elementosRed.filter(e => e.type === 'bomba' && ultimoResultado[e.id]).map(e => { const r = ultimoResultado[e.id], ci = conexBomba(e, 'Imp'), ca = conexBomba(e, 'Asp'), vD = vecinosDe(e).find(w => w.puertoEl === 'descarga'), vS = vecinosDe(e).find(w => w.puertoEl === 'succion');
                const dnI = ci.dn || e.dnImp || (vD ? dnEquivalente(vD.otro) || vD.otro.dn : '') || '', dnA = ca.dn || e.dnAsp || (vS ? dnEquivalente(vS.otro) || vS.otro.dn : '') || '';
                return { tag: tagDe(e), Q: r3(r.Q, 2), H: r3(r.H, 2), p: r3(r.H * rg / 1e5, 3), asp: [dnA ? etiquetaDN(dnA) : '', ca.tipo, ca.rating].filter(Boolean).join(' · '), imp: [dnI ? etiquetaDN(dnI) : '', ci.tipo, ci.rating].filter(Boolean).join(' · '),
                    npshd: r3(r.npshd, 2), npshr: r3(r.npshr != null ? r.npshr : e.npsh, 2), margen: r3((+r.npshd || 0) - (+(r.npshr != null ? r.npshr : e.npsh) || 0), 2), estado: estado(e) }; });
            const vistos = new Set(), lista = [];
            lineasEnOrden().forEach(o => o.orden.forEach(id => { if (!vistos.has(id)) { vistos.add(id); const e = elementosRed.find(x => x.id === id); if (e) lista.push(e); } }));
            elementosRed.forEach(e => { if (!vistos.has(e.id)) { vistos.add(e.id); lista.push(e); } });
            const comps = lista.filter(e => !esAnotacion(e) && e.type !== 'bomba').map(e => {
                const as = de(e.id), hf = as.reduce((s2, a) => s2 + (hfDeArista(a) || 0), 0), a0 = as[0];
                let car = e.type === 'tuberia' ? `${etiquetaTuberia(e)} · ${e.material}` : e.subtype === 'reduccion' ? `${etiquetaDN(e.dn)} × ${etiquetaDN(e.dnMenor)}${e.pn ? ' · ' + e.pn : ''}` : [e.dn ? etiquetaDN(e.dn) : '', e.pn || '', e.type === 'valvula' && e.conexValv ? e.conexValv : ''].filter(Boolean).join(' · ');
                let K = '', Cv = '', f = '';
                if (as.length && !sinFlujo(e)) { if (e.type === 'tuberia') f = r3(a0 && a0.f, 4); else if (as.length > 1) K = as.map(a => `${nfMenos(a.K)}${a.rama ? ' (' + a.rama + ')' : ''}`).join(' / '); else if (a0 && a0.K != null) { K = r3(a0.K, 3); if (e.type === 'valvula' && a0.K > 0 && a0.D) Cv = r3(29.9 * Math.pow(a0.D * 39.3701, 2) / Math.sqrt(a0.K), 1); } }
                return { tag: tagDe(e), tipo: nombreTipo(e), car, L: e.type === 'tuberia' ? r3((+e.longitud || 0) / 1000, 3) : '', Q: a0 ? r3(Math.abs(a0.Qprev || 0) * 3600, 2) : '', V: a0 && a0.V != null ? r3(a0.V, 3) : '', K, Cv, f, hf: as.length ? r3(hf, 4) : '', pa: as.length ? Math.round(hf * rg) : '', estado: estado(e) };
            });
            const lc = res.lineaCritica, out = { bombas, comps, fl, lc: lc ? { hf: r3(lc.hfTotal, 3), kPa: r3(lc.hfTotal * rg / 1000, 2), recorrido: lc.aristasCamino.map(a => tagDe(a.el)).filter((n, i, a) => !i || n !== a[i - 1]).join(' → ') } : null };
            // sin bombas: datos para seleccionar la bomba según la ruta crítica (bomba colocada al inicio de la ruta, sin pérdidas de aspiración)
            if (!bombas.length && lc && lc.aristasCamino.length) {
                const cam = lc.aristasCamino, cnt = {}; cam.forEach(a => { cnt[a.nodoA] = (cnt[a.nodoA] || 0) + 1; cnt[a.nodoB] = (cnt[a.nodoB] || 0) + 1; });
                const extremos = Object.keys(cnt).filter(n => cnt[n] === 1).map(Number), porNodo = (res.terminales && res.terminales.porNodo) || {};
                const esFuente = n => { const t = porNodo[n]; return t && !esConsumoT(t) && !/consumo|descarga|salida/i.test(t.subtype || ''); };
                const nA = extremos.find(esFuente) ?? (extremos.length ? extremos[0] : cam[0].nodoA), nZ = extremos.find(n => n !== nA) ?? cam[cam.length - 1].nodoB, a0 = cam[0];
                const zN = n => (res.z || {})[n] || 0, pM = n => (res.pMan || {})[n] || 0, pAbs = res.pAbs || {}, PATM = 101325;
                const ultT = cam.find(a => a.nodoA === nZ || a.nodoB === nZ), fin = porNodo[nZ] || (ultT && vecinosDe(ultT.el).map(v => v.otro).find(o => esConsumoT(o))), pMinZ = fin && esConsumoT(fin) ? (+fin.pMin || 0) * 1e5 : 0;
                const Hdisp = zN(nA) + pM(nA) / rg, Hreq = zN(nZ) + pMinZ / rg;      // altura disponible en el origen y necesaria en el final (m c.l.)
                const TDH = lc.hfTotal + Hreq - Hdisp, tubos = cam.map(a => a.el).filter(e => e.type === 'tuberia'), pA = pM(nA), z = zN;
                const Q = Math.max(+res.Qdiseno || 0, Math.abs(a0.Qprev || 0) * 3600);
                out.seleccion = [['Caudal', r3(Q, 2), 'm³/h'], ['Altura necesaria (pérdidas de la ruta crítica + desnivel + presión residual)', r3(TDH, 2), 'm c.l.'], ['Presión de salida de la bomba', r3((pA + rg * TDH) / 1e5, 3), 'bar man.'],
                    ['NPSH disponible en la aspiración (bomba al inicio de la ruta)', r3(((pAbs[nA] || PATM) - (fl.pv || 0)) / rg, 2), 'm'], ['Conexión de aspiración (DN de la tubería de entrada)', tubos[0] ? etiquetaDN(dnEquivalente(tubos[0]) || tubos[0].dn) : '', ''],
                    ['Conexión de impulsión (DN de la tubería de salida)', tubos.length ? etiquetaDN(dnEquivalente(tubos[tubos.length > 1 ? 1 : 0]) || tubos[tubos.length > 1 ? 1 : 0].dn) : '', ''], ['Pérdida de carga de la ruta crítica', r3(lc.hfTotal, 3), 'm c.l.'], ['Desnivel inicio → final de la ruta', r3(z(nZ) - z(nA), 2), 'm'], ['Altura disponible en el origen (cota + presión)', r3(Hdisp, 2), 'm c.l.'],
                    ['Presión residual exigida al final', r3(pMinZ / 1e5, 2), 'bar man.'], ['Fluido', `${fl.nombre} a ${fl.T} °C`, ''], ['Densidad', r3(fl.rho, 1), 'kg/m³'], ['Viscosidad cinemática', fl.nu != null ? r3(fl.nu * 1e6, 3) : '', 'mm²/s'], ['Presión de vapor', r3((fl.pv || 0) / 1000, 2), 'kPa']];
            }
            return out;
        }
async function generarComprobacionXLSX() {
            const X = await cargarXLSX(), d = datosComprobacionRed(), p = proyecto, aoa = [], merges = [];
            const tit = t => { aoa.push([t]); }, vacia = () => aoa.push([]);
            tit(`PIPING · Comprobación final por componente · ${p.numero || ''} · ${p.cliente || ''}`); tit(`${p.instalacion || ''} · Rev. ${p.revision || '0'} · ${new Date().toLocaleDateString('es-ES')}`); tit(`Fluido: ${d.fl.nombre} a ${d.fl.T} °C · ρ ${(+d.fl.rho).toFixed(1)} kg/m³`); vacia();
            if (d.bombas.length) {
                tit('BOMBAS'); aoa.push(['Bomba', 'Q (m³/h)', 'H a ese caudal (m c.l.)', 'Presión equivalente (bar)', 'Conexión de aspiración', 'Conexión de impulsión', 'NPSH calculado (m)', 'NPSH requerido (m)', 'Margen (m)', 'Estado']);
                d.bombas.forEach(b => aoa.push([b.tag, b.Q, b.H, b.p, b.asp, b.imp, b.npshd, b.npshr, b.margen, b.estado])); vacia();
            } else if (d.seleccion) {
                tit('DATOS PARA SELECCIONAR LA BOMBA (la red no tiene bomba; según la ruta crítica)'); aoa.push(['Concepto', 'Valor', 'Unidad']); d.seleccion.forEach(r => aoa.push(r)); vacia();
            }
            tit('TUBERÍAS, VÁLVULAS Y ACCESORIOS'); const c0 = aoa.length;
            aoa.push(['Componente', 'Tipo', 'Características', 'L (m)', 'Q (m³/h)', 'V (m/s)', 'K', 'Cv', 'f (Darcy)', 'Pérdida (m c.l.)', 'Pérdida (Pa)', 'Estado']);
            d.comps.forEach(c => aoa.push([c.tag, c.tipo, c.car, c.L, c.Q, c.V, c.K, c.Cv, c.f, c.hf, c.pa, c.estado]));
            vacia();
            if (d.lc) { aoa.push(['PÉRDIDA DE CARGA TOTAL DE LA LÍNEA CRÍTICA', d.lc.hf, 'm c.l.', d.lc.kPa, 'kPa']); aoa.push(['Recorrido de la ruta crítica', d.lc.recorrido]); }
            if (d.bombas.length) { vacia(); tit('DATOS DE LA BOMBA'); d.bombas.forEach(b => aoa.push([b.tag, `Q ${b.Q} m³/h`, `H ${b.H} m c.l. (${b.p} bar)`, `Asp. ${b.asp || '—'}`, `Imp. ${b.imp || '—'}`, `NPSHd ${b.npshd} m`, `NPSHr ${b.npshr} m`, b.estado])); }
            else if (d.seleccion) { vacia(); tit('DATOS DE LA BOMBA NECESARIA'); d.seleccion.slice(0, 6).forEach(r => aoa.push([r[0], r[1], r[2]])); }
            const ws = X.utils.aoa_to_sheet(aoa);
            ws['!cols'] = [30, 22, 34, 10, 10, 10, 18, 10, 10, 14, 12, 16].map(w => ({ wch: w }));
            ws['!autofilter'] = { ref: X.utils.encode_range({ s: { r: c0, c: 0 }, e: { r: c0 + d.comps.length, c: 11 } }) };
            const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, 'Comprobación');
            return new Blob([X.write(wb, { type: 'array', bookType: 'xlsx' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        }
async function guardarBlobComo(blob, nombre, desc, accept) {
            if (window.showSaveFilePicker && navigator.userActivation && navigator.userActivation.isActive) {
                try { const h = await window.showSaveFilePicker({ suggestedName: nombre, types: [{ description: desc, accept }] }); const w = await h.createWritable(); await w.write(blob); await w.close(); return h.name; } catch (e) { if (e.name === 'AbortError') return null; }
            }
            const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 8000); return nombre;
        }
function cargarDocxPreview() {
            if (window.docx && window.docx.renderAsync) return Promise.resolve(window.docx);
            return cargarJSZip().then(() => new Promise((ok, ko) => { const sc = document.createElement('script'); sc.src = URL_DOCX_PREVIEW; sc.onload = () => window.docx && window.docx.renderAsync ? ok(window.docx) : ko(new Error('docx-preview no disponible')); sc.onerror = () => ko(new Error('No se ha podido cargar el visor de Word (sin conexión a cdn.jsdelivr.net).')); document.head.appendChild(sc); }));
        }
async function abrirRevisionInforme(blobD, nombreD, blobX, nombreX) {
            revisionInforme = { blobD, nombreD, blobX, nombreX };
            document.querySelector('#modal-red h3 span').innerHTML = '<i class="fa-solid fa-file-word text-blue-600 mr-1.5"></i> Revisión del informe';
            document.querySelector('#modal-red > div').style.width = 'min(1200px, 97vw)';
            document.getElementById('red-content').innerHTML = `<div class="flex gap-1 mb-2 text-xs"><button id="rv-t-d" onclick="pestanaRevision('d')" class="px-3 py-1 border rounded bg-blue-600 text-white">Informe (.docx)</button>${blobX ? '<button id="rv-t-x" onclick="pestanaRevision(\'x\')" class="px-3 py-1 border rounded">Comprobación por componente (.xlsx)</button>' : ''}<span class="flex-1"></span><span class="text-slate-500 self-center">Guardados: ${esc(nombreD)}${blobX ? ' · ' + esc(nombreX) : ''}</span></div>
                <div id="rv-d" style="height:68vh;overflow:auto;background:#e5e7eb;padding:8px"><p class="text-slate-500 text-xs p-4">Cargando el informe…</p></div><div id="rv-x" style="display:none;height:68vh;overflow:auto;background:#fff" class="text-[11px]"></div>`;
            document.getElementById('red-footer').innerHTML = `<div class="flex gap-2 w-full text-xs"><button onclick="abrirBlobRevision('d')" class="px-3 py-1.5 border rounded"><i class="fa-solid fa-file-word mr-1"></i>Abrir el .docx</button>${blobX ? '<button onclick="abrirBlobRevision(\'x\')" class="px-3 py-1.5 border rounded"><i class="fa-solid fa-file-excel mr-1"></i>Abrir el .xlsx</button>' : ''}<span class="flex-1"></span><button onclick="cerrarModalRed()" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium">Cerrar</button></div>`;
            document.getElementById('modal-red').style.display = 'flex';
            try { const DP = await cargarDocxPreview(), cont = document.getElementById('rv-d'); cont.innerHTML = ''; await DP.renderAsync(blobD, cont, null, { inWrapper: true, ignoreLastRenderedPageBreak: true }); }
            catch (e) { const c = document.getElementById('rv-d'); if (c) c.innerHTML = `<p class="text-rose-700 text-xs p-4">${esc(e.message)} Usa «Abrir el .docx».</p>`; }
            if (blobX) try { const X = await cargarXLSX(), wb = X.read(new Uint8Array(await blobX.arrayBuffer()), { type: 'array' }), html = X.utils.sheet_to_html(wb.Sheets[wb.SheetNames[0]], { header: '', footer: '' });
                const c = document.getElementById('rv-x'); if (c) { c.innerHTML = html; c.querySelectorAll('td').forEach(td => { td.style.cssText = 'border:1px solid #e2e8f0;padding:2px 6px;white-space:nowrap'; if (/^NO CUMPLE$/.test(td.textContent)) td.style.color = '#b91c1c'; }); } } catch (e) { console.warn(e); }
        }
function pestanaRevision(k) { ['d', 'x'].forEach(x => { const c = document.getElementById('rv-' + x), b = document.getElementById('rv-t-' + x); if (c) c.style.display = x === k ? '' : 'none'; if (b) b.className = 'px-3 py-1 border rounded' + (x === k ? ' bg-blue-600 text-white' : ''); }); }
function abrirBlobRevision(k) { const r = revisionInforme; if (!r) return; const b = k === 'd' ? r.blobD : r.blobX, n = k === 'd' ? r.nombreD : r.nombreX; if (!b) return; const url = URL.createObjectURL(b), a = document.createElement('a'); a.href = url; a.download = n; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 8000); }
function dibujoElemento(el, c, P) {
            const tr = `translate(${el.x}, ${mundoAScreenY(el.y)}) rotate(${el.rotation || 0}, 25, 25) scale(${el.scale || 1})${trEspejo(el)}`;
            let d;
            if (el.type === 'bomba') d = simboloBomba(c, P);
            else if (el.type === 'tuberia') d = `<line x1="0" y1="20" x2="${largoPxTubo(el)}" y2="20" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/>`;
            else d = simboloSVG(el, c, P);
            return `<g transform="${tr}">${d}</g>`;
        }
async function figuraPNG(op) {
            const P = { base: '#2563eb', texto: '#1e293b', halo: '#ffffff', relleno: '#ffffff', ok: '#16a34a', fallo: '#dc2626', critica: '#7c3aed', flecha: '#16a34a', sel: '#f59e0b' };
            const NS = 'http://www.w3.org/2000/svg';
            const svg = document.createElementNS(NS, 'svg');
            svg.setAttribute('style', 'position:fixed;left:-20000px;top:0;width:4000px;height:4000px');
            document.body.appendChild(svg);
            try {
                const g = document.createElementNS(NS, 'g');
                svg.appendChild(g);
                g.innerHTML = op.contexto.map(el => dibujoElemento(el, '#a3aab5', P)).join('') + op.principales.map(el => dibujoElemento(el, colorElemento(el, P), P)).join('');
                let bb = g.getBBox();
                const k = Math.max(1, Math.max(bb.width, bb.height * 1.3) / 640);
                const R = 6.5 * k, fs = 7.5 * k;
                let extra = '';
                if (op.numeros) {
                    op.principales.forEach((el, i) => {
                        const n = op.numeros[el.id]; if (n == null) return;
                        const cen = centroElemento(el);
                        const vertical = el.type === 'instrumento' || Math.round(((el.rotation || 0) % 180 + 180) % 180) === 90;
                        const lado = el.type === 'instrumento' ? 1 : (i % 2 ? -1 : 1), off = (el.type === 'tuberia' ? 8 : 20) * (el.scale || 1) + R * 1.6;
                        const cx = vertical ? cen.x + lado * off : cen.x, cy = vertical ? cen.y : cen.y + lado * off;
                        const ix = vertical ? cen.x + lado * (off - R * 1.6 + 2) : cen.x, iy = vertical ? cen.y : cen.y + lado * (off - R * 1.6 + 2);
                        extra += `<line x1="${ix}" y1="${iy}" x2="${cx - (vertical ? lado * R : 0)}" y2="${cy - (vertical ? 0 : lado * R)}" stroke="#64748b" stroke-width="${0.6 * k}"/>` +
                            `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#ffffff" stroke="#1e3a8a" stroke-width="${0.8 * k}"/>` +
                            `<text x="${cx}" y="${cy + fs * 0.36}" font-family="Arial, sans-serif" font-size="${n > 99 ? fs * 0.75 : fs}" font-weight="bold" fill="#1e3a8a" text-anchor="middle">${n}</text>`;
                    });
                }
                if (op.rotulosLinea) {
                    const porLinea = {};
                    op.principales.forEach(el => { if (el.linea) (porLinea[el.linea] = porLinea[el.linea] || []).push(el); });
                    Object.entries(porLinea).forEach(([id, els]) => {
                        const cs = els.map(centroElemento), cx = cs.reduce((s, p) => s + p.x, 0) / cs.length;
                        const masCerca = cs.reduce((b, p) => Math.abs(p.x - cx) < Math.abs(b.x - cx) ? p : b, cs[0]);
                        extra += `<text x="${masCerca.x}" y="${masCerca.y - 14 * k}" font-family="Arial, sans-serif" font-size="${fs * 1.15}" font-weight="bold" fill="#1e3a8a" text-anchor="middle" paint-order="stroke" stroke="#ffffff" stroke-width="${3 * k}">${esc(id)}</text>`;
                    });
                }
                g.insertAdjacentHTML('beforeend', extra);
                bb = g.getBBox();
                const m = 8 * k, x0 = bb.x - m, y0 = bb.y - m, w = bb.width + 2 * m, h = bb.height + 2 * m;
                let esc2 = 1800 / w; if (h * esc2 > 2200) esc2 = 2200 / h;
                const W = Math.round(w * esc2), H = Math.round(h * esc2);
                const txt = `<svg xmlns="${NS}" width="${W}" height="${H}" viewBox="${x0} ${y0} ${w} ${h}"><rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#ffffff"/>${g.innerHTML}</svg>`;
                const img = new Image();
                await new Promise((ok, ko) => { img.onload = ok; img.onerror = () => ko(new Error('No se ha podido rasterizar una figura.')); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(txt); });
                const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
                const cx = cv.getContext('2d'); cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, W, H); cx.drawImage(img, 0, 0, W, H);
                const blob = await new Promise(ok => cv.toBlob(ok, 'image/png'));
                const data = new Uint8Array(await blob.arrayBuffer());
                // tamaño en el documento (px a 96 ppp): ancho útil 16,5 cm, alto máx. 20 cm
                // (sin ampliar los croquis pequeños más de 1,4 veces su tamaño en el lienzo)
                let dw = Math.min(620, w * 1.4), dh = dw * H / W;
                if (dh > 755) { dw *= 755 / dh; dh = 755; }
                return { data, width: Math.round(dw), height: Math.round(dh) };
            } finally { svg.remove(); }
        }
async function svgAPNG(txt, W, H) {
            const img = new Image();
            await new Promise((ok, ko) => { img.onload = ok; img.onerror = () => ko(new Error('No se ha podido rasterizar un gráfico.')); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(txt); });
            const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
            const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, W, H); cx.drawImage(img, 0, 0, W, H);
            const blob = await new Promise(ok => cv.toBlob(ok, 'image/png'));
            return new Uint8Array(await blob.arrayBuffer());
        }
function detalleK(el, a) {
            const Dmm = a.D * 1000, dn = dnNum(el.dn), F = [];
            const fTfila = () => { const v = fT(dn, Dmm); F.push(['Factor de fricción de referencia', 'fT (Crane TP-410, turbulencia total)', CAT.ft.some(r => r[0] === dn) ? `tabla Crane, DN ${dn}` : `Crane ec. 2-8, ε = 0,046 mm, D = ${nf(Dmm, 2)} mm`, nf(v, 4)]); return v; };
            const conCv = (cv, fuente) => {
                F.push(['Coeficiente de caudal', 'Cv (' + fuente + ')', '', nf(cv, 1)]);
                F.push(['Coeficiente de resistencia', 'K = 891·d⁴/Cv²  (d en pulgadas)', `891 × (${nf(Dmm, 2)}/25,4)⁴ / ${nf(cv, 1)}²`, nf(a.K, 4)]);
                return `K = ${nf(a.K, 3)} (Cv ${nf(cv, 0)})`;
            };
            if (calcDe(el) === 'cero') { F.push(['Coeficiente de resistencia', 'K despreciable (unión/brida)', '', '0']); return { k: 'K = 0', filas: F }; }
            if (el.modoK === 'manual') { F.push(['Coeficiente de resistencia', 'K facilitado por el usuario', '', nf(a.K, 4)]); return { k: `K = ${nf(a.K, 3)} (usuario)`, filas: F }; }
            if (el.modoK === 'kvs') {
                const kv = kvApertura(el), h = Math.min(Math.max((+el.apertura || 0) / 100, 0.02), 1);
                F.push(['Coeficiente a la apertura', el.caracteristica === 'lineal' ? 'Kv = Kvs·h (lineal)' : 'Kv = Kvs·R^(h−1), R = 50 (isoporcentual)', el.caracteristica === 'lineal' ? `${nf(+el.kvs, 2)} × ${nf(h, 2)}` : `${nf(+el.kvs, 2)} × 50^(${nf(h, 2)} − 1)`, `${nf(kv, 3)} m³/h`]);
                F.push(['Coeficiente de resistencia', 'K = 891·d⁴/Cv²;  Cv = 1,156·Kv', `891 × (${nf(Dmm, 2)}/25,4)⁴ / (1,156 × ${nf(kv, 3)})²`, nf(a.K, 4)]);
                return { k: `Kvs ${nf(+el.kvs, 1)} · ${nf(+el.apertura, 0)} % → K ${nf(a.K, 2)}`, filas: F };
            }
            if (el.modoK === 'cv' && +el.cvUsuario > 0) return { k: conCv(+el.cvUsuario, 'fabricante, dato del usuario'), filas: F };
            if (el.type === 'valvula' && el.modoK === 'catalogo') {
                const s = CAT.valvulas.find(v => v.nombre === el.serieCat), cv = s ? s.cv[npsDeDN(el.dn)] : null;
                if (cv) return { k: conCv(cv, s.nombre), filas: F };
            }
            const ent = entradaCrane(el);
            if (ent && ent[1] && typeof ent[1] === 'object') { F.push(['Coeficiente de resistencia', `K fijo: ${ent[0]}`, '', nf(a.K, 4)]); return { k: `K = ${nf(a.K, 3)}`, filas: F }; }
            if (ent) {
                const n = nCrane(ent[1], dn), v = fTfila();
                F.push(['Coeficiente de resistencia', `K = n·fT  (${ent[0]})`, `${nf(n, 1)} × ${nf(v, 4)}`, nf(a.K, 4)]);
                return { k: `K = ${nf(a.K, 3)} (${nf(n, 0)}·fT)`, filas: F };
            }
            F.push(['Coeficiente de resistencia', 'K', '', nf(a.K, 4)]);
            return { k: `K = ${nf(a.K, 3)}`, filas: F };
        }
function filasVelocidad(a, F) {
            const Q = Math.abs(a.Qprev);
            F.push(['Caudal', 'Q', '', `${nf(Q * 3600, 3)} m³/h = ${nsci(Q)} m³/s`]);
            F.push(['Sección', 'A = π·D²/4', `π × ${nf(a.D, 4)}² / 4`, `${nsci(a.A)} m²`]);
            F.push(['Velocidad', 'V = Q / A', `${nsci(Q)} / ${nsci(a.A)}`, `${nf(a.V, 3)} m/s`]);
        }
function filaVmax(a, F) {
            const lim = ultimoCalculo.resultado.limites, vl = a.lado === 'asp' ? lim.asp : lim.imp;
            F.push([`Comprobación de velocidad (${a.lado === 'asp' ? 'aspiración' : 'impulsión'})`, 'V ≤ Vmax', `${nf(a.V, 3)} ≤ ${nf(vl, 2)} m/s`, a.V <= vl ? 'CUMPLE' : 'NO CUMPLE']);
        }
function justificacion(el, ars) {
            const res = ultimoCalculo.resultado, fl = res.fluido, F = [];
            let kTexto = '';
            if (sinFlujo(el)) { F.push(['—', 'Elemento sin caudal', 'No interviene en el balance hidráulico', '—']); return { filas: F, k: '—' }; }
            const rhoG = `${nf(fl.rho, 1)} × 9,81`;
            if (esTerminal(el)) {
                const r = ultimoResultado[el.id];
                if (!r) { F.push(['—', 'Terminal sin conectar', '', '—']); return { filas: F, k: '—' }; }
                if (esConsumoT(el)) {
                    F.push(['Caudal demandado', 'Q (dato)', '', `${nf(r.Q, 3)} m³/h`]);
                    F.push(['Presión en el punto de consumo', 'p = (H − z)·ρ·g − p_atm', `(${nf(r.H, 3)} − ${nf(r.z, 2)}) × ${rhoG} − 101 325 Pa`, `${nf(r.p, 3)} bar`]);
                    F.push(['Comprobación de presión', 'p ≥ p mín', `${nf(r.p, 3)} ≥ ${nf(r.pMin, 2)} bar`, r.exceso >= -1e-4 ? 'CUMPLE' : 'NO CUMPLE']);
                    F.push(['Exceso de presión', 'Δp exc = p − p mín', `${nf(r.p, 3)} − ${nf(r.pMin, 2)}`, `${nf(r.exceso, 3)} bar`]);
                    const cc = res.consumoCritico;
                    if (r.equilibrado) {
                        F.push(['Presión a equilibrar', 'Δp = Δp exc − Δp exc (consumo más desfavorable)', `${nf(r.exceso, 3)} − ${nf(cc.margen, 3)}  (${tagDe(cc.el)})`, `${nf(r.equilibrado.dp, 3)} bar`]);
                        F.push(['Válvula de equilibrado', 'Kv = Q·√[(ρ/1000)/Δp];  Cv = 1,156·Kv', `${nf(r.Q, 3)} × √[(${nf(fl.rho / 1000, 4)})/${nf(r.equilibrado.dp, 3)}]`, `Kv ${nf(r.equilibrado.Kv, 2)} m³/h · Cv ${nf(r.equilibrado.Cv, 2)}`]);
                    } else F.push(['Válvula de equilibrado', r.critico ? 'Consumo más desfavorable: sin válvula; su exceso es el margen de la bomba o de la alimentación' : 'No necesaria (diferencia < 0,01 bar)', '', '—']);
                    return { filas: F, k: `Q ${nf(r.Q, 2)} · p mín ${nf(r.pMin, 2)} bar` };
                }
                F.push(['Altura piezométrica impuesta', 'H = z lámina + (p_atm + p)/(ρ·g)', `${nf(el.cotaLamina, 2)} + (101 325 + ${nf(el.presionDep * 1e5, 0)}) / (${rhoG})`, `${nf(r.H, 3)} m`]);
                F.push(['Presión en la conexión', 'p = (H − z)·ρ·g − p_atm', `(${nf(r.H, 3)} − ${nf(r.z, 2)}) × ${rhoG} − 101 325 Pa`, `${nf(r.p, 3)} bar`]);
                F.push(['Caudal', 'Balance de masa en el nodo', r.sentido, `${nf(r.Q, 3)} m³/h`]);
                return { filas: F, k: `lámina ${nf(el.cotaLamina, 2)} m` };
            }
            if (el.type === 'equipo') {
                ars.forEach(a => {
                    const sec = a.rama === 'sec', qN = sec ? el.qNom2 : el.qNom, dpN = sec ? el.dpNom2 : el.dpNom;
                    const hfN = dpN * 1000 / (fl.rho * G), Vn = qN / 3600 / a.A;
                    if (dosCircuitos(el)) F.push([sec ? 'Circuito secundario (c–d)' : 'Circuito primario (a–b)', '', '', '']);
                    F.push(['Dato del fabricante', 'Δp nom a Q nom', '', `${nf(dpN, 2)} kPa a ${nf(qN, 2)} m³/h`]);
                    F.push(['Pérdida nominal en altura', 'hf nom = Δp nom/(ρ·g)', `${nf(dpN * 1000, 0)} / (${rhoG})`, `${nf(hfN, 3)} m`]);
                    F.push(['K equivalente (Dint de la tubería conectada)', 'K = 2g·hf nom / V nom²', `2 × 9,81 × ${nf(hfN, 3)} / ${nf(Vn, 3)}²  (D = ${nf(a.D * 1000, 2)} mm)`, nf(a.K, 3)]);
                    filasVelocidad(a, F);
                    const hf = hfDeArista(a);
                    F.push(['Pérdida de carga en funcionamiento', 'Δp = Δp nom·(Q/Q nom)²', `${nf(dpN, 2)} × (${nf(Math.abs(a.Qprev) * 3600, 3)}/${nf(qN, 2)})²`, `${nf(hf * fl.rho * G / 1000, 2)} kPa = ${nf(hf, 3)} m`]);
                });
                return { filas: F, k: `Δp ${nf(el.dpNom, 1)} kPa @ ${nf(el.qNom, 1)} m³/h${dosCircuitos(el) ? ` · sec. ${nf(el.dpNom2, 1)} kPa @ ${nf(el.qNom2, 1)}` : ''}` };
            }
            if (el.type === 'tuberia') {
                const a = ars[0], dt = datosTuberia(el), hf = hfDeArista(a);
                F.push(['Diámetro interior', 'Dint = De − 2·e', `${nf(dt.od, 1)} − 2 × ${nf(dt.e, 2)} mm`, `${nf(dt.Dint, 2)} mm`]);
                filasVelocidad(a, F);
                F.push(['Número de Reynolds', 'Re = V·D / ν', `${nf(a.V, 3)} × ${nf(a.D, 4)} / ${nsci(fl.nu)}`, String(Math.round(a.Re))]);
                if (a.Re < 2300) F.push(['Factor de fricción (laminar)', 'f = 64 / Re', `64 / ${Math.round(a.Re)}`, nf(a.f, 5)]);
                else F.push([`Factor de fricción (${a.Re < 4000 ? 'transición, ' : ''}Colebrook-White)`, '1/√f = −2·log₁₀[ε/(3,7·D) + 2,51/(Re·√f)]', `ε = ${nf(dt.rug, 3)} mm; ε/D = ${nsci(a.rugosidad / a.D)}; Re = ${Math.round(a.Re)}`, nf(a.f, 5)]);
                { const hfr = a.f * a.L / a.D * a.V * a.V / (2 * G); F.push(['Pérdida de carga por fricción', 'hf = f·(L/D)·V²/(2g)', `${nf(a.f, 5)} × (${nf(a.L, 3)} / ${nf(a.D, 4)}) × ${nf(a.V, 3)}² / (2 × 9,81)`, `${nf(hfr, 4)} m`]);
                  if (a.Kterm > 0) F.push(['Entrada / salida del depósito', 'h = K·V²/(2g)  (entrada 0,5 / 0,78 / 0,04; salida 1,0 · Crane)', `${nf(a.Kterm, 2)} × ${nf(a.V, 3)}² / (2 × 9,81)`, `${nf(hf - hfr, 4)} m`]); }
                filaVmax(a, F);
                F.push(['Cotas de los extremos', 'z a, z b', '', `${nf(el.cotaA, 2)} / ${nf(el.cotaB, 2)} m`]);
                F.push(['Presión manométrica en los extremos', 'p = (H − z)·ρ·g − p_atm', `H = ${nf(res.Hnodo[a.nodoA], 3)} / ${nf(res.Hnodo[a.nodoB], 3)} m`, `${nf(a.pA, 3)} / ${nf(a.pB, 3)} bar`]);
                F.push(['Presión mínima (vaporización)', 'p abs ≥ pv', `${nf(Math.min(res.pAbs[a.nodoA], res.pAbs[a.nodoB]) / 1000, 2)} ≥ ${nf(fl.pv / 1000, 3)} kPa`, 'CUMPLE']);
                const pm = pmaTuberia(el, tempDiseno(fl.T));
                if (pm.t != null) F.push([`Presión máxima admisible (a ${tempDiseno(fl.T)} °C)`, 'PMA = 2·S·E·W·t/(D − 2·Y·t);  t = 0,875·e − c', `S = ${nf(pm.S, 1)} MPa; E = W = 1; Y = 0,4; t = 0,875 × ${nf(dt.e, 2)} − ${nf(pm.c, 1)} = ${nf(pm.t, 3)} mm; D = ${nf(dt.od, 1)} mm`, `${nf(pm.pma, 1)} bar`]);
                else if (pm.PN != null) F.push([`Presión máxima admisible (a ${tempDiseno(fl.T)} °C)`, 'PMA = PN·fT', `${nf(pm.PN, 0)} × ${nf(pm.fT, 2)}  (${pm.origen.replace(/^.*\(/, '').replace(/\)$/, '')})`, `${nf(pm.pma, 1)} bar`]);
                else F.push(['Presión máxima admisible', 'Dato del usuario', '', pm.pma != null ? `${nf(pm.pma, 1)} bar` : '—']);
                if (pm.pma != null) {
                    F.push(['Comprobación de presión de servicio', 'p máx ≤ PMA', `${nf(a.pmax, 3)} ≤ ${nf(pm.pma, 1)} bar`, a.pmax <= pm.pma ? 'CUMPLE' : 'NO CUMPLE']);
                    if (a.pCierre != null) F.push(['Presión a caudal nulo (bomba contra válvula cerrada)', 'p = (Hs + H₀ − z)·ρ·g − p_atm', '', `${nf(a.pCierre, 2)} bar → ${a.pCierre <= pm.pma ? 'CUMPLE' : 'AVISO'}`]);
                }
                const w = a.ariete;
                if (w) {
                    F.push(['Celeridad de la onda (Korteweg)', 'a = √[(Kf/ρ)/(1 + Kf·D/(E·e))]', `Kf = ${nf(w.Kf / 1e6, 0)} MPa; E = ${nf(w.E / 1e6, 0)} MPa; D = ${nf(w.Dint, 2)} mm; e = ${nf(w.e, 2)} mm`, `${nf(w.cel, 0)} m/s`]);
                    F.push(['Tiempo crítico', 'Tc = 2·L/a', `2 × ${nf(w.L, 2)} / ${nf(w.cel, 0)}  (L de la línea)`, `${nf(w.Tcrit, 3)} s`]);
                    F.push([`Sobrepresión de golpe de ariete (${w.rapido ? 'Joukowsky, cierre rápido' : 'Michaud, cierre lento'})`, w.rapido ? 'Δp = ρ·a·V' : 'Δp = 2·ρ·L·V/tc',
                        w.rapido ? `${nf(fl.rho, 1)} × ${nf(w.cel, 0)} × ${nf(a.V, 3)}${w.tc ? `  (tc ${nf(w.tc, 2)} s ≤ Tc)` : '  (cierre instantáneo)'}` : `2 × ${nf(fl.rho, 1)} × ${nf(w.L, 2)} × ${nf(a.V, 3)} / ${nf(w.tc, 2)}`, `${nf(w.dp / 1e5, 3)} bar`]);
                    if (pm.pma != null) F.push(['Comprobación con golpe de ariete', 'p máx + Δp ≤ PMA', `${nf(a.pmax, 3)} + ${nf(w.dp / 1e5, 3)} ≤ ${nf(pm.pma, 1)} bar`, a.pmax + w.dp / 1e5 <= pm.pma ? 'CUMPLE' : 'AVISO']);
                }
                return { filas: F, k: `f = ${nf(a.f, 4)}` };
            }
            if (el.type === 'bomba' && !ars.length) { F.push(['Bomba de reserva', 'Parada en el escenario normal (válvula cerrada)', 'Ver el funcionamiento con la bomba de reserva en el apartado 3.3', '—']); return { filas: F, k: el.reservaDe ? 'Reserva' : '—' }; }
            if (el.type === 'bomba') {
                const a = ars[0], r = ultimoResultado[el.id], rho = fl.rho;
                const Hd = a.Hd_m, H0 = a.H0m, Qd = a.Qd;
                F.push(['Curva de la bomba', 'H = H₀ − k·Q²;  k = (H₀ − Hd)/Qd²', `H₀ = ${nf(a.H0_bar, 2)} bar = ${nf(H0, 2)} m; Hd = ${nf(a.Hd_bar, 2)} bar = ${nf(Hd, 2)} m; Qd = ${nf(Qd * 3600, 2)} m³/h`, `k = ${nsci(a.kPump)} s²/m⁵`]);
                F.push(['Punto de funcionamiento', 'Q, H = H(descarga) − H(aspiración)', '', `Q = ${nf(r.Q, 2)} m³/h; H = ${nf(r.H, 2)} m`]);
                F.push(['Potencia hidráulica', 'Ph = ρ·g·Q·H', `${nf(rho, 1)} × 9,81 × ${nsci(Math.abs(a.Qprev))} × ${nf(r.H, 2)} / 1000`, `${nf(r.potencia, 3)} kW`]);
                const Hs = res.Hnodo[a.nodoA], vS = velocidadEnNodo(a.nodoA, res.aristas, a);
                F.push(['NPSH disponible', 'NPSHd = Hs − z − pv/(ρ·g) + v²/(2g)', `${nf(Hs, 3)} − ${nf(el.cota || 0, 2)} − ${nf(fl.pv, 0)}/(${nf(rho, 1)} × 9,81) + ${nf(vS, 3)}²/(2 × 9,81)`, `${nf(r.npshd, 3)} m`]);
                F.push(['Comprobación NPSH', 'NPSHd − NPSHr ≥ margen', `${nf(r.npshd, 2)} − ${nf(el.npsh, 2)} ≥ ${nf(opciones.margenNPSH, 2)} m`, r.npshd - el.npsh >= opciones.margenNPSH ? 'CUMPLE' : 'NO CUMPLE']);
                if (res.Qdiseno) F.push(['Comprobación del caudal de diseño', 'ΣQ bombas ≥ Q diseño', `${nf(res.Qbombas, 2)} ≥ ${nf(res.Qdiseno, 2)} m³/h`, res.Qbombas >= res.Qdiseno * 0.999 ? 'CUMPLE' : 'NO CUMPLE']);
                return { filas: F, k: `H₀ ${nf(a.H0_bar, 2)} bar · Qd ${nf(Qd * 3600, 1)} m³/h` };
            }
            if (el.subtype === 'reduccion') {
                const a = ars[0], D1 = dintTuberiaEnNodo(a.nodoA, res.aristas) || dintReferencia(el.dn), D2 = dintTuberiaEnNodo(a.nodoB, res.aristas) || dintReferencia(el.dnMenor);
                const Dg = Math.max(D1, D2), Dp = Math.min(D1, D2), th = thetaReduccion(el), r = kReduccion(el, Dg, Dp);
                F.push(['Ángulo de la reducción', th.fuente === 'ASME B16.9' ? 'θ = 2·atan[(De₁ − De₂)/(2·H)]  (ASME B16.9)' : 'θ (dato del usuario)', th.H ? `H = ${nf(th.H, 0)} mm` : '', `${nf(th.theta, 1)}°`]);
                F.push(['Relación de diámetros', 'β = D₂ / D₁', `${nf(Dp, 2)} / ${nf(Dg, 2)}`, nf(r.beta, 4)]);
                const s2 = `sin(${nf(th.theta / 2, 2)}°)`;
                if (a.sentidoRed === 'expansión') F.push(['Coeficiente (expansión, Crane)', th.theta <= 45 ? 'K = 2,6·sin(θ/2)·(1 − β²)²' : 'K = (1 − β²)²', th.theta <= 45 ? `2,6 × ${s2} × (1 − ${nf(r.beta, 4)}²)²` : `(1 − ${nf(r.beta, 4)}²)²`, nf(a.K, 4)]);
                else F.push(['Coeficiente (contracción, Crane)', th.theta <= 45 ? 'K = 0,8·sin(θ/2)·(1 − β²)' : 'K = 0,5·(1 − β²)·√sin(θ/2)', th.theta <= 45 ? `0,8 × ${s2} × (1 − ${nf(r.beta, 4)}²)` : `0,5 × (1 − ${nf(r.beta, 4)}²) × √${s2}`, nf(a.K, 4)]);
                F.push(['Diámetro de referencia', 'K referido al diámetro menor', '', `${nf(Dp, 2)} mm`]);
                filasVelocidad(a, F);
                F.push(['Pérdida de carga', 'hf = K·V²/(2g)', `${nf(a.K, 4)} × ${nf(a.V, 3)}² / (2 × 9,81)`, `${nf(hfDeArista(a), 4)} m`]);
                filaVmax(a, F);
                return { filas: F, k: `K = ${nf(a.K, 3)} (${a.sentidoRed || 'contracción'})` };
            }
            if (esNodo(el)) {
                const kt = kTee(el), dn = dnNum(el.dn), fv = fT(dn, dintReferencia(el.dn));
                if (el.modoK === 'manual') F.push(['Coeficientes (usuario)', 'K paso directo, K derivación', '', `${nf(kt.run, 3)} / ${nf(kt.der, 3)}`]);
                else {
                    F.push(['Factor de fricción de referencia', 'fT (Crane TP-410)', `DN ${dn}`, nf(fv, 4)]);
                    const tc = (ultimoResultado[el.id] || {}).teeCrane;
                    if (tc && tc.Kbranch != null) {
                        F.push(['Flujo', tc.conv ? 'convergente' : 'divergente', `Qderivación/Qcombinado = ${nf(tc.x, 3)}; β² = ${nf(tc.b2, 3)}`, `ramal combinado ${tc.comb}`]);
                        F.push(['K derivación (ref. ramal combinado)', tc.conv ? 'K = C·[1 + D·(x/β²)² − E·(1 − x)² − F·x²/β²]' : 'K = G·[1 + H·(x/β²)² − J·(x/β²)·cos α]', 'Crane TP-410M (2009) ec. ' + (tc.conv ? '2-35' : '2-37'), nf(tc.Kbranch, 4)]);
                        F.push(['K paso directo (ref. ramal combinado)', tc.conv ? 'K = 1,55·x − x²' : 'K = M·x²', 'Crane TP-410M (2009) ec. ' + (tc.conv ? '2-36' : '2-38'), nf(tc.Krun, 4)]);
                    } else {
                        F.push(['K paso directo', el.subtype === 'injerto' ? 'K = 0 (continuidad de la tubería)' : 'K = 20·fT', el.subtype === 'injerto' ? '' : `20 × ${nf(fv, 4)}`, nf(kt.run, 4)]);
                        F.push(['K derivación', 'K = 60·fT', `60 × ${nf(fv, 4)}`, nf(kt.der, 4)]);
                    }
                }
                F.push(['Reparto por ramas', 'ramas de paso: K/2 · derivación: K_der − K_run/2', '', `${nf(kt.run / 2, 4)} / ${nf(Math.max(kt.der - kt.run / 2, 0), 4)}`]);
                ars.forEach(a => {
                    const Q = Math.abs(a.Qprev);
                    F.push([`Rama ${a.rama}`, 'V = Q/A;  hf = K·V²/(2g)', `Q = ${nf(Q * 3600, 3)} m³/h; D = ${nf(a.D * 1000, 2)} mm; K = ${nf(a.K, 4)}`, `V = ${nf(a.V, 3)} m/s; hf = ${nf(hfDeArista(a), 4)} m`]);
                    filaVmax(a, F);
                });
                return { filas: F, k: `K ${nf(kt.run, 3)} / ${nf(kt.der, 3)}` };
            }
            const a = ars[0], dk = detalleK(el, a);
            F.push(['Diámetro de cálculo', 'Dint de la tubería conectada', '', `${nf(a.D * 1000, 2)} mm`]);
            F.push(...dk.filas);
            filasVelocidad(a, F);
            F.push(['Pérdida de carga', 'hf = K·V²/(2g)', `${nf(a.K, 4)} × ${nf(a.V, 3)}² / (2 × 9,81)`, `${nf(hfDeArista(a), 4)} m`]);
            filaVmax(a, F);
            const rc = (ultimoResultado[el.id] || {}).control;
            if (rc) {
                F.push(['Coeficiente de cavitación', 'σ = (p1 − pv)/(p1 − p2)', `(${nf(rc.p1 / 1e5, 3)} − ${nf(fl.pv / 1e5, 4)}) / (${nf(rc.p1 / 1e5, 3)} − ${nf(rc.p2 / 1e5, 3)}) bar abs`, `${nf(rc.sigma, 2)} ${rc.sigma < 2 ? '(riesgo)' : ''}`]);
                F.push(['Δp de estrangulamiento (IEC 60534)', 'Δp máx = FL²·(p1 − FF·pv)', `${nf(rc.FL, 2)}² × (${nf(rc.p1 / 1e5, 3)} − FF·${nf(fl.pv / 1e5, 4)})`, `${nf(rc.dpMax / 1e5, 3)} bar → Δp ${nf(rc.dp / 1e5, 3)} bar ${rc.dp < rc.dpMax ? 'CUMPLE' : 'NO CUMPLE'}`]);
                if (rc.kvNec) F.push(['Kv necesario / Kvs recomendado', 'Kv = Q·√[(ρ/1000)/Δp]; Kvs para trabajar al 70 %', `Q ${nf(Math.abs(a.Qprev) * 3600, 2)} m³/h; Δp ${nf(rc.dp / 1e5, 3)} bar`, `${nf(rc.kvNec, 2)} / ${nf(rc.kvsRec, 1)} m³/h`]);
            }
            if (el.type === 'valvula' && el.subtype === 'retencion') {
                const tipo = el.modoK === 'crane' ? el.craneTipo : 'Clapeta oscilante (swing)', C = CAT.vmin[tipo];
                if (C && a.V <= 1e-3) F.push(['Apertura total de la retención', 'Sin caudal en este escenario', 'Válvula cerrada (bomba parada)', '—']);
                else if (C) { const vmin = C * Math.sqrt(1 / fl.rho); F.push(['Apertura total de la retención', 'Vmin = C·√(1/ρ)  (Crane)', `${C} × √(1/${nf(fl.rho, 1)})`, `${nf(vmin, 3)} m/s → ${a.V >= vmin ? 'CUMPLE' : 'NO CUMPLE'}`]); }
            }
            return { filas: F, k: dk.k };
        }
async function construirInforme(D, opc = {}) {
            // dimensionado de las bombas (recalcula la red al terminar, con los mismos datos)
            let dimB = null;
            try { const x = calcularDimBomba(ultimoDimBomba && ultimoDimBomba.eta); if (!x.error) dimB = x; } catch (e) { console.error(e); }
            let escRes = null;
            try { escRes = escenarioReserva(); } catch (e) { console.error(e); }
            const res = ultimoCalculo.resultado, fl = res.fluido, p = proyecto, b = p.buque;
            const ANCHO = 9638; // ancho útil A4 con márgenes de 2 cm (twips)
            const AZUL = '1F4E79';
            const toc = [], listaTablas = [], listaFiguras = [];
            const cont = { Tabla: 0, Figura: 0 };
            const cuerpo = [];
            const T = (text, o = {}) => new D.TextRun(Object.assign({ text: tradDoc(text) }, o));
            const par = (text, o = {}) => new D.Paragraph(Object.assign({ children: [T(text, o.run || {})], spacing: { after: 100 } }, o.par || {}));
            const titulo = (nivel, text) => { text = tradDoc(text); toc.push({ title: text, level: nivel }); cuerpo.push(new D.Paragraph({ heading: D.HeadingLevel['HEADING_' + nivel], children: [T(text)], keepNext: true })); };
            const leyenda = (tipo, text) => {
                const n = ++cont[tipo], tt = tradDoc(tipo); text = tradDoc(text);
                (tipo === 'Tabla' ? listaTablas : listaFiguras).push({ title: `${tt} ${n}. ${text}`, level: 1 });
                return new D.Paragraph({ style: 'Caption', keepNext: tipo === 'Tabla', alignment: tipo === 'Figura' ? D.AlignmentType.CENTER : D.AlignmentType.LEFT,
                    children: [T(tt + ' '), new D.SimpleField(`SEQ ${tipo} \\* ARABIC`, String(n)), T('. ' + text)] });
            };
            const celda = (txt, o = {}) => new D.TableCell({
                columnSpan: o.span, width: o.w ? { size: o.w, type: D.WidthType.DXA } : undefined,
                shading: o.fondo ? { type: D.ShadingType.CLEAR, color: 'auto', fill: o.fondo } : undefined,
                margins: { top: 30, bottom: 30, left: 70, right: 70 }, verticalAlign: D.VerticalAlign.CENTER,
                children: String(txt == null ? '' : txt).split('\n').map(l => new D.Paragraph({ alignment: o.alin || D.AlignmentType.LEFT, indent: o.sangria ? { left: o.sangria } : undefined,
                    children: [T(l, { bold: !!o.negrita, size: o.tam || 16, color: o.color })] }))
            });
            // tabla(cabecera, filas, anchos relativos, { grupo: índice de filas que son cabecera de grupo })
            const tabla = (cab, filas, rel, o = {}) => { cab = cab.map(c => typeof c === 'string' ? tradDoc(c) : c);
                const tot = rel.reduce((s, x) => s + x, 0), w = rel.map(x => Math.round(ANCHO * x / tot));
                const rows = [new D.TableRow({ tableHeader: true, children: cab.map((c, i) => celda(c, { w: w[i], negrita: true, fondo: AZUL, color: 'FFFFFF' })) })];
                filas.forEach(f => {
                    if (f.grupo) rows.push(new D.TableRow({ cantSplit: true, children: [celda(f.grupo, { span: cab.length, negrita: true, fondo: 'DCE6F1' })] }));
                    else rows.push(new D.TableRow({ cantSplit: true, children: f.map((c, i) => {
                        const v = typeof c === 'object' && c !== null ? c : { t: c };
                        const estado = v.t === 'CUMPLE' || v.t === 'OK' || v.t === 'OK · crítica';
                        return celda(v.t, { w: w[i], sangria: v.sangria, negrita: v.negrita || estado, color: estado ? (v.t === 'OK · crítica' ? '7030A0' : '00863D') : (/NO CUMPLE/.test(v.t) ? 'C00000' : undefined), alin: o.alin && o.alin[i] });
                    }) }));
                });
                return new D.Table({ width: { size: ANCHO, type: D.WidthType.DXA }, columnWidths: w, rows });
            };
            const clave = (pares) => tabla(['Concepto', 'Valor'], pares.filter(x => x[1] !== '' && x[1] != null).map(([a, v]) => [{ t: a, negrita: true }, v]), [35, 65]);
            const espacio = () => new D.Paragraph({ children: [], spacing: { after: 120 } });
            const figura = async (op, text) => {
                const f = await figuraPNG(op);
                cuerpo.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, keepNext: true, children: [new D.ImageRun({ type: 'png', data: f.data, transformation: { width: f.width, height: f.height }, altText: { title: text, description: text, name: text } })] }));
                cuerpo.push(leyenda('Figura', text));
            };
            const lim = res.limites, emplaz = [p.direccion, p.ciudad, p.provincia, p.pais].filter(Boolean).join(', ');
            const ars = res.aristas, de = id => ars.filter(a => a.el.id === id);
            const orden = lineasEnOrden();
            const numLinea = {}; orden.forEach((o, i) => { numLinea[o.linea.id] = i + 1; });
            const nombreLinea = l => `${l.id}${l.nombre ? ' · ' + l.nombre : ''}`;

            // ===== 1 DATOS DEL PROYECTO =====
            titulo(1, '1. Datos del proyecto');
            titulo(2, '1.1. Datos generales');
            cuerpo.push(leyenda('Tabla', 'Datos generales del proyecto'));
            cuerpo.push(clave([['Nº de proyecto', p.numero], ['Revisión', p.revision], ['Fecha', p.fecha], ['Autor / calculista', p.autor], ['Cliente', p.cliente], ['Referencia del cliente', p.refCliente],
                ['Instalación', p.instalacion], ['Tipo de instalación', TIPOS_INSTALACION[p.tipoInstalacion]], ['Emplazamiento', emplaz], ['Provincia', p.provincia], ['Ciudad', p.ciudad]]));
            if (p.descripcion) { cuerpo.push(espacio()); cuerpo.push(par(p.descripcion)); }
            if (p.esBuque) {
                titulo(2, '1.2. Datos del buque');
                titulo(3, '1.2.1. Astillero, armador e identificación');
                cuerpo.push(leyenda('Tabla', 'Identificación del buque'));
                cuerpo.push(clave([['Astillero', b.astillero], ['Nº de construcción', b.construccion], ['Nombre del buque', b.nombre], ['Armador', b.armador], ['Tipo de buque', b.tipo], ['Nº IMO', b.imo], ['Bandera', b.bandera], ['Sociedad de clasificación', b.clasificacion]]));
                titulo(3, '1.2.2. Características principales');
                cuerpo.push(leyenda('Tabla', 'Características principales del buque'));
                const m = v => v === '' ? '' : `${nf(+v, 2)} m`;
                cuerpo.push(clave([['Eslora total', m(b.esloraTotal)], ['Eslora entre perpendiculares', m(b.esloraPP)], ['Manga de trazado', m(b.manga)], ['Puntal de trazado', m(b.puntal)], ['Calado de trazado', m(b.calado)], ['Peso muerto', b.peMuerto === '' ? '' : `${nf(+b.peMuerto, 0)} t`]]));
            }

            // ===== 2 BASES DE DISEÑO =====
            titulo(1, '2. Bases de diseño');
            titulo(2, '2.1. Fluido');
            cuerpo.push(leyenda('Tabla', `Propiedades del fluido (${fl.nombre} a ${fl.T} °C)`));
            cuerpo.push(clave([['Fluido', fl.nombre], ['Temperatura de cálculo', `${fl.T} °C`], ['Densidad ρ', `${nf(fl.rho, 1)} kg/m³`], ['Viscosidad cinemática ν', `${nf(fl.nu * 1e6, 3)} mm²/s`],
                ['Viscosidad dinámica μ', `${nsci(fl.mu)} Pa·s`], ['Presión de vapor pv', `${nf(fl.pv / 1000, 3)} kPa`], ['Rango de datos del catálogo', `${fl.Tmin} a ${fl.Tmax} °C (sin extrapolación)`], ['Observaciones', fl.nota || '']]));
            titulo(2, '2.2. Caudal de diseño');
            cuerpo.push(par(`El caudal de diseño de la instalación es Q = ${nf(+p.caudalDiseno, 2)} m³/h. ${res.origenQ === 'proyecto' && res.sinBomba ? `La red no tiene bombas ni depósitos: la línea parte de ${res.sinBomba.origen} con la presión de diseño (${nf(res.sinBomba.presion, 2)} bar) y el caudal de diseño del proyecto, que sale por ${res.sinBomba.salidas.map(x => `${x.tag} (${nf(x.Q, 2)} m³/h a ${nf(x.p, 2)} bar)`).join(', ')}.` : res.origenQ === 'bombas' || !res.origenQ ? 'El punto de funcionamiento de las bombas, obtenido del cálculo de la red, debe ser igual o superior a este caudal.' : `La red no tiene bombas (alimentación por gravedad o desde depósito presurizado): el caudal que ${res.origenQ === 'fuentes' ? 'aportan a la red ' + (res.fuentesQ || []).join(', ') : 'suman los puntos de consumo'}, obtenido del cálculo, debe ser igual o superior a este caudal.`}`));
            cuerpo.push(leyenda('Tabla', 'Comprobación del caudal de diseño'));
            cuerpo.push(tabla(['Concepto', 'Valor', 'Estado'], [['Caudal de diseño', `${nf(res.Qdiseno, 2)} m³/h`, ''], [res.origenQ === 'fuentes' ? 'Caudal aportado por la alimentación (sin bombas)' : res.origenQ === 'consumos' ? 'Caudal de los consumos (sin bombas)' : res.origenQ === 'proyecto' ? 'Caudal impuesto en el origen de P01 (sin bombas)' : 'Caudal de funcionamiento (suma de bombas)', `${nf(res.Qbombas, 2)} m³/h`, res.Qbombas >= res.Qdiseno * 0.999 ? 'CUMPLE' : 'NO CUMPLE']], [50, 30, 20]));
            titulo(2, '2.3. Velocidades de diseño');
            cuerpo.push(par(`Velocidades máximas orientativas para instalación de tipo «${TIPOS_INSTALACION[p.tipoInstalacion]}», según el fluido. En aspiración se limita la velocidad para asegurar el NPSH disponible; en impulsión, para acotar pérdidas, ruido y erosión.`));
            cuerpo.push(leyenda('Tabla', 'Velocidades máximas recomendadas por fluido'));
            cuerpo.push(tabla(['Fluido', 'V máx. aspiración (m/s)', 'V máx. impulsión (m/s)'], Object.keys(CAT.fluidos).map(f => {
                const r = velocidadRecomendada(f, p.tipoInstalacion), es = f === fl.nombre;
                return [{ t: f + (es ? '  ◄ fluido del proyecto' : ''), negrita: es }, { t: nf(r[0], 1), negrita: es }, { t: nf(r[1], 1), negrita: es }];
            }), [50, 25, 25], { alin: [null, D.AlignmentType.CENTER, D.AlignmentType.CENTER] }));
            cuerpo.push(espacio());
            cuerpo.push(leyenda('Tabla', 'Velocidades máximas adoptadas en el cálculo'));
            cuerpo.push(tabla(['Tramo', 'V máx. adoptada (m/s)', 'Criterio'], [['Aspiración (aguas arriba de las bombas)', nf(lim.asp, 2), +p.vAsp > 0 ? 'Dato del proyecto' : 'Valor recomendado'], ['Impulsión y resto de la red', nf(lim.imp, 2), +p.vImp > 0 ? 'Dato del proyecto' : 'Valor recomendado']], [50, 20, 30]));
            titulo(2, '2.4. Criterios de comprobación');
            cuerpo.push(leyenda('Tabla', 'Criterios de aceptación'));
            cuerpo.push(tabla(['Elemento', 'Criterio'], [['Tuberías, válvulas y accesorios', `V ≤ ${nf(lim.asp, 2)} m/s en aspiración y V ≤ ${nf(lim.imp, 2)} m/s en impulsión`], ['Válvulas de retención', 'V ≥ velocidad mínima de apertura total, Vmin = C·√(1/ρ) (Crane TP-410)'],
                ['Bombas: cavitación', `NPSHd − NPSHr ≥ ${nf(opciones.margenNPSH, 2)} m`], ['Bombas: caudal', `Σ Q bombas ≥ ${nf(res.Qdiseno, 2)} m³/h (caudal de diseño)`],
                ['Tuberías: presión', 'p máx de servicio ≤ PMA (ASME B31.3 en acero; PN × factor de temperatura en PVC-U y PE)'], ['Toda la red: vaporización', 'p absoluta ≥ pv del fluido en todos los nodos'],
                ['Puntos de consumo', 'p ≥ p mínima requerida; el exceso se absorbe con válvula de equilibrado'],
                ['Clasificación PED de líneas', 'Art. 4.1.c y anexo II (cuadros 6 a 9) de la Directiva 2014/68/UE; presión de prueba ≤ 1,5·PMA en tuberías y ≤ prueba de cuerpo 1,5·PN en componentes (aviso)'],
                ['Golpe de ariete (aviso)', `p máx + Δp ariete ≤ PMA; tiempo de cierre ${+p.tCierre > 0 ? nf(+p.tCierre, 1) + ' s' : 'instantáneo'}`], ['Presión a caudal nulo (aviso)', 'p con la bomba contra válvula cerrada ≤ PMA']], [35, 65]));
            titulo(2, '2.5. Método de cálculo y referencias');
            cuerpo.push(leyenda('Tabla', 'Formulación empleada'));
            cuerpo.push(tabla(['Magnitud', 'Expresión', 'Referencia'], [
                ['Pérdida por fricción', 'hf = f·(L/D)·V²/(2g)', 'Darcy-Weisbach'],
                ['Factor de fricción turbulento', '1/√f = −2·log₁₀[ε/(3,7·D) + 2,51/(Re·√f)]', 'Colebrook-White (Newton, semilla Swamee-Jain)'],
                ['Factor de fricción laminar (Re < 2300)', 'f = 64/Re', 'Hagen-Poiseuille'],
                ['Pérdida en válvulas y accesorios', 'hf = K·V²/(2g);  K = n·fT (fT de la tabla A-27); K referida al schedule de la clase: K = K_ref·(d/d_ref)⁴', 'Crane TP-410M (2009)'],
                ['Entrada y salida de depósitos', 'K entrada 0,5 (a ras) / 0,78 (saliente) / 0,04 (redondeada); K salida 1,0', 'Crane TP-410M (2009), pág. A-30'],
                ['K a partir del Cv', 'K = 891·d⁴/Cv²  (d en pulgadas);  Cv = 1,156·Kv', 'Crane TP-410 / catálogos de fabricante'],
                ['Reducciones', 'Fórmulas 1 a 4 de Crane con θ de ASME B16.9', 'Crane TP-410, ASME B16.9'],
                ['Tes e injertos', 'K de paso y de derivación según el sentido y el reparto del caudal (convergente / divergente) y la relación de diámetros', 'Crane TP-410M (2009), ec. 2-35 a 2-38'],
                ['Cruces', 'Nodo central: ramas de paso K_run/2, derivación K_der − K_run/2', 'Crane TP-410 (20·fT / 60·fT)'],
                ['Verificación del método', `Ejemplos resueltos de Crane TP-410M (2009), capítulo 7: ${(() => { const v = verificarCrane(); return `${v.filter(x => x.ok).length} de ${v.length} dentro de tolerancia`; })()}`, 'Herramientas > Verificación del método'],
                ['Curva de bomba', 'H = H₀ − k·Q²', 'Parábola por el punto de diseño y la altura a caudal nulo'],
                ['NPSH disponible', 'NPSHd = Hs − z − pv/(ρg) + v²/(2g)', 'Hs: altura piezométrica absoluta en la aspiración'],
                ['Resolución de la red', 'Teoría lineal (Wood y Charles), convergencia 10⁻⁴ en caudales', 'Balance de masa en nodos y de energía en elementos'],
                ['Dimensiones de tubería', 'Dint = De − 2·e', 'ASME B36.10M/B36.19M, EN ISO 1452-2, EN 12201-2, ISO 4065'],
                ['Presión en un nodo', 'p = (H − z)·ρ·g − p_atm', 'H: altura piezométrica absoluta; z: cota'],
                ['PMA acero', 'P = 2·S·E·W·t/(D − 2·Y·t);  t = 0,875·e − c', 'ASME B31.3 ec. (3a); A106 Gr. B / A312 TP316L'],
                ['PMA termoplásticos', 'PMA = PN·fT', 'EN ISO 1452-2 anexo A (PVC-U), EN 12201-1 anexo A (PE)'],
                ['Equipos', 'Δp = Δp nom·(Q/Q nom)²', 'Dato del fabricante'],
                ['Válvulas de equilibrado', 'Kv = Q·√[(ρ/1000)/Δp];  Cv = 1,156·Kv', 'IEC 60534 / EN 60534'],
                ['Celeridad de la onda', 'a = √[(Kf/ρ)/(1 + Kf·D/(E·e))]', 'Korteweg'],
                ['Golpe de ariete', 'tc ≤ 2L/a: Δp = ρ·a·V;  tc > 2L/a: Δp = 2·ρ·L·V/tc', 'Joukowsky / Michaud'],
                ['Categoría PED de tuberías', 'Estado (gas si pv(TS) > 0,5 bar man.), grupo (art. 13), PS y DN → cuadros 6 a 9', 'Directiva 2014/68/UE, anexo II'],
                ['Presión de prueba', (CRITERIOS_PRUEBA[p.criterioPrueba] || CRITERIOS_PRUEBA.PED).texto, (CRITERIOS_PRUEBA[p.criterioPrueba] || CRITERIOS_PRUEBA.PED).nombre]], [28, 42, 30]));

            // ===== 3 DESCRIPCIÓN DE LA RED Y RESUMEN =====
            titulo(1, '3. Descripción de la red y resumen de resultados');
            titulo(2, '3.1. Estructura de la red');
            cuerpo.push(par('La red se describe como un árbol: la línea principal y, colgando de ella, los ramales en el orden en que salen. El cálculo justificativo del apartado 4 sigue este mismo orden.'));
            cuerpo.push(leyenda('Tabla', 'Estructura de líneas de la red'));
            cuerpo.push(tabla(['Apdo.', 'Línea', 'Tipo', 'Sale de', 'Nº elementos'], orden.map(o => {
                const l = o.linea, desde = l.desde && elementosRed.find(e => e.id === l.desde);
                return [`4.${numLinea[l.id]}`, { t: nombreLinea(l), sangria: o.nivel * 340, negrita: o.nivel === 0 }, l.tipo === 'principal' ? 'Principal' : (o.nivel > 1 ? 'Subramal' : 'Ramal'), desde ? tagDe(desde) : (l.padre || '—'), String(o.orden.length)];
            }), [10, 38, 14, 26, 12]));
            titulo(2, '3.2. Esquema general');
            await figura({ principales: elementosRed.slice(), contexto: [], rotulosLinea: true }, 'Esquema general de la red (verde: cumple · violeta: ruta crítica)');
            titulo(2, '3.3. Bombas');
            if (!ars.some(a => a.esBomba)) cuerpo.push(par(`La red no tiene bombas: la alimentación es por gravedad o desde un depósito presurizado${(res.fuentesQ || []).length ? ' (' + res.fuentesQ.join(', ') + ')' : ''}. El caudal de funcionamiento resultante es ${nf(res.Qbombas, 2)} m³/h.`));
            else cuerpo.push(leyenda('Tabla', 'Punto de funcionamiento de las bombas'));
            if (ars.some(a => a.esBomba))
            cuerpo.push(tabla(['Bomba', 'Q (m³/h)', 'H (m)', 'Ph (kW)', 'NPSHd (m)', 'NPSHr (m)', 'Estado'], ars.filter(a => a.esBomba).map(a => {
                const r = ultimoResultado[a.el.id];
                return [tagDe(a.el), nf(r.Q, 2), nf(r.H, 2), nf(r.potencia, 3), nf(r.npshd, 2), nf(a.el.npsh, 2), a.el.esLineaCritica ? 'OK · crítica' : 'OK'];
            }), [24, 12, 12, 12, 13, 13, 14]));
            { const en = ars.filter(a => a.esBomba).map(a => ({ tag: tagDe(a.el), e: ultimoResultado[a.el.id].energia })).filter(x => x.e);
              if (en.length) {
                  cuerpo.push(espacio());
                  cuerpo.push(leyenda('Tabla', 'Consumo y coste energético del bombeo'));
                  cuerpo.push(tabla(['Bomba', 'η bomba', 'η motor', 'P eléctrica (kW)', 'Horas/año', 'Energía (kWh/año)', 'Coste (€/año)'], en.map(x => [x.tag, nf(x.e.etaB, 2), nf(x.e.etaM, 2), nf(x.e.Pe, 3), nf(x.e.horas, 0), nf(x.e.kWh, 0), nf(x.e.eur, 0)]).concat(en.length > 1 ? [[{ t: 'Total', negrita: true }, '', '', nf(en.reduce((s_, x) => s_ + x.e.Pe, 0), 3), '', nf(en.reduce((s_, x) => s_ + x.e.kWh, 0), 0), nf(en.reduce((s_, x) => s_ + x.e.eur, 0), 0)]] : []), [20, 10, 10, 15, 12, 17, 16]));
                  cuerpo.push(par(`P eléctrica = ρ·g·Q·H/(η bomba·η motor); precio ${nf(en[0].e.precio, 3)} €/kWh.`, { run: { italics: true, size: 16 } }));
              } }
            if (dimB) {
                titulo(3, '3.3.1. Dimensionado de la bomba');
                cuerpo.push(par(`Para cada circuito se busca la altura mínima que da el caudal necesario y la presión mínima de todos los consumos (bisección sobre la red completa). La curva de la instalación se obtiene repitiendo el cálculo a caudales parciales. El punto de selección añade un 10 % de margen en altura; la potencia al eje se calcula con un rendimiento η = ${nf(dimB.eta, 2)} y el motor se elige normalizado IEC con un 15 % de reserva.`));
                for (const [i, d] of dimB.circuitos.entries()) {
                    cuerpo.push(leyenda('Tabla', `Dimensionado de ${d.tags.join(', ')}${d.nB > 1 ? ' (iguales, en paralelo)' : ''}`));
                    cuerpo.push(clave([['Caudal necesario', `${nf(d.Qreq, 2)} m³/h (${d.origenQ})`], ['Caudal por bomba', `${nf(d.Qb, 2)} m³/h`], ['Altura necesaria', `${nf(d.Hreq, 2)} m c.l.`],
                        ['Punto de selección (+10 % H)', `${nf(d.Qb, 2)} m³/h · ${nf(d.H, 2)} m = ${nf(d.Hbar, 3)} bar`], ['NPSH disponible / NPSHr máximo admisible', `${nf(d.npsh, 2)} m / ${nf(d.npsh - opciones.margenNPSH, 2)} m`],
                        ['Potencia hidráulica Ph = ρ·g·Q·H', `${nf(d.Ph, 3)} kW`], [`Potencia al eje Ph/η (η = ${nf(dimB.eta, 2)})`, `${nf(d.Peje, 3)} kW`], ['Motor normalizado IEC (+15 %)', `${d.Pmotor} kW`]]));
                    cuerpo.push(espacio());
                    cuerpo.push(leyenda('Tabla', `Curva de la instalación del circuito de ${d.tags.join(', ')}`));
                    cuerpo.push(tabla(['Q total (m³/h)', 'H necesaria (m c.l.)'], d.curva.map(q => [nf(q.Q, 2), nf(q.H, 2)]), [50, 50]));
                    const b0 = elementosRed.find(e => e.id === d.bombas[0]);
                    const svg = graficoBombaSVG(d, b0, dimB.rho).replace('width="100%"', 'xmlns="http://www.w3.org/2000/svg" width="1240" height="560"').replace(/style="max-width:[^"]*"/, 'style="font-family:Arial,sans-serif;background:#fff"');
                    const img = await svgAPNG(svg, 1240, 560);
                    cuerpo.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, keepNext: true, children: [new D.ImageRun({ type: 'png', data: img, transformation: { width: 600, height: 271 } })] }));
                    cuerpo.push(leyenda('Figura', `Curva de la instalación y punto de selección de ${d.tags.join(', ')}`));
                }
            }
            if (escRes && escRes.bombas) {
                titulo(3, `3.3.${dimB ? 2 : 1}. Funcionamiento con la bomba de reserva`);
                const pares = elementosRed.filter(e => e.type === 'bomba' && e.reservaDe).map(e => [tagDe(e), tagDe(elementosRed.find(x => x.id === e.reservaDe))]);
                cuerpo.push(par(`Bombas de reserva (1+1): ${pares.map(([r, s_]) => `${r} respalda a ${s_}`).join('; ')}. Se recalcula la red con cada reserva en marcha y su bomba de servicio parada (tratada como válvula cerrada); todos los elementos cumplen también en este escenario.`));
                cuerpo.push(leyenda('Tabla', 'Punto de funcionamiento en el escenario de reserva'));
                cuerpo.push(tabla(['Bomba en marcha', 'Sustituye a', 'Q (m³/h)', 'H (m)', 'NPSHd (m)', 'NPSHr (m)', 'Estado'], escRes.bombas.map(x => [x.tag, x.sustituye || '—', nf(x.Q, 2), nf(x.H, 2), nf(x.npshd, 2), nf(x.npshr, 2), x.estado === 'fallo' ? 'NO CUMPLE' : 'OK']), [20, 20, 12, 12, 12, 12, 12]));
                if (escRes.lc != null) cuerpo.push(par(`Pérdida de carga de la ruta crítica en este escenario: ${nf(escRes.lc, 3)} m.`));
            }
            titulo(2, '3.4. Ruta crítica');
            const lc = res.lineaCritica;
            if (lc) {
                const nombres = lc.aristasCamino.map(a => tagDe(a.el)).filter((n, i, arr) => i === 0 || n !== arr[i - 1]);
                cuerpo.push(par(`La ruta crítica es el camino desde ${ars.some(a => a.esBomba) ? 'la descarga de la bomba' : 'el depósito de alimentación'} hasta un extremo abierto con mayor pérdida de carga acumulada: ${nf(lc.hfTotal, 3)} m. Recorrido: ${nombres.join(' → ')}. Su balance detallado figura en el apartado 7.`));
            } else cuerpo.push(par('No se ha identificado ruta crítica (la red no tiene extremos aguas abajo de una bomba o de un depósito de alimentación).'));
            const termV = (res.terminales || { elementos: [] }).elementos;
            const consumos = termV.filter(e => esConsumoT(e)), depositos = termV.filter(e => esDeposito(e));
            if (consumos.length) {
                titulo(2, '3.5. Puntos de consumo y válvulas de equilibrado');
                cuerpo.push(par(`Cada punto de consumo recibe su caudal con una presión igual o superior a la mínima. El consumo más desfavorable${res.consumoCritico ? ` (${tagDe(res.consumoCritico.el)}, con ${nf(res.consumoCritico.margen, 2)} bar de margen)` : ''} no lleva válvula; en el resto, la diferencia de presión respecto a él se absorbe con una válvula de equilibrado cuyo Kv se indica.`));
                cuerpo.push(leyenda('Tabla', 'Puntos de consumo y equilibrado'));
                cuerpo.push(tabla(['Consumo', 'Q (m³/h)', 'Cota (m)', 'p (bar)', 'p mín (bar)', 'Δp a equilibrar (bar)', 'Kv (m³/h)', 'Estado'], consumos.map(e => {
                    const r = ultimoResultado[e.id];
                    return [tagDe(e), nf(r.Q, 2), nf(r.z, 2), nf(r.p, 3), nf(r.pMin, 2), r.equilibrado ? nf(r.equilibrado.dp, 3) : '—', r.equilibrado ? nf(r.equilibrado.Kv, 2) : (r.critico ? 'más desfavorable' : '—'), e.esLineaCritica ? 'OK · crítica' : 'OK'];
                }), [20, 10, 10, 10, 11, 14, 13, 12]));
            }
            if (depositos.length) {
                titulo(2, `3.${consumos.length ? 6 : 5}. Depósitos`);
                cuerpo.push(leyenda('Tabla', 'Depósitos de la red'));
                cuerpo.push(tabla(['Depósito', 'Cota conexión (m)', 'Cota lámina (m)', 'p sobre lámina (bar)', 'Q (m³/h)', 'Sentido'], depositos.map(e => { const r = ultimoResultado[e.id]; return [tagDe(e), nf(e.cota, 2), nf(e.cotaLamina, 2), nf(e.presionDep, 2), nf(r.Q, 2), r.sentido]; }), [20, 15, 15, 17, 13, 20]));
            }
            titulo(2, `3.${5 + (consumos.length ? 1 : 0) + (depositos.length ? 1 : 0)}. Resumen de comprobaciones`);
            const nEl = elementosRed.filter(e => !sinFlujo(e)).length;
            cuerpo.push(par(`Se han comprobado ${nEl} elementos hidráulicos (${elementosRed.length - nEl} instrumentos o elementos sin caudal). Todos cumplen los criterios del apartado 2.4.`));
            const avisos = [];
            ars.forEach(a => (a.avisos || []).forEach(t => avisos.push(t)));
            ars.filter(a => !a.esBomba && a.Re > 2300 && a.Re < 4000).forEach(a => avisos.push(`${tagDe(a.el)}: Re = ${Math.round(a.Re)} en zona de transición; el factor de fricción es incierto.`));
            (res.avisosRed || []).forEach(t => avisos.push(t));
            if (avisos.length) {
                cuerpo.push(par('Se registran las siguientes observaciones, que no impiden el cumplimiento de los criterios pero deben revisarse:'));
                cuerpo.push(leyenda('Tabla', 'Observaciones y avisos del cálculo'));
                cuerpo.push(tabla(['Nº', 'Observación'], [...new Set(avisos)].map((t, i) => [String(i + 1), t]), [6, 94]));
            }

            // ===== 4 CÁLCULO JUSTIFICATIVO POR LÍNEAS =====
            titulo(1, '4. Cálculo justificativo por líneas');
            cuerpo.push(par('Para cada línea se incluye el croquis de sus elementos (numerados; en gris los elementos contiguos de otras líneas), la relación de componentes con sus propiedades, los resultados y la justificación de cada elemento con las expresiones y los valores sustituidos.'));
            for (const o of orden) {
                const l = o.linea, nL = numLinea[l.id], els = o.orden.map(id => elementosRed.find(e => e.id === id));
                const desde = l.desde && elementosRed.find(e => e.id === l.desde);
                titulo(2, `4.${nL}. Línea ${nombreLinea(l)}`);
                cuerpo.push(par(l.tipo === 'principal' ? 'Línea principal de la red.' : `Ramal de la línea ${l.padre || '—'}${desde ? `, con salida en ${tagDe(desde)}` : ''}.`));
                const numeros = {}; els.forEach((e, i) => { numeros[e.id] = i + 1; });
                const enLinea = new Set(els.map(e => e.id)), vec = mapaVecinos();
                const contexto = [...new Set(els.flatMap(e => vec[e.id] || []))].filter(id => !enLinea.has(id)).map(id => elementosRed.find(e => e.id === id)).filter(Boolean);
                titulo(3, `4.${nL}.1. Croquis`);
                await figura({ principales: els, contexto, numeros }, `Croquis de la línea ${l.id}`);
                const just = {}; els.forEach(e => { just[e.id] = justificacion(e, de(e.id)); });
                titulo(3, `4.${nL}.2. Componentes`);
                cuerpo.push(leyenda('Tabla', `Componentes de la línea ${l.id}`));
                cuerpo.push(tabla(['Nº', 'Etiqueta', 'Tipo', 'Descripción', 'Dint (mm)', 'L (m)', 'K / Cv / f'], els.map(e => {
                    const a = de(e.id)[0];
                    let desc = '';
                    if (e.type === 'tuberia') { const dt = datosTuberia(e); desc = `${e.material} · ${etiquetaTuberia(e)} · De ${nf(dt.od, 1)} × e ${nf(dt.e, 2)} mm · ε ${nf(dt.rug, 3)} mm (${dt.norma})`; }
                    else if (e.type === 'bomba') desc = `Diseño ${nf(e.caudal, 1)} m³/h a ${nf(e.presion, 2)} bar · H₀ ${nf(e.h0, 2)} bar · NPSHr ${nf(e.npsh, 2)} m · cota ${nf(e.cota || 0, 2)} m`;
                    else if (sinFlujo(e)) desc = 'Sin caudal (no interviene en el cálculo)';
                    else if (esConsumoT(e)) desc = `Q ${nf(e.qCons, 2)} m³/h · p mín ${nf(e.pMin, 2)} bar · cota ${nf(e.cota, 2)} m`;
                    else if (esDeposito(e)) desc = `Lámina ${nf(e.cotaLamina, 2)} m · conexión ${nf(e.cota, 2)} m · ${nf(e.presionDep, 2)} bar man.`;
                    else if (e.type === 'equipo') desc = `Δp ${nf(e.dpNom, 1)} kPa a ${nf(e.qNom, 2)} m³/h (fabricante) · cota ${nf(e.cota, 2)} m`;
                    else desc = `${e.subtype === 'reduccion' ? `${etiquetaDN(e.dn)} × ${etiquetaDN(e.dnMenor)}` : (e.dn ? etiquetaDN(e.dn) : '')}${a && a.origenK ? ' · ' + a.origenK.replace(/ · rama \w+$/, '') : ''}`;
                    if (e.pn && (e.type === 'valvula' || e.type === 'accesorio' || e.type === 'equipo')) desc += ` · ${e.pn}`;
                    return [String(numeros[e.id]), tagDe(e), nombreTipo(e), desc, a && a.D ? nf(a.D * 1000, 2) : '—', e.type === 'tuberia' ? nf(a.L, 3) : '—', just[e.id].k];
                }), [5, 17, 14, 34, 9, 7, 14]));
                titulo(3, `4.${nL}.3. Resultados`);
                cuerpo.push(leyenda('Tabla', `Resultados de la línea ${l.id}`));
                const filasR = [];
                els.filter(esTerminal).forEach(e => { const r = ultimoResultado[e.id]; if (r) filasR.push([String(numeros[e.id]), tagDe(e), '—', nf(r.Q, 2), '—', '—', '—', '—', '—', nf(r.p, 2), e.esLineaCritica ? 'OK · crítica' : 'OK']); });
                els.forEach(e => de(e.id).forEach(a => {
                    const vl = a.lado === 'asp' ? lim.asp : lim.imp;
                    const est = e.esLineaCritica ? 'OK · crítica' : 'OK';
                    if (a.esBomba) { const r = ultimoResultado[e.id]; filasR.push([String(numeros[e.id]), tagDe(e), '—', nf(r.Q, 2), '—', '—', '—', '—', `H = ${nf(r.H, 2)}`, `${nf(a.pA, 2)}→${nf(a.pB, 2)}`, est]); return; }
                    filasR.push([String(numeros[e.id]), tagDe(e) + (a.rama ? ` (${a.rama})` : ''), a.lado === 'asp' ? 'Asp.' : 'Imp.', nf(Math.abs(a.Qprev) * 3600, 2), nf(a.V, 3), a.esEquipo ? '—' : nf(vl, 2), String(Math.round(a.Re)),
                        e.type === 'tuberia' ? `f ${nf(a.f, 4)}` : `K ${nf(a.K, 3)}`, nf(hfDeArista(a), 4), nf(Math.max(a.pA, a.pB), 2), est]);
                }));
                filasR.sort((x, y) => (+x[0]) - (+y[0]));
                cuerpo.push(tabla(['Nº', 'Elemento', 'Lado', 'Q (m³/h)', 'V (m/s)', 'Vmax (m/s)', 'Re', 'f / K', 'hf (m)', 'p máx (bar)', 'Estado'], filasR.length ? filasR : [['—', 'Sin elementos con caudal', '', '', '', '', '', '', '', '', '']], [5, 19, 6, 9, 8, 8, 9, 10, 8, 8, 10]));
                titulo(3, `4.${nL}.4. Justificación del cálculo`);
                cuerpo.push(leyenda('Tabla', `Justificación de cálculo de la línea ${l.id}`));
                const filasJ = [];
                els.forEach(e => { filasJ.push({ grupo: `${numeros[e.id]}. ${tagDe(e)} — ${nombreTipo(e)}` }); just[e.id].filas.forEach(f => filasJ.push(f)); });
                cuerpo.push(tabla(['Magnitud', 'Expresión', 'Sustitución', 'Resultado'], filasJ, [22, 28, 32, 18]));
            }
            const sueltos = elementosRed.filter(e => !e.linea || !lineaPorId(e.linea));
            if (sueltos.length) cuerpo.push(par(`Elementos sin línea asignada (incluidos en el esquema general): ${sueltos.map(tagDe).join(', ')}.`, { run: { italics: true } }));

            // ===== 5 BALANCE DE LA RUTA CRÍTICA =====
            // ===== 5 CLASIFICACIÓN PED Y PRUEBA DE PRESIÓN =====
            titulo(1, '5. Clasificación PED y prueba de presión');
            const ped = res.ped || [];
            if (ped.length) {
                const x0 = ped[0];
                cuerpo.push(par(`Las líneas se clasifican según el artículo 4.1.c y el anexo II (cuadros 6 a 9) de la Directiva 2014/68/UE de equipos a presión, con PS = mayor presión de diseño de sus tuberías (máximo entre servicio y bomba a caudal nulo), DN = mayor diámetro nominal de la línea y TS = ${nf(x0.TS, 0)} °C. ` +
                    `El fluido se trata como ${x0.gas ? 'gas (presión de vapor a TS superior a 0,5 bar sobre la atmosférica)' : 'líquido (presión de vapor a TS no superior a 0,5 bar sobre la atmosférica)'} del grupo ${x0.grupo} (${x0.motivoGrupo}). La presión de prueba se calcula como ${x0.criterio}.`));
                cuerpo.push(leyenda('Tabla', 'Clasificación PED y presión de prueba por línea'));
                cuerpo.push(tabla(['Línea', 'PS (bar)', 'DN', 'PS·DN (bar)', 'Cuadro', 'Categoría', 'Pt (bar)'], ped.map(x => [x.linea + (x.nombre ? ' · ' + x.nombre : ''), nf(x.PS, 2), String(x.DN), nf(x.PSDN, 0), x.cuadro, x.cat === 'Art. 4.3' ? 'Art. 4.3 (buenas prácticas)' : x.cat === 'Fuera' ? 'Fuera de ámbito (PS ≤ 0,5 bar)' : 'Categoría ' + x.cat, nf(x.Pt, 2)]), [22, 11, 8, 12, 20, 16, 11]));
                { const fm = filasModulosPED(ped); if (fm.length) { cuerpo.push(espacio()); cuerpo.push(leyenda('Tabla', 'Módulos de evaluación de la conformidad (anexo III)')); cuerpo.push(tabla(['Línea', 'Categoría', 'Módulo elegido', 'Módulos admisibles', 'Validación externa'], fm, [12, 12, 26, 32, 18])); } }
                if (x0.naval) {
                    titulo(2, '5.1. Clase de las tuberías según la sociedad de clasificación');
                    cuerpo.push(par(`Buque${p.buque.clasificacion ? ' clasificado por ' + p.buque.clasificacion : ''}. Medio: ${MEDIOS_NAVALES[x0.medio]}. Clase según presión y temperatura de diseño (criterio común de BV Pt C Ch 1 Sec 10, LR Pt 5 Ch 12 y DNV Pt 4 Ch 6)${x0.medio === 'toxico' ? `; ${p.salvaguardas ? 'con' : 'sin'} salvaguardas especiales` : ''}. El espesor mínimo y los ensayos no destructivos se toman de las reglas de la sociedad para la clase obtenida.`));
                    cuerpo.push(leyenda('Tabla', 'Clase de tuberías del buque'));
                    cuerpo.push(tabla(['Línea', 'p diseño (bar)', 'T diseño (°C)', 'Medio', 'Clase'], ped.map(x => [x.linea + (x.nombre ? ' · ' + x.nombre : ''), nf(x.PS, 2), nf(x.TS, 0), x.medio === 'toxico' ? 'Tóxico / inflamable' : x.medio === 'combustible' ? 'Combustible / aceite' : 'Otros medios', { t: 'Clase ' + x.clase, negrita: true }]), [30, 15, 15, 25, 15]));
                    cuerpo.push(leyenda('Tabla', 'Criterio de clases de tuberías de buques'));
                    cuerpo.push(tabla(['Medio', 'Clase I', 'Clase II', 'Clase III'], [
                        ['Tóxicos, corrosivos, inflamables (p.i. < 60 °C o calentados por encima)', 'Sin salvaguardas especiales', 'Con salvaguardas especiales', 'No aplicable'],
                        ['Combustible, aceite lubricante, hidráulico inflamable', 'p > 16 bar o T > 150 °C', 'Resto', 'p ≤ 7 bar y T ≤ 60 °C'],
                        ['Otros medios (agua, aire, gases, hidráulico no inflamable)', 'p > 40 bar o T > 300 °C', 'Resto', 'p ≤ 16 bar y T ≤ 200 °C']], [40, 20, 20, 20]));
                }
                const conAv = ped.filter(x => x.avisos.length);
                if (conAv.length) {
                    cuerpo.push(espacio());
                    cuerpo.push(leyenda('Tabla', 'Observaciones de la prueba de presión'));
                    cuerpo.push(tabla(['Línea', 'Observación'], conAv.flatMap(x => x.avisos.map(t => [x.linea, t])), [15, 85]));
                }
                const rec = res.pedRecipientes || [];
                if (rec.length) {
                    titulo(2, `5.${x0.naval ? 2 : 1}. Recipientes a presión`);
                    cuerpo.push(par(`Los tanques y equipos con volumen se clasifican según el artículo 4.1.a y los cuadros 1 a 4 del anexo II (mismo criterio que la aplicación «Recipientes a presión», ${URL_RECIPIENTES}). PS es la presión indicada para el recipiente o, si no se indica, la mayor entre la presión sobre la lámina y la calculada en sus conexiones; V es el volumen interior.`));
                    cuerpo.push(leyenda('Tabla', 'Clasificación PED de los recipientes'));
                    cuerpo.push(tabla(['Elemento', 'V (l)', 'PS (bar)', 'PS·V (bar·l)', 'Cuadro', 'Categoría'], rec.map(x => [x.tag + ' · ' + x.nombre, nf(x.V, 0), nf(x.PS, 2) + (x.origenPS === 'indicada' ? ' (indicada)' : ''), nf(x.PSV, 0), x.cuadro, x.cat === 'Art. 4.3' ? 'Art. 4.3 (buenas prácticas)' : x.cat === 'Fuera' ? 'Fuera de la Directiva (PS ≤ 0,5 bar)' : 'Categoría ' + x.cat]), [30, 10, 14, 14, 18, 14]));
                }
                cuerpo.push(par('Nota: las líneas de categoría I o superior requieren la evaluación de la conformidad del módulo correspondiente (anexo III); las de art. 4.3 se diseñan y fabrican según buenas prácticas de ingeniería y no llevan marcado CE. La clasificación de los accesorios a presión y de los equipos se hace por separado.', { run: { italics: true, size: 16 } }));
            } else cuerpo.push(par('No hay tuberías calculadas que clasificar.'));

            // ===== 6 AISLAMIENTO, DILATACIÓN Y SOPORTES =====
            titulo(1, '6. Aislamiento térmico, dilatación y soportes');
            const tm = res.termica;
            if (tm && tm.lineas.length) {
                cuerpo.push(par(`Temperatura del fluido ${nf(fl.T, 0)} °C, ambiente ${nf(tm.Ta, 0)} °C (${tm.ext ? 'exterior' : 'interior'}), máxima admisible TS ${nf(tm.TS, 0)} °C y de montaje ${nf(tm.Tm, 0)} °C. ` +
                    `Aislamiento mínimo según RITE IT 1.2.4.2.1.2 (λ de referencia 0,040 W/(m·K), corregido para el λ del aislamiento). Pérdidas q = ΔT/[ln(D₂/D₁)/(2πλ) + 1/(h·π·D₂)] con h = 10 W/(m²·K) y caída de temperatura T(L) = Ta + (T − Ta)·exp[−L/(R·ṁ·cp)], cp = ${nf(tm.cp, 0)} J/(kg·K). ` +
                    `Dilatación ΔL = α·L·(TS − Tmontaje). Separación máxima entre soportes orientativa: ASME B31.1 tabla 121.5 para tubería metálica llena de agua y criterio de fabricante por diámetro exterior para termoplásticos.`));
                for (const ln_ of tm.lineas) {
                    cuerpo.push(leyenda('Tabla', `Aislamiento, dilatación y soportes de la línea ${ln_.linea}`));
                    cuerpo.push(tabla(['Tubería', 'De (mm)', 'L (m)', 'Aisl. / mín. RITE (mm)', 'q (W/m)', 'ΔT fluido (K)', 'ΔL (mm)', 'Sep. soportes (m)', 'Nº soportes', 'Peso lleno (kg/m)'],
                        ln_.tubos.map(x => [x.tag, nf(x.De, 1), nf(x.L, 2), `${x.e || '—'} / ${x.eMin || '—'}`, nf(x.q, 1), nf(x.dT, 3), nf(x.dL, 1), nf(x.sep, 2), String(x.nSop), nf(x.peso, 1)]).concat([[{ t: 'Total línea', negrita: true }, '', nf(ln_.L, 2), '', '', '', nf(ln_.dL, 1), '', String(ln_.nSop), `${nf(ln_.peso, 0)} kg`]]),
                        [19, 8, 7, 11, 8, 9, 8, 10, 8, 12]));
                }
                cuerpo.push(par('Las pérdidas positivas son calor cedido al ambiente; las negativas, calor ganado. El peso lleno no incluye el aislamiento ni los accesorios. La disposición final de soportes, guías y puntos fijos debe comprobarse con el trazado real.', { run: { italics: true, size: 16 } }));
            } else cuerpo.push(par('No hay tuberías calculadas.'));
            titulo(2, '6.1. Puntos altos y bajos');
            const pab = res.puntosAB || [];
            if (pab.length) {
                cuerpo.push(leyenda('Tabla', 'Puntos altos sin purgador y puntos bajos sin drenaje'));
                cuerpo.push(tabla(['Tipo', 'Situación', 'Cota (m)', 'Acción'], pab.map(x => [x.tipo === 'alto' ? 'Punto alto' : 'Punto bajo', x.donde, nf(x.z, 2), x.tipo === 'alto' ? 'Añadir purgador de aire (PG)' : 'Añadir drenaje (DR)']), [15, 45, 12, 28]));
            } else cuerpo.push(par('Todos los puntos altos de la red tienen purgador y todos los puntos bajos tienen drenaje (o la red no tiene puntos altos ni bajos intermedios).'));
            titulo(2, '6.2. Volumen de la instalación y vaso de expansión');
            const circs = volumenCircuitos(), TSv = +p.tsMax > 0 ? +p.tsMax : fl.T, glm = fl.nombre.match(/(MEG|MPG) (\d+) %/);
            cuerpo.push(leyenda('Tabla', 'Volumen por circuito y vaso de expansión'));
            cuerpo.push(tabla(['Circuito (líneas)', 'V tuberías (l)', 'V equipos (l)', 'V total (l)', glm ? 'Glicol (kg)' : 'Tipo', 'Vaso de expansión'], circs.map(c => {
                const vv = c.abierto ? null : calcVaso(c.V, fl, 10, TSv, c.zmax - (c.vaso ? +c.vaso.cota || 0 : c.zmin), 3);
                return [c.lineas.join(', '), nf(c.Vtub, 1), nf(c.Veq, 1), nf(c.V, 1), glm ? nf(c.V / 1000 * fl.rho * (+glm[2] / 100), 1) : (c.abierto ? 'Abierto' : 'Cerrado'),
                    c.abierto ? 'No aplica (circuito abierto)' : (isFinite(vv.Cp) ? `Ce ${nf(vv.Ce, 4)} · Cp ${nf(vv.Cp, 2)} → ${nf(vv.Vv, 1)} l → ${vv.nor ? vv.nor + ' l' : 'varios'} (precarga ${nf(vv.Pm - 1.01325, 2)} bar)` : 'Revisar tarado de la válvula de seguridad')];
            }), [22, 12, 12, 11, 12, 31]));
            cuerpo.push(par('Vaso según UNE 100155 con T de llenado 10 °C, T máxima = TS, altura estática desde el vaso (o el punto más bajo) hasta el más alto del circuito y tarado de la válvula de seguridad de 3 bar; ajustar en Herramientas > Volumen, vaso de expansión y glicol si los datos reales son otros. El volumen de los equipos es el indicado en cada equipo.', { run: { italics: true, size: 16 } }));

            titulo(1, '7. Balance de la ruta crítica');
            if (lc) {
                let acum = 0;
                const filas = lc.aristasCamino.map((a, i) => { const hf = hfDeArista(a); acum += hf; return [String(i + 1), tagDe(a.el) + (a.rama ? ` (${a.rama})` : ''), nombreTipo(a.el), nf(hf, 4), nf(acum, 4)]; });
                cuerpo.push(leyenda('Tabla', 'Pérdidas de carga acumuladas en la ruta crítica'));
                cuerpo.push(tabla(['Nº', 'Elemento', 'Tipo', 'hf (m)', 'Σ hf (m)'], filas, [7, 33, 30, 15, 15]));
                const bomba = ars.find(a => a.esBomba && a.nodoB === lc.aristasCamino[0].nodoA) || ars.find(a => a.esBomba);
                const ult = lc.aristasCamino[lc.aristasCamino.length - 1], nFin = [ult.nodoA, ult.nodoB].find(n => !lc.aristasCamino.slice(0, -1).some(x => x.nodoA === n || x.nodoB === n));
                if (bomba) {
                    const Hdes = res.Hnodo[bomba.nodoB], Hfin = res.Hnodo[nFin];
                    cuerpo.push(espacio());
                    cuerpo.push(leyenda('Tabla', 'Balance de energía de la ruta crítica'));
                    cuerpo.push(tabla(['Concepto', 'Valor (m c.l.)'], [['Altura piezométrica en la descarga de ' + tagDe(bomba.el), nf(Hdes, 3)], ['Σ pérdidas de carga de la ruta', nf(lc.hfTotal, 3)],
                        ['Altura piezométrica en el extremo (calculada)', nf(Hfin, 3)], ['Comprobación: descarga − pérdidas − extremo', nf(Hdes - lc.hfTotal - Hfin, 4)]], [70, 30]));
                    cuerpo.push(par('Las alturas piezométricas son absolutas (incluyen la presión atmosférica) y están expresadas en metros de columna del fluido de cálculo.', { run: { italics: true, size: 16 } }));
                }
            } else cuerpo.push(par('No aplica.'));

            // ===== 6 CONCLUSIONES =====
            titulo(1, '8. Conclusiones');
            const bs = ars.filter(a => a.esBomba);
            cuerpo.push(par(`Con ${fl.nombre} a ${fl.T} °C, la red de la instalación «${p.instalacion}» trabaja a ${nf(res.Qbombas, 2)} m³/h, igual o superior al caudal de diseño de ${nf(res.Qdiseno, 2)} m³/h. ` +
                `Todos los tramos respetan las velocidades máximas adoptadas (${nf(lim.asp, 2)} m/s en aspiración y ${nf(lim.imp, 2)} m/s en impulsión), las válvulas de retención trabajan totalmente abiertas y ` +
                (bs.length ? `${bs.length > 1 ? 'las bombas disponen' : 'la bomba dispone'} de NPSH suficiente con un margen mínimo de ${nf(opciones.margenNPSH, 2)} m. ` : 'la red funciona sin bombas (alimentación por gravedad o desde depósito presurizado). ') +
                `Las presiones de servicio no superan la presión máxima admisible de ninguna tubería y en ningún punto se alcanza la presión de vapor.` + (consumos.length ? ` Todos los puntos de consumo disponen de la presión mínima requerida.` : '') + (lc ? ` La ruta crítica acumula ${nf(lc.hfTotal, 3)} m de pérdida de carga.` : '') +
                (avisos.length ? ` Se han registrado ${[...new Set(avisos)].length} observaciones (apartado 3), que deben revisarse.` : '')));
            cuerpo.push(par('En consecuencia, la red CUMPLE los criterios de diseño establecidos.', { run: { bold: true } }));

            // ===== ANEXOS =====
            titulo(1, 'Anexo A. Condiciones de contorno');
            const nodosG = construirGrafoRed().nodos;
            const filasC = Object.entries(ultimoCalculo.condiciones).map(([nid, c]) => {
                const n = nodosG[nid]; const pc = n && (n.puertos.find(x => { const e = elementosRed.find(y => y.id === x.elId); return e && !sinFlujo(e); }) || n.puertos[0]);
                const e = pc && elementosRed.find(y => y.id === pc.elId);
                const dep = c.deposito && elementosRed.find(y => y.id === c.deposito);
                return [dep ? `${tagDe(dep)} (lámina)` : e ? `${tagDe(e)} (${nombrePuerto(e, pc.portId)})` : `Nodo ${nid}`, nf(c.elevacion || 0, 2), nf(c.presion || 0, 3), nf(res.Hnodo[nid], 3)];
            });
            cuerpo.push(leyenda('Tabla', 'Extremos con altura conocida (abiertos y depósitos)'));
            cuerpo.push(tabla(['Extremo', 'Cota (m)', 'Presión man. (bar)', 'H absoluta (m)'], filasC.length ? filasC : [['Red cerrada', '—', '—', '—']], [46, 16, 20, 18]));
            titulo(1, 'Anexo B. Control de revisiones');
            const revs = p.revisiones || [];
            cuerpo.push(leyenda('Tabla', 'Historial de revisiones'));
            cuerpo.push(tabla(['Rev.', 'Fecha', 'Autor', 'Descripción'], revs.map(r => [r.rev, r.fecha, r.autor, r.descripcion]).concat([[{ t: p.revision || '0', negrita: true }, p.fecha || '', p.autor || '', { t: 'Revisión en curso (este informe)', negrita: true }]]), [10, 15, 20, 55]));
            const dif = cambiosDesdeRevision();
            if (dif) {
                cuerpo.push(espacio());
                cuerpo.push(leyenda('Tabla', `Cambios respecto a la revisión ${dif.rev}`));
                cuerpo.push(tabla(['Cambio', 'Elemento', 'Detalle'], dif.cambios.length ? dif.cambios.map(c => [c.tipo, c.tag, c.detalle]) : [['—', '—', 'Sin cambios en la red']], [14, 24, 62]));
            }
            titulo(1, 'Anexo C. Nomenclatura');
            cuerpo.push(leyenda('Tabla', 'Símbolos y abreviaturas'));
            cuerpo.push(tabla(['Símbolo', 'Significado', 'Unidad'], [['Q', 'Caudal', 'm³/h, m³/s'], ['V', 'Velocidad media', 'm/s'], ['D, Dint', 'Diámetro interior', 'mm, m'], ['De, e', 'Diámetro exterior y espesor', 'mm'], ['L', 'Longitud', 'm'],
                ['ε', 'Rugosidad absoluta', 'mm'], ['Re', 'Número de Reynolds', '—'], ['f', 'Factor de fricción de Darcy', '—'], ['fT', 'Factor de fricción en turbulencia total (Crane)', '—'], ['K', 'Coeficiente de resistencia', '—'],
                ['Cv', 'Coeficiente de caudal (US gpm/√psi)', '—'], ['hf', 'Pérdida de carga', 'm c.l.'], ['H', 'Altura manométrica / piezométrica', 'm c.l.'], ['NPSHd / NPSHr', 'NPSH disponible / requerido', 'm'], ['ρ, ν, pv', 'Densidad, viscosidad cinemática, presión de vapor', 'kg/m³, mm²/s, kPa'],
                ['Asp. / Imp.', 'Tramo de aspiración / impulsión', '—']], [18, 60, 22]));

            // v8.41 · la comprobación final por componente va en un Excel aparte (generarComprobacionXLSX), no en el .docx

            // ===== PORTADA E ÍNDICES =====
            const portada = [
                new D.Paragraph({ spacing: { before: 2200, after: 200 }, alignment: D.AlignmentType.CENTER, children: [T('INFORME DE CÁLCULO HIDRÁULICO', { bold: true, size: 44, color: AZUL })] }),
                new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { after: 600 }, children: [T(`Red de tuberías · ${p.instalacion}`, { size: 28, color: '404040' })] }),
                clave([['Proyecto', p.numero], ['Cliente', p.cliente], ['Referencia del cliente', p.refCliente], ['Instalación', p.instalacion], ['Emplazamiento', emplaz],
                    ...(p.esBuque ? [['Astillero', b.astillero], ['Construcción nº', b.construccion], ['Buque', b.nombre], ['Armador', b.armador]] : []),
                    ['Revisión', p.revision], ['Fecha', p.fecha], ['Autor', p.autor]]),
                new D.Paragraph({ spacing: { before: 800 }, alignment: D.AlignmentType.CENTER, children: [T('Documento generado con PIPING P&ID', { italics: true, size: 16, color: '808080' })] })
            ];
            const indices = [
                new D.Paragraph({ children: [T('Índice', { bold: true, size: 32, color: AZUL })], spacing: { after: 200 } }),
                new D.TableOfContents('Índice', { hyperlink: true, headingStyleRange: '1-3', cachedEntries: toc }),
                new D.Paragraph({ children: [new D.PageBreak()] }),
                new D.Paragraph({ children: [T('Índice de tablas', { bold: true, size: 32, color: AZUL })], spacing: { after: 200 } }),
                new D.TableOfContents('Índice de tablas', { hyperlink: true, captionLabelIncludingNumbers: 'Tabla', cachedEntries: listaTablas }),
                new D.Paragraph({ children: [T('Índice de figuras', { bold: true, size: 32, color: AZUL })], spacing: { before: 400, after: 200 } }),
                new D.TableOfContents('Índice de figuras', { hyperlink: true, captionLabelIncludingNumbers: 'Figura', cachedEntries: listaFiguras }),
                new D.Paragraph({ children: [new D.PageBreak()] })
            ];
            const cabecera = new D.Header({ children: [new D.Paragraph({ alignment: D.AlignmentType.RIGHT, border: { bottom: { style: D.BorderStyle.SINGLE, size: 4, color: AZUL, space: 2 } },
                children: [T(`${p.numero} · ${p.cliente}${p.esBuque && b.construccion ? ' · C-' + b.construccion : ''} · Informe de cálculo hidráulico · Rev. ${p.revision}`, { size: 16, color: '595959' })] })] });
            const pie = new D.Footer({ children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ size: 16, color: '595959', children: ['Página ', D.PageNumber.CURRENT, ' de ', D.PageNumber.TOTAL_PAGES] })] })] });
            const pagina = { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134, header: 567, footer: 567 } } };
            return new D.Document({
                creator: p.autor || 'PIPING', title: `Informe de cálculo hidráulico ${p.numero}`, description: p.descripcion || '',
                features: { updateFields: true },
                styles: {
                    default: {
                        document: { run: { font: 'Calibri', size: 20 } },
                        heading1: { run: { font: 'Calibri', size: 30, bold: true, color: AZUL }, paragraph: { spacing: { before: 360, after: 160 } } },
                        heading2: { run: { font: 'Calibri', size: 25, bold: true, color: AZUL }, paragraph: { spacing: { before: 280, after: 120 } } },
                        heading3: { run: { font: 'Calibri', size: 21, bold: true, color: '2E74B5' }, paragraph: { spacing: { before: 200, after: 100 } } }
                    },
                    paragraphStyles: [
                        { id: 'Caption', name: 'caption', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 17, italics: true, color: AZUL }, paragraph: { spacing: { before: 80, after: 80 } } }
                    ]
                },
                sections: opc.unaSeccion
                    // con plantilla: una sola sección (la página, cabecera y pie son los de la plantilla)
                    ? [{ properties: pagina, children: [...(opc.sinPortada ? [] : [...portada, new D.Paragraph({ children: [new D.PageBreak()] })]), ...indices, ...cuerpo] }]
                    : [
                        { properties: pagina, children: portada },
                        { properties: pagina, headers: { default: cabecera }, footers: { default: pie }, children: [...indices, ...cuerpo] }
                    ]
            });
        }
function datosListados(filtroLin) {
            const ELS = filtroLin ? elementosRed.filter(e => esAnotacion(e) || filtroLin.has(e.linea)) : elementosRed;   // v8.52 · solo las líneas elegidas
            const calc = ultimoCalculo && ultimoCalculo.huella === huellaRed() ? ultimoCalculo.resultado : null;
            const ars = calc ? calc.aristas : [], de = id => ars.filter(a => a.el.id === id);
            const r2 = x => x == null || !isFinite(x) ? '' : +(+x).toFixed(3);
            const cab = [['PIPING · ' + (proyecto.numero || '') + ' · ' + (proyecto.cliente || '')], [proyecto.instalacion || ''], ['Fluido: ' + document.getElementById('selector-fluido').value + ' a ' + document.getElementById('temp-fluido').value + ' °C' + (calc ? '' : ' · (sin resultados de cálculo)')], []];
            // Líneas
            const L = [['Línea', 'Tipo', 'Nombre', 'Sale de', 'Nº elementos', 'Materiales', 'Tamaños', 'Longitud de tubería (m)', 'Cota mín (m)', 'Cota máx (m)', 'Q máx (m³/h)', 'V máx (m/s)', 'p máx (bar)', 'PMA mín (bar)', 'Estado', 'PS (bar)', 'TS (°C)', 'Grupo PED', 'Categoría PED', 'Pt prueba (bar)', 'Clase buque']];
            lineasEnOrden().filter(o => !filtroLin || filtroLin.has(o.linea.id)).forEach(o => {
                const l = o.linea, els = o.orden.map(id => elementosRed.find(e => e.id === id)), tubs = els.filter(e => e.type === 'tuberia');
                const cotas = els.flatMap(e => e.type === 'tuberia' ? [+e.cotaA, +e.cotaB] : [+e.cota || 0]);
                const aL = els.flatMap(e => de(e.id)).filter(a => !a.esBomba);
                const desde = l.desde && elementosRed.find(e => e.id === l.desde);
                L.push([{ v: '  '.repeat(o.nivel) + l.id }, l.tipo === 'principal' ? 'Principal' : 'Ramal', l.nombre || '', desde ? tagDe(desde) : (l.padre || ''), els.length,
                    [...new Set(tubs.map(e => e.material))].join(', '), [...new Set(tubs.map(e => tamanoTubo(e.material, e.dn)))].join(', '), r2(tubs.reduce((s, e) => s + e.longitud / 1000, 0)),
                    cotas.length ? r2(Math.min(...cotas)) : '', cotas.length ? r2(Math.max(...cotas)) : '',
                    aL.length ? r2(Math.max(...aL.map(a => Math.abs(a.Qprev) * 3600))) : '', aL.length ? r2(Math.max(...aL.map(a => a.V))) : '', aL.length ? r2(Math.max(...aL.map(a => Math.max(a.pA, a.pB)))) : '',
                    (() => { const p = aL.filter(a => a.pma != null).map(a => a.pma); return p.length ? r2(Math.min(...p)) : ''; })(),
                    calc ? (els.some(e => e.estado === 'fallo') ? 'NO CUMPLE' : 'OK') : '',
                    ...(() => { const x = calc && (calc.ped || []).find(y => y.linea === l.id); return x ? [r2(x.PS), x.TS, x.grupo, x.cat, r2(x.Pt), x.clase ? 'Clase ' + x.clase : ''] : ['', '', '', '', '', '']; })()]);
            });
            // Válvulas
            const V = [['Etiqueta', 'Tipo', 'Línea', 'DN', 'PN / Rating', 'Cálculo de K', 'Serie / tipo', 'Cv', 'Kv', 'K', 'Q (m³/h)', 'V (m/s)', 'Δp (kPa)', 'Estado']];
            ELS.filter(e => e.type === 'valvula').forEach(e => {
                const a = de(e.id)[0], nps = npsDeDN(e.dn);
                let cv = '';
                if (e.modoK === 'cv') cv = +e.cvUsuario || '';
                else if (e.modoK === 'catalogo') { const sv = CAT.valvulas.find(v => v.nombre === e.serieCat); cv = sv && sv.cv[nps] || ''; }
                const Dmm = a ? a.D * 1000 : dintReferencia(e.dn), K = a ? a.K : (sinFlujo(e) ? null : kElemento(e, Dmm).K);
                if (!cv && K > 0) cv = Math.sqrt(891 * Math.pow(Dmm / 25.4, 4) / K);
                V.push([tagDe(e), nombreTipo(e), e.linea || '', e.dn ? etiquetaDN(e.dn) : '', e.pn || '', sinFlujo(e) ? 'Sin caudal' : ({ crane: 'Crane', catalogo: 'Catálogo', cv: 'Cv usuario', manual: 'K usuario' }[e.modoK] || ''),
                    e.modoK === 'catalogo' ? e.serieCat : (e.craneTipo || ''), cv ? r2(cv) : '', cv ? r2(cv / 1.156) : '', K != null ? r2(K) : '',
                    a ? r2(Math.abs(a.Qprev) * 3600) : '', a ? r2(a.V) : '', a ? r2(hfDeArista(a) * calc.fluido.rho * G / 1000) : '', calc ? (e.estado === 'fallo' ? 'NO CUMPLE' : e.estado ? 'OK' : '') : '']);
            });
            if (calc) (calc.terminales.elementos).forEach(e => { const r = ultimoResultado[e.id]; if (r && r.equilibrado) V.push([`VE-${tagDe(e)}`, 'Válvula de equilibrado (propuesta)', e.linea || '', '', '', 'Kv necesario', `Δp ${r2(r.equilibrado.dp)} bar`, r2(r.equilibrado.Cv), r2(r.equilibrado.Kv), '', r2(r.Q), '', r2(r.equilibrado.dp * 100), 'A instalar']); });
            // Materiales (mediciones)
            const M = [['Grupo', 'Descripción', 'Norma / serie', 'Tamaño', 'Cantidad', 'Unidad', `Precio unitario (${monedaProy()})`, `Importe (${monedaProy()})`]];
            const pr = v => { const x = v.find(e => e.precio != null && !isNaN(+e.precio)); return x ? +x.precio : ''; }, imp = (q, p) => p === '' ? '' : +(q * p).toFixed(2);
            const agrupar = (lista, clave) => { const m = new Map(); lista.forEach(x => { const k = clave(x); m.set(k, (m.get(k) || []).concat([x])); }); return m; };
            agrupar(ELS.filter(e => e.type === 'tuberia'), e => [e.material, e.serie, e.dn, e.precio == null ? '' : e.precio].join('|')).forEach((v, k) => {
                const [mat, ser, dn] = k.split('|'), dt = datosTuberia(v[0]), q = r2(v.reduce((s, e) => s + e.longitud / 1000, 0)), p = pr(v);
                M.push(['Tubería', `${mat} · De ${dt.od} × e ${dt.e} mm`, `${dt.norma} · ${/^[0-9]+S?$/.test(ser) ? 'Sch ' + ser : ser}`, tamanoTubo(mat, dn), q, 'm', p, imp(q, p)]);
            });
            if (calc && calc.termica) {
                const ais = new Map();
                calc.termica.lineas.forEach(l => l.tubos.forEach(x => { if (x.e > 0) { const k = `${x.e} mm · De ${x.De}`; ais.set(k, (ais.get(k) || 0) + x.L); } }));
                ais.forEach((L, k) => M.push(['Aislamiento', 'Coquilla aislante ' + k.split(' · ')[0], `λ ≤ 0,040 W/(m·K) (RITE)`, k.split(' · ')[1] + ' mm', r2(L), 'm']));
                const nS = calc.termica.lineas.reduce((s_, l) => s_ + l.nSop, 0); if (nS) M.push(['Soportes', 'Soportes / abrazaderas (separación máx. orientativa)', '', '', nS, 'ud']);
            }
            [['accesorio', 'Accesorio'], ['valvula', 'Válvula'], ['equipo', 'Equipo'], ['bomba', 'Bomba'], ['instrumento', 'Instrumento'], ['terminal', 'Terminal']].forEach(([t, g]) => {
                agrupar(ELS.filter(e => e.type === t), e => [nombreTipo(e), e.subtype === 'reduccion' ? `${e.dn} × ${e.dnMenor}` : (e.dn || ''), e.precio == null ? '' : e.precio, e.fabricante || ''].join('|')).forEach((v, k) => {
                    const [n, dn, , fab] = k.split('|'), p = pr(v); M.push([g, n + (fab ? ' · ' + fab : ''), '', dn.split(' × ').map(d => d ? etiquetaDN(d) : '').join(' × '), v.length, 'ud', p, imp(v.length, p)]);
                });
            });
            // Equipos, bombas y consumos
            const E = [['Etiqueta', 'Tipo', 'Línea', 'Cota (m)', 'Datos de diseño', 'Q calc. (m³/h)', 'H / Δp / p calc.', 'Estado']];
            ELS.filter(e => e.type === 'bomba' || e.type === 'equipo' || esTerminal(e)).forEach(e => {
                const r = calc && ultimoResultado[e.id];
                const dis = e.type === 'bomba' ? `${e.caudal} m³/h a ${e.presion} bar · H0 ${e.h0} bar · NPSHr ${e.npsh} m${e.reservaDe ? ' · reserva de ' + tagDe(elementosRed.find(x => x.id === e.reservaDe) || e) : ''}` : e.type === 'equipo' ? `Δp ${e.dpNom} kPa a ${e.qNom} m³/h` : esConsumoT(e) ? `${e.qCons} m³/h · p mín ${e.pMin} bar` : `lámina ${e.cotaLamina} m · ${e.presionDep} bar`;
                const res = !r ? '' : e.type === 'bomba' ? `H ${r2(r.H)} m · NPSHd ${r2(r.npshd)} m` : e.type === 'equipo' ? `Δp ${r2(r.dp)} kPa` : `p ${r2(r.p)} bar`;
                E.push([tagDe(e), nombreTipo(e), e.linea || '', e.type === 'bomba' ? e.cota || 0 : r2(e.cota), dis, r ? r2(r.Q) : '', res, calc ? (e.estado === 'fallo' ? 'NO CUMPLE' : e.estado ? 'OK' : '') : '']);
            });
            { const tot = M.slice(1).reduce((t, f) => t + (typeof f[7] === 'number' ? f[7] : 0), 0); if (tot > 0) M.push(['TOTAL', '', '', '', '', '', '', +tot.toFixed(2)]); }   // v8.52
            return { cab, hojas: [['Líneas', L], ['Válvulas', V], ['Materiales', M], ['Equipos y consumos', E]] };
        }
function cfgListados() { try { return JSON.parse(localStorage.getItem('piping-listados-cfg') || '{}'); } catch (e) { return {}; } }
async function elegirListados() {
            const d0 = datosListados(), cfg = cfgListados(), qc = cfg.quitar || {}, hs = cfg.hojasNo || [];
            const lin = lineasEnOrden().map(o => o.linea), linNo = new Set(cfg.lineasNo || []);
            const h = `<div class="text-xs space-y-2" style="max-height:62vh;overflow:auto">
                <p class="text-slate-500">Marca las hojas y columnas que van al Excel. La elección se recuerda para la próxima vez.</p>
                <label class="flex items-center gap-1.5"><input type="checkbox" id="lx-vacias" ${cfg.vacias === false ? '' : 'checked'}> Quitar las columnas sin datos (análisis automático)</label>
                <div class="border rounded p-1.5"><p class="font-bold text-slate-600 mb-1">Líneas</p><div class="flex flex-wrap gap-x-3 gap-y-0.5">${lin.map(l => `<label class="flex items-center gap-1"><input type="checkbox" class="lx-lin" value="${esc(l.id)}" ${linNo.has(l.id) ? '' : 'checked'}>${esc(l.id)}${l.nombre ? ' · ' + esc(l.nombre) : ''}</label>`).join('')}</div></div>
                ${d0.hojas.map(([n, f], i) => `<div class="border rounded p-1.5"><label class="flex items-center gap-1.5 font-bold text-slate-600"><input type="checkbox" class="lx-hoja" data-i="${i}" ${hs.includes(n) ? '' : 'checked'}> Hoja «${esc(n)}» (${f.length - 1} filas)</label>
                    <div class="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 pl-5">${f[0].map((c, k) => `<label class="flex items-center gap-1"><input type="checkbox" class="lx-col" data-i="${i}" data-k="${k}" ${(qc[n] || []).includes(c) ? '' : 'checked'}>${esc(c)}</label>`).join('')}</div></div>`).join('')}</div>`;
            const r = await dialogo('<i class="fa-solid fa-file-excel text-emerald-600 mr-1.5"></i>Listados de líneas, válvulas y materiales', h, [{ texto: 'Cancelar', valor: null }, { texto: 'Generar Excel', valor: 'si', clase: 'bg-blue-600 hover:bg-blue-700 text-white' }]);
            // el diálogo se cierra al pulsar: los checkboxes siguen en el DOM hasta el siguiente diálogo
            if (r !== 'si') return null;
            const q = sel => [...document.querySelectorAll('#dialogo-cuerpo ' + sel)];
            const nueva = { vacias: document.getElementById('lx-vacias').checked, hojasNo: q('.lx-hoja').filter(x => !x.checked).map(x => d0.hojas[+x.dataset.i][0]), quitar: {}, lineasNo: q('.lx-lin').filter(x => !x.checked).map(x => x.value) };
            q('.lx-col').filter(x => !x.checked).forEach(x => { const n = d0.hojas[+x.dataset.i][0]; (nueva.quitar[n] = nueva.quitar[n] || []).push(d0.hojas[+x.dataset.i][1][0][+x.dataset.k]); });
            try { localStorage.setItem('piping-listados-cfg', JSON.stringify(nueva)); } catch (e) { }
            return nueva;
        }
function aplicarCfgListados(d, cfg) {
            if (!cfg) return d;
            d.hojas = d.hojas.filter(([n]) => !(cfg.hojasNo || []).includes(n)).map(([n, f]) => {
                const cab = f[0], quitar = new Set((cfg.quitar || {})[n] || []);
                const vacia = k => cfg.vacias !== false && f.length > 1 && f.slice(1).every(r => { const v = r[k] && typeof r[k] === 'object' ? r[k].v : r[k]; return v === '' || v == null; });
                const ks = cab.map((c, k) => k).filter(k => !quitar.has(cab[k]) && !vacia(k));
                return [n, f.map(r => ks.map(k => r[k] === undefined ? '' : r[k]))];
            }).filter(([, f]) => f[0].length);
            return d;
        }
async function generarListados__p() {
            const cfgL = await elegirListados(); if (!cfgL) return;   // v8.52
            const nombre = `Listados_${String(proyecto.numero || 'PIPING').replace(/[^\w.-]+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
            let handle = null;
            if (window.showSaveFilePicker) {
                try { handle = await window.showSaveFilePicker({ suggestedName: nombre, types: [{ description: 'Libro de Excel (*.xlsx)', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }] }); }
                catch (err) { if (err.name === 'AbortError') return; handle = null; }
            }
            try {
                mostrarAvisoProgreso('Generando listados…');
                const X = await cargarXLSX(), lin = lineasEnOrden().map(o => o.linea.id).filter(id => !(cfgL.lineasNo || []).includes(id)), d = aplicarCfgListados(datosListados(cfgL.lineasNo && cfgL.lineasNo.length ? new Set(lin) : null), cfgL), wb = X.utils.book_new();
                if (!d.hojas.length) { mostrarAvisoProgreso(null); alert('No has elegido ninguna hoja ni columna.'); return; }
                d.hojas.forEach(([n, filas]) => {
                    const aoa = d.cab.concat(filas.map(f => f.map(c => c && typeof c === 'object' ? c.v : c)));
                    const ws = X.utils.aoa_to_sheet(aoa);
                    ws['!cols'] = filas[0].map((_, i) => ({ wch: Math.min(60, Math.max(8, ...filas.map(f => String((f[i] && f[i].v) || f[i] || '').length + 2))) }));
                    ws['!autofilter'] = { ref: X.utils.encode_range({ s: { r: d.cab.length, c: 0 }, e: { r: d.cab.length + filas.length - 1, c: filas[0].length - 1 } }) };
                    X.utils.book_append_sheet(wb, ws, n);
                });
                const buf = X.write(wb, { type: 'array', bookType: 'xlsx' });
                const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                if (handle) { const w = await handle.createWritable(); await w.write(blob); await w.close(); }
                else { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000); }
                mostrarAvisoProgreso(null);
                alert(`Listados guardados: ${handle ? handle.name : nombre}`);
            } catch (err) { console.error(err); mostrarAvisoProgreso(null); alert('No se han podido generar los listados: ' + err.message); }
        }
function cambiosDesdeRevision() {
            const rs = proyecto.revisiones || []; if (!rs.length) return null;
            const ult = rs[rs.length - 1], antes = JSON.parse(ult.red).e, ahora = elementosRed.filter(e => !esAnotacion(e));
            const tag = e => tagDe(e), cambios = [];
            ahora.forEach(e => {
                const a = antes.find(x => x.id === e.id);
                if (!a) { cambios.push({ tipo: 'Añadido', tag: tag(e), detalle: nombreTipo(e) }); return; }
                const dif = CAMPOS_DIFF.filter(k => String(a[k] ?? '') !== String(e[k] ?? '')).map(k => `${k}: ${a[k] ?? '—'} → ${e[k] ?? '—'}`);
                if (dif.length) cambios.push({ tipo: 'Modificado', tag: tag(e), detalle: dif.join('; ') });
            });
            antes.filter(a => !esAnotacion(a) && !ahora.some(e => e.id === a.id)).forEach(a => cambios.push({ tipo: 'Eliminado', tag: tagDe(a), detalle: nombreTipo(a) }));
            return { rev: ult.rev, cambios };
        }
PARTES_OK.informe = true;
