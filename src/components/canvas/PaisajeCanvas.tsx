import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { startGatedLoop } from '@/lib/renderGate';
import {
  applyPetMaterials,
  createPetMaterials,
  createStudioEnvironment,
  loadPetScene,
} from '@/components/pet/petKit';
import type { PetState } from '@/components/pet/petKit';
import {
  COL_D,
  END_SPOT,
  FLAT_KEEP,
  GAP,
  MONTH_NAMES,
  MONTH_STARTS,
  PROOF_BAR,
  PROOF_LEN,
  PROOF_PITCH,
  PROOF_X0,
  R0,
  TURN,
  angleOf,
  cameraKeys,
  colWidth,
  flatAt,
  forecastIn,
  heightOf,
  oddLit,
  polar,
  proofIn,
  ringOf,
  ringRadius,
  riseAt,
  sampleCamera,
  slotOf,
  smapeTerms,
  storyAt,
  turnToRange,
  walkToEnd,
  type DailySeries,
} from '@/lib/paisaje';
import postVert from '@/shaders/ditherPost.vert.glsl?raw';
import postFrag from '@/shaders/paisajePost.frag.glsl?raw';

/**
 * PaisajeCanvas — the benchmark's five years of daily sales as a place, printed.
 *
 * The scene: the page's own sheet of paper running to the horizon; on it a dial, one column per
 * real day (1.826), a year per ring, the months printed around it like the bezel of an instrument;
 * MIO at the centre; far ranges, bands of cloud, stars and a square sun (one enormous cell) behind
 * the end-of-year peak. The page scroll is the camera and it orbits.
 *
 * The look: the lit scene is rendered small and resolved through the brand's ordered dither onto
 * six inks from obsidian to the paper white, plus lime as the one spot colour (see
 * shaders/paisajePost.frag.glsl). Same language as the hero specimen, so MIO is the same MIO.
 *
 * Two variants share the world. "viaje" is the pinned flight: the method on real data, ending as
 * the proof (the camera cranes up, the columns lie down into a flat print and the four tests are
 * laid out in the middle of the dial, a segment per hidden day). "noche" is the closing shot: the
 * same dial at night, the moon in the gap between 31 December and 1 January, one lime cell where
 * tomorrow goes, and MIO strolling about the middle of the dial; it can be clicked.
 *
 * Budget: the 3D pass runs at one texel per 2 CSS px, one draw call for the field plus its shadow
 * pass, nothing allocated per frame, loop gated while off-screen. Column matrices are rewritten
 * only during the opening rise; caps and rods only while their beat is playing.
 */

/** CSS pixels per printed dot. */
const DOT = 2;
const DEG = Math.PI / 180;
const PET_SCALE = 3.6;

// Inks (sRGB), darkest to the paper. The top stop is the page background, exactly.
const RAMP = ['#0d0726', '#2a1670', '#4f2fc4', '#7647eb', '#b6a1ff', '#f3f3f5'];
const LIME = '#bdf559';
const PAPER = '#f3f3f5';
// The paper is lit above 1 so that it lands on the top stop with margin and only real shadow dips below.
const PAPER_GAIN = 2.6;
const HAZE = '#8f84c8';
// Seen from the opening height with north up, a cell is the page's 180 x 36 px cell.
const CELL_X = 10;
const CELL_Z = 2;
const LAND = 5200;

interface Props {
  data: DailySeries;
  /** Scroll progress 0..1, written by the section. */
  progress: React.MutableRefObject<number>;
  variant?: 'viaje' | 'noche';
  /** Night only: MIO was clicked. */
  onPetTap?: () => void;
  /** Night only: an element kept just above MIO's head (moved with one transform per frame). */
  petLabel?: React.RefObject<HTMLElement | null>;
  className?: string;
}

// What changes between the day of the flight and the night of the closing shot. Tone only.
const DAY = {
  fog: [HAZE, 170, 1150] as const,
  sky: ['#030208', '#0b0820', '#2b2556', '#5d568f', '#9089bd', '#c2bce0'],
  clouds: ['#e9e6f6', '#a9a2d2'],
  ranges: ['#1c1740', '#2f2a5c'],
  hemi: ['#e2deff', '#7b74b8', 0.85] as const,
  key: 3.4,
  fill: 0.55,
  paper: PAPER_GAIN,
};
const NIGHT = {
  fog: ['#141033', 110, 900] as const,
  sky: ['#020106', '#05041a', '#0d0a2b', '#1a1647', '#2a2563', '#39337a'],
  clouds: ['#4a4490', '#231e52'],
  ranges: ['#07051a', '#0e0b28'],
  hemi: ['#8f88d8', '#16123a', 0.42] as const,
  key: 2.3,
  fill: 0.5,
  paper: 0.4,
};

