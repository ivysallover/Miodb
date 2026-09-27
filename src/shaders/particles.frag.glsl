#version 300 es
precision highp float;

in vec3 vColor;
in float vAlpha;
out vec4 fragColor;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  
  if (dist > 0.5) {
    discard;
  }

  // Soft edge glow falloff
  float intensity = pow(1.0 - (dist * 2.0), 1.6);
  fragColor = vec4(vColor, vAlpha * intensity);
}
