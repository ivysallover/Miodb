// Digital Activation — a dot matrix where regions switch on in discrete steps
// as a slow noise field drifts across it (segments lighting up).
uniform float uCell;   // dot spacing in CSS px
uniform vec3 uColor;

void main() {
  vec2 grid = gl_FragCoord.xy / (uCell * uPixelRatio);
  vec2 cell = floor(grid);

  float n = fbm2(cell * 0.07 + vec2(uTime * 0.12, -uTime * 0.05));
  float act = floor(smoothstep(0.5, 0.72, n) * 4.0) / 4.0;

  float r = mix(0.12, 0.34, act);
  float disc = 1.0 - smoothstep(r - 0.06, r, length(fract(grid) - 0.5));
  float a = disc * mix(0.08, 1.0, act);

  gl_FragColor = vec4(uColor * a, a);
}
