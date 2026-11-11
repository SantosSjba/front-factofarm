import { CommonModule } from '@angular/common';
import { booleanAttribute, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormSelectComponent } from '../../form/form-select/form-select.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { BadgeComponent } from '../../ui/badge/badge.component';
import { ButtonComponent } from '../../ui/button/button.component';

@Component({
  selector: 'app-list-filters',
  standalone: true,
  imports: [CommonModule, InputFieldComponent, FormSelectComponent, ButtonComponent, BadgeComponent],
  templateUrl: './list-filters.component.html',
})
export class ListFiltersComponent {
  private static nextId = 0;
  protected readonly panelId = `list-filters-panel-${ListFiltersComponent.nextId++}`;

  @Input() searchValue = '';
  @Input() searchPlaceholder = 'Buscar...';

  @Input() selectValue = '';
  @Input() selectPlaceholder = 'Todos';
  @Input() selectOptions: { value: string; label: string }[] = [];
  @Input() showSelect = true;
  /** Oculta el buscador cuando el listado no admite búsqueda por texto. */
  @Input() showSearch = true;
  /** Etiqueta del select (recomendada en modo plegable). */
  @Input() selectLabel = '';
  /** Falso cuando `selectOptions` ya incluye la opción por defecto. */
  @Input() selectShowPlaceholder = true;

  @Input() clearLabel = 'Limpiar';

  /** La búsqueda queda visible; el select y los filtros proyectados se abren con un botón. */
  @Input({ transform: booleanAttribute }) collapsible = false;
  @Input() toggleLabel = 'Filtros';
  /** Filtros aplicados: se muestra en el botón para que no queden ocultos con el panel cerrado. */
  @Input() activeCount = 0;
  protected open = false;

  @Output() searchValueChange = new EventEmitter<string>();
  @Output() selectValueChange = new EventEmitter<string>();
  @Output() clear = new EventEmitter<void>();

  protected toggle() {
    this.open = !this.open;
  }

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
