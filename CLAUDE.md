# MIO — landing + plataforma (React/Vite)

Contexto completo: `docs/HANDOFF.md` (leelo solo si la tarea lo pide). Dónde está cada archivo: `MAPA_DEL_PROYECTO.md`. Marca: `BRANDING.md` (v2) + `DESIGN.md`; si se contradicen, mandan este archivo y `BRANDING.md`.

## Comandos
- `npm run dev` → localhost:3000 · `npm run build` (debe pasar) · `npx tsc --noEmit` (**0 errores**) · `npm test` (vitest, 79 tests)
- Para verificar usá `npm run check` (tsc + tests + build, salida de 3 líneas). Para ubicar archivos, mirá `MAPA_DEL_PROYECTO.md` antes de buscar.
- Deploy: Cloudflare Pages (`miodb`), ver `DEPLOY.md`.
- Backend FastAPI en `dashboard-ia/backend/`: **solo lectura, no se toca**.

## Reglas
- Español rioplatense (voseo) en textos y respuestas. Concreto, sin relleno corporativo ni promesas tipo "en segundos".
- **Fuentes fijas**: Climate Crisis, Wellfleet, Plus Jakarta Sans, JetBrains Mono. No cambiarlas.
- Paleta: lima `#bdf559` (solo chispa), violeta `#7647eb`, obsidiana `#0b0914`, página `#f3f3f5`.
- Un solo radio: `rounded-mio` / `rounded-mio-sm` (`--mio-radius: 16px`). Sin sombras duras ni `border-2`.
- Estilo v3 (ver `BRANDING.md` §2): bloques sólidos de color, redondeados, sin bordes, pegados entre sí y anchos. Prohibido: brutalismo, tarjetas blancas genéricas, texto suelto separado por líneas, botones magnéticos, cursor custom.
- Titulares en Plus Jakarta Sans 800; Climate Crisis solo como acento corto.
- Commits sin línea `Co-Authored-By`.
- El MIO bot (pet) está diseñado: no rediseñarlo. Estados: reposo, trabajando, celebrando, anomalía, durmiendo.
- En desktop un solo MIO 3D viaja por toda la landing (`MioTravellerLayer`, poses en `src/lib/petStage.ts`; se ancla a un elemento con `data-mio-anchor="<parada>"`). En móvil/tablet y con movimiento reducido sigue el sprite 2D. El cuerpo es `MioHeroStage` con `driven`.
- En desktop, Método y Prueba son un solo vuelo fijado sobre el dial de 1.826 días reales (`PaisajeDOM` + `PaisajeCanvas`, guion en `src/lib/paisaje.ts`) y el CTA final es el mismo dial de noche (`variant="noche"`). En móvil/tablet y con movimiento reducido van los bloques apilados (`MetodoDOM`, `FullBleedCaseStudyDOM`). Los datos salen de `public/data/daily_series.json` (`scripts/export_daily_series.py`): ningún número de esas escenas se escribe a mano.
- No tocar la lógica de auth (`useFounderAuth`, `firebaseAuth`) sin avisar.
- Three.js: sin crear geometrías/materiales dentro de `useFrame`/rAF; DPR ≤ 1.5; ACESFilmic.
- Estructura: DOM en `components/dom`, WebGL en `components/canvas`, shaders en `src/shaders/*.glsl`.
- Historia de la landing y su orden: única fuente en `src/lib/landingSections.ts`.

## Git
- Rama local de trabajo: `frontpro`. Producción sale de la rama elegida en Cloudflare Pages (al 6/10/2026, `pruebas-front3` en `ivysallover/Miodb`): **pushear ahí publica en `miodb.pages.dev`**. **Nunca commit/push a `main`.** Push solo si el usuario lo pide.
- `Agents.md` es legado de Antigravity (roles de agentes Gemini); sus reglas de rama y paleta ya están alineadas con este archivo.

