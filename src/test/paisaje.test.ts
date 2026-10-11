import { describe, it, expect } from 'vitest';
import {
  slotOf, heightOf, beatAt, oddLit, forecastIn, cameraKeys, sampleCamera, angleOf, ringOf, ringRadius, colWidth, polar,
  walkToEnd, turnToRange, riseAt, canvasIn, captionOn, flatAt, proofIn, smapeTerms, MAX_H, TILT, TOP_H, GAP, TURN, R0,
  END_SPOT, RING_PITCH, COL_D, PROOF_AT, PROOF_X0, PROOF_LEN, PROOF_PITCH, type DailySeries,
} from '@/lib/paisaje';
import { readFileSync } from 'node:fs';

const series: DailySeries = JSON.parse(readFileSync('public/data/daily_series.json', 'utf8'));

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
    expect(riseAt(P(0.08))).toBe(1);
    expect(captionOn(0.02)).toBe(false);
    expect(captionOn(P(0))).toBe(true);
  });

  it('moves through seven beats in order', () => {
    expect([0, P(0), P(0.1), P(0.2), P(0.35), P(0.5), P(0.6), P(0.75), P(0.9), 1].map(beatAt)).toEqual([0, 0, 0, 1, 2, 3, 4, 5, 6, 6]);
    expect(beatAt(PROOF_AT - 0.001)).toBe(5);
    expect(beatAt(PROOF_AT)).toBe(6);
  });

  it('never flies through MIO: inside the dial the camera keeps its distance from the centre', () => {
    const keys = cameraKeys();
    const out = [0, 0, 0, 0, 0, 0];
    for (let q = 0.15; q <= 0.67; q += 0.01) {
      sampleCamera(keys, P(q), out);
      expect(Math.hypot(out[0], out[2])).toBeGreaterThan(12);
    }
  });

  it('stops on the last fortnight, looking at it from inside the dial', () => {
    const out = [0, 0, 0, 0, 0, 0];
    sampleCamera(cameraKeys(), P(0.83), out);
    const lookR = Math.hypot(out[3], out[5]);
    expect(lookR).toBeGreaterThan(R0 - 6);
    expect(Math.hypot(out[0], out[2])).toBeLessThan(R0 - 10);
    const lookDeg = norm((Math.atan2(out[3], -out[5]) * 180) / Math.PI);
    expect(Math.abs(lookDeg - norm(angleOf(357)))).toBeLessThan(3);
  });

  it('lights the odd days in their beat, then the rods, and MIO walks to them', () => {
    expect(oddLit(P(0.55))).toBe(0);
    expect(oddLit(P(0.68))).toBeCloseTo(1, 4);
    expect(forecastIn(P(0.73))).toBe(0);
    expect(forecastIn(P(0.82))).toBe(1);
    expect(turnToRange(P(0.4))).toBe(0);
    expect(turnToRange(P(0.62))).toBeGreaterThan(0.7); // three-quarters: its face still catches the light
    expect(turnToRange(P(0.75))).toBe(0);
    expect(walkToEnd(P(0.68))).toBe(0);
    expect(walkToEnd(P(0.77))).toBe(1);
    expect(END_SPOT.r).toBeLessThan(R0 - 5);
  });

  it('ends high over the whole dial, north up, with the columns lying flat', () => {
    const out = [0, 0, 0, 0, 0, 0];
    sampleCamera(cameraKeys(), 1, out);
    expect(out[1]).toBeGreaterThan(200);
    expect(out[2]).toBeGreaterThan(out[5]); // the camera is south of what it looks at
    expect(out[0]).toBeCloseTo(out[3], 4); // no yaw: north is straight up the screen
    // the whole dial fits under the lens (17 degrees of half field, measured along the view axis)
    const dist = Math.hypot(out[1], out[2] - out[5]);
    expect(dist * Math.tan((17 * Math.PI) / 180)).toBeGreaterThan(R0 + 4 * RING_PITCH + COL_D + 4);
    expect(flatAt(P(0.82))).toBe(0);
    expect(flatAt(P(0.92))).toBe(1);
    expect(proofIn(P(0.88))).toBe(0);
    expect(proofIn(1)).toBe(1);
    // the crane shot never dips: the camera only goes up from the fortnight
    let last = 0;
    for (let q = 0.83; q <= 0.92; q += 0.005) {
      sampleCamera(cameraKeys(), P(q), out);
      expect(out[1]).toBeGreaterThanOrEqual(last - 1e-6);
      last = out[1];
    }
  });
});

describe('the proof is the benchmark', () => {
  it('rebuilds every test from the series: the mean of the daily terms is its sMAPE', () => {
    expect(series.folds).toHaveLength(4);
    series.folds.forEach((f) => {
      const actual = series.values.slice(f.from_index, f.from_index + f.mio.length);
      const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
      expect(mean(smapeTerms(actual, f.mio))).toBeCloseTo(f.mio_smape, 1);
      expect(mean(smapeTerms(actual, f.naive))).toBeCloseTo(f.naive_smape, 1);
    });
    expect(series.backtest).toEqual(series.folds[3]);
  });

  it('matches the headline the page prints: 13,5 % against 17,0 %', () => {
    expect(series.mean_mio_smape.toFixed(1)).toBe('13.5');
    expect(series.mean_naive_smape.toFixed(1)).toBe('17.0');
    expect(series.odd_days).toHaveLength(108);
  });

  it('lays the four tests out inside the dial, clear of the month names', () => {
    const half = ((series.folds.length - 1) / 2) * PROOF_PITCH + 3;
    expect(Math.hypot(PROOF_X0, half)).toBeLessThan(R0 - 12);
    expect(Math.hypot(PROOF_X0 + PROOF_LEN, half)).toBeLessThan(R0 - 12);
  });
});
