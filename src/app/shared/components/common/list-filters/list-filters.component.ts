import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormSelectComponent } from '../../form/form-select/form-select.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { IconComponent } from '../../ui/icon/icon.component';

@Component({
  selector: 'app-list-filters',
  standalone: true,
  imports: [CommonModule, InputFieldComponent, FormSelectComponent, IconComponent],
  templateUrl: './list-filters.component.html',
})
export class ListFiltersComponent {
  @Input() searchValue = '';
  @Input() searchPlaceholder = 'Buscar...';

  @Input() selectValue = '';
  @Input() selectPlaceholder = 'Todos';
  @Input() selectOptions: { value: string; label: string }[] = [];
  @Input() showSelect = true;

  @Input() clearLabel = 'Limpiar';

  @Output() searchValueChange = new EventEmitter<string>();
  @Output() selectValueChange = new EventEmitter<string>();
  @Output() clear = new EventEmitter<void>();

  protected onSearchChange(value: string | number) {
    this.searchValueChange.emit(String(value ?? ''));
  }

  protected onSelectChange(value: string) {
    this.selectValueChange.emit(value);
  }

  protected onClear() {
    this.clear.emit();
  }
}
