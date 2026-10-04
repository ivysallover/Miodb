# BRANDING DE MIO: GUÍA MAESTRA DE IDENTIDAD, DISEÑO & HARDWARE

> **DOCUMENTO OFICIAL PARA AGENTES Y DESARROLLADORES**  
> Este archivo define el sistema de diseño, la paleta de colores, la tipografía, la estética visual, la identidad sonora, las especificaciones de **THE MIO DEVICE** (MIO-DEV 01) y la extensión de diseño a la suite completa de analítica (**MIO Dashboard & AutoML Engine**). Todo agente o desarrollador que genere interfaces, componentes, shaders, copys o páginas debe alinearse estrictamente con esta guía.

---

## 1. ESENCIA & MANIFIESTO DE MARCA

* **Nombre de Marca:** **MIO** (o Mio)
* **Tagline Principal:** *Intelligent Data Operations & AutoML*
* **Categoría:** *Editorial Dither Analytics & AutoML Console*
* **Propósito:** Transformar planillas de cálculo desordenadas y grandes volúmenes de datos en decisiones ejecutivas de alto impacto en segundos, sin requerir código ni configuración de infraestructura.
* **Manifiesto:**
  > *"Dejá de adivinar. Empezá a predecir."*  
  > *"Convertí planillas de datos en decisiones inteligentes."*  
  > *"Small screen. Big decisions."*  
  > *"Poder corporativo. Diseño tangible."*
* **Tono de Voz:** Seguro, ejecutivo, directo, técnico de alta ingeniería pero accesible, enérgico y rioplatense/latinoamericano moderno (*"Subí tus datos"*, *"Chateá con tus tablas"*, *"Inspeccioná anomalías"*).
* **Creadores & Origen:** Fundado por **Tadeo Muñoz Garcés** y **Milena Abraham** (Estudiantes y desarrolladores de Ciencia de Datos).  
* **Ubicación Institucional:** **Rosario, Santa Fe, Argentina** (*"Diseñado y desarrollado con 💚 en Rosario, Argentina"*).

---

## 2. FILOSOFÍA VISUAL v2: EDITORIAL DITHER — "CONTENEDORES ORGÁNICOS, DATOS MECÁNICOS"

> v2 reemplaza al neo-brutalismo de v1 (sombras duras, bordes de 2px), que se leía infantil y como "elementos flotantes". Referencia de arquitectura: legencymedia.com, adaptada a la paleta, el MIO bot y las fuentes de MIO.

* **Contenedores suaves:** un único token de radio, `--mio-radius: 16px` (`rounded-mio`; `rounded-mio-sm` = 60 %). Cards blancas y planas sobre página gris (`#f3f3f5`), borde hairline `border-black/10` (`border-white/10` en oscuro). **Cero sombras de desplazamiento duro**, cero `border-2` en la landing.
* **Datos y consola mecánicos:** tablas, celdas de progreso, telemetría y la consola siguen cuadradas, en mono, con números tabulares. El contraste entre contenedor blando y dato rígido es la firma.
* **Lima como chispa, no como campo:** `#bdf559` en CTA, chips activos y LEDs. Los campos grandes de color usan violeta profundo u obsidiana.
* **Imaginería dither:** ilustraciones generadas por código (matriz Bayer, 3 niveles: violeta / lavanda / obsidiana), que sangran por los bordes de la página. No todo centrado.
* **Movimiento:** reveals por clip-path una sola vez, eje YEAR de Climate Crisis ligado al scroll, divisores de píxeles, rail de secciones. Todo respeta `prefers-reduced-motion`.
* **El MIO bot es el hilo narrativo:** protagonista del hero y guía por actas.
* **Fuentes (sin cambios):** Climate Crisis, Wellfleet, Plus Jakarta Sans, JetBrains Mono.
* **Subrayados ondulados de acento:** se mantienen para palabras clave.

---

## 3. PALETA CROMÁTICA OFICIAL (SISTEMA DUAL MKT & APP)

### A. Colores Primarios de Identidad (Brand Core)

| Token | Hex | Muestra | Descripción & Uso |
| :--- | :--- | :--- | :--- |
| **`mio-lime`** | `#bdf559` | 🟢 Lima Neón Eléctrico | **Color insignia de MIO**. Llamados a la acción primarios (CTA), Botón A físico, resaltados, proyecciones AutoML, métricas en alza, pulsos LED. |
| **`mio-lime-hover`** | `#c8ff6a` | 🟢 Lima Neón Claro | Estado hover de botones y elementos interactivos lima. |
| **`mio-violet`** | `#7647eb` | 🟣 Violeta Eléctrico | **Color corporativo secundario**. Chasis 3D del MIO Device, K-Means clustering, badges ejecutivos, acentos de marca. |
| **`mio-violet-wcag`** | `#602cd1` | 🟣 Violeta Profundo | Variante WCAG 2.1 AA compliant (ratio $\ge$ 4.5:1 sobre fondo claro). |
| **`mio-violet-light`** | `#8659f5` | 🟣 Violeta Claro | Hover de botones y reflejos de luz especular. |

