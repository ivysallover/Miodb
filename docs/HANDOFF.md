# MIO — Handoff completo (landing + repo + rediseño "Editorial dither")

> Documento para retomar el trabajo en **Claude Code** sin perder contexto. Escrito el 6 oct 2026, al cierre de la Fase A y antes de empezar la Fase B.
> Usuario: **Tata (Noel)**, estudiante de Ciencias de Datos (UCA Rosario), cofundador de MIO con **Milena Abraham**. Habla español rioplatense.
> Complementos cortos: `CLAUDE.md` (reglas, se carga solo), `BRANDING.md` (marca v2), `Agents.md` (legado de Antigravity, ver §3).

---

## 0. Resumen en 30 segundos

- **MIO**: plataforma que convierte planillas (Excel/CSV) en diagnósticos: detecta anomalías (Isolation Forest), compite modelos (Prophet/ARIMA/Boosting), explica con SHAP y tiene un copiloto de chat. Landing + app (dashboard) en el mismo repo.
- **Objetivo del trabajo**: llevar la landing a nivel **Lusion / Awwwards** sin perder el espíritu MIO, y desde el 4 oct seguir la **arquitectura y diseño de legencymedia.com** adaptados a MIO (paleta, MIO bot, fuentes actuales).
- **Dónde estamos**: Fases 0–2 del roadmap original + **Fase A** (sistema de diseño v2) **hechas y commiteadas** en la rama `claude/lusion-redesign`. **Siguiente: Fase B** (kit de dither: componente `DitherArt` + 5 ilustraciones procedurales).
- **Autonomía otorgada**: "vos seguí", "confío en tus habilidades de diseño", "ve comiteando en una branch propia". La reformulación del diseño, la organización y cómo se entrega la información con efectos visuales es "lo que más me importa".
- **Pendiente de aplicar/ver por el usuario**: casi todo desde el parche 5 en adelante (ver §4). Yo (en la nube) no pude hacer push; entregué parches. En Claude Code, con acceso al repo local, ya no hace falta.

### Primer prompt sugerido para la nueva sesión
```
Leé CLAUDE.md y docs/HANDOFF.md (§4, §6 y §8). Estás en la rama claude/lusion-redesign.
Verificá con `git log --oneline -15` que están los commits hasta fa40085 y corré
`npx vite build` + `npx tsc --noEmit` (baseline 10 errores). Después empezá la Fase B
(kit de dither) como describe §8.2. Un commit por paso. Pedime capturas para validar.
```

---

## 1. Producto y marca

- **Nombre**: MIO. **Tagline**: *Intelligent Data Operations & AutoML*. Manifiesto: *"Dejá de adivinar. Empezá a predecir."* / *"Convertí planillas de datos en decisiones inteligentes."*
- **Fundadores**: Tadeo Muñoz Garcés y Milena Abraham. **Lugar**: Rosario, Santa Fe, Argentina (el footer debe mostrarlo).
- **Voz**: rioplatense, directa, técnica pero accesible. Voseo ("Subí tu planilla", "Fijate"). Sin relleno corporativo, sin promesas vagas tipo "en segundos" ni estadísticas de producto sin respaldo.
- **MIO bot / pet ("Espécimen 01")**: mascota-criatura con pantalla de cara y ojos como barras de histograma. Ya está **diseñada y validada: no se rediseña** en ningún asset. 5 estados: `reposo`, `trabajando`, `celebrando`, `anomalia`, `durmiendo`. Versiones 2D (`MioPet2D.tsx`) y 3D (`MioPet3D.tsx`, `petKit.ts`).
- **MIO-DEV 01**: consola de hardware tipo handheld (chasis violeta, pantalla OLED, D-pad, botones A/B, SELECT/START). Se mantiene: es parte del carácter de la marca. Vive en `MioDevCanvas.tsx` (versión original aprobada; la variante "MioDeviceCanvas" fue eliminada).
- **Paleta**: lima `#bdf559` (marca; en v2 solo como **chispa**: CTA, chips activos, LEDs), violeta `#7647eb` (corporativo; para campos grandes usar un tono más profundo), obsidiana `#0b0914`, página `#f3f3f5`, tarjetas blancas.
- **Fuentes (NO cambiar jamás)**: **Climate Crisis** (titulares, eje variable `YEAR`), **Wellfleet**, **Plus Jakarta Sans** (texto), **JetBrains Mono** (telemetría/datos). Ojo: `BRANDING.md` original hablaba de Space Grotesk; el usuario confirmó que las fuentes vigentes son las de arriba.

