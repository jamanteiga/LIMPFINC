// LIMPFINC — ejecuta las pruebas en un iPhone simulado (Chromium + Playwright) contra la app servida en local.
// Uso: cd pruebas && npm install playwright@1.56.0 && npx playwright install chromium && node ejecutar.mjs
import { spawn, execFileSync } from 'child_process';
import * as fs from 'fs'; import * as path from 'path';
const D = path.dirname(new URL(import.meta.url).pathname), RAIZ = path.resolve(D, '..'), TMP = path.join(D, 'tmp');
fs.mkdirSync(TMP, { recursive: true });
const srv = spawn('python3', ['-m', 'http.server', '8765'], { cwd: RAIZ, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1500));
const esperado = { '06-segundo-plano-compresion-errores.mjs': /errores página \(esperados los 2 de prueba\): 2\s*$/m };
let fallos = 0;
for (const f of fs.readdirSync(D).filter(x => /^\d\d-.*\.mjs$/.test(x)).sort()) {
  const t0 = Date.now(); let sal = '', ok = false;
  try { sal = execFileSync('node', [path.join(D, f)], { cwd: TMP, encoding: 'utf8', timeout: 300000, stdio: ['ignore', 'pipe', 'pipe'] }); ok = (esperado[f] || /^errores: \[\]\s*$/m).test(sal); }
  catch (e) { sal = (e.stdout || '') + (e.stderr || '') + e.message; }
  console.log(`${ok ? '✅' : '❌'} ${f} (${Math.round((Date.now() - t0) / 1000)} s)`);
  if (!ok) { fallos++; console.log(sal.split('\n').slice(-25).join('\n')); }
}
srv.kill();
console.log(fallos ? `\n${fallos} prueba(s) fallida(s): NO se publica` : '\nTodas las pruebas correctas');
process.exit(fallos ? 1 : 0);
