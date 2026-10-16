import { Component, EventEmitter, Input, Output } from '@angular/core';

/** Contenedor de resultados de búsqueda / autocompletado. */
@Component({
  selector: 'app-option-list',
  standalone: true,
  host: { class: 'block' },
  template: `
    <div
      role="listbox"
      [attr.aria-label]="ariaLabel || null"
      class="max-h-48 overflow-auto rounded-lg border border-gray-200 bg-white text-sm shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
      [class.absolute]="floating"
      [class.z-30]="floating"
      [class.mt-1]="floating"
      [class.w-full]="floating"
    >
      <ng-content />
      @if (emptyText) {
        <p class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">{{ emptyText }}</p>
      }
    </div>
  `,
})
export class OptionListComponent {
  @Input() ariaLabel = '';
  /** Lista flotante bajo un input (posición absoluta). */
  @Input() floating = false;
  /** Texto cuando no hay resultados (se muestra si se pasa). */
  @Input() emptyText = '';
}

/** Opción seleccionable dentro de `app-option-list`. */
@Component({
  selector: 'app-option-item',
  standalone: true,
  host: { class: 'block' },
  template: `
    <button
      type="button"
      role="option"
      [attr.aria-selected]="selected"
      class="flex w-full items-center justify-between gap-3 border-b border-gray-100 px-3 py-2 text-left text-sm text-gray-700 last:border-b-0 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-white/5"
      [class.bg-brand-50]="selected"
      [disabled]="disabled"
      (mousedown)="onMouseDown($event)"
      (click)="optionSelect.emit()"
    >
      <span class="min-w-0 truncate"><ng-content /></span>
      @if (meta) {
        <span class="shrink-0 text-xs text-gray-500 dark:text-gray-400">{{ meta }}</span>
      }
    </button>
  `,
})
export class OptionItemComponent {
  /** Texto secundario a la derecha (stock, código…). */
  @Input() meta = '';
  @Input() selected = false;
  @Input() disabled = false;
  /** Evita que el input pierda foco antes del click (listas flotantes). */
  @Input() keepFocus = false;
  @Output() optionSelect = new EventEmitter<void>();

  protected onMouseDown(event: MouseEvent) {
    if (this.keepFocus) event.preventDefault();
  }
}
