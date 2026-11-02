import { Component, computed, input } from '@angular/core';

/**
 * Columnas por hora del día (00–23): muestra las horas pico de venta.
 * Un solo tono; la hora con más ventas se resalta y se rotula.
 */
@Component({
  selector: 'app-hour-columns',
  standalone: true,
  template: `
    @if (hasData()) {
      <div class="flex h-24 items-end gap-[2px]" role="img" [attr.aria-label]="summary()">
        @for (h of view(); track h.hour) {
          <div
            class="group relative flex h-full flex-1 items-end"
            [attr.title]="h.label + ' · ' + h.valueText + ' · ' + h.count + ' ventas'"
          >
            <div
              class="w-full rounded-t-[3px] transition-colors"
              [class]="h.peak ? 'bg-brand-600' : 'bg-brand-300 group-hover:bg-brand-500 dark:bg-brand-500/60'"
              [style.height.%]="h.height"
            ></div>
          </div>
        }
      </div>
      <div class="mt-1 flex justify-between text-[10px] tabular-nums text-gray-400">
        <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
      </div>
      <p class="mt-1 text-theme-xs text-gray-600 dark:text-gray-400">{{ summary() }}</p>
    } @else {
      <p class="py-6 text-center text-theme-xs text-gray-500">Sin ventas en el periodo.</p>
    }
  `,
  host: { class: 'block' },
})
export class HourColumnsComponent {
  readonly hours = input.required<Array<{ hour: number; total: string; count: number }>>();
  readonly format = input.required<(value: number) => string>();

  protected readonly hasData = computed(() => this.hours().some((h) => h.count > 0));

  protected readonly view = computed(() => {
    const rows = this.hours();
    const max = Math.max(...rows.map((h) => Number(h.total)), 0);
    const peak = rows.reduce((best, h) => (Number(h.total) > Number(best.total) ? h : best), rows[0]);
    return rows.map((h) => ({
      hour: h.hour,
      count: h.count,
      label: `${String(h.hour).padStart(2, '0')}:00`,
      valueText: this.format()(Number(h.total)),
      height: max > 0 ? Math.max(Number(h.total) > 0 ? 4 : 0, (Number(h.total) / max) * 100) : 0,
      peak: h === peak && Number(h.total) > 0,
    }));
  });

  protected readonly summary = computed(() => {
    const peak = this.view().find((h) => h.peak);
    return peak ? `Hora pico: ${peak.label}–${String(peak.hour + 1).padStart(2, '0')}:00 (${peak.valueText}, ${peak.count} ventas)` : '';
  });
}
