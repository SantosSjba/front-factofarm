import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit, booleanAttribute } from '@angular/core';
import { ClickOutsideDirective } from '../../../directives/click-outside.directive';

export interface Option {
  value: string;
  text: string;
}

@Component({
  selector: 'app-multi-select',
  imports: [
    CommonModule,
    ClickOutsideDirective,
  ],
  templateUrl: './multi-select.component.html',
  styles: ``
})
export class MultiSelectComponent implements OnInit {

  @Input() label: string = '';
  @Input() options: Option[] = [];
  @Input() defaultSelected: string[] = [];
  @Input() disabled: boolean = false;
  @Input() required = false;
  @Input() placeholder = 'Seleccione opciones';
  /** Versión compacta (alto mínimo h-9, label y chips más chicos). */
  @Input({ transform: booleanAttribute }) compact = false;
  @Output() selectionChange = new EventEmitter<string[]>();

  readonly labelId = 'multi-select-' + crypto.randomUUID();

  onTriggerKey(event: Event): void {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    this.toggleDropdown();
  }

  selectedOptions: string[] = [];
  isOpen = false;

  ngOnInit() {
    this.selectedOptions = [...this.defaultSelected];
  }

  toggleDropdown() {
    if (!this.disabled) this.isOpen = !this.isOpen;
  }

  handleSelect(optionValue: string) {
    if (this.disabled) return;
    if (this.selectedOptions.includes(optionValue)) {
      this.selectedOptions = this.selectedOptions.filter(v => v !== optionValue);
    } else {
      this.selectedOptions = [...this.selectedOptions, optionValue];
    }
    this.selectionChange.emit(this.selectedOptions);
  }

  removeOption(value: string) {
    if (this.disabled) return;
    this.selectedOptions = this.selectedOptions.filter(opt => opt !== value);
    this.selectionChange.emit(this.selectedOptions);
  }

  get selectedValuesText(): string[] {
    return this.selectedOptions
      .map(value => this.options.find(option => option.value === value)?.text || '')
      .filter(Boolean);
  }
}
