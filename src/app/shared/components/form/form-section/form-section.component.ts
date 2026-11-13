import { Component, Input, booleanAttribute } from '@angular/core';
import { IconComponent } from '../../ui/icon/icon.component';

const COLUMNS = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
} as const;

/** Bloque de formulario: título (con ícono opcional), descripción y campos en rejilla. */
@Component({
  selector: 'app-form-section',
  standalone: true,
  imports: [IconComponent],
  host: { class: 'block min-w-0' },
  template: `
    <section>
      <div class="flex items-start gap-2.5" [class]="compact ? 'mb-3' : 'mb-4'">
        @if (icon) {
          <span class="flex shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" [class]="compact ? 'size-7' : 'size-8'">
            <app-icon [name]="icon" [iconClass]="compact ? 'size-3.5' : 'size-4'" />
          </span>
        }
        <div class="min-w-0">
          <h4 class="font-medium text-gray-800 dark:text-white/90" [class]="compact ? 'text-sm' : 'text-base'">{{ title }}</h4>
          @if (description) {
            <p class="text-gray-500 dark:text-gray-400" [class]="compact ? 'text-theme-xs' : 'mt-1 text-sm'">{{ description }}</p>
          }
        </div>
      </div>
      <!-- grid-cols-1 base + min-w-0: un texto largo nunca ensancha la columna (sin scroll lateral en teléfono). -->
      <div class="grid" [class]="columnsClass + (compact ? ' gap-3' : ' gap-5')">
        <ng-content />
      </div>
    </section>
  `,
})
export class FormSectionComponent {
  @Input({ required: true }) title!: string;
  @Input() description = '';
  @Input() cols: keyof typeof COLUMNS = 2;
  /** Ícono (iconify) junto al título, en un recuadro de color. */
  @Input() icon = '';
  /** Versión compacta: título 14px, descripción 12px y menos separación entre campos. */
  @Input({ transform: booleanAttribute }) compact = false;

  protected get columnsClass(): string {
    return COLUMNS[this.cols];
  }
}
