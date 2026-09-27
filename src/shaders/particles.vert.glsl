#version 300 es
precision highp float;

in vec2 aPosition;
in float aScale;
in float aRandom;

uniform float uTime;
uniform float uSize;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uVelocity;
uniform float uScroll;

out vec3 vColor;
out float vAlpha;

void main() {
  vec2 pos = aPosition;
  
  // Aspect ratio scaling
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 normPos = pos;
  vec2 mPos = (uMouse - 0.5) * 2.0;
  
  // Gentle mouse deflection
  vec2 diff = (normPos - mPos) * vec2(aspect, 1.0);
  float dist = length(diff);
  float force = smoothstep(0.4, 0.0, dist) * 0.035;
  normPos += (normalize(diff + 0.0001) * force) / vec2(aspect, 1.0);
  
  // Smooth atmospheric drifting
  normPos.y += sin(uTime * 0.4 + aRandom * 6.28) * 0.02;
  normPos.x += cos(uTime * 0.3 + aRandom * 6.28) * 0.015;

  gl_Position = vec4(normPos, 0.0, 1.0);
  
  float sizeBoost = 1.0 + smoothstep(0.3, 0.0, dist) * 0.8;
  gl_PointSize = uSize * aScale * sizeBoost;

  // Brand luminescence: MIO Lime (#bdf559) and Laser Violet (#7647eb)
  vec3 lime = vec3(0.741, 0.961, 0.349);
  vec3 violet = vec3(0.463, 0.278, 0.922);
  vColor = mix(lime, violet, aRandom);
  vAlpha = (0.25 + 0.5 * sin(uTime * 1.5 + aRandom * 6.28)) * (1.0 + force * 1.2);
}
