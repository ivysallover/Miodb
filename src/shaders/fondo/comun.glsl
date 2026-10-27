#version 300 es
precision highp float;

/* Lo que comparten los fondos de la app de escritorio (`components/canvas/Fondo.tsx`): cada uno se
 * arma con esto más su propio `main`. Pintan la página entera (opacos), así que el claro y el oscuro
 * salen de `uPage` y `uDark`: en claro el color se mezcla con menos fuerza para que el texto mande. */

uniform vec2 uRes;      // tamaño del lienzo, en píxeles de pantalla
uniform float uTime;    // segundos
uniform float uDark;    // 1 = oscuro, 0 = claro
uniform vec3 uPage;     // el color de la página en el tema actual
uniform float uScale;   // píxeles de pantalla por píxel de la app
out vec4 o;

const vec3 VIOLET = vec3(0.463, 0.278, 0.922);   // #7647eb
const vec3 LAVENDER = vec3(0.725, 0.639, 1.0);   // #b9a3ff
const vec3 LIME = vec3(0.741, 0.961, 0.349);     // #bdf559, solo como chispa

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return v;
}

/* Un color sobre la página, con fuerza `a` (en claro, más tenue). */
vec3 over(vec3 c, float a) {
  return mix(uPage, c, a * mix(0.55, 1.0, uDark));
}

/* La línea de la grilla de planilla de la marca (`.mio-sheet-bg`): tinta casi transparente sobre la página. */
vec3 gridLine(vec3 col, float on) {
  vec3 ink = mix(vec3(0.043, 0.035, 0.078), vec3(1.0), uDark);
  return mix(col, ink, on * mix(0.045, 0.035, uDark));
}

/* Cuánto cae sobre una línea de la grilla de planilla (filas de 36 px, columnas de 180 px). */
float onGrid(vec2 px) {
  vec2 f = fract(px / (vec2(180.0, 36.0) * uScale));
  vec2 w = vec2(1.0) / (vec2(180.0, 36.0) * uScale);
  return max(step(f.x, w.x), step(f.y, w.y));
}

/* Un grano de 1/255 para que los degradés no hagan escalones; y sale opaco. */
void paint(vec3 c) {
  o = vec4(c + (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0, 1.0);
}
