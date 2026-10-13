import { describe, it, expect } from 'vitest';
import { placeInLine, lineNote } from '../lib/analysisLine';

// The waiting screen says "estamos teniendo breves demoras" only while the engine has the analysis in line.
describe('analysis line', () => {
  it('gives a place only while the analysis waits its turn', () => {
    expect(placeInLine({ state: 'waiting', position: 3 })).toBe(3);
    expect(placeInLine({ state: 'running', position: 0 })).toBeNull();
    expect(placeInLine({ state: 'none', position: 0 })).toBeNull();
    expect(placeInLine(null)).toBeNull();
    expect(placeInLine(undefined)).toBeNull();
  });

  it('never shows a place below 1 while waiting', () => {
    expect(placeInLine({ state: 'waiting', position: 0 })).toBe(1);
    expect(placeInLine({ state: 'waiting', position: Number.NaN })).toBe(1);
    expect(placeInLine({ state: 'waiting', position: 2.9 })).toBe(2);
  });

  it('says the place in plain words and that nothing has to be done', () => {
    expect(lineNote(1)).toMatch(/es el próximo en la fila/);
    expect(lineNote(4)).toMatch(/está 4\.º en la fila/);
    expect(lineNote(4)).toMatch(/Arranca solo cuando le toque/);
  });
});
