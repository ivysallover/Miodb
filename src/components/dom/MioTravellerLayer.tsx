import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useTravellerEnabled } from '@/hooks/useTravellerEnabled';
import { useActiveSection } from '@/hooks/useActiveSection';
import { SECTION_BY_ID } from '@/lib/landingSections';
import { onGuide } from '@/lib/guide';
import {
  STAGE_ORDER,
  STAGE_POSES,
  petDrive,
  resolveStage,
  mixPose,
  clamp,
  type PetPose,
  type SectionBox,
  type StageMood,
} from '@/lib/petStage';

const MioHeroStage = lazy(() =>
  import('@/components/canvas/MioHeroStage').then((m) => ({ default: m.MioHeroStage }))
);

/** Layout size of the stage box. It is only ever scaled by CSS, so it never reflows. */
const BOX = 720;
const Z_BEHIND = 5; // under <main> (z-10): MIO stands on the sheet, behind cards and type
const Z_ABOVE = 35; // over solid sections, still under the nav (z-50) and the guide bubble

const DEG = Math.PI / 180;

/**
 * MioTravellerLayer — one live specimen for the whole landing.
 *
 * It replaces the hero-only stage and the corner sprite on desktop. A fixed, pointer-transparent
 * box carries MioHeroStage in "driven" mode; this layer moves and scales the box every frame from
 * where the middle of the viewport sits inside the page (see lib/petStage.ts). Only one transform
 * and a handful of numbers are written per frame; the stage itself is paused by its render gate
 * when the tab is hidden.
 */
