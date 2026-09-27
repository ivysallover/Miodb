import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useMioStore } from '@/utils/useMioStore';

interface MioDitherPlanetProps {
  className?: string;
}

export const MioDitherPlanet: React.FC<MioDitherPlanetProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useMioStore((s) => s.theme);
  const isDark = theme === 'dark';

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 600;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 8.5);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    // Group for mouse parallax & scroll rotation
    const planetGroup = new THREE.Group();
    // Tilt the entire planet system like Saturn
    planetGroup.rotation.z = -0.32;
    planetGroup.rotation.x = 0.28;
    scene.add(planetGroup);

    // 3. Generate Stippled / Dither Sphere Points (Fibonacci Sphere)
    const sphereCount = 4200;
    const spherePositions = new Float32Array(sphereCount * 3);
    const sphereColors = new Float32Array(sphereCount * 3);
    const sphereSizes = new Float32Array(sphereCount);

    const radius = 2.4;
    const phi = Math.PI * (Math.sqrt(5) - 1); // Golden ratio

    // Theme color palettes
    // Dark: Electric violet #7647eb & Lime #bdf559
    // Light: Deep violet #602cd1 & Vivid lime #84cc16
    const primaryColor = isDark ? new THREE.Color('#7647eb') : new THREE.Color('#602cd1');
    const secondaryColor = isDark ? new THREE.Color('#a78bfa') : new THREE.Color('#7c3aed');
    const accentColor = isDark ? new THREE.Color('#bdf559') : new THREE.Color('#4ade80');
    const darkEdgeColor = isDark ? new THREE.Color('#311075') : new THREE.Color('#431497');

    for (let i = 0; i < sphereCount; i++) {
      const y = 1 - (i / (sphereCount - 1)) * 2; // y goes from 1 to -1
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = phi * i;

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      // Add slight organic stipple jitter
      const jitter = (Math.random() - 0.5) * 0.04;
      spherePositions[i * 3] = (x + jitter) * radius;
      spherePositions[i * 3 + 1] = (y + jitter) * radius;
      spherePositions[i * 3 + 2] = (z + jitter) * radius;

      // Color shading based on normal & light angle (dither halftone effect)
      // Light coming from top-left front
      const lightFactor = Math.max(0, (x * 0.5 + y * 0.4 + z * 0.8) / 1.1);

      let pColor: THREE.Color;
      if (lightFactor > 0.82) {
        // High density highlight (Lime accent)
        pColor = accentColor.clone().lerp(secondaryColor, (1 - lightFactor) * 3);
        sphereSizes[i] = 1.35;
      } else if (lightFactor > 0.4) {
        pColor = secondaryColor.clone().lerp(primaryColor, (0.82 - lightFactor) * 2);
        sphereSizes[i] = 1.1;
      } else {
        pColor = primaryColor.clone().lerp(darkEdgeColor, (0.4 - lightFactor) * 2.5);
        sphereSizes[i] = 0.85;
      }

      sphereColors[i * 3] = pColor.r;
      sphereColors[i * 3 + 1] = pColor.g;
      sphereColors[i * 3 + 2] = pColor.b;
    }

    const sphereGeometry = new THREE.BufferGeometry();
    sphereGeometry.setAttribute('position', new THREE.BufferAttribute(spherePositions, 3));
    sphereGeometry.setAttribute('color', new THREE.BufferAttribute(sphereColors, 3));

    // 4. Generate Orbital Ring Points
    const ringCount = 5800;
    const ringPositions = new Float32Array(ringCount * 3);
    const ringColors = new Float32Array(ringCount * 3);

    const innerRadius = 3.2;
    const outerRadius = 5.2;

    for (let i = 0; i < ringCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      // Denser in the center band of the ring
      const rDist = Math.random();
      const r = innerRadius + (outerRadius - innerRadius) * Math.pow(rDist, 0.85);

      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = (Math.random() - 0.5) * 0.08; // Thin disk

      ringPositions[i * 3] = x;
      ringPositions[i * 3 + 1] = y;
      ringPositions[i * 3 + 2] = z;

      // Ring shading
      const ringAlpha = (r - innerRadius) / (outerRadius - innerRadius);
      const ringLight = Math.abs(Math.sin(angle + 0.8));
      
      const rColor = accentColor.clone().lerp(primaryColor, ringAlpha * 0.8);
      if (ringLight > 0.7) {
        rColor.lerp(accentColor, 0.4);
      }

      ringColors[i * 3] = rColor.r;
      ringColors[i * 3 + 1] = rColor.g;
      ringColors[i * 3 + 2] = rColor.b;
    }

    const ringGeometry = new THREE.BufferGeometry();
    ringGeometry.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3));
    ringGeometry.setAttribute('color', new THREE.BufferAttribute(ringColors, 3));

    // Points Material (custom pixelated round dot texture)
    const makeDotTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(16, 16, 14, 0, Math.PI * 2);
        ctx.fill();
      }
      return new THREE.CanvasTexture(canvas);
    };

    const dotTexture = makeDotTexture();

    const sphereMaterial = new THREE.PointsMaterial({
      size: 0.09,
      vertexColors: true,
      map: dotTexture,
      transparent: true,
      opacity: isDark ? 0.95 : 0.9,
      alphaTest: 0.1,
    });

    const ringMaterial = new THREE.PointsMaterial({
      size: 0.07,
      vertexColors: true,
      map: dotTexture,
      transparent: true,
      opacity: isDark ? 0.85 : 0.8,
      alphaTest: 0.1,
    });

    const spherePoints = new THREE.Points(sphereGeometry, sphereMaterial);
    const ringPoints = new THREE.Points(ringGeometry, ringMaterial);

    planetGroup.add(spherePoints);
    planetGroup.add(ringPoints);

    // 5. Interaction: Mouse Parallax & Continuous Idle Spin
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0.28;
    let targetRotationY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseX = x * 0.4;
      mouseY = y * 0.3;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // 6. Scroll Parallax Listener
    let scrollRotation = 0;
    const handleScroll = () => {
      scrollRotation = window.scrollY * 0.0015;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // 7. Animation Loop
    let animationFrameId: number;
    let idleRotation = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      idleRotation += 0.004;

      // Smooth spring lerp for mouse parallax
      targetRotationY = idleRotation + scrollRotation + mouseX;
      targetRotationX = 0.28 + mouseY * 0.5;

      planetGroup.rotation.y += (targetRotationY - planetGroup.rotation.y) * 0.05;
      planetGroup.rotation.x += (targetRotationX - planetGroup.rotation.x) * 0.05;

      // Ring counter-rotates slightly for multi-dimensional depth
      ringPoints.rotation.y = -idleRotation * 0.3;

      renderer.render(scene, camera);
    };

    animate();

    // 8. Handle Window Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 600;
      const h = container.clientHeight || 600;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);

      sphereGeometry.dispose();
      ringGeometry.dispose();
      sphereMaterial.dispose();
      ringMaterial.dispose();
      dotTexture.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isDark]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full min-h-[480px] lg:min-h-[620px] flex items-center justify-center relative select-none pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
};

export default MioDitherPlanet;
