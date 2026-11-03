import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import vertexShader from '@/shaders/pixelation.vert.glsl?raw';
import comun from '@/shaders/datos/comun.glsl?raw';
import { startGatedLoop } from '@/lib/renderGate';
import { isStill } from '@/lib/motion';

/** Numbers pass through, '#rrggbb' strings become colours, textures pass through. */
export type ShaderUniformValue = number | string | THREE.Texture | null;

interface ShaderCanvasProps {
  /** A fragment shader from src/shaders/datos (comun.glsl is prepended). */
  fragment: string;
  uniforms?: Record<string, ShaderUniformValue>;
  /** Fades the field in from the left between these fractions of the width (keeps copy readable). */
  fade?: [number, number];
  className?: string;
}

const toValue = (v: ShaderUniformValue) => (typeof v === 'string' ? new THREE.Color(v) : v);

/**
 * ShaderCanvas: full-bleed fragment-shader backdrop. Fills its positioned parent, never
 * takes pointer events, pauses off-screen and renders one still frame under reduced motion.
 */
export const ShaderCanvas: React.FC<ShaderCanvasProps> = ({
  fragment,
  uniforms = {},
  fade,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const uniformsRef = useRef<Record<string, THREE.IUniform>>({});

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      premultipliedAlpha: true,
      powerPreference: 'high-performance',
    });
    const pixelRatio = Math.min(window.devicePixelRatio, 1.5);
    renderer.setPixelRatio(pixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const shaderUniforms: Record<string, THREE.IUniform> = {
      uResolution: { value: new THREE.Vector2() },
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
    };
    for (const [key, v] of Object.entries(uniforms)) shaderUniforms[key] = { value: toValue(v) };
    uniformsRef.current = shaderUniforms;

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: `${comun}\n${fragment}`,
      uniforms: shaderUniforms,
      transparent: true,
      premultipliedAlpha: true,
      depthTest: false,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(geometry, material));

    const resize = () => {
      renderer.setSize(container.clientWidth, container.clientHeight, false);
      renderer.getDrawingBufferSize(shaderUniforms.uResolution.value);
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    let stop = () => {};
    // Quieto con menos movimiento (del sistema o elegido en la app): un solo cuadro.
    if (isStill()) {
      shaderUniforms.uTime.value = 12;
      renderer.render(scene, camera);
    } else {
      stop = startGatedLoop(container, (_dt, elapsed) => {
        shaderUniforms.uTime.value = elapsed;
        renderer.render(scene, camera);
      });
    }

    return () => {
      stop();
      resizeObserver.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
    // Uniform values are synced below; only a new shader needs a new renderer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fragment]);

  useEffect(() => {
    for (const [key, v] of Object.entries(uniforms)) {
      const u = uniformsRef.current[key];
      if (!u) continue;
      if (u.value instanceof THREE.Color && typeof v === 'string') u.value.set(v);
      else u.value = toValue(v);
    }
  }, [uniforms]);

  const mask = fade
    ? `linear-gradient(to right, transparent ${fade[0] * 100}%, black ${fade[1] * 100}%)`
    : undefined;

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
      aria-hidden="true"
    />
  );
};

export default ShaderCanvas;
