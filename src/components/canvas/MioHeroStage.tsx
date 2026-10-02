import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useMioStore } from '@/utils/useMioStore';
import { startGatedLoop } from '@/lib/renderGate';
import {
  PET_STATE_META,
  applyPetMaterials,
  createPetMaterials,
  createStudioEnvironment,
  loadPetScene,
} from '@/components/pet/petKit';
import type { PetMaterial, PetState } from '@/components/pet/petKit';

/**
 * MioHeroStage — hero scene for MIO Espécimen 01.
 *
 * Replaces the old torus-knot dither ring with a living stage:
 *  - the real 3D pet (GLB, brand PBR materials, studio reflections) that looks at
 *    the cursor, breathes, blinks (eye bars) and swaps mood WITHOUT rebuilding
 *    the renderer;
 *  - a halftone "dither pad" of hard square cells under it (square, not round —
 *    same visual language as the large-square grid) that ripples on events;
 *  - data cubes orbiting the specimen, tinted by the current mood color.
 *
 * Mood logic (BRANDING.md §5.A):
 *  reposo      default
 *  trabajando  while the page is scrolling
 *  celebrando  on click of the pet (+ shockwave through the pad)
 *  anomalia    when the cursor is shaken violently
 *  durmiendo   after ~28 s without any interaction
 *
 * Performance: one renderer, DPR capped at 1.5, no post-processing, no HDR download,
 * loop paused when off-screen / tab hidden (renderGate), nothing allocated per frame.
 *
 * Layout contract: the parent positions/sizes this component (pass `absolute …` +
 * width/height in className). The canvas is pointer-events:none so it never blocks
 * the UI under it; click/hover are resolved with a raycast against window events.
 */

// ── Tunables ────────────────────────────────────────────────────────────────
// Framing math (model bbox from the GLBs: 1.7w x 1.9h x 0.61d, feet at y=0):
// FOV 17° at distance 8.9 → ~2.66 world units visible vertically, centered on y=1.0
// → covers y∈[-0.33, 2.33] (pet + float + celebration jump). Canvas is ~1:1, so the
// visible half-width is ~1.33: pad edge (1.3) and cube orbits (≤1.35) stay inside.
const CAM_DIST = 8.9;
const CAM_TARGET_Y = 1.0;
const CAM_AZIMUTH = 22; // degrees
const CAM_ELEVATION = 14; // degrees
const PET_BASE_YAW = 0.28; // radians, pet faces slightly toward the viewer
const SLEEP_AFTER_S = 28;

const GRID = 11;
const CELL = 0.24;
const HALF = (GRID - 1) / 2;
const PAD_EDGE = HALF * CELL + 0.1;

const ORBIT_COUNT = 9;

