# MIO — landing + plataforma (React/Vite)

Contexto completo: `docs/HANDOFF.md` (leelo solo si la tarea lo pide). Dónde está cada archivo: `MAPA_DEL_PROYECTO.md`. Marca: `BRANDING.md` (v2) + `DESIGN.md`; si se contradicen, mandan este archivo y `BRANDING.md`.

## Comandos
- `npm run dev` → localhost:3000 · `npm run build` (debe pasar) · `npx tsc --noEmit` (**0 errores**) · `npm test` (vitest, 13 tests)
- Deploy: Cloudflare Pages (`miodb`), ver `DEPLOY.md`. Ya no hay `vercel.json`.
- Backend FastAPI en `dashboard-ia/backend/`: **solo lectura, no se toca**.

## Reglas
- Español rioplatense (voseo) en textos y respuestas. Concreto, sin relleno corporativo ni promesas tipo "en segundos".
- **Fuentes fijas**: Climate Crisis, Wellfleet, Plus Jakarta Sans, JetBrains Mono. No cambiarlas.
- Paleta: lima `#bdf559` (solo chispa), violeta `#7647eb`, obsidiana `#0b0914`, página `#f3f3f5`.
- Un solo radio: `rounded-mio` / `rounded-mio-sm` (`--mio-radius: 16px`). Sin sombras duras ni `border-2` en la landing. Datos/consola: cuadrados, mono.
- El MIO bot (pet) está diseñado: no rediseñarlo. Estados: reposo, trabajando, celebrando, anomalía, durmiendo.
- No tocar la lógica de auth (`useFounderAuth`, `firebaseAuth`) sin avisar.
- Three.js: sin crear geometrías/materiales dentro de `useFrame`/rAF; DPR ≤ 1.5; ACESFilmic.
- Estructura: DOM en `components/dom`, WebGL en `components/canvas`, shaders en `src/shaders/*.glsl`.
- Historia de la landing y su orden: única fuente en `src/lib/landingSections.ts`.

## Git
- Trabajá en `claude/lusion-redesign`. **Nunca commit/push a `main`.** Push solo si el usuario lo pide.
- `Agents.md` es legado de Antigravity (roles de agentes Gemini); sus reglas de rama y paleta ya están alineadas con este archivo.

## Gotchas
- `window.scrollTo` choca con Lenis (usar `useSmoothScroll().scrollTo` o rueda real al testear).
- StrictMode doble-invoca efectos: no liberar compuertas globales en cleanup (ver `lib/boot.ts`).
- Editar archivos siempre leyendo antes de escribir; nunca truncar.
- Verificación visual: pedí capturas al usuario; no instalar Puppeteer/Playwright en su máquina sin preguntar.
