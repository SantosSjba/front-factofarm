import { Component, input, output } from '@angular/core';
import { ButtonComponent } from '../../ui/button/button.component';
import { ModalComponent } from '../../ui/modal/modal.component';

/**
 * Confirmación simple sobre `app-modal` (Esc, foco atrapado y devuelto al cerrar).
 * El foco inicial va a "Cancelar": en una acción destructiva lo seguro es no confirmar por accidente.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [ButtonComponent, ModalComponent],
  template: `
    <app-modal compact [isOpen]="open()" [title]="title()" [description]="message()" className="sm:max-w-md" bodyClass="pb-4" (closed)="cancelled.emit()">
      <div data-modal-footer class="flex shrink-0 justify-end gap-2 border-t border-gray-100 px-4 py-4 sm:px-6 dark:border-gray-800">
        <app-button data-autofocus startIconName="mdi:close" variant="outline" (btnClick)="cancelled.emit()">{{ cancelLabel() }}</app-button>
        <app-button startIconName="mdi:check" variant="primary" (btnClick)="confirmed.emit()">{{ confirmLabel() }}</app-button>
      </div>
    </app-modal>
  `,
})
export class ConfirmDialogComponent {
  readonly open = input(false);
  readonly title = input('Confirmar');
  readonly message = input('¿Desea continuar?');
  readonly confirmLabel = input('Confirmar');
  readonly cancelLabel = input('Cancelar');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
