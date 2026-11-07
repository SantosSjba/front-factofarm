import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonComponent } from '../../ui/button/button.component';
import { FormSelectComponent } from '../form-select/form-select.component';
import { InputFieldComponent } from '../input/input-field.component';

/** Select con botón "+" a su misma altura, que abre un campo para crear una opción nueva. */
@Component({
  selector: 'app-select-quick-add',
  standalone: true,
  imports: [ButtonComponent, FormSelectComponent, InputFieldComponent],
  host: { class: 'block' },
  template: `
    <div class="flex items-end gap-2">
      <app-form-select
        class="min-w-0 flex-1"
        [label]="label"
        [helpText]="helpText"
        [required]="required"
        [placeholder]="placeholder"
        [value]="value"
        [options]="options"
        [disabled]="disabled"
        (valueChange)="valueChange.emit($event)"
      />
      <app-button
        size="lg"
        variant="outline"
        [iconOnly]="true"
        [startIconName]="open ? 'mdi:close' : 'mdi:plus'"
        [tooltip]="open ? 'Cancelar' : addLabel"
        [ariaExpanded]="open"
        (btnClick)="openChange.emit(!open)"
      />
    </div>
    @if (open) {
      <div class="mt-2 flex items-center gap-2">
        <app-input-field
          class="min-w-0 flex-1"
          [ariaLabel]="addLabel"
          [placeholder]="addLabel"
          [maxLength]="maxLength"
          [value]="newValue"
          (valueChange)="newValueChange.emit($event + '')"
        />
        <app-button size="lg" [disabled]="saving || disabled" [loading]="saving" (btnClick)="add.emit()">Agregar</app-button>
      </div>
    }
  `,
})
export class SelectQuickAddComponent {
  @Input() label = '';
  @Input() helpText = '';
  @Input() required = false;
  @Input() placeholder = 'Seleccionar';
  @Input() value = '';
  @Input() options: { value: string; label: string }[] = [];
  @Input() disabled = false;
  /** Texto del botón "+" y del campo nuevo. */
  @Input({ required: true }) addLabel!: string;
  @Input() open = false;
  @Input() newValue = '';
  @Input() saving = false;
  @Input() maxLength = 120;

  @Output() valueChange = new EventEmitter<string>();
  @Output() openChange = new EventEmitter<boolean>();
  @Output() newValueChange = new EventEmitter<string>();
  @Output() add = new EventEmitter<void>();
}
