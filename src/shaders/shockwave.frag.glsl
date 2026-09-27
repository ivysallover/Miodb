// Magnetic Shockwave Pulse - Fragment Shader
uniform float uProgress; // 0.0 to 1.0
uniform vec3 uColor;

varying vec2 vUv;

void main() {
  vec2 center = vec2(0.5);
  float dist = length(vUv - center);

  // Expanding ring pulse
  float ringRadius = uProgress * 0.48;
  float ringThickness = 0.045;
  float ring = smoothstep(ringRadius - ringThickness, ringRadius, dist) -
               smoothstep(ringRadius, ringRadius + ringThickness, dist);

  float fade = 1.0 - uProgress;
  float alpha = ring * fade * 0.85;

  if (alpha <= 0.01) {
    discard;
  }

  gl_FragColor = vec4(uColor, alpha);
}
