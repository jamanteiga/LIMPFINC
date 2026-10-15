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

### 3.0 Alta de finca

1. Se pide solo el **nombre** de la finca.
2. Si ya existe en la base de datos (sin distinguir mayúsculas, tildes ni espacios), se abre esa finca.
3. Si no existe, se pide el **tipo** (abierta o monte) y la **medición del linde**: a pie o con tractor. También se puede dejar para más tarde.
4. No se usa identificación catastral.

### 3.1 Métodos

- **A pie** (precisión máxima con el iPhone): el recorrido GPS es el linde.
- **Con tractor**: el tractor siempre circula por dentro de la finca, así que el polígono se desplaza **hacia fuera** de forma automática y no hace falta indicar el lado. Desfase: ancho del tractor / 2 + holgura (por defecto 0,85 + 0,50 = 1,35 m).
- **Edición manual**: arrastrar vértices sobre la ortofoto.

**Control de la medición**

- La medición empieza en **Preparado** y no graba nada.
- **▶ Iniciar**: marca en el mapa el punto actual («I») y registra el trazado mientras se avanza.
- **⏸ Pausar**: deja de registrar.
- **▶ Continuar**: el trazado sigue desde el último punto registrado.
- **■ Parar**: cierra el linde y muestra el resultado para guardarlo.
- «Cancelar y descartar» queda como enlace discreto.
- **A pie**: se camina por el borde de la finca; es la medición más precisa y se guarda sin desplazamiento.
- **Con tractor**: se circula por el interior junto al borde; el polígono se desplaza hacia fuera medio ancho del tractor + holgura.
- El modo trabajo usa los mismos botones.

**Indicador GPS**

- Siempre visible en la esquina superior izquierda del mapa: punto **verde = GPS activo** (con la precisión), **rojo = inactivo**, buscando señal, sin permiso o sin https.
- Al tocarlo se abre «Estado del GPS»: coordenadas, precisión, altitud, velocidad, rumbo, número de lecturas, si la conexión es https y el error con instrucciones si falla.
- También se abre desde «📡 GPS» en la pantalla de inicio y desde Ajustes.
- Al volver la app a primer plano, si el GPS se ha quedado parado, se reinicia solo.

### 3.2 Filtrado del recorrido

- Se descartan los puntos cuya precisión sea peor que un umbral (por defecto 8 m).
- Se suaviza el recorrido y se simplifica (Douglas-Peucker, 1,0 m; se fusionan los vértices a menos de 2 m).
- El polígono se cierra automáticamente.

### 3.3 Zonas de exclusión

Se pueden dibujar polígonos que no se recorren: rocas, pozos, zonas que no se pueden pisar.

### 3.4 Precisión con el iPhone 16 (v0.9)

**GPS del iPhone 16**

- Recibe GPS, GLONASS, Galileo, QZSS y BeiDou, en una sola frecuencia (L1).
- La doble frecuencia solo está en el 16 Pro.
- Precisión esperable: 3–5 m a cielo abierto, más bajo arbolado.

**📍 Esquina** (mientras se mide el linde)

- Quieto 20 s en la esquina; la app hace la media ponderada por precisión.
- Precisión declarada: no se da por mejor que la mitad de la precisión media, porque los errores del GPS están correlados.
- Las esquinas sustituyen al vértice cercano (< 10 m) o se insertan en el lado más próximo.
- Entre esquinas, los lados se simplifican con tolerancia de 2 m.
- Si solo hay esquinas (con la grabación en pausa entre ellas), el polígono son las esquinas en orden.

**Filtro de Kalman** (velocidad constante, densidad de aceleración 0,5 m²/s³, R = precisión² / 2)

- En tiempo real: modo trabajo, con rechazo de saltos > 5σ y reinicio tras 3 rechazos seguidos.
- En diferido: suavizado hacia delante y hacia atrás (Rauch-Tung-Striebel) del recorrido del linde.

**Umbral de desvío automático**

