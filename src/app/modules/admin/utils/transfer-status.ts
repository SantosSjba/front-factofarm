import type { StatusTone } from '../../../shared/components/ui/badge/status-badge.component';

/** Estados de un traslado entre almacenes, con su nombre y color. */
const TRANSFER_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  BORRADOR: { label: 'Borrador', tone: 'neutral' },
  EN_TRANSITO: { label: 'En tránsito', tone: 'info' },
  RECIBIDO: { label: 'Recibido', tone: 'success' },
  ANULADO: { label: 'Anulado', tone: 'error' },
};

export function transferStatusLabel(estado: string | null | undefined): string {
  return (estado && TRANSFER_STATUS[estado]?.label) || estado || '—';
}

export function transferStatusTone(estado: string | null | undefined): StatusTone {
  return (estado && TRANSFER_STATUS[estado]?.tone) || 'neutral';
}

/** Opciones para filtrar por estado. */
export const TRANSFER_STATUS_OPTIONS = Object.entries(TRANSFER_STATUS).map(([value, s]) => ({ value, label: s.label }));
