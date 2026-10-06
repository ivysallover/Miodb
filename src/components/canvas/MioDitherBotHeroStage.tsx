import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useMioStore } from '@/utils/useMioStore';
import { startGatedLoop } from '@/lib/renderGate';

interface MioDitherBotHeroStageProps {
  className?: string;
}

/**
 * MioDitherBotHeroStage:
 * Renders MIO Bot (Espécimen 01, "el bichito") in high-contrast Halftone Dither:
 * - Fixed architectural stance: tilted ~12° to the right without tracking the mouse.
 * - High-contrast dot dynamic range (deep royal violet shadows, crisp lilac midtones, clear screen).
 * - Organic physical breathing float (gentle vertical oscillation).
 * - Subtle ambient 3D Three.js dither dust in the background for depth.
 * - Transparent background without borders or beige artifacts.
 * - 0% CPU/GPU idle consumption when off-screen.
 */
export const MioDitherBotHeroStage: React.FC<MioDitherBotHeroStageProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const botCardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const theme = useMioStore((s) => s.theme);
  const isDark = theme === 'dark';
  const [hasWebGL, setHasWebGL] = useState(true);

  // 1. Fixed Architectural Stance with Subtle Organic Breathing (No Mouse Tracking)
  useEffect(() => {
    const container = containerRef.current;
    const botCard = botCardRef.current;
    if (!container || !botCard) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      botCard.style.transform = 'perspective(1200px) rotateZ(-12deg) rotateY(14deg) rotateX(-5deg)';
      return;
    }

    let animId: number;
    let startTime = performance.now();
    let isVisible = true;

    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    const renderLoop = (now: number) => {
      if (isVisible) {
        const elapsed = (now - startTime) * 0.001;
        // Gentle, calm breathing float (fixed orientation, no mouse following)
        const floatY = Math.sin(elapsed * 1.5) * 6.0;

        botCard.style.transform = `perspective(1200px) rotateZ(-12deg) rotateY(14deg) rotateX(-5deg) translateY(${floatY.toFixed(
          2
        )}px)`;
      }
      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
    };
  }, []);

  // 2. Three.js Ambient 3D Halftone Particle Dust (Background Depth Layer)
  useEffect(() => {
    const canvasContainer = canvasRef.current;
    if (!canvasContainer) return;

    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
      if (!gl) {
        setHasWebGL(false);
        return;
      }
    } catch {
      setHasWebGL(false);
      return;
    }

    const isMobile = window.innerWidth < 768;
    const width = canvasContainer.clientWidth || 480;
    const height = canvasContainer.clientHeight || 560;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0, 7.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isMobile ? 1.0 : Math.min(window.devicePixelRatio || 1, 1.5));
    canvasContainer.appendChild(renderer.domElement);

    // Ambient floating halftone data points around the bot
    const particleCount = isMobile ? 250 : 600;
    const positions = new Float32Array(particleCount * 3);
    const opacities = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const radius = 2.0 + Math.random() * 2.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.8;

      positions[i * 3] = radius * Math.cos(theta) * Math.cos(phi);
      positions[i * 3 + 1] = radius * Math.sin(phi) * 0.9;
      positions[i * 3 + 2] = radius * Math.sin(theta) * Math.cos(phi) - 1.2;
      opacities[i] = Math.random() * 0.5 + 0.15;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: isDark ? new THREE.Color('#c084fc') : new THREE.Color('#7c3aed') },
        uTime: { value: 0 },
      },
      vertexShader: `
        uniform float uTime;
        attribute float aOpacity;
        varying float vOpacity;
        void main() {
          vOpacity = aOpacity;
          vec3 pos = position;
          pos.y += sin(uTime * 0.6 + position.x * 1.4) * 0.10;
          pos.x += cos(uTime * 0.5 + position.y * 1.1) * 0.06;
          vec4 mvPosition = viewMatrix * vec4(pos, 1.0);
          gl_PointSize = (16.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vOpacity;
        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          if (dot(coord, coord) > 0.25) discard;
          gl_FragColor = vec4(uColor, vOpacity * 0.4);
        }
      `,
      transparent: true,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const clock = new THREE.Clock();

    const cleanupLoop = startGatedLoop(canvasContainer, () => {
      const elapsed = clock.getElapsedTime();
      material.uniforms.uTime.value = elapsed;
      points.rotation.y = elapsed * 0.04;
      renderer.render(scene, camera);
    });

    const onResize = () => {
      if (!canvasContainer) return;
      const w = canvasContainer.clientWidth || 480;
      const h = canvasContainer.clientHeight || 560;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', onResize);

    return () => {
      cleanupLoop();
      window.removeEventListener('resize', onResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (canvasContainer.contains(renderer.domElement)) {
        canvasContainer.removeChild(renderer.domElement);
      }
    };
  }, [isDark]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[400px] sm:h-[520px] lg:h-[600px] flex items-center justify-center select-none overflow-visible ${className}`}
      aria-label="MIO Bot Espécimen 01 en semitono dither de alto contraste"
    >
      {/* Background Layer: 3D Halftone Ambient Particle Halo */}
      {hasWebGL && (
        <div ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" aria-hidden="true" />
      )}

      {/* Main Layer: High-Contrast MIO Bot Halftone Sculpture (Fixed Pose, Tilted 12° Right) */}
      <div
        ref={botCardRef}
        className="relative z-10 w-full max-w-[400px] sm:max-w-[480px] lg:max-w-[560px] flex items-center justify-center pointer-events-none will-change-transform"
        style={{
          transformStyle: 'preserve-3d',
          transform: 'perspective(1200px) rotateZ(-12deg) rotateY(14deg) rotateX(-5deg)',
        }}
      >
        <img
          src="/images/mio_halftone_transparent.png"
          alt="MIO Bot Halftone Dither Escultura"
          className={`w-full h-auto object-contain select-none pointer-events-none transition-all duration-300 contrast-[1.28] saturate-[1.18] ${
            isDark
              ? 'filter drop-shadow-[0_0_40px_rgba(168,85,247,0.45)] drop-shadow-[0_20px_45px_rgba(0,0,0,0.8)] brightness-110'
              : 'filter drop-shadow-[0_24px_50px_rgba(109,40,217,0.22)] drop-shadow-[0_4px_12px_rgba(0,0,0,0.08)]'
          }`}
          loading="eager"
          decoding="async"
        />
      </div>

      {/* Floor Ambient Specular Vignette */}
      <div
        className="absolute -bottom-8 w-4/5 h-20 rounded-full blur-3xl pointer-events-none opacity-25 z-0"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at center, #7647eb 0%, transparent 70%)'
            : 'radial-gradient(ellipse at center, #8b44ff 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />
    </div>
  );
};

export default MioDitherBotHeroStage;
