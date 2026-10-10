# LIMPFINC — Especificación v2 (consolidada)

PWA para iPhone que planifica y registra la limpieza de fincas rústicas con tractor, minimizando tiempo y combustible.
Fecha: 10/10/2026 · Base: LIMPFINC.txt + revisión conjunta.

---

## 1. Equipo y parámetros por defecto (editables en Ajustes)

| Parámetro | Valor | Notas |
|---|---|---|
| Tractor | New Holland TN95F, 95 CV @ 2000 rpm | |
| Radio de giro mínimo (R) | 4,0 m | Con el apero enganchado |
| Maniobras con marcha atrás | Sí | Habilita giros en K |
| Apero 1 | Desbrozadora de cadenas, trasera centrada, 1700 mm | |
| Distancia iPhone → centro del apero | 2,0 m hacia atrás | Corrección de la posición de corte |
| Velocidad de trabajo | 2,5 km/h (por defecto) | Se sustituye por la media GPS real |
| Consumo | 5 L/h (por defecto) | Calibrable (ver 7) |
| Solape entre pasadas (finca abierta) | 0,10 m | Ancho efectivo = 1,60 m |
| Umbral de desviación | 1,0 m | Ver 6.3 |
| Ancho tractor | 1,7 m | Desfase del linde medido con tractor |
| Longitud tractor + apero | 5,0 m | Cálculo de cabecera necesaria |
| Pendientes | No se consideran | |
| Cobertura de datos | Buena | Mapas online, sin modo offline |

---

## 2. Tipos de finca

1. **Abierta**: sin árboles.
2. **Monte/plantación**: árboles en malla 3500 × 3500 mm (editable).

---

## 3. Definición del linde

### 3.1 Métodos

- **A pie** (precisión máxima con el iPhone): el recorrido GPS es el linde.
- **Con tractor**: el tractor siempre circula por dentro de la finca, así que el polígono se desplaza **hacia fuera** de forma automática y no hace falta indicar el lado. Desfase: ancho del tractor / 2 + holgura (por defecto 0,85 + 0,50 = 1,35 m).
- **Importar del Catastro o del SIGPAC** (referencia catastral). Sirve como punto de partida; la precisión en rústica es baja.
  - Si el servicio no permite la descarga directa desde el navegador (CORS), se importa un archivo GML o KML descargado de la Sede.
- **Edición manual**: arrastrar vértices sobre la ortofoto.

### 3.2 Filtrado del recorrido

- Se descartan los puntos cuya precisión sea peor que un umbral (por defecto 8 m).
- Se suaviza el recorrido y se simplifica (Douglas-Peucker, 1,0 m; se fusionan los vértices a menos de 2 m).
- El polígono se cierra automáticamente.

### 3.3 Zonas de exclusión

Se pueden dibujar polígonos que no se recorren: rocas, pozos, zonas que no se pueden pisar.

---

## 4. Cálculos base

- **Coordenadas**: plano local métrico (ENU) centrado en la finca, para todos los cálculos.
- **Área de la finca**: polígono menos las zonas de exclusión.
- **Tiempo estimado**: `t = L_ideal / v + Σ t_giro`.
  - Tiempos de giro por defecto: U = 20 s, Ω = 30 s, K = 40 s.
  - Se recalibran con los registros reales.
- **Combustible estimado**: `C = t × consumo (L/h)`. La banda de ±10 % se muestra mientras no haya calibración.

---

## 5. Planificación de la trayectoria ideal (en azul)

### 5.1 Giros (R = 4 m, separación entre pasadas d)

| Tipo | Cuándo se usa | Exige |
|---|---|---|
| **U** (semicírculo) | d ≥ 2R = 8 m | Cabecera ≈ R + longitud trasera |
| **Ω** (bulbo) | d < 8 m, con cabecera suficiente | Más cabecera |
| **K** (marcha atrás) | d < 8 m, con poca cabecera | Mínima cabecera, más tiempo |

El planificador calcula el coste (tiempo) de cada transición entre pasadas. Después ordena las pasadas para minimizar el coste total: heurística de vecino más próximo + mejora 2-opt.

### 5.2 Finca abierta

1. **Vueltas perimetrales** primero, para dejar espacio de giro. El número de vueltas es `ceil(cabecera necesaria / 1,60 m)`, normalmente 3–4.
2. **Pasadas interiores paralelas**:
   - Se prueba la dirección de 0° a 179°, en pasos de 1°.
   - Se elige la de menor coste total (longitud + giros).