export const MioTravellerLayer: React.FC = () => {
  const enabled = useTravellerEnabled();
  const boxRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // Mood sources: the section's own guide mood, or the last cue a section emitted (the method).
  const active = useActiveSection();
  const cueMood = useRef<StageMood | null>(null);
  const lastCue = useRef<StageMood | null>(null);

  useEffect(() => {
    const g = SECTION_BY_ID[active]?.guide;
    cueMood.current = g ? g.mood : active === 'como-funciona' ? lastCue.current : null;
  }, [active]);

  useEffect(
    () =>
      onGuide((cue) => {
        lastCue.current = cue.mood;
        cueMood.current = cue.mood;
      }),
    []
  );

  // Defer the three.js chunk to idle time, like the hero stage did.
  useEffect(() => {
    if (!enabled) {
      setMounted(false);
      return;
    }
    const idle = (window as any).requestIdleCallback as ((cb: () => void, o?: object) => number) | undefined;
    const h = idle ? idle(() => setMounted(true), { timeout: 600 }) : window.setTimeout(() => setMounted(true), 150);
    return () => {
      if (idle) (window as any).cancelIdleCallback?.(h);
      else clearTimeout(h);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !mounted) return;
    const box = boxRef.current;
    if (!box) return;

    const n = STAGE_ORDER.length;
    const els: (Element | null)[] = new Array(n).fill(null);
    const boxes: (SectionBox | null)[] = new Array(n).fill(null);
    const store: SectionBox[] = Array.from({ length: n }, () => ({ top: 0, bottom: 0 }));
    // Live copies of every pose: a section can pin MIO to an element of its own with
    // data-mio-anchor="<stop id>" (the hero stage, the ring in the closing slab).
    const poses: PetPose[] = STAGE_ORDER.map((id) => ({ ...STAGE_POSES[id] }));
    const anchors: (Element | null)[] = new Array(n).fill(null);
    const out: PetPose = { ...STAGE_POSES.hero };

    const query = () => {
      for (let i = 0; i < n; i++) {
        const id = STAGE_ORDER[i];
        els[i] = id === '__footer' ? document.querySelector('footer') : document.getElementById(id);
      }
      for (let i = 0; i < n; i++) {
        anchors[i] = document.querySelector(`[data-mio-anchor="${STAGE_ORDER[i]}"]`);
      }
    };
    query();

    petDrive.active = true;

    let raf = 0;
    let frame = 0;
    let lastY = window.scrollY;
    let vel = 0;
    let lastCx = 0;
    let dx = 0;
    let lastDock = false;
    let lastMood: StageMood | null = null;
    let lastZ = -1;
    let lastTransform = '';

    const tick = () => {
      raf = requestAnimationFrame(tick);
      frame++;
      if (frame % 45 === 0) query();

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      for (let i = 0; i < n; i++) {
        const el = els[i];
        if (el && el.isConnected) {
          const r = el.getBoundingClientRect();
          store[i].top = r.top;
          store[i].bottom = r.bottom;
          boxes[i] = store[i];
        } else {
          boxes[i] = null;
        }
      }

      // Stops that carry an anchor element stand wherever that element is right now.
      for (let i = 0; i < n; i++) {
        const el = anchors[i];
        if (!el || !el.isConnected) continue;
        const r = el.getBoundingClientRect();
        if (r.height > 0) {
          poses[i].x = (r.left + r.width / 2) / vw;
          poses[i].y = (r.top + r.height / 2) / vh;
          poses[i].size = r.height / vh;
        }
      }

      const res = resolveStage(boxes, vh, 0.5);
      const a = poses[res.index];
      const b = res.neighbour < 0 ? a : poses[res.neighbour];
      mixPose(a, b, res.blend, out);

      // Scroll velocity (smoothed, signed): MIO turns its head into the direction of travel.
      const y = window.scrollY;
      vel += (y - lastY - vel) * 0.18;
      lastY = y;

      // Flight progress 0..1 (peaks at the seam between two stops): drives the hop.
      let f = 0;
      if (res.neighbour >= 0) f = res.neighbour > res.index ? res.blend : 1 - res.blend;
      const hop = Math.sin(Math.PI * f) * (f > 0 && f < 1 ? 0.42 : 0);

      // Display size and position.
      const displayed = clamp(out.size * vh, 90, vh * 1.05);
      const s = displayed / BOX;
      const cx = out.x * vw;
      const cy = out.y * vh;
      dx += (cx - lastCx - dx) * 0.2;
      lastCx = cx;

      const tx = cx - (BOX * s) / 2;
      const ty = cy - (BOX * s) / 2;
      const t = `translate3d(${tx.toFixed(1)}px,${ty.toFixed(1)}px,0) scale(${s.toFixed(4)})`;
      if (t !== lastTransform) {
        lastTransform = t;
        box.style.transform = t;
      }

      const z = out.above > 0.5 ? Z_ABOVE : Z_BEHIND;
      if (z !== lastZ) {
        lastZ = z;
        box.style.zIndex = String(z);
      }

      // Drive the stage: a slow turntable with your reading, a lean into the flight, a hop at the seam.
      const turntable = (res.progress - 0.5) * 34;
      const yawDeg = out.yaw + turntable + clamp(vel * 0.7, -26, 26);
      petDrive.yaw += (yawDeg * DEG - petDrive.yaw) * 0.12;
      petDrive.roll += (clamp(-dx * 0.006, -0.28, 0.28) - petDrive.roll) * 0.15;
      petDrive.hop += (hop - petDrive.hop) * 0.25;
      petDrive.pad += (out.pad - petDrive.pad) * 0.12;
      petDrive.dark = out.dark > 0.5;
      // A section's own cue wins, except in the footer (no registered section: the cue would be stale).
      const cue = STAGE_ORDER[res.index] === '__footer' ? null : cueMood.current;
      const nextMood: StageMood = cue ?? out.mood ?? 'reposo';
      petDrive.baseMood = nextMood;
      if (nextMood !== lastMood) {
        lastMood = nextMood;
        window.dispatchEvent(new CustomEvent('mio:basemood', { detail: { mood: nextMood } }));
      }

      const docked = out.dock > 0.6;
      if (docked !== lastDock) {
        lastDock = docked;
        window.dispatchEvent(new CustomEvent('mio:dock', { detail: { docked } }));
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      petDrive.active = false;
      petDrive.baseMood = null;
      window.dispatchEvent(new CustomEvent('mio:dock', { detail: { docked: false } }));
    };
  }, [enabled, mounted]);

  if (!enabled) return null;

  return (
    <div
      ref={boxRef}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 select-none"
      style={{
        width: BOX,
        height: BOX,
        zIndex: Z_BEHIND,
        transformOrigin: '0 0',
        transform: 'translate3d(-200vw,0,0)',
        willChange: 'transform',
      }}
    >
      {mounted && (
        <Suspense fallback={null}>
          <MioHeroStage driven dither pixelSize={3} hideTag className="absolute inset-0" />
        </Suspense>
      )}
    </div>
  );
};

export default MioTravellerLayer;
