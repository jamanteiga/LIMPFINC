// PIPING · parte «admin»: se carga al usarla (la genera el empaquetado a partir de piping.js)
function verComentarios__p() {
            cerrarMenus();
            const todos = []; hojas.forEach((h, i) => { (i === hojaActual ? elementosRed : h.e || []).filter(e => e.subtype === 'comentario').forEach(e => todos.push({ e, i, h })); });
            document.getElementById('red-content').innerHTML = todos.length ? `<table class="w-full text-[11px]"><thead><tr class="text-left text-slate-500"><th class="py-1">Hoja</th><th>Estado</th><th>Autor</th><th>Fecha</th><th>Comentario</th><th>Elemento</th><th></th></tr></thead><tbody>${todos.map(({ e, i, h }) => {
                const a = e.sigueA && (i === hojaActual ? elementosRed : h.e || []).find(x => x.id === e.sigueA);
                return `<tr class="border-t border-slate-100 ${e.estadoCom === 'resuelto' ? 'text-slate-400' : ''}"><td class="py-1">${esc(h.id)}</td><td>${e.estadoCom === 'resuelto' ? '<i class="fa-solid fa-check text-emerald-600"></i> resuelto' : '<i class="fa-solid fa-circle text-rose-600 text-[8px]"></i> abierto'}</td><td>${esc(e.autor || '')}</td><td>${fechaDMA(String(e.fecha || '').slice(0, 10))}</td><td>${esc(e.texto || '')}</td><td>${a ? esc(tagDe(a)) : '—'}</td>
                    <td class="text-right whitespace-nowrap"><button onclick="cerrarModalRed(); if (${i} !== hojaActual) cambiarHoja(${i}); irAElemento('${e.id}')" class="px-2 border rounded text-blue-700">Ir</button> <button onclick="estadoComentario(${i}, '${e.id}')" class="px-2 border rounded">${e.estadoCom === 'resuelto' ? 'Reabrir' : 'Resolver'}</button></td></tr>`; }).join('')}</tbody></table>` : '<p class="text-slate-400 italic">No hay comentarios. Botón derecho en el lienzo > Comentario de revisión.</p>';
            document.getElementById('red-footer').innerHTML = `<div class="flex gap-2 w-full text-xs"><label class="flex items-center gap-1"><input type="checkbox" ${opciones.verComentarios !== false ? 'checked' : ''} onchange="opciones.verComentarios = this.checked; renderizarVectorial()"> Mostrar en el lienzo</label><span class="flex-1"></span><button onclick="cerrarModalRed()" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium">Cerrar</button></div>`;
            document.querySelector('#modal-red h3 span').innerHTML = `<i class="fa-solid fa-comment-dots text-rose-600 mr-1.5"></i> Comentarios de revisión (${todos.filter(t => t.e.estadoCom !== 'resuelto').length} abiertos)`;
            document.querySelector('#modal-red > div').style.width = 'min(1000px, 97vw)';
            document.getElementById('modal-red').style.display = 'flex';
        }
