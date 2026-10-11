import { describe, expect, it } from 'vitest';
import { rewriteYearFirstDates, splitCsvLine, toDayFirst } from '@/utils/prepareUpload';

describe('toDayFirst', () => {
  it('rewrites year-first dates and keeps the time', () => {
    expect(toDayFirst('2024-01-13')).toBe('13/01/2024');
    expect(toDayFirst('2024/1/2')).toBe('02/01/2024');
    expect(toDayFirst('2024-01-13 10:30:00')).toBe('13/01/2024 10:30:00');
    expect(toDayFirst('2024-01-13T10:30:00Z')).toBe('13/01/2024 10:30:00');
    expect(toDayFirst('"2024-01-13"')).toBe('"13/01/2024"');
  });
  it('leaves everything else alone', () => {
    expect(toDayFirst('13/01/2024')).toBe('13/01/2024');
    expect(toDayFirst('Electrónica')).toBe('Electrónica');
    expect(toDayFirst('20240113')).toBe('20240113');
  });
});

describe('splitCsvLine', () => {
  it('keeps quoted cells whole', () => {
    expect(splitCsvLine('2024-01-02,"Hogar, deco",15', ',')).toEqual(['2024-01-02', '"Hogar, deco"', '15']);
  });
});

describe('rewriteYearFirstDates', () => {
  const csv = ['fecha,ventas,categoria', '2024-01-01,15400,Hogar', '2024-01-02,18200,"Hogar, deco"', '2024-01-13,12100,Indumentaria'].join('\n');

  it('rewrites only the date column and reports it', () => {
    const r = rewriteYearFirstDates(csv);
    expect(r?.columns).toEqual(['fecha']);
    expect(r?.text.split('\n')).toEqual(['fecha,ventas,categoria', '01/01/2024,15400,Hogar', '02/01/2024,18200,"Hogar, deco"', '13/01/2024,12100,Indumentaria']);
  });

  it('works with semicolons and keeps Windows line endings', () => {
    const r = rewriteYearFirstDates('fecha;monto\r\n2024-03-05;1.234,50\r\n2024-03-14;980,00');
    expect(r?.text).toBe('fecha;monto\r\n05/03/2024;1.234,50\r\n14/03/2024;980,00');
  });

  it('does nothing when there are no year-first dates', () => {
    expect(rewriteYearFirstDates('fecha,ventas\n01/02/2024,10\n13/02/2024,12')).toBeNull();
  });

  it('does nothing when the engine is going to read month-first', () => {
    // Numbers written the US way make the engine read month-first, where year-first dates are fine.
    expect(rewriteYearFirstDates('date,amount\n2024-01-02,"$1,234.50"\n2024-01-13,"$980.00"')).toBeNull();
    // So does another column with clear month/day/year dates.
    expect(rewriteYearFirstDates('created,shipped\n2024-01-02,01/25/2024\n2024-01-03,01/26/2024')).toBeNull();
  });

  it('does nothing with files it cannot read safely', () => {
    expect(rewriteYearFirstDates('fecha,nota\n2024-01-02,"sigue\nabajo"\n2024-01-13,ok')).toBeNull();
    expect(rewriteYearFirstDates('fecha,categor�a\n2024-01-02,a\n2024-01-13,b')).toBeNull();
  });
});