---

## 2. Repo y stack

- **Repo**: `github.com/milena-abraham/dashboard-ia` (remoto `origin`, rama base `main`). Repo de Milena; el usuario trabaja con permisos propios.
- **Stack**: React 18 + Vite 5 + TypeScript, **Three.js vanilla** (no R3F en la landing nueva), GSAP + ScrollTrigger, Lenis (smooth scroll), Framer Motion, Tailwind 3, Zustand, Firebase (auth + Firestore), ECharts (dashboard), react-markdown, jsPDF/html2canvas.
- **Scripts**: `npm run dev` (localhost:3000) · `npm run build` / `npx vite build` · `npm run lint` (= `tsc -b --noEmit`) · `npm run preview`.
- **Deploy**: frontend en Vercel (`vercel.json`: rewrite `/api/*` → `https://dashboard-ia-1.onrender.com/api/*`, resto → `index.html`); backend FastAPI en Render (`dashboard-ia/backend`). Variables `VITE_API_URL` y `VITE_FIREBASE_*` (ver `DEPLOY.md`). CI: `.github/workflows/verify.yml`.
- **Carpetas duplicadas/legado**: `dashboard-ia/` (contiene `backend/`, `frontend/`, `firestore.rules`, notas) y `frontend/` en la raíz. Limpieza pendiente (Fase 0), **nunca tocar `dashboard-ia/backend/`**.
- Otros archivos raíz: `mio3d.py`, `render_mio.py` (render del pet con Python), `.agent/skills/*` (skills de Antigravity: animate, impeccable, etc.; Claude Code no las carga solo).

### Rutas (router casero en `src/app/App.tsx`, por `window.location.pathname`)
`/` landing · `/dashboard` · `/projects` · `/admin` · `/login` · `/terminos` `/privacidad` `/cookies` `/aviso-legal` `/dpa` `/arrepentimiento` · `/test-pet` y `/mio-pet` (laboratorio del pet). Las páginas internas son `lazy`.

### Mapa de `src/`
```
app/App.tsx, providers/SmoothScrollProvider.tsx   shell, rutas, Lenis (useSmoothScroll)
components/dom/      HeroDOM, ProblemaDOM, ComoFuncionaDOM, FullBleedCaseStudyDOM,
                     QuienesSomosDOM, CtaBannerDOM, FooterDOM, NavbarDOM, MioNeuralFlow, ...
components/canvas/   MioHeroStage (pet 3D del hero), MioDevCanvas (consola), LusionCanvas (fondo),
                     MioBackgroundShader, dither/pixelate canvases (legado)
components/pet/      Mio*, MioFloatingCompanion (guía flotante), petKit.ts
components/ui/       SectionPlate, SectionRail, Reveal, BootSequence, PixelDivider, FlipText, ...
lib/                 landingSections.ts (FUENTE ÚNICA de la historia), guide.ts, boot.ts, renderGate.ts,
                     gsap.ts, sound.ts, firebase*.ts, api*.ts
hooks/useActiveSection.ts
shaders/*.glsl       shaders crudos (no inline en JS)
utils/useMioStore.ts (Zustand: tema, etc.), useFounderAuth.ts
```
`PoderCorporativoDOM.tsx` y `DitherFigureTransitionDOM.tsx` siguen en disco pero **desmontados** (restaurables con una línea en `App.tsx`).

---

## 3. Reglas inamovibles (y un conflicto a resolver)