### B. Fondos y Superficies de la Suite

| Token | Hex | Aplicación & Comportamiento |
| :--- | :--- | :--- |
| **`mio-bg` (Light)** | `#f3f3f5` | Fondo global de la landing y vista light (gris frío neutro; las cards blancas se recortan sobre él). |
| **`mio-surface`** | `#ffffff` | Fondo de tarjetas blancas (`.neo-card`), inputs y contenedores de datos en modo claro. |
| **`mio-obsidian` (Dark)** | `#0e0c19` / `#0b0914` | Fondo de la aplicación/dashboard dark mode, pantalla OLED del MIO Device y terminal. |
| **`mio-dark-card`** | `#141124` | Fondo de tarjetas analíticas en dark mode con borde `border-white/10`. |
| **`mio-dark` / `mio-black`**| `#111111` | Bordes estructurales, botones oscuros, sombras neo-brutalistas. |
| **`desk-grid`** | `rgba(0, 0, 0, 0.035)` | Retícula de ingeniería de fondo (cuadrícula 36px $\times$ 36px). |

### C. Colores Semánticos & Telemetría Analítica

| Token | Hex | Estado / Función |
| :--- | :--- | :--- |
| **Nominal / Safe** | `#10b981` | Integridad de datos 100%, modelos convergidos, servidores nominales. |
| **Anomaly / Outlier** | `#ef4444` | Alerta crítica de anomalía (Isolation Forest), desvío z-score $\pm\sigma$, riesgo de fuga. |
| **Standby / Caution** | `#f59e0b` | Valores atípicos moderados, campos faltantes imputados, pausas. |
| **Telemetry Stream** | `#0ea5e9` | Conexión de API FastAPI, logs de red y streams de datos en tiempo real. |

---

## 4. TIPOGRAFÍA & JERARQUÍA EDITORIAL

La tipografía de MIO equilibra carácter editorial moderno con precisión de instrumental científico.

### A. Tipografía Display & Lectura: **Space Grotesk**
* **Importación:** Google Fonts (`weights: 300, 400, 500, 600, 700, 900`).
* **Fallback:** `system-ui`, `-apple-system`, `sans-serif`.
* **Características:** Caracteres geométricos con remates angulares limpios. Tracking cerrado (`letter-spacing: -0.02em` a `-0.04em`) y leading compacto.
* **Uso:** Títulos Hero, encabezados de sección, nombres de tarjetas y narrativa editorial.

### B. Tipografía de Ingeniería & Telemetría: **JetBrains Mono**
* **Importación:** Google Fonts (`weights: 400, 500, 600, 700`).
* **Fallback:** `monospace`.
* **Características:** Monospaciada técnica de alta legibilidad en pantalla y código.
* **Uso:** Tablas del dashboard, coordenadas de gráficos, etiquetas z-score ($\pm\sigma$), métricas financieras, nombres de archivo (`.csv`, `.xlsx`), estados de servidor y timestamps.

---

## 5. SISTEMA DEL DASHBOARD ANALÍTICO & MODELOS AUTOML (`/dashboard`)

El diseño de la suite analítica traslada la precisión del hardware físico al software de producción:

1. **ECharts Palette & Contrast:**
   * **Fan Charts (Proyecciones Temporales):** Línea de tendencia nítida en `#bdf559`, conos de incertidumbre (80% y 95%) en opacidades calibradas `rgba(189, 245, 89, 0.2)` y `rgba(189, 245, 89, 0.08)`.
   * **Radar & Clusters (K-Means):** Relleno semitransparente en violeta `#7647eb` con vértices en lima `#bdf559`.
   * **Dispersión de Anomalías:** Puntos nominales en gris grafito / lima sutil; outliers resaltados en carmesí `#ef4444` con pulso perimetral.
   * **Importancia de Variables (SHAP / Gini):** Barras horizontales limpias con etiquetas monoespaciadas.

2. **Inspector de Tabla de Anomalías:**
   * Celdas atípicas resaltadas con badge distintivo `±X.Xσ` en fondo ámbar/rojo con contraste WCAG garantizado.
   * Controles de exportación rápida a CSV, búsqueda en vivo y filtros por nivel de severidad.

