import React, { useEffect, useRef, useState, useCallback } from 'react';
import quadVert from '@/shaders/mio/mio_quad.vert.glsl?raw';
import sceneFrag from '@/shaders/mio/mio_scene.frag.glsl?raw';
import blurFrag from '@/shaders/mio/mio_blur.frag.glsl?raw';
import compFrag from '@/shaders/mio/mio_compose.frag.glsl?raw';

export type RaymarcherMood = 'reposo' | 'trabajando' | 'celebrando' | 'anomalia' | 'durmiendo' | 'idle' | 'working' | 'celebrating' | 'anomaly' | 'sleeping';
export type RaymarcherMaterial = 'violeta' | 'titanio' | 'cromo_negro' | 'violet' | 'obsidiana';

export interface MioRaymarcherCanvasProps {
  mood?: RaymarcherMood;
  material?: RaymarcherMaterial;
  autoRotate?: boolean;
  interactive?: boolean;
  className?: string;
  onStats?: (stats: { fps: number; resolution: string; eyes: string; sigma: string }) => void;
}

const M_BODY = 0;
const M_DARK = 1;
const M_EMIT = 2;
const M_GLASS = 3;
const M_LIMEG = 4;
const M_FEET = 5;
const M_WHITE = 6;
const M_DIM = 7;
const M_VIOE = 8;

const MOOD_DATA: Record<string, { id: string; h: number[][] }> = {
  idle: { id: 'idle', h: [[2, 3, 2], [2, 3, 2]] },
  reposo: { id: 'idle', h: [[2, 3, 2], [2, 3, 2]] },
  working: { id: 'working', h: [[1, 2, 3], [3, 2, 1]] },
  trabajando: { id: 'working', h: [[1, 2, 3], [3, 2, 1]] },
  celebrating: { id: 'celebrating', h: [[2, 3, 4], [2, 3, 4]] },
  celebrando: { id: 'celebrating', h: [[2, 3, 4], [2, 3, 4]] },
  anomaly: { id: 'anomaly', h: [[2, 2, 2], [2, 2, 4]] },
  anomalia: { id: 'anomaly', h: [[2, 2, 2], [2, 2, 4]] },
  sleeping: { id: 'sleeping', h: [[1, 1, 1], [1, 1, 1]] },
  durmiendo: { id: 'sleeping', h: [[1, 1, 1], [1, 1, 1]] },
};

const BODIES = [
  { id: 'violet', body: [0.40, 0.20, 0.95], rough: 0.26, feet: [0.22, 0.13, 0.55] },
  { id: 'titanio', body: [0.70, 0.68, 0.66], rough: 0.32, feet: [0.36, 0.35, 0.35] },
  { id: 'obsidiana', body: [0.20, 0.20, 0.24], rough: 0.16, feet: [0.10, 0.10, 0.13] },
];

function normalizeMaterialId(mat: RaymarcherMaterial): string {
  if (mat === 'violeta' || mat === 'violet') return 'violet';
  if (mat === 'cromo_negro' || mat === 'obsidiana') return 'obsidiana';
  return 'titanio';
}

