import type { PurchaseOrderStatus } from '../models/directory.models';

/** Nombre visible de cada estado de una orden de compra. */
export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  BORRADOR: 'Borrador',
  APROBADA: 'Aprobada',
  ENVIADA: 'Enviada',
  PARCIALMENTE_RECIBIDA: 'Parcialmente recibida',
  RECIBIDA: 'Recibida',
  CERRADA: 'Cerrada',
  ANULADA: 'Anulada',
};

export function purchaseOrderStatusLabel(estado: PurchaseOrderStatus): string {
  return PURCHASE_ORDER_STATUS_LABELS[estado] ?? estado;
}

/** Opciones para filtrar por estado (en el orden del flujo). */
export const PURCHASE_ORDER_STATUS_OPTIONS = (Object.keys(PURCHASE_ORDER_STATUS_LABELS) as PurchaseOrderStatus[]).map(
  (value) => ({ value, label: PURCHASE_ORDER_STATUS_LABELS[value] }),
);

/** Reglas del API (`PurchasesService`): qué acción admite cada estado. */
export const canApprovePurchaseOrder = (estado: PurchaseOrderStatus) => estado === 'BORRADOR';
export const canSendPurchaseOrder = (estado: PurchaseOrderStatus) => estado === 'APROBADA';
export const canCancelPurchaseOrder = (estado: PurchaseOrderStatus) => estado === 'BORRADOR' || estado === 'APROBADA';
export const canReceivePurchaseOrder = (estado: PurchaseOrderStatus) =>
  estado === 'ENVIADA' || estado === 'PARCIALMENTE_RECIBIDA';
