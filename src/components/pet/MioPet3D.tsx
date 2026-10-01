import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { MioPetMood, MioPetMaterial } from './MioPet2D';

export interface MioPet3DProps {
  mood?: MioPetMood;
  material?: MioPetMaterial;
  className?: string;
  autoRotate?: boolean;
  interactive?: boolean;
  floatAnimation?: boolean;
}

/**
 * Creates a high-end procedural Studio Softbox HDR Environment Map.
 * Simulates a professional 6-softbox photography studio rig.
 */
function createStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.WebGLRenderTarget {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Neutral photographic studio gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 512);
  bgGrad.addColorStop(0, '#242232');
  bgGrad.addColorStop(0.5, '#12111a');
  bgGrad.addColorStop(1, '#07060c');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 512);

  // Softbox 1: Overhead Key Softbox
  const topGrad = ctx.createRadialGradient(512, 100, 10, 512, 100, 300);
  topGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  topGrad.addColorStop(0.4, 'rgba(235, 240, 255, 0.8)');
  topGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(180, 0, 664, 260);

  // Softbox 2: Left Edge Specular Strip (defines bevels)
  const leftGrad = ctx.createLinearGradient(100, 0, 240, 0);
  leftGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  leftGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
  leftGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = leftGrad;
  ctx.fillRect(100, 100, 140, 320);

  // Softbox 3: Right Rim Softbox
  const rightGrad = ctx.createRadialGradient(860, 250, 10, 860, 250, 200);
  rightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  rightGrad.addColorStop(0.5, 'rgba(167, 139, 250, 0.35)');
  rightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = rightGrad;
  ctx.fillRect(700, 100, 320, 300);

  // Softbox 4: Bottom Ground Bounce
  const bottomGrad = ctx.createLinearGradient(0, 460, 0, 512);
  bottomGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  bottomGrad.addColorStop(1, 'rgba(189, 245, 89, 0.2)');
  ctx.fillStyle = bottomGrad;
  ctx.fillRect(0, 440, 1024, 72);

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const envMap = pmremGenerator.fromEquirectangular(texture);

  texture.dispose();
  pmremGenerator.dispose();

  return envMap;
}

/**
 * Creates beveled box geometry with rounded chamfer corners (Bisel 0.28u).
 */
function createChamferBox(w: number, h: number, d: number, bevel: number = 0.06): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const hw = w / 2;
  const hh = h / 2;
  const b = Math.min(bevel, hw * 0.2, hh * 0.2);

  shape.moveTo(-hw + b, -hh);
  shape.lineTo(hw - b, -hh);
  shape.lineTo(hw, -hh + b);
  shape.lineTo(hw, hh - b);
  shape.lineTo(hw - b, hh);
  shape.lineTo(-hw + b, hh);
  shape.lineTo(-hw, hh - b);
  shape.lineTo(-hw, -hh + b);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    steps: 1,
    depth: d - b * 2,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelOffset: 0,
    bevelSegments: 3,
  });
  geo.center();
  return geo;
}

/**
 * MIO ESPÉCIMEN 01 — 3D Studio WebGL Master Model
 * EXACT MEASUREMENTS & PROPORTIONS FROM CONCEPT ART:
 * - 01 ANTENA: 3x3x3u cube (NO DOT! pure glowing cube) on 1x2u stem
 * - 02 PANTALLA: 11x8u recessed obsidian glass
 * - 03 CHASIS METÁLICO: 15u wide, beveled anodized metal
 * - 04 OJOS = HISTOGRAMA: [2,3,2] [2,3,2] bars in relief with intense neon lime glow
 * - 05 BOCA: 3x1u centered below the 3u eye gap
 * - 06 ARTICULACIÓN: 1x3x3u side blocks (black chrome)
 * - 07 PIES: 3x2x4u x2 beveled blocks
 * - BISEL: 0.28u
 */
