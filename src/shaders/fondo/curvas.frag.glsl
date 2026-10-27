/* Curvas de nivel: líneas finas, como un mapa de datos, que se deforman de a poco; cada quinta curva
 * un poco más marcada. Nítidas a cualquier tamaño (el ancho sale de la derivada en pantalla). */

void main() {
  vec2 uv = gl_FragCoord.xy / uRes.y;
  float t = uTime * 0.035;
  float h = fbm(uv * 1.6 + vec2(t, -t * 0.6)) + 0.35 * fbm(uv * 3.1 - t);
  float k = h * 14.0;
  float w = fwidth(k);
  float line = 1.0 - smoothstep(w * 0.6, w * 1.6, abs(fract(k + 0.5) - 0.5));
  float major = 1.0 - smoothstep(w * 0.6, w * 2.2, abs(fract(k / 5.0 + 0.1) - 0.5) * 5.0);
  float fade = 0.55 + 0.45 * smoothstep(0.2, 0.9, h);
  vec3 col = over(VIOLET, line * 0.22 * fade + major * 0.18);
  col = mix(col, over(LAVENDER, 1.0), 0.10 * smoothstep(0.3, 0.9, h));
  paint(col);
}
