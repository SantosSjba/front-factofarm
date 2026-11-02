import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../ui/icon/icon.component';

export type KpiTone = 'brand' | 'success' | 'warning' | 'error' | 'info' | 'gray';

const TONES: Record<KpiTone, string> = {
  brand: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400',
  success: 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400',
  warning: 'bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400',
  error: 'bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400',
  info: 'bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/10 dark:text-blue-light-400',
  gray: 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300',
};

/**
 * Indicador compacto para dashboards: etiqueta, valor, detalle y variación opcional.
 * `delta` es el % de cambio contra el periodo anterior (null = sin comparación).
 */
@Component({
  selector: 'app-kpi-tile',
  standalone: true,
  imports: [IconComponent, RouterLink, NgTemplateOutlet],
  template: `
    @if (link()) {
      <a [routerLink]="link()" [queryParams]="queryParams()" class="block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-brand-500">
        <ng-container [ngTemplateOutlet]="body" />
      </a>
    } @else {
      <ng-container [ngTemplateOutlet]="body" />
    }
    <ng-template #body>
      <div
        class="flex h-full items-start gap-2.5 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-white/[0.03]"
        [class.hover:border-brand-300]="!!link()"
        [attr.title]="hint() || null"
      >
        @if (icon()) {
          <span class="flex size-8 shrink-0 items-center justify-center rounded-lg" [class]="toneClass()">
            <app-icon [name]="icon()!" iconClass="size-4" />
          </span>
        }
        <div class="min-w-0 flex-1">
          <p class="truncate text-theme-xs text-gray-500 dark:text-gray-400">{{ label() }}</p>
          <p class="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 leading-tight">
            <span class="text-lg font-semibold tabular-nums text-gray-800 dark:text-white/90">{{ value() }}</span>
            @if (deltaText(); as d) {
              <span class="text-[11px] font-medium tabular-nums" [class]="d.cls">{{ d.text }}</span>
            }
          </p>
          @if (sub()) {
            <p class="mt-0.5 line-clamp-2 text-[11px] leading-snug text-gray-500 dark:text-gray-400">{{ sub() }}</p>
          }
        </div>
      </div>
    </ng-template>
  `,
  host: { class: 'block' },
})
export class KpiTileComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly sub = input<string | null>(null);
  readonly icon = input<string | null>(null);
  readonly tone = input<KpiTone>('brand');
  readonly delta = input<number | null>(null);
  /** Para métricas donde subir es malo (p. ej. anulaciones). */
  readonly invertDelta = input(false);
  readonly hint = input<string | null>(null);
  readonly link = input<string | null>(null);
  readonly queryParams = input<Record<string, string> | null>(null);

  protected readonly toneClass = computed(() => TONES[this.tone()]);

  protected readonly deltaText = computed(() => {
    const d = this.delta();
    if (d === null || !Number.isFinite(d)) return null;
    const good = this.invertDelta() ? d <= 0 : d >= 0;
    const arrow = d > 0 ? '▲' : d < 0 ? '▼' : '•';
    return {
      text: `${arrow} ${Math.abs(d).toFixed(Math.abs(d) < 10 ? 1 : 0)}%`,
      cls: d === 0 ? 'text-gray-500' : good ? 'text-success-600 dark:text-success-400' : 'text-error-600 dark:text-error-400',
    };
  });
}