async function nubeGuardar__p(comoNuevo) {
            cerrarMenus();
            if (nubeSoloLectura) { aviso('Proyecto en solo lectura (bloqueado por otro usuario).', 'error'); return; }
            try {
                const u = usuarioNube(); if (!u) { await nubeIniciarSesion(); if (!usuarioNube()) return; }
                const contenido = generarContenido('pid'), nombre = proyecto.nombrePlano || proyecto.nombre || proyecto.numero || 'Proyecto', numero = proyecto.numero || '';
                if (nubeActual && !comoNuevo) {
                    const d = await SB.rest(`piping_proyectos?id=eq.${nubeActual.id}&version=eq.${nubeActual.version}`, { method: 'PATCH', body: { contenido, nombre, numero, version: nubeActual.version + 1, actualizado: new Date().toISOString(), actualizado_por_email: usuarioNube().email }, prefer: 'return=representation' });
                    if (!d || !d.length) throw new Error('El proyecto ha cambiado en la nube desde que lo abriste o no tienes el bloqueo de edición. Ábrelo de nuevo.');
                    nubeActual.version = d[0].version; marcarCambios(false); aviso(`Guardado en la nube (versión ${nubeActual.version}).`, 'ok'); return;
                }
                const eq = (await equiposNube()).filter(x => x.rol !== 'lector');
                if (!eq.length) { aviso('Crea antes un equipo (Archivo > Nube > Equipos).', 'error'); return; }
                const r = await dialogo('<i class="fa-solid fa-cloud-arrow-up text-blue-600 mr-1.5"></i>Guardar en la nube', `<p>Equipo: <select id="nb-gq" class="border rounded p-1">${eq.map(x => `<option value="${x.equipo_id}">${esc(x.equipos ? x.equipos.nombre : x.equipo_id)}</option>`).join('')}</select></p><p class="mt-1">Nombre: <b>${esc(nombre)}</b></p>`, [{ texto: 'Guardar', valor: 'si', clase: 'bg-blue-600 hover:bg-blue-700 text-white' }, { texto: 'Cancelar', valor: null }]);
                if (r !== 'si') return;
                const d = await SB.rest('piping_proyectos', { method: 'POST', body: { equipo_id: document.getElementById('nb-gq').value, contenido, nombre, numero, actualizado_por_email: usuarioNube().email }, prefer: 'return=representation' });
                nubeActual = { id: d[0].id, version: d[0].version || 1, nombre }; await nubeBloquear(); marcarCambios(false);
                aviso('Proyecto guardado en la nube y bloqueado para tu edición.', 'ok');
            } catch (e) { aviso('Nube: ' + e.message, 'error'); }
        }
async function nubeAbrir__p() {
            cerrarMenus();
            try {
                if (!usuarioNube()) { await nubeIniciarSesion(); if (!usuarioNube()) return; }
                const lista = await SB.rest('piping_proyectos?select=id,nombre,numero,version,actualizado,actualizado_por_email,bloqueado_por_email,bloqueado_hasta,equipos:piping_equipos(nombre)&order=actualizado.desc');
                const libre = x => !x.bloqueado_hasta || new Date(x.bloqueado_hasta) < new Date() || x.bloqueado_por_email === usuarioNube().email;
                document.getElementById('red-content').innerHTML = lista && lista.length ? `<table class="w-full text-[11px]"><thead><tr class="text-left text-slate-500"><th class="py-1">Proyecto</th><th>Nº</th><th>Equipo</th><th>Versión</th><th>Modificado</th><th>Edición</th><th></th></tr></thead><tbody>${lista.map(x => `<tr class="border-t border-slate-100"><td class="py-1 font-medium">${esc(x.nombre || '')}</td><td>${esc(x.numero || '')}</td><td>${esc(x.equipos ? x.equipos.nombre : '')}</td><td>${x.version || 1}</td><td>${fechaHora(x.actualizado)} · ${esc(x.actualizado_por_email || '')}</td><td>${libre(x) ? '<span class="text-emerald-700">libre</span>' : `<span class="text-rose-700"><i class="fa-solid fa-lock mr-1"></i>${esc(x.bloqueado_por_email || '')} hasta ${new Date(x.bloqueado_hasta).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>`}</td><td class="text-right"><button onclick="nubeAbrirProyecto('${x.id}')" class="px-2 py-0.5 bg-blue-600 text-white rounded">Abrir</button></td></tr>`).join('')}</tbody></table>` : '<p class="text-slate-400 italic">No hay proyectos en la nube de tus equipos.</p>';
                document.getElementById('red-footer').innerHTML = '<button onclick="cerrarModalRed()" class="px-3 py-1.5 border rounded">Cerrar</button>';
                document.querySelector('#modal-red h3 span').innerHTML = '<i class="fa-solid fa-cloud text-blue-600 mr-1.5"></i> Proyectos en la nube';
                document.querySelector('#modal-red > div').style.width = 'min(1000px, 97vw)';
                document.getElementById('modal-red').style.display = 'flex';
            } catch (e) { aviso('Nube: ' + e.message, 'error'); }
        }
