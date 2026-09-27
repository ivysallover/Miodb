import { useRef, useEffect, type CSSProperties } from 'react';
import vertexShaderSource from '../../shaders/mioBackground.vert.glsl?raw';
import fieldShaderSource from '../../shaders/mioBackgroundField.frag.glsl?raw';
import postShaderSource from '../../shaders/mioBackgroundPost.frag.glsl?raw';
import particlesVertSource from '../../shaders/particles.vert.glsl?raw';
import particlesFragSource from '../../shaders/particles.frag.glsl?raw';

export type ShaderTheme = 'dark' | 'light';

export type ShaderOptions = {
  theme?: ShaderTheme;
  background?: { dark?: string; light?: string };
  autoplay?: boolean;
  signal?: AbortSignal;
  onError?: (error: Error) => void;
};

export type ShaderHandle = {
  setTheme(theme: ShaderTheme): void;
  render(time: number): void;
  destroy(): void;
};

export type MioBackgroundShaderProps = {
  theme?: ShaderTheme;
  background?: { dark?: string; light?: string };
  opacity?: number;
  time?: number;
  onError?: (error: Error) => void;
  className?: string;
  style?: CSSProperties;
};

function parseHex(hex: string): [number, number, number] {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) throw new Error(`Background colours must be #rrggbb, got "${hex}".`);
  return [0, 2, 4].map((i) => parseInt(match[1].slice(i, i + 2), 16) / 255) as [number, number, number];
}

const THEME_EASE = 7;
// 60 FPS target for silky fluid Lusion-grade physics
const MIN_FRAME_INTERVAL_MS = 16;
const PARTICLE_COUNT = 160;

