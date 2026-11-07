/** Nivel de stock de un producto: cuanto menos queda, más cerca del rojo. */
export type StockLevel = 'normal' | 'bajo' | 'critico' | 'agotado';

export const STOCK_LEVEL_LABELS: Record<StockLevel, string> = {
  normal: 'Normal',
  bajo: 'Bajo',
  critico: 'Crítico',
  agotado: 'Agotado',
};

/**
 * Agotado: sin stock. Crítico: en el mínimo o menos. Bajo: hasta el doble del mínimo.
 * Con mínimo 0 solo se avisa al agotarse.
 */
export function stockLevel(total: number | string, minimo: number | null | undefined): StockLevel {
  const stock = Number(total);
  const min = Number(minimo ?? 0);
  if (!Number.isFinite(stock) || stock <= 0) return 'agotado';
  if (stock <= min) return 'critico';
  if (stock <= min * 2) return 'bajo';
  return 'normal';
}
