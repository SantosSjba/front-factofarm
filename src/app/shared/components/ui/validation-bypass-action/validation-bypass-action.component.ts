import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { HelpHintComponent } from '../help-hint/help-hint.component';

/**
 * Acción para apagar una validación obligatoria desde el mensaje que la muestra
 * (p. ej. "No exigir receta en este local"), con ayuda que recuerda dónde reactivarla.
 */
@Component({
  selector: 'app-validation-bypass-action',
  standalone: true,
  imports: [ButtonComponent, HelpHintComponent],
  template: `
    <span class="inline-flex items-center gap-1" [class]="className">
      <app-button variant="link" [startIconName]="iconName" [disabled]="disabled" (btnClick)="action.emit()">
        <ng-content />
      </app-button>
      <app-help-hint [text]="hint" [iconSize]="16" />
    </span>
  `,
})
export class ValidationBypassActionComponent {
  /** Dónde se vuelve a activar; se muestra en el tooltip. */
  @Input() hint =
    'Puede volver a activarlo cuando quiera en Establecimientos → Editar → Validaciones del POS.';
  @Input() iconName = 'mdi:cog-outline';
  @Input() disabled = false;
  @Input() className = '';
  @Output() readonly action = new EventEmitter<void>();
}