function animate(
  options: ShaderOptions,
  draw: (
    time: number,
    theme: number,
    pixelRatio: number,
    mouse: { x: number; y: number },
    velocity: number,
    scroll: number
  ) => void,
  canvas: HTMLCanvasElement,
  release: () => void,
  maxDimension = Infinity
): ShaderHandle {
  const autoplay = options.autoplay !== false;
  const stillness = window.matchMedia('(prefers-reduced-motion: reduce)');
  let resolution = window.matchMedia(`(resolution: ${Math.min(window.devicePixelRatio || 1, 1.5)}dppx)`);
  let deviceRatio = Math.min(window.devicePixelRatio || 1, 1.5);
  let width = canvas.clientWidth;
  let height = canvas.clientHeight;
  let visible = true;
  let disposed = false;
  let targetTheme = options.theme === 'light' ? 1 : 0;
  let theme = targetTheme;
  let frame = 0;
  let elapsed = 0;
  let lastTime = 0;
  let previous: number | null = null;
  let lastRenderNow = 0;

  // Fluid mouse and velocity state
  const mouse = { x: 0.5, y: 0.5 };
  const targetMouse = { x: 0.5, y: 0.5 };
  let velocity = 0;
  let targetVelocity = 0;
  let scrollEnergy = 0;
  let lastScrollY = typeof window !== 'undefined' ? window.scrollY : 0;

  function onPointerMove(e: PointerEvent) {
    if (disposed) return;
    targetMouse.x = e.clientX / Math.max(window.innerWidth, 1);
    targetMouse.y = 1.0 - (e.clientY / Math.max(window.innerHeight, 1));
  }

  function onScroll() {
    if (disposed) return;
    const currentY = window.scrollY;
    const deltaY = Math.abs(currentY - lastScrollY);
    lastScrollY = currentY;
    scrollEnergy = Math.min(2.5, scrollEnergy + deltaY * 0.035);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function canDraw() {
    return !disposed && !document.hidden && visible && width > 0 && height > 0;
  }

  function fitCanvas() {
    // Strict AGENTS.md rule: Math.min(deviceRatio, 1.5)
    const scale = Math.min(
      deviceRatio,
      1.5,
      Math.sqrt(1200000 / (width * height)),
      maxDimension / width,
      maxDimension / height
    );
    const w = Math.max(1, Math.floor(width * scale));
    const h = Math.max(1, Math.floor(height * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return w / width;
  }

  function render(time: number) {
    if (disposed) return;
    lastTime = time;
    if (!canDraw()) return;
    try {
      draw(time, theme, fitCanvas(), mouse, velocity, scrollEnergy);
    } catch (error) {
      destroy();
      const failure = error instanceof Error ? error : new Error(String(error));
      if (options.onError) options.onError(failure);
      else console.error(failure);
    }
  }

  function schedule() {
    if (!frame && canDraw()) frame = requestAnimationFrame(tick);
  }

  function refresh() {
    if (!canDraw()) {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = null;
    } else schedule();
  }

  function tick(now: number) {
    frame = 0;
    if (!canDraw()) {
      previous = null;
      return;
    }

    if (now - lastRenderNow < MIN_FRAME_INTERVAL_MS) {
      if (autoplay && (!stillness.matches || theme !== targetTheme)) schedule();
      return;
    }
    lastRenderNow = now;

    const delta = previous === null ? 0 : Math.min((now - previous) / 1000, 0.1);
    previous = now;

    // Silky smooth mouse coordinates interpolation
    const dx = targetMouse.x - mouse.x;
    const dy = targetMouse.y - mouse.y;
    mouse.x += dx * 0.05;
    mouse.y += dy * 0.05;

    // Velocity calculation and gentle damping
    const instantVel = Math.hypot(dx, dy) * 8.0;
    targetVelocity = Math.max(targetVelocity * 0.85, instantVel);
    velocity += (targetVelocity - velocity) * 0.08;

    // Scroll energy decay
    scrollEnergy *= 0.92;

    if (autoplay) {
      if (!stillness.matches) elapsed += delta;
      theme += (targetTheme - theme) * (1 - Math.exp(-delta * THEME_EASE));
      if (Math.abs(targetTheme - theme) < 0.002) theme = targetTheme;
    }
    render(autoplay ? elapsed : lastTime);
    if (autoplay && (!stillness.matches || theme !== targetTheme)) schedule();
    else previous = null;
  }

  function pixelRatioChanged() {
    if (disposed) return;
    const next = Math.min(window.devicePixelRatio || 1, 1.5);
    if (deviceRatio === next) return;
    deviceRatio = next;
    resolution.removeEventListener('change', pixelRatioChanged);
    resolution = window.matchMedia(`(resolution: ${next}dppx)`);
    resolution.addEventListener('change', pixelRatioChanged);
    refresh();
  }

  const observer = new ResizeObserver(([entry]) => {
    if (disposed || !entry) return;
    const next = entry.contentRect;
    if (width === next.width && height === next.height) return;
    width = next.width;
    height = next.height;
    refresh();
  });

  const intersection = new IntersectionObserver(([entry]) => {
    if (disposed || !entry || visible === entry.isIntersecting) return;
    visible = entry.isIntersecting;
    refresh();
  });

  function destroy() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    frame = 0;
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
    }
    observer.disconnect();
    intersection.disconnect();
    resolution.removeEventListener('change', pixelRatioChanged);
    stillness.removeEventListener('change', refresh);
    document.removeEventListener('visibilitychange', refresh);
    window.removeEventListener('resize', pixelRatioChanged);
    options.signal?.removeEventListener('abort', destroy);
    release();
  }

  observer.observe(canvas);
  intersection.observe(canvas);
  resolution.addEventListener('change', pixelRatioChanged);
  stillness.addEventListener('change', refresh);
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('resize', pixelRatioChanged);
  options.signal?.addEventListener('abort', destroy, { once: true });
  if (options.signal?.aborted) destroy();
  else schedule();

  return {
    setTheme(next: ShaderTheme) {
      if (disposed) return;
      targetTheme = next === 'light' ? 1 : 0;
      if (autoplay) refresh();
      else {
        theme = targetTheme;
        render(lastTime);
      }
    },
    render,
    destroy,
  };
}

function attach(gl: WebGL2RenderingContext, program: WebGLProgram, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('WebGL could not create a shader object.');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    throw new Error(`Shader failed to compile: ${gl.getShaderInfoLog(shader)}`);
  gl.attachShader(program, shader);
  gl.deleteShader(shader);
}

function compile(gl: WebGL2RenderingContext, vertSource: string, fragmentSource: string) {
  const program = gl.createProgram();
  if (!program) throw new Error('WebGL failed to create program.');
  attach(gl, program, gl.VERTEX_SHADER, vertSource);
  attach(gl, program, gl.FRAGMENT_SHADER, fragmentSource);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw new Error(`Shader failed to link: ${gl.getProgramInfoLog(program)}`);
  return program;
}

function uniforms(gl: WebGL2RenderingContext, program: WebGLProgram, names: readonly string[]) {
  return Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(program, name)]));
}