export const MioPet3D: React.FC<MioPet3DProps> = ({
  mood = 'reposo',
  material = 'violet',
  className = '',
  autoRotate = false,
  interactive = true,
  floatAnimation = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ mood, material });
  stateRef.current = { mood, material };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    // 1. Scene & Camera Setup (calibrated to match isometric 3D plate)
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(0, 0.25, 7.8);

    // 2. Renderer with ACES Filmic Tone Mapping & High Precision
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 3. Studio Softbox Environment Map
    const envMap = createStudioEnvironment(renderer);
    scene.environment = envMap.texture;

    // 4. Studio Lighting Rig (6 Softbox lights matching LÁMINA 3D)
    // Key Light (Top-Right-Front)
    const keyLight = new THREE.DirectionalLight('#ffffff', 3.4);
    keyLight.position.set(5.0, 6.0, 5.0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0006;
    keyLight.shadow.radius = 2.5;
    scene.add(keyLight);

    // Rim Light (Top-Left-Back - defines chamfers)
    const rimLight = new THREE.DirectionalLight('#ffffff', 3.8);
    rimLight.position.set(-5.5, 4.0, -1.0);
    scene.add(rimLight);

    // Overhead Light
    const topLight = new THREE.DirectionalLight('#f0f4ff', 2.2);
    topLight.position.set(0, 7.0, 0);
    scene.add(topLight);

    // Fill Light (Soft cool reflection)
    const fillLight = new THREE.DirectionalLight('#93c5fd', 1.0);
    fillLight.position.set(2.0, -2.0, 4.0);
    scene.add(fillLight);

    const ambientLight = new THREE.AmbientLight('#201d2d', 0.9);
    scene.add(ambientLight);

    // 5. Ground Contact Shadow & Reflection Floor
    const shadowGeo = new THREE.PlaneGeometry(10, 10);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.32 });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -1.65;
    shadowMesh.receiveShadow = true;
    scene.add(shadowMesh);

    // Ambient Occlusion Ground Contact Disk
    const aoCanvas = document.createElement('canvas');
    aoCanvas.width = 256;
    aoCanvas.height = 256;
    const aoCtx = aoCanvas.getContext('2d')!;
    const aoGrad = aoCtx.createRadialGradient(128, 128, 8, 128, 128, 115);
    aoGrad.addColorStop(0, 'rgba(7, 5, 14, 0.75)');
    aoGrad.addColorStop(0.5, 'rgba(7, 5, 14, 0.35)');
    aoGrad.addColorStop(1, 'rgba(7, 5, 14, 0)');
    aoCtx.fillStyle = aoGrad;
    aoCtx.fillRect(0, 0, 256, 256);
    const aoTexture = new THREE.CanvasTexture(aoCanvas);
    const aoPlaneGeo = new THREE.PlaneGeometry(3.8, 2.4);
    const aoPlaneMat = new THREE.MeshBasicMaterial({
      map: aoTexture,
      transparent: true,
      depthWrite: false,
    });
    const aoPlane = new THREE.Mesh(aoPlaneGeo, aoPlaneMat);
    aoPlane.rotation.x = -Math.PI / 2;
    aoPlane.position.y = -1.64;
    scene.add(aoPlane);

    // 6. Materials Calibration
    const getChassisMaterial = (mat: MioPetMaterial) => {
      switch (mat) {
        case 'titanium':
          return new THREE.MeshPhysicalMaterial({
            color: '#8E8E9C',
            metalness: 0.94,
            roughness: 0.32,
            clearcoat: 0.3,
            clearcoatRoughness: 0.15,
            reflectivity: 0.85,
          });
        case 'blackChrome':
          return new THREE.MeshPhysicalMaterial({
            color: '#15141E',
            metalness: 0.98,
            roughness: 0.16,
            clearcoat: 0.7,
            clearcoatRoughness: 0.1,
            reflectivity: 0.95,
          });
        case 'violet':
        default:
          return new THREE.MeshPhysicalMaterial({
            color: '#6E3DE4',
            metalness: 0.88,
            roughness: 0.24,
            clearcoat: 0.5,
            clearcoatRoughness: 0.12,
            reflectivity: 0.9,
          });
      }
    };

    const getFeetMaterial = (mat: MioPetMaterial) => {
      switch (mat) {
        case 'titanium':
          return new THREE.MeshPhysicalMaterial({
            color: '#545460',
            metalness: 0.94,
            roughness: 0.35,
            clearcoat: 0.3,
            clearcoatRoughness: 0.2,
          });
        case 'blackChrome':
          return new THREE.MeshPhysicalMaterial({
            color: '#0D0C13',
            metalness: 0.98,
            roughness: 0.20,
            clearcoat: 0.6,
            clearcoatRoughness: 0.15,
          });
        case 'violet':
        default:
          return new THREE.MeshPhysicalMaterial({
            color: '#4C249E', // Darker violet metal for feet as in LÁMINA I & III
            metalness: 0.88,
            roughness: 0.28,
            clearcoat: 0.4,
            clearcoatRoughness: 0.15,
            reflectivity: 0.85,
          });
      }
    };

    const blackChromeMaterial = new THREE.MeshPhysicalMaterial({
      color: '#0A0910',
      metalness: 0.98,
      roughness: 0.14,
      clearcoat: 0.85,
      clearcoatRoughness: 0.08,
    });

    const obsidianGlassMaterial = new THREE.MeshPhysicalMaterial({
      color: '#06050A',
      metalness: 0.2,
      roughness: 0.06,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      reflectivity: 0.98,
    });

    // Intense Acid Lime with rich green base so it doesn't wash out to white
    const limeEmissiveMaterial = new THREE.MeshStandardMaterial({
      color: '#4D9E0D',
      emissive: '#98EC2A',
      emissiveIntensity: 2.8,
      roughness: 0.12,
    });

    const magentaEmissiveMaterial = new THREE.MeshStandardMaterial({
      color: '#8A1896',
      emissive: '#E879F9',
      emissiveIntensity: 3.0,
      roughness: 0.12,
    });

    const dimOliveEmissiveMaterial = new THREE.MeshStandardMaterial({
      color: '#344510',
      emissive: '#5B7A24',
      emissiveIntensity: 0.6,
      roughness: 0.4,
    });

    // 7. SPECIMEN 01 RECONSTRUCTION WITH EXACT UNIT MEASUREMENTS
    // Scale: 1u = 0.21 units
    const U = 0.21;
    const petGroup = new THREE.Group();
    scene.add(petGroup);

    // Initial 3D isometric turn (matching LÁMINA 3D hero angle)
    petGroup.rotation.y = 0.40;
    petGroup.rotation.x = 0.08;

    // --- A. MAIN CHASSIS (15u wide x 11u high x 6.5u deep, bevel 0.28u) ---
    const chassisGeo = createChamferBox(15 * U, 11 * U, 6.5 * U, 0.28 * U);
    const chassisMesh = new THREE.Mesh(chassisGeo, getChassisMaterial(material));
    chassisMesh.castShadow = true;
    chassisMesh.receiveShadow = true;
    petGroup.add(chassisMesh);

    // --- B. RECESSED OBSIDIAN SCREEN (11u wide x 8u high, recessed inwards by 0.2u) ---
    const screenGeo = createChamferBox(11 * U, 8 * U, 0.3 * U, 0.12 * U);
    const screenMesh = new THREE.Mesh(screenGeo, obsidianGlassMaterial);
    // Sits in front face cavity: z = (6.5u / 2) - 0.05
    screenMesh.position.set(0, 0.1 * U, (3.25 * U) - 0.08);
    screenMesh.receiveShadow = true;
    petGroup.add(screenMesh);

    // --- C. ARTICULATION ARMS (1u wide x 3u high x 3u deep, black chrome) ---
    const armGeo = createChamferBox(1 * U, 3 * U, 3 * U, 0.1 * U);
    const leftArm = new THREE.Mesh(armGeo, blackChromeMaterial);
    leftArm.position.set(-((15 * U) / 2 + (0.5 * U)), 0.2 * U, 0);
    leftArm.castShadow = true;
    petGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, blackChromeMaterial);
    rightArm.position.set((15 * U) / 2 + (0.5 * U), 0.2 * U, 0);
    rightArm.castShadow = true;
    petGroup.add(rightArm);

    // --- D. FEET (3u wide x 2u high x 4u deep, beveled metal blocks) ---
    const footGeo = createChamferBox(3 * U, 2 * U, 4 * U, 0.14 * U);
    const leftFoot = new THREE.Mesh(footGeo, getFeetMaterial(material));
    // Placed at x = -3.5u
    leftFoot.position.set(-3.5 * U, -((11 * U) / 2 + (1 * U)), 0);
    leftFoot.castShadow = true;
    petGroup.add(leftFoot);

    const rightFoot = new THREE.Mesh(footGeo, getFeetMaterial(material));
    // Placed at x = +3.5u
    rightFoot.position.set(3.5 * U, -((11 * U) / 2 + (1 * U)), 0);
    rightFoot.castShadow = true;
    petGroup.add(rightFoot);

    // --- E. ANTENNA: 3x3x3u CUBE (NO DOT! PURE GLOWING CUBE) ON 1x2u STEM ---
    // Stem: 1u x 2u x 1u (black chrome square prism as in concept art)
    const stemGeo = createChamferBox(1 * U, 2 * U, 1 * U, 0.08 * U);
    const stem = new THREE.Mesh(stemGeo, blackChromeMaterial);
    stem.position.set(0, (11 * U) / 2 + (1 * U), 0);
    stem.castShadow = true;
    petGroup.add(stem);

    // Antenna Cube: Exactly 3u x 3u x 3u, beveled, pure solid glowing cube!
    const antennaGeo = createChamferBox(3 * U, 3 * U, 3 * U, 0.2 * U);
    const antennaMesh = new THREE.Mesh(
      antennaGeo,
      mood === 'anomalia' ? magentaEmissiveMaterial : limeEmissiveMaterial
    );
    antennaMesh.position.set(0, (11 * U) / 2 + 2 * U + (1.5 * U), 0);
    antennaMesh.castShadow = true;
    petGroup.add(antennaMesh);

    // --- F. SPEAKER SLITS (3 vertical indented slots on lower left) ---
    const slitGeo = new THREE.BoxGeometry(0.4 * U, 1.4 * U, 0.1 * U);
    for (let i = 0; i < 3; i++) {
      const slit = new THREE.Mesh(slitGeo, blackChromeMaterial);
      slit.position.set((-5.2 + i * 1.0) * U, -3.8 * U, 3.28 * U);
      petGroup.add(slit);
    }

    // --- G. STATUS PIP (1u x 1u cube at lower right) ---
    const pipGeo = new THREE.BoxGeometry(0.9 * U, 0.9 * U, 0.1 * U);
    const pipMesh = new THREE.Mesh(
      pipGeo,
      mood === 'anomalia' ? magentaEmissiveMaterial : limeEmissiveMaterial
    );
    pipMesh.position.set(5.2 * U, -3.8 * U, 3.28 * U);
    petGroup.add(pipMesh);

    // --- H. EYES: HISTOGRAM BARS IN HIGH RELIEF (EXTRUDE FORWARD FROM SCREEN) ---
    // Left eye is 3u wide: 3 adjacent bars of 1u width each
    // Right eye is 3u wide: 3 adjacent bars of 1u width each
    // Center gap: exactly 3u
    const eyeGroup = new THREE.Group();
    petGroup.add(eyeGroup);

    const BAR_W = 1.0 * U;
    const BAR_D = 0.55 * U; // Deep extrusion in relief from screen
    const Z_RELIEF = 3.35 * U; // Sticks out past screen plane

    const leftBars: THREE.Mesh[] = [];
    const rightBars: THREE.Mesh[] = [];

    // Left eye bars at x = -3.0u, -2.0u, -1.0u (centered at x = -2.0u)
    for (let i = 0; i < 3; i++) {
      const barGeo = createChamferBox(BAR_W * 0.94, 1, BAR_D, 0.04 * U);
      const mesh = new THREE.Mesh(barGeo, limeEmissiveMaterial);
      mesh.position.x = (-3.0 + i) * U;
      mesh.position.z = Z_RELIEF;
      mesh.castShadow = true;
      eyeGroup.add(mesh);
      leftBars.push(mesh);
    }

    // Right eye bars at x = +1.0u, +2.0u, +3.0u (centered at x = +2.0u)
    for (let i = 0; i < 3; i++) {
      const barGeo = createChamferBox(BAR_W * 0.94, 1, BAR_D, 0.04 * U);
      const mesh = new THREE.Mesh(barGeo, limeEmissiveMaterial);
      mesh.position.x = (1.0 + i) * U;
      mesh.position.z = Z_RELIEF;
      mesh.castShadow = true;
      eyeGroup.add(mesh);
      rightBars.push(mesh);
    }

    // --- I. MOUTH / BASELINE INDICATOR: Exactly 3u wide x 1u high ---
    const mouthGeo = createChamferBox(3 * U, 1 * U, BAR_D, 0.04 * U);
    const mouthMesh = new THREE.Mesh(mouthGeo, limeEmissiveMaterial);
    mouthMesh.position.set(0, -1.8 * U, Z_RELIEF);
    mouthMesh.castShadow = true;
    petGroup.add(mouthMesh);

    // Apply Mood to Eyes and Mouth
    const updateMood = (currentMood: MioPetMood) => {
      const moodBars: Record<MioPetMood, { left: number[]; right: number[] }> = {
        reposo: { left: [2, 3, 2], right: [2, 3, 2] },
        trabajando: { left: [1, 2, 3], right: [3, 2, 1] },
        celebrando: { left: [2, 3, 4], right: [2, 3, 4] },
        anomalia: { left: [2, 2, 2], right: [2, 2, 4] },
        durmiendo: { left: [1, 1, 1], right: [1, 1, 1] },
      };

      const { left, right } = moodBars[currentMood] || moodBars.reposo;
      const BASELINE_Y = 0.2 * U;

      leftBars.forEach((mesh, idx) => {
        const h = left[idx] * U;
        mesh.scale.set(1, h, 1);
        mesh.position.y = BASELINE_Y + h / 2;
      });

      rightBars.forEach((mesh, idx) => {
        const h = right[idx] * U;
        mesh.scale.set(1, h, 1);
        mesh.position.y = BASELINE_Y + h / 2;
      });

      if (currentMood === 'anomalia') {
        antennaMesh.material = magentaEmissiveMaterial;
        pipMesh.material = magentaEmissiveMaterial;
        mouthMesh.scale.set(1, 1.4, 1);
        mouthMesh.position.y = -1.8 * U;
      } else if (currentMood === 'durmiendo') {
        antennaMesh.material = dimOliveEmissiveMaterial;
        pipMesh.material = dimOliveEmissiveMaterial;
        mouthMesh.scale.set(0.6, 0.4, 1);
        mouthMesh.position.y = -2.0 * U;
        leftArm.position.y = 0.2 * U;
        rightArm.position.y = 0.2 * U;
      } else if (currentMood === 'celebrando') {
        antennaMesh.material = limeEmissiveMaterial;
        pipMesh.material = limeEmissiveMaterial;
        mouthMesh.scale.set(1.1, 1.1, 1);
        leftArm.position.y = 3.6 * U;
        rightArm.position.y = 3.6 * U;
      } else {
        antennaMesh.material = limeEmissiveMaterial;
        pipMesh.material = limeEmissiveMaterial;
        mouthMesh.scale.set(1, 1, 1);
        mouthMesh.position.y = -1.8 * U;
        leftArm.position.y = 0.2 * U;
        rightArm.position.y = 0.2 * U;
      }
    };

    updateMood(mood);

    // 8. Mouse Interaction
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let targetRotationY = 0.40;
    let targetRotationX = 0.08;

    const onMouseDown = (e: MouseEvent) => {
      if (!interactive) return;
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !interactive) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      targetRotationY += deltaX * 0.008;
      targetRotationX += deltaY * 0.008;
      targetRotationX = Math.max(-0.35, Math.min(0.45, targetRotationX));

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (!interactive || e.touches.length === 0) return;
      isDragging = true;
      previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || !interactive || e.touches.length === 0) return;
      const deltaX = e.touches[0].clientX - previousMousePosition.x;
      const deltaY = e.touches[0].clientY - previousMousePosition.y;

      targetRotationY += deltaX * 0.008;
      targetRotationX += deltaY * 0.008;
      targetRotationX = Math.max(-0.35, Math.min(0.45, targetRotationX));

      previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domElement.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onMouseUp);

    // 9. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      if (autoRotate && !isDragging) {
        targetRotationY += 0.007;
      }

      petGroup.rotation.y += (targetRotationY - petGroup.rotation.y) * 0.08;
      petGroup.rotation.x += (targetRotationX - petGroup.rotation.x) * 0.08;

      if (floatAnimation) {
        petGroup.position.y = Math.sin(elapsedTime * 2.0) * 0.05;
        aoPlane.scale.setScalar(1.0 + Math.sin(elapsedTime * 2.0) * 0.04);
      }

      if (stateRef.current.mood === 'trabajando') {
        const wave = Math.sin(elapsedTime * 7);
        leftBars[1].scale.y = (2.6 + wave * 0.7) * U;
        rightBars[1].scale.y = (2.6 - wave * 0.7) * U;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domElement.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onMouseUp);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      envMap.dispose();
      chassisGeo.dispose();
      screenGeo.dispose();
      armGeo.dispose();
      footGeo.dispose();
      stemGeo.dispose();
      antennaGeo.dispose();
      mouthGeo.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      aoPlaneGeo.dispose();
      aoTexture.dispose();
    };
  }, [mood, material, autoRotate, interactive, floatAnimation]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative cursor-grab active:cursor-grabbing ${className}`}
      style={{ touchAction: 'none' }}
    />
  );
};
