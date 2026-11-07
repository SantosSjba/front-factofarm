import { CommonModule } from '@angular/common';
import { LabelComponent } from '../label/label.component';
import { IconComponent } from '../../ui/icon/icon.component';
import { InputDirective } from '../../ui/input/input.directive';
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-input-field',
  // `className="flex-1"` debe aplicar al host para que crezca dentro de filas flex.
  host: { class: 'block', '[class.flex-1]': 'hostFlex', '[class.min-w-0]': 'hostFlex' },
  imports: [CommonModule, LabelComponent, IconComponent, InputDirective],
  template: `
    @if (label) {
      <app-label [for]="id || undefined" [required]="isRequired" [helpText]="helpText">{{ label }}</app-label>
    }
    <div class="relative">
      @if (icon) {
        <app-icon
          [name]="icon"
          iconClass="pointer-events-none absolute start-3 top-[1.375rem] z-10 size-4 -translate-y-1/2 text-gray-400"
        />
      }
      <input
        app-input
        unstyled
        [className]="inputClasses"
        [type]="type"
        [id]="id || ''"
        [name]="name"
        [placeholder]="placeholder"
        [value]="value"
        [min]="min"
        [max]="max"
        [step]="step"
        [disabled]="disabled"
        [attr.maxlength]="maxLength ?? null"
        [attr.minlength]="minLength ?? null"
        [attr.inputmode]="inputMode ?? null"
        [attr.autocomplete]="autocomplete"
        [attr.aria-label]="ariaLabel"
        [attr.aria-required]="isRequired || ariaRequired ? true : null"
        [attr.aria-invalid]="error ? true : null"
        [attr.aria-describedby]="ariaDescribedBy"
        [attr.required]="isRequired ? true : null"
        (input)="onInput($event)"
        (click)="openNativePicker($event)"
      />

      @if (hint) {
      <p class="mt-2 text-xs"
        [attr.role]="error ? 'alert' : null"
        [ngClass]="{
          'text-error-500 dark:text-error-400': error,
          'text-success-600 dark:text-success-400': success,
          'text-gray-500 dark:text-gray-400': !error && !success
        }">
        {{ hint }}
      </p>
      }
    </div>
  `,
})
export class InputFieldComponent {

  @Input() type: string = 'text';
  @Input() id?: string = '';
  @Input() name?: string = '';
  @Input() placeholder?: string = '';
  @Input() value: string | number = '';
  @Input() min?: string;
  @Input() max?: string;
  @Input() step?: number | string;
  @Input() disabled: boolean = false;
  @Input() success: boolean = false;
  @Input() error: boolean = false;
  @Input() hint?: string;
  protected get hostFlex(): boolean {
    return /(^|\s)flex-1(\s|$)/.test(this.className);
  }

  @Input() className: string = '';
  @Input() autocomplete?: string;
  @Input() ariaLabel?: string;
  @Input() ariaDescribedBy?: string;
  @Input() ariaRequired = false;
  @Input() isRequired = false;
  /** Label opcional encima del campo (con asterisco si `isRequired`). */
  @Input() label = '';
  /** Ayuda en tooltip junto al label. */
  @Input() helpText = '';
  /** Icono a la izquierda dentro del campo (p. ej. búsqueda). */
  @Input() icon = '';
  /** Debe coincidir con `@MaxLength` del DTO del backend. */
  @Input() maxLength?: number;
  @Input() minLength?: number;
  @Input() inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'search' | 'url';

  @Output() valueChange = new EventEmitter<string | number>();

  /** Clases tal cual los estados de input de la plantilla TailAdmin. */
  get inputClasses(): string {
    const padding = this.icon ? 'ps-9 pe-4' : 'ps-4 pe-4';
    const state = this.error
      ? 'border border-error-500 ring-3 ring-error-500/20 focus:border-error-500 focus:ring-3 focus:ring-error-500/20 dark:border-error-500/50 dark:ring-error-500/40'
      : this.success
        ? 'border border-success-500 ring-3 ring-success-500/20 focus:border-success-500 focus:ring-3 focus:ring-success-500/20 dark:border-success-500/50 dark:ring-success-500/40'
        : 'border border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100/50 disabled:text-gray-400 disabled:shadow-none dark:border-gray-700 dark:focus:border-brand-500/40 dark:disabled:border-gray-800 dark:disabled:bg-gray-800/50';
    return `h-11 w-full min-w-0 rounded-[10px] bg-white py-2.5 text-sm font-normal text-gray-800 shadow-theme-xs outline-hidden transition-colors placeholder:text-gray-400 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-gray-500 ${padding} ${state} ${this.className}`.trim();
  }

  /** Tipos con selector nativo del navegador (calendario / reloj). */
  private static readonly PICKER_TYPES = new Set(['date', 'datetime-local', 'month', 'week', 'time']);

  /** Al hacer clic en cualquier parte del campo de fecha se abre el calendario nativo. */
  openNativePicker(event: Event) {
    if (this.disabled || !InputFieldComponent.PICKER_TYPES.has(this.type)) return;
    const input = event.target as HTMLInputElement & { showPicker?: () => void };
    try {
      input.showPicker?.();
    } catch {
      // Navegadores sin soporte o sin gesto de usuario: queda el ícono nativo.
    }
  }

  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.valueChange.emit(this.type === 'number' ? +input.value : input.value);
  }
}
