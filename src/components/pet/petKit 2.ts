import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * petKit — shared building blocks for rendering MIO Espécimen 01 in custom scenes.
 *
 * Unlike <Mio /> (which tears down and rebuilds its whole WebGL renderer whenever
 * `state` changes), this kit lets a scene keep ONE renderer alive and swap the
 * model between moods. That is what makes scroll/interaction driven mood changes
 * possible without flicker or context churn.
 *
 * Colors, roughness and mesh-name mapping mirror Mio.tsx / BRANDING.md exactly.
 */

export type PetState = 'reposo' | 'trabajando' | 'celebrando' | 'anomalia' | 'durmiendo';
export type PetMaterial = 'violeta' | 'titanio' | 'cromo_negro';

/** Telemetry + color per mood (BRANDING.md §5.A). */
export const PET_STATE_META: Record<
  PetState,
  { label: string; eyes: string; sigma: string; color: string }
> = {
  reposo: { label: '01 REPOSO', eyes: '[2,3,2] [2,3,2]', sigma: '0.47', color: '#bdf559' },
  trabajando: { label: '02 TRABAJANDO', eyes: '[1,2,3] [3,2,1]', sigma: '0.82', color: '#60a5fa' },
  celebrando: { label: '03 CELEBRANDO', eyes: '[2,3,4] [2,3,4]', sigma: '0.82', color: '#fbbf24' },
  anomalia: { label: '04 ANOMALÍA', eyes: '[2,2,2] [2,2,4]', sigma: '0.75', color: '#f43f5e' },
  durmiendo: { label: '05 DURMIENDO', eyes: '[1,1,1] [1,1,1]', sigma: '0.00', color: '#a78bfa' },
};

export function getPetGlbPath(state: PetState, material: PetMaterial): string {
  if (state === 'reposo' && material === 'titanio') return '/models/mio_reposo_titanio.glb';
  if (state === 'reposo' && material === 'cromo_negro') return '/models/mio_reposo_cromo_negro.glb';
  switch (state) {
    case 'trabajando':
      return '/models/mio_trabajando.glb';
    case 'celebrando':
      return '/models/mio_celebrando.glb';
    case 'anomalia':
      return '/models/mio_anomalia.glb';
    case 'durmiendo':
      return '/models/mio_durmiendo.glb';
    case 'reposo':
    default:
      return '/models/mio_reposo.glb';
  }
}

const loader = new GLTFLoader();
const sceneCache = new Map<string, Promise<THREE.Group>>();

/**
 * Loads (once) and returns a fresh clone of the mood's model.
 * Geometries are shared with the cached original; materials are replaced by
 * applyPetMaterials(), so clones never fight over material state.
 */
export function loadPetScene(state: PetState, material: PetMaterial): Promise<THREE.Group> {
  const path = getPetGlbPath(state, material);
  let pending = sceneCache.get(path);
  if (!pending) {
    pending = new Promise<THREE.Group>((resolve, reject) => {
      loader.load(path, (gltf) => resolve(gltf.scene), undefined, reject);
    });
    sceneCache.set(path, pending);
    pending.catch(() => sceneCache.delete(path));
  }
  return pending.then((scene) => scene.clone(true));
}

export interface PetMaterialSet {
  frame: THREE.MeshStandardMaterial;
  body: THREE.MeshStandardMaterial;
  feet: THREE.MeshStandardMaterial;
  blackChrome: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  lime: THREE.MeshStandardMaterial;
  sleep: THREE.MeshStandardMaterial;
  anomalySpike: THREE.MeshStandardMaterial;
  antennaStandard: THREE.MeshStandardMaterial;
  antennaAnomaly: THREE.MeshStandardMaterial;
  antennaSleep: THREE.MeshStandardMaterial;
  mouthInactive: THREE.MeshStandardMaterial;
  dispose: () => void;
}

