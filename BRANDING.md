# BRANDING DE MIO: GUÍA MAESTRA DE IDENTIDAD, DISEÑO & HARDWARE

> **DOCUMENTO OFICIAL PARA AGENTES Y DESARROLLADORES**  
> Este archivo define el sistema de diseño, la paleta de colores, la tipografía, la estética visual, la identidad sonora y las especificaciones completas de **THE MIO DEVICE** (MIO-DEV 01). Todo agente o desarrollador que genere interfaces, componentes 3D, shaders, copys o assets debe alinearse estrictamente con esta guía.

---

## 1. ESENCIA & MANIFIESTO DE MARCA

* **Nombre de Marca:** **MIO** (o Mio)
* **Tagline Principal:** *Intelligent Data Operations & AutoML*
* **Categoría:** *Neo-Brutal Analytics & AutoML Console*
* **Propósito:** Transformar planillas de cálculo crudas y desordenadas en decisiones ejecutivas de alto impacto en menos de 60 segundos, sin necesidad de escribir código.
* **Manifiesto:**
  > *"Dejá de adivinar. Empezá a predecir."*  
  > *"Convertí planillas de datos en decisiones inteligentes."*  
  > *"Small screen. Big decisions."*  
  > *"Poder corporativo. Diseño tangible."*
* **Tono de Voz:** Seguro, ejecutivo, directo, técnico pero accesible, enérgico y rioplatense/latinoamericano moderno (*"Subí tus datos"*, *"Chateá con tus tablas"*, *"Deslizá el interruptor"*).
* **Creadores:** Fundado por **Tadeo Muñoz Garcés** y **Milena Abraham** (Estudiantes y desarrolladores de Ciencia de Datos). *"Creado con 💚 en Argentina"*.

---

## 2. FILOSOFÍA VISUAL: NEO-BRUTALISMO TANGIBLE

MIO fusiona dos mundos estéticos potentes:
1. **Neo-Brutalismo Web:** Líneas negras gruesas y puras (`2px solid #000000`), sombras rígidas de alto contraste sin difuminar (`box-shadow: 4px 4px 0px #000`), esquinas limpias, badges técnicos y tipografía utilitaria de ingeniería.
2. **Industrial Precision Hardware / Cyberpunk Tangible:** Inspirado en consolas portátiles de ingeniería (Teenage Engineering, Analogue Pocket, instrumental de laboratorio analógico). Las interfaces se sienten como hardware físico que se puede tocar, presionar y calibrar.

### Reglas Visuales Obligatorias:
* **Cero sombras difuminadas borrosas:** No usar `shadow-xl` estándar con blur difuso. Utilizar sombras neo-brutalistas puras con desplazamiento duro (`neo-md`, `neo-lg`).
* **Bordes Estrictos:** Todo contenedor, botón, card o badge importante lleva borde sólido negro (`border-2 border-black` o `border border-black`).
* **Micro-interacciones mecánicas:**
  * **Hover:** Desplazamiento leve arriba-izquierda (`translate(-1px, -1px)` con aumento de sombra).
  * **Active (Click):** Hundimiento mecánico pronunciado (`translate(3px, 3px)` con reducción de sombra a `1px 1px 0px #000`).
* **Subrayados ondulados de acento:** Uso de `underline decoration-[#bdf559] decoration-wavy decoration-4` o `decoration-[#7647eb]` para enfatizar palabras clave.

---

## 3. PALETA CROMÁTICA OFICIAL

### A. Colores Primarios de Identidad (Brand Core)

| Token | Hex | Muestra | Descripción & Uso |
| :--- | :--- | :--- | :--- |
| **`mio-lime`** | `#bdf559` | 🟢 Lima Neón Eléctrico | **Color insignia de MIO**. Llamados a la acción primarios (CTA), Botón A físico, resaltados, proyecciones 2026, métricas en alza, pulsos LED. |
| **`mio-lime-hover`** | `#c8ff6a` | 🟢 Lima Neón Claro | Estado hover de botones y elementos interactivos lima. |
| **`mio-violet`** | `#7647eb` | 🟣 Violeta Eléctrico | **Color corporativo secundario**. Chasis 3D del MIO Device, K-Means clustering, badges ejecutivos, acentos de marca. |
| **`mio-violet-wcag`** | `#602cd1` | 🟣 Violeta Profundo | Variante WCAG 2.1 AA compliant (ratio $\ge$ 4.5:1 sobre fondo claro). |
| **`mio-violet-light`** | `#8659f5` | 🟣 Violeta Claro | Hover de botones y reflejos de luz especular. |

