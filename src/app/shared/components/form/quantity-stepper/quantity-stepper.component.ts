import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonComponent } from '../../ui/button/button.component';
import { InputFieldComponent } from '../input/input-field.component';

/** Cantidad con botones − y +, a la misma altura que su campo. */
@Component({
  selector: 'app-quantity-stepper',
  standalone: true,
  imports: [ButtonComponent, InputFieldComponent],
  host: { class: 'inline-flex items-center gap-1.5' },
  template: `
    <app-button
      [size]="size"
      variant="outline"
      [iconOnly]="true"
      startIconName="mdi:minus"
      tooltip="Disminuir cantidad"
      [disabled]="value <= min"
      (btnClick)="change(value - 1)"
    />
    <app-input-field
      class="w-16"
      type="number"
      [min]="'' + min"
      step="1"
      [ariaLabel]="ariaLabel"
      [className]="'text-center ' + (size === 'sm' ? 'h-9!' : '')"
      [value]="value"
      (valueChange)="change(+$event)"
    />
    <app-button
      [size]="size"
      variant="outline"
      [iconOnly]="true"
      startIconName="mdi:plus"
      tooltip="Aumentar cantidad"
      (btnClick)="change(value + 1)"
    />
  `,
})
export class QuantityStepperComponent {
  @Input() value = 1;
  @Input() min = 1;
  @Input() size: 'sm' | 'lg' = 'lg';
  @Input() ariaLabel = 'Cantidad';
  @Output() valueChange = new EventEmitter<number>();

  protected change(next: number) {
    this.valueChange.emit(Number.isFinite(next) ? Math.max(this.min, Math.floor(next)) : this.min);
  }
}
