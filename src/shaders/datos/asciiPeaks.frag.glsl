// ASCII Peaks — columns of 0/1 glyphs whose height follows a drifting noise
// field, read as a live bar chart.
uniform float uCell;   // glyph cell width in CSS px (height = 1.6x)
uniform vec3 uBase;    // bar body
uniform vec3 uCrest;   // bar crest

float columnHeight(float col, float t) {
  float h = noise1(col * 0.09 + t * 0.35) * 0.65
          + noise1(col * 0.31 - t * 0.6 + 17.0) * 0.35;
  return 0.12 + 0.78 * h * h * (3.0 - 2.0 * h);
}

void main() {
  vec2 cellSize = vec2(uCell, uCell * 1.6) * uPixelRatio;
  vec2 grid = gl_FragCoord.xy / cellSize;
  vec2 cell = floor(grid);

  float rowY = (cell.y + 0.5) / (uResolution.y / cellSize.y);
  float h = columnHeight(cell.x, uTime);
  float lit = step(rowY, h);
  float crest = smoothstep(h - 0.14, h, rowY) * lit;

  // Cells near the crest flicker faster.
  float isOne = glyphPick(cell, mix(0.6, 3.0, crest));
  float body = lit * mix(0.45, 1.0, crest) + (1.0 - lit) * 0.08;
  float a = body * glyph01(fract(grid) - 0.5, isOne);

  gl_FragColor = vec4(mix(uBase, uCrest, crest) * a, a);
}
