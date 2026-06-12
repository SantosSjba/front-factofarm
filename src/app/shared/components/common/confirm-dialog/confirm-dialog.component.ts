import { Component, input, output } from '@angular/core';
import { ButtonComponent } from '../../ui/button/button.component';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [ButtonComponent],
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" [attr.aria-label]="title()">
        <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-white">{{ title() }}</h3>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">{{ message() }}</p>
          <div class="mt-6 flex justify-end gap-2">
            <app-button variant="outline" (btnClick)="cancelled.emit()">{{ cancelLabel() }}</app-button>
            <app-button variant="primary" (btnClick)="confirmed.emit()">{{ confirmLabel() }}</app-button>
          </div>
        </div>
      </div>
    }
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
