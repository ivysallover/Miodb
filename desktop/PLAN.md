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
- **Armar la app de verdad** (las pantallas adentro del programa, sin servidor de desarrollo): `npm run escritorio` (`vite build` + `cargo build --release --features custom-protocol`); queda en `desktop/target/release/mio-desktop`. Sin `--features custom-protocol` la ventana pide las pantallas a `localhost:3000` (`npm run dev`), que es lo cómodo para desarrollar.
- Pruebas: `cd desktop && cargo test --release`. Python: `dashboard-ia/backend`, `../../desktop/.venv-referencia/bin/python -m pytest` (93).

## Hecho (motor en Rust, `engine/src/`)
| Pieza | Archivo | Comparación |
|---|---|---|
| Guerra de modelos: Holt-Winters amortiguado, Theta, regresión con rezagos, LightGBM con rezagos; 3 tramos escondidos, promedio de los dos mejores, árbitro, banda, tope de 6 s | `forecast.rs`, `lgbm.rs` | igual (1e-7) — `tests/competencia_igual_a_python.rs` |
| Prophet reescrito (tendencia con quiebres + estaciones, mismos priors, MAP exacto) | `prophet.rs` | < 1 %, óptimo igual o mejor — `tests/prophet_igual_al_real.rs` |
| Lector como pandas. CSV: codificación, separador, títulos arriba, tipos por columna, vacíos, índice implícito. Excel (calamine; .xlsx, .xlsm, .xls, .ods): primera hoja, encabezado en la primera fila con datos (misma regla de títulos que el CSV, `title_rows`), fechas como fechas | `reader.rs` | 25 CSV y 6 Excel iguales a pandas — `tests/lector_igual_a_pandas.rs` |
| Limpieza: vacíos disfrazados, filas/columnas vacías, formato regional, textos (acentos NFC, espacios), duplicados, montos y porcentajes, números en texto, fechas (formato adivinado con la primera, como pandas), tipo de cada columna, atípicos (Tukey), imputación, achicado de memoria | `clean.rs` | 44 planillas (CSV y Excel) iguales a Python paso por paso, más conteos — `tests/limpieza_igual_a_python.rs` |
| Perfil (tipo de cada columna para gráficos y elección, calidad 0-100, columnas sugeridas por `target_score`), gráficos automáticos (`auto_charts`: evolución, promedios y cantidades por grupo, distribución, cajas, correlaciones, relación), números clave y las frases de la limpieza; los números como numpy y pandas (sumas por pares, promedios por grupo con Kahan, `float32`) | `profile.rs`, `charts.rs`, `pynum.rs` | 50 planillas con el análisis completo igual a Python (salvo lo que Python sortea al azar) — `tests/analisis_igual_a_python.rs` |
| Pronóstico completo (`run_forecast`): día/semana/mes, serie de verdad, configuración de Prophet, competencia, árbitro, gráfico y métricas | `forecaster.rs` | 10 planillas por todos los caminos — `tests/pronostico_igual_a_python.rs` |
| Columnas de texto como diccionario (cada valor distinto una vez; lo que se hace valor por valor, una vez por valor distinto) | `dict.rs` | pruebas propias |
| Qué lo mueve: LightGBM (40 árboles, profundidad 4) con las otras numéricas; cuántas veces usa cada una y SHAP con su signo (`pred_contrib`). Con más de 10.000 filas entrena con 10.000 repartidas parejo y SHAP usa todas las del modelo (en Python, al azar) | `drivers.rs`, `lgbm.rs` | dentro de las 48 planillas del análisis (5 con SHAP), igual a Python |
| Valores raros: Isolation Forest propio (no hay librería en Rust con azar fijo; decisión del 19/10), el algoritmo de scikit-learn (40 árboles, hasta 256 filas, columna y corte al azar) con semilla fija; la explicación de cada registro (z), la tabla y el gráfico como la web | `anomalies.rs` | misma cantidad (±1 por empates), columnas, tipos y gráfico; la mayoría de los marcados coinciden y se explican igual; una planilla con valores raros sembrados |
| Grupos: K-Means de `linfa` (un arranque k-means++, semilla fija) sobre hasta 6 numéricas estandarizadas; de 2 a 5 grupos por el mejor puntaje de silueta (también de `linfa`); nombres, tamaños, el gráfico de un valor por grupo y el perfil como la web | `segments.rs` | donde hay grupos de verdad (una planilla con tres sembrados) salen los mismos; donde no, un corte válido y los mismos gráficos |
| Piezas compartidas: fechas (`dates.rs`: año-mes-día, semana que cierra el domingo, mes, cómo se escriben), el armado de todo gráfico (`charts::chart` + `Layout`), una columna como números (`Col::numbers`), números como numpy y pandas (`pynum.rs`) y la muestra pareja de filas (`sheet::spread`) | `dates.rs`, `charts.rs`, `clean.rs`, `pynum.rs`, `sheet.rs` | pruebas propias |
| Planilla abierta: leer (CSV o Excel) → limpiar → perfil → `analysis()`, con el mismo formato que `analysis_pipeline` | `sheet.rs` | pruebas propias con CSV y Excel |

