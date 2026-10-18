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
| Lector como pandas. CSV: codificación, separador, títulos arriba, tipos por columna, vacíos, índice implícito. Excel (calamine; .xlsx, .xlsm, .xls, .ods): primera hoja, encabezado en la primera fila con datos (misma regla de títulos que el CSV, `title_rows`), fechas como fechas | `reader.rs` | 24 CSV y 6 Excel iguales a pandas — `tests/lector_igual_a_pandas.rs` |
| Limpieza: vacíos disfrazados, filas/columnas vacías, formato regional, textos (acentos NFC, espacios), duplicados, montos y porcentajes, números en texto, fechas (formato adivinado con la primera, como pandas), tipo de cada columna, atípicos (Tukey), imputación, achicado de memoria | `clean.rs` | 42 planillas (CSV y Excel) iguales a Python paso por paso, más conteos — `tests/limpieza_igual_a_python.rs` |
| Pronóstico completo (`run_forecast`): día/semana/mes, serie de verdad, configuración de Prophet, competencia, árbitro, gráfico y métricas | `forecaster.rs` | 10 planillas por todos los caminos — `tests/pronostico_igual_a_python.rs` |
| Planilla abierta: leer (CSV o Excel) → limpiar → columnas sugeridas (`target_score`, igual que la web) → pronóstico | `sheet.rs` | pruebas propias con CSV y Excel |

**La ventana** (`src-tauri/`, Tauri 2): elegir una planilla (CSV o Excel) con el diálogo del sistema → `Sheet::open` la lee y la limpia y queda abierta en memoria → la pantalla `src/pages/EscritorioPage.tsx` (ruta `/escritorio`) muestra qué se limpió, propone fecha y valor, y el pronóstico con el gráfico y la competencia de la web. Dos comandos (`leer_planilla`, `pronosticar`), solo puente con el motor; la ventana solo puede abrir el diálogo. Para probar: `npm run dev` y `cd desktop && cargo build --release -p mio-desktop && ./target/release/mio-desktop` (en modo desarrollo carga `localhost:3000/escritorio`).

Notas: LightGBM se usa por su interfaz en C (el envoltorio `lightgbm3` arma los datos sin parámetros y da árboles distintos). Cuando gana Prophet, la franja sale de sus errores en los tramos escondidos, no de las simulaciones al azar de Python (a propósito).

## Sigue, en orden
1. JSON y lectura por partes de archivos grandes (Polars). Elegir hoja cuando el Excel tiene varias.
2. Valores raros (`models/anomaly_detector.py`, Isolation Forest), grupos (`models/segmentation.py`, K-Means), "qué lo mueve" (`models/feature_importance.py`, LightGBM + SHAP con `pred_contrib`), gráficos (`core/chart_generator.py`), unión de tablas (`core/auto_join.py`).
3. Ventana: sumar cada pieza nueva del motor a la pantalla de escritorio; ingreso por el navegador del sistema, licencia firmada con vencimiento, chat por el servidor.
4. Instaladores firmados (Mac y Windows por GitHub Actions) y actualizador. Certificados: decisión y cuenta del usuario.

## Pendientes del lado web (fuera de esta rama)
- Redeployar Render para que valgan los arreglos del motor (competencia, Prophet 1.3.0, estación semanal, menos RAM).
- Frases que decide el usuario: pie "Tus datos no se guardan" (el archivo no se guarda, el resultado sí, en Firestore) y la página de Privacidad ("cero almacenamiento en disco": Starlette escribe a disco temporal los archivos de más de 1 MB).
