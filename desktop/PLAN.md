# MIO de escritorio — plan y estado

Leé esto antes de seguir. Rama: `escritorio` (sale de `modelos-compiten`, que sale de `paisaje-1826`), subida a `origin`.

## La decisión (15/10/2026)
- MIO como **programa que se descarga y se ejecuta**: sin Python, sin dependencias, sin servidor local ni puertos.
- Formato final desde el día 1, sin etapa intermedia: **ventana Tauri (Rust) + las pantallas React de siempre + motor de análisis en Rust**.
- La planilla nunca sale de la compu; usa la RAM del usuario. El servidor solo verifica cuenta y plan, hace de puente para el chat (la clave de Gemini no va en la app) y sirve actualizaciones firmadas ("Actualizar a la nueva versión").
- La web sigue con el motor de Python para uso liviano.

## Cómo se trabaja (no negociable)
1. **El motor de Python es la referencia.** Cada pieza en Rust se compara contra salidas de Python generadas por un script en `engine/tests/golden/` (`make_golden*.py`, se corren con el entorno del backend).
2. **Igual hasta el redondeo**, salvo Prophet (que se reescribió: a menos de 1 %, porcentajes a menos de 1 punto, y su óptimo tiene que ser igual o mejor que el del Prophet real).
3. **Revisar dos veces:** después de que una prueba pasa, romper a propósito un número del Rust y comprobar que la prueba falla; restaurar.
4. Si la comparación muestra un error del motor de Python, se arregla en los dos (pasó con la estación semanal en series mensuales, los títulos arriba del encabezado, las columnas sí/no en atípicos, la codificación UTF-8, las fechas con año primero y los Excel con título o filas vacías arriba).

## Herramientas
- Rust (rustup por Homebrew). No está en el PATH de la terminal del usuario; en los comandos usar:
  `export PATH=/opt/homebrew/opt/rustup/bin:$HOME/.cargo/bin:$PATH`
- cmake (Homebrew): para compilar LightGBM dentro del programa.
- Entorno de Python de referencia: `desktop/.venv-referencia` (ignorado por git; se rearma con `python3 -m venv desktop/.venv-referencia && desktop/.venv-referencia/bin/pip install -r dashboard-ia/backend/requirements.txt`). Los generadores se corren con `desktop/.venv-referencia/bin/python`.
- **Usar librerías existentes antes de escribir a mano** (Polars, calamine, linfa…) y comparar el resultado final, no cada maña interna (decisión del 16/10).
- **Ordenado y sin redundancia** (18/10): cada regla vive en un solo lugar (en Rust y su par en Python, con el mismo nombre), sin archivos sueltos de diagnóstico ni código muerto.
- Pruebas: `cd desktop && cargo test --release`. Python: `dashboard-ia/backend`, `../../desktop/.venv-referencia/bin/python -m pytest` (93).

## Hecho (motor en Rust, `engine/src/`)
| Pieza | Archivo | Comparación |
|---|---|---|
| Guerra de modelos: Holt-Winters amortiguado, Theta, regresión con rezagos, LightGBM con rezagos; 3 tramos escondidos, promedio de los dos mejores, árbitro, banda, tope de 6 s | `forecast.rs`, `lgbm.rs` | igual (1e-7) — `tests/competencia_igual_a_python.rs` |
| Prophet reescrito (tendencia con quiebres + estaciones, mismos priors, MAP exacto) | `prophet.rs` | < 1 %, óptimo igual o mejor — `tests/prophet_igual_al_real.rs` |
| Lector como pandas. CSV: codificación, separador, títulos arriba, tipos por columna, vacíos, índice implícito. Excel (calamine; .xlsx, .xlsm, .xls, .ods): primera hoja, encabezado en la primera fila con datos (misma regla de títulos que el CSV, `title_rows`), fechas como fechas | `reader.rs` | 25 CSV y 6 Excel iguales a pandas — `tests/lector_igual_a_pandas.rs` |
| Limpieza: vacíos disfrazados, filas/columnas vacías, formato regional, textos (acentos NFC, espacios), duplicados, montos y porcentajes, números en texto, fechas (formato adivinado con la primera, como pandas), tipo de cada columna, atípicos (Tukey), imputación, achicado de memoria | `clean.rs` | 44 planillas (CSV y Excel) iguales a Python paso por paso, más conteos — `tests/limpieza_igual_a_python.rs` |
| Perfil (tipo de cada columna para gráficos y elección, calidad 0-100, columnas sugeridas por `target_score`), gráficos automáticos (`auto_charts`: evolución, promedios y cantidades por grupo, distribución, cajas, correlaciones, relación), números clave y las frases de la limpieza; los números como numpy y pandas (sumas por pares, promedios por grupo con Kahan, `float32`) | `profile.rs`, `charts.rs`, `pynum.rs` | 49 planillas con el análisis completo igual a Python (salvo lo que Python sortea al azar) — `tests/analisis_igual_a_python.rs` |
| Pronóstico completo (`run_forecast`): día/semana/mes, serie de verdad, configuración de Prophet, competencia, árbitro, gráfico y métricas | `forecaster.rs` | 10 planillas por todos los caminos — `tests/pronostico_igual_a_python.rs` |
| Columnas de texto como diccionario (cada valor distinto una vez; lo que se hace valor por valor, una vez por valor distinto) | `dict.rs` | pruebas propias |
| Qué lo mueve: LightGBM (40 árboles, profundidad 4) con las otras numéricas; cuántas veces usa cada una y SHAP con su signo (`pred_contrib`). Con más de 10.000 filas entrena con 10.000 repartidas parejo y SHAP usa todas las del modelo (en Python, al azar) | `drivers.rs`, `lgbm.rs` | dentro de las 48 planillas del análisis (5 con SHAP), igual a Python |
| Valores raros: Isolation Forest propio (no hay librería en Rust con azar fijo; decisión del 19/10), el algoritmo de scikit-learn (40 árboles, hasta 256 filas, columna y corte al azar) con semilla fija; la explicación de cada registro (z), la tabla y el gráfico como la web | `anomalies.rs` | misma cantidad (±1 por empates), columnas, tipos y gráfico; la mayoría de los marcados coinciden y se explican igual; una planilla con valores raros sembrados |
| Planilla abierta: leer (CSV o Excel) → limpiar → perfil → `analysis()`, con el mismo formato que `analysis_pipeline` | `sheet.rs` | pruebas propias con CSV y Excel |

