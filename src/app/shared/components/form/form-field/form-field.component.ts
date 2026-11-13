import { CommonModule } from '@angular/common';
import { Component, Input, booleanAttribute } from '@angular/core';
import { HelpHintComponent } from '../../ui/help-hint/help-hint.component';
import { LabelComponent } from '../label/label.component';

/** Agrupa label + control con espaciado estándar FactoFarm. */
@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule, LabelComponent, HelpHintComponent],
  template: `
    <div class="flex flex-col" [class.gap-1.5]="!compact" [class.gap-1]="compact" [ngClass]="className">
      @if (label) {
        <app-label [for]="for" [required]="required" [helpText]="helpText" [compact]="compact" [className]="compact ? 'mb-0' : ''">{{ label }}</app-label>
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
  /** Marca el campo como obligatorio (asterisco en el label). */
  @Input({ transform: booleanAttribute }) required = false;
  /** Etiqueta de 12px y menos espacio hasta el campo (pon `compact` también en el campo). */
  @Input({ transform: booleanAttribute }) compact = false;
}
