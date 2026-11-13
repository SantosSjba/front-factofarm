import { CommonModule } from '@angular/common';
import { Component, Input, booleanAttribute } from '@angular/core';

/** Contenedor vertical para formularios y bloques de modal. */
@Component({
  selector: 'app-form-stack',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="flex flex-col" [class.gap-4]="!compact" [class.gap-3]="compact" [ngClass]="className"><ng-content /></div>`,
})
export class FormStackComponent {
  @Input() className = '';
  /** Menos separación entre bloques (formularios compactos). */
  @Input({ transform: booleanAttribute }) compact = false;
}