- Umbral = máx(umbral mínimo, 1,5 × σ del filtro).
- Lo usan la barra de luces, la voz y las estadísticas.

**Simulación** (finca de 100 × 60 m, error del GPS correlado)

- Área del linde con un error RMS de ≈ 1,5–2,5 %, por recorrido continuo o por esquinas.
- Desvíos falsos: 37 % del recorrido con umbral fijo de 1 m → 7 % con umbral automático.
- Con el GPS del iPhone, la cobertura y el solape a escala de 1,7 m son orientativos.

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

### 5.5 Implementación F4 (monte)

**Malla de árboles**

- Se marcan los árboles A, B y C tocando en la ortofoto o con el GPS promediado 15 s (ponderado por precisión).
- Se indica cuántos árboles hay en A–B y en A–C.
- La plantación es el paralelogramo A–B–C, recortado por el linde y las exclusiones.
- Opción de usar la separación nominal con la orientación medida.
- Las faltas de árboles se marcan tocando el árbol; no cambian las calles.

**Pasadas**

- Paralelas a las filas (dirección A→B).
- En cada calle, centros a holgura + ancho/2 y a separación − holgura − ancho/2 (1,15 y 2,35 m).
- Fuera de la plantación, pasadas normales hasta la cabecera.

**Cabecera**

- Las vueltas perimetrales se limitan por la distancia libre entre los árboles y el linde.
- Si no cabe la cabecera completa, se avisa.

**Cobertura**

- Se informa de la franja de árboles no accesible (holgura alrededor de cada fila) y de la cobertura alcanzable.

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

### 6.5 Implementación F3

**Trabajos y sesiones**

- Un trabajo agrupa varias sesiones. Cada pausa cierra una sesión y al reanudar empieza otra.
- Un trabajo puede quedar **abierto** para continuarlo otro día; al continuar, la cobertura se reconstruye a partir de los puntos guardados.
- Se guarda automáticamente cada 20 s.

**Seguimiento**

- Rumbo: dirección de los últimos 3 m de recorrido.
- Posición de corte: posición GPS − 2,0 m según el rumbo.
- Se descartan los saltos del GPS de más de 8 m/s.
- La desviación se mide contra el tramo del plan que toca en ese momento: ventana de −15 m a +60 m a lo largo del plan. Si se supera 6 m, se busca en todo el plan.

**Cobertura**

- Rejilla de 0,25 m (se agranda automáticamente en fincas muy grandes).
- Una celda cuenta una pasada nueva solo si han pasado más de 15 s desde la anterior; así se calcula el solape.

**Pantalla de trabajo**

- Indicadores: km/h, desvío lateral (izquierda/derecha), % limpio, tiempo, litros, η.
- Botón grande «Apero en trabajo / levantado».
- Botones Pausa y Terminar (finalizar, dejar abierto o registrar repostaje).

**Calibración del consumo**

- Al repostar hasta llenar el depósito: L/h = litros / horas de motor registradas desde el último lleno.
- Opción «Usar consumo calibrado»: aplica la media de los últimos 5 repostajes.

### 6.6 Guiado en cabina (v0.8)

**Barra de luces**

- 15 celdas. El centro se enciende en verde si se va sobre la línea.
- Las celdas laterales se encienden según el desvío, a escala ±2 × umbral: verde hasta el umbral, naranja hasta 2×, rojo por encima.
- Texto «◀ Corrige / Corrige ▶ x,x m».
- Información de pasada: «Pasada k de N · fin en X m» o «Vuelta k de M».
- Maniobra siguiente: «Después: giro U / giro K / traslado, lado → pasada».

**Avisos por voz** (síntesis de voz del iPhone, es-ES, sin internet)

