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
 * MIO ESPÉCIMEN 01 — 3D Procedural Hardware Render
 * Built with native Three.js primitives and physical PBR materials.
 * Features anodized metal chassis, recessed obsidian glass screen,
 * and high-emission relief eye histogram bars.
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

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.4, 7.2);

    // 2. Renderer
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

    // 3. Lighting Rig (Studio Softbox Lighting)
    // Key Softbox Light
    const keyLight = new THREE.DirectionalLight('#ffffff', 2.8);
    keyLight.position.set(4, 5, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);

    // Fill Softbox Light (Cool tone)
    const fillLight = new THREE.DirectionalLight('#e0e7ff', 1.4);
    fillLight.position.set(-5, 2, 4);
    scene.add(fillLight);

    // Rim / Edge Highlighting Light (Catches chassis bevels)
    const rimLight = new THREE.DirectionalLight('#ffffff', 3.2);
    rimLight.position.set(0, 6, -4);
    scene.add(rimLight);

    // Bottom Bounce Light
    const bounceLight = new THREE.DirectionalLight('#7647eb', 0.6);
    bounceLight.position.set(0, -4, 2);
    scene.add(bounceLight);

    const ambientLight = new THREE.AmbientLight('#2a2738', 0.8);
    scene.add(ambientLight);

    // 4. Ground Shadow Plane
    const shadowGeo = new THREE.PlaneGeometry(8, 8);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.28 });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -1.55;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // 5. Materials Factory
    const getChassisMaterial = (matType: MioPetMaterial) => {
      switch (matType) {
        case 'titanium':
          return new THREE.MeshStandardMaterial({
            color: '#8e8e9c',
            metalness: 0.92,
            roughness: 0.32,
          });
        case 'blackChrome':
          return new THREE.MeshStandardMaterial({
            color: '#1a1924',
            metalness: 0.96,
            roughness: 0.16,
          });
        case 'violet':
        default:
          return new THREE.MeshStandardMaterial({
            color: '#7647eb',
            metalness: 0.86,
            roughness: 0.24,
          });
      }
    };

    const getFeetMaterial = (matType: MioPetMaterial) => {
      switch (matType) {
        case 'titanium':
          return new THREE.MeshStandardMaterial({
            color: '#5a5a66',
            metalness: 0.9,
            roughness: 0.4,
          });
        case 'blackChrome':
          return new THREE.MeshStandardMaterial({
            color: '#111018',
            metalness: 0.95,
            roughness: 0.25,
          });
        case 'violet':
        default:
          return new THREE.MeshStandardMaterial({
            color: '#4f2db8',
            metalness: 0.85,
            roughness: 0.32,
          });
      }
    };

    const blackChromeMaterial = new THREE.MeshStandardMaterial({
      color: '#0d0c14',
      metalness: 0.94,
      roughness: 0.2,
    });

    const screenMaterial = new THREE.MeshStandardMaterial({
      color: '#08070e',
      roughness: 0.12,
      metalness: 0.2,
    });

    const limeGlowMaterial = new THREE.MeshStandardMaterial({
      color: '#bdf559',
      emissive: '#bdf559',
      emissiveIntensity: 1.8,
      roughness: 0.1,
    });

    const magentaGlowMaterial = new THREE.MeshStandardMaterial({
      color: '#e879f9',
      emissive: '#e879f9',
      emissiveIntensity: 2.2,
      roughness: 0.1,
    });

    // 6. Build the 3D Specimen Robot Hierarchy
    const petGroup = new THREE.Group();
    scene.add(petGroup);

    // Initial slight 3D isometric turn (as in LÁMINA 3D)
    petGroup.rotation.y = 0.35;
    petGroup.rotation.x = 0.08;

    // --- A. MAIN CHASSIS (Rounded block with bevel impression) ---
    const chassisGeo = new THREE.BoxGeometry(3.0, 2.3, 1.55);
    const chassisMesh = new THREE.Mesh(chassisGeo, getChassisMaterial(material));
    chassisMesh.castShadow = true;
    chassisMesh.receiveShadow = true;
    petGroup.add(chassisMesh);

    // Chassis Front Frame Bevel (Inner recess ring)
    const bevelGeo = new THREE.BoxGeometry(2.45, 1.75, 0.05);
    const bevelMesh = new THREE.Mesh(bevelGeo, getChassisMaterial(material));
    bevelMesh.position.set(0, 0.08, 0.77);
    petGroup.add(bevelMesh);

    // --- B. RECESSED SCREEN (Obsidian glass) ---
    const screenGeo = new THREE.BoxGeometry(2.32, 1.62, 0.04);
    const screenMesh = new THREE.Mesh(screenGeo, screenMaterial);
    screenMesh.position.set(0, 0.08, 0.79);
    petGroup.add(screenMesh);

    // --- C. ARTICULATION ARMS (Black Chrome Shoulder Mounts) ---
    const armGeo = new THREE.BoxGeometry(0.24, 0.65, 0.65);
    const leftArmMesh = new THREE.Mesh(armGeo, blackChromeMaterial);
    leftArmMesh.position.set(-1.58, 0.05, 0);
    leftArmMesh.castShadow = true;
    petGroup.add(leftArmMesh);

    const rightArmMesh = new THREE.Mesh(armGeo, blackChromeMaterial);
    rightArmMesh.position.set(1.58, 0.05, 0);
    rightArmMesh.castShadow = true;
    petGroup.add(rightArmMesh);

    // --- D. FEET ---
    const footGeo = new THREE.BoxGeometry(0.55, 0.38, 0.75);
    const leftFootMesh = new THREE.Mesh(footGeo, getFeetMaterial(material));
    leftFootMesh.position.set(-0.7, -1.3, 0);
    leftFootMesh.castShadow = true;
    petGroup.add(leftFootMesh);

    const rightFootMesh = new THREE.Mesh(footGeo, getFeetMaterial(material));
    rightFootMesh.position.set(0.7, -1.3, 0);
    rightFootMesh.castShadow = true;
    petGroup.add(rightFootMesh);

    // --- E. ANTENNA ---
    const stemGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.45, 16);
    const stemMesh = new THREE.Mesh(stemGeo, blackChromeMaterial);
    stemMesh.position.set(0, 1.34, 0);
    stemMesh.castShadow = true;
    petGroup.add(stemMesh);

    const antennaBoxGeo = new THREE.BoxGeometry(0.62, 0.62, 0.62);
    const antennaMesh = new THREE.Mesh(
      antennaBoxGeo,
      mood === 'anomalia' ? magentaGlowMaterial : limeGlowMaterial
    );
    antennaMesh.position.set(0, 1.82, 0);
    antennaMesh.castShadow = true;
    petGroup.add(antennaMesh);

    // --- F. SPEAKER SLITS (3 recessed vertical indentations) ---
    const slitGeo = new THREE.BoxGeometry(0.06, 0.22, 0.04);
    for (let i = 0; i < 3; i++) {
      const slit = new THREE.Mesh(slitGeo, blackChromeMaterial);
      slit.position.set(-0.95 + i * 0.16, -0.88, 0.8);
      petGroup.add(slit);
    }

    // --- G. STATUS LED (Bottom right corner) ---
    const statusLedGeo = new THREE.BoxGeometry(0.14, 0.14, 0.04);
    const statusLed = new THREE.Mesh(
      statusLedGeo,
      mood === 'anomalia' ? magentaGlowMaterial : limeGlowMaterial
    );
    statusLed.position.set(0.95, -0.88, 0.8);
    petGroup.add(statusLed);

    // --- H. EYES: HISTOGRAM BARS IN RELIEF ---
    const eyeGroup = new THREE.Group();
    petGroup.add(eyeGroup);

    // Bar configs: width = 0.17, depth = 0.08
    const BAR_WIDTH = 0.17;
    const BAR_DEPTH = 0.08;
    const UNIT_H = 0.13; // unit multiplier for height
    const leftEyeMeshes: THREE.Mesh[] = [];
    const rightEyeMeshes: THREE.Mesh[] = [];

    // Create 3 left bars
    for (let i = 0; i < 3; i++) {
      const barGeo = new THREE.BoxGeometry(BAR_WIDTH, 1, BAR_DEPTH);
      const mesh = new THREE.Mesh(barGeo, limeGlowMaterial);
      mesh.position.x = -0.72 + i * 0.23;
      mesh.position.z = 0.84;
      eyeGroup.add(mesh);
      leftEyeMeshes.push(mesh);
    }

    // Create 3 right bars
    for (let i = 0; i < 3; i++) {
      const barGeo = new THREE.BoxGeometry(BAR_WIDTH, 1, BAR_DEPTH);
      const mesh = new THREE.Mesh(barGeo, limeGlowMaterial);
      mesh.position.x = 0.26 + i * 0.23;
      mesh.position.z = 0.84;
      eyeGroup.add(mesh);
      rightEyeMeshes.push(mesh);
    }

    // --- I. MOUTH / BASELINE INDICATOR ---
    const mouthGeo = new THREE.BoxGeometry(0.58, 0.11, BAR_DEPTH);
    const mouthMesh = new THREE.Mesh(mouthGeo, limeGlowMaterial);
    mouthMesh.position.set(0, -0.32, 0.84);
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

      // Base eye Y line
      const baselineY = 0.08;

      leftEyeMeshes.forEach((mesh, idx) => {
        const h = left[idx] * UNIT_H;
        mesh.scale.set(1, h, 1);
        mesh.position.y = baselineY + h / 2;
      });

      rightEyeMeshes.forEach((mesh, idx) => {
        const h = right[idx] * UNIT_H;
        mesh.scale.set(1, h, 1);
        mesh.position.y = baselineY + h / 2;
      });

      // Antenna and Status LED color
      if (currentMood === 'anomalia') {
        antennaMesh.material = magentaGlowMaterial;
        statusLed.material = magentaGlowMaterial;
        mouthMesh.scale.set(1, 1.4, 1);
        mouthMesh.position.y = -0.32;
      } else if (currentMood === 'durmiendo') {
        antennaMesh.material = limeGlowMaterial;
        statusLed.material = limeGlowMaterial;
        mouthMesh.scale.set(0.6, 0.5, 1);
        mouthMesh.position.y = -0.34;
      } else if (currentMood === 'celebrando') {
        antennaMesh.material = limeGlowMaterial;
        statusLed.material = limeGlowMaterial;
        mouthMesh.scale.set(1.2, 1.2, 1);
        // Arms raise
        leftArmMesh.position.y = 0.5;
        rightArmMesh.position.y = 0.5;
      } else {
        antennaMesh.material = limeGlowMaterial;
        statusLed.material = limeGlowMaterial;
        mouthMesh.scale.set(1, 1, 1);
        mouthMesh.position.y = -0.32;
        leftArmMesh.position.y = 0.05;
        rightArmMesh.position.y = 0.05;
      }
    };

    updateMood(mood);

    // 7. Interactive Mouse Drag / Parallax
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let targetRotationY = 0.35;
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

      // Limit vertical tilt
      targetRotationX = Math.max(-0.4, Math.min(0.5, targetRotationX));

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    // Touch support
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
      targetRotationX = Math.max(-0.4, Math.min(0.5, targetRotationX));

      previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domElement.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onMouseUp);

    // 8. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Check dynamic updates from parent
      if (stateRef.current.mood !== mood) {
        updateMood(stateRef.current.mood);
      }

      // Smooth Lerp Rotation
      if (autoRotate && !isDragging) {
        targetRotationY += 0.006;
      }

      petGroup.rotation.y += (targetRotationY - petGroup.rotation.y) * 0.08;
      petGroup.rotation.x += (targetRotationX - petGroup.rotation.x) * 0.08;

      // Subtle biological floating bob
      if (floatAnimation) {
        petGroup.position.y = Math.sin(elapsedTime * 2.2) * 0.06;
      }

      // Working state: histogram bars lively dance
      if (stateRef.current.mood === 'trabajando') {
        const wave = Math.sin(elapsedTime * 6);
        leftEyeMeshes[1].scale.y = (2.5 + wave * 0.6) * UNIT_H;
        rightEyeMeshes[1].scale.y = (2.5 - wave * 0.6) * UNIT_H;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Handling
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // 10. Cleanup
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
      chassisGeo.dispose();
      screenGeo.dispose();
      armGeo.dispose();
      footGeo.dispose();
      stemGeo.dispose();
      antennaBoxGeo.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
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
