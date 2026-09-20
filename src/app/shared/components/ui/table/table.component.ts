import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-table',
  imports: [CommonModule],
  host: {
    class: 'ff-table-host block',
  },
  template: `<table [ngClass]="'min-w-full ff-table-cards ' + className"><ng-content></ng-content></table>`,
})
export class TableComponent {
  @Input() className = '';
}
