#!/usr/bin/env python3
"""Monta index.html y sw.js a partir de index.tpl.html, css/ y src/ (la versión sale de src/00-base.js)."""
import os, re, glob, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V = re.search(r"const VERSION = '([\d.]+)'", open(f'{R}/src/00-base.js', encoding='utf-8').read()).group(1)
src = sorted(os.path.basename(p) for p in glob.glob(f'{R}/src/*.js'))
libs = ['lib/leaflet/leaflet.css', 'lib/leaflet/leaflet.js', 'lib/clipper.js', 'lib/supabase.js']
lazy = ['lib/jspdf.umd.min.js', 'lib/three.min.js', 'lib/xlsx.full.min.js'] + [f'lib/leaflet/images/{os.path.basename(p)}' for p in sorted(glob.glob(f'{R}/lib/leaflet/images/*.png'))]
tpl = open(f'{R}/index.tpl.html', encoding='utf-8').read()
tpl = re.sub(r'<link rel="stylesheet" href="https://cdnjs[^"]+leaflet[^"]+">\n', '', tpl)
tpl = re.sub(r'<script src="https://[^"]+"></script>\n', '', tpl)
head = '<link rel="stylesheet" href="lib/leaflet/leaflet.css">\n<script src="lib/leaflet/leaflet.js"></script>\n<script src="lib/clipper.js"></script>\n<script src="lib/supabase.js"></script>\n' \
       f'<link rel="stylesheet" href="css/limpfinc.css?v={V}">'
html = tpl.replace('<!--CSS-->', head).replace('<!--SCRIPTS-->', '\n'.join(f'<script src="src/{s}?v={V}"></script>' for s in src))
open(f'{R}/index.html', 'w', encoding='utf-8').write(html)
shell = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png', f'./css/limpfinc.css?v={V}', './trabajador-plan.js?v=' + V] \
        + [f'./{l}' for l in libs + lazy] + [f'./src/{s}?v={V}' for s in src]
sw = open(f'{R}/herramientas/sw.tpl.js', encoding='utf-8').read().replace('__VERSION__', V).replace('__SHELL__', ',\n  '.join(repr(x) for x in shell))
open(f'{R}/sw.js', 'w', encoding='utf-8').write(sw)
print(f'LIMPFINC {V}: index.html ({len(src)} módulos) y sw.js ({len(shell)} ficheros en caché)')
