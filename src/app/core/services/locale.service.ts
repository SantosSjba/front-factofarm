import { Injectable, signal } from '@angular/core';

const LOCALE = 'es-PE';
const CURRENCY = 'PEN';
export const DEFAULT_TIME_ZONE = 'America/Lima';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  readonly locale = LOCALE;
  readonly currency = CURRENCY;

  private readonly timeZoneSignal = signal(DEFAULT_TIME_ZONE);
  /** Zona IANA activa del establecimiento (default America/Lima). */
  readonly timeZone = this.timeZoneSignal.asReadonly();

  setTimeZone(timeZone: string | null | undefined): void {
    const tz = timeZone?.trim();
    if (!tz) {
      this.timeZoneSignal.set(DEFAULT_TIME_ZONE);
      return;
    }
    try {
      Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
      this.timeZoneSignal.set(tz);
    } catch {
      this.timeZoneSignal.set(DEFAULT_TIME_ZONE);
    }
  }

  resetTimeZone(): void {
    this.timeZoneSignal.set(DEFAULT_TIME_ZONE);
  }

  /** YYYY-MM-DD en la zona del establecimiento. */
  todayYmd(date: Date = new Date()): string {
    return this.formatYmd(date);
  }

  /** Primer día del mes civil actual (YYYY-MM-DD). */
  monthStartYmd(date: Date = new Date()): string {
    const ymd = this.formatYmd(date);
    return `${ymd.slice(0, 7)}-01`;
  }

  /** Periodo YYYY-MM en la zona del establecimiento. */
  currentYearMonth(date: Date = new Date()): string {
    return this.formatYmd(date).slice(0, 7);
  }

  formatYmd(value: string | Date): string {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.timeZoneSignal(),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const y = parts.find((p) => p.type === 'year')?.value ?? '1970';
    const m = parts.find((p) => p.type === 'month')?.value ?? '01';
    const d = parts.find((p) => p.type === 'day')?.value ?? '01';
    return `${y}-${m}-${d}`;
  }

  formatDate(value: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions): string {
    if (!value) return '—';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat(LOCALE, {
      timeZone: this.timeZoneSignal(),
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