const smooth = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};
/** Deterministic 0..1 noise, for the sky. */
const rnd = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const srgb = (hex: string) => {
  const c = parseInt(hex.slice(1), 16);
  return new THREE.Vector3(((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255);
};

export const PaisajeCanvas: React.FC<Props> = ({ data, progress, variant = 'viaje', onPetTap, petLabel, className = '' }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const tapRef = useRef(onPetTap);
  tapRef.current = onPetTap;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    const night = variant === 'noche';
    const L = night ? NIGHT : DAY;
    const trash: { dispose: () => void }[] = [];
    const own = <T extends { dispose: () => void }>(o: T): T => {
      trash.push(o);
      return o;
    };

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false });
    } catch (err) {
      console.error('PaisajeCanvas: WebGL unavailable', err);
      return;
    }
    const bufW = () => Math.max(2, Math.round((host.clientWidth || 800) / DOT));
    const bufH = () => Math.max(2, Math.round((host.clientHeight || 600) / DOT));
    renderer.setPixelRatio(1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(bufW(), bufH(), false);
    const canvas = renderer.domElement;
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;image-rendering:pixelated;';
    host.appendChild(canvas);

    // ── Print pass ──────────────────────────────────────────────────────────────────────────
    const target = own(
      new THREE.WebGLRenderTarget(bufW(), bufH(), {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        type: THREE.HalfFloatType,
        depthBuffer: true,
      })
    );
    const postScene = new THREE.Scene();
    const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const postMat = own(
      new THREE.ShaderMaterial({
        vertexShader: postVert,
        fragmentShader: postFrag,
        uniforms: {
          tScene: { value: target.texture },
          uRamp: { value: RAMP.map(srgb) },
          uSpot: { value: srgb(LIME) },
          uExposure: { value: 1.0 },
        },
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      })
    );
    postScene.add(new THREE.Mesh(own(new THREE.PlaneGeometry(2, 2)), postMat));

    // ── World ───────────────────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(L.fog[0], L.fog[1], L.fog[2]);
    const envTarget = own(createStudioEnvironment(renderer));
    scene.environment = envTarget.texture;
    const camera = new THREE.PerspectiveCamera(34, (host.clientWidth || 800) / (host.clientHeight || 600), 0.5, 4000);

    const n = data.values.length;
    const max = data.values.reduce((a, b) => (b > a ? b : a), 0);
    const slots = data.values.map((_, i) => slotOf(data.first_day, i));
    const rows = slots[n - 1].row + 1;
    const keys = cameraKeys();
    const pt = { x: 0, z: 0 };

    // Sky: one painted dome. Deep at the zenith, haze at the horizon, long flat bands of cloud low
    // down and a scatter of stars above them. Everything here is tone; the print pass inks it.
    {
      const c = document.createElement('canvas');
      c.width = 2048;
      c.height = 1024;
      const g = c.getContext('2d')!;
      const horizon = 512;
      const sky = g.createLinearGradient(0, 0, 0, horizon);
      // Tone only (the print pass inks it): black overhead, three bands of haze toward the horizon.
      [0, 0.66, 0.8, 0.9, 0.96, 1].forEach((at, k) => sky.addColorStop(at, L.sky[k]));
      g.fillStyle = sky;
      g.fillRect(0, 0, 2048, horizon);
      g.fillStyle = L.sky[5];
      g.fillRect(0, horizon, 2048, 512);
      const elev = (deg: number) => horizon - (deg / 90) * horizon;
      // stars: more of them and brighter the higher they are
      for (let i = 0; i < 520; i++) {
        const e = 9 + rnd(i) * 70;
        const b = 0.55 + rnd(i + 0.31) * 0.45;
        const s = rnd(i + 0.77) > 0.86 ? 3 : 2;
        g.fillStyle = `rgba(255,255,255,${b.toFixed(2)})`;
        g.fillRect(Math.floor(rnd(i + 0.13) * 2048), Math.floor(elev(e)), s, s);
      }
      // clouds: flat bars, a few stacked into steps
      for (let i = 0; i < 26; i++) {
        const x = rnd(i + 5.1) * 2048;
        const w = 60 + rnd(i + 6.2) * 260;
        const e = 2.2 + rnd(i + 7.3) * 11;
        const h = 3 + Math.floor(rnd(i + 8.4) * 4);
        g.fillStyle = L.clouds[rnd(i + 9.5) > 0.5 ? 0 : 1];
        g.fillRect(x, elev(e), w, h);
        g.fillRect(x + w * 0.18, elev(e) - h, w * 0.5, h);
        if (x + w > 2048) g.fillRect(x - 2048, elev(e), w, h);
      }
      const tex = own(new THREE.CanvasTexture(c));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      const dome = new THREE.Mesh(
        own(new THREE.SphereGeometry(2600, 48, 32)),
        own(new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }))
      );
      dome.renderOrder = -2;
      scene.add(dome);
    }

    // The sun: one enormous cell, low in the north, right behind the end-of-year range. At night it
    // is the moon, and it hangs in the gap of the dial, where the next year will start.
    const sunDeg = night ? TURN : 4;
    {
      const size = night ? 190 : 250;
      const sunY = night ? 172 : 118;
      const sun = new THREE.Mesh(
        own(new THREE.PlaneGeometry(size, size)),
        own(new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false, depthWrite: false, toneMapped: false }))
      );
      polar(sunDeg, 1500, pt);
      sun.position.set(pt.x, sunY, pt.z);
      sun.lookAt(0, sunY, 0);
      sun.renderOrder = -1;
      scene.add(sun);
    }

    // Far ranges: two rings of blocks whose skyline is the series itself (fortnight averages), so
    // even the horizon is made of the data. The haze sets them back.
    {
      const blockGeo = own(new THREE.BoxGeometry(1, 1, 1));
      blockGeo.translate(0, 0.5, 0);
      const chunks = 110;
      const size = Math.floor(n / chunks);
      const avg: number[] = [];
      for (let k = 0; k < chunks; k++) {
        let s = 0;
        for (let j = 0; j < size; j++) s += data.values[k * size + j];
        avg.push(s / size / max);
      }
      const dummy = new THREE.Object3D();
      [
        { r: 620, lift: 70, tone: L.ranges[0], shift: 0 },
        { r: 900, lift: 118, tone: L.ranges[1], shift: 37 },
      ].forEach((ring) => {
        const mesh = own(new THREE.InstancedMesh(blockGeo, own(new THREE.MeshBasicMaterial({ color: ring.tone, toneMapped: false })), chunks));
        const w = ((2 * Math.PI * ring.r) / chunks) * 1.02;
        for (let k = 0; k < chunks; k++) {
          const deg = (k / chunks) * 360;
          polar(deg, ring.r, pt);
          const v = avg[(k + ring.shift) % chunks];
          dummy.position.set(pt.x, 0, pt.z);
          dummy.rotation.set(0, -deg * DEG, 0);
          dummy.scale.set(w, 14 + Math.pow(v, 1.6) * ring.lift, 60);
          dummy.updateMatrix();
          mesh.setMatrixAt(k, dummy.matrix);
        }
        mesh.frustumCulled = false;
        scene.add(mesh);
      });
    }

    // Light comes from the sun: low, from the north. The range is backlit and every column throws
    // a long shadow toward the middle of the dial.
    scene.add(new THREE.HemisphereLight(L.hemi[0], L.hemi[1], L.hemi[2]));
    const key = new THREE.DirectionalLight('#ffffff', L.key);
    polar(sunDeg + (night ? 0 : 11.5), 0.83, pt);
    const keyDir = new THREE.Vector3(pt.x, night ? 0.4 : 0.56, pt.z).normalize();
    key.position.copy(keyDir).multiplyScalar(260);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -86;
    key.shadow.camera.right = 86;
    key.shadow.camera.top = 86;
    key.shadow.camera.bottom = -86;
    key.shadow.camera.near = 60;
    key.shadow.camera.far = 480;
    key.shadow.bias = -0.0008;
    key.shadow.normalBias = 0.1;
    key.shadow.radius = 3;
    scene.add(key, key.target);
    const fill = new THREE.DirectionalLight('#d8d2ff', L.fill);
    fill.position.set(-0.3, 0.5, 0.8);
    scene.add(fill);

    // ── The paper ───────────────────────────────────────────────────────────────────────────
    // The page's own cells (2 x 10 units = 36 x 180 px seen from the opening height), to the horizon.
    const cellCanvas = document.createElement('canvas');
    cellCanvas.width = 320;
    cellCanvas.height = 64;
    {
      const g = cellCanvas.getContext('2d')!;
      g.fillStyle = PAPER;
      g.fillRect(0, 0, 320, 64);
      // Hairlines, dark enough to survive the paper's gain: in the print they come out as a faint
      // dotted rule, like the page's own cell lines.
      g.fillStyle = 'rgba(11,9,20,0.72)';
      g.fillRect(0, 0, 320, 1);
      g.fillRect(0, 0, 1, 64);
    }
    const cellTex = own(new THREE.CanvasTexture(cellCanvas));
    cellTex.colorSpace = THREE.SRGBColorSpace;
    cellTex.wrapS = cellTex.wrapT = THREE.RepeatWrapping;
    cellTex.repeat.set(LAND / CELL_X, LAND / CELL_Z);
    cellTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const paperTone = new THREE.Color(L.paper, L.paper, L.paper);
    const land = new THREE.Mesh(
      own(new THREE.PlaneGeometry(LAND, LAND)),
      own(new THREE.MeshStandardMaterial({ map: cellTex, color: paperTone, roughness: 0.96, metalness: 0, envMapIntensity: 0.1 }))
    );
    land.rotation.x = -Math.PI / 2;
    land.receiveShadow = true;
    scene.add(land);

    // The bezel, printed on the paper: a tick per day, a longer one per week, a line per month and
    // the rings the columns stand on.
    const DIAL = 196;
    const dc = document.createElement('canvas');
    dc.width = dc.height = 2048;
    {
      const g = dc.getContext('2d')!;
      const u = dc.width / DIAL;
      const cx = dc.width / 2;
      const outer = ringRadius(rows - 1) + COL_D / 2;
      g.strokeStyle = '#0b0914';
      const ray = (deg: number, r1: number, r2: number, width: number) => {
        const a = deg * DEG;
        g.lineWidth = width;
        g.beginPath();
        g.moveTo(cx + Math.sin(a) * r1 * u, cx - Math.cos(a) * r1 * u);
        g.lineTo(cx + Math.sin(a) * r2 * u, cx - Math.cos(a) * r2 * u);
        g.stroke();
      };
      const span = 360 - GAP;
      for (let d = 0; d <= 365; d++) {
        const deg = TURN + GAP / 2 + (span * d) / 365;
        if (MONTH_STARTS.includes(d) || d === 365) ray(deg, R0 - 9.5, outer + 2.2, 3);
        else if (d % 7 === 0) ray(deg, R0 - 4.4, R0 - 2.2, 2);
        else ray(deg, R0 - 3.3, R0 - 2.2, 1);
      }
      const arc = (r: number, width: number) => {
        g.lineWidth = width;
        g.beginPath();
        g.arc(cx, cx, r * u, (TURN + GAP / 2 - 90) * DEG, (TURN + GAP / 2 + span - 90) * DEG);
        g.stroke();
      };
      arc(R0 - 2.2, 3);
      arc(outer + 2.2, 2);
      // where MIO stands
      g.lineWidth = 2;
      g.beginPath();
      g.arc(cx, cx, 7.5 * u, 0, Math.PI * 2);
      g.stroke();
      for (let k = 0; k < 4; k++) ray(k * 90, 7.5, 10, 2);
    }
    const dialTex = own(new THREE.CanvasTexture(dc));
    dialTex.colorSpace = THREE.SRGBColorSpace;
    dialTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const dial = new THREE.Mesh(
      own(new THREE.PlaneGeometry(DIAL, DIAL)),
      own(new THREE.MeshBasicMaterial({ map: dialTex, transparent: true, depthWrite: false, toneMapped: false }))
    );
    dial.rotation.x = -Math.PI / 2;
    dial.position.y = 0.04;
    scene.add(dial);

    // Lettering: one small texture per word, printed on the paper facing the middle of the dial.
    const plates: { paint: () => void }[] = [];
    const basis = new THREE.Matrix4();
    const tangent = new THREE.Vector3();
    const radial = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const plate = (text: string, w: number, h: number, deg: number, r: number) => {
      const c = document.createElement('canvas');
      c.width = 384;
      c.height = Math.round((384 * h) / w);
      const tex = own(new THREE.CanvasTexture(c));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const paint = () => {
        const g = c.getContext('2d')!;
        g.clearRect(0, 0, c.width, c.height);
        g.fillStyle = '#0b0914';
        g.font = `700 ${Math.round(c.height * 0.86)}px "JetBrains Mono", ui-monospace, monospace`;
        g.textBaseline = 'middle';
        g.textAlign = 'center';
        g.fillText(text, c.width / 2, c.height / 2 + 2, c.width - 6);
        tex.needsUpdate = true;
      };
      paint();
      plates.push({ paint });
      const mesh = new THREE.Mesh(
        own(new THREE.PlaneGeometry(w, h)),
        own(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }))
      );
      // Read from the centre looking out: the text runs clockwise, its top points outward.
      const a = deg * DEG;
      tangent.set(Math.cos(a), 0, Math.sin(a));
      radial.set(Math.sin(a), 0, -Math.cos(a));
      mesh.quaternion.setFromRotationMatrix(basis.makeBasis(tangent, radial, up));
      polar(deg, r, pt);
      mesh.position.set(pt.x, 0.06, pt.z);
      scene.add(mesh);
    };
    const span = 360 - GAP;
    MONTH_NAMES.forEach((name, k) => {
      const from = TURN + GAP / 2 + (span * MONTH_STARTS[k]) / 365;
      const to = TURN + GAP / 2 + (span * (k < 11 ? MONTH_STARTS[k + 1] : 365)) / 365;
      plate(name, 7.4, 2.7, (from + to) / 2, R0 - 7);
    });
    for (let row = 0; row < rows; row++) plate(String(slots[0].year + row), 4.6, 1.9, TURN, ringRadius(ringOf(row, rows)));
    // The label face loads late on a cold visit: repaint once it is there.
    document.fonts?.load('700 40px "JetBrains Mono"').then(() => {
      if (!disposed) plates.forEach((p) => p.paint());
    });

    // ── The field: one column per day ────────────────────────────────────────────────────────
    const colGeo = own(new THREE.BoxGeometry(1, 1, 1));
    colGeo.translate(0, 0.5, 0);
    // Baked occlusion: the foot of every column is darker than its top.
    {
      const pos = colGeo.attributes.position;
      const shade = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        const v = 0.45 + 0.55 * pos.getY(i);
        shade[i * 3] = shade[i * 3 + 1] = shade[i * 3 + 2] = v;
      }
      colGeo.setAttribute('color', new THREE.BufferAttribute(shade, 3));
    }
    const colMat = own(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0, envMapIntensity: 0.25 }));
    const field = own(new THREE.InstancedMesh(colGeo, colMat, n));
    field.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    field.frustumCulled = false;
    field.castShadow = true;
    field.receiveShadow = true;
    scene.add(field);

    const heights = new Float32Array(n);
    const degs = new Float32Array(n);
    const radii = new Float32Array(n);
    const widths = new Float32Array(n);
    // Tone, not hue: low days are inked darker, high days lighter, so the relief reads in the print.
    const low = new THREE.Color('#5a5498');
    const high = new THREE.Color('#f4f1ff');
    const base: THREE.Color[] = [];
    // Lying flat it is a printed chart, and a chart reads the other way round: more ink, more sales.
    const heat: THREE.Color[] = [];
    // (The faint end is above 1 for the same reason the paper is: it has to survive the lighting.)
    const faint = new THREE.Color().setRGB(0.98, 0.9, 1.3);
    const dense = new THREE.Color().setRGB(0.02, 0.01, 0.1);
    for (let i = 0; i < n; i++) {
      const s = slots[i];
      const ring = ringOf(s.row, rows);
      heights[i] = heightOf(data.values[i], max);
      degs[i] = angleOf(s.doy, s.daysInYear);
      radii[i] = ringRadius(ring);
      widths[i] = colWidth(ring);
      const c = low.clone().lerp(high, Math.pow(data.values[i] / max, 0.8));
      base.push(c);
      heat.push(faint.clone().lerp(dense, data.values[i] / max));
      field.setColorAt(i, c);
    }

    const dummy = new THREE.Object3D();
    const place = (deg: number, r: number, y: number, sx: number, sy: number, sz: number) => {
      polar(deg, r, pt);
      dummy.position.set(pt.x, y, pt.z);
      dummy.rotation.set(0, -deg * DEG, 0);
      dummy.scale.set(sx, Math.max(0.0001, sy), sz);
      dummy.updateMatrix();
    };
    const writeColumn = (i: number, grow: number) => {
      // A column that has not started to rise waits under the paper (a zero-height box would smear on it).
      place(degs[i], radii[i], grow > 0.001 ? 0 : -4, widths[i], heights[i] * grow, COL_D);
      field.setMatrixAt(i, dummy.matrix);
    };
    for (let i = 0; i < n; i++) writeColumn(i, 0);

    // Odd days light up clockwise, ring by ring. An odd day is marked on its roof (a lime cap), so
    // lime stays a spark and the field keeps its own tone underneath.
    const odd = [...data.odd_days].sort((a, b) => degs[a] - degs[b] || radii[a] - radii[b]);
    const oddState = new Float32Array(odd.length).fill(-1);
    const caps = own(new THREE.InstancedMesh(colGeo, own(new THREE.MeshBasicMaterial({ color: LIME, toneMapped: false })), odd.length));
    caps.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    caps.frustumCulled = false;
    for (let k = 0; k < odd.length; k++) {
      place(0, 0, -6, 0.0001, 0.0001, 0.0001);
      caps.setMatrixAt(k, dummy.matrix);
    }
    scene.add(caps);

    // ── The last 14 days: a rod per prediction, standing in front of what actually happened ─
    const bt = data.backtest;
    const h14 = bt.mio.length;
    const rodMio = own(new THREE.InstancedMesh(colGeo, own(new THREE.MeshBasicMaterial({ color: LIME, toneMapped: false })), h14));
    const rodNaive = own(new THREE.InstancedMesh(colGeo, own(new THREE.MeshStandardMaterial({ color: '#56507f', roughness: 0.7 })), h14));
    rodMio.frustumCulled = rodNaive.frustumCulled = false;
    rodMio.castShadow = rodNaive.castShadow = true;
    scene.add(rodMio, rodNaive);
    // What actually happened in those 14 days: the same columns, in the paper white.
    const actual = own(new THREE.InstancedMesh(colGeo, own(new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false })), h14));
    actual.frustumCulled = false;
    scene.add(actual);
    const rodR = R0 - COL_D / 2 - 0.95;
    const rodOff = (0.21 / rodR) / DEG;
    const writeRods = (t: number, squash: number) => {
      for (let j = 0; j < h14; j++) {
        const i = bt.from_index + j;
        const grow = smooth(t * 1.6 - (j / h14) * 0.6) * squash;
        // Side by side in front of the day: lime is MIO, grey is "repeat last week".
        place(degs[i] - rodOff, rodR, 0, 0.34, heightOf(bt.mio[j], max) * grow, 0.5);
        rodMio.setMatrixAt(j, dummy.matrix);
        place(degs[i] + rodOff, rodR, 0, 0.34, heightOf(bt.naive[j], max) * grow, 0.5);
        rodNaive.setMatrixAt(j, dummy.matrix);
        // The white fills its column from the foot up, in step with the rods.
        place(degs[i], radii[i], grow > 0.001 ? 0 : -6, widths[i] * 1.04, heights[i] * 1.004 * grow, COL_D * 1.04);
        actual.setMatrixAt(j, dummy.matrix);
      }
      actual.instanceMatrix.needsUpdate = true;
      rodMio.instanceMatrix.needsUpdate = true;
      rodNaive.instanceMatrix.needsUpdate = true;
    };
    writeRods(0, 1);

    // ── The proof: the four tests, laid out in the middle of the dial ────────────────────────
    // A row per test, oldest at the top. In each row a lime bar (MIO) over a dark one ("repeat last
    // week"); every bar is fourteen segments, one per hidden day, as long as that day's error. So a
    // bar's length is the test's sMAPE and nothing is drawn that the benchmark did not measure.
    const folds = data.folds?.length ? data.folds : [bt];
    const perFold = folds[0].mio.length;
    const segN = folds.length * perFold;
    const segMio = own(new THREE.InstancedMesh(colGeo, own(new THREE.MeshBasicMaterial({ color: LIME, toneMapped: false })), segN));
    const segNaive = own(new THREE.InstancedMesh(colGeo, own(new THREE.MeshBasicMaterial({ color: '#170f3f', toneMapped: false })), segN));
    segMio.frustumCulled = segNaive.frustumCulled = false;
    segMio.visible = segNaive.visible = false;
    scene.add(segMio, segNaive);
    // [start, length] of every segment along its bar, in world units.
    const segPos = { mio: new Float32Array(segN * 2), naive: new Float32Array(segN * 2) };
    {
      const worst = folds.reduce((m, f) => Math.max(m, f.mio_smape, f.naive_smape), 0.0001);
      const unit = PROOF_LEN / (worst * perFold);
      folds.forEach((f, k) => {
        const actual = data.values.slice(f.from_index, f.from_index + perFold);
        (['mio', 'naive'] as const).forEach((who) => {
          let run = 0;
          smapeTerms(actual, f[who]).forEach((term, j) => {
            segPos[who][(k * perFold + j) * 2] = run;
            segPos[who][(k * perFold + j) * 2 + 1] = term * unit;
            run += term * unit;
          });
        });
      });
    }
    const writeProof = (t: number) => {
      const on = t > 0;
      segMio.visible = segNaive.visible = on;
      if (!on) return;
      for (let s = 0; s < segN; s++) {
        const k = Math.floor(s / perFold);
        const zc = (k - (folds.length - 1) / 2) * PROOF_PITCH;
        // The days tick in one after another, test by test.
        const v = Math.min(1, Math.max(0, t * (segN + 6) - s));
        (['mio', 'naive'] as const).forEach((who) => {
          const start = segPos[who][s * 2];
          const len = segPos[who][s * 2 + 1];
          const w = Math.max(len - 0.16, len * 0.5) * v;
          dummy.position.set(PROOF_X0 + start + w / 2, v > 0 ? 0.05 : -6, zc + (who === 'mio' ? -0.56 : 0.56) * PROOF_BAR);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(Math.max(0.0001, w), 0.5, PROOF_BAR);
          dummy.updateMatrix();
          (who === 'mio' ? segMio : segNaive).setMatrixAt(s, dummy.matrix);
        });
      }
      segMio.instanceMatrix.needsUpdate = true;
      segNaive.instanceMatrix.needsUpdate = true;
    };

    // ── Tomorrow (night only): the one lime cell of the scene, in the gap where the dial goes on ─
    if (night) {
      const tomorrow = new THREE.Mesh(colGeo, own(new THREE.MeshBasicMaterial({ color: LIME, toneMapped: false })));
      place(TURN, R0, 0.03, 3.4, 0.3, COL_D);
      tomorrow.position.copy(dummy.position);
      tomorrow.rotation.copy(dummy.rotation);
      tomorrow.scale.copy(dummy.scale);
      scene.add(tomorrow);
    }

    // ── MIO, at the centre of the dial ───────────────────────────────────────────────────────
    const mats = own(createPetMaterials('violeta'));
    const pet = new THREE.Group();
    const holder = new THREE.Group();
    pet.add(holder);
    pet.scale.setScalar(PET_SCALE);
    pet.visible = false;
    scene.add(pet);
    let petState: PetState | null = null;
    let token = 0;
    const setPet = async (next: PetState) => {
      if (next === petState) return;
      petState = next;
      const mine = ++token;
      try {
        const model = await loadPetScene(next, 'violeta');
        if (disposed || mine !== token) return;
        applyPetMaterials(model, next, mats);
        holder.clear();
        holder.add(model);
        pet.visible = true;
      } catch (err) {
        console.error('PaisajeCanvas: pet failed to load', err);
      }
    };
    void setPet('reposo');
    (['anomalia', 'trabajando', 'celebrando'] as PetState[]).forEach((s) => loadPetScene(s, 'violeta').catch(() => undefined));
    const endSpot = polar(END_SPOT.deg, END_SPOT.r, { x: 0, z: 0 });
    const rangeDeg = angleOf(334);

    // The closing shot keeps its subject (the gap, the moon, MIO) in the right half: the copy is on the left.
    const frameShot = () => {
      if (!night) return;
      const w = bufW();
      const h = bufH();
      camera.setViewOffset(w, h, -Math.round(w * 0.2), 0, w, h);
    };
    frameShot();

    // ── Resize ───────────────────────────────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(bufW(), bufH(), false);
      target.setSize(bufW(), bufH());
      camera.aspect = w / h;
      // Narrow screens need a wider lens to keep the dial in frame.
      camera.fov = w / h < 1.2 ? 46 : 34;
      frameShot();
      camera.updateProjectionMatrix();
    });
    ro.observe(host);

    const pointer = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX / window.innerWidth - 0.5;
      pointer.y = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    // Night: MIO can be clicked. One ray against a sphere around it; nothing else in the scene is a target.
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const body = new THREE.Sphere(new THREE.Vector3(), PET_SCALE * 1.05);
    const hits = (e: PointerEvent | MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, 1 - ((e.clientY - r.top) / r.height) * 2);
      ray.setFromCamera(ndc, camera);
      body.center.set(pet.position.x, PET_SCALE * 0.85, pet.position.z);
      return ray.ray.intersectsSphere(body);
    };
    const onHover = (e: PointerEvent) => {
      canvas.style.cursor = hits(e) ? 'pointer' : '';
    };
    const onTap = (e: MouseEvent) => {
      if (!hits(e)) return;
      cheer = 1.6;
      tapRef.current?.();
    };
    if (night) {
      canvas.addEventListener('pointermove', onHover, { passive: true });
      canvas.addEventListener('click', onTap);
    }

    // ── Frame ────────────────────────────────────────────────────────────────────────────────
    const cam = [0, 0, 0, 0, 0, 0];
    const look = new THREE.Vector3();
    let p = progress.current;
    let lastRise = -1;
    let lastFlat = -1;
    let lastRods = -1;
    let lastProof = -1;
    const tint = new THREE.Color();
    // Night: MIO strolls between a few spots on the right of the line from the centre to the gap
    // (the copy is on the left), stops at each one for a while, and can be clicked.
    const stroll = [
      [15, 16],
      [5, 44],
      [30, 24],
      [35, 9],
      [-8, 30],
    ].map(([a, r]) => polar(TURN + a, r, { x: 0, z: 0 }));
    const gapSpot = polar(TURN, R0, { x: 0, z: 0 });
    let from = 0;
    let to = 0;
    let leg = 1;
    let rest = 2.4;
    let cheer = 0;
    let lastLabel = '';
    const spot = { x: stroll[0].x, z: stroll[0].z };
    const head = new THREE.Vector3();
    const lamp = new THREE.PointLight('#cfc6ff', night ? 70 : 0, 30, 2);
    if (night) scene.add(lamp);
    let px = 0;
    let py = 0;
    let yaw = 0;

    const frame = (dt: number, elapsed: number) => {
      // Inertia: the camera trails the scroll a little, so a fast flick still reads as a flight.
      p += (progress.current - p) * (1 - Math.exp(-dt * 4.5));
      const q = storyAt(p);

      // 1. The dial rises out of the paper while the camera comes up: a wave that runs clockwise
      //    from January, tied to the scroll (so it also sinks back if you scroll up).
      //    At the end they lie down again, into a flat print, and take the chart's inks.
      const rise = night ? 1 : riseAt(p);
      const flat = night ? 0 : flatAt(p);
      const squash = 1 - (1 - FLAT_KEEP) * flat;
      const flatChanged = flat !== lastFlat;
      if (rise !== lastRise || flatChanged) {
        lastRise = rise;
        for (let i = 0; i < n; i++) {
          const s = slots[i];
          writeColumn(i, smooth(rise * 1.9 - (s.doy / 365) * 0.85 - ringOf(s.row, rows) * 0.02) * squash);
          if (flatChanged) field.setColorAt(i, tint.copy(base[i]).lerp(heat[i], flat));
        }
        field.instanceMatrix.needsUpdate = true;
        if (flatChanged && field.instanceColor) field.instanceColor.needsUpdate = true;
      }
      lastFlat = flat;

      // 2. The odd days: a cap drops onto each roof, with a small overshoot. In the finale the 14
      //    hidden days hand their cap over to the rods.
      const lit = night ? 0 : oddLit(p) * odd.length;
      const f = night ? 0 : forecastIn(p);
      let touched = false;
      for (let k = 0; k < odd.length; k++) {
        const i = odd[k];
        const v = Math.min(1, Math.max(0, lit - k));
        const keep = i >= bt.from_index ? 1 - f : 1;
        const sig = v * keep;
        if (sig === oddState[k] && !flatChanged) continue;
        oddState[k] = sig;
        const pop = v <= 0 ? 0 : 1 + Math.sin(v * Math.PI) * 0.5;
        place(degs[i], radii[i], heights[i] * squash, widths[i] * 1.12 * sig, 0.42 * pop * sig, COL_D * 1.05 * sig);
        if (sig <= 0) dummy.position.y = -6;
        dummy.updateMatrix();
        caps.setMatrixAt(k, dummy.matrix);
        touched = true;
      }
      if (touched) caps.instanceMatrix.needsUpdate = true;

      // 3. The prediction rods; the 14 hidden days turn white so "what happened" is unmistakable.
      if (f !== lastRods || flatChanged) {
        lastRods = f;
        writeRods(f, squash);
      }
      const proof = night ? 0 : proofIn(p);
      if (proof !== lastProof) {
        lastProof = proof;
        writeProof(proof);
      }

      // 4. Camera.
      px += (pointer.x - px) * (1 - Math.exp(-dt * 3));
      py += (pointer.y - py) * (1 - Math.exp(-dt * 3));
      if (night) {
        // One held shot from behind the centre toward the gap; the scroll only dollies it in a little.
        polar(TURN, -42 + p * 16, pt);
        camera.position.set(pt.x + px * 1.8, 7.6 - p * 1.2 - py * 0.8, pt.z);
        polar(TURN, R0, pt);
        look.set(pt.x, 11, pt.z);
        camera.lookAt(look);
        // The stroll: rest, then walk to the next spot with small hops.
        let hopN = 0;
        let heading = 0;
        if (leg >= 1) {
          rest -= dt;
          if (rest <= 0) {
            from = to;
            to = (to + 1) % stroll.length;
            leg = 0;
          }
        } else {
          const a = stroll[from];
          const b = stroll[to];
          const dist = Math.hypot(b.x - a.x, b.z - a.z);
          leg = Math.min(1, leg + (dt * 4.2) / dist);
          const e = smooth(leg);
          spot.x = a.x + (b.x - a.x) * e;
          spot.z = a.z + (b.z - a.z) * e;
          hopN = Math.abs(Math.sin(leg * Math.PI * Math.max(2, Math.round(dist / 3.2)))) * 0.5;
          heading = Math.atan2(b.x - a.x, b.z - a.z);
          if (leg >= 1) rest = 2.6 + rnd(to + elapsed) * 2.2;
        }
        cheer = Math.max(0, cheer - dt);
        if (cheer > 0) hopN = Math.max(hopN, Math.abs(Math.sin(cheer * 9)) * 0.6);
        void setPet(cheer > 0 ? 'celebrando' : 'reposo');
        pet.position.set(spot.x, Math.sin(elapsed * 1.4) * 0.05 + hopN, spot.z);
        // Walking it faces where it goes; standing, its body is toward the gap and its screen toward the reader.
        const toGap = Math.atan2(gapSpot.x - spot.x, gapSpot.z - spot.z);
        const toCam = Math.atan2(camera.position.x - spot.x, camera.position.z - spot.z);
        let d = toGap - toCam;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        const want = leg < 1 && cheer <= 0 ? heading : toCam + d * (cheer > 0 ? 0 : 0.36) + px * 0.4;
        let dy = want - yaw;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        yaw += dy * (1 - Math.exp(-dt * 6));
        pet.rotation.y = yaw;
        const breathN = 1 + Math.sin(elapsed * 1.9) * 0.012;
        pet.scale.set(PET_SCALE, PET_SCALE * breathN, PET_SCALE);
        // Its own small light, a little toward the camera, so it never turns into a silhouette.
        lamp.position.set(spot.x + Math.sin(toCam) * 5, 7, spot.z + Math.cos(toCam) * 5);
        // Whatever the section hangs over its head follows it.
        const label = petLabel?.current;
        if (label) {
          head.set(spot.x, PET_SCALE * 1.95 + hopN, spot.z).project(camera);
          const t = `translate3d(${((head.x * 0.5 + 0.5) * host.clientWidth).toFixed(1)}px,${((0.5 - head.y * 0.5) * host.clientHeight).toFixed(1)}px,0)`;
          if (t !== lastLabel) {
            lastLabel = t;
            label.style.transform = t;
          }
        }
        renderer.setRenderTarget(target);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
        renderer.render(postScene, postCamera);
        return;
      }
      sampleCamera(keys, p, cam);
      camera.position.set(cam[0] + px * 1.4, cam[1] - py * 0.8, cam[2]);
      look.set(cam[3], cam[4], cam[5]);
      camera.lookAt(look);

      // 5. MIO: faces the visitor, turns to the range when the camera goes under it, then walks to
      //    the last fortnight and celebrates.
      const walk = walkToEnd(p);
      const mx = endSpot.x * walk;
      const mz = endSpot.z * walk;
      const walking = walk > 0.02 && walk < 0.98;
      const done = f > 0.6;
      void setPet(done ? 'celebrando' : walking ? 'trabajando' : q > 0.56 && q < 0.69 ? 'anomalia' : 'reposo');
      const hop = walking ? Math.abs(Math.sin(walk * Math.PI * 7)) * 0.5 : done ? Math.abs(Math.sin(elapsed * 6.5)) * 0.45 : 0;
      pet.position.set(mx, Math.sin(elapsed * 1.4) * 0.05 + hop, mz);
      const toCam = Math.atan2(camera.position.x - mx, camera.position.z - mz);
      polar(rangeDeg, R0, pt);
      const toRange = Math.atan2(pt.x - mx, pt.z - mz);
      const turn = turnToRange(p);
      // shortest way round between the two headings
      let d = toRange - toCam;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      const want = toCam + d * turn;
      let dy = want - yaw;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      yaw += dy * (1 - Math.exp(-dt * 8));
      pet.rotation.y = yaw;
      const breath = 1 + Math.sin(elapsed * 1.9) * 0.012;
      const grown = smooth(rise * 3);
      pet.scale.set(PET_SCALE * grown, PET_SCALE * breath * grown, PET_SCALE * grown);

      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(postScene, postCamera);
    };
    const stop = startGatedLoop(host, frame);

    // Dev only: lets a test harness play the scene forward, grab the frame and probe a pixel.
    if (import.meta.env.DEV) {
      let t = 100;
      const w = window as unknown as Record<string, unknown>;
      w[night ? '__nocheShot' : '__paisajeShot'] = (steps = 90) => {
        for (let k = 0; k < steps; k++) frame(0.05, (t += 0.05));
        return canvas.toDataURL('image/jpeg', 0.95);
      };
      if (!night) {
        w.__paisajePixel = (fx: number, fy: number) => {
          frame(0.016, (t += 0.016));
          const gl = renderer.getContext();
          const out = new Uint8Array(4);
          gl.readPixels(Math.round(gl.drawingBufferWidth * fx), Math.round(gl.drawingBufferHeight * (1 - fy)), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, out);
          return [out[0], out[1], out[2]];
        };
      }
    }

    return () => {
      disposed = true;
      stop();
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointermove', onHover);
      canvas.removeEventListener('click', onTap);
      trash.forEach((o) => o.dispose());
      renderer.dispose();
      if (host.contains(canvas)) host.removeChild(canvas);
    };
  }, [data, progress, variant, petLabel]);

  return <div ref={hostRef} className={className} aria-hidden={variant === 'noche' ? undefined : true} />;
};

export default PaisajeCanvas;