- Inicio, pausa y continuación del trabajo.
- Apero en trabajo / levantado.
- Cada pasada o vuelta nueva.
- 10 m antes del fin de pasada, con la maniobra siguiente y su lado.
- Desvío mayor que el umbral mantenido más de 3 s (repite como máximo cada 8 s). Solo cuenta en tramo recto alineado con el plan: no en esquinas, giros ni en los primeros 6 m de la pasada.
- Señal GPS perdida / recuperada.
- Solo se avanza en el plan: los cruces sobre tramos ya hechos (por ejemplo, en la cabecera) no generan avisos.

**Pantalla de trabajo**

- Botones grandes.
- Modo **alto contraste** (☀️) para pleno sol: bordes negros, cifras más grandes, barra de luces más alta.
- La posición se centra en la parte visible del mapa, por encima del panel.
- Voz y contraste se activan o desactivan desde el propio panel o desde Ajustes.

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

### 8.1 Implementación F5

**Capas**

- Botón 🗂, con 10 capas que se activan o desactivan por separado.
- Selector del trabajo que se muestra.
- Filtros predefinidos: Todo, Plan, Ideal vs real, Cobertura.
- Filtros personalizados con nombre (se guardan y se pueden borrar).

**Menú ⋯ de la finca**

- Capas.
- Histórico de trabajos: ver en el mapa, resumen, continuar, finalizar, eliminar y tabla comparativa.
- Malla de árboles.
- Exportar.
- Repostaje.
- Editar finca.

**Exportación**

| Formato | Contenido |
|---|---|
| DXF R12 | ETRS89 / UTM (huso automático, 29N en Galicia), una capa por elemento |
| KML | Carpetas Finca / Plan / Real |
| GPX | Linde, plan y trabajo con hora y precisión |
| GeoJSON | Linde, exclusiones y plan |
| CSV | Puntos GPS del trabajo |

La copia de seguridad JSON incluye fincas, trabajos, repostajes y filtros.

---

## 9. Mapa y datos

- **Fondos** (solo libres):
  - **OpenStreetMap**, por defecto.
  - OpenTopoMap.
  - La ortofoto PNOA se ha retirado (v1.0).
  - La app recuerda el último fondo elegido.
- **Almacenamiento**: IndexedDB.
  - Fincas, sesiones, recorridos, ajustes y repostajes.
  - No se usa localStorage, porque los recorridos son grandes.
- **Exportar**: GPX, KML, DXF y GeoJSON; copia de seguridad en JSON.
- **Importar**: copia de seguridad en JSON.
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
| F5 | Filtros personalizados, histórico, exportación e importación |

---

## 12. Limitaciones asumidas

- **Precisión del GPS del iPhone**: 3–5 m en campo abierto y 5–10 m bajo copa. La cobertura y las desviaciones son aproximadas. Entre filas de árboles se conduce de forma visual.
- **Sin Bluetooth en iOS Safari**: no se puede conectar un GNSS RTK externo.
- **El GPS se detiene en segundo plano**: hace falta la pantalla encendida y el iPhone cargando en la cabina.
- **El consumo es una estimación** mientras no se calibre.

## 13. Datos en Supabase y catálogo (v1.0)

### Almacenamiento

- **Supabase** (`wuarkraddnndmgvfnkmm`), con inicio de sesión por email y contraseña de un único usuario.
- RLS: cada fila solo es visible y editable por su propietario (`user_id = auth.uid()`).
- Tablas: `fincas` y `trabajos` (con un campo JSON), `tractores`, `aperos`, `velocidades` y `ajustes`. El script está en `app/supabase_limpfinc.sql`.
- GitHub Pages solo aloja la app; no se puede escribir en él.

### Sincronización

**Local primero:**
- Todo se guarda al instante en el iPhone (IndexedDB).
- Cada cambio se anota en una cola y se sube a Supabase a los ~2,5 s.
- Durante el trabajo, la subida se agrupa cada 90 s.
- Sin conexión, se acumula y se sube al volver la cobertura.

**Bajada:**
- Al abrir la app y al volver a primer plano (como mucho una vez por minuto).
- Se descargan solo los registros con fecha más reciente; gana el último cambio.
- Lo borrado en otro dispositivo se borra también en local.
- Lo creado antes de iniciar sesión (por ejemplo, «A Gándará») se sube automáticamente.