async function cambiarClaveAdmin__p(obligatorio) {
            cerrarMenus(); const s = sesionActual(); if (!s) { aviso('Inicia sesión primero.', 'error'); return; }
            const min = s.origen === 'supabase' ? 8 : 10;
            const r = await dialogo('<i class="fa-solid fa-key text-blue-600 mr-1.5"></i>Cambiar contraseña', `${obligatorio ? '<p class="mb-2 text-amber-700 font-medium">Tienes la contraseña por defecto: cámbiala para continuar.</p>' : ''}<div class="space-y-2"><label class="block">Contraseña actual <input id="acc-a" type="password" class="border rounded p-1 w-full"></label><label class="block">Nueva contraseña (mín. ${min} caracteres) <input id="acc-n" type="password" class="border rounded p-1 w-full"></label><label class="block">Repetir <input id="acc-n2" type="password" class="border rounded p-1 w-full"></label>${s.origen === 'local' ? '<p class="text-[10px] text-slate-400">Administrador local: se guarda solo en este navegador.</p>' : ''}</div>`,
                [{ texto: 'Cambiar', valor: 'si', clase: 'bg-blue-600 hover:bg-blue-700 text-white' }, { texto: obligatorio ? 'Más tarde' : 'Cancelar', valor: null }]);
            if (r !== 'si') return;
            const a = document.getElementById('acc-a').value, n1 = document.getElementById('acc-n').value, n2 = document.getElementById('acc-n2').value;
            if (n1.length < min || n1 !== n2) { aviso(`La nueva contraseña debe tener al menos ${min} caracteres y coincidir en las dos casillas.`, 'error'); return cambiarClaveAdmin(obligatorio); }
            if (s.origen === 'supabase') {
                try { await rpcUsuarios('piping_cambiar_clave', { p_token: s.token, p_actual: a, p_nueva: n1 }); s.debe_cambiar = false; let rec = false; try { rec = !!localStorage.getItem('piping-sesion'); } catch (e) { } guardarSesion(s, rec); aviso('Contraseña cambiada.', 'ok'); }
                catch (e) { aviso(e.message, 'error'); }
                return;
            }
            if (resumenAcceso('admin', a) !== hashAcceso()) { aviso('La contraseña actual no es correcta.', 'error'); return; }
            try { const rec = !!localStorage.getItem('piping-sesion'); localStorage.setItem('piping-admin-hash', resumenAcceso('admin', n1)); guardarSesion(testigoSesion(), rec); } catch (e) { }
            pintarInsignia(); aviso('Contraseña cambiada en este navegador.', 'ok');
        }