function buildScene(mood: string, hl: number[], hr: number[]) {
  const up = mood === 'celebrating';
  const P: number[][] = [];
  const arms = up ? [[-1, 3, 0, 7], [15, 3, 16, 7]] : [[-1, 11, 0, 14], [15, 11, 16, 14]];
  const hands = up ? [[-1, 3, 0, 4], [15, 3, 16, 4]] : [[-1, 13, 0, 14], [15, 13, 16, 14]];

  for (const a of arms) P.push([...a, -1.5, 1.5, 0.16, M_DARK]);
  for (const h of hands) P.push([...h, -1.5, 1.5, 0.16, mood !== 'sleeping' ? M_LIMEG : M_DIM]);

  P.push([7, 3, 8, 5, -0.5, 0.5, 0.1, M_DARK]);
  P.push([6, 0, 9, 3, -1.5, 1.5, 0.22, mood === 'anomaly' ? M_VIOE : mood === 'sleeping' ? M_DIM : M_LIMEG]);

  for (const f of [[3, 17, 6, 19], [9, 17, 12, 19]]) P.push([...f, -2, 2, 0.2, M_FEET]);
  P.push([2, 7, 13, 15, 1.4, 2.25, 0.05, M_GLASS]);

  const ecol = mood === 'sleeping' ? M_DIM : M_EMIT;
  for (let i = 0; i < 3; i++) P.push([3 + i + 0.04, 12 - hl[i], 4 + i - 0.04, 12, 2.2, 2.65, 0.07, ecol]);
  for (let i = 0; i < 3; i++) {
    const m = mood === 'anomaly' && i === 2 ? M_WHITE : ecol;
    P.push([9 + i + 0.04, 12 - hr[i], 10 + i - 0.04, 12, 2.2, 2.65, 0.07, m]);
  }

  const cell = (x0: number, y0: number, x1: number, y1: number) =>
    P.push([x0 + 0.04, y0 + 0.04, x1 - 0.04, y1 - 0.04, 2.2, 2.55, 0.06, ecol]);

  if (mood === 'idle') cell(6, 13, 9, 14);
  else if (mood === 'sleeping') cell(7, 13, 8, 14);
  else if (mood === 'working') {
    for (let i = 0; i < 6; i++) P.push([4.5 + i + 0.04, 13.04, 5.5 + i - 0.04, 13.96, 2.2, 2.55, 0.06, i < 3 ? M_EMIT : M_DARK]);
  } else if (mood === 'celebrating') {
    cell(5, 13, 6, 14);
    cell(9, 13, 10, 14);
    cell(6, 13.5, 9, 14.5);
  } else if (mood === 'anomaly') {
    for (let i = 0; i < 7; i++) {
      const y0 = i % 2 === 0 ? 13.5 : 13.0;
      cell(4 + i, y0, 5 + i, y0 + 1);
    }
  }

  for (let k = 0; k < 3; k++) P.push([3 + k + 0.1, 15.5, 3.5 + k, 16.5, 2.8, 3.06, 0.03, M_DARK]);
  P.push([11, 15.5, 12, 16.5, 2.85, 3.1, 0.05, mood === 'sleeping' ? M_DIM : M_EMIT]);

  const B0 = new Float32Array(40 * 4);
  const B1 = new Float32Array(40 * 4);
  P.forEach(([x0, y0, x1, y1, z0, z1, r, m], i) => {
    B0.set([(x0 + x1) / 2 - 7.5, 19 - (y0 + y1) / 2, (z0 + z1) / 2, r], i * 4);
    B1.set([(x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2, m], i * 4);
  });

  return { B0, B1, N: P.length };
}

const bx = (x0: number, y0: number, x1: number, y1: number, z0: number, z1: number, r: number) => [
  (x0 + x1) / 2 - 7.5,
  19 - (y0 + y1) / 2,
  (z0 + z1) / 2,
  r,
  (x1 - x0) / 2,
  (y1 - y0) / 2,
  (z1 - z0) / 2,
  0,
];

const BODY = [
  bx(1, 5, 14, 17, -3, 3, 0.28),
  bx(0, 6, 15, 16, -3, 3, 0.28),
  bx(2, 7, 13, 15, 2.1, 3.8, 0.14),
];

const BC = new Float32Array(12);
const BH = new Float32Array(12);
BODY.forEach((b, i) => {
  BC.set(b.slice(0, 4), i * 4);
  BH.set(b.slice(4, 8), i * 4);
});

function makeMats(kind: string) {
  const K = BODIES.find((b) => b.id === kind) || BODIES[0];
  const MA = new Float32Array(36);
  const MB = new Float32Array(36);
  const EM = new Float32Array(27);

  const set = (i: number, f0: number[], rough: number, metal: number, dif: number[]) => {
    MA.set([...f0, rough], i * 4);
    MB.set([metal, ...dif], i * 4);
  };

  set(M_BODY, K.body, K.rough, 1, [0, 0, 0]);
  set(M_DARK, [0.16, 0.16, 0.19], 0.24, 1, [0, 0, 0]);
  set(M_EMIT, [0.04, 0.04, 0.04], 0.35, 0, [0.45, 0.6, 0.15]);
  set(M_GLASS, [0.05, 0.05, 0.06], 0.06, 0, [0.004, 0.004, 0.008]);
  set(M_LIMEG, [0.05, 0.05, 0.05], 0.22, 0, [0.40, 0.62, 0.08]);
  set(M_FEET, K.feet, 0.36, 1, [0, 0, 0]);
  set(M_WHITE, [0.05, 0.05, 0.05], 0.3, 0, [0.85, 0.85, 0.83]);
  set(M_DIM, [0.04, 0.04, 0.04], 0.35, 0, [0.12, 0.16, 0.07]);
  set(M_VIOE, [0.05, 0.05, 0.05], 0.25, 0, [0.30, 0.12, 0.75]);

  EM.set([0.55, 1.05, 0.22], M_EMIT * 3);
  EM.set([0.30, 0.52, 0.10], M_LIMEG * 3);
  EM.set([1.0, 1.0, 0.97], M_WHITE * 3);
  EM.set([0.10, 0.14, 0.05], M_DIM * 3);
  EM.set([0.55, 0.22, 1.25], M_VIOE * 3);

  return { MA, MB, EM };
}

const TGT = [0, 9.4, 0];
const TAN = Math.tan((19.5 * Math.PI) / 360);
const HOME = { yaw: 30, elev: 9, dist: 86 };

const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: number[], b: number[]) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const nrm = (a: number[]) => {
  const l = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / l, a[1] / l, a[2] / l];
};

