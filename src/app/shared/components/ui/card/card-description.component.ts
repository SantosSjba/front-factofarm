import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card-description',
  imports: [CommonModule],
  template: `
    <p class="text-sm text-gray-500 dark:text-gray-400">
      <ng-content />
    </p>
  `,
})
export class CardDescriptionComponent {}
