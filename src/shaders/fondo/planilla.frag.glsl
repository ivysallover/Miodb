/* Planilla viva: la grilla de planilla de la marca y una luz suave que recorre las celdas y las tiñe de
 * violeta a su paso (cada celda entera, como al pintar un rango). La celda donde está la luz queda
 * seleccionada, como el cursor de una planilla. */

void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 cell = vec2(180.0, 36.0) * uScale;
  vec2 g = floor(px / cell);
  float t = uTime * 0.09;
  float ar = uRes.x / uRes.y;

  // Dos luces que pasean; cada celda toma la luz de su centro.
  vec2 l1 = vec2(ar * (0.5 + 0.35 * sin(t)), 0.5 + 0.3 * sin(t * 1.37 + 1.0));
  vec2 l2 = vec2(ar * (0.5 + 0.3 * cos(t * 0.73 + 2.0)), 0.5 + 0.28 * cos(t * 1.1));
  vec2 c = (g + 0.5) * cell / uRes.y;
  float lit = exp(-dot(c - l1, c - l1) / 0.06) + 0.6 * exp(-dot(c - l2, c - l2) / 0.045);
  lit = clamp(lit * (0.75 + 0.25 * noise(g * 0.35 + t)), 0.0, 1.0);

  vec3 col = over(VIOLET, lit * 0.3);
  float line = onGrid(px);
  col = gridLine(col, line);
  col = mix(col, over(VIOLET, 1.0), line * 0.22 * lit);

  // La celda seleccionada: un borde violeta y apenas de lima adentro.
  if (g == floor(l1 * uRes.y / cell)) {
    vec2 f = px - g * cell;
    float edge = 2.0 * uScale;
    float border = 1.0 - step(edge, min(min(f.x, cell.x - f.x), min(f.y, cell.y - f.y)));
    col = mix(col, over(LIME, 1.0), 0.08 * (1.0 - border));
    col = mix(col, VIOLET, border * mix(0.7, 0.9, uDark));
  }
  paint(col);
}
