import { describe, it, expect } from 'vitest';
import { quickScan, toNumber, splitLine } from '@/lib/quickScan';

describe('toNumber', () => {
  it('reads Argentine and US money formats', () => {
    expect(toNumber('$41.200')).toBe(41200);
    expect(toNumber('$131.400,50')).toBe(131400.5);
    expect(toNumber('1,234.50')).toBe(1234.5);
    expect(toNumber('12,5')).toBe(12.5);
    expect(toNumber('1,234,567')).toBe(1234567);
    expect(toNumber('12 %')).toBe(12);
  });
  it('rejects text and empties', () => {
    expect(toNumber('Lun 10/03')).toBeNull();
    expect(toNumber('')).toBeNull();
    expect(toNumber('—')).toBeNull();
  });
});

describe('splitLine', () => {
  it('honours quotes and separators', () => {
    expect(splitLine('a,"b,c",d', ',')).toEqual(['a', 'b,c', 'd']);
    expect(splitLine('x;y;z', ';')).toEqual(['x', 'y', 'z']);
  });
});

describe('quickScan', () => {
  const csv = ['dia,ventas,notas'];
  for (let i = 1; i <= 20; i++) csv.push(`d${i},${i === 12 ? 131400 : 41000 + (i % 5) * 700},${i % 7 === 0 ? '' : 'ok'}`);

  it('counts the sheet and finds the odd sale', () => {
    const r = quickScan(csv.join('\n'))!;
    expect(r.rows).toBe(20);
    expect(r.cols).toBe(3);
    expect(r.numericCols).toContain('ventas');
    expect(r.oddCount).toBe(1);
    expect(r.odd[0].row).toBe(12);
    expect(r.odd[0].times).toBeGreaterThan(2);
    expect(r.missing).toBeGreaterThan(0);
  });

  it('handles semicolon files with decimal commas', () => {
    const rows = ['f;monto'];
    for (let i = 0; i < 12; i++) rows.push(`x${i};${(100 + i).toString().replace('.', ',')},50`);
    const r = quickScan(rows.join('\n'))!;
    expect(r.cols).toBe(2);
    expect(r.numericCols).toContain('monto');
  });

  it('returns null when there is nothing to read', () => {
    expect(quickScan('')).toBeNull();
    expect(quickScan('solo una linea')).toBeNull();
  });
});