**La ventana** (`src-tauri/`, Tauri 2): inicio con «Abrí tu planilla» (diálogo o soltar el archivo) y **Tus proyectos** (en un Excel con varias hojas, cada hoja es un proyecto y el resultado deja cambiar de hoja): cada análisis queda guardado en la carpeta de datos de la app (`projects.rs`, un archivo por planilla con el análisis de cada columna mirada) y se abre al instante si la planilla no cambió (mismo tamaño y fecha); se puede quitar de la lista. → «Analizando» con el MIO bot → el resultado con la **misma vista de la web** (`ResultadoMejorado`), selector para otra columna y vuelta a los proyectos. Comandos: `abrir_planilla`, `analizar`, `proyectos`, `borrar_proyecto`; mientras analiza, el motor avisa cada etapa (`progress.rs`: leer, limpiar, gráficos, qué lo mueve, valores raros, grupos, pronóstico; al leer, cuánto del archivo) y la app lo pasa con el evento `progreso`. La pantalla está en `src/components/escritorio/` (`desktop.ts` puente y formatos, `useDesktop.ts` estado, `Inicio`, `ResultHeader`); sigue el modo claro u oscuro del sistema. Para probar: `npm run dev` y `cd desktop && cargo build --release -p mio-desktop && ./target/release/mio-desktop` (en modo desarrollo carga `localhost:3000/escritorio`).

**Archivos grandes** (medido el 18/10 con ventas sintéticas, 10 columnas, un id distinto por fila): el CSV se lee de a partes en dos pasadas (la primera decide el tipo de cada columna sin guardar nada, la segunda la llena con su tipo) y el texto va como diccionario. Antes: 79 MB → 1,1 GB de RAM y 9,8 s. La lectura reparte cada tanda de 50.000 filas entre los núcleos (`rayon`, una columna por tarea) y un texto que la limpieza no cambia no se copia. Ahora: 79 MB (1 millón de filas) → 0,4 GB y 2 s; 792 MB (10 millones) → unos 2,5 GB y 20 s para abrir, 4 s el pronóstico. Repartir también la limpieza por columnas se probó y se descartó: ganaba 1,5 s y subía la memoria un 30 % (el costo está en una sola columna pesada). No se usó Polars: hubiera obligado a reescribir la limpieza sobre otra interfaz y suma decenas de MB a la app; se usan `encoding_rs_io` (leer de a partes), `rustc-hash` (tablas rápidas) y `rayon` (núcleos).

Arreglos en los dos motores que salieron de comparar: un Excel con título o filas vacías arriba (Python), y en Rust las columnas decimales se achicaban a `float32` siempre; pandas solo lo hace si ningún valor cambia más de 5e-4 (montos grandes quedan en `float64`).

Notas: LightGBM se usa por su interfaz en C (el envoltorio `lightgbm3` arma los datos sin parámetros y da árboles distintos). Cuando gana Prophet, la franja sale de sus errores en los tramos escondidos, no de las simulaciones al azar de Python (a propósito).

## Sigue, en orden (plan del 23/10/2026: primera versión casi perfecta antes de cualquier instalador)

**A. La app como programa — hecho (23/10/2026)**
- Menú lateral (`Menu.tsx`): Inicio · Mis proyectos · Guía · Ajustes, la planilla abierta (con su avance), abrir planilla y cambio rápido de tema. Atajos ⌘1…⌘4 y ⌘O (`MENU` en `useDesktop.ts`, una sola lista para el menú, los atajos y la guía).
- Inicio: abrir o soltar, los últimos 4 proyectos y "Cómo se usa" con el recorrido.
- Mis proyectos (`Proyectos.tsx`): búsqueda (nombre, carpeta, hoja, columna), orden (recientes, nombre, filas, calidad), filtro CSV / Excel; cada proyecto se abre, se muestra en su carpeta o se quita (`ProjectTile.tsx`).
- Ajustes (`Ajustes.tsx`): tema Claro · Oscuro · Como la compu (guardado en `mio_escritorio_tema`), carpeta de proyectos con "Mostrar la carpeta", recorrido, privacidad y versión.
- Guía (`Guia.tsx`) y recorrido de la primera vez (`Recorrido.tsx`, visto en `mio_escritorio_guia_vista`): los mismos textos, de `ayuda.ts`. Estilos compartidos en `ui.ts`.
- Falta sumar "Cuenta" al menú (con B).

