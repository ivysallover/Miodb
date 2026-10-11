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
  COL_W,
  MONTH_NAMES,
  MONTH_STARTS,
  ROW_PITCH,
  cameraKeys,
  forecastIn,
  heightOf,
  oddLit,
  sampleCamera,
  slotOf,
  slotX,
  slotZ,
  type DailySeries,
} from '@/lib/paisaje';

/**
 * PaisajeCanvas — the benchmark's five years of daily sales as a place.
 *
 * A sheet of paper that runs to the horizon under a violet sky; out of it, one column per real day
 * (1.826 of them), the months printed on the paper as a ruler, the specimen in full PBR standing
 * on it, and a camera that the page scroll flies from the first of January to the last 14 days.
 * Unlike the hero's dithered stage this one is rendered clean: a low key light that rakes across
 * the field and throws real shadows on the paper, and haze where the land meets the sky.
 *
 * Budget: one draw call for the field (plus its shadow pass), DPR <= 1.5, ACES, nothing allocated
 * per frame, loop gated while off-screen. Column matrices are rewritten only during the opening
 * rise; caps and rods only while their beat is playing.
 */

const SKY_TOP = '#0f0636';
const HORIZON = '#4a35c8';
const PAPER = '#e4e0f3';
const INK = '#0b0914';
const VIOLET = '#7647eb';
const LOW = '#2a1a7a';
const HIGH = '#9c82ff';
const LIME = '#bdf559';
const NAIVE = '#8d86ad';
const WHITE = '#fbfaff';
const PET_SCALE = 3;

interface Props {
  data: DailySeries;
  /** Scroll progress 0..1, written by the section. */
  progress: React.MutableRefObject<number>;
  className?: string;
}

const smooth = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