export function createShader(canvas: HTMLCanvasElement, options: ShaderOptions = {}): ShaderHandle {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false });
  if (!gl) throw new Error('WebGL2 is not available in this browser.');
  
  // Default obsidian color scheme: #050508 for deepest OLED luxury
  const dark = parseHex(options.background?.dark ?? '#050508');
  const light = parseHex(options.background?.light ?? '#090812');

  // 1. Fluid OKLCH Field Program
  const field = compile(gl, vertexShaderSource, fieldShaderSource);
  const fieldUniforms = uniforms(gl, field, [
    'iResolution',
    'iTime',
    'uLightMode',
    'uDarkBackground',
    'uLightBackground',
    'uMouse',
    'uVelocity',
    'uScroll',
  ]);

  // 2. Post-processing Program
  const post = compile(gl, vertexShaderSource, postShaderSource);
  const postUniforms = uniforms(gl, post, [
    'tScene',
    'iResolution',
    'iTime',
    'uLightMode',
    'uDarkBackground',
    'uLightBackground',
    'uPixelRatio',
  ]);

  // 3. Cybernetic Floating Particles Program
  const particles = compile(gl, particlesVertSource, particlesFragSource);
  const particlesUniforms = uniforms(gl, particles, [
    'uTime',
    'uSize',
    'uResolution',
    'uMouse',
    'uVelocity',
    'uScroll',
  ]);

  // Particle Buffer & VAO setup (Static pre-allocation: ZERO in-loop instantiation)
  const particleData = new Float32Array(PARTICLE_COUNT * 4); // x, y, scale, random
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i4 = i * 4;
    particleData[i4 + 0] = Math.random() * 2 - 1; // x
    particleData[i4 + 1] = Math.random() * 2 - 1; // y
    particleData[i4 + 2] = 0.5 + Math.random() * 1.5; // scale
    particleData[i4 + 3] = Math.random(); // random seed
  }

  const particleBuffer = gl.createBuffer();
  const particleVao = gl.createVertexArray();

  gl.bindVertexArray(particleVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, particleData, gl.STATIC_DRAW);

  const aPosition = gl.getAttribLocation(particles, 'aPosition');
  const aScale = gl.getAttribLocation(particles, 'aScale');
  const aRandom = gl.getAttribLocation(particles, 'aRandom');

  if (aPosition >= 0) {
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 16, 0);
  }
  if (aScale >= 0) {
    gl.enableVertexAttribArray(aScale);
    gl.vertexAttribPointer(aScale, 1, gl.FLOAT, false, 16, 8);
  }
  if (aRandom >= 0) {
    gl.enableVertexAttribArray(aRandom);
    gl.vertexAttribPointer(aRandom, 1, gl.FLOAT, false, 16, 12);
  }

  gl.bindVertexArray(null);

  // Full-screen Quad Framebuffer
  const framebuffer = gl.createFramebuffer();
  const scene = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, scene);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  let sceneWidth = 0;
  let sceneHeight = 0;

  const setFrame = (
    locations: Record<string, WebGLUniformLocation | null>,
    time: number,
    theme: number,
    mouse: { x: number; y: number },
    vel: number,
    scroll: number
  ) => {
    gl.uniform2f(locations.iResolution, canvas.width, canvas.height);
    gl.uniform1f(locations.iTime, time);
    gl.uniform1f(locations.uLightMode, theme);
    gl.uniform3fv(locations.uDarkBackground, dark);
    gl.uniform3fv(locations.uLightBackground, light);
    if (locations.uMouse) gl.uniform2f(locations.uMouse, mouse.x, mouse.y);
    if (locations.uVelocity) gl.uniform1f(locations.uVelocity, vel);
    if (locations.uScroll) gl.uniform1f(locations.uScroll, scroll);
  };

  return animate(
    options,
    (time, theme, pixelRatio, mouse, velocity, scroll) => {
      const { width, height } = canvas;
      gl.viewport(0, 0, width, height);

      if (sceneWidth !== width || sceneHeight !== height) {
        sceneWidth = width;
        sceneHeight = height;
        gl.bindTexture(gl.TEXTURE_2D, scene);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, scene, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }

      const drawThemed = (mode: number) => {
        // Pass 1: Fluid Field in Framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.useProgram(field);
        setFrame(fieldUniforms, time, mode, mouse, velocity, scroll);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // Pass 2: Post-process onto canvas
        gl.useProgram(post);
        setFrame(postUniforms, time, mode, mouse, velocity, scroll);
        gl.uniform1f(postUniforms.uPixelRatio, pixelRatio);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, scene);
        gl.uniform1i(postUniforms.tScene, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        // Pass 3: Floating Cybernetic Particles (Additive Luminescence)
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

        gl.useProgram(particles);
        gl.uniform1f(particlesUniforms.uTime, time);
        gl.uniform1f(particlesUniforms.uSize, 7.5 * pixelRatio);
        gl.uniform2f(particlesUniforms.uResolution, width, height);
        gl.uniform2f(particlesUniforms.uMouse, mouse.x, mouse.y);
        gl.uniform1f(particlesUniforms.uVelocity, velocity);
        gl.uniform1f(particlesUniforms.uScroll, scroll);

        gl.bindVertexArray(particleVao);
        gl.drawArrays(gl.POINTS, 0, PARTICLE_COUNT);
        gl.bindVertexArray(null);

        gl.disable(gl.BLEND);
      };

      if (theme <= 0 || theme >= 1) {
        drawThemed(theme);
        return;
      }
      drawThemed(0);
      gl.enable(gl.BLEND);
      gl.blendColor(0, 0, 0, theme);
      gl.blendFunc(gl.CONSTANT_ALPHA, gl.ONE_MINUS_CONSTANT_ALPHA);
      drawThemed(1);
      gl.disable(gl.BLEND);
    },
    canvas,
    () => {
      gl.deleteProgram(field);
      gl.deleteProgram(post);
      gl.deleteProgram(particles);
      if (particleBuffer) gl.deleteBuffer(particleBuffer);
      if (particleVao) gl.deleteVertexArray(particleVao);
      if (framebuffer) gl.deleteFramebuffer(framebuffer);
      if (scene) gl.deleteTexture(scene);
    },
    Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), gl.getParameter(gl.MAX_RENDERBUFFER_SIZE))
  );
}

