import type { StatusTone } from '../../../shared/components/ui/badge/status-badge.component';
import type { LegendItem } from '../../../shared/components/ui/color-legend/color-legend.component';
import type { PaymentMethod, SaleStatus, SunatDocumentStatus } from '../models/directory.models';

/** Tipos de comprobante (venta y SUNAT) con el nombre que entiende el usuario. */
export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  BOLETA: 'Boleta',
  FACTURA: 'Factura',
  NOTA_VENTA: 'Nota de venta',
  TICKET: 'Ticket',
  NOTA_CREDITO: 'Nota de crédito',
  NOTA_DEBITO: 'Nota de débito',
  GUIA_REMISION_REMITENTE: 'Guía de remisión',
  GUIA_REMISION_TRANSPORTISTA: 'Guía transportista',
  RETENCION: 'Retención',
  PERCEPCION: 'Percepción',
  LIQUIDACION_COMPRA: 'Liquidación de compra',
  RESUMEN_BOLETAS: 'Resumen de boletas',
  COMUNICACION_BAJA: 'Comunicación de baja',
};

export function documentTypeLabel(type: string | null | undefined): string {
  return (type && DOCUMENT_TYPE_LABELS[type]) || type || '—';
}

/** «B001-00000025» o solo el tipo si aún no tiene número. */
export function documentNumber(row: { serie?: string | null; numero?: string | null }): string {
  return row.serie || row.numero ? `${row.serie ?? ''}-${row.numero ?? ''}`.replace(/^-/, '') : '—';
}

const SUNAT: Record<SunatDocumentStatus, { label: string; tone: StatusTone; hint: string }> = {
  PENDIENTE: { label: 'Pendiente', tone: 'warning', hint: 'En cola para enviarse a SUNAT.' },
  ENVIANDO: { label: 'Enviando', tone: 'warning', hint: 'Se está enviando a SUNAT.' },
  ACEPTADO: { label: 'Aceptado', tone: 'success', hint: 'SUNAT lo aceptó: es válido.' },
  OBSERVADO: { label: 'Aceptado con observaciones', tone: 'warning', hint: 'Es válido, pero SUNAT dejó observaciones que conviene corregir en adelante.' },
  RECHAZADO: { label: 'Rechazado', tone: 'error', hint: 'SUNAT lo rechazó: no es válido. Revisa el motivo y reenvíalo.' },
  CONTINGENCIA: { label: 'Contingencia', tone: 'purple', hint: 'Emitido sin conexión con SUNAT; se informará cuando vuelva el servicio.' },
  ANULADO: { label: 'Anulado (baja)', tone: 'error', hint: 'Se comunicó la baja a SUNAT.' },
};

export function sunatStatusLabel(status: string | null | undefined): string {
  return (status && SUNAT[status as SunatDocumentStatus]?.label) || 'Sin emitir';
}

export function sunatStatusTone(status: string | null | undefined): StatusTone {
  return (status && SUNAT[status as SunatDocumentStatus]?.tone) || 'neutral';
}

export function sunatStatusHint(status: string | null | undefined): string {
  return (status && SUNAT[status as SunatDocumentStatus]?.hint) || 'Aún no se envió a SUNAT.';
}

export const SUNAT_STATUS_OPTIONS = (Object.keys(SUNAT) as SunatDocumentStatus[]).map((value) => ({
  value,
  label: SUNAT[value].label,
}));

const SALE: Record<SaleStatus, { label: string; tone: StatusTone }> = {
  COMPLETADA: { label: 'Completada', tone: 'success' },
  PARCIALMENTE_DEVUELTA: { label: 'Devuelta en parte', tone: 'warning' },
  ANULADA: { label: 'Anulada', tone: 'error' },
};

export function saleStatusLabel(status: string | null | undefined): string {
  return (status && SALE[status as SaleStatus]?.label) || status || '—';
}

export function saleStatusTone(status: string | null | undefined): StatusTone {
  return (status && SALE[status as SaleStatus]?.tone) || 'neutral';
}

export const SALE_STATUS_OPTIONS = (Object.keys(SALE) as SaleStatus[]).map((value) => ({
  value,
  label: SALE[value].label,
}));

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  YAPE: 'Yape',
  PLIN: 'Plin',
  TRANSFERENCIA: 'Transferencia',
  CREDITO: 'Crédito',
  MIXTO: 'Mixto',
};

export function paymentMethodLabel(method: string | null | undefined): string {
  return (method && PAYMENT_METHOD_LABELS[method as PaymentMethod]) || method || '—';
}

/** Leyenda de colores de filas en listados de ventas y comprobantes. */
export const SALE_ROW_LEGEND: LegendItem[] = [
  { label: 'Anulada', tone: 'error-light' },
  { label: 'Rechazada por SUNAT o anulación pendiente', tone: 'warning' },
];
