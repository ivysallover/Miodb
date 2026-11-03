// Shared header for the data backdrops. ShaderCanvas prepends this to every
// fragment shader in this folder, so they only declare their own uniforms.
precision highp float;

uniform vec2 uResolution;   // drawing buffer size in device px
uniform float uTime;
uniform float uPixelRatio;  // CSS px -> device px

varying vec2 vUv;

float hash11(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise1(float x) {
  float i = floor(x);
  float f = fract(x);
  return mix(hash11(i), hash11(i + 1.0), f * f * (3.0 - 2.0 * f));
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
             mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm2(vec2 p) {
  return noise2(p) * 0.55 + noise2(p * 2.03 + 11.0) * 0.3 + noise2(p * 4.01 + 23.0) * 0.15;
}

// Ordered 4x4 Bayer threshold in [0, 1).
float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }

// Procedural 0/1 glyph. q in [-0.5, 0.5]^2 cell-local; returns coverage.
float glyph01(vec2 q, float isOne) {
  float zero = abs(length(q / vec2(0.26, 0.36)) - 1.0) * 0.26 - 0.055;
  float one = max(abs(q.x) - 0.05, abs(q.y) - 0.36);
  return 1.0 - smoothstep(0.0, 0.06, mix(zero, one, isOne));
}

// Picks 0 or 1 for a cell, re-rolled `rate` times per second.
float glyphPick(vec2 cell, float rate) {
  return step(0.5, hash21(cell + floor(uTime * rate + hash21(cell) * 9.0)));
}

// Distance from p to segment ab; h returns the position along it (0..1).
float segDist(vec2 p, vec2 a, vec2 b, out float h) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}
