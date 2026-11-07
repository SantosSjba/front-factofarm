import { Component, Input } from '@angular/core';
import { HelpHintComponent } from '../help-hint/help-hint.component';

export type LegendTone = 'success' | 'warning' | 'error-light' | 'error' | 'muted';
export type LegendItem = { label: string; tone: LegendTone };

const DOTS: Record<LegendTone, string> = {
  success: 'bg-success-500',
  warning: 'bg-warning-400',
  'error-light': 'bg-error-300',
  error: 'bg-error-600',
  muted: 'bg-gray-400',
};

/** Leyenda de colores compacta, para acompañar un listado pintado por estado. */
@Component({
  selector: 'app-color-legend',
  standalone: true,
  imports: [HelpHintComponent],
  host: { class: 'block' },
  template: `
    <ul class="flex flex-wrap items-center gap-x-3 gap-y-1" [attr.aria-label]="ariaLabel">
      @for (item of items; track item.label) {
        <li class="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span class="size-2.5 shrink-0 rounded-full" [class]="dot(item.tone)" aria-hidden="true"></span>
          {{ item.label }}
        </li>
      }
      @if (helpText) {
        <li class="inline-flex items-center"><app-help-hint [text]="helpText" [iconSize]="15" /></li>
      }
    </ul>
  `,
})
export class ColorLegendComponent {
  @Input({ required: true }) items: LegendItem[] = [];
  @Input() ariaLabel = 'Leyenda de colores';
  @Input() helpText = '';

  protected dot(tone: LegendTone): string {
    return DOTS[tone];
  }
}