1. **Fuentes actuales**, **backend intocable**, **auth intocable sin avisar**.
2. **Nada directo a `main`**. Trabajo en `claude/lusion-redesign`. Push solo con orden del usuario.
3. Three.js: nada de `new Geometry/Material` en `useFrame`/rAF; `setPixelRatio(Math.min(dpr, 1.5))`; `ACESFilmicToneMapping`; GLSL en `.glsl`.
4. Assets 3D: `.glb` con Draco; texturas `.webp`/KTX2; no `.obj/.fbx/.png` pesados.
5. Dual theme: toda tarjeta debe verse bien en claro y oscuro.
6. Respetar `prefers-reduced-motion` en todo lo nuevo.
7. **Conflicto documentado**: `Agents.md` (Antigravity) dice rama activa `frontpro`, estética neo-brutalista (`#f6f6f2`, sombras duras). Eso quedó **superado**: la rama es `claude/lusion-redesign` y la estética es v2 (ver §6). El usuario aceptó que el neobrutalismo es opcional porque "se ve infantil / elementos flotantes". Conviene editar o archivar `Agents.md` para que no contradiga el código.
8. **Verificación visual**: el usuario prefiere validar con sus capturas en su M2; no quiere Puppeteer instalado en su máquina. (En la sandbox de la nube sí usé Playwright/Chromium para capturas reales.)

---

## 4. Estado del trabajo (git)

Rama: `claude/lusion-redesign`. Commits de abajo hacia arriba (más viejo primero):

| Commit | Contenido |
|---|---|
| `48ea947` | (base, ya existente) enforcement de emailVerified/Google en auth de fundadores |
| `ddc419a` | Hero: **Espécimen 01** en 3D vivo (`MioHeroStage`, `petKit`, `renderGate`) reemplaza el anillo torus-knot dither |
| `d035156` | Perf: code-split de rutas, vendor chunks, Firestore fuera de la carga inicial |
| `ac39e13` | `SectionPlate`, se eliminan tics genéricos; onda de `LusionCanvas` en GPU |
| `716089e` | Consola ↔ pet (START → trabajando); limpieza de Navbar y paneles |
| `f50f6ea` | Pet del hero fuera de la consola; compañero flotante oculto en el hero |
| `f5a29e5` | Compañero rediseñado (sin círculo), registro de secciones, hook de sección activa, riel |
| `3aad2fc` | Titular que "se derrite" (eje `YEAR`) + gramática `Reveal` |
| `3df3005` | **BootSequence** "MIO OS" |
| `534f403` | Reformulación acto 1: historia en 5 actos, sección Problema, hero honesto |
| `fe7e856` | Pet reacciona por fase del Método (`lib/guide`); se desmonta la sección del 2º toro; voseo |
| `c4b0bd3` | **PixelDivider**: disolución de píxeles entrando/saliendo del caso de estudio |
| `fa40085` | **Fase A**: sistema v2 (token de radio, página gris + tarjetas blancas, hairlines, sin sombras duras), `BRANDING.md` v2 |

Notas de entrega previas (la nube no tenía push):
- Los parches `.patch` generados: `mio-hero-pet-stage`, `mio-fase0-perf`, `mio-visual-1…6`, `mio-reform-1`, `mio-reform-2` (2 commits), `mio-system-1`. El usuario subió él mismo los primeros 4 commits; el resto estaba pendiente de aplicar/ver. **Si en tu copia local faltan commits, aplicá los parches en ese orden con `git am`.**
- Ramas locales viejas del usuario: `lusion-fase0`, `lusion-pets`, `lusion-visual-1`.

### Mediciones (build de producción, sin navegador real)
- JS de carga inicial de la landing: **3620 kB → 1456 kB** (gzip ~1045 → ~398 kB). echarts (1146 kB) y Firestore (516 kB) ya no se precargan.
- `tsc --noEmit`: **10 errores preexistentes** (shims `next/*`, `TestPetPage`, `clientDataProfiler`). Ninguno viene de archivos nuevos. **No aumentar.**
- FPS real: **sin medir** (hay que probar en el M2).

---

## 5. Arquitectura de la landing actual

