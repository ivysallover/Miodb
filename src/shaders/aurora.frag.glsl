#version 300 es
precision highp float;

/* La aurora de fondo de la app de escritorio (`components/canvas/Aurora.tsx`): tres cortinas de luz
 * que ondulan despacio, con rayos verticales suaves. Violeta y lavanda de la marca; la lima apenas,
 * como chispa. Todo es de baja frecuencia (sin tramado ni puntos): se puede dibujar a media
 * resolución sin que se note. Sale con alfa premultiplicado, encima de la planilla de fondo. */

uniform vec2 uResolution;
uniform float uTime;
/* 1 = tema oscuro, 0 = claro. */
uniform float uDark;
out vec4 fragColor;

const vec3 VIOLET = vec3(0.463, 0.278, 0.922);   // #7647eb
const vec3 LAVENDER = vec3(0.725, 0.639, 1.0);   // #b9a3ff
const vec3 LIME = vec3(0.741, 0.961, 0.349);     // #bdf559

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

/* Una cortina, como las auroras de verdad: el borde de abajo nítido y una cola larga hacia arriba,
 * cruzada por rayos verticales finos que se mueven despacio. Devuelve (brillo, cercanía al borde). */
vec2 curtain(vec2 uv, float t, float seed, float height, float width) {
  float x = uv.x + uv.y * 0.32;  // inclinada: cruza la ventana en diagonal
  float center = height + 0.07 * sin(x * 1.3 + t * 0.09 + seed) + (fbm(vec2(x * 0.7 + seed, t * 0.04)) - 0.5) * 0.3;
  float d = uv.y - center;
  float band = smoothstep(-width * 0.45, 0.0, d) * exp(-max(d, 0.0) / (width * 2.8));
  float rays = fbm(vec2(x * 13.0 + seed * 5.0 + fbm(vec2(x * 2.0, t * 0.05)) * 2.0, t * 0.07));
  rays = 0.35 + 1.1 * rays * rays;
  float edge = exp(-(d * d) / (width * width * 0.18));
  return vec2(band * rays, edge * rays);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.y;
  float t = uTime;

  vec2 a = curtain(uv, t, 1.3, 0.5, 0.09);
  vec2 b = curtain(uv + vec2(0.45, 0.0), t * 1.15, 4.7, 0.32, 0.07);
  vec2 c = curtain(uv - vec2(0.3, 0.0), t * 0.85, 9.1, 0.68, 0.05);

  // Cerca del borde, lavanda clara; más arriba, violeta. La lima, solo como chispa donde el borde brilla más.
  float light = a.x + b.x * 0.8 + c.x * 0.6;
  float edge = clamp(a.y + b.y * 0.8 + c.y * 0.6, 0.0, 1.0);
  vec3 color = mix(VIOLET, LAVENDER, smoothstep(0.1, 0.9, edge));
  color = mix(color, LIME, 0.12 * edge * edge);
  float glow = clamp(light * 0.8, 0.0, 1.0);

  // Se apaga hacia los bordes de arriba y abajo de la ventana.
  float y = gl_FragCoord.y / uResolution.y;
  glow *= smoothstep(0.0, 0.25, y) * (1.0 - smoothstep(0.8, 1.0, y));

  // En claro, más tenue y hacia el lavanda, para que el texto siga mandando.
  float strength = mix(0.32, 0.7, uDark);
  color = mix(color, LAVENDER, 0.35 * (1.0 - uDark));

  float alpha = glow * strength;
  // Un grano de 1/255 para que los degradés no hagan escalones.
  alpha = clamp(alpha + (hash(gl_FragCoord.xy + fract(t)) - 0.5) / 255.0, 0.0, 1.0);
  fragColor = vec4(clamp(color, 0.0, 1.0) * alpha, alpha);
}
