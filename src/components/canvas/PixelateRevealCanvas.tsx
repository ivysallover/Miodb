import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import vertexShader from '@/shaders/pixelation.vert.glsl?raw';
import fragmentShader from '@/shaders/pixelation.frag.glsl?raw';

interface PixelateRevealCanvasProps {
  imageSrc?: string;
  className?: string;
  initialGranularity?: number;
  durationMs?: number;
  autoPlayOnView?: boolean;
}

/**
 * PixelateRevealCanvas:
 * High-performance WebGL component based on pmndrs/postprocessing PixelationEffect.
 * Renders an image or high-density dataset that starts super-pixelated (low-res discrete blocks)
 * and animates rapidly into crystal-clear High Definition.
 */
export const PixelateRevealCanvas: React.FC<PixelateRevealCanvasProps> = ({
  imageSrc,
  className = '',
  initialGranularity = 56.0,
  durationMs = 900,
  autoPlayOnView = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResolved, setIsResolved] = useState(false);
  const [currentGranularity, setCurrentGranularity] = useState(initialGranularity);

  // Helper to generate a crisp high-definition synthetic analytics dashboard texture if no image is supplied
  const createDefaultTexture = (): THREE.CanvasTexture => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 640;
    const ctx = c.getContext('2d');
    if (ctx) {
      // 1. Dark executive backdrop
      ctx.fillStyle = '#0a0818';
      ctx.fillRect(0, 0, c.width, c.height);

      // 2. Fine graph grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.lineWidth = 1;
      for (let x = 0; x < c.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, c.height);
        ctx.stroke();
      }
      for (let y = 0; y < c.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(c.width, y);
        ctx.stroke();
      }

      // 3. Glowing gradient area under predict curve
      const grad = ctx.createLinearGradient(0, 200, 0, 560);
      grad.addColorStop(0, 'rgba(118, 71, 235, 0.45)');
      grad.addColorStop(1, 'rgba(189, 245, 89, 0.0)');

      ctx.beginPath();
      ctx.moveTo(60, 480);
      ctx.bezierCurveTo(240, 460, 400, 280, 560, 310);
      ctx.bezierCurveTo(720, 340, 840, 180, 960, 160);
      ctx.lineTo(960, 560);
      ctx.lineTo(60, 560);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // 4. Primary prediction curve (MIO Electric Violet)
      ctx.beginPath();
      ctx.moveTo(60, 480);
      ctx.bezierCurveTo(240, 460, 400, 280, 560, 310);
      ctx.bezierCurveTo(720, 340, 840, 180, 960, 160);
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 4;
      ctx.stroke();

      // 5. High-definition data point rings with MIO Lime highlights
      const points = [
        { x: 60, y: 480 },
        { x: 300, y: 390 },
        { x: 560, y: 310 },
        { x: 780, y: 220 },
        { x: 960, y: 160 },
      ];

      points.forEach((pt, idx) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#bdf559';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.font = 'bold 15px "JetBrains Mono", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`+${(idx + 1) * 24.8}%`, pt.x - 22, pt.y - 18);
      });

      // 6. Header HUD Banner
      ctx.font = 'bold 18px "Space Grotesk", sans-serif';
      ctx.fillStyle = '#bdf559';
      ctx.fillText('MIO AUTOML // MATRIZ DE PREDICCIÓN RESOLUCIÓN 4K', 60, 65);

      ctx.font = '14px "JetBrains Mono", monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('DATASET: ENTERPRISE_14K.XLSX  •  CONFIDENCE: 98.4%', 60, 95);
    }
    const texture = new THREE.CanvasTexture(c);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 400;

    // 1. Scene & Orthographic Camera for crisp 1:1 screen mapping
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // 2. WebGL Renderer adhering to AGENTS.md constraints
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    // 3. Texture setup (Image or Synthetic HD Dashboard)
    let texture: THREE.Texture;
    if (imageSrc) {
      const loader = new THREE.TextureLoader();
      texture = loader.load(imageSrc, () => {
        renderer.render(scene, camera);
      });
    } else {
      texture = createDefaultTexture();
    }

    // 4. Custom Shader Material using raw GLSL shaders
    const uniforms = {
      tDiffuse: { value: texture },
      uGranularity: { value: initialGranularity },
      uResolution: { value: new THREE.Vector2(width, height) },
    };

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // 5. Smooth animation transition from pixelated to HD
    let animationFrameId: number;
    let startTime: number | null = null;
    let fromGranularity = initialGranularity;

    const runAnimation = () => {
      fromGranularity = initialGranularity;
      startTime = null;

      const step = (time: number) => {
        if (!startTime) startTime = time;
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / durationMs, 1.0);

        // Power curve for rapid visual resolution
        const eased = Math.pow(1.0 - progress, 2.5);
        const current = 1.0 + (fromGranularity - 1.0) * eased;

        uniforms.uGranularity.value = current;
        setCurrentGranularity(Math.round(current));
        renderer.render(scene, camera);

        if (progress < 1.0) {
          animationFrameId = requestAnimationFrame(step);
        } else {
          uniforms.uGranularity.value = 1.0;
          setCurrentGranularity(1);
          setIsResolved(true);
          renderer.render(scene, camera);
        }
      };

      animationFrameId = requestAnimationFrame(step);
    };

    // 6. Viewport Trigger (Runs only ONCE upon appearing for the first time)
    let observer: IntersectionObserver | null = null;
    let hasRunOnce = false;

    if (autoPlayOnView && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && !hasRunOnce) {
            hasRunOnce = true;
            runAnimation();
            observer?.disconnect();
          }
        },
        { threshold: 0.25 }
      );
      observer.observe(container);
    } else if (!hasRunOnce) {
      hasRunOnce = true;
      runAnimation();
    }

    // 7. Resize handling
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || width;
      const h = container.clientHeight || height;
      renderer.setSize(w, h);
      uniforms.uResolution.value.set(w, h);
      renderer.render(scene, camera);
    };

    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', onResize);
      observer?.disconnect();

      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [imageSrc, initialGranularity, durationMs, autoPlayOnView]);

  return (
    <div
      className={`relative rounded-2xl overflow-hidden select-none ${className}`}
    >
      <div ref={containerRef} className="w-full h-full min-h-[260px] sm:min-h-[320px]" />

      {/* Floating HUD status indicator */}
      <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wider border backdrop-blur-md bg-black/60 border-white/15 text-white pointer-events-none">
        <span
          className={`w-1.5 h-1.5 rounded-full transition-colors ${
            isResolved ? 'bg-[#bdf559]' : 'bg-amber-400 animate-pulse'
          }`}
        />
        <span>
          {isResolved ? '4K ALTA DEFINICIÓN' : `OPTIMIZANDO RESOLUCIÓN [${currentGranularity}px]`}
        </span>
      </div>
    </div>
  );
};

export default PixelateRevealCanvas;
