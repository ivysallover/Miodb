/* Halo: tres manchas de luz muy desenfocadas (violeta, lavanda y un toque de lima) que se mueven
 * despacio y se mezclan entre sí, sobre la grilla de planilla. Lo más tranquilo. */

float blob(vec2 uv, vec2 c, float r) {
  vec2 d = uv - c;
  return exp(-dot(d, d) / (r * r));
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes.y;
  float t = uTime * 0.06;
  float ar = uRes.x / uRes.y;
  float a = blob(uv, vec2(ar * (0.30 + 0.12 * sin(t * 1.3)), 0.72 + 0.10 * cos(t)), 0.42);
  float b = blob(uv, vec2(ar * (0.72 + 0.10 * cos(t * 0.9)), 0.30 + 0.12 * sin(t * 1.1)), 0.48);
  float c = blob(uv, vec2(ar * (0.55 + 0.18 * sin(t * 0.7 + 2.0)), 0.55 + 0.15 * cos(t * 0.8 + 1.0)), 0.30);
  vec3 col = over(VIOLET, a * 0.55);
  col = mix(col, over(LAVENDER, 1.0), b * 0.42);
  col = mix(col, over(LIME, 1.0), c * 0.12);
  paint(gridLine(col, onGrid(gl_FragCoord.xy)));
}
