import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import type { BreadcrumbSegment } from '../page-breadcrumb/page-breadcrumb.component';

/** Solo migas de pan (sin H1); útil encima de títulos de página custom. */
@Component({
  selector: 'app-breadcrumb-inline',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './breadcrumb-inline.component.html',
})
export class BreadcrumbInlineComponent {
  @Input({ required: true }) segments!: BreadcrumbSegment[];
}
