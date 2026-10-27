/* Quieto: la grilla de planilla y un degradé violeta muy suave desde una esquina. No se mueve: se
 * dibuja una sola vez. */

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 corner = uv - vec2(1.0);
  vec3 col = over(VIOLET, exp(-dot(corner, corner) / 0.35) * 0.28);
  col = mix(col, over(LAVENDER, 1.0), exp(-dot(uv, uv) / 0.25) * 0.10);
  paint(gridLine(col, onGrid(gl_FragCoord.xy)));
}
