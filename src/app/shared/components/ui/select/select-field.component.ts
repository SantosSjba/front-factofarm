import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SELECT_IMPORTS } from './select';

export interface SelectFieldOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-select-field',
  imports: [...SELECT_IMPORTS],
  host: { class: 'block w-full' },
  template: `
    <app-select
      [value]="value"
      [disabled]="disabled"
      [itemToString]="itemToString"
      (valueChange)="onValueChange($event)"
    >
      <app-select-trigger [buttonId]="buttonId || autoId" [ariaLabel]="ariaLabel" [className]="triggerClass" [compact]="compact">
        <app-select-value [placeholder]="placeholder" />
      </app-select-trigger>
      <app-select-content *appSelectPortal>
        @for (option of normalizedOptions; track option.value) {
          <app-select-item [value]="option.value">{{ option.label }}</app-select-item>
        }
      </app-select-content>
    </app-select>
  `,
})
export class SelectFieldComponent {
  private static nextId = 0;
  protected readonly autoId = `app-select-field-${SelectFieldComponent.nextId++}`;

  /** Id del botón (para asociar un <label for>). */
  @Input() buttonId = '';
  @Input() set options(value: (SelectFieldOption | string)[]) {
    this.normalizedOptions = (value ?? []).map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
    // Referencia nueva: el texto del trigger se recalcula cuando las opciones llegan después del valor.
    this.itemToString = (item: unknown): string =>
      this.normalizedOptions.find((o) => o.value === item)?.label ?? String(item ?? '');
  }
  @Input() value: string | undefined;
  @Input() placeholder = 'Select Option';
  @Input() ariaLabel = '';
  @Input() disabled = false;
  /** Versión compacta (h-9). */
  @Input() compact = false;
  /** Extra classes appended to the trigger button. */
  @Input() triggerClass = '';
  @Output() valueChange = new EventEmitter<string>();

  normalizedOptions: SelectFieldOption[] = [];

  /** Shows the option label (not the raw value) in the trigger, even before the list is opened. */
  itemToString = (item: unknown): string => String(item ?? '');

  onValueChange(value: unknown) {
    this.valueChange.emit(value as string);
  }
}