**Indicador en la cabecera:**

| Icono | Significado |
|---|---|
| ☁️✓ | Sincronizado |
| ☁️n | n cambios pendientes de subir |
| ☁️⟳ | Sincronizando |
| ☁️✕ | Sin conexión |
| ☁️⚠️ | Error |

Al tocarlo se abre «Cuenta y sincronización».

### Catálogo

- **Tractores:** modelo, CV, ancho, longitud sin apero, radio de giro, depósito, marcha atrás.
- **Aperos:** nombre, labor, ancho, longitud, enganche, distancia iPhone → apero, desplazamiento lateral, solape, velocidad típica, consumo (L/h), CV necesarios, toma de fuerza.
- Cada uno puede marcarse como predeterminado para fincas nuevas.
- Por defecto: New Holland TN95F y desbrozadora de cadenas de 1,70 m.
- **Velocidades estándar** por labor (desbroce, trituración, siega, grada, arado, cultivador, fresado, otra) × vegetación (ligera, media, densa). Valores orientativos editables.

### Finca

- Cada finca tiene su configuración: tipo, tractor, apero, vegetación y **velocidad de trabajo (3 km/h por defecto)**.
- Se muestra la velocidad estándar de la combinación labor × vegetación, con un botón «usar».
- Al cambiar la configuración, el plan se **recalcula** automáticamente. También desde ⋯ › Recalcular plan.
- Cada trabajo guarda la configuración con la que se hizo, para que el histórico no cambie.
- El consumo calibrado en los repostajes se guarda en el apero de la finca.

### Navegación

- Fincas ilimitadas: «＋ Nueva finca» en la lista, en ⋯ › Nueva finca y en el selector del título (▾).
- «‹ Fincas» ya no se bloquea: si hay una medición o edición a medias, pregunta si descartarla.
- Durante el trabajo pide pulsar Parar.
- **Encuadre automático** al abrir la finca, al guardar el linde y al girar la pantalla. Usa el espacio libre entre la cabecera y el panel inferior, con zoom fraccionario (pasos de 0,25), en iPhone, iPad, tablet o Android.

### v1.0.1 · Gestión de fincas, recálculo y diagnóstico

**Lista de fincas**

- Botón **⋯** en cada finca: Abrir, Editar, Recalcular plan, Copiar, Eliminar.
- Buscador cuando hay más de 4 fincas.
- Aviso de estado de la nube: librería no cargada, sin sesión, error o cambios pendientes.
- Marca «sin subir» en las fincas que aún no están en Supabase.

**Copiar finca**

- Duplica linde, exclusiones, malla, plan y configuración. No copia los trabajos.
- Propone el nombre «(copia)» y comprueba que no esté repetido.

**Recalcular plan** (desde la lista, desde ⋯ de la finca o desde Plan)

- Parámetros: velocidad de trabajo, tractor, apero, solape, velocidad en giros, consumo (L/h), vueltas de cabecera y rumbo de las pasadas.
- Muestra el plan actual y el nuevo, con la diferencia en minutos y litros, rendimiento, pasadas y giros.
- Solape, consumo y velocidad en giros se guardan como ajustes propios de la finca (`config.solape`, `config.consumo`, `config.velGiro`) si difieren de los del apero o los generales.

**🩺 Diagnóstico de Supabase** (☁️ › Cuenta, o tocando ☁️⚠️)

- Comprueba: librería cargada, conexión, sesión, que existan las 6 tablas (con número de filas), escritura de prueba, fincas subidas frente a fincas en el móvil y cola de cambios pendientes.
- Botón «⬆️ Subir todo ahora».

## 14. Comodidad de uso (v1.1)

**1. Recuperación**

