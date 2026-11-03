// Dither Field — a drifting gradient rendered as a 1-bit Bayer dither.
// With uHasMask = 1, the alpha of uMask (e.g. the MIO logo, stretched to the
// canvas) reads denser and takes the accent colour: the Dither Logo variant.
uniform float uDot;        // dither pixel size in CSS px
uniform vec3 uColor;
uniform vec3 uAccent;
uniform sampler2D uMask;
uniform float uHasMask;

void main() {
  float size = uDot * uPixelRatio;
  vec2 cell = floor(gl_FragCoord.xy / size);
  vec2 uv = (cell + 0.5) * size / uResolution;
  vec2 p = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);

  float v = fbm2(p * 1.6 + vec2(uTime * 0.06, uTime * 0.04)) * 0.9 - 0.2
          + (uv.x - uv.y) * 0.3;
  float m = texture2D(uMask, uv).a * uHasMask;
  v = mix(v, 0.55 + v * 0.6, m);

  float a = step(bayer4(cell), clamp(v, 0.0, 1.0));
  gl_FragColor = vec4(mix(uColor, uAccent, m) * a, a);
}
