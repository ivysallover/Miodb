/* Aurora: tres cortinas de luz violeta y lavanda con borde nítido, cola hacia arriba y rayos finos;
 * la lima apenas, como chispa. */

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
  vec2 uv = gl_FragCoord.xy / uRes.y;
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
  float y = gl_FragCoord.y / uRes.y;
  glow *= smoothstep(0.0, 0.25, y) * (1.0 - smoothstep(0.8, 1.0, y));

  // En claro, más tenue y hacia el lavanda, para que el texto siga mandando.
  color = mix(color, LAVENDER, 0.35 * (1.0 - uDark));
  vec3 col = mix(uPage, clamp(color, 0.0, 1.0), glow * mix(0.32, 0.7, uDark));
  paint(gridLine(col, onGrid(gl_FragCoord.xy)));
}
