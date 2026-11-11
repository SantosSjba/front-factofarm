import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, signal } from '@angular/core';
import { ClickOutsideDirective } from '../../../directives/click-outside.directive';
import { OptionItemComponent, OptionListComponent } from '../../ui/option-list/option-list.component';
import { InputFieldComponent } from '../input/input-field.component';

export type SearchSelectOption = { value: string; label: string; meta?: string };

/**
 * Buscador con lista de resultados, para catálogos grandes: el padre consulta en el servidor
 * con `searchChange` (ya con espera entre teclas) y entrega las coincidencias en `options`.
 */
@Component({
  selector: 'app-search-select',
  standalone: true,
  imports: [ClickOutsideDirective, InputFieldComponent, OptionItemComponent, OptionListComponent],
  host: { class: 'block' },
  template: `
    <div class="relative" clickOutside [clickOutsideActive]="open()" (clickOutside)="open.set(false)">
      <app-input-field
        icon="lucide:search"
        [label]="label"
        [helpText]="helpText"
        [isRequired]="required"
        [ariaLabel]="label || placeholder"
        [placeholder]="placeholder"
        [value]="term()"
        [disabled]="disabled"
        (valueChange)="onInput($event + '')"
        (click)="open.set(true)"
      />
      @if (open()) {
        <app-option-list [floating]="true" [ariaLabel]="label" [emptyText]="options.length ? '' : (loading ? 'Buscando…' : emptyText)">
          @for (option of options; track option.value) {
            <app-option-item [meta]="option.meta ?? ''" (optionSelect)="choose(option)">{{ option.label }}</app-option-item>
          }
        </app-option-list>
      }
    </div>
  `,
})
export class SearchSelectComponent implements OnChanges, OnDestroy {
  @Input() label = '';
  @Input() helpText = '';
  @Input() required = false;
  @Input() placeholder = 'Buscar…';
  @Input() emptyText = 'Sin resultados';
  @Input() options: SearchSelectOption[] = [];
  @Input() loading = false;
  @Input() disabled = false;
  /** Al cambiar este número se vacía el campo (p. ej. tras agregar la opción elegida). */
  @Input() resetToken = 0;
  /** Texto con el que queda el campo al reiniciarse; si no está vacío, la lista se abre sola. */
  @Input() resetTerm = '';

  @Output() searchChange = new EventEmitter<string>();
  @Output() selected = new EventEmitter<SearchSelectOption>();

  protected readonly term = signal('');
  protected readonly open = signal(false);
  private timer?: ReturnType<typeof setTimeout>;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['resetToken']) return;
    this.term.set(this.resetTerm);
    this.open.set(!!this.resetTerm);
  }

  protected onInput(value: string) {
    this.term.set(value);
    this.open.set(true);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.searchChange.emit(value.trim()), 250);
  }

  protected choose(option: SearchSelectOption) {
    this.term.set(option.label);
    this.open.set(false);
    this.selected.emit(option);
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
  }
}
