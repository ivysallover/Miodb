import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

export type MioState = 'reposo' | 'trabajando' | 'celebrando' | 'anomalia' | 'durmiendo';
export type MioMaterialVariant = 'violeta' | 'titanio' | 'cromo_negro';

export interface MioProps {
  state?: MioState;
  material?: MioMaterialVariant;
  className?: string;
  autoRotate?: boolean;
  interactive?: boolean;
  enableBloom?: boolean;
  showFloor?: boolean;
  backgroundColor?: string | 'transparent';
  cameraDistance?: number;
  cameraTargetY?: number;
  cameraAzimuth?: number;
  cameraElevation?: number;
  onLoaded?: () => void;
}

// In-memory cache for loaded GLTF scenes to allow instant state changes
const gltfSceneCache = new Map<string, THREE.Group>();
const gltfLoader = new GLTFLoader();

/**
 * Resolves GLB file path for each state and material combination.
 */
function getGlbFilePath(state: MioState, material: MioMaterialVariant): string {
  if (state === 'reposo' && material === 'titanio') {
    return '/models/mio_reposo_titanio.glb';
  }
  if (state === 'reposo' && material === 'cromo_negro') {
    return '/models/mio_reposo_cromo_negro.glb';
  }
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

/**
 * Creates studio HDR environment map for realistic reflections.
 */
function createPhotographicStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.WebGLRenderTarget {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const bgGrad = ctx.createLinearGradient(0, 0, 0, 512);
  bgGrad.addColorStop(0, '#23212E');
  bgGrad.addColorStop(0.5, '#12111C');
  bgGrad.addColorStop(1, '#090810');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 512);

  // Softbox 1: Key overhead softbox (calibrated to soft studio sheen)
  const topGrad = ctx.createRadialGradient(400, 120, 10, 400, 120, 260);
  topGrad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
  topGrad.addColorStop(0.4, 'rgba(235, 240, 255, 0.35)');
  topGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(100, 0, 600, 260);

  // Softbox 2: Left edge specular strip
  const leftGrad = ctx.createLinearGradient(60, 0, 220, 0);
  leftGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  leftGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.45)');
  leftGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = leftGrad;
  ctx.fillRect(60, 80, 160, 360);

  // Softbox 3: Subtle ground bounce
  const bottomGrad = ctx.createLinearGradient(0, 460, 0, 512);
  bottomGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  bottomGrad.addColorStop(1, 'rgba(246, 246, 242, 0.15)');
  ctx.fillStyle = bottomGrad;
  ctx.fillRect(0, 450, 1024, 62);

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
 * MIO 3D Master Component.
 * Faithfully matches the exact reference plate (mio-pet-3d-plate.png).
 */
