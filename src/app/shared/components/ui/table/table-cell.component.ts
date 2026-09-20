import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-table-cell',
  imports: [CommonModule],
  template: `
    @if (isHeader) {
      <th [ngClass]="className"><ng-content></ng-content></th>
    } @else {
      <td
        [ngClass]="className"
        [attr.data-label]="label || null"
        [attr.data-role]="role || null"
      >
        <ng-content></ng-content>
      </td>
    }
  `,
})
export class TableCellComponent {
  @Input() isHeader = false;
  @Input() className = '';
  @Input() label = '';
  @Input() role: 'index' | 'title' | 'field' | 'actions' | '' = '';
}