3. **Arquitectura de Contenedores (Regla Anti-Squish):**
   * Todas las macrosecciones de gráficos (`ExploratoryCharts`, `ForecastSection`, `SegmentationSection`, `AnomaliesSection`, `FeatureImportanceSection`) deben renderizarse con **ancho total (`w-full`)** en un layout vertical `w-full flex flex-col gap-8`.
   * Queda estrictamente prohibido envolver bloques de gráficos en grillas fijas sin span (`grid-cols-12` sin `col-span-12`), lo que provocaba que colapsaran en franjas ilegibles de 80px.

---

## 6. EL DISPOSITIVO FÍSICO: "THE MIO DEVICE" (MIO-DEV 01)

El **MIO Device** es el corazón icónico de la marca: una consola de hardware portátil de ingeniería que ejecuta **MIO OS v2.6 // AUTOML**:

* **Chasis:** Policarbonato violeta satinado (`#7647eb`) con línea de partición perimetral negra.
* **Perilla Jog Dial:** Cilindro de aluminio estriado CNC maquinado para rotar y explorar datasets.
* **Pantalla OLED:** Pantalla curva obsidiana (`#0b0914`) con scanlines sutiles y animación de barrido durante inferencias.
* **Controles Táctiles:** Cruceta D-PAD basculante en 3D, Botón A (Lima `#bdf559`, avanzar), Botón B (Violeta profundo, retroceder), SELECT (horizonte temporal) y START (ejecutar AutoML).
* **Switch de Encendido (PWR):** Switch mecánico deslizable con LED esmeralda nominal (`#10b981`) o ámbar en standby.
* **Identidad Sonora (Web Audio API):** Clics analógicos generados en tiempo real mediante osciladores Web Audio sin latencia ni dependencias de audio externas.

---

## 7. CUMPLIMIENTO LEGAL & ARQUITECTURA DE FLUJO

MIO procesa datos de negocio sensibles y exige una política de transparencia y consentimiento explícito:

1. **Rosario, Argentina en el Footer:**
   * Todo footer institucional debe indicar: *"Rosario, Santa Fe, Argentina"* y los nombres de los fundadores (*Tadeo Muñoz Garcés & Milena Abraham*).
2. **Consentimiento Pre-Upload (Legal & Data Modals):**
   * Antes de que el usuario envíe archivos al endpoint del backend, la UI debe desplegar un modal de confirmación informando que el procesamiento se realiza en memoria, sin almacenar datos personales de terceros de forma permanente.
3. **Páginas Legales Dedicadas:**
   * `/terminos` — Términos y Condiciones del Servicio.
   * `/privacidad` — Política de Privacidad y Tratamiento de Datos.
   * `/cookies` — Política de Cookies y consentimiento de sesión.

---

## 8. DIRECTIVAS ANTI-SLOP (LO QUE MIO NO ES)

Para mantener a MIO en la categoría de producto de lujo de ingeniería (*Teenage Engineering meets Swiss Metrology*):

* **BANNED: Emojis en Interfaces Técnicas:** Queda prohibido el uso de emojis (`🚀`, `🤖`, `💡`, `⚡`, `🔮`, `✨`) en botones, tablas analíticas y tarjetas de métricas. Utilizar iconos SVG sobrios de Lucide.
* **BANNED: Lenguaje "Mágico" o Inflado:** Prohibido el uso de términos como *"Magia Neuronal"*, *"Inteligencia Artificial Milagrosa"* o *"Desata el poder"*. El lenguaje de MIO es formal, preciso y orientado a ciencia de datos: *"Pipeline Neuronal Autónomo"*, *"Detección de Outliers Multivariada"*, *"Entrenamiento en Memoria"*.
* **BANNED: Degradados Púrpura Fluorescentes Genéricos:** Prohibidos los fondos con degradados borrosos tipo plantilla de IA o botones con glows excesivos. La paleta es sobria, táctil y de alto contraste.
* **BANNED: Tipografías Genéricas en Telemetría:** Prohibido usar fuentes genéricas para tablas o métricas; los datos numéricos se muestran siempre en `JetBrains Mono`.

---

## 9. LOGOTIPO & MARCAS GRÁFICAS

* **Isotipo / Monograma:** Letra **`M`** mayúscula, geométrica, de trazo grueso e inclinación dinámica hacia adelante (cursiva arquitectónica), cortada con precisión en su vértice central.
* **Logo en Barra de Navegación:** Cuadrado negro con borde de 2px, letra `M` en lima neón (`bg-black text-[#bdf559] border-2 border-black font-mono font-black`), seguido de la palabra **`MIO`** y un punto LED verde lima.
* **Favicon & PWA:** Isotipo con contraste absoluto optimizado para visibilidad en pestañas oscuras y claras.

---

*Fin del documento de Branding de MIO. Consérvese como referencia permanente de diseño e identidad para todos los agentes del proyecto.*
