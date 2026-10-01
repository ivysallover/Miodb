import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MioPetMood, MioPetMaterial } from './MioPet2D';

export interface MioPet3DProps {
  mood?: MioPetMood;
  material?: MioPetMaterial;
  className?: string;
  autoRotate?: boolean;
  interactive?: boolean;
  floatAnimation?: boolean;
  modelSource?: 'glb' | 'procedural';
  onLoaded?: () => void;
}

// Global cache for parsed GLTF scenes to allow instantaneous state changes
const glbModelCache = new Map<string, THREE.Group>();
const gltfLoader = new GLTFLoader();

const GLB_FILE_MAP: Record<MioPetMood, string> = {
  reposo: '/models/mio_reposo.glb',
  trabajando: '/models/mio_trabajando.glb',
  celebrando: '/models/mio_celebrando.glb',
  anomalia: '/models/mio_anomalia.glb',
  durmiendo: '/models/mio_durmiendo.glb',
};

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
 * Supports loading genuine Blender GLB models with PBR Studio Lighting
 * and falling back to procedural chamfer geometry if needed.
 */
export const MioPet3D: React.FC<MioPet3DProps> = ({
  mood = 'reposo',
  material = 'violet',
  className = '',
  autoRotate = false,
  interactive = true,
  floatAnimation = true,
  modelSource = 'glb',
  onLoaded,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ mood, material, modelSource });
  stateRef.current = { mood, material, modelSource };
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isDisposed = false;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    // 1. Scene & Camera Setup (calibrated to frame specimen)
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(0, 0.25, 7.2);

    // 2. WebGL Renderer with ACES Filmic Tone Mapping & High Precision
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

    // 6. Materials Calibration Helper
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
            color: '#4C249E',
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

    const limeEmissiveMaterial = new THREE.MeshStandardMaterial({
      color: '#4D9E0D',
      emissive: '#98EC2A',
      emissiveIntensity: 2.6,
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

    const whiteStrobeEmissiveMaterial = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      emissive: '#FFFFFF',
      emissiveIntensity: 3.5,
      roughness: 0.08,
    });

    // 7. Pet Group Container
    const petGroup = new THREE.Group();
    scene.add(petGroup);

    // Initial 3D isometric turn (matching LÁMINA 3D hero angle)
    petGroup.rotation.y = 0.40;
    petGroup.rotation.x = 0.08;

    // Track meshes for animation loop
    let eyeBarsLeft: THREE.Mesh[] = [];
    let eyeBarsRight: THREE.Mesh[] = [];

    // --- SETUP GLB MODEL ---
    const setupGlbModel = (loadedScene: THREE.Group) => {
      // Clear previous children
      while (petGroup.children.length > 0) {
        petGroup.remove(petGroup.children[0]);
      }

      eyeBarsLeft = [];
      eyeBarsRight = [];

      // Scale and position based on Blender geometry (height ~1.8u, feet at y=0)
      const scale = 1.68;
      loadedScene.scale.set(scale, scale, scale);
      loadedScene.position.set(0, -1.64, 0); // Feet rest exactly on shadow contact plane

      loadedScene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          const name = mesh.name || '';

          // A. Material Overrides for Chasis & Feet if customized
          if (name === 'chasis') {
            mesh.material = getChassisMaterial(material);
          } else if (name === 'pie_L' || name === 'pie_R') {
            mesh.material = getFeetMaterial(material);
          } else if (name === 'pantalla') {
            mesh.material = obsidianGlassMaterial;
          } else if (name.startsWith('articulacion_') || name === 'antena_tallo' || name.startsWith('rejilla_')) {
            mesh.material = blackChromeMaterial;
          } else if (name.startsWith('ojo_L_')) {
            mesh.material = limeEmissiveMaterial;
            eyeBarsLeft.push(mesh);
          } else if (name.startsWith('ojo_R_')) {
            mesh.material = limeEmissiveMaterial;
            eyeBarsRight.push(mesh);
          } else if (name === 'boca' || name === 'piloto') {
            mesh.material = limeEmissiveMaterial;
          } else if (name === 'antena_cubo') {
            if (mood === 'anomalia') {
              mesh.material = whiteStrobeEmissiveMaterial;
            } else if (mood === 'durmiendo') {
              mesh.material = dimOliveEmissiveMaterial;
            } else {
              mesh.material = limeEmissiveMaterial;
            }
          } else {
            // Check if existing material has emissive
            if (mesh.material instanceof THREE.MeshStandardMaterial) {
              if (mesh.material.emissive && mesh.material.emissive.getHex() > 0) {
                mesh.material.emissiveIntensity = 2.4;
              }
            }
          }
        }
      });

      petGroup.add(loadedScene);
      setIsLoading(false);
      onLoaded?.();
    };

    // --- SETUP PROCEDURAL FALLBACK MODEL ---
    const setupProceduralModel = () => {
      while (petGroup.children.length > 0) {
        petGroup.remove(petGroup.children[0]);
      }

      const U = 0.21;
      const chassisGeo = createChamferBox(15 * U, 11 * U, 6.5 * U, 0.28 * U);
      const chassisMesh = new THREE.Mesh(chassisGeo, getChassisMaterial(material));
      chassisMesh.castShadow = true;
      chassisMesh.receiveShadow = true;
      petGroup.add(chassisMesh);

      const screenGeo = createChamferBox(11 * U, 8 * U, 0.3 * U, 0.12 * U);
      const screenMesh = new THREE.Mesh(screenGeo, obsidianGlassMaterial);
      screenMesh.position.set(0, 0.1 * U, (3.25 * U) - 0.08);
      screenMesh.receiveShadow = true;
      petGroup.add(screenMesh);

      const armGeo = createChamferBox(1 * U, 3 * U, 3 * U, 0.1 * U);
      const leftArm = new THREE.Mesh(armGeo, blackChromeMaterial);
      leftArm.position.set(-((15 * U) / 2 + (0.5 * U)), 0.2 * U, 0);
      leftArm.castShadow = true;
      petGroup.add(leftArm);

      const rightArm = new THREE.Mesh(armGeo, blackChromeMaterial);
      rightArm.position.set((15 * U) / 2 + (0.5 * U), 0.2 * U, 0);
      rightArm.castShadow = true;
      petGroup.add(rightArm);

      const footGeo = createChamferBox(3 * U, 2 * U, 4 * U, 0.14 * U);
      const leftFoot = new THREE.Mesh(footGeo, getFeetMaterial(material));
      leftFoot.position.set(-3.5 * U, -((11 * U) / 2 + (1 * U)), 0);
      leftFoot.castShadow = true;
      petGroup.add(leftFoot);

      const rightFoot = new THREE.Mesh(footGeo, getFeetMaterial(material));
      rightFoot.position.set(3.5 * U, -((11 * U) / 2 + (1 * U)), 0);
      rightFoot.castShadow = true;
      petGroup.add(rightFoot);

      const stemGeo = createChamferBox(1 * U, 2 * U, 1 * U, 0.08 * U);
      const stem = new THREE.Mesh(stemGeo, blackChromeMaterial);
      stem.position.set(0, (11 * U) / 2 + (1 * U), 0);
      stem.castShadow = true;
      petGroup.add(stem);

      const antennaGeo = createChamferBox(3 * U, 3 * U, 3 * U, 0.2 * U);
      const antennaMesh = new THREE.Mesh(
        antennaGeo,
        mood === 'anomalia' ? whiteStrobeEmissiveMaterial : mood === 'durmiendo' ? dimOliveEmissiveMaterial : limeEmissiveMaterial
      );
      antennaMesh.position.set(0, (11 * U) / 2 + 2 * U + (1.5 * U), 0);
      antennaMesh.castShadow = true;
      petGroup.add(antennaMesh);

      petGroup.position.set(0, 0, 0);
      setIsLoading(false);
      onLoaded?.();
    };

    // Load either GLB or Procedural
    if (modelSource === 'glb') {
      const glbUrl = GLB_FILE_MAP[mood] || GLB_FILE_MAP.reposo;
      const cached = glbModelCache.get(glbUrl);

      if (cached) {
        setupGlbModel(cached.clone(true));
      } else {
        setIsLoading(true);
        gltfLoader.load(
          glbUrl,
          (gltf) => {
            if (isDisposed) return;
            glbModelCache.set(glbUrl, gltf.scene);
            setupGlbModel(gltf.scene.clone(true));
          },
          undefined,
          (error) => {
            console.warn('Failed to load GLB model, using procedural fallback:', error);
            if (isDisposed) return;
            setupProceduralModel();
          }
        );
      }
    } else {
      setupProceduralModel();
    }

    // 8. Mouse & Touch 360° Interaction
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

      // Micro equalizer oscillation when working
      if (stateRef.current.mood === 'trabajando' && eyeBarsLeft.length >= 2 && eyeBarsRight.length >= 2) {
        const wave = Math.sin(elapsedTime * 8);
        eyeBarsLeft[1].scale.y = 1.0 + wave * 0.25;
        eyeBarsRight[1].scale.y = 1.0 - wave * 0.25;
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
      isDisposed = true;
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
      shadowGeo.dispose();
      shadowMat.dispose();
      aoPlaneGeo.dispose();
      aoTexture.dispose();
    };
  }, [mood, material, modelSource, autoRotate, interactive, floatAnimation]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative cursor-grab active:cursor-grabbing ${className}`}
      style={{ touchAction: 'none' }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-white text-[11px] font-mono">
            <span className="w-2 h-2 rounded-full bg-[#bdf559] animate-ping" />
            <span>Cargando GLB...</span>
          </div>
        </div>
      )}
    </div>
  );
};
