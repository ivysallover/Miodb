# MIO — Intelligent Data Operations & AutoML Cockpit

> **High-Performance WebGL Landing Experience & Interactive AutoML Data Engine**  
> Fundadores: **Tadeo Muñoz Garcés & Milena Abraham** — Rosario, Santa Fe, Argentina.

---

## ⚡ Enlaces y Documentación Esencial

Si eres un **agente de IA** o **desarrollador nuevo**, consulta estos documentos antes de explorar el código:

* 🗺️ **[MAPA_DEL_PROYECTO.md](file:///Users/tadeomunozgarces/Documents/antigravity/silly-franklin/MAPA_DEL_PROYECTO.md)** — **Guía maestra de navegación**. Detalla dónde está cada archivo, componente, shader y endpoint para no gastar tokens leyendo todo el proyecto.
* 🤖 **[AGENTS.md](file:///Users/tadeomunozgarces/Documents/antigravity/silly-franklin/Agents.md)** — Reglas críticas de gobernanza, roles de agentes e invariantes del sistema.
* 🎨 **[DESIGN.md](file:///Users/tadeomunozgarces/Documents/antigravity/silly-franklin/DESIGN.md)** — Sistema de diseño MIO v2.0 (Regla 80/15/5, interacción háptica, física de resortes).
* 🏷️ **[BRANDING.md](file:///Users/tadeomunozgarces/Documents/antigravity/silly-franklin/BRANDING.md)** — Tokens de diseño, paleta cromática y jerarquía tipográfica.
* 🚀 **[DEPLOY.md](file:///Users/tadeomunozgarces/Documents/antigravity/silly-franklin/DEPLOY.md)** — Procedimientos de despliegue en producción (Vercel / Render).

---

## 🛠️ Stack Tecnológico

* **Core:** React 18 + TypeScript + Vite 5
* **Renderizado 3D & WebGL:** Three.js / React Three Fiber (R3F) + Shaders GLSL puros
* **Movimiento & Animación:** GSAP (ScrollTrigger) + Lenis (Smooth Scroll)
* **Estado Global:** Zustand 5
* **Estilos:** Tailwind CSS con paridad dual-theme (Papel Marfil `#fbfbfd` / Obsidiana `#07070a`)
* **Gráficos Analíticos:** Apache ECharts 6 + echarts-for-react
* **Autenticación:** Firebase Auth (Google SSO)
* **Backend:** FastAPI Python (Directorio `dashboard-ia/backend/` — *Strictly Read-Only*)

---

## 🚀 Inicio Rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Servidor de desarrollo (Puerto 3000 con proxy a API en :10000)
npm run dev

# 3. Verificación de tipos TypeScript
npm run lint

# 4. Batería de pruebas unitarias
npm test

# 5. Compilación para producción (genera dist/)
npm run build

# 6. Previsualización local del bundle
npm run preview
```

---

## 🧭 Superficies y Enrutamiento de la Aplicación

* `/` — **Landing Page Editorial:** Hardware console, Lusion particles, dither bot 3D, narrativa de 5 actos y telemetría.
* `/dashboard` — **AutoML Analytics Engine:** ECharts exploratorios, pronóstico de series temporales, segmentación K-Means, detección de anomalías Isolation Forest (con inspector $\pm\sigma$), perfilado de datos y asistente Gemini.
* `/projects` — **Workspace & Datasets:** Gestión multi-dataset e inspector de esquemas.
* `/admin` — **Telemetría de Sistema:** Estado de servidores, consumo de memoria y logs de auditoría.
* `/login` — **Autenticación:** Acceso mediante Google SSO vía Firebase y selector de espacio de trabajo.
* `/test-pet` — **Laboratorio MIO Companion:** Sandbox de pruebas para animaciones, moods y renderizadores 2D/3D de MIO.
* `/terminos`, `/privacidad`, `/cookies`, `/aviso-legal`, `/dpa`, `/arrepentimiento` — **Cumplimiento Legal y Normativo**.

---

## 🔒 Reglas Inmutables

1. **EL BACKEND NO SE TOCA:** El backend FastAPI en `dashboard-ia/backend/` es de estricta sólo lectura.
2. **RAMA DE DESARROLLO:** Todo trabajo pertenece exclusivamente a la rama `frontpro`.
3. **NO MEMORY LEAKS:** Prohibido instanciar geometrías o materiales dentro de bucles `useFrame`.
4. **ANTI-BLOAT:** Exclusión estricta de `.csv`, `.mov`, `.zip` y artefactos temporales en Git.
