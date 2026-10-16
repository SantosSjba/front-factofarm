import { CommonModule } from '@angular/common';
import { Component, Input, booleanAttribute } from '@angular/core';

@Component({
  selector: 'app-label',
  // flow-root: el margen inferior del label no colapsa con el del control,
  // así el espacio label→campo es igual para input, select y wrappers.
  host: { class: 'flow-root' },
  imports: [CommonModule],
  templateUrl: './label.component.html',
  styles: ``
})
export class LabelComponent {
  @Input() for?: string;
  @Input() className = '';
  /** Muestra el asterisco de campo obligatorio. */
  @Input({ transform: booleanAttribute }) required = false;
}
