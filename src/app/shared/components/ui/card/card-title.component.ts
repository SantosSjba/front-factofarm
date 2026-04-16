import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card-title',
  imports: [CommonModule],
  template: `
    <h3
      class="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90 sm:text-xl"
    >
      <ng-content />
    </h3>
  `,
})
export class CardTitleComponent {}