export const PaisajeCanvas: React.FC<Props> = ({ data, progress, className = '' }) => {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    const trash: { dispose: () => void }[] = [];
    const own = <T extends { dispose: () => void }>(o: T): T => {
      trash.push(o);
      return o;
    };

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', stencil: false });
    } catch (err) {
      console.error('PaisajeCanvas: WebGL unavailable', err);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(host.clientWidth || 800, host.clientHeight || 600, false);
    const canvas = renderer.domElement;
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    host.appendChild(canvas);

    // ── World ───────────────────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(SKY_TOP);
    scene.fog = new THREE.Fog(HORIZON, 90, 520);
    const envTarget = own(createStudioEnvironment(renderer));
    scene.environment = envTarget.texture;

    const camera = new THREE.PerspectiveCamera(34, (host.clientWidth || 800) / (host.clientHeight || 600), 0.5, 2400);

    const n = data.values.length;
    const max = data.values.reduce((a, b) => (b > a ? b : a), 0);
    const slots = data.values.map((_, i) => slotOf(data.first_day, i));
    const rows = slots[n - 1].row + 1;
    const zc = ((rows - 1) * ROW_PITCH) / 2;
    const zFront = (rows - 1) * ROW_PITCH;
    const keys = cameraKeys(rows);

    // Sky: a dome, deep at the zenith and lit where it meets the land. The fog is the horizon's
    // own colour, so the paper and the far end of the field dissolve into it instead of ending.
    {
      const geo = own(new THREE.SphereGeometry(1800, 32, 24));
      const pos = geo.attributes.position;
      const col = new Float32Array(pos.count * 3);
      const top = new THREE.Color(SKY_TOP);
      const hor = new THREE.Color(HORIZON);
      const c = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        const e = Math.max(0, pos.getY(i) / 1800); // 0 at the horizon, 1 overhead
        c.copy(hor).lerp(top, Math.pow(Math.min(1, e * 2.6), 0.62));
        col[i * 3] = c.r;
        col[i * 3 + 1] = c.g;
        col[i * 3 + 2] = c.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const mat = own(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }));
      const dome = new THREE.Mesh(geo, mat);
      dome.position.set(180, -4, zc);
      dome.renderOrder = -1;
      scene.add(dome);
    }

    // Light: a low, warm key rakes across the field so top, front and side read as three tones,
    // and every column throws a shadow on the paper and on its neighbours.
    scene.add(new THREE.HemisphereLight('#b9adff', '#3a2a8c', 0.95));
    const key = new THREE.DirectionalLight('#fff1dc', 2.5);
    // From behind and to the left: the shadows fall forward, onto the paper in front of the field.
    const keyDir = new THREE.Vector3(-0.6, 0.6, -0.52).normalize();
    key.target.position.set(172, 0, zc);
    key.position.copy(key.target.position).addScaledVector(keyDir, 260);
    key.castShadow = true;
    // The field is a long strip: turn the shadow camera so its long side lies along the year and
    // give that side most of the texels.
    key.shadow.camera.up.set(1, 0, 0);
    key.shadow.mapSize.set(1024, 4096);
    key.shadow.camera.left = -46;
    key.shadow.camera.right = 46;
    key.shadow.camera.top = 226;
    key.shadow.camera.bottom = -226;
    key.shadow.camera.near = 40;
    key.shadow.camera.far = 520;
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.08;
    key.shadow.radius = 4;
    scene.add(key, key.target);
    // Fill from the camera's side, so the faces turned to the visitor keep their colour.
    const fill = new THREE.DirectionalLight('#cfc4ff', 1.0);
    fill.position.set(0.35, 0.5, 0.8);
    scene.add(fill);

    // ── The paper ───────────────────────────────────────────────────────────────────────────
    // Lines only (weeks, months, the lanes between years); the lettering is laid on top as its
    // own crisp plates, so it stays sharp when the camera comes down to it.
    const G_X0 = -80;
    const G_W = 540;
    const G_D = 110;
    const gZ0 = zc - G_D / 2;
    const gc = document.createElement('canvas');
    gc.width = 4096;
    gc.height = Math.round((4096 * G_D) / G_W);
    {
      const g = gc.getContext('2d')!;
      const ux = (x: number) => ((x - G_X0) / G_W) * gc.width;
      const uz = (z: number) => ((z - gZ0) / G_D) * gc.height;
      g.fillStyle = PAPER;
      g.fillRect(0, 0, gc.width, gc.height);
      const zA = uz(-COL_D);
      const zB = uz(zFront + COL_D + 7);
      g.fillStyle = 'rgba(11,9,20,0.09)';
      for (let d = 0; d <= 364; d += 7) g.fillRect(Math.round(ux(d - 0.5)), zA, 1, zB - zA);
      for (let r = 0; r <= rows; r++) g.fillRect(ux(-1), Math.round(uz(r * ROW_PITCH - ROW_PITCH / 2)), ux(366) - ux(-1), 1);
      g.fillStyle = 'rgba(11,9,20,0.42)';
      for (const m of [...MONTH_STARTS, 365]) g.fillRect(Math.round(ux(m - 0.5)) - 1, zA - 14, 3, zB - zA + 28);
      // a tick per week on the front edge, like a ruler
      for (let d = 0; d <= 364; d += 7) g.fillRect(Math.round(ux(d - 0.5)), uz(zFront + COL_D / 2 + 2.3), 2, 14);
    }
    const paperTex = own(new THREE.CanvasTexture(gc));
    paperTex.colorSpace = THREE.SRGBColorSpace;
    paperTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const sheet = new THREE.Mesh(
      own(new THREE.PlaneGeometry(G_W, G_D)),
      own(new THREE.MeshStandardMaterial({ map: paperTex, roughness: 0.94, metalness: 0, envMapIntensity: 0.12 }))
    );
    sheet.rotation.x = -Math.PI / 2;
    sheet.position.set(G_X0 + G_W / 2, 0.02, zc);
    sheet.receiveShadow = true;
    scene.add(sheet);
    // Beyond the printed part the paper is still a sheet: faint cells all the way to the horizon.
    const cellCanvas = document.createElement('canvas');
    cellCanvas.width = 256;
    cellCanvas.height = 128;
    {
      const g = cellCanvas.getContext('2d')!;
      g.fillStyle = PAPER;
      g.fillRect(0, 0, 256, 128);
      g.fillStyle = 'rgba(11,9,20,0.17)';
      g.fillRect(0, 0, 256, 3);
      g.fillRect(0, 0, 3, 128);
    }
    const cellTex = own(new THREE.CanvasTexture(cellCanvas));
    cellTex.colorSpace = THREE.SRGBColorSpace;
    cellTex.wrapS = cellTex.wrapT = THREE.RepeatWrapping;
    cellTex.repeat.set(4200 / 14, 3200 / 7);
    cellTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const land = new THREE.Mesh(
      own(new THREE.PlaneGeometry(4200, 3200)),
      own(new THREE.MeshStandardMaterial({ map: cellTex, roughness: 0.96, metalness: 0, envMapIntensity: 0.1 }))
    );
    land.receiveShadow = true;
    land.rotation.x = -Math.PI / 2;
    land.position.set(180, 0, zc);
    scene.add(land);

    // Lettering: one small texture per word, printed on the paper.
    const plates: { paint: () => void }[] = [];
    const plate = (text: string, color: string, w: number, h: number, x: number, z: number) => {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = Math.round((512 * h) / w);
      const tex = own(new THREE.CanvasTexture(c));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const paint = () => {
        const g = c.getContext('2d')!;
        g.clearRect(0, 0, c.width, c.height);
        g.fillStyle = color;
        g.font = `700 ${Math.round(c.height * 0.82)}px "JetBrains Mono", ui-monospace, monospace`;
        g.textBaseline = 'middle';
        g.fillText(text, 4, c.height / 2 + 2, c.width - 8);
        tex.needsUpdate = true;
      };
      paint();
      plates.push({ paint });
      const mesh = new THREE.Mesh(
        own(new THREE.PlaneGeometry(w, h)),
        own(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }))
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x + w / 2, 0.05, z);
      scene.add(mesh);
    };
    MONTH_NAMES.forEach((name, k) => plate(name, INK, 6.4, 2.3, MONTH_STARTS[k] + 0.6, zFront + COL_D / 2 + 4.6));
    for (let r = 0; r < rows; r++) plate(String(slots[0].year + r), r === rows - 1 ? VIOLET : INK, 6.2, 2.1, -8.6, slotZ(r));
    // The label face loads late on a cold visit: repaint once it is there.
    document.fonts?.load('700 40px "JetBrains Mono"').then(() => {
      if (!disposed) plates.forEach((p) => p.paint());
    });

    // ── The field: one column per day ────────────────────────────────────────────────────────
    const colGeo = own(new THREE.BoxGeometry(COL_W, 1, COL_D));
    colGeo.translate(0, 0.5, 0);
    // Baked occlusion: the foot of every column is darker than its top.
    {
      const pos = colGeo.attributes.position;
      const shade = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        const v = 0.5 + 0.5 * pos.getY(i);
        shade[i * 3] = shade[i * 3 + 1] = shade[i * 3 + 2] = v;
      }
      colGeo.setAttribute('color', new THREE.BufferAttribute(shade, 3));
    }
    const colMat = own(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.52, metalness: 0.08, envMapIntensity: 0.4 }));
    const field = own(new THREE.InstancedMesh(colGeo, colMat, n));
    field.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    field.frustumCulled = false;
    field.castShadow = true;
    field.receiveShadow = true;
    scene.add(field);

    const heights = new Float32Array(n);
    const low = new THREE.Color(LOW);
    const high = new THREE.Color(HIGH);
    const white = new THREE.Color(WHITE);
    const base: THREE.Color[] = [];
    const tmp = new THREE.Color();
    for (let i = 0; i < n; i++) {
      heights[i] = heightOf(data.values[i], max);
      const c = low.clone().lerp(high, Math.pow(data.values[i] / max, 0.9));
      base.push(c);
      field.setColorAt(i, c);
    }

    const dummy = new THREE.Object3D();
    const hide = (mesh: THREE.InstancedMesh, count: number) => {
      dummy.position.set(0, -10, 0);
      dummy.scale.setScalar(0.0001);
      dummy.updateMatrix();
      for (let k = 0; k < count; k++) mesh.setMatrixAt(k, dummy.matrix);
      dummy.scale.setScalar(1);
    };
    const writeColumn = (i: number, grow: number) => {
      const s = slots[i];
      dummy.position.set(slotX(s.doy), 0, slotZ(s.row));
      dummy.scale.set(1, Math.max(0.0001, heights[i] * grow), 1);
      dummy.updateMatrix();
      field.setMatrixAt(i, dummy.matrix);
    };
    for (let i = 0; i < n; i++) writeColumn(i, 0);

    // Odd days light up in the order the camera meets them: along the year, then by row. An odd
    // day is marked on its roof (a thin lime cap), so lime stays a spark and the field keeps its
    // own colour underneath.
    const odd = [...data.odd_days].sort((a, b) => slots[a].doy - slots[b].doy || slots[a].row - slots[b].row);
    const oddState = new Float32Array(odd.length).fill(-1);
    const caps = own(
      new THREE.InstancedMesh(
        own(new THREE.BoxGeometry(COL_W * 1.08, 0.3, COL_D * 1.03)),
        own(new THREE.MeshStandardMaterial({ color: LIME, emissive: LIME, emissiveIntensity: 0.5, roughness: 0.35 })),
        odd.length
      )
    );
    caps.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    caps.frustumCulled = false;
    caps.castShadow = true;
    hide(caps, odd.length);
    scene.add(caps);

    // ── The last 14 days: a rod per prediction, standing in front of what actually happened ─
    const bt = data.backtest;
    const h14 = bt.mio.length;
    const rodGeo = own(new THREE.BoxGeometry(0.36, 1, 0.5));
    rodGeo.translate(0, 0.5, 0);
    const rodMio = own(new THREE.InstancedMesh(rodGeo, own(new THREE.MeshStandardMaterial({ color: LIME, emissive: LIME, emissiveIntensity: 0.4, roughness: 0.4 })), h14));
    const rodNaive = own(new THREE.InstancedMesh(rodGeo, own(new THREE.MeshStandardMaterial({ color: NAIVE, roughness: 0.6 })), h14));
    rodMio.frustumCulled = rodNaive.frustumCulled = false;
    rodMio.castShadow = rodNaive.castShadow = true;
    scene.add(rodMio, rodNaive);
    const writeRods = (t: number) => {
      for (let j = 0; j < h14; j++) {
        const s = slots[bt.from_index + j];
        const grow = smooth(t * 1.6 - (j / h14) * 0.6);
        // Side by side in front of the day: lime is MIO, grey is "repeat last week".
        dummy.position.set(slotX(s.doy) - 0.2, 0, slotZ(s.row) + COL_D / 2 + 0.7);
        dummy.scale.set(1, Math.max(0.0001, heightOf(bt.mio[j], max) * grow), 1);
        dummy.updateMatrix();
        rodMio.setMatrixAt(j, dummy.matrix);
        dummy.position.set(slotX(s.doy) + 0.2, 0, slotZ(s.row) + COL_D / 2 + 0.7);
        dummy.scale.set(1, Math.max(0.0001, heightOf(bt.naive[j], max) * grow), 1);
        dummy.updateMatrix();
        rodNaive.setMatrixAt(j, dummy.matrix);
      }
      rodMio.instanceMatrix.needsUpdate = true;
      rodNaive.instanceMatrix.needsUpdate = true;
    };
    writeRods(0);

    // ── MIO, in the landscape ────────────────────────────────────────────────────────────────
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
    loadPetScene('celebrando', 'violeta').catch(() => undefined);

    // Where MIO stands: in front of the five years at the start (three-quarters to the visitor, the
    // field behind him), at the edge of the data at the end.
    const START = { x: -27, z: zc + 15, yaw: -0.62 };
    const END = { x: 361.6, z: zFront + 9.5, yaw: -0.78 };

    // ── Resize ───────────────────────────────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // Narrow screens need a wider lens to keep the field in frame.
      camera.fov = w / h < 1.2 ? 46 : 34;
      camera.updateProjectionMatrix();
    });
    ro.observe(host);

    const pointer = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX / window.innerWidth - 0.5;
      pointer.y = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    // ── Frame ────────────────────────────────────────────────────────────────────────────────
    const cam = [0, 0, 0, 0, 0, 0];
    const look = new THREE.Vector3();
    let p = progress.current;
    let rise = 0;
    let risen = false;
    let lastRods = -1;
    let px = 0;
    let py = 0;

    const frame = (dt: number, elapsed: number) => {
      // Inertia: the camera trails the scroll a little, so a fast flick still reads as a flight.
      p += (progress.current - p) * (1 - Math.exp(-dt * 4.5));

      // 1. The field rises once, as a wave from January to December.
      if (!risen) {
        rise += dt / 2.4;
        for (let i = 0; i < n; i++) {
          const s = slots[i];
          writeColumn(i, smooth(rise * 1.9 - (s.doy / 365) * 0.85 - s.row * 0.03));
        }
        field.instanceMatrix.needsUpdate = true;
        if (rise >= 1) risen = true;
      }

      // 2. The odd days: a cap drops onto each roof, with a small overshoot.
      const lit = oddLit(p) * odd.length;
      const fNow = forecastIn(p);
      let touched = false;
      for (let k = 0; k < odd.length; k++) {
        const v = Math.min(1, Math.max(0, lit - k));
        const sig = odd[k] >= bt.from_index ? v - fNow : v;
        if (sig === oddState[k]) continue;
        oddState[k] = sig;
        const s = slots[odd[k]];
        const pop = v <= 0 ? 0 : 1 + Math.sin(v * Math.PI) * 0.4;
        // In the finale the 14 hidden days hand their cap over to the rods.
        const keep = odd[k] >= bt.from_index ? 1 - fNow : 1;
        dummy.position.set(slotX(s.doy), heights[odd[k]] + 0.15, slotZ(s.row));
        dummy.scale.set(Math.max(0.0001, v * keep), Math.max(0.0001, v * pop * keep), Math.max(0.0001, v * keep));
        dummy.updateMatrix();
        caps.setMatrixAt(k, dummy.matrix);
        touched = true;
      }
      if (touched) caps.instanceMatrix.needsUpdate = true;

      // 3. The prediction rods; the 14 hidden days turn white so "what happened" is unmistakable.
      const f = fNow;
      if (f !== lastRods) {
        lastRods = f;
        writeRods(f);
        for (let j = 0; j < h14; j++) {
          const i = bt.from_index + j;
          field.setColorAt(i, tmp.copy(base[i]).lerp(white, f));
        }
        if (field.instanceColor) field.instanceColor.needsUpdate = true;
      }

      // 4. MIO.
      const atEnd = p > 0.5;
      void setPet(atEnd ? 'celebrando' : 'reposo');
      const spot = atEnd ? END : START;
      const hop = atEnd && f > 0.6 ? Math.abs(Math.sin(elapsed * 6.5)) * 0.55 : 0;
      pet.position.set(spot.x, Math.sin(elapsed * 1.4) * 0.05 + hop, spot.z);
      pet.rotation.y = spot.yaw + px * 0.35;
      const breath = 1 + Math.sin(elapsed * 1.9) * 0.012;
      pet.scale.set(PET_SCALE, PET_SCALE * breath, PET_SCALE);

      // 5. Camera.
      sampleCamera(keys, p, cam);
      px += (pointer.x - px) * (1 - Math.exp(-dt * 3));
      py += (pointer.y - py) * (1 - Math.exp(-dt * 3));
      camera.position.set(cam[0] + px * 1.6, cam[1] - py * 0.9, cam[2]);
      look.set(cam[3], cam[4], cam[5]);
      camera.lookAt(look);

      renderer.render(scene, camera);
    };
    const stop = startGatedLoop(host, frame);

    // Dev only: lets a test harness play the scene forward and grab the frame.
    if (import.meta.env.DEV) {
      let t = 100;
      (window as unknown as { __paisajeShot?: (steps?: number) => string }).__paisajeShot = (steps = 90) => {
        for (let k = 0; k < steps; k++) frame(0.05, (t += 0.05));
        return canvas.toDataURL('image/jpeg', 0.86);
      };
    }

    return () => {
      disposed = true;
      stop();
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      trash.forEach((o) => o.dispose());
      renderer.dispose();
      if (host.contains(canvas)) host.removeChild(canvas);
    };
  }, [data, progress]);

  return <div ref={hostRef} className={className} aria-hidden="true" />;
};

export default PaisajeCanvas;
