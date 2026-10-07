# 🗺️ MAPA DEL PROYECTO: MIO (Data Operations & AutoML Cockpit)

> **Documento Oficial de Orientación para Agentes de IA y Desarrolladores.**  
> **Objetivo:** Permitir a cualquier agente o desarrollador ubicar con precisión quirúrgica cualquier archivo, componente, shader, tienda de estado o endpoint sin necesidad de gastar tokens explorando o indexando todo el proyecto.

---

## ⚡ 1. Resumen Ejecutivo y Arquitectura del Sistema

**MIO** es una plataforma integral de operaciones de datos y motor AutoML que combina una experiencia web 3D interactiva de alto rendimiento con un cockpit analítico avanzado.

### 📐 Arquitectura "Dual-Surface" + "Bridge"
El proyecto utiliza una arquitectura modular dividida en dos áreas principales conectadas mediante un puente tipado:
1. **SPA Raíz (`/src`)**: Aplicación principal en **React 18 + Vite + Three.js / R3F + GSAP + Lenis + Tailwind CSS**. Aloja la Landing Page (narrativa editorial en 5 actos), el router ligero SPA, el sistema de companion virtual (MIO Pet 2D/3D), los shaders GLSL puros y las páginas de aplicación.
2. **Motor AutoML (`/dashboard-ia`)**: 
   - `dashboard-ia/frontend/`: Suite de visualizaciones (ECharts, acabado suave v3), análisis exploratorio, series temporales, detección de anomalías (Isolation Forest con inspector $\pm\sigma$), segmentación (K-Means) y atribución (SHAP/Gini).
   - `dashboard-ia/backend/`: **FastAPI Backend (STRICTLY READ-ONLY ⚠️)**.
3. **Mecanismo de Puente (Bridge & Shims)**:
   - `vite.config.ts` define el alias `@dashboard-ia` apuntando a `./dashboard-ia/frontend/src`.
   - `src/shims/` provee shims para `next/link`, `next/image`, `next/navigation` y `next/dynamic`, permitiendo que los componentes de `dashboard-ia/frontend` corran en Vite sin cambios.
   - `src/components/` contiene re-exportaciones de puente (`DynamicChartRenderer`, `FileUploader`, `ColumnRoleSelector`, etc.) para que ambos lados compartan contratos sin duplicar código.

---

## 🛑 2. Reglas Sagradas e Invariantes Críticas

Cualquier agente que opere en este repositorio **DEBE** respetar las siguientes reglas sin excepción:

| Regla | Descripción | Consecuencia de violarla |
| :--- | :--- | :--- |
| **EL BACKEND NO SE TOCA** | El directorio `dashboard-ia/backend/` es **ESTRICTAMENTE DE SÓLO LECTURA**. | Rechazo inmediato del PR. Todo ajuste debe resolverse en el frontend. |
| **RAMA DE TRABAJO EXCLUSIVA** | Todo desarrollo, commit y push se realiza **únicamente en la rama `claude/lusion-redesign`**. | Prohibido hacer push o merge directo a `main` o `tyc`. |
| **REPOSITORIO REMOTO OFICIAL** | El único remoto válido es `https://github.com/milena-abraham/dashboard-ia.git`. | Prohibido apuntar a forks personales. |
| **PREVENCIÓN DE MEMORY LEAKS** | Prohibido instanciar `new THREE.Geometry`, `new THREE.Material` o `new THREE.Raycaster` dentro de bucles `useFrame` o `requestAnimationFrame`. | Fugas de VRAM y congelamiento del navegador. |
| **THROTTLING DE RENDERIZADO** | El pixel ratio de Three.js debe estar estrictamente limitado a `Math.min(window.devicePixelRatio, 1.5)`. | Degeneración de FPS en pantallas Retina/4K. |
| **ANTI-BLOAT EN GIT** | `.gitignore` excluye `.csv`, `.mov`, `.zip`, `.tsbuildinfo`, `.antigravity/`, `artifacts/`, `archive-2/`. | Prohibido commitear archivos binarios pesados o temporales. |
| **COMPRESIÓN DE ASSETS** | Modelos 3D deben ser `.glb` comprimidos con Draco. Texturas en `.webp` o `KTX2`. | Prohibido usar `.obj`, `.fbx` o texturas `.png` pesadas para 3D. |
| **DUAL THEME PARITY** | Toda interfaz debe tener paridad perfecta entre modo claro (página `#f3f3f5`, tarjetas `#ffffff`) y modo oscuro (`#07070a` / `#0b0914`). | Inconsistencia visual. |