function camVecs(yaw: number, elev: number, dist: number) {
  const ya = (yaw * Math.PI) / 180;
  const el = (elev * Math.PI) / 180;
  const pos = [
    TGT[0] + dist * Math.sin(ya) * Math.cos(el),
    TGT[1] + dist * Math.sin(el),
    TGT[2] + dist * Math.cos(ya) * Math.cos(el),
  ];
  const fwd = nrm(sub(TGT, pos));
  const rgt = nrm(cross(fwd, [0, 1, 0]));
  const up = cross(rgt, fwd);
  return { pos, fwd, rgt, up };
}

export const MioRaymarcherCanvas: React.FC<MioRaymarcherCanvasProps> = ({
  mood = 'reposo',
  material = 'violeta',
  autoRotate = false,
  interactive = true,
  className = '',
  onStats,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const moodKeyRef = useRef(MOOD_DATA[mood] || MOOD_DATA.reposo);
  moodKeyRef.current = MOOD_DATA[mood] || MOOD_DATA.reposo;

  const matKeyRef = useRef(normalizeMaterialId(material));
  matKeyRef.current = normalizeMaterialId(material);

  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;

  const interactiveRef = useRef(interactive);
  interactiveRef.current = interactive;

  const bumpRef = useRef<() => void>(() => {});

  useEffect(() => {
    bumpRef.current();
  }, [mood, material, autoRotate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = containerRef.current;
    if (!canvas || !stage) return;

    let isDisposed = false;
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });

    if (!gl) {
      setErrorMsg('ESTE NAVEGADOR NO SOPORTA WEBGL2');
      return;
    }

    const floatOK = gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float');
    if (!floatOK) {
      setErrorMsg('TU GPU NO PERMITE RENDER A TEXTURAS FLOTANTES');
      return;
    }

    const par = gl.getExtension('KHR_parallel_shader_compile');

    function sh(type: number, src: string) {
      const s = gl!.createShader(type)!;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      return s;
    }

    function prog(fs: string) {
      const p = gl!.createProgram()!;
      gl!.attachShader(p, sh(gl!.VERTEX_SHADER, quadVert));
      gl!.attachShader(p, sh(gl!.FRAGMENT_SHADER, fs));
      gl!.linkProgram(p);
      return p;
    }

    const pScene = prog(sceneFrag);
    const pBlur = prog(blurFrag);
    const pComp = prog(compFrag);

    const U = (p: WebGLProgram, n: string) => gl.getUniformLocation(p, n);

    let L: any = null;

    function ready() {
      for (const p of [pScene, pBlur, pComp]) {
        if (!gl!.getProgramParameter(p, gl!.LINK_STATUS)) {
          setErrorMsg('ERROR DE SHADER: ' + (gl!.getProgramInfoLog(p) || '').slice(0, 300));
          return;
        }
      }
      L = {
        s: {
          res: U(pScene, 'uRes'),
          cam: U(pScene, 'uCam'),
          fwd: U(pScene, 'uFwd'),
          rgt: U(pScene, 'uRgt'),
          up: U(pScene, 'uUp'),
          tan: U(pScene, 'uTan'),
          n: U(pScene, 'uN'),
          b0: U(pScene, 'uB0[0]'),
          b1: U(pScene, 'uB1[0]'),
          bc: U(pScene, 'uBC[0]'),
          bh: U(pScene, 'uBH[0]'),
          ma: U(pScene, 'uMA[0]'),
          mb: U(pScene, 'uMB[0]'),
          em: U(pScene, 'uEm[0]'),
        },
        b: {
          tex: U(pBlur, 'uTex'),
          dir: U(pBlur, 'uDir'),
          sig: U(pBlur, 'uSigma'),
        },
        c: {
          col: U(pComp, 'uCol'),
          big: U(pComp, 'uBig'),
          small: U(pComp, 'uSmall'),
          floor: U(pComp, 'uFloor'),
        },
      };
      bump();
    }

    (function wait() {
      if (isDisposed) return;
      if (par && !gl.getProgramParameter(pScene, par.COMPLETION_STATUS_KHR)) {
        requestAnimationFrame(wait);
        return;
      }
      ready();
    })();

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    let W = 0,
      H = 0,
      T: any = {},
      F: any = {};

    function mkTex(w: number, h: number) {
      const t = gl!.createTexture()!;
      gl!.bindTexture(gl!.TEXTURE_2D, t);
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA16F, w, h, 0, gl!.RGBA, gl!.HALF_FLOAT, null);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.NEAREST);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.NEAREST);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
      return t;
    }

    function mkFbo(texs: WebGLTexture[]) {
      const f = gl!.createFramebuffer()!;
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, f);
      texs.forEach((t, i) => gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0 + i, gl!.TEXTURE_2D, t, 0));
      return f;
    }

    function alloc(w: number, h: number) {
      for (const k in T) gl!.deleteTexture(T[k]);
      for (const k in F) gl!.deleteFramebuffer(F[k]);
      T = {
        col: mkTex(w, h),
        em: mkTex(w, h),
        floor: mkTex(w, h),
        tmp: mkTex(w, h),
        big: mkTex(w, h),
        small: mkTex(w, h),
      };
      F = {
        main: mkFbo([T.col, T.em, T.floor]),
        tmp: mkFbo([T.tmp]),
        big: mkFbo([T.big]),
        small: mkFbo([T.small]),
      };
      W = w;
      H = h;
    }

    function fit(scale: number) {
      if (!stage) return;
      const r = stage.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      let w = r.width * dpr * scale;
      let h = r.height * dpr * scale;
      const cap = 2.6e6;
      const px = w * h;
      if (px > cap) {
        const k = Math.sqrt(cap / px);
        w *= k;
        h *= k;
      }
      w = Math.max(64, Math.round(w));
      h = Math.max(64, Math.round(h));
      if (w !== W || h !== H) {
        alloc(w, h);
        canvas!.width = w;
        canvas!.height = h;
      }
    }

    let cur = moodKeyRef.current.h.map((a) => a.slice());
    let cam = { ...HOME };
    let dragging = false;
    let lastInt = 0;
    let moveScale = 1.0;
    let raf = 0;
    let lastT = 0;
    let ema = 16;

    function stepAnim(dt: number) {
      let moving = false;
      const tgt = moodKeyRef.current.h;
      const k = 1 - Math.exp(-dt * 11);
      for (let e = 0; e < 2; e++) {
        for (let i = 0; i < 3; i++) {
          const d = tgt[e][i] - cur[e][i];
          if (Math.abs(d) > 0.004) {
            cur[e][i] += d * k;
            moving = true;
          } else {
            cur[e][i] = tgt[e][i];
          }
        }
      }
      return moving;
    }

    function draw(scale: number, timed: boolean) {
      if (!L || isDisposed) return;
      fit(scale);

      const mats = makeMats(matKeyRef.current);
      const sc = buildScene(moodKeyRef.current.id, cur[0], cur[1]);
      const cv = camVecs(cam.yaw, cam.elev, cam.dist);
      const t0 = performance.now();

      gl!.bindVertexArray(vao);
      gl!.disable(gl!.DEPTH_TEST);
      gl!.disable(gl!.BLEND);

      // 1) Escena Raymarching
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, F.main);
      gl!.drawBuffers([gl!.COLOR_ATTACHMENT0, gl!.COLOR_ATTACHMENT1, gl!.COLOR_ATTACHMENT2]);
      gl!.viewport(0, 0, W, H);
      gl!.useProgram(pScene);

      gl!.uniform2f(L.s.res, W, H);
      gl!.uniform3fv(L.s.cam, cv.pos);
      gl!.uniform3fv(L.s.fwd, cv.fwd);
      gl!.uniform3fv(L.s.rgt, cv.rgt);
      gl!.uniform3fv(L.s.up, cv.up);
      gl!.uniform1f(L.s.tan, TAN);
      gl!.uniform1i(L.s.n, sc.N);

      gl!.uniform4fv(L.s.b0, sc.B0);
      gl!.uniform4fv(L.s.b1, sc.B1);
      gl!.uniform4fv(L.s.bc, BC);
      gl!.uniform4fv(L.s.bh, BH);

      gl!.uniform4fv(L.s.ma, mats.MA);
      gl!.uniform4fv(L.s.mb, mats.MB);
      gl!.uniform3fv(L.s.em, mats.EM);

      gl!.drawArrays(gl!.TRIANGLES, 0, 3);

      // 2) Bloom: Blur separable de la emisión
      gl!.useProgram(pBlur);
      gl!.uniform1i(L.b.tex, 0);
      gl!.activeTexture(gl!.TEXTURE0);

      const pass = (src: WebGLTexture, dst: WebGLFramebuffer, dx: number, dy: number, sig: number) => {
        gl!.bindFramebuffer(gl!.FRAMEBUFFER, dst);
        gl!.drawBuffers([gl!.COLOR_ATTACHMENT0]);
        gl!.bindTexture(gl!.TEXTURE_2D, src);
        gl!.uniform2f(L.b.dir, dx, dy);
        gl!.uniform1f(L.b.sig, sig);
        gl!.drawArrays(gl!.TRIANGLES, 0, 3);
      };

      const sB = 0.005625 * H;
      const sS = 0.001875 * H;
      pass(T.em, F.tmp, 1, 0, sB);
      pass(T.tmp, F.big, 0, 1, sB);
      pass(T.em, F.tmp, 1, 0, sS);
      pass(T.tmp, F.small, 0, 1, sS);

      // 3) Composición con ACES Tone Mapping
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
      gl!.viewport(0, 0, W, H);
      gl!.useProgram(pComp);

      const bind = (u: WebGLUniformLocation, t: WebGLTexture, i: number) => {
        gl!.activeTexture(gl!.TEXTURE0 + i);
        gl!.bindTexture(gl!.TEXTURE_2D, t);
        gl!.uniform1i(u, i);
      };

      bind(L.c.col, T.col, 0);
      bind(L.c.big, T.big, 1);
      bind(L.c.small, T.small, 2);
      bind(L.c.floor, T.floor, 3);

      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
      gl!.activeTexture(gl!.TEXTURE0);

      if (timed) {
        gl!.finish();
      }

      if (onStats) {
        const a = [...cur[0], ...cur[1]].map((v) => Math.round(v));
        const m = a.reduce((s, v) => s + v, 0) / 6;
        const sd = Math.sqrt(a.reduce((s, v) => s + (v - m) * (v - m), 0) / 6);
        onStats({
          fps: Math.round(1000 / Math.max(ema, 1)),
          resolution: `${W}×${H}`,
          eyes: `[${a.slice(0, 3).join(',')}] [${a.slice(3).join(',')}]`,
          sigma: sd.toFixed(2),
        });
      }
    }

    function frame(t: number) {
      if (isDisposed) return;
      raf = 0;
      const dt = Math.min(0.1, (t - lastT) / 1000 || 0.016);
      lastT = t;

      const anim = stepAnim(dt);
      if (autoRotateRef.current) {
        cam.yaw += dt * 16;
      }

      const active = dragging || anim || autoRotateRef.current || performance.now() - lastInt < 160;

      if (active) {
        ema = ema * 0.9 + dt * 1000 * 0.1;
        // Keep 1.0 native crispness at all times without blurry downscaling
        draw(1.0, false);
        bump(true);
      } else {
        draw(1.0, true);
      }
    }

    function bump(keep?: boolean) {
      if (!keep) lastInt = performance.now();
      if (!raf) raf = requestAnimationFrame(frame);
    }
    bumpRef.current = bump;

    // Pointer events for orbit interaction
    let px = 0;
    let py = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (!interactiveRef.current) return;
      dragging = true;
      px = e.clientX;
      py = e.clientY;
      stage.setPointerCapture(e.pointerId);
      bump();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging || !interactiveRef.current) return;
      cam.yaw -= (e.clientX - px) * 0.35;
      cam.elev = Math.min(60, Math.max(1, cam.elev + (e.clientY - py) * 0.25));
      px = e.clientX;
      py = e.clientY;
      bump();
    };

    const onPointerUp = (e: PointerEvent) => {
      dragging = false;
      try {
        stage.releasePointerCapture(e.pointerId);
      } catch {}
      bump();
    };

    const onWheel = (e: WheelEvent) => {
      if (!interactiveRef.current) return;
      e.preventDefault();
      cam.dist = Math.min(140, Math.max(55, cam.dist * (1 + e.deltaY * 0.001)));
      bump();
    };

    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerup', onPointerUp);
    stage.addEventListener('pointercancel', onPointerUp);
    stage.addEventListener('wheel', onWheel, { passive: false });

    const resizeObserver = new ResizeObserver(() => bump());
    resizeObserver.observe(stage);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();

      stage.removeEventListener('pointerdown', onPointerDown);
      stage.removeEventListener('pointermove', onPointerMove);
      stage.removeEventListener('pointerup', onPointerUp);
      stage.removeEventListener('pointercancel', onPointerUp);
      stage.removeEventListener('wheel', onWheel);

      for (const k in T) gl!.deleteTexture(T[k]);
      for (const k in F) gl!.deleteFramebuffer(F[k]);
      gl!.deleteProgram(pScene);
      gl!.deleteProgram(pBlur);
      gl!.deleteProgram(pComp);
      gl!.deleteVertexArray(vao);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative cursor-grab active:cursor-grabbing select-none overflow-hidden touch-none bg-[#F6F6F2] ${className}`}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
      {errorMsg && (
        <div className="absolute inset-0 flex items-center justify-center p-6 bg-[#F6F6F2] text-[#0E0C19] font-mono text-xs text-center uppercase tracking-wider">
          {errorMsg}
        </div>
      )}
    </div>
  );
};

export default MioRaymarcherCanvas;
