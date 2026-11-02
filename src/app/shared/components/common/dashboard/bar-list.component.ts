import { Component, computed, input } from '@angular/core';

export type BarListRow = {
  key: string;
  label: string;
  /** Magnitud que define el largo de la barra. */
  value: number;
  /** Texto del valor (ya formateado: S/ 1 234.50). */
  valueText: string;
  /** Detalle secundario (p. ej. "34 ventas"). */
  sub?: string;
};

/**
 * Lista de barras horizontales compacta: compara magnitudes de pocas categorías
 * (medios de pago, comprobantes, vendedores, productos). Un solo tono: el color no codifica identidad;
 * cada fila lleva su etiqueta y valor escritos, y el % de participación.
 */
@Component({
  selector: 'app-bar-list',
  standalone: true,
  template: `
    @if (rows().length) {
      <ul class="space-y-1.5" [attr.aria-label]="ariaLabel()">
        @for (row of view(); track row.key) {
          <li class="group" [attr.title]="row.label + ': ' + row.valueText + (row.sub ? ' · ' + row.sub : '') + ' · ' + row.share + '%'">
            <div class="flex items-baseline justify-between gap-2 text-theme-xs">
              <span class="min-w-0 truncate text-gray-700 dark:text-gray-300">{{ row.label }}</span>
              <span class="shrink-0 tabular-nums text-gray-800 dark:text-white/90">
                <span class="font-medium">{{ row.valueText }}</span>
                <span class="ml-1 text-gray-400">{{ row.share }}%</span>
              </span>
            </div>
            <div class="mt-0.5 flex items-center gap-2">
              <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
                <div class="h-full rounded-full bg-brand-500 transition-all group-hover:bg-brand-600" [style.width.%]="row.width"></div>
              </div>
              @if (row.sub) {
                <span class="w-16 shrink-0 text-right text-[11px] tabular-nums text-gray-500">{{ row.sub }}</span>
              }
            </div>
          </li>
        }
      </ul>
    } @else {
      <p class="py-3 text-center text-theme-xs text-gray-500">{{ emptyText() }}</p>
    }
  `,
  host: { class: 'block' },
})
export class BarListComponent {
  readonly rows = input.required<BarListRow[]>();
  readonly emptyText = input('Sin datos en el periodo.');
  readonly ariaLabel = input<string | null>(null);

  protected readonly view = computed(() => {
    const rows = this.rows();
    const max = Math.max(...rows.map((r) => r.value), 0);
    const sum = rows.reduce((a, r) => a + r.value, 0);
    return rows.map((r) => ({
      ...r,
      width: max > 0 ? Math.max(2, (r.value / max) * 100) : 0,
      share: sum > 0 ? Math.round((r.value / sum) * 100) : 0,
    }));
  });
}
