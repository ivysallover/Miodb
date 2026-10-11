// Print pass for "El paisaje de 1.826 días".
// Input: the lit 3D scene, rendered small (one texel = one printed dot on the page).
// Output: the scene as a two-ink print on the page's own paper: six stops from obsidian to the
// paper white, ordered-dithered (Bayer 8x8 loosened with a little grain so it reads as ink, not as
// a checkerboard), plus one spot colour: anything saturated and not violet is laid down flat in
// lime. Hue is discarded on purpose; what the scene controls is tone.
precision highp float;

uniform sampler2D tScene;
// sRGB values, written to the canvas as they are: the top stop is exactly the page background.
uniform vec3 uRamp[6];
uniform vec3 uSpot;
uniform float uExposure;

varying vec2 vUv;

float bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x / 2.0 + a.y * a.y * 0.75);
}
#define bayer4(a) (bayer2(0.5 * (a)) * 0.25 + bayer2(a))
#define bayer8(a) (bayer4(0.5 * (a)) * 0.25 + bayer2(a))

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec3 lin = max(texture2D(tScene, vUv).rgb, 0.0);

  // Spot ink: tested on the un-exposed colour, so emissives keep their hue.
  vec3 raw = pow(clamp(lin, 0.0, 1.0), vec3(1.0 / 2.2));
  float hi = max(raw.r, max(raw.g, raw.b));
  float lo = min(raw.r, min(raw.g, raw.b));
  float sat = (hi - lo) / max(hi, 0.001);
  bool violetFamily = raw.b >= hi - 0.001 && raw.r > raw.g;
  if (sat > 0.42 && hi > 0.45 && !violetFamily) {
    gl_FragColor = vec4(uSpot, 1.0);
    return;
  }

  vec3 col = pow(clamp(lin * uExposure, 0.0, 1.0), vec3(1.0 / 2.2));
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));

  float threshold = mix(bayer8(gl_FragCoord.xy), hash(gl_FragCoord.xy), 0.2);
  float scaled = lum * 5.0;
  float base = floor(scaled);
  float stop = min(base + step(threshold, scaled - base), 5.0);

  vec3 outCol = uRamp[0];
  outCol = mix(outCol, uRamp[1], step(0.5, stop));
  outCol = mix(outCol, uRamp[2], step(1.5, stop));
  outCol = mix(outCol, uRamp[3], step(2.5, stop));
  outCol = mix(outCol, uRamp[4], step(3.5, stop));
  outCol = mix(outCol, uRamp[5], step(4.5, stop));

  gl_FragColor = vec4(outCol, 1.0);
}
