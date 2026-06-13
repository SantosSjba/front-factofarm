import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { LabelComponent } from '../label/label.component';

/** Agrupa label + control con espaciado estándar FactoFarm. */
@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule, LabelComponent],
  template: `
    <div class="flex flex-col gap-1.5" [ngClass]="className">
      @if (label) {
        <app-label [for]="for">{{ label }}</app-label>
      }
      <ng-content />
    </div>
  `,
})
export class FormFieldComponent {
  @Input() label = '';
  @Input() for = '';
  @Input() className = '';
}
