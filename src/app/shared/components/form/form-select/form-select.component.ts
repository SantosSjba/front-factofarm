import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

const baseSelect =
  'shadow-theme-xs h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:ring-3 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 disabled:cursor-not-allowed disabled:opacity-50';

/** Select reutilizable con el estilo FactoFarm / TailAdmin. */
@Component({
  selector: 'app-form-select',
  standalone: true,
  imports: [CommonModule],
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

  protected onChange(ev: Event) {
    const v = (ev.target as HTMLSelectElement).value;
    this.valueChange.emit(v);
  }
}
