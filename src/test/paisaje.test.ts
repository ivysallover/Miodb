import { describe, it, expect } from 'vitest';
import { slotOf, heightOf, beatAt, oddLit, forecastIn, cameraKeys, sampleCamera, monthAtX, MAX_H, TILT, TOP_H, riseAt, canvasIn, captionOn } from '@/lib/paisaje';

describe('paisaje layout', () => {
  it('places days by day-of-year and year row, leap years included', () => {
    expect(slotOf('2021-01-01', 0)).toMatchObject({ row: 0, doy: 0, year: 2021, month: 0 });
    expect(slotOf('2021-01-01', 364)).toMatchObject({ row: 0, doy: 364, month: 11 });
    expect(slotOf('2021-01-01', 365)).toMatchObject({ row: 1, doy: 0, year: 2022 });
    // 2024 is a leap year: its 366th day exists, and 2025 still starts at day 0.
    expect(slotOf('2021-01-01', 1460)).toMatchObject({ row: 3, doy: 365, year: 2024 });
    expect(slotOf('2021-01-01', 1461)).toMatchObject({ row: 4, doy: 0, year: 2025 });
    expect(slotOf('2021-01-01', 1825)).toMatchObject({ row: 4, doy: 364, year: 2025, month: 11 });
  });

  it('scales heights to the tallest day and never to zero', () => {
    expect(heightOf(200, 200)).toBe(MAX_H);
    expect(heightOf(100, 200)).toBe(MAX_H / 2);
    expect(heightOf(0, 200)).toBeGreaterThan(0);
  });

  it('knows which month the camera is over', () => {
    expect(monthAtX(0)).toBe(0);
    expect(monthAtX(45)).toBe(1);
    expect(monthAtX(340)).toBe(11);
  });
});

// Story time q (0..1) to pin progress p: the story starts after the opening tilt.
const P = (q: number) => TILT + q * (1 - TILT);

describe('paisaje script', () => {
  it('opens looking straight down at the paper and only then tilts up', () => {
    const out = [0, 0, 0, 0, 0, 0];
    sampleCamera(cameraKeys(5), 0, out);
    expect(out[1]).toBe(TOP_H);
    expect(out[4]).toBe(0); // looking at the ground
    expect(Math.abs(out[3] - out[0])).toBeLessThan(1); // straight down
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

  it('lights the odd days only in their beat and keeps them lit', () => {
    expect(oddLit(P(0.5))).toBe(0);
    expect(oddLit(P(0.65))).toBeGreaterThan(0.2);
    expect(oddLit(P(0.8))).toBeCloseTo(1, 5);
    expect(oddLit(1)).toBe(1);
  });

  it('raises the prediction rods only at the end', () => {
    expect(forecastIn(P(0.8))).toBe(0);
    expect(forecastIn(1)).toBe(1);
  });

  it('flies from before January to the last days of the nearest year', () => {
    const keys = cameraKeys(5);
    const out = [0, 0, 0, 0, 0, 0];
    sampleCamera(keys, 1, out);
    expect(out[0]).toBeGreaterThan(330);
    expect(out[3]).toBeGreaterThan(350); // looking at the last fortnight
    // monotonic along the year: the camera never flies backwards
    let last = -Infinity;
    for (let p = 0; p <= 1.0001; p += 0.05) {
      sampleCamera(keys, p, out);
      expect(out[0]).toBeGreaterThanOrEqual(last);
      last = out[0];
    }
  });
});
