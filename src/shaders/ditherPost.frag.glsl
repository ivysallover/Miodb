// Ordered-dither post pass for the hero specimen.
// Input: the lit 3D scene rendered small (one texel = one "pixel" on the page).
// Output: a 5-stop brand ramp (obsidian → lavender) dithered with a Bayer 8x8 matrix.
// Saturated non-violet pixels (the lime eyes, mood-coloured data cubes) pass through
// flat, so they read as the one spark of colour on a monochrome figure.
precision highp float;

uniform sampler2D tScene;
uniform vec3 uRamp[5];
uniform float uContrast;
uniform float uExposure;

varying vec2 vUv;

float bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x / 2.0 + a.y * a.y * 0.75);
}
#define bayer4(a) (bayer2(0.5 * (a)) * 0.25 + bayer2(a))
#define bayer8(a) (bayer4(0.5 * (a)) * 0.25 + bayer2(a))

void main() {
  vec4 src = texture2D(tScene, vUv);
  float threshold = bayer8(gl_FragCoord.xy);

  // Coverage is dithered too, so soft shadows dissolve into the page as dots.
  if (src.a <= threshold * 0.96 + 0.02) discard;

  // Translucent texels are the cast shadow: draw it in the ramp, not in black.
  if (src.a < 0.9) {
    gl_FragColor = vec4(pow(uRamp[2], vec3(1.0 / 2.2)), 1.0);
    return;
  }

  vec3 lin = src.rgb / max(src.a, 0.001);
  // Spark test on the un-exposed colour, so bright emissives keep their hue.
  vec3 raw = pow(clamp(lin, 0.0, 1.0), vec3(1.0 / 2.2));
  float hi = max(raw.r, max(raw.g, raw.b));
  float lo = min(raw.r, min(raw.g, raw.b));
  float sat = (hi - lo) / max(hi, 0.001);
  bool violetFamily = raw.b >= hi - 0.001 && raw.r > raw.g;
  if (sat > 0.42 && hi > 0.45 && !violetFamily) {
    gl_FragColor = vec4(raw / hi, 1.0);
    return;
  }

  vec3 col = pow(clamp(lin * uExposure, 0.0, 1.0), vec3(1.0 / 2.2));
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  lum = clamp((lum - 0.5) * uContrast + 0.5, 0.0, 1.0);

  float scaled = lum * 4.0;
  float base = floor(scaled);
  float stop = min(base + step(threshold, scaled - base), 4.0);

  vec3 outCol = uRamp[0];
  outCol = mix(outCol, uRamp[1], step(0.5, stop));
  outCol = mix(outCol, uRamp[2], step(1.5, stop));
  outCol = mix(outCol, uRamp[3], step(2.5, stop));
  outCol = mix(outCol, uRamp[4], step(3.5, stop));

  // Ramp colours arrive linear (THREE.Color); the canvas expects sRGB.
  gl_FragColor = vec4(pow(outCol, vec3(1.0 / 2.2)), 1.0);
}
