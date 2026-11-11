import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { ExcelIconComponent } from '../../../icons/excel-icon.component';
import { TooltipDirective } from '../../../directives/tooltip.directive';

/** Ítem de menú desplegable (acciones de fila, exportar, importar…). */
@Component({
  selector: 'app-menu-item',
  standalone: true,
  imports: [IconComponent, ExcelIconComponent, TooltipDirective],
  host: { class: 'block' },
  template: `
    <button
      type="button"
      role="menuitem"
      [appTooltip]="tooltip"
      appTooltipPlacement="left"
      class="inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      [class]="variant === 'danger'
        ? 'text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10'
        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10'"
      [disabled]="disabled || loading"
      (click)="itemClick.emit($event)"
    >
      @if (loading) {
        <app-icon name="mdi:loading" iconClass="size-4 animate-spin" />
      } @else if (icon === 'excel') {
        <app-excel-icon [size]="16" />
      } @else if (icon) {
        <app-icon [name]="icon" iconClass="size-4" />
      }
      <span class="min-w-0 truncate"><ng-content /></span>
    </button>
  `,
})
export class MenuItemComponent {
  @Input() variant: 'default' | 'danger' = 'default';
  /** Icono iconify, o «excel» para el ícono de Excel del proyecto. */
  @Input() icon = '';
  /** Explica qué hace la acción. */
  @Input() tooltip = '';
  @Input() disabled = false;
  @Input() loading = false;
  @Output() itemClick = new EventEmitter<Event>();
}
