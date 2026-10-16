# MIO de escritorio — plan y estado

Leé esto antes de seguir. Rama: `escritorio` (sale de `modelos-compiten`, que sale de `paisaje-1826`). Nada está subido.

## La decisión (15/10/2026)
- MIO como **programa que se descarga y se ejecuta**: sin Python, sin dependencias, sin servidor local ni puertos.
- Formato final desde el día 1, sin etapa intermedia: **ventana Tauri (Rust) + las pantallas React de siempre + motor de análisis en Rust**.
- La planilla nunca sale de la compu; usa la RAM del usuario. El servidor solo verifica cuenta y plan, hace de puente para el chat (la clave de Gemini no va en la app) y sirve actualizaciones firmadas ("Actualizar a la nueva versión").
- La web sigue con el motor de Python para uso liviano.

## Cómo se trabaja (no negociable)
1. **El motor de Python es la referencia.** Cada pieza en Rust se compara contra salidas de Python generadas por un script en `engine/tests/golden/` (`make_golden*.py`, se corren con el entorno del backend).
2. **Igual hasta el redondeo**, salvo Prophet (que se reescribió: a menos de 1 %, porcentajes a menos de 1 punto, y su óptimo tiene que ser igual o mejor que el del Prophet real).
3. **Revisar dos veces:** después de que una prueba pasa, romper a propósito un número del Rust y comprobar que la prueba falla; restaurar.
4. Si la comparación muestra un error del motor de Python, se arregla en los dos (pasó con la estación semanal en series mensuales).

## Herramientas
- Rust (rustup por Homebrew). No está en el PATH de la terminal del usuario; en los comandos usar:
  `export PATH=/opt/homebrew/opt/rustup/bin:$HOME/.cargo/bin:$PATH`
- cmake (Homebrew): para compilar LightGBM dentro del programa.
- Pruebas: `cd desktop && cargo test --release` (4 pruebas hoy). Python: `dashboard-ia/backend`, `python -m pytest` (86).

## Hecho (motor en Rust, `engine/src/`)
| Pieza | Archivo | Comparación |
|---|---|---|
| Guerra de modelos: Holt-Winters amortiguado, Theta, regresión con rezagos, LightGBM con rezagos; 3 tramos escondidos, promedio de los dos mejores, árbitro, banda, tope de 6 s | `forecast.rs`, `lgbm.rs` | igual (1e-7) — `tests/competencia_igual_a_python.rs` |
| Prophet reescrito (tendencia con quiebres + estaciones, mismos priors, MAP exacto) | `prophet.rs` | < 1 %, óptimo igual o mejor — `tests/prophet_igual_al_real.rs` |
| Pronóstico completo (`run_forecast`): día/semana/mes, serie de verdad, configuración de Prophet, competencia, árbitro, gráfico y métricas | `forecaster.rs` | 10 planillas por todos los caminos — `tests/pronostico_igual_a_python.rs` |

Notas: LightGBM se usa por su interfaz en C (el envoltorio `lightgbm3` arma los datos sin parámetros y da árboles distintos). Cuando gana Prophet, la franja sale de sus errores en los tramos escondidos, no de las simulaciones al azar de Python (a propósito).

## Sigue, en orden
1. **Leer y limpiar planillas** (CSV y Excel, por partes; probablemente Polars + calamine): equivalente a `core/data_cleaner.py` + `services/data_cleaning/` + perfil (`core/data_profiler.py`). Es la pieza más grande.
2. Valores raros (`models/anomaly_detector.py`, Isolation Forest), grupos (`models/segmentation.py`, K-Means), "qué lo mueve" (`models/feature_importance.py`, LightGBM + SHAP con `pred_contrib`), gráficos (`core/chart_generator.py`), unión de tablas (`core/auto_join.py`).
3. La ventana Tauri con las pantallas React: abrir archivos con el diálogo del sistema, ingreso por el navegador del sistema, licencia firmada con vencimiento, chat por el servidor.
4. Instaladores firmados (Mac y Windows por GitHub Actions) y actualizador. Certificados: decisión y cuenta del usuario.

## Pendientes del lado web (fuera de esta rama)
- Redeployar Render para que valgan los arreglos del motor (competencia, Prophet 1.3.0, estación semanal, menos RAM).
- Frases que decide el usuario: pie "Tus datos no se guardan" (el archivo no se guarda, el resultado sí, en Firestore) y la página de Privacidad ("cero almacenamiento en disco": Starlette escribe a disco temporal los archivos de más de 1 MB).
