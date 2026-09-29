'use client';

import React, { useRef, useState } from 'react';
import { RoundedBox, Html } from '@react-three/drei';
import * as THREE from 'three';

// Modos de pantalla OLED MIO originales que le gustaron al usuario
const SCREEN_MODES = [
  {
    id: 'forecasting',
    title: 'AUTO-ML FORECAST',
    tag: 'ARIMA + PROPHET',
    metric: '+34.8%',
    sub: 'Proyección Q4',
    badge: 'CONFIANZA 99.2%',
    type: 'wave'
  },
  {
    id: 'clustering',
    title: 'K-MEANS CLUSTERING',
    tag: '3 SEGMENTOS',
    metric: '3,420',
    sub: 'Clientes VIP',
    badge: 'SILHOUETTE 0.84',
    type: 'bars'
  },
  {
    id: 'anomalies',
    title: 'ANOMALY DETECTOR',
    tag: 'ISOLATION FOREST',
    metric: '12',
    sub: 'Outliers detectados',
    badge: 'CRÍTICO: 0',
    type: 'scatter'
  }
];

export function MioDevModel() {
  const groupRef = useRef<THREE.Group>(null);
  const [activeModeIdx, setActiveModeIdx] = useState(0);
  const [btnPressed, setBtnPressed] = useState<string | null>(null);

  // Pose apoyada sobre la mesa (el fondo de la web):
  // Casi plana contra la superficie con una sutil inclinación de ~3° y giro casual
  const BASE_ROTATION = {
    x: -0.05,  // Apoyada sobre la superficie de la mesa/fondo
    y: 0.03,   // Ligero ángulo 3D para apreciar volumen y biseles
    z: -0.04   // Giro casual natural
  };

  const currentMode = SCREEN_MODES[activeModeIdx];

  const handleNextMode = (e?: any) => {
    e?.stopPropagation?.();
    setActiveModeIdx((prev) => (prev + 1) % SCREEN_MODES.length);
    setBtnPressed('a');
    setTimeout(() => setBtnPressed(null), 180);
  };

  const handlePrevMode = (e?: any) => {
    e?.stopPropagation?.();
    setActiveModeIdx((prev) => (prev - 1 + SCREEN_MODES.length) % SCREEN_MODES.length);
    setBtnPressed('b');
    setTimeout(() => setBtnPressed(null), 180);
  };

  return (
    <group
      ref={groupRef}
      scale={[0.96, 0.96, 0.96]}
      position={[0, 0.06, 0]}
      rotation={[BASE_ROTATION.x, BASE_ROTATION.y, BASE_ROTATION.z]}
    >
      {/* ==================================================== */}
      {/* 1. INTERRUPTOR SUPERIOR DE HARDWARE (OFF <-> ON) */}
      {/* ==================================================== */}
      <group position={[-0.85, 2.58, -0.05]}>
        <RoundedBox args={[0.34, 0.14, 0.16]} radius={0.03} smoothness={2} castShadow>
          <meshStandardMaterial color="#2d273d" roughness={0.7} />
        </RoundedBox>
      </group>

      {/* ==================================================== */}
      {/* 2. CHASIS MIO VIOLET SATINADO PRO */}
      {/* ==================================================== */}
      <RoundedBox
        args={[3.45, 5.2, 0.68]}
        radius={0.24}
        smoothness={4}
        castShadow
        receiveShadow
        position={[0, 0, 0]}
      >
        <meshStandardMaterial
          color="#7647eb" // Violeta oficial de MIO
          roughness={0.3}
          metalness={0.12}
        />
      </RoundedBox>

      {/* Ranura decorativa horizontal superior de ensamble */}
      <mesh position={[0, 2.32, 0.345]}>
        <planeGeometry args={[3.2, 0.02]} />
        <meshStandardMaterial color="#5e35c7" roughness={0.6} />
      </mesh>

      {/* ==================================================== */}
      {/* 3. MARCO / BEZEL DE PANTALLA OBSIDIANA CON STRIPES */}
      {/* ==================================================== */}
      <group position={[0, 0.85, 0.345]}>
        <RoundedBox args={[3.0, 2.45, 0.05]} radius={0.12} smoothness={3}>
          <meshStandardMaterial
            color="#0b0914" // Obsidiana profundo
            roughness={0.18}
            metalness={0.4}
          />
        </RoundedBox>

        {/* Franja de acento MIO Lima (#bdf559) sobre el bezel */}
        <mesh position={[0, 1.05, 0.028]}>
          <planeGeometry args={[2.55, 0.022]} />
          <meshStandardMaterial color="#bdf559" emissive="#bdf559" emissiveIntensity={0.4} />
        </mesh>

        {/* LED de Batería (Verde Lima encendido con resplandor) */}
        <mesh position={[-1.22, 0.15, 0.035]}>
          <circleGeometry args={[0.045, 16]} />
          <meshStandardMaterial color="#bdf559" emissive="#bdf559" emissiveIntensity={1.2} />
        </mesh>

        {/* ==================================================== */}
        {/* 4. PANTALLA OLED CYBERPUNK MIO ORIGINAL */}
        {/* ==================================================== */}
        <mesh position={[0.06, -0.05, 0.026]}>
          <planeGeometry args={[2.24, 1.84]} />
          <meshStandardMaterial
            color="#0b0914"
            roughness={0.1}
            metalness={0.2}
          />
        </mesh>

        {/* Contenido HTML interactivo MIO (el original que le gustó al usuario) */}
        <Html
          transform
          position={[0.06, -0.05, 0.032]}
          distanceFactor={2.7}
          className="select-none pointer-events-auto"
        >
          <div
            style={{ width: '340px', height: '280px' }}
            className="bg-[#0b0914] text-white p-3 font-mono flex flex-col justify-between rounded shadow-2xl relative overflow-hidden border border-mio-lime/30"
          >
            {/* Scanline CRT overlay */}
            <div
              className="absolute inset-0 pointer-events-none opacity-25"
              style={{
                backgroundImage: 'linear-gradient(rgba(18, 16, 31, 0) 50%, rgba(0, 0, 0, 0.75) 50%)',
                backgroundSize: '100% 4px'
              }}
            />

            {/* Header de la pantalla */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-1.5 relative z-10">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-mio-lime animate-pulse inline-block" />
                <span className="text-[10px] font-black tracking-wider text-mio-lime">MIO OS v2.6</span>
              </div>
              <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-gray-300 font-bold tracking-wider">
                {currentMode.tag}
              </span>
            </div>

            {/* Gráficos dinámicos interactivos con gradiente MIO */}
            <div className="flex-1 flex flex-col justify-center py-1 relative z-10">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-1">
                {currentMode.title}
              </div>

              {currentMode.type === 'wave' && (
                <div className="h-24 w-full flex items-end justify-between gap-1.5 px-1 pt-2">
                  {[22, 35, 28, 48, 44, 65, 58, 82, 75, 96, 92, 100].map((val, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-gradient-to-t from-mio-violet to-mio-lime rounded-t transition-all duration-300"
                        style={{ height: `${val * 0.72}px` }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {currentMode.type === 'bars' && (
                <div className="h-24 w-full flex items-end justify-around gap-4 px-3 pt-2">
                  <div className="flex-1 flex flex-col items-center">
                    <span className="text-[9px] text-mio-lime font-bold mb-1">62%</span>
                    <div className="w-full bg-mio-lime rounded-t h-16 transition-all duration-500" />
                    <span className="text-[8px] text-gray-400 mt-1">SEG-1</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center">
                    <span className="text-[9px] text-white font-bold mb-1">26%</span>
                    <div className="w-full bg-mio-violet rounded-t h-10 transition-all duration-500" />
                    <span className="text-[8px] text-gray-400 mt-1">SEG-2</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center">
                    <span className="text-[9px] text-gray-400 font-bold mb-1">12%</span>
                    <div className="w-full bg-gray-700 rounded-t h-6 transition-all duration-500" />
                    <span className="text-[8px] text-gray-400 mt-1">SEG-3</span>
                  </div>
                </div>
              )}

              {currentMode.type === 'scatter' && (
                <div className="h-24 w-full relative border border-dashed border-gray-800 rounded p-1.5 overflow-hidden">
                  <div className="absolute top-2 left-6 w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <div className="absolute top-2 left-6 w-2 h-2 rounded-full bg-red-400" />
                  <div className="absolute bottom-3 right-8 w-2 h-2 rounded-full bg-red-400" />

                  {[
                    [20, 40], [35, 55], [50, 45], [60, 70], [75, 60], [80, 80], [40, 30], [65, 50]
                  ].map(([x, y], idx) => (
                    <div
                      key={idx}
                      className="absolute w-1.5 h-1.5 rounded-full bg-mio-lime"
                      style={{ left: `${x}%`, top: `${y}%` }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer con métricas ejecutivas */}
            <div className="border-t border-gray-800 pt-1.5 flex items-center justify-between relative z-10">
              <div>
                <div className="text-[9px] text-gray-400">{currentMode.sub}</div>
                <div className="text-base font-black text-mio-lime tracking-tight leading-none">
                  {currentMode.metric}
                </div>
              </div>
              <div className="text-[8px] font-bold px-1.5 py-0.5 bg-mio-violet/40 text-mio-lime border border-mio-violet/60 rounded">
                {currentMode.badge}
              </div>
            </div>
          </div>
        </Html>
      </group>

      {/* ==================================================== */}
      {/* 5. CONTROLES: D-PAD EN NEGRO MATE */}
      {/* ==================================================== */}
      <group position={[-0.88, -1.35, 0.355]}>
        <RoundedBox args={[0.34, 0.98, 0.16]} radius={0.04} smoothness={2} castShadow>
          <meshStandardMaterial color="#1a1726" roughness={0.6} />
        </RoundedBox>
        <RoundedBox args={[0.98, 0.34, 0.16]} radius={0.04} smoothness={2} castShadow>
          <meshStandardMaterial color="#1a1726" roughness={0.6} />
        </RoundedBox>
        {/* Hendidura central circular (orientada hacia adelante) */}
        <mesh position={[0, 0, 0.088]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.075, 0.075, 0.015, 32]} />
          <meshStandardMaterial color="#110e1a" roughness={0.9} />
        </mesh>
      </group>

      {/* ==================================================== */}
      {/* 6. BOTONES DE ACCIÓN (A & B) CON ESPACIADO REAL Y BISEL */}
      {/* ==================================================== */}
      {/* Botón B (Dark Graphite inferior-izquierdo) */}
      <group
        position={[0.48, -1.42, 0.355]}
        onClick={handlePrevMode}
      >
        {/* Pozo/Bisel de encastre */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.005]}>
          <cylinderGeometry args={[0.29, 0.29, 0.015, 32]} />
          <meshStandardMaterial color="#5530b8" roughness={0.7} />
        </mesh>
        {/* Botón táctil */}
        <mesh
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, 0, btnPressed === 'b' ? 0.03 : 0.075]}
          castShadow
        >
          <cylinderGeometry args={[0.26, 0.26, 0.14, 32]} />
          <meshStandardMaterial
            color="#221b33"
            roughness={0.35}
          />
        </mesh>
      </group>

      {/* Botón A (MIO LIME #bdf559 superior-derecho) */}
      <group
        position={[1.06, -1.14, 0.355]}
        onClick={handleNextMode}
      >
        {/* Pozo/Bisel de encastre */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.005]}>
          <cylinderGeometry args={[0.29, 0.29, 0.015, 32]} />
          <meshStandardMaterial color="#5530b8" roughness={0.7} />
        </mesh>
        {/* Botón táctil */}
        <mesh
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, 0, btnPressed === 'a' ? 0.03 : 0.075]}
          castShadow
        >
          <cylinderGeometry args={[0.26, 0.26, 0.14, 32]} />
          <meshStandardMaterial
            color="#bdf559"
            emissive="#bdf559"
            emissiveIntensity={0.25}
            roughness={0.25}
          />
        </mesh>
      </group>

      {/* ==================================================== */}
      {/* 7. BOTONES SELECT Y START */}
      {/* ==================================================== */}
      <group position={[-0.08, -2.05, 0.355]} rotation={[0, 0, -0.45]}>
        <group position={[-0.23, 0, 0]}>
          <RoundedBox args={[0.34, 0.10, 0.06]} radius={0.035} smoothness={2} castShadow>
            <meshStandardMaterial color="#221b33" roughness={0.7} />
          </RoundedBox>
        </group>
        <group position={[0.23, 0, 0]}>
          <RoundedBox args={[0.34, 0.10, 0.06]} radius={0.035} smoothness={2} castShadow>
            <meshStandardMaterial color="#221b33" roughness={0.7} />
          </RoundedBox>
        </group>
      </group>

      {/* ==================================================== */}
      {/* 8. REJILLA DEL ALTAVOZ (RANURAS LIMPIAS EN ESQUINA INFERIOR) */}
      {/* ==================================================== */}
      <group position={[1.05, -2.08, 0.35]} rotation={[0, 0, -0.45]}>
        {[-0.18, -0.09, 0.0, 0.09, 0.18].map((offsetY, i) => (
          <RoundedBox
            key={i}
            args={[0.42, 0.04, 0.025]}
            radius={0.015}
            smoothness={2}
            position={[0, offsetY, 0]}
          >
            <meshStandardMaterial color="#161224" roughness={0.9} />
          </RoundedBox>
        ))}
      </group>
    </group>
  );
}
