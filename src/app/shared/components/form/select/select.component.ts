
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { SelectFieldComponent } from '../../ui/select/select-field.component';

export interface Option {
  value: string;
  label: string;
}

@Component({
  selector: 'app-select',
  imports: [SelectFieldComponent],
  templateUrl: './select.component.html',
})
export class SelectComponent implements OnInit {
  @Input() options: Option[] = [];
  @Input() placeholder: string = 'Seleccione una opción';
  @Input() className: string = '';
  @Input() defaultValue: string = '';
  @Input() value: string = '';

  @Output() valueChange = new EventEmitter<string>();

  ngOnInit() {
    if (!this.value && this.defaultValue) {
      this.value = this.defaultValue;
    }
  }

  onChange(value: string) {
    this.value = value;
    this.valueChange.emit(value);
  }
}