### B. Fondos y Superficies

| Token | Hex | Descripción & Uso |
| :--- | :--- | :--- |
| **`mio-bg`** | `#f6f6f2` | Fondo global del DOM (papel táctil / hormigón cálido desaturado). Da la sensación de escritorio de diseño industrial. |
| **`mio-surface`** | `#ffffff` | Fondo de tarjetas blancas (`.neo-card`), inputs y contenedores de datos. |
| **`mio-paper`** | `#faf8f5` | Blanco cálido secundario para alternancia de filas o paneles internos. |
| **`mio-obsidian`** | `#0b0914` | Fondo de la pantalla OLED del MIO Device, consola de código y tarjetas dark (`.neo-card-dark`). |
| **`mio-dark` / `mio-black`** | `#111111` | Bordes estructurales, botones oscuros, sombras neo-brutalistas. |
| **`desk-grid`** | `rgba(0, 0, 0, 0.035)` | Retícula de ingeniería de fondo (cuadrícula 36px $\times$ 36px). |

### C. Colores Semánticos & Telemetría

| Token | Hex | Estado / Función |
| :--- | :--- | :--- |
| **Emerald Nominal** | `#10b981` | Estado operativo nominal, hardware encendido, integridad de datos 100%, crecimiento positivo. |
| **Crimson Anomaly** | `#ef4444` | Alerta crítica de anomalía (Isolation Forest), outlier 4.8$\sigma$, caída de conversión. |
| **Amber Standby** | `#f59e0b` | Advertencias, hardware en modo Standby / pausa. |
| **Cyan Telemetry** | `#0ea5e9` | Conexión de API, streams de red y logs en vivo. |
| **Machined Gold** | `#eab308` | Jack de audio 3.5mm bañado en oro y conectores industriales. |

---

## 4. TIPOGRAFÍA & JERARQUÍA EDITORIAL

La tipografía de MIO equilibra carácter editorial moderno con precisión de instrumental científico.

### A. Tipografía Display & Lectura: **Space Grotesk**
* **Importación:** Google Fonts (`weights: 300, 400, 500, 600, 700, 900`).
* **Fallback:** `Inter`, `system-ui`, `-apple-system`, `sans-serif`.
* **Características:** Caracteres geométricos con remates angulares limpios. Tracking cerrado (`letter-spacing: -0.015em` a `-0.04em`) y leading compacto (`1.02` a `1.1`).
* **Uso:** Títulos Hero, encabezados de sección, nombres de tarjetas y narrativa editorial.

### B. Tipografía de Ingeniería & Telemetría: **JetBrains Mono**
* **Importación:** Google Fonts (`weights: 400, 500, 600, 700`).
* **Fallback:** `Fira Code`, `monospace`.
* **Características:** Monospaciada técnica de alta legibilidad en pantalla y código.
* **Uso:** Pantalla OLED del dispositivo, badges neo-pill, etiquetas de control físico (D-PAD, START, SELECT), métricas financieras, nombres de archivo (`.csv`, `.xlsx`), estados de servidor y timestamps.

### C. Escalas Tipográficas Estándar

```css
/* Hero Headline */
font-family: 'Space Grotesk', sans-serif;
font-size: clamp(2.75rem, 5.5vw, 4.75rem);
font-weight: 900;
line-height: 1.02;
letter-spacing: -0.04em;

/* Section Headline */
font-size: clamp(2rem, 3.8vw, 3.25rem);
font-weight: 900;
line-height: 1.1;
letter-spacing: -0.03em;

/* Card Headline */
font-size: clamp(1.15rem, 1.6vw, 1.4rem);
font-weight: 900;

/* Telemetry & Metrics */
font-family: 'JetBrains Mono', monospace;
font-size: clamp(1.8rem, 3vw, 2.8rem);
font-weight: 900;

/* Badges & Hardware Labels */
font-family: 'JetBrains Mono', monospace;
font-size: 0.75rem (11px / 12px);
font-weight: 700 / 800;
letter-spacing: 0.1em;
text-transform: uppercase;
```

---

## 5. COMPONENTES UI Y UTILIDADES NEO-BRUTALISTAS

### A. Clases CSS Utilitarias (Strict Neo-Brutalist)

