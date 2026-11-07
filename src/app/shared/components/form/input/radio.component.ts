import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

/** Radio con la apariencia de `ui/radio` de la plantilla TailAdmin; no requiere un `brnRadioGroup`. */
@Component({
  selector: 'app-radio',
  imports: [CommonModule],
  template: `
    <label
      [attr.for]="id"
      data-slot="field"
      class="group/field flex w-auto items-center gap-2.5 text-sm font-medium select-none"
      [ngClass]="(disabled ? 'cursor-not-allowed text-gray-400 dark:text-gray-600 ' : 'cursor-pointer text-gray-700 dark:text-gray-300 ') + className"
    >
      <input
        [id]="id"
        [name]="name"
        type="radio"
        [value]="value"
        [checked]="checked"
        [disabled]="disabled"
        (change)="onChange()"
        class="peer sr-only"
      />
      <span
        class="relative flex size-4 shrink-0 items-center justify-center rounded-full border shadow-theme-xs outline-hidden transition-colors peer-focus-visible:ring-3 peer-focus-visible:ring-brand-500/20"
        [ngClass]="circleClasses"
      >
        @if (checked) {
          <span class="size-2 rounded-full bg-white"></span>
        }
      </span>
      {{ label }}
    </label>
  `,
})
export class RadioComponent {
  @Input() id!: string;
  @Input() name!: string;
  @Input() value!: string;
  @Input() checked = false;
  @Input() label!: string;
  @Input() className = '';
  @Input() disabled = false;

  @Output() valueChange = new EventEmitter<string>();

  protected get circleClasses(): string {
    if (this.disabled) {
      return 'border-gray-200 bg-gray-100/50 opacity-50 shadow-none dark:border-gray-800 dark:bg-gray-800/50';
    }
    return this.checked
      ? 'border-brand-500 bg-brand-500 hover:border-brand-600 hover:bg-brand-600 dark:border-brand-500 dark:bg-brand-500'
      : 'border-gray-300 bg-white hover:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-brand-400';
  }

  onChange() {
    if (!this.disabled) {
      this.valueChange.emit(this.value);
    }
  }
}