async function abrirUsuarios__p() {
            cerrarMenus();
            const s = sesionActual();
            if (!tienePermiso('usuarios')) { aviso('Solo un administrador puede gestionar usuarios.', 'error'); return; }
            if (s.origen !== 'supabase') { if (await conectarUsuariosSupabase()) abrirUsuarios(); return; }
            try { listaUsuarios = await rpcUsuarios('piping_usuarios_listar', { p_token: s.token }) || []; } catch (e) { aviso('Usuarios: ' + e.message, 'error'); return; }
            const fila = u => `<tr class="border-t border-slate-100 ${u.activo ? '' : 'text-slate-400'}"><td class="py-1 pr-1"><input id="un-${u.id}" value="${esc(u.nombre)}" class="border rounded p-0.5 w-28"></td><td class="pr-1"><input id="ua-${u.id}" value="${esc(u.apellidos || '')}" class="border rounded p-0.5 w-36"></td><td class="pr-2 font-mono">${esc(u.usuario)}</td><td>${selRol('ur-' + u.id, u.rol)}</td>
                <td class="text-center"><input id="uv-${u.id}" type="checkbox" ${u.activo ? 'checked' : ''}></td><td class="text-center">${u.debe_cambiar ? '<span class="text-amber-700">pendiente</span>' : '<span class="text-emerald-700">propia</span>'}</td><td class="whitespace-nowrap">${u.ultimo_acceso ? fechaHora(u.ultimo_acceso) : '—'}</td>
                <td class="text-right whitespace-nowrap"><button onclick="usuarioGuardar('${u.id}')" class="px-2 border rounded text-blue-700">Guardar</button> <button onclick="usuarioResetear('${u.id}')" class="px-2 border rounded">Resetear contraseña</button> ${u.id === s.id ? '' : `<button onclick="usuarioBorrar('${u.id}')" class="px-2 border rounded text-rose-700"><i class="fa-solid fa-trash-can"></i></button>`}</td></tr>`;
            document.getElementById('red-content').innerHTML = `<div class="border rounded p-2 mb-3 bg-slate-50 text-[11px]"><p class="font-bold text-slate-600 mb-1">Nuevo usuario</p>
                <div class="flex flex-wrap gap-2 items-end"><label>Nombre<br><input id="nu-nombre" class="border rounded p-1 w-28"></label><label>Apellidos<br><input id="nu-apellidos" class="border rounded p-1 w-40"></label><label>Usuario<br><input id="nu-usuario" placeholder="p. ej. pperez" class="border rounded p-1 w-28 font-mono"></label>
                <label>Contraseña por defecto<br><input id="nu-clave" class="border rounded p-1 w-32 font-mono" value="${esc(claveAleatoria())}"></label><label>Rol<br>${selRol('nu-rol', 'usuario')}</label><button onclick="usuarioCrear()" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded"><i class="fa-solid fa-user-plus mr-1"></i>Crear</button></div>
                <p class="text-slate-400 mt-1">El usuario tendrá que cambiar la contraseña por defecto la primera vez que entre (Archivo > Administración > Cambiar mi contraseña).</p></div>
                <div class="overflow-auto" style="max-height:48vh"><table class="w-full text-[11px]"><thead class="sticky top-0 bg-white"><tr class="text-left text-slate-500"><th class="py-1">Nombre</th><th>Apellidos</th><th>Usuario</th><th>Rol</th><th>Activo</th><th>Contraseña</th><th>Último acceso</th><th></th></tr></thead><tbody>${listaUsuarios.map(fila).join('')}</tbody></table></div>
                <table class="w-full text-[10px] text-slate-500 mt-3">${Object.entries(ROLES).map(([k, n]) => `<tr><td class="pr-2 font-bold whitespace-nowrap align-top">${esc(n)}</td><td>${esc(DESCRIPCION_ROLES[k])}</td></tr>`).join('')}</table>`;
            document.getElementById('red-footer').innerHTML = `<div class="flex gap-2 w-full text-xs"><span class="text-slate-400 self-center">${listaUsuarios.length} usuario(s) · Supabase</span><span class="flex-1"></span><button onclick="cerrarModalRed()" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium">Cerrar</button></div>`;
            document.querySelector('#modal-red h3 span').innerHTML = '<i class="fa-solid fa-users text-blue-600 mr-1.5"></i> Usuarios';
            document.querySelector('#modal-red > div').style.width = 'min(1200px, 97vw)';
            document.getElementById('modal-red').style.display = 'flex';
        }
async function conectarUsuariosSupabase__p() {
            let diag = '', vacia = null;
            if (claveSupabase()) {
                try { vacia = await rpcUsuarios('piping_usuarios_vacio'); diag = vacia ? 'Conexión correcta. La tabla de usuarios está vacía: se creará el usuario admin en Supabase con la contraseña que escribas.' : 'Conexión correcta. Escribe la contraseña del usuario admin en Supabase.'; }
                catch (e) { diag = e.sinFuncion ? '⚠ Supabase responde, pero no existe la función piping_usuarios_vacio: ejecuta supabase/05_usuarios.sql en el SQL Editor (si ya lo ejecutaste, ejecuta también: NOTIFY pgrst, \'reload schema\';).' : /401|JWT|apikey|Invalid API key/i.test(e.message) ? '⚠ La clave anon no es válida (HTTP 401): cópiala de Supabase > Project Settings > API > anon public.' : '⚠ ' + e.message; }
            } else diag = '⚠ No hay clave anon de Supabase en este equipo: pégala abajo (Supabase > Project Settings > API > anon public).';
            const r = await dialogo('<i class="fa-solid fa-database text-blue-600 mr-1.5"></i>Usuarios en Supabase', `<p class="text-[11px] mb-2 ${diag.startsWith('⚠') ? 'text-rose-700' : 'text-emerald-700'}">${esc(diag)}</p><p class="text-[11px] text-slate-500 mb-2">Has entrado como administrador local (sin Supabase). Los usuarios se guardan en Supabase.</p>
                <div class="space-y-2"><label class="block">Clave anon <input id="cu-k" class="border rounded p-1 w-full font-mono text-[10px]" value="${esc(claveSupabase())}"></label><label class="block">Contraseña de admin <input id="cu-c" type="password" class="border rounded p-1 w-full"></label></div>`,
                [{ texto: 'Conectar', valor: 'si', clase: 'bg-blue-600 hover:bg-blue-700 text-white' }, { texto: 'Cancelar', valor: null }]);
            if (r !== 'si') return false;
            const k = valorCampo('cu-k').trim(), c = valorCampo('cu-c');
            if (k && k !== claveSupabase()) { let rol = ''; try { rol = JSON.parse(atob((k.split('.')[1] || '').replace(/-/g, '+').replace(/_/g, '/'))).role || ''; } catch (e) { } if (rol === 'service_role') { aviso('Esa es la clave service_role: usa la clave anon.', 'error'); return false; } try { localStorage.setItem('piping-supabase-clave', k); } catch (e) { } }
            try {
                let d = await rpcUsuarios('piping_login', { p_usuario: 'admin', p_clave: c, p_recordar: false });
                if (!(d && d.ok) && await rpcUsuarios('piping_usuarios_vacio')) {
                    if (resumenAcceso('admin', c) !== hashAcceso()) { aviso('La contraseña no es la del administrador de la aplicación.', 'error'); return false; }
                    d = await rpcUsuarios('piping_inicializar', { p_usuario: 'admin', p_nombre: 'Administrador', p_clave: c });
                }
                if (!(d && d.ok)) { aviso((d && d.error) || 'Usuario o contraseña incorrectos.', 'error'); return false; }
                let rec = false; try { rec = !!localStorage.getItem('piping-sesion'); } catch (e) { }
                guardarSesion(Object.assign({}, d.usuario, { token: d.token, origen: 'supabase', expira: Date.now() + 12 * 36e5 }), rec); pintarInsignia();
                aviso('Conectado a Supabase como admin.', 'ok'); return true;
            } catch (e) { aviso(e.sinFuncion ? 'Falta ejecutar supabase/05_usuarios.sql en Supabase (SQL Editor).' : 'No se ha podido conectar: ' + e.message, 'error'); return false; }
        }