Orden en `App.tsx` (`<main>`): `HeroDOM` → `ProblemaDOM` → `ComoFuncionaDOM` → `PixelDivider(page→#06040e, acento violeta)` → `FullBleedCaseStudyDOM` → `PixelDivider(#06040e→page, acento lima)` → `QuienesSomosDOM` → `CtaBannerDOM`. Fuera de `<main>`: `BootSequence`, `LusionCanvas`, `SectionRail`, `MioFloatingCompanion` (lazy), `CookieBannerFloating`.

**Historia en 5 actos** tras el hero (ids en `lib/landingSections.ts`): `hero` 01 Inicio · `problema` 02 · `como-funciona` 03 Método · `casos-estudio` 04 Prueba · `quienes-somos` 05 Equipo · `cta` 06 Probar. Cada sección declara `guide: { mood, line }` (humor y frase del pet). **Las líneas son borrador mío; el usuario las corrige.**

Piezas clave:
- **Guía** (`lib/guide.ts` `emitGuide/onGuide`, `hooks/useActiveSection.ts` con un solo IntersectionObserver `rootMargin -50%`, `ui/SectionRail.tsx` desde `xl`): el compañero flotante cambia de humor y habla al entrar a cada sección. Oculto mientras `#hero` tiene ratio > 0.35; si el visitante jugó con él (gracia de 8 s) o cerró la burbuja, no insiste. `ComoFuncionaDOM` maneja la guía fase por fase.
- **BootSequence**: una vez por sesión (`sessionStorage 'mio-boot-seen'`), mínimo 1,1 s, tope 3,8 s, progreso real (fuente Climate Crisis + `loadPetScene('reposo','violeta')`), saltable. `lib/boot.ts` tiene el flag a nivel módulo. **No llamar `markBootDone` en el cleanup de un efecto** (StrictMode lo ejecuta doble).
- **Eje YEAR**: Climate Crisis es variable con `YEAR` 1979–2050. Se maneja con `--mio-year` vía ScrollTrigger sobre el hero (`.font-climate * { font-variation-settings: 'YEAR' var(--mio-year, 1979) }`). Medido con fontTools: el ancho solo se achica hasta −1,5 %, no rompe el layout.
- **Reveal**: barrido por `clip-path` con GSAP, una sola vez, `clearProps`, insets negativos para no cortar sombras, se saltea con reduced-motion.
- **PixelDivider**: canvas 2D, ruido hash determinista, guiado por ScrollTrigger.
- **Hero**: titular con eje YEAR, tarjeta "CORRIDA DE DEMOSTRACIÓN" (rotulada como dato de demo), MIO-DEV, `MioHeroStage` con el pet 3D vivo.
- **Pet 3D**: `MioHeroStage.tsx` (renderer propio, `renderGate` para pausar fuera de pantalla), `petKit.ts` (carga de escenas/estados).

---

## 6. Sistema de diseño v2 ("Editorial dither")

Lema: **"contenedores orgánicos, datos mecánicos."**

- Un solo token: `--mio-radius: 16px` → `rounded-mio` (16) y `rounded-mio-sm` (60 %). Definidos en `globals.css` y `tailwind.config.js`.
- Página gris `#f3f3f5`; tarjetas blancas planas, borde hairline `border-black/10` (oscuro: `border-white/10`). **Sin sombras de desplazamiento, sin `border-2`** en la landing.
- Datos/consola/telemetría/celdas de progreso: **cuadrados**, mono, números tabulares.
- Lima solo como chispa; campos grandes en violeta profundo/obsidiana.
- Imaginería: dither de una sola gamma (violeta / lavanda / obsidiana), generada por código, que **sangra por los bordes** de la página (no todo centrado).
- `SectionPlate`: chip de índice (violeta, o lima en oscuro) + etiqueta mono con LED redondo, sin caja.
- Restos de v1 aún en el código: tokens `neo-*` de sombra en Tailwind (sin uso en la landing), `RouteFallback` en `App.tsx` y las páginas internas (dashboard/admin/login) siguen siendo neo-brutalistas.

---

