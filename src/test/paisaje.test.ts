import { describe, it, expect } from 'vitest';
import {
  slotOf, heightOf, beatAt, oddLit, forecastIn, cameraKeys, sampleCamera, angleOf, ringOf, ringRadius, colWidth, polar,
  walkToEnd, turnToRange, riseAt, canvasIn, captionOn, MAX_H, TILT, TOP_H, GAP, TURN, R0, END_SPOT, RING_PITCH, COL_D,
} from '@/lib/paisaje';

// Story time q (0..1) to pin progress p: the story starts after the opening tilt.
const P = (q: number) => TILT + q * (1 - TILT);
const norm = (deg: number) => ((deg % 360) + 360) % 360;

describe('paisaje layout', () => {
  it('reads the calendar, leap years included', () => {
    expect(slotOf('2021-01-01', 0)).toMatchObject({ row: 0, doy: 0, year: 2021, month: 0, daysInYear: 365 });
    expect(slotOf('2021-01-01', 365)).toMatchObject({ row: 1, doy: 0, year: 2022 });
    expect(slotOf('2021-01-01', 1460)).toMatchObject({ row: 3, doy: 365, year: 2024, daysInYear: 366 });
    expect(slotOf('2021-01-01', 1825)).toMatchObject({ row: 4, doy: 364, year: 2025, month: 11 });
  });

  it('lays a year around the dial and leaves it open between December and January', () => {
    const first = angleOf(0);
    const last = angleOf(364);
    expect(last - first).toBeGreaterThan(350);
    expect(last - first).toBeLessThan(360 - GAP);
    // a leap year fits the same arc
    expect(angleOf(365, 366)).toBeLessThan(TURN + 360 - GAP / 2);
    // 1 December points north, where the opening shot looks
    expect(Math.min(norm(angleOf(334)), 360 - norm(angleOf(334)))).toBeLessThan(1.5);
  });

  it('puts the most recent year on the inner ring and keeps columns from touching', () => {
    expect(ringOf(4, 5)).toBe(0);
    expect(ringOf(0, 5)).toBe(4);
    expect(ringRadius(0)).toBe(R0);
    for (let ring = 0; ring < 5; ring++) {
      const arcPerDay = (2 * Math.PI * ringRadius(ring) * (360 - GAP)) / 360 / 365;
      expect(colWidth(ring)).toBeLessThan(arcPerDay);
    }
  });

  it('north is -Z and angles run clockwise seen from above', () => {
    const o = { x: 0, z: 0 };
    polar(0, 10, o);
    expect(o.x).toBeCloseTo(0, 6);
    expect(o.z).toBeCloseTo(-10, 6);
    polar(90, 10, o);
    expect(o.x).toBeCloseTo(10, 6);
    expect(o.z).toBeCloseTo(0, 6);
  });

  it('scales heights to the tallest day and never to zero', () => {
    expect(heightOf(200, 200)).toBe(MAX_H);
    expect(heightOf(0, 200)).toBeGreaterThan(0);
  });
});

describe('paisaje script', () => {
  it('opens looking straight down at empty paper outside the dial', () => {
    const out = [0, 0, 0, 0, 0, 0];
    sampleCamera(cameraKeys(), 0, out);
    expect(out[1]).toBe(TOP_H);
    expect(out[4]).toBe(0);
    expect(Math.hypot(out[3] - out[0], out[5] - out[2])).toBeLessThan(1); // straight down
    // nothing but paper in view: the near edge of the frame is beyond the outer ring and its printed rim
    const r = Math.hypot(out[0], out[2]);
    const outerRim = R0 + 4 * RING_PITCH + COL_D / 2 + 2.2;
    expect(r - TOP_H * Math.tan((17 * Math.PI) / 180)).toBeGreaterThan(outerRim + 10);
    expect(canvasIn(0)).toBe(0);
    expect(canvasIn(0.05)).toBe(1);
    expect(riseAt(0)).toBe(0);
    expect(riseAt(P(0.1))).toBe(1);
    expect(captionOn(0.02)).toBe(false);
    expect(captionOn(P(0))).toBe(true);
  });

  it('moves through four beats in order', () => {
    expect([0, P(0), P(0.1), P(0.3), P(0.6), P(0.9), 1].map(beatAt)).toEqual([0, 0, 0, 1, 2, 3, 3]);
  });

  it('never flies through MIO: inside the dial the camera keeps its distance from the centre', () => {
    const keys = cameraKeys();
    const out = [0, 0, 0, 0, 0, 0];
    for (let q = 0.24; q <= 0.8; q += 0.01) {
      sampleCamera(keys, P(q), out);
      expect(Math.hypot(out[0], out[2])).toBeGreaterThan(12);
    }
  });

  it('ends on the last fortnight, looking at it from inside the dial', () => {
    const out = [0, 0, 0, 0, 0, 0];
    sampleCamera(cameraKeys(), 1, out);
    const lookR = Math.hypot(out[3], out[5]);
    expect(lookR).toBeGreaterThan(R0 - 6);
    expect(Math.hypot(out[0], out[2])).toBeLessThan(R0 - 10);
    const lookDeg = norm((Math.atan2(out[3], -out[5]) * 180) / Math.PI);
    expect(Math.abs(lookDeg - norm(angleOf(357)))).toBeLessThan(3);
  });

  it('lights the odd days in their beat, then the rods, and MIO walks to them', () => {
    expect(oddLit(P(0.5))).toBe(0);
    expect(oddLit(P(0.78))).toBeCloseTo(1, 4);
    expect(forecastIn(P(0.85))).toBe(0);
    expect(forecastIn(1)).toBe(1);
    expect(turnToRange(P(0.3))).toBe(0);
    expect(turnToRange(P(0.7))).toBeGreaterThan(0.7); // three-quarters: its face still catches the light
    expect(turnToRange(1)).toBe(0);
    expect(walkToEnd(P(0.79))).toBe(0);
    expect(walkToEnd(P(0.92))).toBe(1);
    expect(END_SPOT.r).toBeLessThan(R0 - 5);
  });
});