function claveAleatoria() { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; const v = new Uint32Array(10); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(v) : v.forEach((x, i) => v[i] = Math.random() * 1e9); return [...v].map(x => a[x % a.length]).join(''); }
async function usuarioCrear() {
            const s = sesionActual(), u = valorCampo('nu-usuario').trim().toLowerCase(), nombre = valorCampo('nu-nombre').trim(), clave = valorCampo('nu-clave');
            if (!/^[a-z0-9._-]{3,40}$/.test(u)) { aviso('Nombre de usuario: de 3 a 40 caracteres, minúsculas, números, punto, guion o guion bajo.', 'error'); return; }
            if (!nombre) { aviso('Indica el nombre.', 'error'); return; }
            if (clave.length < 8) { aviso('La contraseña por defecto debe tener al menos 8 caracteres.', 'error'); return; }
            try { await rpcUsuarios('piping_usuario_crear', { p_token: s.token, p_usuario: u, p_nombre: nombre, p_apellidos: valorCampo('nu-apellidos').trim(), p_rol: valorCampo('nu-rol'), p_clave: clave }); registrarActividad('usuario creado', `${u} · ${valorCampo('nu-rol')}`); aviso(`Usuario ${u} creado. Contraseña por defecto: ${clave} (tendrá que cambiarla al entrar).`, 'ok'); abrirUsuarios(); }
            catch (e) { aviso('Usuarios: ' + e.message, 'error'); }
        }
async function usuarioGuardar(id) {
            const s = sesionActual();
            try { await rpcUsuarios('piping_usuario_actualizar', { p_token: s.token, p_id: id, p_nombre: valorCampo('un-' + id).trim(), p_apellidos: valorCampo('ua-' + id).trim(), p_rol: valorCampo('ur-' + id), p_activo: !!(document.getElementById('uv-' + id) || {}).checked }); registrarActividad('usuario modificado', `${(listaUsuarios.find(x => x.id === id) || {}).usuario || ''} · ${valorCampo('ur-' + id)}${(document.getElementById('uv-' + id) || {}).checked ? '' : ' · desactivado'}`); aviso('Usuario actualizado.', 'ok'); abrirUsuarios(); }
            catch (e) { aviso('Usuarios: ' + e.message, 'error'); }
        }
