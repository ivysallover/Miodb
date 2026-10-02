import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useMioStore } from '@/utils/useMioStore';
import { startGatedLoop } from '@/lib/renderGate';

interface DitherGeometricShapeProps {
  className?: string;
  shapeType?: 'torusKnot' | 'icosahedron' | 'hypercube';
  size?: number;
  colorMode?: 'dark' | 'light';
  palette?: 'lime' | 'violet' | 'obsidianOnLime';
}

/**
 * DitherGeometricShape:
 * High-performance Three.js 3D WebGL component that renders complex mathematical
 * figures (Torus Knot, Geodesic Polyhedron) as animated 3D pixel art / dither stipple point clouds.
 */
export const DitherGeometricShape: React.FC<DitherGeometricShapeProps> = ({
  className = '',
  shapeType = 'torusKnot',
  size = 400,
  colorMode,
  palette = 'lime',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useMioStore((s) => s.theme);
  const isDark = colorMode ? colorMode === 'dark' : theme === 'dark';

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || size;
    const height = container.clientHeight || size;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 8.8);

    // 2. High-performance WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: false, // Intentional pixel-art crispness
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // 3. Generate 3D Mathematical Figure with Stippled Pixel Art Points
    let baseGeometry: THREE.BufferGeometry;
    if (shapeType === 'torusKnot') {
      // Calibrated radius to fit comfortably within column without text overlap
      baseGeometry = new THREE.TorusKnotGeometry(1.4, 0.42, 200, 32, 2, 3);
    } else if (shapeType === 'icosahedron') {
      baseGeometry = new THREE.IcosahedronGeometry(2.0, 5);
    } else {
      baseGeometry = new THREE.TorusGeometry(1.8, 0.55, 30, 180);
    }

    const posAttr = baseGeometry.attributes.position;
    const vertexCount = posAttr.count;

    // Sample vertices and add discrete dither quantization
    const ditherPositions = new Float32Array(vertexCount * 3);
    const ditherColors = new Float32Array(vertexCount * 3);
    const ditherSizes = new Float32Array(vertexCount);

    const isObsidianOnLime = palette === 'obsidianOnLime';
    const isLime = palette === 'lime';

    // Signature MIO Palettes:
    // obsidianOnLime: High-contrast deep obsidian and emerald stipple for neon lime background
    // Verde MIO: Neon lime (#bdf559) with crisp white-lime specular and deep emerald forest shadows
    // Violet: MIO classic obsidian iris (#7647eb / #602cd1)
    const highlightColor = isObsidianOnLime
      ? new THREE.Color('#ffffff')
      : isLime
      ? new THREE.Color('#f0ffe0')
      : (isDark ? new THREE.Color('#d8b4fe') : new THREE.Color('#7c3aed'));

    const accentLime = isObsidianOnLime
      ? new THREE.Color('#000000')
      : isLime
      ? new THREE.Color('#bdf559')
      : (isDark ? new THREE.Color('#bdf559') : new THREE.Color('#10b981'));

    const primaryColor = isObsidianOnLime
      ? new THREE.Color('#090714')
      : isLime
      ? new THREE.Color('#84cc16')
      : (isDark ? new THREE.Color('#7647eb') : new THREE.Color('#602cd1'));

    const midShadowColor = isObsidianOnLime
      ? new THREE.Color('#047857')
      : isLime
      ? new THREE.Color('#047857')
      : (isDark ? new THREE.Color('#4338ca') : new THREE.Color('#3730a3'));

    const shadowColor = isObsidianOnLime
      ? new THREE.Color('#022c22')
      : isLime
      ? new THREE.Color('#022c22')
      : (isDark ? new THREE.Color('#1e1238') : new THREE.Color('#312e81'));

    // Directional light vector for real-time 3D halftone stippling
    const lightDir = new THREE.Vector3(0.5, 0.8, 1.0).normalize();

    for (let i = 0; i < vertexCount; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);

      // Quantize coordinates to discrete pixel grid (authentic 3D pixel art look)
      const q = 0.045;
      ditherPositions[i * 3 + 0] = Math.round(x / q) * q;
      ditherPositions[i * 3 + 1] = Math.round(y / q) * q;
      ditherPositions[i * 3 + 2] = Math.round(z / q) * q;

      // Normal approximation from origin or local position
      const normal = new THREE.Vector3(x, y, z).normalize();
      const dot = Math.max(0, normal.dot(lightDir));

      let pColor: THREE.Color;
      if (dot > 0.72) {
        // Specular highlight
        pColor = highlightColor.clone().lerp(accentLime, (1.0 - dot) * 3.5);
        ditherSizes[i] = 1.35;
      } else if (dot > 0.38) {
        // Body midtone
        pColor = accentLime.clone().lerp(primaryColor, (0.72 - dot) * 2.9);
        ditherSizes[i] = 1.05;
      } else if (dot > 0.14) {
        // Shading transition
        pColor = primaryColor.clone().lerp(midShadowColor, (0.38 - dot) * 4.1);
        ditherSizes[i] = 0.85;
      } else {
        // Core shadow
        pColor = midShadowColor.clone().lerp(shadowColor, (0.14 - dot) * 7.0);
        ditherSizes[i] = 0.7;
      }

      ditherColors[i * 3 + 0] = pColor.r;
      ditherColors[i * 3 + 1] = pColor.g;
      ditherColors[i * 3 + 2] = pColor.b;
    }

    const ditherGeometry = new THREE.BufferGeometry();
    ditherGeometry.setAttribute('position', new THREE.BufferAttribute(ditherPositions, 3));
    ditherGeometry.setAttribute('color', new THREE.BufferAttribute(ditherColors, 3));

    // Custom Square Pixel Art Texture
    const makePixelTexture = () => {
      const c = document.createElement('canvas');
      c.width = 16;
      c.height = 16;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        // Sharp square pixel block (Image 1 & 3 pixel art aesthetic)
        ctx.fillRect(1, 1, 14, 14);
      }
      return new THREE.CanvasTexture(c);
    };

    const pixelTexture = makePixelTexture();
    pixelTexture.magFilter = THREE.NearestFilter;
    pixelTexture.minFilter = THREE.NearestFilter;

    const pointsMaterial = new THREE.PointsMaterial({
      size: 0.11,
      vertexColors: true,
      map: pixelTexture,
      transparent: true,
      opacity: isDark ? 0.95 : 0.9,
      alphaTest: 0.15,
      blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
    });

    const pointsMesh = new THREE.Points(ditherGeometry, pointsMaterial);
    mainGroup.add(pointsMesh);

    // 4. Subtle Outer Pixel Halo / Data Dust
    const haloCount = 600;
    const haloPositions = new Float32Array(haloCount * 3);
    const haloColors = new Float32Array(haloCount * 3);

    for (let i = 0; i < haloCount; i++) {
      const rad = 2.8 + Math.random() * 1.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      haloPositions[i * 3 + 0] = rad * Math.sin(phi) * Math.cos(theta);
      haloPositions[i * 3 + 1] = rad * Math.sin(phi) * Math.sin(theta);
      haloPositions[i * 3 + 2] = rad * Math.cos(phi);

      const hCol = Math.random() > 0.6 ? accentLime : primaryColor;
      haloColors[i * 3 + 0] = hCol.r;
      haloColors[i * 3 + 1] = hCol.g;
      haloColors[i * 3 + 2] = hCol.b;
    }

    const haloGeometry = new THREE.BufferGeometry();
    haloGeometry.setAttribute('position', new THREE.BufferAttribute(haloPositions, 3));
    haloGeometry.setAttribute('color', new THREE.BufferAttribute(haloColors, 3));

    const haloMaterial = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      map: pixelTexture,
      transparent: true,
      opacity: isDark ? 0.6 : 0.45,
      blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
    });

    const haloMesh = new THREE.Points(haloGeometry, haloMaterial);
    mainGroup.add(haloMesh);

    // 5. Mouse Parallax & Kinetics
    let mouseX = 0;
    let mouseY = 0;
    let scrollYOffset = 0;

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    };

    const onScroll = () => {
      scrollYOffset = window.scrollY * 0.0018;
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    // 6. Animation Loop (Silky 60fps)
    let idleRotation = 0;

    // Gated: pauses while off-screen / tab hidden, resumes automatically.
    const stopLoop = startGatedLoop(container, () => {
      idleRotation += 0.005;

      // Compound multi-axis rotation
      mainGroup.rotation.y = idleRotation + scrollYOffset + mouseX * 0.4;
      mainGroup.rotation.x = Math.sin(idleRotation * 0.5) * 0.25 + mouseY * 0.35;
      mainGroup.rotation.z = Math.cos(idleRotation * 0.3) * 0.15;

      haloMesh.rotation.y = -idleRotation * 0.4;

      renderer.render(scene, camera);
    });

    // 7. Resize Handler
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || size;
      const h = container.clientHeight || size;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', onResize);

    return () => {
      stopLoop();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);

      baseGeometry.dispose();
      ditherGeometry.dispose();
      haloGeometry.dispose();
      pointsMaterial.dispose();
      haloMaterial.dispose();
      pixelTexture.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isDark, shapeType, size]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full min-h-[200px] sm:min-h-[240px] flex items-center justify-center relative select-none pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
};

export default DitherGeometricShape;
