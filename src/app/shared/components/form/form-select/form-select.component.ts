import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IconComponent } from '../../ui/icon/icon.component';

const baseSelect =
  'shadow-theme-xs h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent pl-4 pr-12 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:ring-3 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 disabled:cursor-not-allowed disabled:opacity-50';

/** Select reutilizable con el estilo FactoFarm / TailAdmin. */
@Component({
  selector: 'app-form-select',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './form-select.component.html',
})
export class FormSelectComponent {
  @Input() id = '';
  @Input() name = '';
  @Input() value = '';
  @Input() placeholder = 'Seleccionar';
  @Input() showPlaceholder = true;
  @Input() disabled = false;
  /** `{ value, label }` */
  @Input() options: { value: string; label: string }[] = [];
  @Input() className = '';
  @Output() valueChange = new EventEmitter<string>();

  protected get selectClass(): string {
    return `${baseSelect} ${this.className}`.trim();
  }

  /** Texto del option vacío: @Input placeholder o label del primer option con value ''. */
  protected get effectivePlaceholder(): string {
    if (this.placeholder !== 'Seleccionar') {
      return this.placeholder;
    }
    const emptyOption = this.options.find((opt) => opt.value === '');
    return emptyOption?.label?.trim() || this.placeholder;
  }

  /** Elimina options con value '' cuando el componente ya renderiza su propio placeholder. */
  protected get renderedOptions(): { value: string; label: string }[] {
    if (!this.showPlaceholder) return this.options;
    return this.options.filter((opt) => opt.value !== '');
  }

  protected onChange(ev: Event) {
    const v = (ev.target as HTMLSelectElement).value;
    this.valueChange.emit(v);
  }
}