## 7. Referencia: Legency (legencymedia.com) → traducción a MIO

El usuario mandó 12 capturas y dijo: *"me gustan las animaciones, y que no tienen miedo de acercarse a los bordes de la página, no todo tan céntrico"*. Observado:
1. **Nav partida y despegada**: barra blanca compacta arriba-izquierda (logo + "Menu"); CTA separado arriba-derecha (bloque de color + cuadrado blanco con flecha). Todo en los bordes.
2. **Imagen que sangra**: planeta dither a la derecha del hero, saliéndose por arriba/costado; titular enorme, tracking muy cerrado, palabras clave en el color de marca.
3. **Una sola gramática**: todas las ilustraciones en dither de un solo tono.
4. **Superficies**: página gris, tarjetas blancas planas con esquinas suaves, secciones oscuras a todo ancho con textura dither, tarjeta negra montada sobre el corte entre secciones.
5. **Escenas fijadas apiladas**: paneles grandes (chip numérico, titular, párrafo, línea de progreso, ilustración dither a la derecha) que se apilan al scrollear.
6. **Detalles**: letras que caen en titulares; marquesina de texto en arco alrededor de un mosaico con logo (CTA final); botón con flechas que flanquean el texto.
7. **Footer a todo color**; miniatura fija abajo a la derecha (función sin confirmar).

| Legency | MIO |
|---|---|
| Azul + negro + lavanda | Violeta profundo + obsidiana + lavanda; lima como chispa |
| Planeta dither | **MIO bot dither en vivo**, gigante, saliendo por el borde derecho |
| Portadas dither | 5 ilustraciones dither **procedurales** (planilla caótica, anomalías, modelos compitiendo, barras SHAP, chat) |
| Tarjetas blancas redondeadas | Igual; **datos y consola siguen mecánicos** |
| Escenas apiladas | Método en 3 fases (y quizá Problema) con ilustración a la derecha |
| Marquesina en arco | CTA: "Subí una planilla" girando alrededor de un mosaico con el pet |
| Letras que caen | Se suma a `FlipText` y al eje `YEAR` |

Limitación: solo hubo capturas fijas; el movimiento exacto es interpretación.

---

## 8. Roadmap (fases) y siguiente paso

Decisiones tomadas por el usuario (AskUserQuestion): historia en **5 actos**; textos **redactados por mí en voz rioplatense** (borrador, él corrige); cifras del hero = **dato de demostración rotulado**; pet = **hilo conductor**; radio **suave ~16 px**; hero protagonista = **MIO bot en dither en vivo**; primer paso = **Fase A** (hecha).

- **A. Sistema** — ✅ hecha (`fa40085`).
- **B. Kit de dither** ← **SIGUIENTE** (ver §8.2).
- **C. Chrome**: nav partida (logo+menú izquierda, CTA derecha, fijos) con **menú a pantalla completa**; footer a todo color. *Listo cuando*: navegación, login/logout y rutas internas siguen andando.
- **D. Hero**: MIO bot en dither en vivo (un solo renderer, post-proceso Bayer, pausado fuera de pantalla), saliendo por el borde; tarjeta oscura de corrida de demo que se monta sobre el corte con la sección siguiente. *Listo cuando*: 60 fps medidos en M2; fallback estático en mobile/reduced-motion.
- **E. Actos**: Problema como tarjetas; Método como escenas apiladas fijadas con ilustración; Prueba a todo ancho con textura dither + chips de métricas + barra de cierre; Equipo; CTA con marquesina en arco.
- **F. Pulido de movimiento**: letras que caen, botón con flechas flanqueantes, elementos anclados a bordes, miniatura de sección (si se aprueba), revisión de reduced-motion y mobile.
- Pendientes del roadmap viejo: DPR adaptativo, limpiar carpetas duplicadas, intro del hero (pet cae a la plataforma), showcase fijado con dashboard real, bug del ripple en el CTA, timing de `MioNeuralFlow`, Fase 3 (botones magnéticos, cursor con mira, sonido silenciable, cortinas dither entre rutas), Fase 4 (accesibilidad, mobile, SEO/OG, Lighthouse, post de making-of).

