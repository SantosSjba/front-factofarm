import { Component, input, output } from '@angular/core';
import { SpinnerComponent } from '../../ui/spinner/spinner.component';

@Component({
  selector: 'app-page-state',
  standalone: true,
  imports: [SpinnerComponent],
  template: `
    @if (loading()) {
      <div
        class="flex min-h-[12rem] flex-col items-center justify-center gap-3 text-sm text-gray-500"
        role="status"
        aria-live="polite"
      >
        <app-spinner size="lg" [label]="loadingLabel()" />
        <span>{{ loadingLabel() }}</span>
      </div>
    } @else if (error()) {
      <div class="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-900 dark:bg-rose-900/20" role="alert">
        <p class="font-medium text-rose-800 dark:text-rose-200">{{ errorTitle() }}</p>
        <p class="mt-1 text-sm text-rose-700 dark:text-rose-300">{{ error() }}</p>
        @if (showRetry()) {
          <button
            type="button"
            class="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
            (click)="retry.emit()"
          >
            Reintentar
          </button>
        }
      </div>
    } @else if (empty()) {
      <div class="flex min-h-[12rem] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 p-8 text-center dark:border-gray-700">
        <p class="font-medium text-gray-700 dark:text-gray-200">{{ emptyTitle() }}</p>
        @if (emptyHint()) {
          <p class="mt-1 text-sm text-gray-500">{{ emptyHint() }}</p>
        }
      </div>
    } @else {
      <ng-content />
    }
  `,
})
export class PageStateComponent {
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly empty = input(false);
  readonly loadingLabel = input('Cargando…');
  readonly errorTitle = input('No se pudo cargar la información');
  readonly emptyTitle = input('Sin resultados');
  readonly emptyHint = input('');
  readonly showRetry = input(true);
  readonly retry = output<void>();
}
