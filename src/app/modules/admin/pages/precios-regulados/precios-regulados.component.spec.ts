import { describe, expect, it } from 'vitest';
import { dateOnly, regulatedPriceStatus } from './precios-regulados.component';

const now = new Date('2026-06-15T12:00:00Z');
const row = (codigoDigemid: string | null, vigenteDesde: string | null, vigenteHasta: string | null) => ({
  codigoDigemid,
  vigenteDesde,
  vigenteHasta,
});

describe('dateOnly', () => {
  it('muestra la fecha guardada, sin restarle un día por la zona horaria', () => {
    expect(dateOnly('2025-01-01T00:00:00.000Z')).toBe('01/01/2025');
  });
});

describe('regulatedPriceStatus', () => {
  it('sigue la misma regla que el control de ventas', () => {
    expect(regulatedPriceStatus(row('A1', null, null), now).label).toBe('Vigente');
    expect(regulatedPriceStatus(row('A1', '2026-01-01', null), now).label).toBe('Vigente');
    expect(regulatedPriceStatus(row('A1', '2026-01-01', '2026-12-31'), now).label).toBe('Vigente');
    expect(regulatedPriceStatus(row('A1', '2026-01-01', '2026-02-01'), now).label).toBe('Vencido');
    expect(regulatedPriceStatus(row('A1', '2026-09-01', null), now).label).toBe('No vigente');
    expect(regulatedPriceStatus(row('A1', null, '2026-12-31'), now).label).toBe('No vigente');
    expect(regulatedPriceStatus(row(null, null, null), now).label).toBe('Sin código');
  });
});
