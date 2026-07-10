import { toMajorUnits, toMinorUnits } from '../src/utils/money';

describe('money conversion', () => {
  it('converts major units to integer cents', () => {
    expect(toMinorUnits(19.99)).toBe(1999);
    expect(toMinorUnits(0.01)).toBe(1);
    expect(toMinorUnits(1000)).toBe(100000);
  });

  it('converts cents back to major units', () => {
    expect(toMajorUnits(1999)).toBe(19.99);
    expect(toMajorUnits(1)).toBe(0.01);
  });

  it('round-trips without drift on tricky values', () => {
    for (const v of [0.1, 0.2, 0.3, 19.99, 123.45, 999.99]) {
      expect(toMajorUnits(toMinorUnits(v))).toBe(v);
    }
  });

  it('rejects more than 2 decimal places', () => {
    expect(() => toMinorUnits(19.999)).toThrow(/2 decimal places/);
  });

  it('rejects non-finite input', () => {
    expect(() => toMinorUnits(Infinity)).toThrow();
    expect(() => toMinorUnits(NaN)).toThrow();
  });
});
