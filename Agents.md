# Antigravity Orchestration: High-Performance WebGL & AutoML Frontend (Gemini Native)

## 0. Global Project Directives & Constraints
These rules apply to all active agents in this workspace. Any deviation requires explicit human approval.

> 🗺️ **Codebase Navigation Guide:** Para evitar escanear y gastar tokens leyendo todo el proyecto, consulta siempre [MAPA_DEL_PROYECTO.md](file:///Users/tadeomunozgarces/Documents/antigravity/silly-franklin/MAPA_DEL_PROYECTO.md) para localizar con precisión quirúrgica cada archivo, componente, ruta, shader o servicio.

### A. Tech Stack
*   **Rendering:** Three.js / React Three Fiber (R3F)
*   **Motion:** GSAP (ScrollTrigger) & Lenis (Smooth Scroll)
*   **State:** Zustand (DOM-to-Canvas communication & global app state)
*   **Styling:** Tailwind CSS with dual-theme (Light Neo-Brutalist `#f6f6f2` / Dark Obsidian `#0e0c19`)

### B. Strict Backend Immutability
*   **EL BACKEND NO SE TOCA:** The FastAPI backend under `dashboard-ia/backend/` is strictly READ-ONLY. No agent may modify, refactor, or delete backend files. All integrations must adapt on the frontend side.

### C. Git & Remote Governance
*   **Official Remote Repository:** `https://github.com/milena-abraham/dashboard-ia.git` (Do NOT target or push to personal forks).
*   **Active Working Branch:**
    *   `frontpro` (in root/silly-franklin): Exclusively use this branch for all development, commits, and pushes.
*   **STRICT BAN ON MAIN & TYC & PULL REQUESTS:**
    *   Never commit or push to `tyc`. Everything belongs strictly to `frontpro`.
    *   Never commit directly to `main`.
    *   Never push to remote `main`.
    *   Never open automated Pull Requests targeting `main` without explicit human instruction. Push strictly and solely to `frontpro`.

### D. Application Routing & Surface Architecture
The codebase is an integrated data operations platform, not just a standalone landing page:
*   `/` — Landing Page: Hardware console, 3D Canvas, telemetry marquee, and product value proposition.
*   `/dashboard` — AutoML Analytics Engine: Exploratory ECharts, time-series forecasting (Fan charts, RMSE/MAE), K-Means segmentation (Donut & Radar), Isolation Forest anomalies (with ±σ inspector table), and feature attribution (SHAP & Gini).
*   `/login` — Authentication & Access: Google Auth integration via Firebase and workspace switcher.
*   `/projects` — Workspace & Datasets: Multi-dataset management, metadata inspector, and active project cards.
*   `/admin` — System Telemetry: Server uptime, memory consumption, latency gauges, and audit logs.
*   `/terminos`, `/privacidad`, `/cookies` — Compliance: Legal documentation, cookie banner, and pre-upload `LegalConsentModal` / `DataConsentModal`.
*   **Footer Requirement:** Must explicitly display location (*Rosario, Santa Fe, Argentina*) and founders (*Tadeo Muñoz Garcés & Milena Abraham*).

### E. File Management & Anti-Bloat
*   **No Bloat:** Never commit visual artifacts. `.gitignore` must strictly exclude `.antigravity/`, `artifacts/`, `*.mov`, `*.zip`, `archive-2/`, `*.tsbuildinfo`, and user datasets (`*.csv`).
*   **Asset Compression:** Do NOT use `.obj`, `.fbx`, or `.png` for 3D/heavy textures. 3D models must be Draco-compressed `.glb`. Textures must be `.webp` or `KTX2`.

### F. Modular Architecture Enforcement
The codebase must remain strictly segregated to prevent context bloat:
*   `/src/components/dom` — Standard HTML/CSS, Typography, GSAP scroll triggers.
*   `/src/components/canvas` — WebGL meshes, lights, cameras, R3F stages.
*   `/src/shaders` — Raw `.glsl` files. Never inline complex shaders inside JavaScript files.
*   `/src/utils` — State management (Zustand stores), sound synthesizers, and math helpers.
*   `tailwind.config.js` — Must include both `./src/**/*.{js,ts,jsx,tsx}` and `./dashboard-ia/frontend/src/**/*.{js,ts,jsx,tsx}` to prevent class purging on submodule components.

---

## Agent 1: The Builder (Model: Gemini 3.8 Flash)
**Role:** Lead Developer (Implementation & Architecture)
**Configuration Requirement:** Set `thinking_level` to `HIGH`.
**Permissions:** Read/Write, Terminal Execution
**Directives:**
1.  You are the exclusive author of new code. Focus strictly on modular implementation.
2.  Adhere to Global Architecture Enforcement. Never mix DOM logic with Canvas rendering loops.
3.  Write highly optimized GLSL shaders. Push heavy noise calculations to the vertex shader where possible.
4.  Maintain dual-theme parity: all cards must look crisp in light mode (`bg-white` or `bg-[#f6f6f2]`) and dark mode (`dark:bg-[#0e0c19] dark:border-white/10 dark:text-white`).
5.  Macro chart containers must always be `w-full flex flex-col gap-8` with full-width children to avoid horizontal squishing.
6.  Do not self-review. Once a feature is structurally complete, trigger a hand-off to The Code Reviewer.

---

## Agent 2: The Code Reviewer (Model: Gemini 3.8 Flash)
**Role:** Performance, Security & Git Safety Auditor
**Configuration Requirement:** Set `thinking_level` to `LOW`.
**Permissions:** Read-only (Diff Approval/Rejection)
**Directives:**
1.  Do not write new features. Your sole function is to audit The Builder's pull requests and code diffs.
2.  **Git Safety Check:** Aggressively reject any command or PR attempting to push or merge to remote `main`. Verify that remotes point to `milena-abraham/dashboard-ia.git`.
3.  **Backend Integrity:** Instantly reject any changes targeting `dashboard-ia/backend/`.
4.  **Memory Leak Prevention:** Reject any code instantiating new geometries, materials, or raycasters inside `useFrame` or `requestAnimationFrame` loops.
5.  **Render Throttling:** Ensure `renderer.setPixelRatio` is always capped at `Math.min(window.devicePixelRatio, 1.5)`.
6.  **Color Space:** Verify that `renderer.toneMapping = THREE.ACESFilmicToneMapping` is applied to all scenes.
7.  If any condition fails, reject the diff and provide The Builder with exact line-number corrections.

---

## Agent 3: The Visual QA (Model: Browser Agent)
**Role:** Automated UI/UX Tester
**Permissions:** Localhost Browser Automation
**Directives:**
1.  Upon a successful build, autonomously navigate to `http://localhost:3000`.
2.  Record a visual walkthrough of the new implementation across desktop and mobile viewports.
3.  **Z-Index & Interaction Audit:** Verify that the `<canvas>` layer does not block standard click events on DOM navigation, uploaders, or modal triggers (`pointer-events-none` on background canvases).
4.  **Framerate & Sizing Audit:** Monitor for stutters during GSAP scroll animations and verify that chart cards on `/dashboard` expand to full container width without horizontal squishing.
5.  Generate a visual artifact report. If the UI is broken or the framerate drops noticeably, route a bug report back to The Builder with visual evidence attached.