---

## 🧭 3. Tabla de Búsqueda Rápida ("Cheat Sheet" para Agentes)

¿Qué necesitas hacer? Consulta esta tabla para ir **directamente** al archivo indicado:

| Necesidad / Tarea | Archivo(s) a modificar / consultar |
| :--- | :--- |
| **Cambiar texto o layout del Hero de la Landing** | [`src/components/dom/HeroDOM.tsx`](src/components/dom/HeroDOM.tsx) |
| **Modificar el robot 3D / dither del Hero** | [`src/components/canvas/MioDitherBotHeroStage.tsx`](src/components/canvas/MioDitherBotHeroStage.tsx) |
| **Modificar las partículas 3D de fondo (Lusion)** | [`src/components/canvas/LusionCanvas.tsx`](src/components/canvas/LusionCanvas.tsx) |
| **Modificar la transición geométrica 3D** | [`src/components/canvas/DitherGeometricShape.tsx`](src/components/canvas/DitherGeometricShape.tsx) |
| **Ajustar el companion flotante MIO (diálogos, mood, audio)** | [`src/components/pet/MioFloatingCompanion.tsx`](src/components/pet/MioFloatingCompanion.tsx) & [`src/components/pet/petKit.ts`](src/components/pet/petKit.ts) |
| **Agregar o editar una ruta en la aplicación** | [`src/app/App.tsx`](src/app/App.tsx) |
| **Añadir o retocar una sección de la Landing** | [`src/components/dom/`](src/components/dom/) |
| **Ajustar colores de marca, fuentes o sombras de Tailwind** | [`tailwind.config.js`](tailwind.config.js) & [`src/styles/globals.css`](src/styles/globals.css) |
| **Ajustar el estado global (tema, volumen, pet, telemetría)** | [`src/utils/useMioStore.ts`](src/utils/useMioStore.ts) |
| **Modificar la comunicación con el Backend (API client)** | [`src/lib/apiClient.ts`](src/lib/apiClient.ts) |
| **Hidratación y validación de respuestas JSON del análisis** | [`src/utils/projectAnalysisHydrator.ts`](src/utils/projectAnalysisHydrator.ts) |
| **Perfilado de CSV en el cliente (nulos, tipos, z-scores)** | [`src/utils/clientDataProfiler.ts`](src/utils/clientDataProfiler.ts) |
| **Modificar o agregar un gráfico ECharts al Dashboard** | [`dashboard-ia/frontend/src/features/dashboard/components/`](dashboard-ia/frontend/src/features/dashboard/components/) & [`dashboard-ia/frontend/src/components/charts/`](dashboard-ia/frontend/src/components/charts/) |
| **Cambiar lo que dice el dashboard (hallazgos, notas, próximos pasos)** | [`src/components/dashboard/insights.ts`](src/components/dashboard/insights.ts) (funciones puras, con tests en `src/test/insights.test.ts`) |
| **Vista Presentación, modo Presentar e índice de Trabajo** | [`src/components/dashboard/`](src/components/dashboard/) (`ResultadoMejorado`, `Presentar`, `blocks`, `SectionIndex`); el encabezado y la vista Trabajo viven en [`src/pages/DashboardPage.tsx`](src/pages/DashboardPage.tsx) |
| **Modificar la vista principal del Dashboard AutoML** | [`src/pages/DashboardPage.tsx`](src/pages/DashboardPage.tsx) |
| **Modificar la vista de Proyectos / Datasets** | [`src/pages/ProjectsPage.tsx`](src/pages/ProjectsPage.tsx) |
| **Modificar la vista de Telemetría Admin** | [`src/pages/AdminPage.tsx`](src/pages/AdminPage.tsx) |
| **Modificar la autenticación (Google SSO / Firebase)** | [`src/pages/LoginPage.tsx`](src/pages/LoginPage.tsx) & [`src/lib/firebaseAuth.ts`](src/lib/firebaseAuth.ts) |
| **Modificar shaders GLSL puros** | [`src/shaders/`](src/shaders/) |
| **Ejecutar o añadir pruebas unitarias** | [`src/test/`](src/test/) |

