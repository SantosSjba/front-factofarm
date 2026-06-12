import { Component, input } from '@angular/core';
import { PageStateComponent } from '../page-state/page-state.component';

@Component({
  selector: 'app-placeholder-page',
  standalone: true,
  imports: [PageStateComponent],
  template: `
    <div class="mb-5">
      <ng-content select="[data-breadcrumb]" />
    </div>
    <ng-content select="[data-toolbar]" />
    <app-page-state
      [empty]="true"
      [emptyTitle]="title()"
      [emptyHint]="hint()"
    />
  `,
})
export class PlaceholderPageComponent {
  readonly title = input.required<string>();
  readonly hint = input('Opción en desarrollo.');
}
