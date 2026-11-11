import type { StatusTone } from '../../../shared/components/ui/badge/status-badge.component';
import type { LegendTone } from '../../../shared/components/ui/color-legend/color-legend.component';
import { paymentMethodLabel } from './sale-labels';

/** Estados de cuentas por cobrar y por pagar (mismos valores en ambas). */
const DEBT_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  PENDIENTE: { label: 'Pendiente', tone: 'warning' },
  PARCIAL: { label: 'Pago parcial', tone: 'info' },
  VENCIDA: { label: 'Vencida', tone: 'error' },
  PAGADA: { label: 'Pagada', tone: 'success' },
  ANULADA: { label: 'Anulada', tone: 'neutral' },
};

export function debtStatusLabel(status: string | null | undefined): string {
  return (status && DEBT_STATUS[status]?.label) || status || '—';
}

export function debtStatusTone(status: string | null | undefined): StatusTone {
  return (status && DEBT_STATUS[status]?.tone) || 'neutral';
}

/** Fila pintada: vencida en rojo; vence en 7 días en ámbar. */
export function debtRowTone(row: { estado: string; fechaVencimiento: string | null }): LegendTone | null {
  if (row.estado === 'VENCIDA') return 'error-light';
  if ((row.estado === 'PENDIENTE' || row.estado === 'PARCIAL') && row.fechaVencimiento) {
    const days = (new Date(row.fechaVencimiento).getTime() - Date.now()) / 86_400_000;
    if (days <= 7) return 'warning';
  }
  return null;
}

/** Opciones del filtro de estado; «ABIERTA» = todo lo que falta cobrar o pagar. */
export function debtStatusOptions(openLabel: string) {
  return [
    { value: 'ABIERTA', label: openLabel },
    { value: 'VENCIDA', label: 'Vencidas' },
    { value: 'PENDIENTE', label: 'Pendientes' },
    { value: 'PARCIAL', label: 'Con pago parcial' },
    { value: 'PAGADA', label: 'Pagadas' },
    { value: 'ANULADA', label: 'Anuladas' },
    { value: '', label: 'Todas' },
  ];
}

const PAYMENT_TYPE: Record<string, { label: string; tone: StatusTone; sign: 1 | -1 }> = {
  VENTA: { label: 'Cobro de venta', tone: 'success', sign: 1 },
  COBRO_CLIENTE: { label: 'Cobro a cliente', tone: 'info', sign: 1 },
  PAGO_PROVEEDOR: { label: 'Pago a proveedor', tone: 'warning', sign: -1 },
};

export function paymentTypeLabel(tipo: string): string {
  return PAYMENT_TYPE[tipo]?.label ?? tipo;
}
export function paymentTypeTone(tipo: string): StatusTone {
  return PAYMENT_TYPE[tipo]?.tone ?? 'neutral';
}
export function paymentTypeSign(tipo: string): 1 | -1 {
  return PAYMENT_TYPE[tipo]?.sign ?? 1;
}

/** Medio de pago con nombre legible (incluye «Sin especificar»). */
export function financeMethodLabel(method: string | null | undefined): string {
  if (!method || method === 'SIN_ESPECIFICAR') return 'Sin especificar';
  return paymentMethodLabel(method);
}

/** Medios para registrar cobros y pagos manuales. */
export const DEBT_PAYMENT_METHODS = [
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'YAPE', label: 'Yape' },
  { value: 'PLIN', label: 'Plin' },
  { value: 'TARJETA', label: 'Tarjeta' },
];

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** Formato de soles para valores de tarjetas (app-kpi-tile recibe texto). */
const PEN = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
export function soles(value: string | number | null | undefined): string {
  return PEN.format(Number(value) || 0);
}