const STATE_MOTION: Record<PetState, { orbit: number; wave: number }> = {
  reposo: { orbit: 1, wave: 0.02 },
  trabajando: { orbit: 2.8, wave: 0.06 },
  celebrando: { orbit: 1.8, wave: 0.09 },
  anomalia: { orbit: 1.4, wave: 0.03 },
  durmiendo: { orbit: 0.22, wave: 0.008 },
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

interface MioHeroStageProps {
  className?: string;
  material?: PetMaterial;
}

export const MioHeroStage: React.FC<MioHeroStageProps> = ({ className = '', material = 'violeta' }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const isDark = useMioStore((s) => s.theme) === 'dark';
  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;
  const [hudState, setHudState] = useState<PetState>('reposo');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const motion = reduceMotion ? 0.25 : 1;
    const nowS = () => performance.now() / 1000;

    // ── Renderer ────────────────────────────────────────────────────────────
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        stencil: false,
      });
    } catch (err) {
      console.error('MioHeroStage: WebGL unavailable', err);
      return;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap; // harder edge: neo-brutal, no blur
    renderer.setSize(host.clientWidth || 320, host.clientHeight || 380, false);
    const canvasEl = renderer.domElement;
    canvasEl.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    host.appendChild(canvasEl);

    // ── Scene, camera, environment ──────────────────────────────────────────
    const scene = new THREE.Scene();
    const envTarget = createStudioEnvironment(renderer);
    scene.environment = envTarget.texture;

    const camera = new THREE.PerspectiveCamera(
      17,
      (host.clientWidth || 320) / (host.clientHeight || 380),
      0.1,
      60
    );
    const placeCamera = (azimDeg: number, elevDeg: number, offX: number, offY: number) => {
      const az = THREE.MathUtils.degToRad(azimDeg);
      const el = THREE.MathUtils.degToRad(elevDeg);
      camera.position.set(
        CAM_DIST * Math.cos(el) * Math.sin(az) + offX,
        CAM_TARGET_Y + CAM_DIST * Math.sin(el) + offY,
        CAM_DIST * Math.cos(el) * Math.cos(az)
      );
      camera.lookAt(0, CAM_TARGET_Y, 0);
    };
    placeCamera(CAM_AZIMUTH, CAM_ELEVATION, 0, 0);

    // ── Lights (same studio rig as <Mio />, tuned for a transparent canvas) ─
    const lightTarget = new THREE.Object3D();
    lightTarget.position.set(0, CAM_TARGET_Y, 0);
    scene.add(lightTarget);

    const keyLight = new THREE.DirectionalLight('#FFF8F2', 2.2);
    keyLight.position.set(-5.5, 4.0, 3.8);
    keyLight.target = lightTarget;
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -2.4;
    keyLight.shadow.camera.right = 2.4;
    keyLight.shadow.camera.top = 2.4;
    keyLight.shadow.camera.bottom = -2.4;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 16;
    keyLight.shadow.bias = -0.0003;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight('#3A4058', 0.45);
    fillLight.position.set(5.5, 2.0, 2.0);
    scene.add(fillLight);
    const topLight = new THREE.DirectionalLight('#EDF2FC', 0.42);
    topLight.position.set(0, 8.0, 0.8);
    scene.add(topLight);
    const rimLight = new THREE.DirectionalLight('#A0B0CE', 0.45);
    rimLight.position.set(1.8, 3.2, -4.5);
    scene.add(rimLight);
    scene.add(new THREE.AmbientLight('#FFFFFF', 0.85));

    // ── Dither pad: square halftone cells that ripple ───────────────────────
    const padGeo = new THREE.BoxGeometry(1, 1, 1);
    const padMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    const pad = new THREE.InstancedMesh(padGeo, padMat, GRID * GRID);
    pad.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    pad.frustumCulled = false;
    const cells: { x: number; z: number; d: number; cheb: number }[] = [];
    const seedColor = new THREE.Color();
    for (let iz = 0; iz < GRID; iz++) {
      for (let ix = 0; ix < GRID; ix++) {
        const x = (ix - HALF) * CELL;
        const z = (iz - HALF) * CELL;
        cells.push({ x, z, d: Math.hypot(x, z), cheb: Math.max(Math.abs(x), Math.abs(z)) });
        pad.setColorAt(iz * GRID + ix, seedColor);
      }
    }
    scene.add(pad);

    // Shadow catcher sits just above the cells so the pet's hard shadow reads on them.
    const shadowGeo = new THREE.PlaneGeometry(8, 8);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.32, color: new THREE.Color('#100C1E') });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.03;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // ── Orbiting data cubes ─────────────────────────────────────────────────
    const cubeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const cubeMat = new THREE.MeshBasicMaterial({ color: 0xbdf559, toneMapped: false });
    const cubes = new THREE.InstancedMesh(cubeGeo, cubeMat, ORBIT_COUNT);
    cubes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    cubes.frustumCulled = false;
    scene.add(cubes);
    const orbits = Array.from({ length: ORBIT_COUNT }, (_, i) => ({
      r: 0.92 + (i % 3) * 0.11 + (i % 2) * 0.04,
      y: 0.35 + ((i * 0.19) % 1.7),
      speed: (0.32 + (i % 4) * 0.13) * (i % 2 === 0 ? 1 : -1),
      angle: (i / ORBIT_COUNT) * Math.PI * 2,
      size: 0.7 + (i % 3) * 0.3,
    }));

    // ── Pet ─────────────────────────────────────────────────────────────────
    const mats = createPetMaterials(material);
    const petGroup = new THREE.Group();
    const holder = new THREE.Group();
    petGroup.add(holder);
    petGroup.visible = false;
    scene.add(petGroup);

    let currentState: PetState = 'reposo';
    let swapToken = 0;
    let modelReady = false;
    let introT = 0;
    let popT = 1;
    let eyes: THREE.Object3D[] = [];
    const shock = { t: 1 };

    const swapTo = async (next: PetState, initial = false) => {
      if (!initial && next === currentState) return;
      currentState = next;
      const token = ++swapToken;
      if (!initial) setHudState(next);
      try {
        const model = await loadPetScene(next, material);
        if (disposed || token !== swapToken) return;
        eyes = applyPetMaterials(model, next, mats);
        holder.clear();
        holder.add(model);
        if (!modelReady) {
          modelReady = true;
          petGroup.visible = true;
          if (reduceMotion) introT = 1;
        } else {
          popT = 0;
        }
        if (next === 'celebrando') shock.t = 0;
      } catch (err) {
        console.error(`MioHeroStage: failed to load "${next}" model`, err);
      }
    };
    void swapTo('reposo', true);

    // Warm the other moods once the first frame is on screen.
    const preload = () => {
      (['trabajando', 'celebrando', 'anomalia', 'durmiendo'] as PetState[]).forEach((s) => {
        loadPetScene(s, material).catch(() => undefined);
      });
    };
    const idleHandle =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(preload, { timeout: 3000 })
        : window.setTimeout(preload, 1500);

    // ── Interaction state ───────────────────────────────────────────────────
    const pointer = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5, seen: false, lastT: 0 };
    let shakeScore = 0;
    let lastActivity = nowS();
    let workingUntil = 0;
    let override: { state: PetState; until: number } | null = null;
    let lastScrollY = window.scrollY;
    let hoveringPet = false;
    let frameCount = 0;

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const pointerOverPet = (): boolean => {
      if (!pointer.seen || !modelReady) return false;
      const rect = host.getBoundingClientRect();
      if (
        pointer.x < rect.left ||
        pointer.x > rect.right ||
        pointer.y < rect.top ||
        pointer.y > rect.bottom
      ) {
        return false;
      }
      ndc.set(
        ((pointer.x - rect.left) / rect.width) * 2 - 1,
        -((pointer.y - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);
      return raycaster.intersectObject(holder, true).length > 0;
    };

    const setCursor = (pointing: boolean) => {
      if (pointing === hoveringPet) return;
      hoveringPet = pointing;
      document.body.style.cursor = pointing ? 'pointer' : '';
    };

    const onPointerMove = (e: PointerEvent) => {
      const t = nowS();
      if (pointer.seen && !reduceMotion) {
        const dtMs = Math.max(1, (t - pointer.lastT) * 1000);
        const speed = (Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y) / dtMs) * 1000;
        shakeScore = speed > 2600 ? shakeScore + 1 : Math.max(0, shakeScore - 0.15);
        if (shakeScore > 12) {
          shakeScore = 0;
          override = { state: 'anomalia', until: t + 1.6 };
        }
      }
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.lastT = t;
      pointer.seen = true;
      lastActivity = t;
    };

    const onPointerDown = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.seen = true;
      const t = nowS();
      lastActivity = t;
      if (pointerOverPet()) {
        override = { state: 'celebrando', until: t + 2.2 };
        shock.t = 0;
      }
    };

    const onScroll = () => {
      const y = window.scrollY;
      const delta = Math.abs(y - lastScrollY);
      lastScrollY = y;
      if (delta > 3) {
        const t = nowS();
        workingUntil = t + 0.7;
        lastActivity = t;
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    // ── Resize ──────────────────────────────────────────────────────────────
    const resizeObserver = new ResizeObserver(() => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(host);

    // ── Frame loop (gated) ──────────────────────────────────────────────────
    const dummy = new THREE.Object3D();
    const stateColor = new THREE.Color(PET_STATE_META.reposo.color);
    const targetColor = new THREE.Color();
    const baseLight = new THREE.Color('#602cd1');
    const baseDark = new THREE.Color('#7647eb');
    const cellColor = new THREE.Color();
    let orbitMul = 1;
    let waveAmp = STATE_MOTION.reposo.wave;
    let lookX = 0;
    let lookY = 0;
    let nextBlink = 3;
    let blinkUntil = 0;
    let burst = 0;

    const frame = (dt: number, elapsed: number) => {
      frameCount++;
      const t = nowS();

      // 1. Desired mood
      let desired: PetState = 'reposo';
      if (override && t < override.until) desired = override.state;
      else if (t - lastActivity > SLEEP_AFTER_S) desired = 'durmiendo';
      else if (t < workingUntil) desired = 'trabajando';
      if (desired !== currentState) void swapTo(desired);

      // 2. Smoothed scalars
      const k = 1 - Math.exp(-dt * 6);
      const mo = STATE_MOTION[currentState];
      orbitMul += (mo.orbit * motion - orbitMul) * k;
      waveAmp += (mo.wave * motion - waveAmp) * k;
      targetColor.set(PET_STATE_META[currentState].color);
      stateColor.lerp(targetColor, k);
      burst += ((currentState === 'celebrando' ? 1 : 0) - burst) * (1 - Math.exp(-dt * 4));

      // 3. Cursor look (relative to the pet, not the screen center)
      const rect = host.getBoundingClientRect();
      let nx = 0.3;
      let ny = 0;
      if (pointer.seen) {
        const cx = rect.left + rect.width * 0.5;
        const cy = rect.top + rect.height * 0.45;
        nx = clamp((pointer.x - cx) / (window.innerWidth * 0.45), -1, 1);
        ny = clamp((pointer.y - cy) / (window.innerHeight * 0.45), -1, 1);
      }
      const kLook = 1 - Math.exp(-dt * 5);
      lookX += (nx - lookX) * kLook;
      lookY += (ny - lookY) * kLook;

      // 4. Camera: pointer parallax + slow scroll orbit; key light glides with cursor
      const scrollP = clamp(window.scrollY / window.innerHeight, 0, 1.2);
      placeCamera(
        CAM_AZIMUTH + scrollP * 14,
        CAM_ELEVATION,
        -lookX * 0.22 * motion,
        lookY * 0.08 * motion
      );
      keyLight.position.x = -5.5 + lookX * 2.0 * motion;

      // 5. Pet transform
      const intro = modelReady ? (reduceMotion ? 1 : clamp((introT += dt) / 1.0, 0, 1)) : 0;
      const introScale = Math.max(0.0001, easeOutBack(intro));
      if (popT < 1) popT = Math.min(1, popT + dt / 0.5);
      const pop = Math.sin(popT * Math.PI * 2) * (1 - popT) * 0.07;
      const sleeping = currentState === 'durmiendo';
      const breath =
        1 + Math.sin(elapsed * (sleeping ? 0.9 : 1.9)) * (sleeping ? 0.022 : 0.01) * motion;

      let jump = 0;
      let shakeX = 0;
      if (currentState === 'celebrando') jump = Math.abs(Math.sin(elapsed * 7)) * 0.2 * motion;
      if (currentState === 'anomalia') shakeX = (Math.random() - 0.5) * 0.03 * motion;
      if (currentState === 'trabajando') shakeX = Math.sin(elapsed * 38) * 0.004 * motion;
      const wobbleZ =
        currentState === 'anomalia'
          ? Math.sin(elapsed * 30) * 0.02 * motion
          : sleeping
            ? 0.05
            : 0;

      petGroup.position.set(shakeX, Math.sin(elapsed * 1.4) * 0.03 * motion + jump, 0);
      petGroup.rotation.set(lookY * 0.14, PET_BASE_YAW + lookX * 0.55, wobbleZ);
      petGroup.scale.set(introScale * (1 + pop), introScale * breath * (1 - pop), introScale * (1 + pop));

      // 6. Eye blink (screen bars toggle off for ~110 ms)
      if (!sleeping && currentState !== 'anomalia' && elapsed > nextBlink) {
        blinkUntil = elapsed + 0.11;
        nextBlink = elapsed + 3 + Math.random() * 2.5;
      }
      const blinking = elapsed < blinkUntil;
      for (let i = 0; i < eyes.length; i++) eyes[i].visible = !blinking;

      // 7. Dither pad
      if (shock.t < 1) shock.t = Math.min(1, shock.t + dt / 1.1);
      const shockRadius = shock.t * 2.6;
      const shockAmp = 1 - shock.t;
      const padIntro = intro;
      const base = isDarkRef.current ? baseDark : baseLight;
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        const wave = Math.sin(c.d * 5.2 - elapsed * 3.2) * 0.5 + 0.5;
        let h = 0.016 + wave * waveAmp;
        let bump = 0;
        if (shock.t < 1) {
          const q = (c.d - shockRadius) / 0.3;
          bump = Math.exp(-q * q) * shockAmp;
          h += bump * 0.34;
        }
        const fall = Math.max(0, 1 - Math.pow(c.cheb / PAD_EDGE, 2.2));
        const size = CELL * 0.74 * fall * padIntro * (1 + bump * 0.25);
        dummy.position.set(c.x, h * 0.5, c.z);
        dummy.scale.set(Math.max(size, 0.0001), h, Math.max(size, 0.0001));
        dummy.updateMatrix();
        pad.setMatrixAt(i, dummy.matrix);

        const mix = clamp(1 - c.d / 1.25, 0, 1) * 0.85;
        cellColor.copy(base).lerp(stateColor, mix);
        pad.setColorAt(i, cellColor);
      }
      pad.instanceMatrix.needsUpdate = true;
      if (pad.instanceColor) pad.instanceColor.needsUpdate = true;

      // 8. Orbiting cubes
      cubeMat.color.copy(stateColor);
      for (let i = 0; i < ORBIT_COUNT; i++) {
        const o = orbits[i];
        o.angle += dt * o.speed * orbitMul;
        const spread = 1 + burst * 0.15;
        const jitter = currentState === 'anomalia' ? (Math.random() - 0.5) * 0.05 : 0;
        dummy.position.set(
          Math.cos(o.angle) * o.r * spread + jitter,
          o.y + Math.sin(o.angle * 1.7 + i) * 0.1,
          Math.sin(o.angle) * o.r * 0.85 * spread
        );
        dummy.rotation.set(o.angle * 1.3, o.angle * 0.9, 0);
        const s = o.size * intro;
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        cubes.setMatrixAt(i, dummy.matrix);
      }
      dummy.rotation.set(0, 0, 0);
      cubes.instanceMatrix.needsUpdate = true;

      // 9. Hover affordance (raycast every 4th frame)
      if (frameCount % 4 === 0) setCursor(pointerOverPet());

      renderer.render(scene, camera);
    };

    const stopLoop = startGatedLoop(host, frame);

    // ── Cleanup ─────────────────────────────────────────────────────────────
    return () => {
      disposed = true;
      stopLoop();
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', onScroll);
      if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleHandle as number);
      else window.clearTimeout(idleHandle as number);
      setCursor(false);

      padGeo.dispose();
      padMat.dispose();
      pad.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      cubeGeo.dispose();
      cubeMat.dispose();
      cubes.dispose();
      mats.dispose();
      envTarget.dispose();
      renderer.dispose();
      if (host.contains(canvasEl)) host.removeChild(canvasEl);
    };
  }, [material]);

  const meta = PET_STATE_META[hudState];

  return (
    <div className={className} aria-hidden="true">
      <div ref={hostRef} className="absolute inset-0 pointer-events-none" />

      {/* Specimen telemetry tag — data container: square corners, hard 1px border */}
      <div
        className={`absolute left-1 bottom-1 sm:left-2 sm:bottom-2 px-2 py-1 border font-mono text-[9px] sm:text-[10px] leading-tight uppercase tracking-[0.12em] pointer-events-none select-none rounded-none transition-colors duration-300 ${
          isDark
            ? 'bg-[#0e0c19]/90 border-white/10 text-zinc-300'
            : 'bg-[#fbfbfd]/90 border-black text-zinc-800'
        }`}
        style={{ boxShadow: isDark ? 'none' : '2px 2px 0 #111111' }}
      >
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5" style={{ backgroundColor: meta.color }} />
          <span>ESPÉCIMEN 01 // {meta.label}</span>
        </div>
        <div className="opacity-70 normal-case tracking-normal">
          σ {meta.sigma} · {meta.eyes}
        </div>
      </div>
    </div>
  );
};

export default MioHeroStage;