**B. Cuenta y términos — hecho con mail y contraseña (23/10/2026)**
- La app pide la cuenta al abrir (`Ingreso.tsx`: entrar, crear cuenta, contraseña nueva por mail) y después los términos vigentes con el texto completo (`TermsAcceptance`); recién ahí abre. La sesión queda recordada (Firebase).
- Los términos tienen una sola fuente: `TerminosTexto` (en `src/pages/TerminosPage.tsx`) lo muestran la página, la aceptación y la pantalla Cuenta. La versión es `TERMS_VERSION` en `src/lib/terms.ts`: cambiarla vuelve a pedirlos a todos.
- La aceptación queda en Firestore, `users/{uid}.terminos = {version, aceptados, desde, app}`, y se recuerda en la compu para abrir sin conexión. En la web: al crear la cuenta se guarda, y en dashboard / proyectos / admin `TermsGate` se los pide a quien no los aceptó (por ejemplo, quien entró con Google).
- Menú: "Cuenta" (⌘5) con el mail, desde cuándo, los términos aceptados para releer y salir.
- Lado del usuario: **publicar las reglas** (`dashboard-ia/firestore.rules`, `firebase deploy --only firestore:rules`); sin eso, leer y guardar la aceptación falla. Con Google (`src-tauri/src/google.rs`): Google no deja ingresar desde una ventana embebida, así que el ingreso pasa por el navegador, en la página `/escritorio/google` (`EscritorioGooglePage.tsx`), que entra con Google como la web (mismo proyecto de Firebase, nada que configurar). Mientras dura el ingreso, la app la sirve ella misma en `localhost` (dominio que Firebase autoriza de entrada; `tiny_http`, con los archivos que lleva adentro) y recibe ahí la vuelta (`/vuelta`) con la credencial y un estado al azar que verifica; no depende de nada publicado en la web. La ventana entra con `signInWithCredential`.

**C. Resultado y uso**
9. Las frases de la limpieza en castellano de negocio, en los dos motores (decisión pendiente del usuario).
10. ~~Exportar~~ hecho (27/10/2026): Exportar en el resultado → Informe PDF (diálogo de impresión, solo el resultado), Excel (números y fechas de verdad, encabezado fijo y filtros; `engine/src/export.rs` con `rust_xlsxwriter`) o CSV, de la planilla limpia y unida. Los botones Imagen y Datos de cada gráfico guardan con diálogo (`capture.ts → setSaver`), porque en la app una descarga no llega a ningún lado.
11. Chat opcional y apagado de entrada: avisa qué se envía; solo resultados, nunca filas.

**La app, firme (27/10/2026)**
- Funciona sola (pantallas adentro, ver Herramientas), con política de seguridad de la ventana, fuentes adentro (`@fontsource`) y sin despertar al servidor de la web.
- Cancelar (o Esc) mientras lee, une o analiza: el motor corta en la próxima etapa (`Progress::report` devuelve el corte; la lectura de un CSV corta cada 50.000 filas) y nada se guarda; un turno por trabajo hace que cancelar y empezar otro no se pisen. Excel protegido o roto: lo dice en palabras. Un guardado cortado se limpia al arrancar.
- "Probar con un ejemplo" (inicio sin proyectos, fin del recorrido, guía): `src-tauri/ejemplos/`, armado por `desktop/ejemplos/armar_ejemplo.py`; `engine/tests/ejemplo_de_la_app.rs` vigila que apile, cruce, encuentre raros y prediga.
- Fondo a elegir en Ajustes, guardado (`components/canvas/Fondo.tsx`, `shaders/fondo/`): Planilla viva (por defecto), Halo, Curvas de nivel, Aurora y Quieto; todos se adaptan al tema.

**Varias planillas juntas — hecho (25/10/2026)**
- Elegir o soltar varias a la vez; `engine/src/combine.rs` las une antes de limpiar: **apila** las que tienen las mismas columnas (≥ 80 % de los nombres, sin tildes ni mayúsculas; los tipos se ajustan entre sí y la columna `archivo` dice de dónde salió cada fila) y **cruza** las demás con la principal (la de más filas) por la clave que mejor coincide en valores: única en la otra tabla, ≥ 50 % de coincidencia con nombre parecido (`cliente_id` ↔ `id` de clientes) o ≥ 90 % si es un código de texto sin nombre parecido. Cruce que no pierde filas y en cadena (ventas → productos → categorías). Lo que no se puede unir se dice con el motivo.
- La pantalla muestra "Cómo uní las planillas" sobre el resultado; un grupo de planillas es un proyecto (`archivos`), que se recalcula si cambia cualquiera.
- Mejor que la web (`core/auto_join.py`: solo el mismo nombre de columna, `inner` que tira filas, recorte al azar a 100.000 y sin apilar). Antes de analizar, la pantalla "Revisá cómo se unen" (`Union.tsx`, comando `revisar_union` sobre las planillas ya leídas) muestra el papel de cada planilla y deja sacarla, cruzarla por otra clave (las que coinciden en valores, también las que MIO no usaría sola) o no cruzarla; lo elegido queda en el proyecto (`union`) y "Cambiar la unión" vuelve a la revisión. Falta llevarlo a la web.

