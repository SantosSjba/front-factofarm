import { Component, Input, booleanAttribute } from '@angular/core';
import { IconComponent } from '../../ui/icon/icon.component';

/**
 * Encabezado de un bloque dentro de una pantalla o modal: ícono + título + descripción y,
 * a la derecha, acciones opcionales (`[data-heading-end]`). Es el mismo encabezado de
 * `app-form-section`, para bloques que no son un grid de campos (tablas de productos, detalle de caja…).
 */
@Component({
  selector: 'app-section-heading',
  standalone: true,
  imports: [IconComponent],
  host: { class: 'block min-w-0' },
  template: `
    <div class="flex flex-wrap items-start justify-between gap-x-3 gap-y-2" [class]="compact ? 'mb-3' : 'mb-4'">
      <div class="flex min-w-0 items-start gap-2.5">
        @if (icon) {
          <span class="flex shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" [class]="compact ? 'size-7' : 'size-8'">
            <app-icon [name]="icon" [iconClass]="compact ? 'size-3.5' : 'size-4'" />
          </span>
        }
        <div class="min-w-0">
          <h4 class="font-medium text-gray-800 dark:text-white/90" [class]="compact ? 'text-sm' : 'text-base'">
            {{ title }}
            @if (required) {
              <span class="text-error-500" aria-hidden="true">*</span>
            }
          </h4>
          @if (description) {
            <p class="text-gray-500 dark:text-gray-400" [class]="compact ? 'text-theme-xs' : 'mt-1 text-sm'">{{ description }}</p>
          }
        </div>
      </div>
      <ng-content select="[data-heading-end]" />
    </div>
  `,
})
export class SectionHeadingComponent {
  @Input({ required: true }) title!: string;
  @Input() description = '';
  @Input() icon = '';
  /** Muestra el asterisco de obligatorio junto al título. */
  @Input({ transform: booleanAttribute }) required = false;
  /** Versión compacta (título 14px, ícono 28px), igual que `app-form-section compact`. */
  @Input({ transform: booleanAttribute }) compact = false;
}
