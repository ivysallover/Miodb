# BRANDING DE MIO (v3, octubre 2026): GUÍA DE IDENTIDAD, DISEÑO & HARDWARE

> **DOCUMENTO OFICIAL PARA AGENTES Y DESARROLLADORES**  
> Este archivo define el sistema de diseño, la paleta de colores, la tipografía, la estética visual, la identidad sonora, las especificaciones de **THE MIO DEVICE** (MIO-DEV 01) y la extensión de diseño a la suite completa de analítica (**MIO Dashboard & AutoML Engine**). Todo agente o desarrollador que genere interfaces, componentes, shaders, copys o páginas debe alinearse estrictamente con esta guía.

---

## 1. ESENCIA & MANIFIESTO DE MARCA

* **Nombre de Marca:** **MIO**
* **Qué es:** MIO lee tu planilla de Excel o CSV y te dice qué pasó, qué se salió de lo normal, qué viene y por qué. En castellano, sin escribir código.
* **Para quién:** dueños y dueñas de pymes sin equipo de datos; después, empresas chicas y particulares.
* **Acción principal:** probar con la propia planilla, sin registro.
* **Manifiesto:** *"Tus planillas ya saben qué va a pasar."*
* **Voz:** rioplatense (voseo), directa, de oficio. Lenguaje de negocio primero; lo técnico (modelos, métricas) va como respaldo plegado, nunca como titular.
* **Honestidad:** toda cifra es real o está rotulada como demostración. Si MIO no puede predecir o explicar, lo dice ("Sin predicción esta vez"); nunca rellena con un número inventado. Sin testimonios, clientes ni precios que no existan.
* **Hecho en:** Rosario, Santa Fe, Argentina, por Tadeo Muñoz Garcés y Milena Abraham.

---

## 2. FILOSOFÍA VISUAL v3: "BLOQUES SÓLIDOS, DATOS CLAROS"

Reemplaza a la v2 ("Editorial dither"). Lo que quedó de la v2: la página gris, el radio único y el lima como chispa.

* **Superficies:** bloques llenos de color (violeta, lavanda, obsidiana, blanco), con esquinas redondeadas (`rounded-mio`, 16 px), **sin bordes**, pegados entre sí con muy poco aire (bento). Ocupan casi todo el ancho.
* **Lo que NO es MIO:**
  * No es brutalismo: nada de marcos negros, esquinas rectas en contenedores grandes ni sombras duras.
  * No son tarjetas blancas genéricas con borde y sombra.
  * No es texto "en el aire" separado por líneas finas.
  * Sin botones magnéticos ni cursor personalizado. Sin texto que se "desencripta" con símbolos.
* **Jerarquía:** primero la respuesta en palabras (hallazgos), después el gráfico que la respalda, al final el detalle plegado.
* **Variedad:** cada sección tiene una forma propia; no repetir "chip + título + tarjetas".
* **El hilo:** la página es una planilla. Grilla de celdas muy tenue de fondo, números de fila a la izquierda en la landing, y la celda actual marcada en la esquina.
* **Dither:** solo en el MIO bot del hero (en vivo) y en texturas oscuras de fondo. No se usa para ilustrar datos que hay que leer.
* **Movimiento:** una entrada limpia por elemento, una sola vez. Las secciones fijadas avanzan con el scroll. Al pasar el mouse por un dato, el elemento se levanta apenas y muestra su valor exacto. Todo se apaga con `prefers-reduced-motion`.
* **Rendimiento:** nada a pantalla completa que se redibuje siempre. En celular no se carga 3D.

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

Las cuatro fuentes son fijas; no se cambian.

* **Plus Jakarta Sans** (800, tracking apretado): titulares y texto. Es la voz principal, porque se lee bien en grande.
* **Climate Crisis:** solo como acento. Una frase corta dentro de un titular, números gigantes de sección, el logotipo y los monogramas. Nunca un titular entero ni un párrafo (en tamaño grande pierde legibilidad).
* **JetBrains Mono:** etiquetas, cifras, tablas y datos. Números tabulares.
* **Wellfleet:** rotulado de la consola MIO-DEV.
* **Formato de números:** es-AR (`138.116`, `13,5 %`), en pesos cuando es plata.

