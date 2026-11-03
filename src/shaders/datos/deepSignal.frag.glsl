// Deep Signal — hairline contour lines of a drifting field, brightest around
// one off-centre glow. Quiet enough to sit behind text.
uniform vec3 uColor;
uniform float uLines;  // contour density

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;

  float f = fbm2(p * 1.4 + vec2(uTime * 0.03, 0.0)) * 0.8
          + p.y * 0.5
          + 0.08 * sin(p.x * 4.0 + uTime * 0.4);

  float v = f * uLines;
  float line = 1.0 - min(abs(fract(v) - 0.5) / fwidth(v), 1.0);
  float glow = smoothstep(1.1, 0.0, length(p - vec2(0.15, 0.45)));
  float a = line * mix(0.12, 0.9, glow);

  gl_FragColor = vec4(uColor * a, a);
}
