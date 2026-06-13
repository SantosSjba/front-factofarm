import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

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

  protected get rowClass(): string {
    const colsClass =
      this.cols === 3
        ? 'grid gap-4 sm:grid-cols-3'
        : this.cols === 1
          ? 'grid gap-4 grid-cols-1'
          : 'grid gap-4 sm:grid-cols-2';
    return `${colsClass} ${this.className}`.trim();
  }
}