---

## 5. SISTEMA DEL DASHBOARD (`/dashboard`)

Dos vistas del mismo resultado, con un selector en el encabezado: **Trabajo** y **Presentación**. Las dos leen de `src/components/dashboard/insights.ts`, así que nunca se contradicen.

* **Trabajo** (para quien sabe leer gráficos): tira de números clave, índice fijo de secciones, todos los gráficos en grilla pareja, métricas técnicas a la vista, tabla de valores raros y descarga de cada gráfico (imagen o datos).
* **Presentación** (para el jefe o una charla): hallazgos (hasta 3, en bloques de color con su cifra) → qué viene → cada gráfico con su nota al lado → para revisar → qué hacer ahora → qué hizo MIO con la planilla → chat.
* **La nota de cada gráfico va llena:** la frase, la cifra grande, "Qué mirar" (una oración), un ranking corto y los datos de apoyo. Si el gráfico no da para tanto, el bloque se achica; nunca queda aire.
* **Versión corta:** Presentación y Presentar muestran solo los 6 gráficos con más para contar (los "casi no hay diferencia" quedan últimos); el resto se abre con un botón.
* **Copiar resumen:** hallazgos y próximos pasos en texto plano, para pegar en WhatsApp o un mail.
* **Texto del motor:** títulos y subtítulos pasan por `charts/plainText.ts` (acentos, sin guiones bajos, coma decimal) antes de mostrarse.
* **Presentar:** botón del encabezado. Pantalla completa, una idea por pantalla, flechas o espacio para avanzar, Esc para salir.
* **Encabezado único:** archivo, selector de vista, Presentar, Exportar (PDF y PowerPoint con los gráficos, datos limpios), Copiar resumen y Guardar.
* **Hallazgos y próximos pasos:** se arman solo con datos que existen. Hay tendencia solo si hay una serie real en el tiempo; hay "diferencia entre grupos" solo si supera el 5 %; "acierta N de cada 10" solo si el backend midió el error.
* **Gráficos:** sin contornos negros, ejes finos, barras desde cero, números con coma decimal y los decimales justos para distinguir valores. Al pasar el mouse, el elemento se levanta y muestra su valor exacto.
* **Scroll:** la rueda siempre mueve la página; el zoom de un gráfico pide Ctrl/Cmd.
* **Lenguaje:** "valores fuera de lo normal" en vez de anomalías, "qué pesó más" en vez de SHAP, "¿qué querés predecir?" en vez de target. Los nombres de columna se muestran sin guiones bajos.
* **Chat:** "Preguntale a MIO", en bloque obsidiana, con preguntas sugeridas. Pasa siempre por el backend; el navegador no maneja claves.
* **Datos reales:** nunca mostrar valores de relleno (filas, modelo) cuando el registro no los trae.

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

## 8. LO QUE MIO NO ES

1. **No es genérico ni "vibecodeado":** sin emojis en la interfaz, sin frases infladas ("magia", "revolución", "en segundos"), sin tres tarjetas iguales en fila.
2. **No es brutalista** ni de líneas finas con texto suelto (ver sección 2).
3. **No promete lo que no puede respaldar:** sin tiempos, precisiones ni clientes inventados.
4. **No esconde la acción:** siempre hay a mano un "Probar con mi planilla".
5. **No expone secretos:** ninguna clave en el código ni en variables `VITE_`.

---

## 9. LOGOTIPO & MARCAS GRÁFICAS

* **Isotipo / Monograma:** Letra **`M`** mayúscula, geométrica, de trazo grueso e inclinación dinámica hacia adelante (cursiva arquitectónica), cortada con precisión en su vértice central.
* **Logo en Barra de Navegación:** Cuadrado negro con borde de 2px, letra `M` en lima neón (`bg-black text-[#bdf559] border-2 border-black font-mono font-black`), seguido de la palabra **`MIO`** y un punto LED verde lima.
* **Favicon & PWA:** Isotipo con contraste absoluto optimizado para visibilidad en pestañas oscuras y claras.

---

*Fin del documento de Branding de MIO. Consérvese como referencia permanente de diseño e identidad para todos los agentes del proyecto.*
