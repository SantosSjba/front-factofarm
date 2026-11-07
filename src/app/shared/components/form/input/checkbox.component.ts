import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

/** Checkbox tal cual `default-checkbox` / `labeled-checkbox` de la plantilla TailAdmin. */
@Component({
  selector: 'app-checkbox',
  imports: [CommonModule],
  template: `
    <div
      role="group"
      data-slot="field"
      data-orientation="horizontal"
      class="group/field flex w-auto items-center gap-2.5"
    >
      <button
        type="button"
        role="checkbox"
        [id]="controlId"
        [attr.aria-checked]="checked"
        [attr.aria-label]="ariaLabel || null"
        [disabled]="disabled"
        (click)="toggle()"
        class="peer relative flex size-4 shrink-0 items-center justify-center rounded-md border shadow-theme-xs outline-hidden transition-colors focus-visible:ring-3 focus-visible:ring-brand-500/20"
        [ngClass]="[stateClasses, className]"
      >
        @if (checked) {
          <svg
            class="size-3"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        }
      </button>
      @if (label) {
        <label
          data-slot="field-label"
          [attr.for]="controlId"
          class="text-sm font-medium select-none"
          [ngClass]="disabled ? 'cursor-not-allowed text-gray-400 dark:text-gray-600' : 'cursor-pointer text-gray-700 dark:text-gray-300'"
        >
          {{ label }}
        </label>
      }
      <!-- Texto enriquecido (p. ej. con enlaces) cuando no basta con label. -->
      <label
        [attr.for]="controlId"
        class="text-sm text-gray-700 select-none empty:hidden dark:text-gray-300"
        [class.cursor-pointer]="!disabled"
        ><ng-content
      /></label>
    </div>
  `,
})
export class CheckboxComponent {
  private static nextId = 0;
  private readonly autoId = `app-checkbox-${CheckboxComponent.nextId++}`;

  @Input() label?: string;
  @Input() checked = false;
  @Input() className = '';
  @Input() id?: string;
  @Input() disabled = false;
  /** Nombre accesible cuando no hay label visible (p. ej. selección en tablas). */
  @Input() ariaLabel = '';
  @Output() checkedChange = new EventEmitter<boolean>();

  /** El `id` estático también queda en el host: el botón necesita uno propio para el <label for>. */
  protected get controlId(): string {
    return this.id ? `${this.id}-control` : this.autoId;
  }

  protected get stateClasses(): string {
    if (this.disabled) {
      return 'cursor-not-allowed border-gray-200 bg-transparent text-gray-300 shadow-none dark:border-gray-800 dark:text-gray-600';
    }
    return this.checked
      ? 'cursor-pointer border-brand-500 bg-brand-500 text-white hover:border-brand-600 hover:bg-brand-600 dark:border-brand-500 dark:bg-brand-500'
      : 'cursor-pointer border-gray-300 bg-white hover:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-brand-400';
  }

  protected toggle(): void {
    if (this.disabled) return;
    this.checked = !this.checked;
    this.checkedChange.emit(this.checked);
  }

}
