import React, { useEffect, useRef } from 'react';
import vertexSource from '@/shaders/aurora.vert.glsl?raw';
import fragmentSource from '@/shaders/aurora.frag.glsl?raw';
import { isStill } from '@/lib/motion';

/** Se dibuja a media resolución: es todo suave, así que agrandarla no se nota y cuesta un cuarto. */
const SCALE = 0.5;
/** Cuadros por segundo: alcanza para un movimiento lento. */
const FPS = 30;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

/** El programa de la aurora, o `null` si la placa no lo compila (queda la planilla de fondo). */
function link(gl: WebGL2RenderingContext) {
  const vs = compile(gl, gl.VERTEX_SHADER, vertexSource);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vs || !fs) return null;
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}


/**
 * El fondo de la app de escritorio: una aurora suave (`shaders/aurora.frag.glsl`) detrás de todo,
 * encima de la planilla de fondo. Se pausa con la ventana oculta y, con menos movimiento, queda quieta.
 */
export const Aurora: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const dark = useRef(isDark ? 1 : 0);
  const redraw = useRef<() => void>(() => undefined);

  useEffect(() => {
    dark.current = isDark ? 1 : 0;
    redraw.current();
  }, [isDark]);

  useEffect(() => {
    const el = canvas.current;
    const gl = el?.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
    const program = gl && link(gl);
    if (!el || !gl || !program) return;
    gl.useProgram(program);
    const at = { resolution: gl.getUniformLocation(program, 'uResolution'), time: gl.getUniformLocation(program, 'uTime'), dark: gl.getUniformLocation(program, 'uDark') };
    const start = performance.now();
    let frame = 0;
    let last = 0;

    const draw = (now: number) => {
      gl.uniform2f(at.resolution, el.width, el.height);
      gl.uniform1f(at.time, (now - start) / 1000);
      gl.uniform1f(at.dark, dark.current);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const resize = () => {
      el.width = Math.max(1, Math.round(window.innerWidth * SCALE));
      el.height = Math.max(1, Math.round(window.innerHeight * SCALE));
      gl.viewport(0, 0, el.width, el.height);
      draw(performance.now());
    };
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (now - last < 1000 / FPS) return;
      last = now;
      draw(now);
    };
    /** Anda si la ventana se ve y no hay que quedarse quieto; si no, queda el último cuadro. */
    const play = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && !isStill()) frame = requestAnimationFrame(loop);
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
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  return <canvas ref={canvas} aria-hidden data-no-print className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />;
};