- El estado «en marcha» se guarda en el móvil: el trabajo al pulsar Iniciar o Continuar, y la medición del linde cada 5 puntos.
- Si la app se cierra (bloqueo, batería, cierre accidental), al abrirla pregunta «⏯ Hay algo a medias»: Continuar donde lo dejé / Descartar.
- Se ofrece durante 72 h.

**2. Pausa automática**

- Si el tractor está parado más de `autoPausa` s (120 por defecto; 0 la desactiva), se pausa con aviso de voz.
- Se reanuda solo al moverse más de máx(6 m, 1,5 × precisión), en una sesión nueva.

**3. Última finca**

- Tarjeta «▶ Continuar con …» arriba de la lista.

**4. Deshacer** (6 s)

- Disponible al eliminar una finca (con sus trabajos y fotos), una exclusión, un vértice, un trabajo o una foto.

**5. Ferrados**

- La superficie se muestra también en ferrados.
- Ferrado configurable en Ajustes › Unidades (436 m² por defecto, el de Abegondo; varía según la comarca).

**6. Mapa de todas las fincas** («🗺 Ver todas las fincas en el mapa»)

- Color por estado:
  - Verde: limpia (último trabajo cerrado con cobertura ≥ 85 %).
  - Naranja: trabajo en curso.
  - Azul: con plan, sin limpiar.
  - Gris: pendiente.
- Nombre sobre cada finca. Al tocarla: estado, superficie, plan, Tiempo y Abrir.

**9. Tiempo (5 días)** — Open-Meteo, libre, sin clave

- Datos: estado del cielo, temperatura máxima/mínima, lluvia (mm y %), viento y rachas.
- Valoración para desbrozar:

| Valoración | Criterio |
|---|---|
| ❌ Lluvia | ≥ 5 mm o probabilidad ≥ 70 % |
| ⚠️ Viento fuerte | Rachas ≥ 50 km/h o viento ≥ 35 km/h |
| ⚠️ Terreno húmedo | ≥ 15 mm en las 48 h anteriores |
| 🟡 Posible lluvia | ≥ 1 mm o probabilidad ≥ 40 % |
| ✅ Apto | Resto |

- Caché de 1 h por finca.

**13. Notas y fotos por finca**

- Notas de texto libre.
- Fotos tomadas con la cámara, reducidas a 1280 px (JPEG al 72 %), con descripción y posición GPS si hay señal.
- Las fotos aparecen en el mapa (📷).
- Se sincronizan con la tabla `fotos` de Supabase (ver `supabase_limpfinc_v110.sql`). Si la tabla no existe, el resto sigue sincronizando.

## 15. Implementación v1.2.0 — Importar / exportar y acciones visibles

- Cada tarjeta de la lista tiene botones directos: ✎ Editar · ⧉ Copiar · 📤 Exportar · 🗑 Eliminar (con deshacer) · ⋯ (resto de opciones).
- Botón **📥 Importar finca** en la parte superior de la lista (también con la lista vacía).
- Formatos admitidos al importar:
  - `.limpfinc.json` de una finca (incluye trabajos y fotos).
  - Copia de seguridad completa de LIMPFINC (`fincas[]`).
  - GeoJSON (FeatureCollection, Feature, Polygon, MultiPolygon, LineString); los huecos pasan a exclusiones; nombre desde `nombre`/`name`.
  - Lista de fincas, objeto `{nombre, coords}` o lista de coordenadas (detecta lat/lon o lon/lat).
- Si el nombre ya existe: Crear copia / Reemplazar / Omitir.
- Tractor y apero inexistentes se sustituyen por los predeterminados.
- Exportar finca: `<nombre>.limpfinc.json`, también desde ⋯ y desde Exportar dentro de la finca.

## 16. Implementación v1.2.1 — SIGPAC, importar desde «Nueva finca», velocidad 3 km/h