async function usuarioResetear(id) {
            const s = sesionActual(), u = listaUsuarios.find(x => x.id === id); if (!u) return;
            const sug = claveAleatoria();
            const r = await dialogo('<i class="fa-solid fa-key text-blue-600 mr-1.5"></i>Resetear contraseña', `<p>Nueva contraseña por defecto para <b>${esc(u.usuario)}</b> (${esc(nombreSesion(u))}). Tendrá que cambiarla al entrar.</p><input id="ur-clave" class="border rounded p-1 w-full font-mono mt-2" value="${esc(sug)}">`,
                [{ texto: 'Resetear', valor: 'si', clase: 'bg-blue-600 hover:bg-blue-700 text-white' }, { texto: 'Cancelar', valor: null }]);
            if (r !== 'si') return;
            const c = valorCampo('ur-clave'); if (c.length < 8) { aviso('Al menos 8 caracteres.', 'error'); return; }
            try { await rpcUsuarios('piping_usuario_resetear', { p_token: s.token, p_id: id, p_clave: c }); registrarActividad('contraseña reseteada', u.usuario); aviso(`Contraseña de ${u.usuario} reseteada: ${c}`, 'ok'); abrirUsuarios(); }
            catch (e) { aviso('Usuarios: ' + e.message, 'error'); }
        }
async function usuarioBorrar(id) {
            const s = sesionActual(), u = listaUsuarios.find(x => x.id === id); if (!u) return;
            if (!confirm(`¿Eliminar el usuario ${u.usuario} (${nombreSesion(u)})? Si solo quieres impedir el acceso, desmarca «Activo».`)) return;
            try { await rpcUsuarios('piping_usuario_borrar', { p_token: s.token, p_id: id }); registrarActividad('usuario eliminado', u.usuario); aviso('Usuario eliminado.', 'ok'); abrirUsuarios(); }
            catch (e) { aviso('Usuarios: ' + e.message, 'error'); }
        }
async function abrirPerfil__p() {
            cerrarMenus(); const s = sesionActual(); if (!s) { aviso('Inicia sesión primero.', 'error'); return; }
            const loc = s.origen === 'local', p = loc ? Object.assign({ nombre: 'Administrador', apellidos: '', iniciales: '' }, perfilLocal()) : s;
            const r = await dialogo('<i class="fa-solid fa-id-badge text-blue-600 mr-1.5"></i>Mi perfil', `<div class="space-y-2"><p class="text-[11px] text-slate-500">Usuario <b class="font-mono">${esc(s.usuario)}</b> · ${esc(trad(ROLES[s.rol]))}${loc ? ' · administrador local (se guarda en este navegador)' : ''}</p>
                <label class="block">Nombre <input id="pf-n" class="border rounded p-1 w-full" value="${esc(p.nombre || '')}"></label><label class="block">Apellidos <input id="pf-a" class="border rounded p-1 w-full" value="${esc(p.apellidos || '')}"></label>
                <label class="block">Iniciales para el cajetín (máx. 6) <input id="pf-i" maxlength="6" class="border rounded p-1 w-24 uppercase" value="${esc(p.iniciales || '')}"></label>
                <p class="text-[10px] text-slate-400">Las iniciales se ponen en «Dibujado por» de los proyectos nuevos y al firmar planos; si están vacías se usa el nombre completo.</p></div>`,
                [{ texto: 'Guardar', valor: 'si', clase: 'bg-blue-600 hover:bg-blue-700 text-white' }, { texto: 'Cambiar mi contraseña...', valor: 'clave' }, { texto: 'Cancelar', valor: null }]);
            if (r === 'clave') return cambiarClaveAdmin();
            if (r !== 'si') return;
            const n = valorCampo('pf-n').trim(), a = valorCampo('pf-a').trim(), i = valorCampo('pf-i').trim().toUpperCase();
            if (!n) { aviso('El nombre no puede quedar vacío.', 'error'); return; }
            if (loc) { try { localStorage.setItem('piping-perfil-local', JSON.stringify({ nombre: n, apellidos: a, iniciales: i })); } catch (e) { } aviso('Perfil guardado en este navegador.', 'ok'); pintarInsignia(); return; }
            try { const u = await rpcUsuarios('piping_perfil_actualizar', { p_token: s.token, p_nombre: n, p_apellidos: a, p_iniciales: i }); Object.assign(s, u); guardarSesion(s, sesionRecordada()); pintarInsignia(); aviso('Perfil actualizado.', 'ok'); }
            catch (e) { aviso(e.sinFuncion ? 'Falta ejecutar supabase/06_sesion_perfil_registro.sql.' : e.message, 'error'); }
        }
