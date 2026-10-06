# Design System: MIO v2.0 — "Minimal Hardware, Maximal Clarity"

> Documento oficial y única fuente de verdad (SSOT) para el sistema de diseño de MIO.  
> Diseñado bajo los principios de Nothing Tech, Apple y Legency Media.  
> Estándares de ingeniería de diseño: Emil Kowalski & Stitch Design Taste.

---

## 1. Visual Theme & Atmosphere
* **Vibe:** Como un instrumento de metrología suiza o un equipo de alta ingeniería analógica (estilo Nothing Tech / Braun) dentro de una sala ejecutiva contemporánea.
* **Densidad:** 5/10 — Espacio editorial que respira generosamente, jerarquía quirúrgica, cero saturación.
* **Varianza:** 7/10 — Asimetría controlada; el MIO-DEV y el bot 3D actúan como anclas esculturales.
* **Movimiento:** 6/10 — Físicas de resorte fluidas (Emil Kowalski), micro-interacciones táctiles bajo 200ms, transiciones con curvas cúbicas personalizadas (`cubic-bezier(0.23, 1, 0.32, 1)`).

---

## 2. Color Palette & Calibration (Regla de Oro 80 / 15 / 5)

| Proporción | Rol | Token | Hex / Valor | Uso |
| :--- | :--- | :--- | :--- | :--- |
| **80% Neutros** | Fondo Dark | `mio-obsidian` | `#08070d` / `#0b0914` | Lienzo principal en modo oscuro |
| | Fondo Light | `mio-paper` | `#f7f7f4` / `#faf8f5` | Papel marfil táctil en modo claro |
| | Tarjeta Dark | `mio-surface-dark` | `#0e0d16` | Superficies de datos y terminales oscuras |
| | Tarjeta Light | `mio-surface-light`| `#ffffff` | Tarjetas de datos en modo claro |
| | Hairline Dark | `hairline-dark` | `rgba(255,255,255,0.08)` | Bordes ultra-delgados en dark mode |
| | Hairline Light| `hairline-light`| `rgba(0,0,0,0.07)` | Bordes ultra-delgados en light mode |
| **15% Violeta** | Estructural | `mio-violet-light`| `#7647eb` | Chasis del MIO Device, sombras del CTA |
| | Profundo | `mio-violet-deep` | `#3d1f8a` | Fondo del footer y tintes oscuros |
| | Translúcido | `mio-violet-muted`| `rgba(118,71,235,0.1)` | Badges secundarios y relieves tenues |
| **5% Lima** | Láser / Pulso | `mio-lime` | `#bdf559` | **Solo:** Botón CTA primario, LED de servidor, líneas de tendencia |
| | Hover | `mio-lime-hover` | `#c8ff6a` | Estado hover del botón de acción |

> **Prohibido:** Glows exteriores difusos en lima o violeta (`box-shadow: 0 0 20px #...`).  
> **Prohibido:** Usar el verde lima como fondo de bloques o cabeceras grandes (regla anti-50/50).

---

## 3. Typography Rules
* **Display / Hero Headlines:** **Climate Crisis** (`font-climate`) con tracking cerrado y escala monumental para el H1 del Hero y rotulado de hardware. Preserva la autenticidad y el carácter distintivo de MIO frente a templates genéricos.
* **Subtítulos y Encabezados de Sección:** **Plus Jakarta Sans** (peso 700/800) o **Space Grotesk** con tracking `tracking-[-0.035em]` y leading compacto (`1.05` a `1.15`).
* **Cuerpo de Texto (Body):** **Plus Jakarta Sans** (peso 400/500) en `zinc-400` (dark) o `zinc-600` (light), con leading relajado (`1.6`) y ancho máximo de 68 caracteres por línea (`max-w-2xl`).
* **Telemetría, Datos & Métricas:** **JetBrains Mono** (`font-mono`) para todas las cifras, tablas, logs, z-scores ($\pm\sigma$), nombres de archivo y coordenadas.
* **Prohibido:** Inter, Roboto, Arial o tipografías de sistema estándar en contextos display.
* **Prohibido:** Climate Crisis en párrafos de lectura o tablas de datos.

---

## 4. Component Stylings & Micro-Interacciones
* **Navbar:** Split Navigation despegada (islas flotantes independientes). La isla izquierda contiene el monograma y enlaces; la isla derecha contiene el toggle de tema y el botón de acción principal.
* **Tarjetas:** Bordes ultra-finos (hairlines `border-white/[0.08]` o `border-zinc-200/80`), radio suave `rounded-2xl`. En hover: elevación sutil `translate-y-[-2px]` con sombra difusa casi imperceptible.
* **CTA Banner:** Único bloque de la página con peso brutalista estructural intencional, acentuado con sombra violeta profunda `shadow-[8px_8px_0_#3d1f8a]` (sin competir con el botón lima).
* **Botones de Acción:** Tactilidad de resorte con escala mecánica instantánea (`active:scale-[0.97]` a 120ms).
* **Terminales de Datos:** Cabeceras oscuras técnicas con indicadores de estado LED puntuales, emulando consolas de instrumentación analógica.

---

## 5. Anti-Patterns (Banned)
1. **No emojis en la UI:** Cero emojis (`🚀`, `💡`, `🤖`). Solo iconos de línea limpios o pictogramas técnicos.
2. **No sombras borrosas pesadas:** Prohibido `shadow-xl` genérico.
3. **No 50/50 de color:** El verde lima nunca debe cubrir más del 5% del campo visual activo.
4. **No textos inflados:** Prohibido "magia", "revolución algorítmica" o "desata el poder". El tono es conciso, rioplatense, sobrio y pragmático.
5. **No barra de navegación fija abigarrada:** La navegación debe flotar libremente sobre el contenido.
