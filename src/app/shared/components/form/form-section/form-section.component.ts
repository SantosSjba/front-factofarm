import { Component, Input, booleanAttribute } from '@angular/core';
import { SectionHeadingComponent } from '../../common/section-heading/section-heading.component';

const COLUMNS = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
} as const;

/** Bloque de formulario: título (con ícono opcional), descripción y campos en rejilla. */
@Component({
  selector: 'app-form-section',
  standalone: true,
  imports: [SectionHeadingComponent],
  host: { class: 'block min-w-0' },
  template: `
    <section>
      <app-section-heading [title]="title" [description]="description" [icon]="icon" [compact]="compact" />
      <!-- grid-cols-1 base + min-w-0: un texto largo nunca ensancha la columna (sin scroll lateral en teléfono). -->
      <div class="grid" [class]="columnsClass + (compact ? ' gap-3' : ' gap-5')">
        <ng-content />
      </div>
    </section>
  `,
})
export class FormSectionComponent {
  @Input({ required: true }) title!: string;
  @Input() description = '';
  @Input() cols: keyof typeof COLUMNS = 2;
  /** Ícono (iconify) junto al título, en un recuadro de color. */
  @Input() icon = '';
  /** Versión compacta: título 14px, descripción 12px y menos separación entre campos. */
  @Input({ transform: booleanAttribute }) compact = false;

  protected get columnsClass(): string {
    return COLUMNS[this.cols];
  }
}
