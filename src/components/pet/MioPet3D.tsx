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
 * This is what gives the anodized metal and titanium its realistic reflections.
 */
function createStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.WebGLRenderTarget {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark studio gradient background (#121118 to #08070d)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 512);
  bgGrad.addColorStop(0, '#1e1c28');
  bgGrad.addColorStop(0.5, '#0e0d16');
  bgGrad.addColorStop(1, '#05040a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 512);

  // Softbox 1: Overhead Giant Key Light (Top ceiling strip)
  const topGrad = ctx.createRadialGradient(512, 100, 10, 512, 100, 320);
  topGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  topGrad.addColorStop(0.35, 'rgba(240, 245, 255, 0.85)');
  topGrad.addColorStop(0.8, 'rgba(200, 215, 255, 0.2)');
  topGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(200, 0, 624, 260);

  // Softbox 2: High-contrast Left Rim Strip (Catches beveled corners)
  const leftGrad = ctx.createLinearGradient(120, 0, 220, 0);
  leftGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  leftGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
  leftGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = leftGrad;
  ctx.fillRect(120, 120, 100, 300);

  // Softbox 3: Right Fill Softbox (Slight warm-violet reflection)
  const rightGrad = ctx.createRadialGradient(840, 260, 20, 840, 260, 220);
  rightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  rightGrad.addColorStop(0.4, 'rgba(167, 139, 250, 0.45)');
  rightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = rightGrad;
  ctx.fillRect(680, 100, 320, 320);

  // Softbox 4: Bottom Ground Bounce Strip (For metallic undersides)
  const bottomGrad = ctx.createLinearGradient(0, 460, 0, 512);
  bottomGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  bottomGrad.addColorStop(1, 'rgba(189, 245, 89, 0.15)');
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
 * Creates a beveled rounded box geometry using ExtrudeGeometry for true chamfered edges.
 */
function createBeveledBoxGeometry(
  width: number,
  height: number,
  depth: number,
  bevel: number = 0.08
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const w = width / 2;
  const h = height / 2;
  const b = bevel;

  // Stepped chamfer polygon matching LÁMINA I
  shape.moveTo(-w + b, -h);
  shape.lineTo(w - b, -h);
  shape.lineTo(w, -h + b);
  shape.lineTo(w, h - b);
  shape.lineTo(w - b, h);
  shape.lineTo(-w + b, h);
  shape.lineTo(-w, h - b);
  shape.lineTo(-w, -h + b);
  shape.closePath();

  const extrudeSettings = {
    steps: 1,
    depth: depth - b * 2,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelOffset: 0,
    bevelSegments: 3,
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.center();
  return geo;
}

/**
 * MIO ESPÉCIMEN 01 — 3D Studio WebGL Master Experience
 * Reconstructed 1:1 from LÁMINA I-IV (3D Anodized Metal Edition).
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

    // 1. Scene & Camera Setup (Calibrated perspective matching the 3D sheet)
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 0.35, 7.6);

    // 2. Renderer with ACES Filmic Tone Mapping & High Precision
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 3. Studio Softbox Environment Map
    const envMap = createStudioEnvironment(renderer);
    scene.environment = envMap.texture;

    // 4. Studio Lighting Rig (6 Softboxes)
    // Key Softbox Light
    const keyLight = new THREE.DirectionalLight('#ffffff', 3.6);
    keyLight.position.set(4.5, 6.0, 5.0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0008;
    keyLight.shadow.radius = 3;
    scene.add(keyLight);

    // Left Rim Softbox (Catches chassis bevels and corners)
    const rimLight = new THREE.DirectionalLight('#ffffff', 4.2);
    rimLight.position.set(-5.5, 3.5, 2.5);
    scene.add(rimLight);

    // Top Overhead Rim Softbox
    const topLight = new THREE.DirectionalLight('#e0e7ff', 2.8);
    topLight.position.set(0, 7.0, -2.5);
    scene.add(topLight);

    // Fill Softbox (Cool blue-violet ambient fill)
    const fillLight = new THREE.DirectionalLight('#93c5fd', 1.2);
    fillLight.position.set(3.0, -1.0, 4.0);
    scene.add(fillLight);

    const ambientLight = new THREE.AmbientLight('#1d1a29', 1.0);
    scene.add(ambientLight);

    // 5. Ground Contact Shadow & Reflection Floor
    const shadowGeo = new THREE.PlaneGeometry(10, 10);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -1.68;
    shadowMesh.receiveShadow = true;
    scene.add(shadowMesh);

    // Soft Radial Ambient Occlusion Fake Shadow Disk under feet
    const aoCanvas = document.createElement('canvas');
    aoCanvas.width = 256;
    aoCanvas.height = 256;
    const aoCtx = aoCanvas.getContext('2d')!;
    const aoGrad = aoCtx.createRadialGradient(128, 128, 10, 128, 128, 110);
    aoGrad.addColorStop(0, 'rgba(7, 5, 14, 0.7)');
    aoGrad.addColorStop(0.5, 'rgba(7, 5, 14, 0.3)');
    aoGrad.addColorStop(1, 'rgba(7, 5, 14, 0)');
    aoCtx.fillStyle = aoGrad;
    aoCtx.fillRect(0, 0, 256, 256);
    const aoTexture = new THREE.CanvasTexture(aoCanvas);
    const aoPlaneGeo = new THREE.PlaneGeometry(3.6, 2.4);
    const aoPlaneMat = new THREE.MeshBasicMaterial({
      map: aoTexture,
      transparent: true,
      depthWrite: false,
    });
    const aoPlane = new THREE.Mesh(aoPlaneGeo, aoPlaneMat);
    aoPlane.rotation.x = -Math.PI / 2;
    aoPlane.position.y = -1.67;
    scene.add(aoPlane);

    // 6. Physically Based Materials (Anodized Violet, Satin Titanium, Gunmetal Chrome)
    const createChassisMaterial = (matType: MioPetMaterial) => {
      switch (matType) {
        case 'titanium':
          return new THREE.MeshPhysicalMaterial({
            color: '#8E8E9C',
            metalness: 0.94,
            roughness: 0.32,
            clearcoat: 0.35,
            clearcoatRoughness: 0.2,
            reflectivity: 0.85,
          });
        case 'blackChrome':
          return new THREE.MeshPhysicalMaterial({
            color: '#15141E',
            metalness: 0.98,
            roughness: 0.16,
            clearcoat: 0.65,
            clearcoatRoughness: 0.1,
            reflectivity: 0.95,
          });
        case 'violet':
        default:
          return new THREE.MeshPhysicalMaterial({
            color: '#7647EB',
            metalness: 0.88,
            roughness: 0.24,
            clearcoat: 0.55,
            clearcoatRoughness: 0.15,
            reflectivity: 0.9,
          });
      }
    };

    const blackChromeMaterial = new THREE.MeshPhysicalMaterial({
      color: '#0A0910',
      metalness: 0.96,
      roughness: 0.18,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
    });

    const recessedScreenMaterial = new THREE.MeshPhysicalMaterial({
      color: '#050409',
      metalness: 0.15,
      roughness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      reflectivity: 0.98,
    });

    const limeEmissiveMaterial = new THREE.MeshStandardMaterial({
      color: '#BDF559',
      emissive: '#BDF559',
      emissiveIntensity: 2.2,
      roughness: 0.15,
    });

    const magentaEmissiveMaterial = new THREE.MeshStandardMaterial({
      color: '#E879F9',
      emissive: '#E879F9',
      emissiveIntensity: 2.5,
      roughness: 0.15,
    });

    // 7. SPECIMEN 01 HIERARCHY ASSEMBLY
    const petGroup = new THREE.Group();
    scene.add(petGroup);

    // Calibrated studio orientation matching LÁMINA 3D
    petGroup.rotation.y = 0.38;
    petGroup.rotation.x = 0.07;

    // --- A. MAIN CHASSIS (Beveled chamfered body) ---
    const chassisGeo = createBeveledBoxGeometry(3.1, 2.35, 1.6, 0.14);
    const chassisMesh = new THREE.Mesh(chassisGeo, createChassisMaterial(material));
    chassisMesh.castShadow = true;
    chassisMesh.receiveShadow = true;
    petGroup.add(chassisMesh);

    // Front Beveled Frame Collar (Emphasizes the recessed cavity)
    const collarGeo = createBeveledBoxGeometry(2.55, 1.85, 0.1, 0.06);
    const collarMesh = new THREE.Mesh(collarGeo, createChassisMaterial(material));
    collarMesh.position.set(0, 0.06, 0.78);
    collarMesh.castShadow = true;
    petGroup.add(collarMesh);

    // --- B. RECESSED OBSIDIAN SCREEN ---
    const screenGeo = new THREE.BoxGeometry(2.36, 1.66, 0.04);
    const screenMesh = new THREE.Mesh(screenGeo, recessedScreenMaterial);
    screenMesh.position.set(0, 0.06, 0.81);
    petGroup.add(screenMesh);

    // --- C. ARTICULATION ARMS (Black Chrome Shoulder Blocks) ---
    const armGeo = createBeveledBoxGeometry(0.28, 0.72, 0.72, 0.04);
    const leftArm = new THREE.Mesh(armGeo, blackChromeMaterial);
    leftArm.position.set(-1.64, 0.05, 0);
    leftArm.castShadow = true;
    petGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, blackChromeMaterial);
    rightArm.position.set(1.64, 0.05, 0);
    rightArm.castShadow = true;
    petGroup.add(rightArm);

    // --- D. FEET (Beveled base blocks) ---
    const footGeo = createBeveledBoxGeometry(0.62, 0.42, 0.85, 0.06);
    const leftFoot = new THREE.Mesh(footGeo, createChassisMaterial(material));
    leftFoot.position.set(-0.75, -1.35, 0);
    leftFoot.castShadow = true;
    petGroup.add(leftFoot);

    const rightFoot = new THREE.Mesh(footGeo, createChassisMaterial(material));
    rightFoot.position.set(0.75, -1.35, 0);
    rightFoot.castShadow = true;
    petGroup.add(rightFoot);

    // --- E. ANTENNA (Chrome stem + Glowing cube with signal pip) ---
    const stemGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.48, 16);
    const stem = new THREE.Mesh(stemGeo, blackChromeMaterial);
    stem.position.set(0, 1.4, 0);
    stem.castShadow = true;
    petGroup.add(stem);

    const antennaBoxGeo = createBeveledBoxGeometry(0.65, 0.65, 0.65, 0.06);
    const antennaMesh = new THREE.Mesh(
      antennaBoxGeo,
      mood === 'anomalia' ? magentaEmissiveMaterial : limeEmissiveMaterial
    );
    antennaMesh.position.set(0, 1.88, 0);
    antennaMesh.castShadow = true;
    petGroup.add(antennaMesh);

    // Center antenna pip
    const pipGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.02, 16);
    const pipMesh = new THREE.Mesh(pipGeo, blackChromeMaterial);
    pipMesh.rotation.x = Math.PI / 2;
    pipMesh.position.set(0, 1.88, 0.34);
    petGroup.add(pipMesh);

    // --- F. SPEAKER SLITS (3 vertical indented slots on lower left) ---
    const slitGeo = new THREE.BoxGeometry(0.06, 0.26, 0.03);
    for (let i = 0; i < 3; i++) {
      const slit = new THREE.Mesh(slitGeo, blackChromeMaterial);
      slit.position.set(-1.0 + i * 0.17, -0.92, 0.84);
      petGroup.add(slit);
    }

    // --- G. STATUS LED (Lower right chassis corner) ---
    const ledGeo = new THREE.BoxGeometry(0.14, 0.14, 0.03);
    const ledMesh = new THREE.Mesh(
      ledGeo,
      mood === 'anomalia' ? magentaEmissiveMaterial : limeEmissiveMaterial
    );
    ledMesh.position.set(1.0, -0.92, 0.84);
    petGroup.add(ledMesh);

    // --- H. EYES: HISTOGRAM BARS IN HIGH-RELIEF BLOOM ---
    const eyeGroup = new THREE.Group();
    petGroup.add(eyeGroup);

    // Each eye is 3 adjacent bars forming a contiguous stepped histogram
    const BAR_WIDTH = 0.22;
    const BAR_DEPTH = 0.12;
    const UNIT_H = 0.14; // Height per unit step
    const BASELINE_Y = -0.05;

    const leftBars: THREE.Mesh[] = [];
    const rightBars: THREE.Mesh[] = [];

    // Left eye bars: positioned adjacent at x = -0.76, -0.54, -0.32
    for (let i = 0; i < 3; i++) {
      const barGeo = createBeveledBoxGeometry(BAR_WIDTH, 1, BAR_DEPTH, 0.02);
      const mesh = new THREE.Mesh(barGeo, limeEmissiveMaterial);
      mesh.position.x = -0.76 + i * BAR_WIDTH;
      mesh.position.z = 0.88;
      mesh.castShadow = true;
      eyeGroup.add(mesh);
      leftBars.push(mesh);
    }

    // Right eye bars: positioned adjacent at x = 0.32, 0.54, 0.76
    for (let i = 0; i < 3; i++) {
      const barGeo = createBeveledBoxGeometry(BAR_WIDTH, 1, BAR_DEPTH, 0.02);
      const mesh = new THREE.Mesh(barGeo, limeEmissiveMaterial);
      mesh.position.x = 0.32 + i * BAR_WIDTH;
      mesh.position.z = 0.88;
      mesh.castShadow = true;
      eyeGroup.add(mesh);
      rightBars.push(mesh);
    }

    // --- I. MOUTH / BASELINE INDICATOR ---
    const mouthGeo = createBeveledBoxGeometry(0.64, 0.13, BAR_DEPTH, 0.02);
    const mouthMesh = new THREE.Mesh(mouthGeo, limeEmissiveMaterial);
    mouthMesh.position.set(0, -0.42, 0.88);
    mouthMesh.castShadow = true;
    petGroup.add(mouthMesh);

    // Function to apply mood to eye histogram heights
    const updateMood = (currentMood: MioPetMood) => {
      const moodBars: Record<MioPetMood, { left: number[]; right: number[] }> = {
        reposo: { left: [2, 3, 2], right: [2, 3, 2] },
        trabajando: { left: [1, 2, 3], right: [3, 2, 1] },
        celebrando: { left: [2, 3, 4], right: [2, 3, 4] },
        anomalia: { left: [2, 2, 2], right: [2, 2, 4] },
        durmiendo: { left: [1, 1, 1], right: [1, 1, 1] },
      };

      const { left, right } = moodBars[currentMood] || moodBars.reposo;

      leftBars.forEach((mesh, idx) => {
        const h = left[idx] * UNIT_H;
        mesh.scale.set(1, h, 1);
        mesh.position.y = BASELINE_Y + h / 2;
      });

      rightBars.forEach((mesh, idx) => {
        const h = right[idx] * UNIT_H;
        mesh.scale.set(1, h, 1);
        mesh.position.y = BASELINE_Y + h / 2;
      });

      if (currentMood === 'anomalia') {
        antennaMesh.material = magentaEmissiveMaterial;
        ledMesh.material = magentaEmissiveMaterial;
        mouthMesh.scale.set(1, 1.4, 1);
        mouthMesh.position.y = -0.42;
      } else if (currentMood === 'durmiendo') {
        antennaMesh.material = limeEmissiveMaterial;
        ledMesh.material = limeEmissiveMaterial;
        mouthMesh.scale.set(0.6, 0.4, 1);
        mouthMesh.position.y = -0.44;
      } else if (currentMood === 'celebrando') {
        antennaMesh.material = limeEmissiveMaterial;
        ledMesh.material = limeEmissiveMaterial;
        mouthMesh.scale.set(1.2, 1.2, 1);
        leftArm.position.y = 0.55;
        rightArm.position.y = 0.55;
      } else {
        antennaMesh.material = limeEmissiveMaterial;
        ledMesh.material = limeEmissiveMaterial;
        mouthMesh.scale.set(1, 1, 1);
        mouthMesh.position.y = -0.42;
        leftArm.position.y = 0.05;
        rightArm.position.y = 0.05;
      }
    };

    updateMood(mood);

    // 8. Interactive Mouse Drag / Orbit Parallax
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let targetRotationY = 0.38;
    let targetRotationX = 0.07;

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

    // 9. High-Precision Render Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth Rotation Lerp
      if (autoRotate && !isDragging) {
        targetRotationY += 0.007;
      }

      petGroup.rotation.y += (targetRotationY - petGroup.rotation.y) * 0.08;
      petGroup.rotation.x += (targetRotationX - petGroup.rotation.x) * 0.08;

      // Organic hardware floating breathing
      if (floatAnimation) {
        petGroup.position.y = Math.sin(elapsedTime * 2.0) * 0.05;
        // Subtle ground AO breathing
        aoPlane.scale.setScalar(1.0 + Math.sin(elapsedTime * 2.0) * 0.04);
      }

      // Dynamic working histogram dance
      if (stateRef.current.mood === 'trabajando') {
        const wave = Math.sin(elapsedTime * 7);
        leftBars[1].scale.y = (2.6 + wave * 0.7) * UNIT_H;
        rightBars[1].scale.y = (2.6 - wave * 0.7) * UNIT_H;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 10. Resize Observer
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // 11. Memory Cleanup
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
      collarGeo.dispose();
      screenGeo.dispose();
      armGeo.dispose();
      footGeo.dispose();
      stemGeo.dispose();
      antennaBoxGeo.dispose();
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
