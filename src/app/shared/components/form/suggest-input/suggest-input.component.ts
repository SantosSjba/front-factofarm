import { Component, EventEmitter, Input, OnDestroy, Output, signal } from '@angular/core';
import { ClickOutsideDirective } from '../../../directives/click-outside.directive';
import { OptionItemComponent, OptionListComponent } from '../../ui/option-list/option-list.component';
import { InputFieldComponent } from '../input/input-field.component';

export type SuggestOption = { value: string; label: string; meta?: string };

/**
 * Campo de texto libre con sugerencias: se puede escribir un valor nuevo o elegir uno existente.
 * Para elegir solo entre opciones de un catálogo, usa `app-search-select`.
 */
@Component({
  selector: 'app-suggest-input',
  standalone: true,
  imports: [ClickOutsideDirective, InputFieldComponent, OptionItemComponent, OptionListComponent],
  host: { class: 'block' },
  template: `
    <div class="relative" clickOutside [clickOutsideActive]="open()" (clickOutside)="open.set(false)">
      <app-input-field
        autocomplete="off"
        [label]="label"
        [helpText]="helpText"
        [isRequired]="required"
        [ariaLabel]="label || placeholder"
        [placeholder]="placeholder"
        [maxLength]="maxLength"
        [hint]="hint"
        [value]="value"
        [disabled]="disabled"
        (valueChange)="onInput($event + '')"
        (click)="open.set(true)"
      />
      @if (open() && !disabled) {
        <app-option-list
          [floating]="true"
          [ariaLabel]="label"
          [emptyText]="options.length ? '' : (loading ? 'Buscando…' : emptyText)"
        >
          @for (option of options; track option.value) {
            <app-option-item [meta]="option.meta ?? ''" (optionSelect)="choose(option)">{{ option.label }}</app-option-item>
          }
        </app-option-list>
      }
    </div>
  `,
})
export class SuggestInputComponent implements OnDestroy {
  @Input() label = '';
  @Input() helpText = '';
  @Input() required = false;
  @Input() placeholder = 'Escribe o elige';
  @Input() emptyText = 'Sin sugerencias';
  @Input() hint = '';
  @Input() value = '';
  @Input() options: SuggestOption[] = [];
  @Input() loading = false;
  @Input() disabled = false;
  @Input() maxLength?: number;

  /** Cada cambio del texto. */
  @Output() valueChange = new EventEmitter<string>();
  /** El texto para consultar sugerencias, con espera entre teclas. */
  @Output() searchChange = new EventEmitter<string>();
  /** Se eligió una sugerencia. */
  @Output() selected = new EventEmitter<SuggestOption>();

  protected readonly open = signal(false);
  private timer?: ReturnType<typeof setTimeout>;

  protected onInput(value: string) {
    this.valueChange.emit(value);
    this.open.set(true);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.searchChange.emit(value.trim()), 250);
  }

  protected choose(option: SuggestOption) {
    this.open.set(false);
    this.valueChange.emit(option.value);
    this.selected.emit(option);
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
  }
}