3. **Fincas con entrantes (cóncavas)**: se dividen en celdas (boustrophedon). Cada celda se planifica por separado y después se ordenan las celdas.

### 5.3 Monte/plantación

1. **Malla de árboles**:
   - El usuario marca tres árboles de esquina:
     - **A**: origen.
     - **B**: en la misma fila que A.
     - **C**: en la dirección transversal.
   - Indica el **número de árboles** entre A–B y entre A–C.
   - La app genera la malla, que puede no ser ortogonal, y la recorta con el linde.
   - Se pueden editar árboles individuales: faltas, desplazados.
2. **Calle**:
   - Separación entre filas: 3,5 m.
   - Holgura al tronco: 0,30 m a cada lado.
   - Ancho útil de la calle: 2,90 m.
3. **Dos pasadas por calle con superposición**:
   - Centros de las pasadas a 1,15 m y a 2,35 m de la fila. Separación entre ambas: 1,20 m.
   - Superposición entre las dos pasadas: 0,50 m.
   - Queda sin limpiar una franja de 0,60 m sobre cada fila (≈17 % de la superficie). Es inevitable con la holgura de 0,30 m.
4. **Orden de las pasadas**:
   - Como las pasadas de una misma calle están a 1,20 m (< 8 m), no se encadenan con un giro en U.
   - El planificador alterna calles para conseguir d ≥ 8 m cuando la cabecera lo permite. Si no, usa giros en Ω o en K.
5. **Cabecera disponible**: la distancia del último árbol de cada fila al linde. Se calcula por fila y decide el tipo de giro.

### 5.4 Implementación F2 (finca abierta)

**Cabecera necesaria**

- Fórmula: `offsetApero + √((R + ancho/2)² + voladizo²) + 0,3 m`.
- El voladizo delantero, medido desde el eje trasero, es `long. tractor+apero − offsetApero − 0,5 m`.
- Con los datos actuales sale ≈ 7,8 m, que corresponden a 5 vueltas perimetrales.
- Sin marcha atrás se dimensiona para giros Ω, y la cabecera sube a ≈ 14 m.

**Geometría**

- Recortes y desplazamientos con Clipper (clipper-lib 6.4.2).
- Vueltas perimetrales en espiral hacia dentro.
- Una vuelta alrededor de cada exclusión, con un margen de 0,30 m.
- Pasadas recortadas contra el interior menos las exclusiones (ampliadas en ancho/2 + margen). Así las fincas cóncavas se resuelven sin dividirlas en celdas.

**Dirección de las pasadas**

- Se prueban los rumbos de 0° a 179° y los paralelos a los 3 lados más largos del linde.
- Las 6 mejores direcciones se optimizan por completo.

**Orden de las pasadas**

- Matriz de costes (tiempo) entre los extremos de las pasadas, en ambos sentidos.
- Solución inicial: vecino más próximo y boustrophedon. Mejora: 2-opt con inversión de sentido.

**Transiciones**

| Tipo | Cuándo | Longitud |
|---|---|---|
| U | d ≥ 2R | πR + (d − 2R) |
| K (marcha atrás) | d < 2R | πR + (2R − d), + 2 cambios de sentido |
| Ω (sin marcha atrás) | d < 2R | R(π + 4θ) |
| Rodeo de exclusión | Pasada partida por una exclusión | Por el anillo de la exclusión |
| Traslado | Resto de casos | Por la cabecera |

**Tiempo**

- Fórmula: `L_trabajo/v + L_giros/v_giro + L_traslado/v_traslado + maniobras`.
- Maniobras: cambios de sentido, inicio de traslado y esquinas de más de 45°.

**Cobertura teórica**

- Unión de las franjas de 1,70 m de todas las pasadas de trabajo.
- Las zonas no alcanzadas se pueden mostrar en naranja.

**Parámetros nuevos**

| Parámetro | Valor |
|---|---|
| Velocidad en giros | 3 km/h |
| Velocidad en traslados | 5 km/h |
| Cambio de sentido | 4 s |
| Maniobra al iniciar traslado | 20 s |
| Esquina | 15 s |
| Margen a exclusiones | 0,30 m |

---

