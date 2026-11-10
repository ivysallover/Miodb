import { describe, expect, it } from 'vitest';
import { plain } from '../../dashboard-ia/frontend/src/lib/csvText';

describe('CSV exportado', () => {
  it('un texto con forma de fórmula no se ejecuta al abrirlo en Excel', () => {
    expect(plain('=HYPERLINK("http://x")')).toBe(`'=HYPERLINK("http://x")`);
    expect(plain('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(plain('+54 11 5555')).toBe("'+54 11 5555");
  });
  it('los números con signo y el texto común quedan igual', () => {
    expect(plain('-12.5')).toBe('-12.5');
    expect(plain('Norte')).toBe('Norte');
  });
});