## Gotchas
- La carpeta se sincroniza con iCloud y aparecen copias `archivo 2.ext`: están en `.gitignore`; no usar `git add -A` sin mirar `git status`.
- ECharts se importa por partes desde `dashboard-ia/frontend/src/lib/echartsCore.ts`: un tipo de gráfico o componente nuevo hay que registrarlo ahí o no se dibuja.
- El backend leía fechas `AAAA-MM-DD` como día/mes; desde el 16/10/2026 el paso de fechas (`step08_temporal_parser.py`) ya no aplica día primero a fechas con año primero. `src/utils/prepareUpload.ts` sigue reescribiendo esas columnas a `DD/MM/AAAA` antes de subir (inofensivo; sirve mientras Render no se redeploye). El detector de codificación prefiere UTF-8 cuando el archivo lo es (chardet confundía UTF-8 con MacRoman y rompía los acentos).
- La predicción del servidor fallaba porque `prophet==1.1.5` no puede crear el modelo (su carpeta de Stan viene incompleta): `run_forecast` caía en el `except` y la página decía "Sin predicción esta vez". Se subió a `prophet==1.3.0` (hay que redeployar el backend para que valga) y la precisión ahora se mide fuera de muestra (`validacion: "Fuera de muestra"`; en series muy cortas queda `In-Sample` y lo dice). La proyección solo se devuelve si hay serie de verdad (en semanas/meses, registros en ≥ 70 % de los períodos) y le gana a repetir el último valor o el promedio sobre los datos escondidos; si no, `forecast.metrics.error` lo dice y la página muestra "Sin predicción" con el motivo. El motor exige el token de Firebase de quien está ingresado (`core/auth.py`, `REQUIRE_AUTH`, ver `DEPLOY.md`: el frontend publicado tiene que mandarlo antes de encenderlo) y corre `MAX_CONCURRENT_ANALYSES` análisis a la vez con el resto en cola (`core/analysis_queue.py`; la página pregunta `GET /queue/{ticket}` y avisa la demora). La predicción es una competencia (`models/forecast_candidates.py`): Prophet, Holt-Winters amortiguado, Theta, regresión con rezagos y LightGBM con rezagos predicen 3 tramos escondidos y gana el de menor error promedio (o el promedio de los dos mejores). Un candidato que tarda más de 6 s queda afuera. `metrics.competencia` trae el ranking y la página lo muestra (`components/dashboard/Competition.tsx`). `insights.ts → localForecast` sigue apagada a propósito (`buildModel(r, { localForecast: true })` la enciende): una tendencia no es una predicción.
- Hacia Gemini van resultados, nunca filas de la planilla: el chat resume los valores raros con `core/llm_context.py` (cantidad, porcentaje y columnas; `tests/test_llm_context.py` lo vigila). El modo confidencial (`useMioStore.confidential`, interruptor en el chat del dashboard) apaga el chat: nada de la planilla sale hacia la IA. Para que valga en producción hay que redeployar el backend.
- Términos aceptados por cuenta: `src/lib/terms.ts` (`TERMS_VERSION`; cambiarla los vuelve a pedir), guardados en `users/{uid}.terminos` de Firestore. El texto sale de un solo lugar (`TerminosTexto`). Las reglas de `dashboard-ia/firestore.rules` hay que publicarlas para que valga.
- App de escritorio (`desktop/`, plan en `desktop/PLAN.md`): `npm run escritorio` arma el programa con las pantallas adentro; sin la feature `custom-protocol` la ventana usa `localhost:3000`. Su fondo es `components/canvas/Fondo.tsx` (cinco a elegir en Ajustes, por defecto Planilla viva; shaders en `src/shaders/fondo/`).
- `window.scrollTo` choca con Lenis (usar `useSmoothScroll().scrollTo` o rueda real al testear).
- StrictMode doble-invoca efectos: no liberar compuertas globales en cleanup (ver `lib/boot.ts`).
- Editar archivos siempre leyendo antes de escribir; nunca truncar.
- Verificación visual: pedí capturas al usuario; no instalar Puppeteer/Playwright en su máquina sin preguntar.

## Skills
- Activas en `.claude/skills/` (enlaces a `.agent/skills/`): `animate`, `emil-design-eng`, `improve-animations`, `3d-web-experience`, `impeccable`. Ninguna pisa la marca: fuentes, paleta y radio salen de este archivo y `BRANDING.md`.
- El resto de `.agent/skills/` queda apagado a propósito (contradice el sistema v2 o es genérico). Para activar una: `ln -s ../../.agent/skills/<nombre> .claude/skills/<nombre>`.