```css
/* Card Estándar */
.neo-card {
  background-color: #ffffff;
  border: 2px solid #000000;
  box-shadow: 6px 6px 0px #000000;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.neo-card:hover {
  box-shadow: 8px 8px 0px #000000;
}

/* Card Oscura (Obsidian) */
.neo-card-dark {
  background-color: #0b0914;
  color: #ffffff;
  border: 2px solid #000000;
  box-shadow: 6px 6px 0px #000000;
}

/* Botón Neo Lima Primario */
.btn-neo-lime {
  background-color: #bdf559;
  color: #000000;
  border: 2px solid #000000;
  box-shadow: 4px 4px 0px #000000;
  font-weight: 800;
  transition: all 0.1s ease-in-out;
}
.btn-neo-lime:hover {
  background-color: #c8ff6a;
  transform: translate(-1px, -1px);
  box-shadow: 5px 5px 0px #000000;
}
.btn-neo-lime:active {
  transform: translate(3px, 3px);
  box-shadow: 1px 1px 0px #000000;
}

/* Botón Neo Púrpura Secundario */
.btn-neo-purple {
  background-color: #7647eb;
  color: #ffffff;
  border: 2px solid #000000;
  box-shadow: 4px 4px 0px #000000;
  font-weight: 800;
  transition: all 0.1s ease-in-out;
}
.btn-neo-purple:hover {
  background-color: #8659f5;
  transform: translate(-1px, -1px);
  box-shadow: 5px 5px 0px #000000;
}
.btn-neo-purple:active {
  transform: translate(3px, 3px);
  box-shadow: 1px 1px 0px #000000;
}

/* Badges / Neo-Pills */
.neo-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.75rem;
  border: 1.5px solid #000000;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  box-shadow: 2px 2px 0px #000000;
  background-color: #ffffff;
  color: #000000;
}
.neo-pill-lime {
  background-color: #bdf559;
  color: #000000;
  border: 1.5px solid #000000;
  box-shadow: 2px 2px 0px #000000;
}
.neo-pill-purple {
  background-color: #7647eb;
  color: #ffffff;
  border: 1.5px solid #000000;
  box-shadow: 2px 2px 0px #000000;
}
```

---

## 6. EL DISPOSITIVO FÍSICO: "THE MIO DEVICE" (MIO-DEV 01)

El **MIO Device** es el corazón icónico de la marca: una consola de hardware portátil de ingeniería que ejecuta **MIO OS v2.6 // AUTOML**. No es un mockup genérico de smartphone o tablet; es un instrumento físico con personalidad propia.

### A. Anatomía de Hardware (PBR Industrial Spec)

```
       [3.5mm Gold Jack]            [Telemetry LED Bars]
             │                               │
    ┌────────▼───────────────────────────────▼────────┐
    │ [PWR TOGGLE] [OLED STATUS LED]      MIO-DEV 01  │
    │ ┌─────────────────────────────────────────────┐ │
    │ │ 🟢 MIO OS v2.6   [2026 PREDICTIVO] [ARIMA]  │ │ ◄── [Perilla Rotativa
    │ │ ─────────────────────────────────────────── │ │      Jog Dial Estriada]
    │ │  PANTALLA OLED CURVA OBSIDIANA              │ │
    │ │  (1024x840 con Scanlines CRT)               │ ├──┐
    │ │                                             │ │  │
    │ │  Noviembre: $95,100 USD  [+34.8% MoM]       │ │  │
    │ └─────────────────────────────────────────────┘ │  │
    │ ════════════ Franja Lima Neón ═════════════════ │  │
    │                                                 │  │
    │      ▲                  (A) [Modo +]            │  │
    │   ◀  ●  ▶             (B) [Modo -]              │  │
    │      ▼                                          │  │
    │  [Cruceta D-PAD]                              ├──┘
    │                                                 │
    │     [SELECT]   [START]       |||||              │
    │   (Horizonte)  (AutoML)   [Rejilla Acústica]    │
    └─────────────────────────────────────────────────┘
```

1. **Chasis de Policarbonato Violeta Satinado:**
   * Material: `MeshPhysicalMaterial` con color `#6c38e6` / `#7647eb`.
   * Parámetros PBR: `roughness: 0.18`, `metalness: 0.12`, `clearcoat: 1.0`, `clearcoatRoughness: 0.08`, `reflectivity: 0.85`.
   * Factor ergonómico: Esquinas redondeadas de curvatura continua y línea de partición perimetral de inyección de plástico (`parting line` negra `#040208`).
