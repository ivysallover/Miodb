// Inbound — diagonal streaks fall through the frame; each head is tracked by a
// flickering detection bracket, like outliers being caught as they arrive.
uniform vec3 uColor;

const float ANGLE = 0.5;
const float SPAN = 2.4;

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  float c = cos(ANGLE);
  float s = sin(ANGLE);
  vec2 r = mat2(c, -s, s, c) * p;
  float px = 1.0 / uResolution.y;

  float streaks = 0.0;
  float brackets = 0.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float lane = (fi - 2.5) * 0.17 + (hash11(fi) - 0.5) * 0.06;
    float speed = 0.3 + hash11(fi + 7.0) * 0.3;
    float head = mod(uTime * speed + hash11(fi + 3.0) * SPAN, SPAN) - SPAN * 0.5;
    float len = 0.3 + hash11(fi + 5.0) * 0.25;

    float along = head - r.y;
    float tail = step(0.0, along) * (1.0 - smoothstep(0.0, len, along));
    float dx = abs(r.x - lane);
    streaks += tail * tail * (exp(-dx * 160.0) + exp(-dx * 28.0) * 0.25);

    // Bracket around the head, in screen space (inverse rotation).
    vec2 headP = mat2(c, s, -s, c) * vec2(lane, head);
    vec2 q = abs(p - headP);
    float box = 0.045;
    float border = 1.0 - smoothstep(px, 2.0 * px, abs(max(q.x, q.y) - box));
    float cornerOnly = step(box * 0.55, min(q.x, q.y));
    float flicker = 0.55 + 0.45 * step(0.3, hash11(floor(uTime * 8.0) + fi * 13.0));
    brackets += border * cornerOnly * flicker;
  }

  float a = clamp(streaks * 1.2 + brackets * 0.8, 0.0, 1.0);
  gl_FragColor = vec4(uColor * a, a);
}
