import { Pipe, PipeTransform, inject } from '@angular/core';
import { LocaleService } from '../../core/services/locale.service';

type DatePreset = 'short' | 'shortDate' | 'medium' | 'dateTime' | string;

const PRESET_OPTIONS: Record<string, Intl.DateTimeFormatOptions> = {
  short: { dateStyle: 'short', timeStyle: 'short' },
  shortDate: { dateStyle: 'short' },
  medium: { dateStyle: 'medium', timeStyle: 'medium' },
  dateTime: { dateStyle: 'short', timeStyle: 'short' },
};

@Pipe({ name: 'appDate', standalone: true, pure: false })
export class AppDatePipe implements PipeTransform {
  private readonly locale = inject(LocaleService);

  transform(
    value: string | Date | null | undefined,
    preset: DatePreset = 'short',
  ): string {
    return this.locale.formatDate(value, resolveOptions(preset));
  }
}

function resolveOptions(preset: DatePreset): Intl.DateTimeFormatOptions {
  if (PRESET_OPTIONS[preset]) {
    return PRESET_OPTIONS[preset];
  }
  return patternToOptions(preset);
}

/** Mapeo razonable de patrones comunes a opciones Intl (no es un formateador date-fns completo). */
function patternToOptions(pattern: string): Intl.DateTimeFormatOptions {
  const hasDate = /y{2,4}|M{1,4}|d{1,2}/.test(pattern);
  const hasTime = /H{1,2}|h{1,2}|m{1,2}|s{1,2}/.test(pattern);
  const options: Intl.DateTimeFormatOptions = {};

  if (hasDate) {
    if (/yyyy-MM-dd/.test(pattern) || /^y{4}.M{2}.d{2}/.test(pattern)) {
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
    } else if (/dd\/MM\/yyyy/.test(pattern) || /d{2}.M{2}.y{4}/.test(pattern)) {
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
    } else {
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
    }
  }

  if (hasTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.hourCycle = 'h23';
    if (/s{1,2}/.test(pattern)) {
      options.second = '2-digit';
    }
  }

  if (!hasDate && !hasTime) {
    return { dateStyle: 'short', timeStyle: 'short' };
  }

  return options;
}