export const Mio: React.FC<MioProps> = ({
  state = 'reposo',
  material = 'violeta',
  className = '',
  autoRotate = false,
  interactive = true,
  enableBloom = true,
  showFloor = true,
  backgroundColor = '#F6F6F2',
  cameraDistance,
  cameraTargetY,
  cameraAzimuth,
  cameraElevation,
  onLoaded,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const stateRef = useRef({ state, material });
  stateRef.current = { state, material };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isDisposed = false;
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 300;

    // 1. Scene background (supports transparent or custom color)
    const isTransparent = backgroundColor === 'transparent';
    const scene = new THREE.Scene();
    if (!isTransparent) {
      scene.background = new THREE.Color(backgroundColor);
    }

    // 2. Camera Setup: 85mm lens equivalent (FOV ~17°)
    // Target at (0, targetY, 0)
    const dist = cameraDistance ?? 7.2;
    const targetY = cameraTargetY ?? 0.85;
    const camera = new THREE.PerspectiveCamera(17, width / height, 0.1, 50);
    const elevRad = THREE.MathUtils.degToRad(cameraElevation ?? 13);
    const azimRad = THREE.MathUtils.degToRad(cameraAzimuth ?? 32);

    const baseCamX = dist * Math.cos(elevRad) * Math.sin(azimRad);
    const baseCamY = targetY + dist * Math.sin(elevRad);
    const baseCamZ = dist * Math.cos(elevRad) * Math.cos(azimRad);

    camera.position.set(baseCamX, baseCamY, baseCamZ);
    camera.lookAt(0, targetY, 0);

    // 3. WebGL Renderer with ACES Filmic & sRGB Color Space
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: isTransparent,
      powerPreference: 'high-performance',
      stencil: false,
    });
    if (isTransparent) {
      renderer.setClearColor(0x000000, 0);
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.94;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Strict absolute positioning to fill container without overflow
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    container.appendChild(renderer.domElement);

    // 4. Studio Environment Reflections (immediate procedural fallback + HDR upgrade)
    let envMapTarget: THREE.WebGLRenderTarget | null = null;
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    // Instant photographic studio environment so materials reflect immediately
    envMapTarget = createPhotographicStudioEnvironment(renderer);
    scene.environment = envMapTarget.texture;

    const rgbeLoader = new RGBELoader();
    rgbeLoader.load(
      '/models/mio_env_three.hdr',
      (texture) => {
        if (isDisposed) {
          texture.dispose();
          return;
        }
        envMapTarget?.dispose();
        envMapTarget = pmremGenerator.fromEquirectangular(texture);
        scene.environment = envMapTarget.texture;
        texture.dispose();
      },
      undefined,
      () => {
        // Fallback already assigned
      }
    );

    // 5. Lighting Setup (Accurately calibrated against mio-pet-3d-plate.png)
    // Key Light: Low front-left position [-5.5, 4.0, 3.8], throws long soft shadow to the right
    const keyLight = new THREE.DirectionalLight('#FFF8F2', isTransparent ? 2.2 : 1.85);
    keyLight.position.set(-5.5, 4.0, 3.8);
    const lightTarget = new THREE.Object3D();
    lightTarget.position.set(0, targetY, 0);
    scene.add(lightTarget);
    keyLight.target = lightTarget;
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.left = -3.5;
    keyLight.shadow.camera.right = 3.5;
    keyLight.shadow.camera.top = 3.5;
    keyLight.shadow.camera.bottom = -3.5;
    keyLight.shadow.camera.near = 1.0;
    keyLight.shadow.camera.far = 18.0;
    keyLight.shadow.bias = -0.0003;
    keyLight.shadow.radius = 3.5;
    scene.add(keyLight);

    // Fill Light: Soft and faint from right [5.5, 2.0, 2.0] so right flank remains very dark navy
    const fillLight = new THREE.DirectionalLight('#3A4058', isTransparent ? 0.45 : 0.22);
    fillLight.position.set(5.5, 2.0, 2.0);
    scene.add(fillLight);

    // Top Light: Overhead light giving gentle sheen to head and antenna cube
    const topLight = new THREE.DirectionalLight('#EDF2FC', 0.42);
    topLight.position.set(0, 8.0, 0.8);
    scene.add(topLight);

    // Rim Light: Back rim defining outer edges
    const rimLight = new THREE.DirectionalLight('#A0B0CE', 0.45);
    rimLight.position.set(1.8, 3.2, -4.5);
    scene.add(rimLight);

    // Ambient light: Soft baseline (elevated for transparent so model is vivid)
    const ambientLight = new THREE.AmbientLight('#FFFFFF', isTransparent ? 0.85 : 0.25);
    scene.add(ambientLight);

    // 6. Floor System: Seamless Infinite Reflector + Shadow Catcher + Contact Shadows
    let reflectorMesh: Reflector | null = null;
    let shadowPlaneMesh: THREE.Mesh | null = null;
    let contactAOMesh: THREE.Mesh | null = null;

    if (showFloor) {
      // A. Real planar reflection on cream floor with radial falloff (80x80 covers entire viewport)
      const reflectorGeo = new THREE.PlaneGeometry(80, 80);
      const customReflectorShader = {
        name: 'SoftReflectorShader',
        uniforms: {
          color: { value: new THREE.Color('#F6F6F2') },
          tDiffuse: { value: null },
          textureMatrix: { value: new THREE.Matrix4() },
        },
        vertexShader: `
          uniform mat4 textureMatrix;
          varying vec4 vUv;
          varying vec2 vLocalPos;
          void main() {
            vLocalPos = position.xy;
            vUv = textureMatrix * vec4( position, 1.0 );
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
          }
        `,
        fragmentShader: `
          uniform vec3 color;
          uniform sampler2D tDiffuse;
          varying vec4 vUv;
          varying vec2 vLocalPos;
          void main() {
            vec4 refl = texture2DProj( tDiffuse, vUv );
            float dist = length(vLocalPos);
            // Smooth radial fade out of reflection: strictly underneath the character
            float fade = smoothstep(2.4, 0.05, dist) * 0.20;
            vec3 finalColor = mix(color, refl.rgb, fade);
            gl_FragColor = vec4( finalColor, 1.0 );
          }
        `,
      };

      reflectorMesh = new Reflector(reflectorGeo, {
        clipBias: 0.003,
        textureWidth: 1024,
        textureHeight: 1024,
        color: '#F6F6F2',
        shader: customReflectorShader,
      });
      reflectorMesh.rotation.x = -Math.PI / 2;
      reflectorMesh.position.y = -0.002;
      scene.add(reflectorMesh);

      // B. Directional Shadow Receiver (80x80 seamless)
      const shadowPlaneGeo = new THREE.PlaneGeometry(80, 80);
      const shadowMat = new THREE.ShadowMaterial({
        opacity: 0.20,
        color: new THREE.Color('#100C1E'),
      });
      shadowPlaneMesh = new THREE.Mesh(shadowPlaneGeo, shadowMat);
      shadowPlaneMesh.rotation.x = -Math.PI / 2;
      shadowPlaneMesh.position.y = 0.001;
      shadowPlaneMesh.receiveShadow = true;
      scene.add(shadowPlaneMesh);

      // C. Contact Ambient Occlusion directly underneath the two feet
      const aoCanvas = document.createElement('canvas');
      aoCanvas.width = 256;
      aoCanvas.height = 256;
      const aoCtx = aoCanvas.getContext('2d')!;

      // Foot L AO
      const gradL = aoCtx.createRadialGradient(88, 128, 8, 88, 128, 55);
      gradL.addColorStop(0, 'rgba(10, 8, 18, 0.72)');
      gradL.addColorStop(0.5, 'rgba(10, 8, 18, 0.28)');
      gradL.addColorStop(1, 'rgba(10, 8, 18, 0)');
      aoCtx.fillStyle = gradL;
      aoCtx.fillRect(0, 0, 160, 256);

      // Foot R AO
      const gradR = aoCtx.createRadialGradient(168, 128, 8, 168, 128, 55);
      gradR.addColorStop(0, 'rgba(10, 8, 18, 0.72)');
      gradR.addColorStop(0.5, 'rgba(10, 8, 18, 0.28)');
      gradR.addColorStop(1, 'rgba(10, 8, 18, 0)');
      aoCtx.fillStyle = gradR;
      aoCtx.fillRect(110, 0, 146, 256);

      const aoTexture = new THREE.CanvasTexture(aoCanvas);
      const contactGeo = new THREE.PlaneGeometry(1.6, 1.2);
      const contactMat = new THREE.MeshBasicMaterial({
        map: aoTexture,
        transparent: true,
        depthWrite: false,
      });
      contactAOMesh = new THREE.Mesh(contactGeo, contactMat);
      contactAOMesh.rotation.x = -Math.PI / 2;
      contactAOMesh.position.set(0, 0.002, 0);
      scene.add(contactAOMesh);
    }

    // 7. Post-Processing: Selective Bloom Pass
    let composer: EffectComposer | null = null;
    if (enableBloom) {
      composer = new EffectComposer(renderer);
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);

      // Strict threshold (0.98): prevents #F6F6F2 background (~0.96) and body from blooming
      // Keeps emissives blooming crisply without burning out
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        0.22,  // Delicate, soft glow intensity
        0.24,  // Localized radius hugging pixel histogram steps
        0.98   // Threshold: background never blooms; emissives glow softly
      );
      composer.addPass(bloomPass);

      const outputPass = new OutputPass();
      composer.addPass(outputPass);
    }

    // 8. Model Container
    const characterGroup = new THREE.Group();
    scene.add(characterGroup);

    // --- EXACT MATERIAL FACTORIES ---
    const getChassisMarcoMaterial = (mat: MioMaterialVariant) => {
      switch (mat) {
        case 'titanio':
          return new THREE.MeshStandardMaterial({
            color: '#8E8A9A',
            metalness: 1.0,
            roughness: 0.32,
          });
        case 'cromo_negro':
          return new THREE.MeshStandardMaterial({
            color: '#2A2733',
            metalness: 1.0,
            roughness: 0.16,
          });
        case 'violeta':
        default:
          return new THREE.MeshStandardMaterial({
            color: '#6838E2', // Vibrant electric violet matching reference plate swatch
            metalness: 0.38,   // Anodized brushed metallic luster
            roughness: 0.24,
          });
      }
    };

    const getChassisCuerpoMaterial = (mat: MioMaterialVariant) => {
      switch (mat) {
        case 'titanio':
          return new THREE.MeshStandardMaterial({
            color: '#4A4756',
            metalness: 0.8,
            roughness: 0.34,
          });
        case 'cromo_negro':
          return new THREE.MeshStandardMaterial({
            color: '#15131C',
            metalness: 0.9,
            roughness: 0.20,
          });
        case 'violeta':
        default:
          return new THREE.MeshStandardMaterial({
            color: '#361A88', // Deep royal violet body
            metalness: 0.45,
            roughness: 0.28,
          });
      }
    };

    const getFeetMaterial = (mat: MioMaterialVariant) => {
      switch (mat) {
        case 'titanio':
          return new THREE.MeshStandardMaterial({
            color: '#3F3C49',
            metalness: 0.8,
            roughness: 0.34,
          });
        case 'cromo_negro':
          return new THREE.MeshStandardMaterial({
            color: '#17151D',
            metalness: 0.9,
            roughness: 0.20,
          });
        case 'violeta':
        default:
          return new THREE.MeshStandardMaterial({
            color: '#321882',
            metalness: 0.45,
            roughness: 0.28,
          });
      }
    };

    const blackChromeMaterial = new THREE.MeshStandardMaterial({
      color: '#0E0C19',
      metalness: 1.0,
      roughness: 0.16,
    });

    const obsidianGlassMaterial = new THREE.MeshStandardMaterial({
      color: '#07060D',
      metalness: 0.05,
      roughness: 0.35,
    });

    const standardLimeEmissiveMaterial = new THREE.MeshStandardMaterial({
      color: '#BDF559',
      emissive: '#BDF559',
      emissiveIntensity: 1.12, // Pure crisp neon lime without burning yellow
      roughness: 0.18,
    });

    const sleepOliveEmissiveMaterial = new THREE.MeshStandardMaterial({
      color: '#5B7A2E',
      emissive: '#5B7A2E',
      emissiveIntensity: 1.05,
      roughness: 0.30,
    });

    const anomaliaSpikeWhiteMaterial = new THREE.MeshStandardMaterial({
      color: '#F6F6F2',
      emissive: '#F6F6F2',
      emissiveIntensity: 1.50,
      roughness: 0.10,
    });

    const antennaCubeStandardMaterial = new THREE.MeshStandardMaterial({
      color: '#C8F065', // Fresh bright pastel lime
      emissive: '#A6E535',
      emissiveIntensity: 0.04,
      metalness: 0.05,
      roughness: 0.22,
    });

    const antennaCubeAnomaliaMaterial = new THREE.MeshStandardMaterial({
      color: '#E4B8FF',
      emissive: '#E4B8FF',
      emissiveIntensity: 1.15,
      roughness: 0.25,
    });

    const antennaCubeSleepMaterial = new THREE.MeshStandardMaterial({
      color: '#7C9A45',
      emissive: '#7C9A45',
      emissiveIntensity: 0.05,
      roughness: 0.28,
    });

    const inactiveMouthBarMaterial = new THREE.MeshStandardMaterial({
      color: '#3B3566',
      metalness: 0.0,
      roughness: 0.50,
      emissive: '#000000',
      emissiveIntensity: 0.0,
    });

    // 9. Load and Apply Materials by Object Name
    const setupModel = (model: THREE.Group) => {
      while (characterGroup.children.length > 0) {
        characterGroup.remove(characterGroup.children[0]);
      }

      model.position.set(0, 0, 0); // Model feet are at y=0, perfectly resting on floor

      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          const name = mesh.name || '';

          // A. Chassis frame, body, and feet
          if (name === 'chasis_marco' || name === 'chasis') {
            mesh.material = getChassisMarcoMaterial(material);
          } else if (name === 'chasis_cuerpo') {
            mesh.material = getChassisCuerpoMaterial(material);
          } else if (name === 'pie_L' || name === 'pie_R') {
            mesh.material = getFeetMaterial(material);
          }
          // B. Articulations, antenna stem, speaker slits, celebrate ear tabs
          else if (
            name.startsWith('articulacion_') ||
            name === 'antena_tallo' ||
            name.startsWith('rejilla_') ||
            name.startsWith('antenita_')
          ) {
            mesh.material = blackChromeMaterial;
          }
          // C. Obsidian glass screen
          else if (name === 'pantalla_vidrio' || name === 'pantalla') {
            mesh.material = obsidianGlassMaterial;
          }
          // D. Eye histogram bars
          else if (name.startsWith('ojo_')) {
            if (state === 'durmiendo') {
              mesh.material = sleepOliveEmissiveMaterial;
            } else if (state === 'anomalia' && name === 'ojo_R_3') {
              mesh.material = anomaliaSpikeWhiteMaterial;
            } else {
              mesh.material = standardLimeEmissiveMaterial;
            }
          }
          // E. Mouth
          else if (name.startsWith('boca')) {
            if (state === 'trabajando' && name === 'boca_2') {
              mesh.material = inactiveMouthBarMaterial;
            } else if (state === 'durmiendo') {
              mesh.material = sleepOliveEmissiveMaterial;
            } else {
              mesh.material = standardLimeEmissiveMaterial;
            }
          }
          // F. Status Pilot light
          else if (name === 'piloto') {
            mesh.material = state === 'durmiendo' ? sleepOliveEmissiveMaterial : standardLimeEmissiveMaterial;
          }
          // G. Antenna Cube
          else if (name === 'antena_cubo') {
            if (state === 'anomalia') {
              mesh.material = antennaCubeAnomaliaMaterial;
            } else if (state === 'durmiendo') {
              mesh.material = antennaCubeSleepMaterial;
            } else {
              mesh.material = antennaCubeStandardMaterial;
            }
          }
        }
      });

      characterGroup.add(model);
      setIsLoading(false);
      onLoaded?.();
    };

    const filePath = getGlbFilePath(state, material);
    const cached = gltfSceneCache.get(filePath);

    if (cached) {
      setupModel(cached.clone(true));
    } else {
      setIsLoading(true);
      gltfLoader.load(
        filePath,
        (gltf) => {
          if (isDisposed) return;
          gltfSceneCache.set(filePath, gltf.scene);
          setupModel(gltf.scene.clone(true));
        },
        undefined,
        (err) => {
          console.error(`Failed to load ${filePath}:`, err);
          if (isDisposed) return;
          setIsLoading(false);
        }
      );
    }

    // 10. Interactive 360° Mouse Controls
    let isDragging = false;
    let previousMouse = { x: 0, y: 0 };
    let rotY = 0;
    let rotX = 0;

    const onMouseDown = (e: MouseEvent) => {
      if (!interactive) return;
      isDragging = true;
      previousMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !interactive) return;
      const dx = e.clientX - previousMouse.x;
      const dy = e.clientY - previousMouse.y;

      rotY += dx * 0.007;
      rotX += dy * 0.005;
      rotX = Math.max(-0.25, Math.min(0.35, rotX));

      previousMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // 11. Animation Render Loop
    let animationFrameId: number;

    const renderLoop = () => {
      animationFrameId = requestAnimationFrame(renderLoop);

      if (autoRotate && !isDragging) {
        rotY += 0.008;
      }

      characterGroup.rotation.y += (rotY - characterGroup.rotation.y) * 0.08;
      characterGroup.rotation.x += (rotX - characterGroup.rotation.x) * 0.08;

      if (composer) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }
    };

    renderLoop();

    const handleResize = () => {
      if (!container || isDisposed) return;
      const w = container.clientWidth || 300;
      const h = container.clientHeight || 300;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer?.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);
    requestAnimationFrame(() => handleResize());

    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      envMapTarget?.dispose();
      composer?.dispose();
    };
  }, [state, material, autoRotate, interactive, enableBloom, showFloor, backgroundColor, cameraDistance, cameraTargetY, cameraAzimuth, cameraElevation]);

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
            <span>Cargando {state}...</span>
          </div>
        </div>
      )}
    </div>
  );
};