---

## 🗂️ 4. Guía Exhaustiva Directorio por Directorio

```
MIo/
├── package.json                   # Dependencias y scripts de construcción
├── vite.config.ts                 # Configuración de Vite, Rollup manualChunks, alias
├── tailwind.config.js             # Paleta cromática MIO, fuentes y sombras
├── tsconfig.json                  # Configuración base de TypeScript
├── index.html                     # Shell HTML raíz, precarga de fuentes
├── .gitignore                     # Filtros anti-bloat estrictos
├── AGENTS.md / Agents.md          # Directivas operativas de los 3 agentes
├── BRANDING.md                    # Manual de marca, identidad visual y reglas
├── DESIGN.md                      # Sistema de diseño v2 (regla 80/15/5; en conflicto mandan CLAUDE.md y BRANDING.md)
├── DEPLOY.md                      # Procedimientos de despliegue en producción
├── MAPA_DEL_PROYECTO.md           # [ESTE ARCHIVO] Mapa maestro de navegación
│
├── src/                           # APLICACIÓN PRINCIPAL (Vite + React SPA)
│   ├── main.tsx                   # Punto de entrada de la aplicación
│   ├── vite-env.d.ts              # Declaración de tipos de Vite y GLSL
│   │
│   ├── app/                       # Shell y enrutamiento
│   │   ├── App.tsx                # Enrutador SPA reactivo (popstate), shells de página
│   │   └── providers/
│   │       └── SmoothScrollProvider.tsx  # Proveedor de scroll suave (Lenis)
│   │
│   ├── pages/                     # Vistas principales de página completa
│   │   ├── DashboardPage.tsx      # Cockpit AutoML interactivo (ECharts, profiling, chat)
│   │   ├── ProjectsPage.tsx       # Gestión de proyectos, selector de datasets
│   │   ├── AdminPage.tsx          # Telemetría de servidor, gauges de latencia y logs
│   │   ├── LoginPage.tsx          # Acceso Google SSO, selector de workspace
│   │   ├── TestPetPage.tsx        # Laboratorio interactivo para testear a MIO Pet
│   │   ├── TerminosPage.tsx       # Cumplimiento legal: Términos de Servicio
│   │   ├── PrivacidadPage.tsx     # Cumplimiento legal: Política de Privacidad
│   │   ├── CookiesPage.tsx        # Cumplimiento legal: Política de Cookies
│   │   ├── AvisoLegalPage.tsx     # Cumplimiento legal: Aviso Legal societario
│   │   ├── DpaPage.tsx            # Cumplimiento legal: Data Processing Agreement
│   │   └── ArrepentimientoPage.tsx# Cumplimiento legal: Botón de revocación de compra
│   │
│   ├── components/
│   │   ├── dom/                   # Secciones HTML/DOM de la Landing (Historia 5 actos)
│   │   │   ├── NavbarDOM.tsx      # Split Navigation flotante (islas despegadas)
│   │   │   ├── HeroDOM.tsx        # Acto 1: Titular monumental, consola y bot dither
│   │   │   ├── ProblemaDOM.tsx    # Acto 2: El problema ("Hoy vs Con MIO")
│   │   │   ├── ComoFuncionaDOM.tsx# Acto 3: El método en 3 fases apiladas
│   │   │   ├── FullBleedCaseStudyDOM.tsx # Acto 4: Caso de estudio retail a pantalla completa
│   │   │   ├── DitherFigureTransitionDOM.tsx # Acto 5: Malla topológica 3D interactiva
│   │   │   ├── QuienesSomosDOM.tsx# Fundadores (Tadeo Muñoz Garcés & Milena Abraham, Rosario)
│   │   │   ├── CtaBannerDOM.tsx   # Bloque brutalista de llamada a la acción
│   │   │   ├── FooterDOM.tsx      # Pie monumental con telemetría y cumplimiento legal
│   │   │   ├── LegalPageShell.tsx # Plantilla para páginas legales con lectura limpia
│   │   │   ├── TelemetryMarquee.tsx # Marquesina con métricas en tiempo real
│   │   │   ├── AuditDrawerDOM.tsx # Drawer lateral con auditoría de operaciones
│   │   │   ├── MioNeuralFlow.tsx  # Diagrama de flujo neural reactivo
│   │   │   └── MioRippleBackground.tsx # Ondas de fondo suaves
│   │   │
│   │   ├── canvas/                # Escenas 3D, WebGL y R3F (Regla: shaders separados)
│   │   │   ├── LusionCanvas.tsx   # Partículas especulares 3D de fondo (dark/light)
│   │   │   ├── MioDitherBotHeroStage.tsx # Robot MIO en el Hero con sombreado de semitonos
│   │   │   ├── DitherGeometricShape.tsx # Malla dither 3D que responde al cursor y scroll
│   │   │   ├── MioRaymarcherCanvas.tsx # Raymarcher volumétrico GLSL puro
│   │   │   ├── MioHeroStage.tsx   # Escenario 3D alternativo para el hero
│   │   │   ├── MioPipelineDitherCanvas.tsx # Visualizador de etapas del pipeline en dither
│   │   │   ├── MioDitherPlanet.tsx# Esfera / planeta con shader dither
│   │   │   ├── MioBackgroundShader.tsx # Fragment shader de fondo dinámico
│   │   │   ├── MioDeviceSchematic.tsx # Esquemático de hardware tipo blueprint
│   │   │   ├── MioDevCanvas.tsx   # Canvas inspector de modelos 3D para desarrollo
│   │   │   ├── PixelateRevealCanvas.tsx # Post-procesado de revelado por pixelación
│   │   │   ├── DitherHeroStageCanvas.tsx # Variación de escenario hero dither
│   │   │   └── DitherMatrixCanvas.tsx # Matriz dither de fondo
│   │   │
│   │   ├── pet/                   # Sistema del Companion Virtual MIO
│   │   │   ├── MioFloatingCompanion.tsx # Companion persistente flotante y arrastrable
│   │   │   ├── MioPet2D.tsx       # Renderizador de fallback 2D con sprites
│   │   │   ├── MioPet3D.tsx       # Renderizador 3D Three.js con modelos GLB animados
│   │   │   ├── Mio.tsx            # Orquestador unificado de MIO
│   │   │   └── petKit.ts          # Estados de ánimo, catálogo de frases, timers y audio
│   │   │
│   │   ├── ui/                    # Componentes UI Táctiles & Neo-Brutalistas
│   │   │   ├── TactileCard.tsx    # Tarjeta táctil con elevación suave y hairlines
│   │   │   ├── SectionPlate.tsx   # Placa de sección estilo hardware
│   │   │   ├── SectionRail.tsx    # Riel lateral con indicador de scroll de secciones
│   │   │   ├── Badge.tsx          # Micro-etiquetas con indicadores LED de color
│   │   │   ├── Button.tsx         # Botón estándar táctil con escala activa
│   │   │   ├── BubbleArrowButton.tsx # Botón con indicador de flecha en burbuja
│   │   │   ├── GlassCard.tsx      # Tarjeta translúcida con filtro backdrop-blur
│   │   │   ├── BootSequence.tsx   # Pantalla de booteo cyber-industrial (MIO OS)
│   │   │   ├── AnalogGrainOverlay.tsx # Capa de grano de película analógico
│   │   │   ├── AsciiOverlay.tsx   # Capa con matriz de caracteres ASCII
│   │   │   ├── FlipText.tsx       # Efecto de texto desencriptador / cypher scramble
│   │   │   ├── ScrambleText.tsx   # Variante de scrambler para micro-interacciones
│   │   │   ├── AnimatedCounter.tsx# Contador numérico con animación de entrada
│   │   │   ├── KineticCounter.tsx # Contador kinético en eje YEAR
│   │   │   ├── Reveal.tsx         # Efecto de revelado direccional con cortina
│   │   │   ├── CookieBannerFloating.tsx # Banner flotante de consentimiento de cookies
│   │   │   ├── LegalConsentModal.tsx # Modal con pestañas legales (Términos, Privacidad, Cookies)
│   │   │   ├── DataConsentModal.tsx # Modal de consentimiento previo a la carga de datos
│   │   │   └── AuthAndWorkspaceModal.tsx # Modal unificado de login y selección de workspace
│   │   │
│   │   └── [Bridges al Dashboard] # Re-exportaciones para compartir componentes con @dashboard-ia
│   │       ├── ColumnRoleSelector.tsx   # Selector de roles de columna (Target, Features, etc.)
│   │       ├── DatasetJoinPanel.tsx     # Panel de unión y fusión de datasets
│   │       ├── DynamicChartRenderer.tsx # Renderizador dinámico de gráficos ECharts
│   │       ├── FileUploader.tsx         # Uploader drag-and-drop con validación de datasets
│   │       ├── KPICards.tsx             # Tarjetas con métricas clave de la corrida
│   │       ├── LoadingAnalysis.tsx      # Skeleton y estados de carga del análisis
│   │       ├── LogDetailsRenderer.tsx   # Visualizador de registros y eventos técnicos
│   │       ├── ChartErrorBoundary.tsx   # Límite de errores para gráficos ECharts
│   │       ├── ChartLegendExplainer.tsx # Desglose explicativo de leyendas analíticas
│   │       ├── DataChatbot.tsx          # Interfaz de chat analítico sobre datos
│   │       └── DataQualityBadge.tsx     # Indicador de salud y calidad de datos
│   │
│   ├── shaders/                   # SHADERS GLSL PUROS (Regla F: estrictamente aislados)
│   │   ├── particles.vert.glsl    # Vértices de partículas Lusion con dispersión
│   │   ├── particles.frag.glsl    # Fragmento de partículas Lusion con tinte adaptativo
│   │   ├── shockwave.vert.glsl    # Geometría de onda de choque
│   │   ├── shockwave.frag.glsl    # Anillo de distorsión para ondas de choque
│   │   ├── pixelation.vert.glsl   # Malla para efecto de pixelación
│   │   ├── pixelation.frag.glsl   # Muestreo cuantizado de píxeles
│   │   ├── mioBackground.vert.glsl# Fondo dinámico: malla
│   │   ├── mioBackgroundField.frag.glsl # Fondo dinámico: campo de gradiente y ruido
│   │   ├── mioBackgroundPost.frag.glsl  # Fondo dinámico: post-procesado
│   │   └── mio/
│   │       ├── mio_quad.vert.glsl # Quad de pantalla completa para raymarcher
│   │       ├── mio_scene.frag.glsl# Función de distancia con campos de distancia con signo (SDF)
│   │       ├── mio_blur.frag.glsl # Filtro de desenfoque gaussiano
│   │       └── mio_compose.frag.glsl # Composición final del raymarcher
│   │
│   ├── utils/                     # ESTADO GLOBAL Y LÓGICA DE NEGOCIO
│   │   ├── useMioStore.ts         # Tienda Zustand principal (tema, pet, audio, workspace)
│   │   ├── projectAnalysisHydrator.ts # Hidratador y sanitizador de payloads del backend
│   │   ├── clientDataProfiler.ts  # Perfilador en cliente de CSVs (tipos, nulos, z-scores)
│   │   ├── useFounderAuth.ts      # Verificador de privilegios de fundador
│   │   ├── mathHelpers.ts         # Funciones matemáticas de interpolación y curvas
│   │   └── sound.ts               # Fachada de llamadas de sonido para componentes
│   │
│   ├── lib/                       # SERVICIOS, INTEGRACIONES Y CLIENTES
│   │   ├── apiClient.ts           # Cliente HTTP con rotación automática (proxy y Render)
│   │   ├── api.ts                 # Re-exportaciones de contratos de API
│   │   ├── firebase.ts            # Inicialización de la app Firebase
│   │   ├── firebaseAuth.ts        # Manejo de sesión con Google SSO
│   │   ├── geminiChat.ts          # Integración directa con streaming de la API de Gemini
│   │   ├── landingSections.ts     # Registro de secciones de landing para scroll y companion
│   │   ├── renderGate.ts          # Comprobación de aceleración por hardware / WebGL
│   │   ├── sound.ts               # Sintetizador procedural con Web Audio API pura
│   │   ├── gsap.ts                # Inicialización de GSAP y ScrollTrigger
│   │   ├── boot.ts                # Registro de estado de booteo de la sesión
│   │   └── utils.ts               # Utilidad `cn` (clsx + tailwind-merge)
│   │
│   ├── shims/                     # ADAPTADORES NEXT.JS PARA VITE
│   │   ├── next-link.tsx          # Shim de `<Link>` para SPA sin recarga
│   │   ├── next-image.tsx         # Shim de `<Image>` optimizado para etiquetas `<img>`
│   │   ├── next-navigation.ts     # Shim de `useRouter`, `usePathname`, `useSearchParams`
│   │   └── next-dynamic.tsx       # Shim de `dynamic()` con `React.lazy` y `Suspense`
│   │
│   ├── hooks/
│   │   └── useActiveSection.ts    # Detección por IntersectionObserver de la sección activa
│   │
│   ├── types/
│   │   └── analysis.ts            # Tipos TypeScript para esquemas de análisis y gráficos
│   │
│   ├── styles/
│   │   └── globals.css            # Fuentes (@font-face), tokens CSS, focus WCAG y resets
│   │
│   └── test/                      # BATERÍA DE PRUEBAS VITEST
│       ├── apiClient.test.ts      # Pruebas de conmutación por error y rotación de URL base
│       ├── petKit.test.ts         # Pruebas del motor de estados de ánimo del companion
│       ├── routes.test.ts         # Pruebas de resolución de rutas SPA
│       └── useMioStore.test.ts    # Pruebas de mutación de estado en Zustand
│
├── dashboard-ia/                  # MOTOR AUTOML Y MÓDULOS DEL DASHBOARD
│   │
│   ├── frontend/                  # SUITE DE COMPONENTES DEL DASHBOARD
│   │   └── src/
│   │       ├── features/
│   │       │   ├── dashboard/     # Módulos analíticos del dashboard
│   │       │   │   ├── components/
│   │       │   │   │   ├── ExploratoryCharts.tsx   # Gráficos exploratorios (Barras, Dispersión)
│   │       │   │   │   ├── AnomaliesSection.tsx    # Detección Isolation Forest + tabla $\pm\sigma$
│   │       │   │   │   ├── ForecastSection.tsx     # Pronóstico de series temporales (Fan Charts)
│   │       │   │   │   ├── SegmentationSection.tsx # Clusters K-Means (Donut + Radar)
│   │       │   │   │   ├── FeatureImportanceSection.tsx # Atribución SHAP y Gini
│   │       │   │   │   └── AnomalyTableInspector.tsx    # Inspector detallado de anomalías
│   │       │   │   ├── useDashboardState.ts        # Manejador del estado del dashboard
│   │       │   │   └── useChartExport.ts           # Exportador de gráficos a PNG / PDF
│   │       │   ├── admin/         # Componentes y estado de administración
│   │       │   │   ├── useAdminState.tsx           # Estado y sondeo de métricas de telemetría
│   │       │   │   └── components/                 # Tablas y tarjetas de administración
│   │       │   └── projects/      # Gestión de proyectos de datos
│   │       │       └── useProjectsState.ts         # Estado de proyectos activos
│   │       ├── components/
│   │       │   └── charts/        # Constructores y temas de ECharts
│   │       │       ├── baseOptions.ts              # Opciones base de visualización
│   │       │       ├── normalizer.ts               # Normalizador de datos crudos
│   │       │       ├── palettes.ts                 # Paletas Neo-Brutalistas
│   │       │       └── builders/                   # Constructores por tipo de gráfico
│   │       └── lib/
│   │           ├── echartsNeoBrutalistTheme.ts     # Tema oficial Neo-Brutalista para ECharts
│   │           ├── pdfExport.ts                    # Generador de reportes PDF ejecutivos
│   │           └── formatters.ts                   # Formateadores numéricos y de moneda
│   │
│   └── backend/                   # ⚠️ FASTAPI BACKEND (ESTRICTAMENTE DE SÓLO LECTURA)
│       └── app/
│           ├── main.py            # Servidor FastAPI y configuración CORS
│           ├── api/endpoints/     # Rutas (/upload, /analyze, /chat, /health, /logs)
│           └── services/          # Modelos ML (Isolation Forest, K-Means, Prophet, SHAP)
│
├── public/                        # RECURSOS ESTÁTICOS
│   ├── models/                    # Modelos 3D (.glb comprimidos con Draco) y HDRs
│   │   ├── mio_reposo.glb         # Modelo MIO en reposo (idle)
│   │   ├── mio_trabajando.glb     # Modelo MIO analizando datos
│   │   ├── mio_celebrando.glb     # Modelo MIO festejando hallazgos
│   │   ├── mio_anomalia.glb       # Modelo MIO en alerta de anomalía
│   │   ├── mio_durmiendo.glb      # Modelo MIO en bajo consumo
│   │   ├── mio_env_three.hdr      # Mapa de iluminación ambiente de estudio Three.js
│   │   └── mio_env_blender.hdr    # Mapa de iluminación de renderizado Blender
│   ├── renders/                   # Sprites 2D pre-renderizados en alta definición
│   │   ├── mio_idle_violet.png    # Sprite MIO reposo violeta
│   │   ├── mio_working_violet.png # Sprite MIO trabajando violeta
│   │   ├── mio_celebrating_violet.png
│   │   ├── mio_anomaly_violet.png
│   │   └── mio_sleeping_violet.png
│   ├── fonts/                     # Tipografías oficiales
│   │   ├── ClimateCrisis-Regular-VariableFont_YEAR.ttf # Tipografía display monumental
│   │   └── Wellfleet-Regular.ttf  # Tipografía mono-espaciada con serifa de hardware
│   ├── data/                      # Resultados de benchmark estáticos
│   │   └── benchmark_results.json # Datos de validación de modelos
│   └── images/                    # Ilustraciones de semitono y referencias
│
├── scripts/                       # SCRIPTS Y HERRAMIENTAS
│   ├── benchmark_retail.py        # Validador de métricas sMAPE, WAPE y RMSE
│   └── renders/                   # Generación de modelos y renderizado 3D en Blender
│       ├── mio3d.py               # Generador procedural de geometrías
│       ├── render_mio.py          # Script de renderizado por lotes
│       └── requirements.txt       # Dependencias de Python para renderizado
│
└── datasets/                      # DATASETS DE PRUEBA (Excluidos de Git por .gitignore)
    └── archive/                   # Datasets CSV de referencia (150k órdenes retail, etc.)
```