2. **Grips Laterales de Goma Antideslizante:**
   * 4 costillas de goma estriada a cada lateral (`#110d1c`, `roughness: 0.75`).
3. **Perilla Jog Dial Rotativa Mecanizada (Lateral Derecho):**
   * Cilindro de aluminio estriado con 24 estrías táctiles maquinadas (`#f1f5f9`, `metalness: 0.96`, `roughness: 0.12`).
   * Permite rotar/scrollear métricas mediante rueda del mouse o arrastre.
4. **Pantalla OLED Obsidiana Curva:**
   * Bisel físico negro satinado (`#0a0814`) con lente de cristal curvado convexo (`transmission: 0.94`, `ior: 1.52`).
   * Resolución de textura dinámica en vivo: `1024 x 840 px`.
   * Efecto CRT: Scanlines horizontales overlay sutiles y haz de barrido láser animado durante ejecuciones de inferencia.
5. **Franja Central de Acento Lima Eléctrico:**
   * Línea divisoria horizontal neón (`#bdf559`) con leve emisión lumínica.
6. **D-PAD Direccional Monolítico (Cuadrante Izquierdo):**
   * Cruceta unificada en grafito mate (`#171324`) con hendidura esférica cóncava central (thumb rest) e iconos direccionales grabados (▲ ▼ ◀ ▶).
   * Basculante 3D (Rocker Gimbal): La cruceta se inclina tridimensionalmente en la dirección pulsada.
7. **Botones Tácticos de Acción A & B (Cuadrante Derecho):**
   * **Botón A:** Lima Neón MIO (`#bdf559`), con emisión suave. Avanza de modo.
   * **Botón B:** Grafito Púrpura Profundo (`#241a3c`). Retrocede de modo.
   * Desplazamiento elástico en eje Z al presionar con resorte de recuperación.
8. **Botones de Goma Píldora: SELECT & START:**
   * **SELECT:** Alterna el horizonte temporal (Proyección 2026 vs Histórico 2025).
   * **START:** Ejecuta el cómputo y optimización AutoML en tiempo real.
9. **Switch Mecánico de Encendido (PWR) & LED de Estado:**
   * Interruptor deslizante inferior izquierdo.
   * **ON:** LED verde esmeralda brillante (`#10b981`). Pantalla encendida.
   * **OFF:** LED ámbar tenue (`#f59e0b`). Pantalla entra en modo `[ MIO OS EN STANDBY ]`.
10. **Rejilla Acústica CNC:** 5 ranuras de altavoz maquinadas en la parte inferior derecha.
11. **Jack de Audio 3.5mm de Latón/Oro:** En el borde superior izquierdo (`#eab308`).
12. **Barras LED de Telemetría:** 6 barras LED horizontales en la parte superior derecha que pulsan rítmicamente en lima y púrpura.
13. **Guías Magnéticas de Riel & Shockwave de Acoplamiento:**
    * El dispositivo se desliza y aterriza suavemente mediante GSAP ScrollTrigger sobre el "escritorio".
    * Al tocar superficie, dispara una onda de energía expansiva (*docking shockwave*) y una sombra de contacto oclusiva suave.

---

### B. Modos de Operación de MIO OS v2.6

El sistema operativo del dispositivo tiene 3 modos visuales interactivos:

| Modo | Nombre en Pantalla | Modelo Matemático | Contenido Visual en la OLED |
| :---: | :--- | :--- | :--- |
| **0** | **AUTO-ML FORECAST** | `ARIMA + PROPHET` | 12 barras mensuales interactivas (ENE a DIC). Alterna entre proyección 2026 (Lima `#bdf559`) y datos reales 2025 (Púrpura `#c084fc`). Muestra valor en USD, MoM % y cursor flotante ▼. |
| **1** | **K-MEANS CLUSTERING** | `3 SEGMENTOS` | Distribución de cartera: VIP High-Value (62%, Lime), Mid-Tier (26%, Violet), Base Long-Tail (12%, Slate). Muestra ticket promedio, churn rate y recuento de usuarios. |
| **2** | **ANOMALY DETECTOR** | `ISOLATION FOREST` | Radar táctico con barrido circular continuo y mira táctica fluida. 8 puntos: anomalías críticas en rojo (`#ef4444`, ej. desvío 4.8$\sigma$) y puntos nominales en lima (`#bdf559`). |

---

## 7. IDENTIDAD SONORA & HÁPTICA (WEB AUDIO API)