async function abrirRegistro__p() {
            cerrarMenus(); const s = sesionActual();
            if (!tienePermiso('usuarios')) { aviso('Solo un administrador puede ver el registro de actividad.', 'error'); return; }
            if (s.origen !== 'supabase') { if (await conectarUsuariosSupabase()) abrirRegistro(); return; }
            try { registroDatos = await rpcUsuarios('piping_registro_listar', { p_token: s.token, p_limite: 1000 }) || []; }
            catch (e) { aviso(e.sinFuncion ? 'Falta ejecutar supabase/06_sesion_perfil_registro.sql.' : 'Registro: ' + e.message, 'error'); return; }
            const us = [...new Set(registroDatos.map(x => x.usuario))].sort();
            document.getElementById('red-content').innerHTML = `<div class="flex gap-2 mb-2 text-xs"><input id="rg-q" placeholder="Filtrar: usuario, acción, proyecto, detalle" class="border rounded p-1.5 flex-1" oninput="pintarRegistro()"><select id="rg-u" class="border rounded p-1" onchange="pintarRegistro()"><option value="">Todos los usuarios</option>${us.map(u => `<option>${esc(u)}</option>`).join('')}</select></div><div id="rg-lista" class="overflow-auto" style="max-height:60vh"></div>`;
            document.getElementById('red-footer').innerHTML = `<div class="flex gap-2 w-full text-xs"><button onclick="exportarRegistro()" class="px-3 py-1.5 border rounded"><i class="fa-solid fa-file-excel mr-1"></i>Excel</button><span class="text-slate-400 self-center">Últimas ${registroDatos.length} anotaciones</span><span class="flex-1"></span><button onclick="cerrarModalRed()" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium">Cerrar</button></div>`;
            document.querySelector('#modal-red h3 span').innerHTML = '<i class="fa-solid fa-clipboard-list text-blue-600 mr-1.5"></i> Registro de actividad';
            document.querySelector('#modal-red > div').style.width = 'min(1150px, 97vw)';
            document.getElementById('modal-red').style.display = 'flex';
            pintarRegistro();
        }
function registroFiltrado() { const q = valorCampo('rg-q').toLowerCase(), u = valorCampo('rg-u'); return registroDatos.filter(x => (!u || x.usuario === u) && (!q || [x.usuario, x.nombre, x.accion, x.detalle, x.proyecto].join(' ').toLowerCase().includes(q))); }
function pintarRegistro() {
            const c = document.getElementById('rg-lista'); if (!c) return; const f = registroFiltrado();
            c.innerHTML = f.length ? `<table class="w-full text-[11px]"><thead class="sticky top-0 bg-white"><tr class="text-left text-slate-500"><th class="py-1">Fecha</th><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Acción</th><th>Proyecto</th><th>Detalle</th></tr></thead><tbody>${f.slice(0, 400).map(x => `<tr class="border-t border-slate-100 ${/fallido/.test(x.accion) ? 'text-rose-700' : ''}"><td class="py-0.5 pr-2 whitespace-nowrap">${fechaHora(x.fecha)}</td><td class="pr-2 font-mono">${esc(x.usuario)}</td><td class="pr-2">${esc(x.nombre || '')}</td><td class="pr-2">${esc(ROLES[x.rol] || x.rol || '')}</td><td class="pr-2 font-medium">${esc(x.accion)}</td><td class="pr-2">${esc(x.proyecto || '')}</td><td>${esc(x.detalle || '')}</td></tr>`).join('')}</tbody></table>` : '<p class="text-slate-400 italic">Sin anotaciones.</p>';
        }
async function exportarRegistro() {
            let X; try { X = await cargarXLSX(); } catch (e) { aviso(e.message, 'error'); return; }
            const wb = X.utils.book_new();
            X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([['Fecha', 'Usuario', 'Nombre', 'Rol', 'Acción', 'Proyecto', 'Detalle'], ...registroFiltrado().map(x => [fechaHora(x.fecha), x.usuario, x.nombre, ROLES[x.rol] || x.rol, x.accion, x.proyecto, x.detalle])]), 'Registro');
            X.writeFile(wb, 'registro_actividad_PIPING.xlsx');
        }
PARTES_OK.admin = true;