---

## 🚦 5. Comandos de Terminal Fundamentales

Para garantizar la integridad y estabilidad del proyecto, utiliza siempre estos comandos:

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo local (Puerto 3000 con proxy a :10000)
npm run dev

# 3. Comprobar tipos de TypeScript (debe pasar con 0 errores)
npm run lint

# 4. Ejecutar la batería de pruebas unitarias (Vitest)
npm test

# 5. Compilar para producción (Genera dist/ con index.html, 200.html y 404.html)
npm run build

# 6. Previsualizar la compilación de producción localmente
npm run preview
```

---

## 🎨 6. Paleta y Sistema de Diseño (Extracto Esencial de BRANDING.md & DESIGN.md)

* **Regla 80 / 15 / 5**:
  - **80% Neutros:** Superficies limpias (`#f3f3f5` en light, `#07070a` en dark, tarjetas `#ffffff` y `#0e0d16`).
  - **15% Violeta:** Elementos estructurales, chasis de dispositivos, sombras profundas (`#602cd1` / `#7647eb` / `#3d1f8a`).
  - **5% Lima:** Exclusivamente para acciones primarias, pulsos de servidor y picos de tendencia (`#bdf559`). **Nunca más del 5% del campo visual.**
* **Tipografía**:
  - **Monumental Display:** `Climate Crisis` con variación de eje `YEAR` según el scroll.
  - **Títulos y Cuerpo:** `Plus Jakarta Sans`.
  - **Datos y Métricas:** `JetBrains Mono` / `Wellfleet`.
* **Micro-interacciones**:
  - Curva de resorte estándar: `cubic-bezier(0.23, 1, 0.32, 1)`.
  - Escala táctil al pulsar: `active:scale-[0.97]` en 120ms.

---

## 🔒 7. Git & Remote Governance (Resumen Operativo)

1. **Rama de Trabajo:** Desarrolla exclusivamente sobre `claude/lusion-redesign`.
2. **Prohibido:** No hagas commits a `main`, no hagas push a `main`, no hagas push a `tyc`.
3. **Pull Requests:** No abras Pull Requests automáticos dirigidos a `main`.
4. **Remoto Oficial:** Asegúrate de que `git remote -v` apunte a `https://github.com/milena-abraham/dashboard-ia.git`.
