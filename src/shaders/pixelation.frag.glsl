precision highp float;

uniform sampler2D tDiffuse;
uniform float uGranularity;
uniform vec2 uResolution;
varying vec2 vUv;

void main() {
  if (uGranularity <= 1.0) {
    gl_FragColor = texture2D(tDiffuse, vUv);
    return;
  }

  // Discrete coordinate quantization inspired by pmndrs/postprocessing PixelationEffect
  vec2 d = vec2(uGranularity / uResolution.x, uGranularity / uResolution.y);
  vec2 coord = vec2(d.x * floor(vUv.x / d.x) + d.x * 0.5, d.y * floor(vUv.y / d.y) + d.y * 0.5);

  gl_FragColor = texture2D(tDiffuse, coord);
}
