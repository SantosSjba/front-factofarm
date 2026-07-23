import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { HelpHintComponent } from '../../ui/help-hint/help-hint.component';
import { LabelComponent } from '../label/label.component';

/** Agrupa label + control con espaciado estándar FactoFarm. */
@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule, LabelComponent, HelpHintComponent],
  template: `
    <div class="flex flex-col gap-1.5" [ngClass]="className">
      @if (label) {
        <div class="flex items-center gap-1.5">
          <app-label [for]="for">{{ label }}</app-label>
          @if (helpText) {
            <app-help-hint [text]="helpText" [iconSize]="16" />
          }
        </div>
      }
      <ng-content />
    </div>
  `,
})
export class FormFieldComponent {
  @Input() label = '';
  @Input() for = '';
  @Input() className = '';
  /** Texto de ayuda en tooltip junto al label. */
  @Input() helpText = '';
}