**E. Más fuentes de datos (plan del 23/10/2026)**
Regla: toda fuente termina en la misma `reader::Table` (nombres + columnas tipadas); limpieza, perfil, gráficos, modelos y proyectos no cambian. Cada lector nuevo usa la librería estándar de su formato, nunca uno escrito a mano, y se prueba igual que hoy: las planillas de `tests/golden` convertidas al formato nuevo (con pandas, en `make_golden_*.py`) tienen que dar el mismo análisis que el CSV.
12. Archivos, en este orden:
    - **Parquet** (`parquet` + `arrow`, los de Apache): lo que exportan BigQuery, Snowflake, Databricks y casi todo sistema de datos. Trae tipos (fechas, decimales), así que se saltea la adivinanza del CSV.
    - **JSON / JSON Lines** (`serde_json`, ya está): exportaciones de APIs, Shopify, Mercado Libre, Tiendanube. Lista de objetos → columnas; objetos anidados → `cliente.nombre`.
    - **SQLite** (`rusqlite`, con la base incluida): un archivo, sin usuario ni contraseña; muchos sistemas de caja y de stock la usan. Se elige la tabla (como la hoja de un Excel).
    - Después, si hace falta: Feather/Arrow IPC, DBF (sistemas contables viejos), Google Sheets (con la cuenta de Google ya ingresada).
13. Bases de datos (conexión de solo lectura):
    - **PostgreSQL y MySQL / MariaDB** con `sqlx` (un solo crate para las dos, consultas preparadas); **SQL Server** con `tiberius` (muchas pymes con sistemas de gestión).
    - Pantalla "Conectar base de datos": motor, servidor, puerto, base, usuario, contraseña; "Probar conexión"; después elegir una tabla o vista, o escribir una consulta `SELECT`. Se valida que sea solo lectura (transacción `READ ONLY` y usuario recomendado sin permisos de escritura) y se trae con tope de filas configurable, avisando si se cortó.
    - La contraseña va al llavero del sistema (`keyring`: Llavero de macOS, Administrador de credenciales de Windows), nunca a un archivo ni a la cuenta de MIO. El proyecto guarda la conexión (sin contraseña) y la consulta; "Actualizar" la vuelve a correr y recalcula (la marca de cambio es el resultado, no un archivo).
    - Conexión segura: TLS cuando el servidor lo ofrece y aviso si no; SSH túnel queda para después si lo piden.
14. Arquitectura: `Source` pasa de `Csv | Excel` a `Archivo(formato) | Base(conexión, consulta)`; `projects::Meta` guarda de dónde salió; el lector de cada formato en su módulo (`reader/parquet.rs`, `reader/json.rs`, `db/…`). El tamaño grande ya está resuelto (columnas por diccionario, paralelo); para una base se trae por lotes con la misma barra de avance.

**F. Modo sin IA (vale para todo lo anterior)**
- La app de escritorio hoy no manda nada a ninguna IA: no tiene chat. Sigue así por defecto: "sin IA" es el modo de fábrica, no una opción escondida.
- Si se suma el chat (punto 11), va apagado de entrada, con el mismo interruptor del modo confidencial de la web, y solo con resultados resumidos (`core/llm_context.py`: cantidades, porcentajes, columnas), nunca filas, nombres de tablas ni datos de conexión. La pantalla dice qué se manda antes de mandarlo.
- Lo que sale de la compu, en una sola lista en Ajustes: la cuenta (ingreso y términos) y, si se prende, el chat. Las planillas, las bases y sus contraseñas, nunca.

**D. Más adelante**
12. Licencia, actualizaciones firmadas e instaladores (Mac y Windows), cuando la versión esté casi perfecta.

## Pendientes del lado web (fuera de esta rama)
- Redeployar Render para que valgan los arreglos del motor (competencia, Prophet 1.3.0, estación semanal, menos RAM).
- Frases que decide el usuario: pie "Tus datos no se guardan" (el archivo no se guarda, el resultado sí, en Firestore) y la página de Privacidad ("cero almacenamiento en disco": Starlette escribe a disco temporal los archivos de más de 1 MB).
