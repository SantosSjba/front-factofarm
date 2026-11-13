import { CommonModule } from '@angular/common';
import { booleanAttribute, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormSelectComponent } from '../../form/form-select/form-select.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { BadgeComponent } from '../../ui/badge/badge.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { IconComponent } from '../../ui/icon/icon.component';
import { SummaryChipsComponent, type SummaryChip } from '../../ui/summary-chips/summary-chips.component';

@Component({
  selector: 'app-list-filters',
  standalone: true,
  imports: [CommonModule, InputFieldComponent, FormSelectComponent, ButtonComponent, BadgeComponent, IconComponent, SummaryChipsComponent],
  templateUrl: './list-filters.component.html',
})
export class ListFiltersComponent implements OnInit {
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
  /** Versión compacta: campos y botones de 36px, menos padding (como los botones `size="sm"` de la barra). */
  @Input({ transform: booleanAttribute }) compact = false;
  /** Ayuda (tooltip) junto a la etiqueta del select (requiere `selectLabel`). */
  @Input() selectHelpText = '';

  /** Fila de chips de resumen dentro de la misma tarjeta; se oculta/muestra con un botón. */
  @Input() summaryChips: SummaryChip[] = [];
  @Input() summaryLabel = 'Resumen';
  /** Recuerda en el navegador si el resumen quedó oculto (clave por pantalla). */
  @Input() summaryStorageKey = '';
  @Output() summaryChipClick = new EventEmitter<SummaryChip>();
  protected summaryOpen = true;
  protected readonly summaryPanelId = `list-filters-summary-${ListFiltersComponent.nextId}`;

  ngOnInit() {
    if (!this.summaryStorageKey) return;
    try {
      this.summaryOpen = localStorage.getItem(this.storageKey) !== '0';
    } catch {
      // Sin acceso al almacenamiento: queda visible.
    }
  }

  private get storageKey() {
    return `ff.summary.${this.summaryStorageKey}`;
  }

  protected toggleSummary() {
    this.summaryOpen = !this.summaryOpen;
    if (!this.summaryStorageKey) return;
    try {
      localStorage.setItem(this.storageKey, this.summaryOpen ? '1' : '0');
    } catch {
      // Preferencia solo de esta sesión.
    }
  }

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