- «Nueva finca» ofrece, además de escribir el nombre: 📥 Importar finca desde archivo y 🗺 Desde SIGPAC / referencia catastral.
- Paso de medición y menú Linde: añadidos 🗺 Desde SIGPAC y 📥 Desde archivo (solo el contorno).
- SIGPAC: servicio abierto del FEGA (`sigpac-hubcloud.es/ogcapi/collections/recintos/items`), filtrando por provincia, municipio, agregado, zona, polígono, parcela y recinto.
  - La referencia catastral rústica (14 o 20 caracteres) rellena los campos; se deben revisar en zonas de concentración parcelaria.
  - Se listan los recintos con su uso y su superficie. Viales, edificaciones, agua e improductivo salen desmarcados.
  - Los recintos marcados se unen (Clipper, cierre de rendijas de 5 cm); los huecos pasan a exclusiones. Si no son contiguos, se usa la parte mayor.
  - Se guarda `finca.sigpac` y `linde.metodo = 'sigpac'`. El mapa base sigue siendo OpenStreetMap.
- Migración: una velocidad general, de finca o de apero de desbroce de 2,5 km/h pasa a 3 km/h (y se recalcula el plan). Se aplica al arrancar y tras cada sincronización.

## 17. Implementación v1.2.2 — Señalar la finca en el mapa SIGPAC

- «🗺 Finca desde SIGPAC» tiene primero **👆 Señalar la finca en el mapa SIGPAC**.
  - Abre un mapa a pantalla completa (OpenStreetMap u OpenTopoMap) con las parcelas SIGPAC dibujadas en naranja, a partir de zoom 16 (consulta `bbox`).
  - Se centra en el GPS, en el linde de la finca o en la última vista usada.
  - Al tocar una parcela se selecciona (verde) y al tocarla otra vez se quita; se pueden marcar varias.
  - «Usar selección» descarga las parcelas completas y vuelve a LIMPFINC con la lista de recintos para crear la finca o fijar el linde.
- El uso de cada recinto se obtiene de `recinfo` (el servicio OGC no lo trae).
- `finca.sigpac.parcelas[]` guarda todas las parcelas y sus recintos.
- Comprobado desde jamanteiga.github.io: los servicios SIGPAC permiten la consulta desde la app (CORS correcto).
- Corregido: un aviso GPS sin mapa abierto (desde la lista) daba error.

## 18. Implementación v1.3.0 — Punto inicial y punto final del trabajo

- **Plan › Calcular plan**:
  - **Punto de inicio**: Mi posición, Tocar en mapa o 📌 Anterior.
  - **Punto final**: Libre, = Inicio, Tocar en mapa o 📌 Anterior.
  - **Vueltas perimetrales**: Al principio o Al final.
- Al tocar en el mapa se coloca la marca I o F; se puede corregir tocando de nuevo y se confirma con «Usar este punto».
- Planificador:
  - Al coste de cada secuencia se suma el traslado desde la última pasada hasta el punto final, por la cabecera.
  - El 2-opt incluye ese tramo.
  - Con punto final se prueban también los barridos en los dos sentidos y con las dos paridades.
- Con cabeceras **al final**: primero las pasadas y después las vueltas de dentro hacia fuera; la última vuelta empieza y acaba en el vértice más cercano al punto final.
- El plan guarda `inicio`, `fin` y `hlFinal`; «Recalcular» los conserva.
- Prueba (finca de 1 ha, 5 vueltas): libre 142,5 min; fin en otro lado 143,2 min; fin = inicio 143,7 min; cabeceras al final +1 min.

## 19. Implementación v1.3.1 — Inicio y final en una sola pantalla

- Si inicio o final están en «Tocar en mapa», se abre una sola pantalla «Inicio y final» antes de calcular:
  - Selector 🟢 Inicio / 🔴 Final; tras colocar el inicio pasa solo a colocar el final.
  - Las marcas I y F se pueden arrastrar y aparecen colocadas con los puntos de la vez anterior.
  - «Calcular plan» se activa cuando están todos los puntos necesarios.
- Con inicio = Mi posición y final en el mapa, solo se coloca F (la I se fija por GPS).
- El menú del plan dice «🧭 Cambiar dirección, punto de inicio o final».
