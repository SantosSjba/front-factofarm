import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import type { StatusTone } from '../badge/status-badge.component';

/** Mismos tonos que `app-status-badge`, para que un chip y su badge tengan el mismo color. */
export type SummaryChipTone = StatusTone;

export interface SummaryChip {
  id: string;
  label: string;
  count: number | string;
  icon?: string;
  tone?: SummaryChipTone;
  /** Resaltado: el filtro de este chip está aplicado. */
  active?: boolean;
  /** Falso = solo informativo (no filtra). */
  clickable?: boolean;
  tooltip?: string;
  /** Fila con etiqueta (p. ej. «Rol», «Local»). Chips del mismo grupo van juntos, en el orden recibido. */
  group?: string;
}

const DOT: Record<SummaryChipTone, string> = {
  brand: 'bg-brand-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  error: 'bg-error-500',
  info: 'bg-blue-light-500',
  purple: 'bg-purple-500',
  neutral: 'bg-gray-400',
};

/**
 * Fila de chips con conteos (resumen de un listado). Un chip clicable aplica su filtro;
 * el chip activo queda resaltado. Con `group`, cada grupo va en su propia fila con etiqueta.
 * En pantallas angostas cada fila se desliza en horizontal en vez de crecer hacia abajo.
 */
@Component({
  selector: 'app-summary-chips',
  standalone: true,
  imports: [IconComponent, NgTemplateOutlet],
  host: { class: 'block min-w-0' },
  template: `
    <div class="space-y-1.5" role="group" [attr.aria-label]="ariaLabel()">
      @for (g of groups(); track g.name) {
        <div class="flex min-w-0 items-start gap-2 sm:gap-3">
          @if (g.name) {
            <span class="w-12 shrink-0 pt-1.5 text-[11px] font-medium text-gray-400 sm:w-14 dark:text-gray-500">{{ g.name }}</span>
          }
          <ul
            class="no-scrollbar -mx-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 py-0.5 sm:flex-wrap sm:overflow-visible"
            [attr.aria-label]="g.name || ariaLabel()"
          >
            @for (chip of g.chips; track chip.id) {
        <li class="shrink-0">
          @if (chip.clickable !== false) {
            <button
              type="button"
              [class]="chipClass(chip)"
              [attr.aria-pressed]="!!chip.active"
              [attr.title]="chip.tooltip || null"
              (click)="chipClick.emit(chip)"
            >
              <ng-container [ngTemplateOutlet]="content" [ngTemplateOutletContext]="{ $implicit: chip }" />
            </button>
          } @else {
            <span [class]="chipClass(chip)" [attr.title]="chip.tooltip || null">
              <ng-container [ngTemplateOutlet]="content" [ngTemplateOutletContext]="{ $implicit: chip }" />
            </span>
          }
        </li>
            }
          </ul>
        </div>
      }
    </div>

    <ng-template #content let-chip>
      @if (chip.icon) {
        <app-icon [name]="chip.icon" iconClass="size-3.5 text-gray-400 dark:text-gray-500" />
      } @else if (chip.tone) {
        <span class="size-1.5 shrink-0 rounded-full" [class]="dot(chip)" aria-hidden="true"></span>
      }
      <span class="whitespace-nowrap">{{ chip.label }}</span>
      <span class="font-semibold tabular-nums text-gray-800 dark:text-white/90">{{ chip.count }}</span>
    </ng-template>
  `,
})
export class SummaryChipsComponent {
  readonly chips = input.required<SummaryChip[]>();
  readonly ariaLabel = input('Resumen');
  readonly chipClick = output<SummaryChip>();

  protected readonly groups = computed(() => {
    const out: { name: string; chips: SummaryChip[] }[] = [];
    for (const chip of this.chips()) {
      const name = chip.group ?? '';
      const g = out.find((x) => x.name === name);
      if (g) g.chips.push(chip);
      else out.push({ name, chips: [chip] });
    }
    return out;
  });

  protected chipClass(chip: SummaryChip): string {
    const base =
      'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-theme-xs text-gray-600 transition-colors dark:text-gray-300';
    const state = chip.active
      ? 'border-brand-300 bg-brand-50 dark:border-brand-500/40 dark:bg-brand-500/10'
      : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]';
    const hover =
      chip.clickable !== false && !chip.active
        ? 'cursor-pointer hover:border-gray-300 hover:bg-gray-50 dark:hover:border-gray-700 dark:hover:bg-white/5'
        : chip.clickable !== false
          ? 'cursor-pointer'
          : '';
    return `${base} ${state} ${hover} focus-visible:outline-2 focus-visible:outline-brand-500`;
  }

  protected dot(chip: SummaryChip): string {
    return DOT[chip.tone ?? 'neutral'];
  }
}