**La ventana** (`src-tauri/`, Tauri 2): inicio con «Abrí tu planilla» (diálogo o soltar el archivo en la ventana) y las abiertas hace poco → «Analizando» con el MIO bot trabajando → el resultado con la **misma vista de la web** (`ResultadoMejorado`, vía `normalizeAnalysisResponse`), con un selector para analizar otra columna sin volver a leer. Dos comandos (`abrir_planilla`, `analizar`), solo puente con el motor; la ventana sigue el modo claro u oscuro del sistema y no lleva el pie legal ni el aviso de cookies de la web. Para probar: `npm run dev` y `cd desktop && cargo build --release -p mio-desktop && ./target/release/mio-desktop` (en modo desarrollo carga `localhost:3000/escritorio`).

**Archivos grandes** (medido el 18/10 con ventas sintéticas, 10 columnas, un id distinto por fila): el CSV se lee de a partes en dos pasadas (la primera decide el tipo de cada columna sin guardar nada, la segunda la llena con su tipo) y el texto va como diccionario. Antes: 79 MB → 1,1 GB de RAM y 9,8 s. La lectura reparte cada tanda de 50.000 filas entre los núcleos (`rayon`, una columna por tarea) y un texto que la limpieza no cambia no se copia. Ahora: 79 MB (1 millón de filas) → 0,4 GB y 2 s; 792 MB (10 millones) → unos 2,5 GB y 20 s para abrir, 4 s el pronóstico. Repartir también la limpieza por columnas se probó y se descartó: ganaba 1,5 s y subía la memoria un 30 % (el costo está en una sola columna pesada). No se usó Polars: hubiera obligado a reescribir la limpieza sobre otra interfaz y suma decenas de MB a la app; se usan `encoding_rs_io` (leer de a partes), `rustc-hash` (tablas rápidas) y `rayon` (núcleos).

Arreglos en los dos motores que salieron de comparar: un Excel con título o filas vacías arriba (Python), y en Rust las columnas decimales se achicaban a `float32` siempre; pandas solo lo hace si ningún valor cambia más de 5e-4 (montos grandes quedan en `float64`).

Notas: LightGBM se usa por su interfaz en C (el envoltorio `lightgbm3` arma los datos sin parámetros y da árboles distintos). Cuando gana Prophet, la franja sale de sus errores en los tramos escondidos, no de las simulaciones al azar de Python (a propósito).

## Sigue, en orden
1. Grupos (`models/segmentation.py`, K-Means con `linfa-clustering`): aparece solo en la vista porque el análisis ya tiene el formato de la web. Con 10 millones de filas el análisis tarda 11 s más que abrir y llega a 3,8 GB: los gráficos copian columnas (`numbers`, `groups`); pasar a vistas sin copia.
2. Las frases de la limpieza en lenguaje de negocio (hoy son las técnicas de la web: "Locale detectado... dayfirst: True"), en los dos motores. JSON. Elegir hoja cuando el Excel tiene varias. Avance al abrir un archivo grande. Unión de tablas (`core/auto_join.py`).
3. Ventana: sumar cada pieza nueva del motor a la pantalla de escritorio; ingreso por el navegador del sistema, licencia firmada con vencimiento, chat por el servidor.
4. Instaladores firmados (Mac y Windows por GitHub Actions) y actualizador. Certificados: decisión y cuenta del usuario.

## Pendientes del lado web (fuera de esta rama)
- Redeployar Render para que valgan los arreglos del motor (competencia, Prophet 1.3.0, estación semanal, menos RAM).
- Frases que decide el usuario: pie "Tus datos no se guardan" (el archivo no se guarda, el resultado sí, en Firestore) y la página de Privacidad ("cero almacenamiento en disco": Starlette escribe a disco temporal los archivos de más de 1 MB).
