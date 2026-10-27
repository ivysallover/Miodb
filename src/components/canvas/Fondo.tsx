import React, { useEffect, useRef } from 'react';
import vertexSource from '@/shaders/fondo/pantalla.vert.glsl?raw';
import common from '@/shaders/fondo/comun.glsl?raw';
import planilla from '@/shaders/fondo/planilla.frag.glsl?raw';
import halo from '@/shaders/fondo/halo.frag.glsl?raw';
import curvas from '@/shaders/fondo/curvas.frag.glsl?raw';
import quieto from '@/shaders/fondo/quieto.frag.glsl?raw';
import aurora from '@/shaders/fondo/aurora.frag.glsl?raw';
import { isStill } from '@/lib/motion';

/** Los fondos que se pueden elegir en Ajustes, con lo que dice la pantalla de cada uno. */
export const FONDOS = {
  planilla: { label: 'Planilla viva', source: planilla, sharp: true, moves: true },
  halo: { label: 'Halo', source: halo, sharp: false, moves: true },
  curvas: { label: 'Curvas de nivel', source: curvas, sharp: true, moves: true },
  aurora: { label: 'Aurora', source: aurora, sharp: false, moves: true },
  quieto: { label: 'Quieto', source: quieto, sharp: true, moves: false },
} as const;
export type FondoKind = keyof typeof FONDOS;

/** Cuadros por segundo: alcanza para un movimiento lento. */
const FPS = 30;
/** Las páginas de MIO (`PageShell`), por tema. */
const PAGE = { light: [243, 243, 245].map((v) => v / 255), dark: [7, 7, 10].map((v) => v / 255) };

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

/** El programa de un fondo (la parte común más la suya), o `null` si la placa no lo compila. */
function link(gl: WebGL2RenderingContext, kind: FondoKind) {
  const vs = compile(gl, gl.VERTEX_SHADER, vertexSource);
  const fs = compile(gl, gl.FRAGMENT_SHADER, `${common}\n${FONDOS[kind].source}`);
  if (!vs || !fs) return null;
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  // Ya enlazados, los shaders sueltos no hacen falta (se liberan con el programa).
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  const at = (name: string) => gl.getUniformLocation(program, name);
  return { program, res: at('uRes'), time: at('uTime'), dark: at('uDark'), page: at('uPage'), scale: at('uScale') };
}

/**
 * El fondo de la app de escritorio, detrás de todo: uno de `FONDOS` (se elige en Ajustes), en el tema
 * que esté. Pinta la página entera; los que tienen líneas finas se dibujan a la resolución de la
 * pantalla (hasta 1,5) y los difusos a la mitad, que no se nota. Se pausa con la ventana oculta y, con
 * menos movimiento, queda quieto. Sin WebGL2 queda la planilla de fondo de la página.
 */
export const Fondo: React.FC<{ kind: FondoKind; isDark: boolean }> = ({ kind, isDark }) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const dark = useRef(isDark);
  const redraw = useRef<() => void>(() => undefined);

  useEffect(() => {
    dark.current = isDark;
    redraw.current();
  }, [isDark]);

  useEffect(() => {
    const el = canvas.current;
    const gl = el?.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false });
    const p = gl && link(gl, kind);
    if (!el || !gl || !p) return;
    gl.useProgram(p.program);
    const { sharp, moves } = FONDOS[kind];
    const start = performance.now();
    let frame = 0;
    let last = 0;
    let scale = 1;

    const draw = (now: number) => {
      gl.uniform2f(p.res, el.width, el.height);
      gl.uniform1f(p.time, (now - start) / 1000);
      gl.uniform1f(p.dark, dark.current ? 1 : 0);
      gl.uniform3fv(p.page, PAGE[dark.current ? 'dark' : 'light']);
      gl.uniform1f(p.scale, scale);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const resize = () => {
      scale = sharp ? Math.min(window.devicePixelRatio || 1, 1.5) : 0.5;
      el.width = Math.max(1, Math.round(window.innerWidth * scale));
      el.height = Math.max(1, Math.round(window.innerHeight * scale));
      gl.viewport(0, 0, el.width, el.height);
      draw(performance.now());
    };
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (now - last < 1000 / FPS) return;
      last = now;
      draw(now);
    };
    /** Anda si se mueve, la ventana se ve y no hay que quedarse quieto; si no, queda el último cuadro. */
    const play = () => {
      cancelAnimationFrame(frame);
      if (moves && !document.hidden && !isStill()) frame = requestAnimationFrame(loop);
    };

    redraw.current = () => draw(performance.now());
    resize();
    play();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', play);
    // Se vuelve a mirar si hay que quedarse quieto cuando cambia lo que se eligió en Ajustes.
    const watch = new MutationObserver(play);
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', play);
      watch.disconnect();
      redraw.current = () => undefined;
      gl.deleteProgram(p.program);
    };
  }, [kind]);

  // Al desmontarse, la placa se libera de una (no espera a que el navegador la recoja).
  useEffect(() => () => canvas.current?.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext(), []);

  return <canvas ref={canvas} aria-hidden data-no-print className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />;
};
