import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useMioStore } from '@/utils/useMioStore';
import { startGatedLoop } from '@/lib/renderGate';

interface MioPipelineDitherCanvasProps {
  className?: string;
}

/**
 * MioPipelineDitherCanvas:
 * Interactive 3D WebGL Canvas for the Monolith Section.
 * Visualizes the 3-Stage Machine Learning Pipeline using Halftone Dither Points:
 * 1. Data Chaos (Scattered raw Excel points)
 * 2. Anomaly Isolation (Isolation Forest flagging outliers in crimson/amber)
 * 3. Temporal Forecast & Uncertainty Fan Chart (P80 & P95 confidence envelopes in MIO Lime)
 *
 * Fully GPU-accelerated, responsive, gated for 0% CPU/GPU idle usage.
 */
export const MioPipelineDitherCanvas: React.FC<MioPipelineDitherCanvasProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useMioStore((s) => s.theme);
  const isDark = theme === 'dark';
  const [hasWebGL, setHasWebGL] = useState(true);
  const [activeStage, setActiveStage] = useState<'chaos' | 'anomalies' | 'forecast'>('forecast');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

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
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const width = container.clientWidth || 1200;
    const height = container.clientHeight || 420;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 14);

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isMobile ? 1.0 : Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    // 2. Generate 3 Target Positions per Particle:
    // P0 = Chaos (scattered noise in 3D volume)
    // P1 = Anomaly clusters (concentrated cloud with distinct outlier spikes)
    // P2 = Time-Series Wave + Fan Chart (P80/P95 envelope)
    const count = isMobile ? 5000 : 16000;
    const posChaos = new Float32Array(count * 3);
    const posForecast = new Float32Array(count * 3);
    const particleTypes = new Float32Array(count); // 0 = nominal, 1 = anomaly, 2 = forecast center, 3 = envelope
    const particleSizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Phase 0: Chaos
      const u = (Math.random() - 0.5) * 24.0;
      const v = (Math.random() - 0.5) * 8.0;
      const w = (Math.random() - 0.5) * 6.0;
      posChaos[i * 3] = u;
      posChaos[i * 3 + 1] = v;
      posChaos[i * 3 + 2] = w;

      // Phase 2: Time-series curve with Fan Chart
      // x from -11.0 to 11.0
      const xNorm = (i / count);
      const x = (xNorm - 0.5) * 22.0;
      
      // Underlying trend: upward sinusoidal wave
      const trend = Math.sin(x * 0.45) * 1.8 + (x * 0.15);
      
      // Fan chart expansion after center (x > 0)
      const isHistorical = x < 0.0;
      const fanSpread = isHistorical ? 0.4 : 0.4 + Math.pow((x / 11.0), 1.6) * 3.2;

      // Role assignment
      const isOutlier = i % 18 === 0 && isHistorical; // ~5% anomalies in history
      const isCenterLine = i % 8 === 0;

      let y = trend;
      let z = 0.0;
      let pType = 0.0; // Nominal

      if (isOutlier) {
        // High spike anomaly
        y += (Math.random() > 0.5 ? 1 : -1) * (2.2 + Math.random() * 1.8);
        z = (Math.random() - 0.5) * 2.0;
        pType = 1.0; // Anomaly
      } else if (isCenterLine) {
        // Core projection spine
        y += (Math.random() - 0.5) * 0.15;
        z = 0.0;
        pType = 2.0; // Spine
      } else {
        // Fan uncertainty dispersion
        const spreadSign = (Math.random() - 0.5) * 2.0;
        y += spreadSign * fanSpread * (Math.random());
        z = (Math.random() - 0.5) * fanSpread * 0.8;
        pType = Math.abs(spreadSign) > 0.75 ? 4.0 : 3.0; // 4 = P95 edge, 3 = P80 band
      }

      posForecast[i * 3] = x;
      posForecast[i * 3 + 1] = y;
      posForecast[i * 3 + 2] = z;

      particleTypes[i] = pType;
      particleSizes[i] = isCenterLine ? 2.4 : isOutlier ? 2.8 : 1.2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(posForecast, 3));
    geometry.setAttribute('aPosChaos', new THREE.BufferAttribute(posChaos, 3));
    geometry.setAttribute('aPosForecast', new THREE.BufferAttribute(posForecast, 3));
    geometry.setAttribute('aType', new THREE.BufferAttribute(particleTypes, 1));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(particleSizes, 1));

    // 3. Shader Material with Morphing Transition
    const uniforms = {
      uTime: { value: 0 },
      uMorph: { value: 1.0 }, // 0.0 = chaos, 1.0 = forecast fan chart
      uMouseX: { value: 0.0 },
      uColorBase: { value: new THREE.Color('#312e81') },
      uColorViolet: { value: new THREE.Color('#7647eb') },
      uColorLime: { value: new THREE.Color('#bdf559') },
      uColorAnomaly: { value: new THREE.Color('#f43f5e') },
    };

    const shaderMaterial = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        uniform float uTime;
        uniform float uMorph;
        uniform float uMouseX;
        attribute vec3 aPosChaos;
        attribute vec3 aPosForecast;
        attribute float aType;
        attribute float aSize;
        varying float vType;
        varying float vAlpha;

        void main() {
          vType = aType;
          
          // Interpolate between Chaos and Machine Learning Forecast
          vec3 pChaos = aPosChaos;
          // Kinetic drift in chaos
          pChaos.y += sin(uTime * 1.2 + aPosChaos.x * 0.5) * 0.4;
          
          vec3 pForecast = aPosForecast;
          // Subtle wave undulation in forecast
          pForecast.y += sin(pForecast.x * 0.4 + uTime * 0.8) * 0.25;

          vec3 mixedPos = mix(pChaos, pForecast, uMorph);
          
          // Cursor displacement wave
          float distToMouse = abs(mixedPos.x - uMouseX * 12.0);
          if (distToMouse < 3.0) {
            float influence = (1.0 - distToMouse / 3.0);
            mixedPos.y += sin(influence * 3.1415) * 0.6;
          }

          vec4 mvPos = modelViewMatrix * vec4(mixedPos, 1.0);
          
          // Dither point sizing
          gl_PointSize = aSize * (180.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;

          // Transparency calibration
          if (aType > 3.5) {
            vAlpha = 0.35; // P95 outer envelope
          } else if (aType > 2.5) {
            vAlpha = 0.55; // P80 inner envelope
          } else {
            vAlpha = 0.95; // Core line & anomalies
          }
        }
      `,
      fragmentShader: `
        uniform vec3 uColorBase;
        uniform vec3 uColorViolet;
        uniform vec3 uColorLime;
        uniform vec3 uColorAnomaly;
        varying float vType;
        varying float vAlpha;

        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          if (dot(coord, coord) > 0.25) discard; // Crisp circular dither dot

          vec3 col;
          if (vType > 0.5 && vType < 1.5) {
            col = uColorAnomaly; // Isolation Forest Anomaly
          } else if (vType > 1.5 && vType < 2.5) {
            col = uColorLime; // Core Forecast Spine
          } else {
            col = mix(uColorBase, uColorViolet, vAlpha); // Uncertainty Fan Envelope
          }

          gl_FragColor = vec4(col, vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, shaderMaterial);
    scene.add(points);

    // 4. Mouse Interactive Tracking
    let targetMouseX = 0;
    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width * 2.0 - 1.0;
      targetMouseX = nx;
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });

    // 5. Gated Render Loop
    let clock = new THREE.Clock();
    let currentMorph = 1.0;

    const cleanupLoop = startGatedLoop(container, () => {
      const elapsed = clock.getElapsedTime();
      uniforms.uTime.value = elapsed;

      // Morphing interpolation towards target stage
      const targetMorph = activeStage === 'chaos' ? 0.0 : activeStage === 'anomalies' ? 0.5 : 1.0;
      currentMorph += (targetMorph - currentMorph) * 0.06;
      uniforms.uMorph.value = currentMorph;

      // Mouse tracking lerp
      uniforms.uMouseX.value += (targetMouseX - uniforms.uMouseX.value) * 0.08;

      if (!prefersReducedMotion) {
        points.rotation.y = Math.sin(elapsed * 0.2) * 0.04;
      }

      renderer.render(scene, camera);
    });

    // 6. Resize Handler
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 1200;
      const h = container.clientHeight || 420;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', onResize);

    return () => {
      cleanupLoop();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      geometry.dispose();
      shaderMaterial.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [activeStage, isDark]);

  if (!hasWebGL) {
    return (
      <div className={`w-full py-16 flex items-center justify-center bg-[#07070a] border-y border-white/10 ${className}`}>
        <div className="font-mono text-xs text-zinc-400">// Visualización esquemática: Pipeline AutoML en Memoria</div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-[360px] sm:h-[440px] lg:h-[480px] bg-[#07070a] overflow-hidden select-none ${className}`}>
      {/* 3D WebGL Canvas */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Stage Controller Tabs (Caos -> Anomalías -> Fan Chart) */}
      <div className="absolute top-6 left-6 sm:left-12 z-20 flex items-center gap-2">
        <span className="font-mono text-[10px] tracking-widest uppercase text-zinc-500 mr-2 hidden sm:inline">
          ESTADO DEL PIPELINE:
        </span>
        {[
          { id: 'chaos', label: '01 Datos Crudos', dot: 'bg-zinc-400' },
          { id: 'anomalies', label: '02 Isolation Forest', dot: 'bg-[#f43f5e]' },
          { id: 'forecast', label: '03 Abanico P80/P95', dot: 'bg-[#bdf559]' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveStage(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-2 cursor-pointer ${
              activeStage === tab.id
                ? 'bg-white/10 border-white/30 text-white shadow-sm'
                : 'bg-black/40 border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${tab.dot}`} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Real telemetry overlay stamp on bottom right */}
      <div className="absolute bottom-5 right-6 sm:right-12 z-20 hidden md:flex items-center gap-4 font-mono text-[11px] text-zinc-400 bg-black/60 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-md">
        <span>sMAPE: <strong className="text-[#bdf559]">13.5%</strong></span>
        <span className="text-zinc-600">•</span>
        <span>Anomalías: <strong className="text-[#f43f5e]">108</strong></span>
        <span className="text-zinc-600">•</span>
        <span>Horizonte: <strong className="text-white">14 días</strong></span>
      </div>

      {/* Ambient vignettes */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#07070a] via-transparent to-[#07070a]/80" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[#07070a] via-transparent to-[#07070a]" />
    </div>
  );
};

export default MioPipelineDitherCanvas;