MIO incorpora una arquitectura de audio sintetizado 100% nativa (sin archivos de audio pesados `.mp3` ni librerías externas), generada en tiempo real mediante la Web Audio API:

* **Clic Botón A (`buttonA`):** Clic agudo, enérgico y resonante (onda triangular `780Hz` $\to$ `1020Hz`, duración `55ms`).
* **Clic Botón B (`buttonB`):** Golpe analógico sordo y profundo (onda senoidal `420Hz` $\to$ `200Hz`, duración `65ms`).
* **Pulsación D-PAD (`dpad`):** Micro-clic de relé mecánico (onda triangular `640Hz` $\to$ `780Hz`, duración `40ms`).
* **Rueda Jog Dial (`jogDial`):** Sonido de trinquete/ratchet fino de aluminio cepillado (`1200Hz` $\to$ `400Hz`, duración `25ms`).
* **Impacto de Acoplamiento (`dockThud`):** Sub-grave cinemático de impacto magnético (`110Hz` $\to$ `45Hz`) combinado con cerrojo metálico de retención.
* **Inicio AutoML (`start`):** Chirp electrónico ascendente de inicialización de redes neuronales (`480Hz` $\to$ `1180Hz`).
* **Horizonte Select (`select`):** Pulso suave de alternancia (`520Hz` $\to$ `420Hz`).
* **Interruptor Power (`toggle`):** Chasquido mecánico seco de switch bifásico (`360Hz` $\to$ `180Hz`).

---

## 8. LOGOTIPO & MARCAS GRÁFICAS

* **Isotipo / Monograma:** Letra **`M`** mayúscula, geométrica, de trazo grueso e inclinación dinámica hacia adelante (cursiva arquitectónica), cortada con precisión en su vértice central.
* **Archivos Oficiales:**
  * [`MIO.png`](file:///Users/tadeomunozgarces/Documents/antigravity/silly-franklin/MIO.png): Isotipo `M` blanco sobre fondo en gradiente Lima Neón (`#bdf559` a verde lima cálido).
  * [`MIO2.png`](file:///Users/tadeomunozgarces/Documents/antigravity/silly-franklin/MIO2.png): Isotipo `M` blanco sobre fondo en gradiente fluido duotono Lima Eléctrico $\to$ Violeta MIO.
* **Logo en Barra de Navegación:** Cuadrado negro con borde de 2px, letra `M` en lima neón (`bg-black text-[#bdf559] border-2 border-black font-mono font-black`), seguido de la palabra **`MIO`** y un punto LED verde lima.

---

## 9. DIRECTIVAS DE ARQUITECTURA PARA AGENTES (REGLAS STRICT)

En cumplimiento con el archivo de reglas maestras [`AGENTS.md`](file:///Users/tadeomunozgarces/Documents/antigravity/silly-franklin/AGENTS.md):

1. **Separación Modular Absoluta:**
   * `/src/components/dom`: Todo el HTML/CSS, tipografía Space Grotesk, botones y triggers GSAP.
   * `/src/components/canvas`: WebGL Three.js, mallas del MIO Device, luces, cámaras y texturas dinámicas.
   * `/src/shaders`: Archivos `.glsl` puros (`particles.vert.glsl`, `particles.frag.glsl`, etc.). **Nunca escribir shaders inline dentro de archivos JS/TSX**.
   * `/src/utils`: Estado global con Zustand (`useMioStore.ts`), helpers matemáticos y audio.
2. **Prevención de Memory Leaks en 3D:**
   * Prohibido instanciar `new THREE.Mesh`, `new THREE.BufferGeometry`, `new THREE.Material` o `new THREE.Raycaster` dentro del bucle `requestAnimationFrame` o `useFrame`. Todo debe estar preasignado.
3. **Límite de Renderizado & Rendimiento:**
   * El pixel ratio debe estar siempre capeado a `1.5`: `renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));`.
   * Tone mapping obligatorio: `renderer.toneMapping = THREE.ACESFilmicToneMapping;`.
4. **Z-Index & Eventos del DOM:**
   * El canvas 3D nunca debe bloquear eventos de clic o scroll de los botones y navegación del DOM. Utilizar `pointer-events-none` en el contenedor y `pointer-events-auto` únicamente en los elementos interactivos designados.

---

*Fin del documento de Branding de MIO. Consérvese como referencia permanente de diseño para todos los agentes del proyecto.*
