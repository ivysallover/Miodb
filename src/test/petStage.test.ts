import { describe, it, expect } from 'vitest';
import { resolveStage, mixPose, STAGE_ORDER, STAGE_POSES, smootherstep } from '@/lib/petStage';

// Three stops of 1000 px with a 100 px gap, page scrolled so each one is at a known place.
const boxesAt = (scroll: number) => [
  { top: 0 - scroll, bottom: 1000 - scroll },
  { top: 1100 - scroll, bottom: 2100 - scroll },
  { top: 2200 - scroll, bottom: 3200 - scroll },
];

describe('resolveStage', () => {
  it('rests inside a stop, far from any edge', () => {
    // Playhead at 450 px (viewport 900, line 0.5): middle of stop 0.
    const r = resolveStage(boxesAt(0), 900);
    expect(r.index).toBe(0);
    expect(r.blend).toBe(0);
    expect(r.neighbour).toBe(-1);
    expect(r.progress).toBeGreaterThan(0.3);
    expect(r.progress).toBeLessThan(0.6);
  });

  it('glides toward the next stop near the bottom edge, never past one half', () => {
    const r = resolveStage(boxesAt(500), 900); // playhead at 950 px: 50 px above stop 0's bottom edge
    expect(r.index).toBe(0);
    expect(r.neighbour).toBe(1);
    expect(r.blend).toBeGreaterThan(0.1);
    expect(r.blend).toBeLessThanOrEqual(0.5);
  });

  it('is continuous across the boundary between two stops', () => {
    // Walk the playhead through the seam and watch the pose weight toward stop 1 (0 -> 1).
    let last = -1;
    for (let s = 400; s <= 1100; s += 10) {
      const r = resolveStage(boxesAt(s), 900);
      const w = r.index === 0 ? (r.neighbour === 1 ? r.blend : 0) : 1 - (r.neighbour === 0 ? r.blend : 0);
      if (last >= 0) expect(Math.abs(w - last)).toBeLessThan(0.12);
      last = w;
    }
    expect(last).toBeGreaterThan(0.9);
  });

  it('survives missing stops and an empty page', () => {
    expect(resolveStage([null, null], 900).index).toBe(0);
    const r = resolveStage([null, { top: 0, bottom: 2000 }], 900);
    expect(r.index).toBe(1);
  });
});

describe('poses', () => {
  it('has a pose for every stop', () => {
    for (const id of STAGE_ORDER) expect(STAGE_POSES[id]).toBeTruthy();
  });

  it('mixPose interpolates and writes in place', () => {
    const out = { ...STAGE_POSES.hero };
    mixPose(STAGE_POSES.hero, STAGE_POSES.cta, 0.5, out);
    expect(out.x).toBeCloseTo((STAGE_POSES.hero.x + STAGE_POSES.cta.x) / 2, 5);
    expect(out.size).toBeCloseTo((STAGE_POSES.hero.size + STAGE_POSES.cta.size) / 2, 5);
  });

  it('smootherstep is clamped and monotonic', () => {
    expect(smootherstep(-1)).toBe(0);
    expect(smootherstep(2)).toBe(1);
    expect(smootherstep(0.25)).toBeLessThan(smootherstep(0.75));
  });
});
