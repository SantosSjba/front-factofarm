import { Injectable } from '@angular/core';

const LOCALE = 'es-PE';
const CURRENCY = 'PEN';
const TIME_ZONE = 'America/Lima';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  readonly locale = LOCALE;
  readonly currency = CURRENCY;
  readonly timeZone = TIME_ZONE;

  formatDate(value: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions): string {
    if (!value) return '—';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat(LOCALE, {
      timeZone: TIME_ZONE,
      ...options,
    }).format(date);
  }

  formatCurrency(amount: number | null | undefined): string {
    if (amount == null || Number.isNaN(amount)) return '—';
    return new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency: CURRENCY,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  formatNumber(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) return '—';
    return new Intl.NumberFormat(LOCALE).format(value);
  }
}
