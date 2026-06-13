import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

/** Contenedor vertical para formularios y bloques de modal. */
@Component({
  selector: 'app-form-stack',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="flex flex-col gap-4" [ngClass]="className"><ng-content /></div>`,
})
export class FormStackComponent {
  @Input() className = '';
}
