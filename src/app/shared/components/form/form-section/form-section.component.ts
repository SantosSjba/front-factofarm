import { Component, Input } from '@angular/core';

const COLUMNS = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
} as const;

/** Bloque de formulario: título, descripción y campos en rejilla. */
@Component({
  selector: 'app-form-section',
  standalone: true,
  host: { class: 'block' },
  template: `
    <section>
      <div class="mb-4">
        <h4 class="text-base font-medium text-gray-800 dark:text-white/90">{{ title }}</h4>
        @if (description) {
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ description }}</p>
        }
      </div>
      <div class="grid gap-5" [class]="columnsClass">
        <ng-content />
      </div>
    </section>
  `,
})
export class FormSectionComponent {
  @Input({ required: true }) title!: string;
  @Input() description = '';
  @Input() cols: keyof typeof COLUMNS = 2;

  protected get columnsClass(): string {
    return COLUMNS[this.cols];
  }
}
