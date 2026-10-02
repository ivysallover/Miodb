import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useMioStore } from '@/utils/useMioStore';
import { startGatedLoop } from '@/lib/renderGate';
import { createFpsGovernor } from '@/lib/fpsAdaptive';

interface LusionCanvasProps {
  className?: string;
}

export const LusionCanvas: React.FC<LusionCanvasProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useMioStore((s) => s.theme);
  const isDark = theme === 'dark';

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.set(0, 0, 18);

    // 2. High-performance WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    // 3. Fluid Sinusoidal Particle Field (4,500 particles)
    const count = 4500;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const initialPositions = new Float32Array(count * 3);

    // Dynamic Dual-Mode Palette
    // Dark: Luminous Violet & Neon Lime
    // Light: Deep Iris, Jewel Emerald, Rich MIO Violet & Indigo Pigment (WCAG AAA visibility)
    const violet = isDark ? new THREE.Color('#7647eb') : new THREE.Color('#602cd1');
    const limeOrTeal = isDark ? new THREE.Color('#bdf559') : new THREE.Color('#047857');
    const platinumOrIndigo = isDark ? new THREE.Color('#383552') : new THREE.Color('#312e81');
    const emeraldOrIris = isDark ? new THREE.Color('#10b981') : new THREE.Color('#7c3aed');

    for (let i = 0; i < count; i++) {
      // Flowing ribbon-like distribution spanning across the right side
      const u = (Math.random() - 0.25) * 34;
      const v = (Math.random() - 0.5) * 24;
      const w = Math.sin(u * 0.2) * 3.5 + Math.cos(v * 0.3) * 2.5;

      positions[i * 3] = u;
      positions[i * 3 + 1] = v;
      positions[i * 3 + 2] = w;

      initialPositions[i * 3] = u;
      initialPositions[i * 3 + 1] = v;
      initialPositions[i * 3 + 2] = w;

      // Color assignment based on spatial elevation
      const t = (w + 6) / 12;
      let col: THREE.Color;
      if (t > 0.7) {
        col = limeOrTeal.clone().lerp(platinumOrIndigo, isDark ? 0.4 : 0.25);
      } else if (t > 0.4) {
        col = violet.clone().lerp(emeraldOrIris, 0.35);
      } else {
        col = platinumOrIndigo.clone().lerp(violet, isDark ? 0.5 : 0.65);
      }

      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Particle Texture (Soft Gauss Specular Dot with mode-specific gradient)
    const makeDotTexture = (darkMode: boolean) => {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const ctx = c.getContext('2d');
      if (ctx) {
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        if (darkMode) {
          grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
          grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.7)');
          grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        } else {
          // Light Mode: Pearlescent violet dot with clear visibility
          grad.addColorStop(0, 'rgba(118, 71, 235, 0.78)');
          grad.addColorStop(0.35, 'rgba(118, 71, 235, 0.32)');
          grad.addColorStop(0.7, 'rgba(124, 58, 237, 0.12)');
          grad.addColorStop(1, 'rgba(124, 58, 237, 0)');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
      }
      return new THREE.CanvasTexture(c);
    };

    const dotTexture = makeDotTexture(isDark);

    // Calibrated material: Subtle 0.35 opacity & size 0.135 in light mode
    const material = new THREE.PointsMaterial({
      size: isDark ? 0.14 : 0.135,
      vertexColors: true,
      map: dotTexture,
      transparent: true,
      opacity: isDark ? 0.32 : 0.35,
      blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // 4. Mouse Displacement and Wave Kinetics
    let mouseX = 0;
    let mouseY = 0;
    let scrollYOffset = 0;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    const onScroll = () => {
      scrollYOffset = window.scrollY * 0.002;
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    // 5. Gated Render Loop with Adaptive DPR Governor
    const governor = createFpsGovernor({
      onDprChange: (dpr) => {
        renderer.setPixelRatio(dpr);
      },
    });

    let clock = new THREE.Clock();

    const stopLoop = startGatedLoop(container, () => {
      governor.measure(performance.now());
      const elapsedTime = clock.getElapsedTime();
      const posAttr = geometry.attributes.position as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;

      // Gentle undulating sinusoidal wave
      for (let i = 0; i < count; i++) {
        const u = initialPositions[i * 3];
        const v = initialPositions[i * 3 + 1];

        // Wave formula: combination of spatial frequencies and time
        const wave =
          Math.sin(u * 0.25 + elapsedTime * 0.6 + scrollYOffset) * 1.8 +
          Math.cos(v * 0.35 + elapsedTime * 0.4) * 1.2;

        posArray[i * 3 + 2] = initialPositions[i * 3 + 2] + wave;
      }
      posAttr.needsUpdate = true;

      // Subtle rotation response to cursor
      particles.rotation.y = elapsedTime * 0.03 + mouseX * 0.15;
      particles.rotation.x = -0.1 + mouseY * 0.08 - scrollYOffset * 0.2;

      renderer.render(scene, camera);
    });

    // 6. Resize Handler
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', onResize);

    // Cleanup
    return () => {
      stopLoop();
      governor.destroy();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);

      geometry.dispose();
      material.dispose();
      dotTexture.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isDark]);

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* Ambient Iridescent Light Aura (Whisper-soft pearlescent warmth) */}
      {!isDark && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-700"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 75% 20%, rgba(118,71,235,0.025) 0%, rgba(189,245,89,0.015) 45%, transparent 70%), radial-gradient(ellipse 50% 40% at 20% 65%, rgba(99,102,241,0.02) 0%, transparent 60%)',
          }}
        />
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

export default LusionCanvas;