### 8.2 Fase B — especificación

1. `src/components/ui/DitherArt.tsx`: canvas 2D, **matriz de Bayer 8×8**, paleta de 3 niveles (obsidiana / violeta / lavanda), `image-rendering: pixelated`/nearest-neighbor, render **una vez** y en resize (cero costo por frame). Props: `variant`, `seed`, `width/height` lógicos, `pixelSize`, `bleed` (lado por el que sangra), `tone`.
2. **5 ilustraciones procedurales** (generan un campo de luminancia por código y lo pasan por Bayer): (a) planilla caótica (grilla con celdas rotas), (b) anomalías (serie con picos marcados), (c) modelos compitiendo (curvas/bandas de incertidumbre), (d) barras SHAP, (e) burbujas de chat.
3. **Textura dither** reutilizable para fondos de sección oscura.
4. Criterio: las 5 existen, comparten paleta y se ven nítidas en DPR 1 y 2; no rompen LCP.
5. Después: demo en una ruta de laboratorio (p. ej. `/test-dither`) para revisar antes de integrarlas en la Fase E.

### Riesgos
- Dither en vivo del bot (Fase D): costo de GPU → un renderer, DPR acotado, pausa fuera de pantalla, versión estática en mobile/reduced-motion.
- El violeta de MIO es menos saturado que el azul de Legency → campo grande en un tono más profundo.
- Contraste del lima sobre claro falla WCAG (1,15:1) → no usar lima para texto sobre claro.

---

## 9. Pendientes y datos que faltan del usuario

1. **URLs reales** de LinkedIn y GitHub de Tadeo y Milena (hoy apuntan a las portadas).
2. ¿Las cifras de demo (14.200 filas, 1.280 anomalías, R² 0,984) son **reales o placeholder**? Hoy se repiten en el hero y en el caso de estudio y están rotuladas como demo. Ideal: benchmark real.
3. **Revisar el copy** nuevo y las líneas del pet guía (`lib/landingSections.ts`).
4. Decidir si se **borra `PoderCorporativoDOM`** y si se restaura la sección del torus (`DitherFigureTransitionDOM`; desmontada en `fe7e856` porque tenía cifras inventadas).
5. Opcional: capturas del dashboard real para la sección Prueba.
6. ¿Mobile desde ya o después de desktop?
7. ¿Se queda el boot MIO OS (una vez por sesión, saltable)?

### Problemas conocidos / sin verificar
- **Pet 3D del hero**: en mi screenshot headless (software GL) se veía la consola pero no el pet; puede ser limitación de swiftshader. **Verificar en el M2.**
- Banner de cookies tapa parte de la consola en la primera visita (no tocado).
- Falta probar login y rutas internas tras el split de Fase 0 (lazy + Firestore diferido).
- Falta medir FPS en el M2.
- `Agents.md` y `RouteFallback`/páginas internas todavía hablan neo-brutalista.

---

## 10. Gotchas técnicos aprendidos

- **Lenis intercepta `window.scrollTo`**: en tests con Playwright, `scrollTo(0,1000)` deja `scrollY` en 0 (parecía una página en blanco). Usar `page.mouse.wheel` o el `scrollTo` del `SmoothScrollProvider`.
- **StrictMode** ejecuta los efectos dos veces: no liberar la compuerta del boot en el cleanup.
- **Scripts de edición**: un helper Python que abrió el archivo en `'w'` antes de leerlo lo truncó a 0 bytes (pasó con `NavbarDOM` y `PixelDivider`). Siempre leer primero, escribir después; comprobar con `tsc`/build.
- **Clip-path + sombras**: usar insets negativos en `Reveal`.
- Capturas en sandbox: Chromium + Playwright funcionan, pero el GL por software es lento y a veces hace timeout.
- Ejecutar comandos del repo **dentro de la carpeta del repo** (el usuario una vez corrió `git am` en `/`, FS de solo lectura; y re-aplicar un parche ya aplicado deja `git am` colgado → `git am --abort`).

