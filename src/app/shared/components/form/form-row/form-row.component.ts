import { CommonModule } from '@angular/common';
import { Component, Input, booleanAttribute } from '@angular/core';

/** Fila de campos con separación horizontal y vertical consistente. */
@Component({
  selector: 'app-form-row',
  standalone: true,
  imports: [CommonModule],
  template: `<div [ngClass]="rowClass"><ng-content /></div>`,
})
export class FormRowComponent {
  @Input() cols: 1 | 2 | 3 = 2;
  @Input() className = '';
  /** Menos separación entre campos (formularios compactos). */
  @Input({ transform: booleanAttribute }) compact = false;

  protected get rowClass(): string {
    const gap = this.compact ? 'gap-3' : 'gap-4';
    const colsClass =
      this.cols === 3
        ? `grid ${gap} sm:grid-cols-3`
        : this.cols === 1
          ? `grid ${gap} grid-cols-1`
          : `grid ${gap} sm:grid-cols-2`;
    return `${colsClass} ${this.className}`.trim();
  }
}
