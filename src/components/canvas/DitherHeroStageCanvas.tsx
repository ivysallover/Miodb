import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useMioStore } from '@/utils/useMioStore';

/**
 * DitherHeroStageCanvas:
 * 3D Topological Dither stage inspired by Legency Media's `data-live-dither` Hero Art.
 * Renders an interactive, rotating 3D mathematical torus knot / particle matrix
 * that adds atmospheric depth behind the Hero console.
 */
export const DitherHeroStageCanvas: React.FC<{ className?: string }> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useMioStore((s) => s.theme);
  const isDark = theme === 'dark';

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 480;
    const height = container.clientHeight || 480;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 8.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    // Create Mathematical Torus Knot Dither Point Cloud
    const geometry = new THREE.TorusKnotGeometry(2.4, 0.65, 128, 32, 2, 3);
    const posAttribute = geometry.getAttribute('position');
    const particleCount = posAttribute.count;

    // Custom dither colors: Violet and Lime
    const colors = new Float32Array(particleCount * 3);
    const violet = new THREE.Color('#7647eb');
    const lime = new THREE.Color('#bdf559');
    const cyan = new THREE.Color('#a78bfa');

    for (let i = 0; i < particleCount; i++) {
      const p = i / particleCount;
      const col = p < 0.7 ? violet.clone().lerp(cyan, p / 0.7) : lime;
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Particle Material with Dither-style Square Points
    const material = new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: isDark ? 0.45 : 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Mouse Tracking for Gentle Parallax
    let targetRotX = 0;
    let targetRotY = 0;

    const onPointerMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      targetRotY = x * 0.4;
      targetRotX = y * 0.4;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });

    let animationId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Continuous orbital rotation
      particles.rotation.y += delta * 0.18;
      particles.rotation.x += delta * 0.09;

      // Mouse dampening
      particles.rotation.x += (targetRotX - particles.rotation.x) * 0.05;
      particles.rotation.y += (targetRotY - particles.rotation.y) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || width;
      const h = container.clientHeight || height;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isDark]);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none select-none ${className}`}
      aria-hidden="true"
    />
  );
};

export default DitherHeroStageCanvas;