---

## 11. Preferencias de trabajo del usuario (útiles para Claude Code)

- Quiere **autonomía real** y resultados visibles; prefiere recibir cambios incrementales que pueda ver en `localhost:3000`.
- Le molestan los **textos genéricos** ("vibecodeada"), los elementos flotantes, el aspecto infantil, el bajo rendimiento y los regresos no autorizados (una vez un agente borró la coreografía de scroll sin avisar). **Avisar siempre antes de borrar o desmontar algo**; hubo un commit mío (`fe7e856`) que desmontó una sección y se lo informé después: evitar repetirlo.
- Le gustan: animaciones finas, dither, elementos que tocan los bordes, el pet como protagonista, la consola MIO-DEV.
- Contexto de la marca ya acordado: BRANDING.md manda; los skills de diseño genéricos (taste, impeccable) **no** pisan la marca.

---

## 12. Plan de ahorro de tokens (evaluación)

Pegaste una lista de consejos (Caveman, RTK, repomix, `.claudeignore`, etc.). Evalué cuáles se sostienen:

**Aplicado en este repo (verificado contra la doc oficial de Claude Code):**
- `CLAUDE.md` corto (≈40 líneas) en la raíz, apuntando a este handoff solo bajo demanda. Regla de la doc: cada línea debe evitar un error real.
- **`.claudeignore` NO es una función oficial.** Lo oficial: reglas `permissions.deny` en `.claude/settings.json`. Quedó creado, bloqueando lectura de `node_modules`, `dist`, `package-lock.json`, `.env*` y **edición del backend** y push a `main`. (Ojo: `.gitignore` por sí solo no saca archivos del contexto.)

**Hábitos que sí rinden (oficiales):** `/clear` al cambiar de tarea; `/compact` al cerrar una fase (con foco: `/compact enfocate en Fase B`); `/context` para ver qué ocupa espacio; citar archivos con `@ruta` en vez de pedir que busque; empezar en modo plan para features grandes.

**Enrutado de modelos:** Sonnet para el código diario; Opus solo para planificar/diseñar arquitectura difícil; Haiku para búsquedas y docs. Los subagentes aceptan `model:` en su frontmatter o `CLAUDE_CODE_SUBAGENT_MODEL` en `settings.json → env`.

**MCP:** cada servidor MCP y skill suma costo fijo de arranque. Desactivá con `/mcp` los que no uses para este repo (conectores como Canva/Notion no hacen falta para codear la landing).

**No instalé (sin verificar):**
- **Caveman** (comprimir la salida): puede ahorrar tokens de salida, pero degrada explicaciones y el tono rioplatense, y para trabajo de diseño la prosa clara importa. Si lo querés, probalo A/B en una tarea corta.
- **RTK** (comprime salida de CLI): es código de terceros que se interpone entre tu shell y el modelo y corre con tus permisos; revisá su código fuente antes de instalarlo. La doc oficial consultada no menciona forma de filtrar salida de Bash con hooks.
- **repomix / "intent layer"**: Claude Code ya busca bajo demanda con grep/glob; empaquetar el repo entero suele costar más tokens, no menos.
- Las cifras "50–90 %" de la lista no tienen fuente verificable (las citas eran dominios sueltos). Medí vos: `/context` y `/cost` antes y después.

**Dónde se van realmente los tokens en MIO:** capturas de pantalla (cada imagen cuesta mucho: pedir recortes), releer componentes grandes (`MioHeroStage`, `MioDevCanvas`, `NavbarDOM`: usar `@archivo` y rangos), y `package-lock.json` (212 KB: ya bloqueado).

---

## 13. Referencias

- Doc de roadmap en el Project de claude.ai: `claude/roadmap-lusion.md` (versión larga con tablas de parches y análisis de Lusion).
- Lusion: case studies, blog de Oryzo, repo WebGL-Scroll-Sync (inspiración: assets a medida, hilo narrativo por scroll, contención, performance como parte del diseño, mostrar el proceso).
- Legency: legencymedia.com (referencia de arquitectura/diseño actual).
