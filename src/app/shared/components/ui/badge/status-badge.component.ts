import { Component, Input } from '@angular/core';

export type StatusTone = 'success' | 'error' | 'warning' | 'info' | 'brand' | 'purple' | 'neutral';

/** Clases por tono, válidas en tema claro y oscuro. */
const TONE_CLASSES: Record<StatusTone, string> = {
  success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400',
  error: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400',
  info: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-400',
  brand: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-400',
  neutral: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300',
};

/** Estados de dominio (SUNAT, OC, CxP, delivery, ventas…) → tono visual. */
const TONE_BY_STATUS: Record<string, StatusTone> = {
  ACEPTADO: 'success',
  ENTREGADO: 'success',
  PAGADA: 'success',
  PAGADO: 'success',
  RECIBIDA: 'success',
  COMPLETADA: 'success',
  CONVERTIDA: 'success',
  APROBADO: 'success',
  ACTIVE: 'success',
  RESOLVED: 'success',
  APROBADA: 'brand',
  CERRADA: 'neutral',
  BORRADOR: 'neutral',
  RECIBIDO: 'neutral',
  CLOSED: 'neutral',
  ENVIADA: 'info',
  EN_CAMINO: 'info',
  IN_REVIEW: 'info',
  TRIAL: 'info',
  PENDIENTE: 'warning',
  ENVIANDO: 'warning',
  PREPARANDO: 'warning',
  PARCIAL: 'warning',
  PARCIALMENTE_RECIBIDA: 'warning',
  PARCIALMENTE_DEVUELTA: 'warning',
  OBSERVADO: 'warning',
  SOLICITADO: 'warning',
  PENDING: 'warning',
  RECHAZADO: 'error',
  CANCELADO: 'error',
  ANULADA: 'error',
  ANULADO: 'error',
  VENCIDA: 'error',
  SUSPENDED: 'error',
  CONTINGENCIA: 'purple',
};

export function statusTone(status: string | null | undefined): StatusTone {
  return (status && TONE_BY_STATUS[status]) || 'neutral';
}

/** Para pills con markup propio (icono, tamaño especial). Preferir `<app-status-badge>`. */
export function statusToneClasses(status: string | null | undefined, tone?: StatusTone): string {
  return TONE_CLASSES[tone ?? statusTone(status)];
}

@Component({
  selector: 'app-status-badge',
  host: { class: 'inline-flex' },
  template: `
    <span
      class="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium"
      [class]="classes"
    >
      <ng-content />{{ text }}
    </span>
  `,
})
export class StatusBadgeComponent {
  @Input({ required: true }) status: string | null | undefined = '';
  /** Texto visible; por defecto el estado con espacios en lugar de "_". */
  @Input() label?: string | null;
  /** Fuerza un tono cuando el estado no está en el mapa. */
  @Input() tone?: StatusTone;

  protected get classes(): string {
    return statusToneClasses(this.status, this.tone);
  }

  protected get text(): string {
    return this.label ?? (this.status ?? '—').replace(/_/g, ' ');
  }
}