## 6. Fase de trabajo

### 6.1 Registro

- **Pantalla siempre encendida** (Wake Lock).
- Botón grande **«Apero en trabajo / levantado»**:
  - Solo se acumula superficie con el apero en trabajo.
  - Las maniobras con marcha atrás se hacen con el apero levantado.
- **Posición de corte** = posición GPS − 2,0 m según el rumbo. El rumbo se calcula a partir de los últimos 3 m del recorrido suavizado.
- **Descartes**:
  - Puntos con velocidad < 0,3 km/h.
  - Puntos con precisión peor que el umbral.

### 6.2 Colores

| Elemento | Color |
|---|---|
| Trayectoria ideal | Azul |
| Trayectoria real | Violeta |
| Tramos desviados | Rojo |
| Área de la finca | Verde claro |
| Área real limpia | Verde oscuro |
| Solape (área pasada ≥ 2 veces) | Amarillo |
| Área pendiente | Sin relleno / gris |

### 6.3 Desviación

Un tramo es rojo si la distancia lateral a la trayectoria ideal supera `max(umbral, precisión GPS del punto)`.

### 6.4 Cobertura (área real limpia)

- Se calcula sobre una **cuadrícula de 0,25 m**.
- Cada posición de corte marca las celdas que cubre el ancho de 1,70 m.
- Cada celda cuenta las veces que se ha pasado, lo que da directamente el área limpia y el solape.

---

## 7. Indicadores

| Indicador | Fórmula |
|---|---|
| Eficiencia de trayectoria | η = L_ideal / L_real |
| Cobertura | Área limpia / área objetivo |
| Solape | Área con ≥ 2 pasadas / área limpia |
| Desviación de área | Área objetivo − área limpia (m² y %) |
| Desviación de trayectoria | % de longitud en rojo, desviación media y máxima |
| Rendimiento | ha/h real y L/ha |

**Calibración del consumo**:
- Al repostar se introducen los litros.
- L/h = litros / horas de trabajo registradas desde el último repostaje.
- Se usa la media de los repostajes.

---

## 8. Filtros de visualización

Capas que se pueden activar o desactivar por separado:
- Linde
- Exclusiones
- Árboles
- Trayectoria ideal
- Trayectoria real
- Desviaciones
- Área de la finca
- Área limpia
- Solape
- Área pendiente

Además:
- **Combinaciones guardables** como filtro personalizado, con nombre.
- **Comparación de sesiones** de una misma finca.

---

## 9. Mapa y datos

- **Fondos**: ortofoto PNOA (IGN) y OpenStreetMap.
- **Almacenamiento**: IndexedDB.
  - Fincas, sesiones, recorridos, ajustes y repostajes.
  - No se usa localStorage, porque los recorridos son grandes.
- **Exportar**: GPX, KML, DXF y GeoJSON; copia de seguridad en JSON.
- **Importar**: copia de seguridad en JSON, GML/KML del Catastro.
- **Histórico** de trabajos por finca.

---

## 10. Arquitectura

- PWA en un único HTML autocontenido, más `manifest` y `service worker` (instalable en iPhone).
- Tema claro.
- Leaflet para el mapa.
- Cálculos geométricos propios en plano local.

---

## 11. Fases de desarrollo

| Fase | Contenido |
|---|---|
| F1 | Fincas, medición del linde (a pie, con tractor, manual), exclusiones, área, fondos de mapa, almacenamiento |
| F2 | Planificador de finca abierta (perímetro + pasadas + giros U/Ω/K), estimación de tiempo y combustible |
| F3 | Fase de trabajo: registro, cobertura, desviaciones, indicadores, calibración del consumo |
| F4 | Monte: malla de árboles, planificador de dos pasadas por calle |
| F5 | Filtros personalizados, histórico, exportación e importación, Catastro y SIGPAC |

---

## 12. Limitaciones asumidas

- **Precisión del GPS del iPhone**: 3–5 m en campo abierto y 5–10 m bajo copa. La cobertura y las desviaciones son aproximadas. Entre filas de árboles se conduce de forma visual.
- **Sin Bluetooth en iOS Safari**: no se puede conectar un GNSS RTK externo.
- **El GPS se detiene en segundo plano**: hace falta la pantalla encendida y el iPhone cargando en la cabina.
- **El consumo es una estimación** mientras no se calibre.
