#version 300 es
precision highp float;

uniform vec2 iResolution;
uniform float iTime;
uniform float uLightMode;
uniform vec3 uDarkBackground;
uniform vec3 uLightBackground;
uniform vec2 uMouse;
uniform float uVelocity;
uniform float uScroll;
out vec4 fragColor;

/* === CALIBRACIÓN DE COLOR MIO (Espacio OKLCH) ===
 * HUE: Tono violeta corporativo (~290° / 5.06 rad -> 0.8047)
 * HUE_SPREAD: Curva hacia el lima neón (~127° / 2.21 rad -> -0.4525)
 * LIGHTNESS: 0.55 (violeta) + LIGHT_SWING: 0.35 -> alcanza 0.90 (lima)
 * CHROMA: 0.22 (saturación alta y viva para estética cyberpunk/editorial)
 */
const float HUE = 0.804712;
const float HUE_SPREAD = -0.452495;
const float HUE_TRAVEL = 1.70920336;
const float CHROMA = 0.22000000;
const float LIGHTNESS = 0.55000000;
const float LIGHT_SWING = 0.35000000;
const float COLOUR_CYCLE = 0.214608803;

const float THETA = 2.12800074;
const float SHEAR = 0.969353318;
const float SHRINK = 0.95136255;
const float LAYERS = 12.0;
const float WARP_FREQ_X = 0.420039982;
const float WARP_FREQ_Y = 2.67160177;
const float WARP_AMP_X = 0.111688949;
const float WARP_AMP_Y = 0.0232174657;
const float ASPECT_X = 1.61634731;
const float ASPECT_Y = 0.176242709;
const float OFFSET_X = 0.418659329;
const float OFFSET_Y = -0.00644427864;
const float TILT = -3.03814864;
const float ZOOM = 1.00841641;
const float CENTRE_X = -0.0797306448;
const float CENTRE_Y = -0.682327747;

/* Calibración suave del brillo para background no intrusivo */
const float GLOW_SIZE = 0.00280000;
const float FALLOFF = 0.45000000;
const float VIGNETTE = 0.18000000;
const float FLOW_SPEED = 1.00000000;
const float FLOW_DIRECTION = 1.0;
const float BREATH_RATE = 0.628944635;
const float BREATH_AMOUNT = 0.103222102;
const float PHASE = 36.3558846;
const float ECHO = 0.0;
const float ECHO_SHIFT = -0.215382531;
const float SOFTNESS = 0.00212844531;

const float TAU = 6.28318530718;

vec3 oklchToLinear(float L, float C, float h) {
  float a = C * cos(h), b = C * sin(h);
  float l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  float m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  float s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  vec3 lms = vec3(l_, m_, s_);
  lms = lms * lms * lms;
  return mat3(4.0767416621, -1.2684380046, -0.0041960863,
              -3.3077115913, 2.6097574011, -0.7034186147,
              0.2309699292, -0.3413193965, 1.7076147010) * lms;
}

float blueNoise(vec2 p, float frame) {
  p += 5.588238 * mod(frame, 64.0);
  return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y));
}

void main() {
  vec2 R = iResolution.xy;
  vec2 pos = (gl_FragCoord.xy - 0.5 * R) / R.y;
  
  // Interactive mouse coordinate in aspect-corrected space
  vec2 mPos = (uMouse - 0.5) * vec2(R.x / R.y, 1.0);
  float distToMouse = length(pos - mPos);
  float mouseGlow = smoothstep(0.9, 0.0, distToMouse);
  
  // Smooth time progression without erratic phase jumps
  float t = iTime * FLOW_SPEED * FLOW_DIRECTION + PHASE;
  float breath = (-sin(iTime * BREATH_RATE * 1.5) + sin(iTime * BREATH_RATE + 1.0)) * 0.25 + 0.5;

  // Gentle, silky gravitational deflection around mouse
  vec2 mousePull = (pos - mPos) * (mouseGlow * 0.022);
  vec2 u = (pos - vec2(CENTRE_X, CENTRE_Y) - mousePull) * (ZOOM - breath * BREATH_AMOUNT);
  float ct = cos(TILT), st = sin(TILT);
  u = mat2(ct, st, -st, ct) * u;

  mat2 fold = mat2(cos(THETA), sin(THETA), -SHEAR, cos(THETA));

  float hue0 = HUE * TAU;
  float hue1 = hue0 + HUE_SPREAD * TAU;
  vec3 color = vec3(0.0);

  for (float i = 1.0; i <= 32.0; i += 1.0) {
    if (i > LAYERS) break;
    u.x += -sin(u.y * WARP_FREQ_X + t + i * 0.007) * WARP_AMP_X;
    u.y += -sin(u.x * WARP_FREQ_Y - t + i * 0.02) * WARP_AMP_Y;
    u = fold * u * SHRINK;

    vec2 q = u - vec2(OFFSET_X + breath * 0.1, OFFSET_Y);
    vec2 s = vec2(q.x * ASPECT_X, q.y * ASPECT_Y);
    float glow = GLOW_SIZE / (dot(s, s) + SOFTNESS);
#ifndef SKIP_ECHO
    vec2 e = vec2((q.x - ECHO_SHIFT) * ASPECT_X, s.y);
    glow += ECHO * GLOW_SIZE / (dot(e, e) + SOFTNESS);
#endif
    glow *= 0.25 + breath * 0.4;

    float r = length(u);
    float k = sin(i * COLOUR_CYCLE + t * 1.2 + r * HUE_TRAVEL) * 0.5 + 0.5;
    vec3 tint = clamp(oklchToLinear(LIGHTNESS + LIGHT_SWING * k, CHROMA * (0.75 + 0.35 * k), mix(hue0, hue1, k)), 0.0, 1.0);
    color += glow * tint * exp2(-r * FALLOFF);
  }

  vec3 x = max(color, 0.0);
  color = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);
  color = pow(clamp(color, 0.0, 1.0), vec3(0.85, 0.92, 0.98));

  float edge = smoothstep(0.5, 1.6, length(pos));
  color *= 1.0 - edge * VIGNETTE;

  vec3 dark = uDarkBackground + color * (1.0 - uDarkBackground);
  float strength = max(color.r, max(color.g, color.b));
  vec3 light = uLightBackground * (1.0 - strength) + color * 0.96;
  color = mix(dark, light, uLightMode);

  color += (blueNoise(gl_FragCoord.xy, floor(iTime * 24.0)) - 0.5) / 255.0;
  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
