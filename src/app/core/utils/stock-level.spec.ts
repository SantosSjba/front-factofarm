import { describe, expect, it } from 'vitest';
import { stockLevel } from './stock-level';

describe('stockLevel', () => {
  it('se vuelve más grave mientras queda menos stock', () => {
    expect(stockLevel(25, 10)).toBe('normal');
    expect(stockLevel(20, 10)).toBe('bajo');
    expect(stockLevel(11, 10)).toBe('bajo');
    expect(stockLevel(10, 10)).toBe('critico');
    expect(stockLevel(1, 10)).toBe('critico');
    expect(stockLevel(0, 10)).toBe('agotado');
  });

  it('acepta el total como texto decimal, como llega del API', () => {
    expect(stockLevel('2.5', 1)).toBe('normal');
    expect(stockLevel('0.000', 1)).toBe('agotado');
    expect(stockLevel('-3', 1)).toBe('agotado');
  });

  it('sin mínimo solo avisa al agotarse', () => {
    expect(stockLevel(1, 0)).toBe('normal');
    expect(stockLevel(1, null)).toBe('normal');
    expect(stockLevel(0, 0)).toBe('agotado');
  });
});
