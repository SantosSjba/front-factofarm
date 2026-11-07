import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { SelectFieldComponent } from '../../ui/select/select-field.component';
import { LabelComponent } from '../label/label.component';

/** Select reutilizable: `ui/select` de la plantilla TailAdmin con label, hint y error. */
@Component({
  selector: 'app-form-select',
  // `className="flex-1"` debe aplicar al host para que crezca dentro de filas flex.
  host: { class: 'block', '[class.flex-1]': 'hostFlex', '[class.min-w-0]': 'hostFlex' },
  standalone: true,
  imports: [CommonModule, SelectFieldComponent, LabelComponent],
  templateUrl: './form-select.component.html',
})
export class FormSelectComponent {
  @Input() id = '';
  @Input() ariaLabel = '';
  @Input() name = '';
  @Input() value = '';
  @Input() placeholder = 'Seleccionar';
  @Input() showPlaceholder = true;
  @Input() disabled = false;
  @Input() error = false;
  @Input() hint = '';
  /** `{ value, label }` */
  @Input() options: { value: string; label: string }[] = [];
  protected get hostFlex(): boolean {
    return /(^|\s)flex-1(\s|$)/.test(this.className);
  }

  @Input() className = '';
  /** Label opcional encima del select. */
  @Input() label = '';
  @Input() required = false;
  @Output() valueChange = new EventEmitter<string>();

  /** El `id` estático también queda en el host: el botón necesita uno propio para el <label for>. */
  protected get triggerId(): string {
    return this.id ? `${this.id}-trigger` : '';
  }

  protected get triggerClass(): string {
    const state = this.error
      ? 'border-error-500 ring-3 ring-error-500/20 hover:border-error-500 focus:border-error-500 focus:ring-error-500/20 dark:border-error-500/50 dark:ring-error-500/40'
      : '';
    return `h-11 ${state} ${this.className}`.replace(/\s+/g, ' ').trim();
  }

  /** Texto del option vacío: @Input placeholder o label del primer option con value ''. */
  protected get effectivePlaceholder(): string {
    if (this.placeholder !== 'Seleccionar') {
      return this.placeholder;
    }
    const emptyOption = this.options.find((opt) => opt.value === '');
    return emptyOption?.label?.trim() || this.placeholder;
  }

  /** Con placeholder, la opción vacía es seleccionable (permite limpiar un filtro). */
  protected get renderedOptions(): { value: string; label: string }[] {
    if (!this.showPlaceholder) return this.options;
    const options = this.options.filter((opt) => opt.value !== '');
    return this.effectivePlaceholder ? [{ value: '', label: this.effectivePlaceholder }, ...options] : options;
  }

}