export function MioBackgroundShader({
  theme = 'dark',
  background,
  opacity = 0.52,
  time,
  onError,
  className,
  style,
}: MioBackgroundShaderProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const shader = useRef<ShaderHandle | null>(null);
  const latestTheme = useRef(theme);
  const latestTime = useRef(time);
  const latestOnError = useRef(onError);

  const dark = background?.dark ?? '#050508';
  const light = background?.light ?? '#090812';
  const animated = time === undefined;

  useEffect(() => {
    latestTheme.current = theme;
    shader.current?.setTheme(theme);
  }, [theme]);

  useEffect(() => {
    latestTime.current = time;
    if (time !== undefined) shader.current?.render(time);
  }, [time]);

  useEffect(() => {
    latestOnError.current = onError;
  }, [onError]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let handle: ShaderHandle | null = null;
    const controller = new AbortController();
    const options: ShaderOptions = {
      theme: latestTheme.current,
      background: { dark, light },
      autoplay: animated,
      signal: controller.signal,
      onError: (error) => {
        if (controller.signal.aborted) return;
        if (latestOnError.current) latestOnError.current(error);
        else console.error(error);
      },
    };

    try {
      handle = createShader(element, options);
      shader.current = handle;
      if (latestTime.current !== undefined) handle.render(latestTime.current);
    } catch (error) {
      options.onError?.(error instanceof Error ? error : new Error(String(error)));
    }

    return () => {
      controller.abort();
      handle?.destroy();
      shader.current = null;
    };
  }, [dark, light, animated]);

  return (
    <canvas
      ref={canvas}
      className={className}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        opacity,
        pointerEvents: 'none',
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

export default MioBackgroundShader;