/** Builds every material once; reuse the set across all mood swaps. */
export function createPetMaterials(variant: PetMaterial): PetMaterialSet {
  const palette = {
    violeta: {
      frame: { color: '#6838E2', metalness: 0.38, roughness: 0.24 },
      body: { color: '#361A88', metalness: 0.45, roughness: 0.28 },
      feet: { color: '#321882', metalness: 0.45, roughness: 0.28 },
    },
    titanio: {
      frame: { color: '#8E8A9A', metalness: 1.0, roughness: 0.32 },
      body: { color: '#4A4756', metalness: 0.8, roughness: 0.34 },
      feet: { color: '#3F3C49', metalness: 0.8, roughness: 0.34 },
    },
    cromo_negro: {
      frame: { color: '#2A2733', metalness: 1.0, roughness: 0.16 },
      body: { color: '#15131C', metalness: 0.9, roughness: 0.2 },
      feet: { color: '#17151D', metalness: 0.9, roughness: 0.2 },
    },
  }[variant];

  const set: Omit<PetMaterialSet, 'dispose'> = {
    frame: new THREE.MeshStandardMaterial(palette.frame),
    body: new THREE.MeshStandardMaterial(palette.body),
    feet: new THREE.MeshStandardMaterial(palette.feet),
    blackChrome: new THREE.MeshStandardMaterial({ color: '#0E0C19', metalness: 1.0, roughness: 0.16 }),
    glass: new THREE.MeshStandardMaterial({ color: '#07060D', metalness: 0.05, roughness: 0.35 }),
    lime: new THREE.MeshStandardMaterial({
      color: '#BDF559',
      emissive: '#BDF559',
      emissiveIntensity: 1.12,
      roughness: 0.18,
    }),
    sleep: new THREE.MeshStandardMaterial({
      color: '#5B7A2E',
      emissive: '#5B7A2E',
      emissiveIntensity: 1.05,
      roughness: 0.3,
    }),
    anomalySpike: new THREE.MeshStandardMaterial({
      color: '#F6F6F2',
      emissive: '#F6F6F2',
      emissiveIntensity: 1.5,
      roughness: 0.1,
    }),
    antennaStandard: new THREE.MeshStandardMaterial({
      color: '#C8F065',
      emissive: '#A6E535',
      emissiveIntensity: 0.04,
      metalness: 0.05,
      roughness: 0.22,
    }),
    antennaAnomaly: new THREE.MeshStandardMaterial({
      color: '#E4B8FF',
      emissive: '#E4B8FF',
      emissiveIntensity: 1.15,
      roughness: 0.25,
    }),
    antennaSleep: new THREE.MeshStandardMaterial({
      color: '#7C9A45',
      emissive: '#7C9A45',
      emissiveIntensity: 0.05,
      roughness: 0.28,
    }),
    mouthInactive: new THREE.MeshStandardMaterial({
      color: '#3B3566',
      metalness: 0,
      roughness: 0.5,
      emissive: '#000000',
      emissiveIntensity: 0,
    }),
  };

  return {
    ...set,
    dispose: () => Object.values(set).forEach((m) => m.dispose()),
  };
}

/**
 * Applies the brand materials to a model by mesh name (same mapping as Mio.tsx)
 * and returns the eye meshes so the caller can blink them.
 */
export function applyPetMaterials(
  model: THREE.Object3D,
  state: PetState,
  mats: PetMaterialSet
): THREE.Object3D[] {
  const eyes: THREE.Object3D[] = [];

  model.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const name = mesh.name || '';

    if (name === 'chasis_marco' || name === 'chasis') {
      mesh.material = mats.frame;
    } else if (name === 'chasis_cuerpo') {
      mesh.material = mats.body;
    } else if (name === 'pie_L' || name === 'pie_R') {
      mesh.material = mats.feet;
    } else if (
      name.startsWith('articulacion_') ||
      name === 'antena_tallo' ||
      name.startsWith('rejilla_') ||
      name.startsWith('antenita_')
    ) {
      mesh.material = mats.blackChrome;
    } else if (name === 'pantalla_vidrio' || name === 'pantalla') {
      mesh.material = mats.glass;
    } else if (name.startsWith('ojo_')) {
      eyes.push(mesh);
      if (state === 'durmiendo') mesh.material = mats.sleep;
      else if (state === 'anomalia' && name === 'ojo_R_3') mesh.material = mats.anomalySpike;
      else mesh.material = mats.lime;
    } else if (name.startsWith('boca')) {
      if (state === 'trabajando' && name === 'boca_2') mesh.material = mats.mouthInactive;
      else if (state === 'durmiendo') mesh.material = mats.sleep;
      else mesh.material = mats.lime;
    } else if (name === 'piloto') {
      mesh.material = state === 'durmiendo' ? mats.sleep : mats.lime;
    } else if (name === 'antena_cubo') {
      if (state === 'anomalia') mesh.material = mats.antennaAnomaly;
      else if (state === 'durmiendo') mesh.material = mats.antennaSleep;
      else mesh.material = mats.antennaStandard;
    }
  });

  return eyes;
}

/**
 * Procedural photographic-studio environment (softboxes) baked to a PMREM target,
 * so the chassis gets crisp, believable reflections with zero network cost.
 * The caller owns (and must dispose) the returned render target.
 */
export function createStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.WebGLRenderTarget {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, 0, 512);
  bg.addColorStop(0, '#23212E');
  bg.addColorStop(0.5, '#12111C');
  bg.addColorStop(1, '#090810');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 512);

  const top = ctx.createRadialGradient(400, 120, 10, 400, 120, 260);
  top.addColorStop(0, 'rgba(255,255,255,0.55)');
  top.addColorStop(0.4, 'rgba(235,240,255,0.35)');
  top.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = top;
  ctx.fillRect(100, 0, 600, 260);

  const left = ctx.createLinearGradient(60, 0, 220, 0);
  left.addColorStop(0, 'rgba(0,0,0,0)');
  left.addColorStop(0.5, 'rgba(255,255,255,0.45)');
  left.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = left;
  ctx.fillRect(60, 80, 160, 360);

  const bounce = ctx.createLinearGradient(0, 460, 0, 512);
  bounce.addColorStop(0, 'rgba(0,0,0,0)');
  bounce.addColorStop(1, 'rgba(246,246,242,0.15)');
  ctx.fillStyle = bounce;
  ctx.fillRect(0, 450, 1024, 62);

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const target = pmrem.fromEquirectangular(texture);

  texture.dispose();
  pmrem.dispose();
  return target;
}
