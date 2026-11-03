// Data Cube — a slowly tumbling wireframe cube drawn only with 0/1 glyphs.
// Front edges are bright, back edges recede; empty cells keep a faint grid.
uniform float uCell;   // glyph cell width in CSS px (height = 1.6x)
uniform vec3 uBase;    // back edges
uniform vec3 uEdge;    // front edges

vec3 tumble(vec3 v) {
  float ax = uTime * 0.23 + 0.5;
  float ay = uTime * 0.31;
  v.yz = mat2(cos(ax), -sin(ax), sin(ax), cos(ax)) * v.yz;
  v.xz = mat2(cos(ay), -sin(ay), sin(ay), cos(ay)) * v.xz;
  return v;
}

// xy: screen position (height = 1), z: depth in [-1.7, 1.7].
vec3 project(vec3 v) {
  v = tumble(v);
  return vec3(v.xy * 0.65 / (v.z + 4.0), v.z);
}

// The cube edge parallel to `axis`, at offsets (s, t) on the other two axes.
vec3 corner(int axis, float a, float s, float t) {
  if (axis == 0) return vec3(a, s, t);
  if (axis == 1) return vec3(s, a, t);
  return vec3(s, t, a);
}

void main() {
  vec2 cellSize = vec2(uCell, uCell * 1.6) * uPixelRatio;
  vec2 grid = gl_FragCoord.xy / cellSize;
  vec2 cell = floor(grid);
  vec2 p = ((cell + 0.5) * cellSize - 0.5 * uResolution) / uResolution.y;

  float d = 1e3;
  float depth = 0.0;
  for (int axis = 0; axis < 3; axis++) {
    for (int k = 0; k < 4; k++) {
      float s = mod(float(k), 2.0) * 2.0 - 1.0;
      float t = float(k / 2) * 2.0 - 1.0;
      vec3 a = project(corner(axis, -1.0, s, t));
      vec3 b = project(corner(axis, 1.0, s, t));
      float h;
      float e = segDist(p, a.xy, b.xy, h);
      if (e < d) {
        d = e;
        depth = mix(a.z, b.z, h);
      }
    }
  }

  float edge = 1.0 - smoothstep(0.0, 0.04, d);
  float front = smoothstep(1.2, -1.2, depth);
  float body = edge * mix(0.3, 1.0, front) + 0.05;
  float a = body * glyph01(fract(grid) - 0.5, glyphPick(cell, mix(0.5, 2.5, edge)));

  gl_FragColor = vec4(mix(uBase, uEdge, front * edge) * a, a);
}
