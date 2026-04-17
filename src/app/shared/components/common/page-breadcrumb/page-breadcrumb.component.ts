import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

export type BreadcrumbSegment = {
  label: string;
  /** Ruta o array de comandos de `Router`. Si se omite en un segmento intermedio, se muestra texto sin enlace. */
  link?: string | readonly unknown[];
};

@Component({
  selector: 'app-page-breadcrumb',
  imports: [RouterModule],
  templateUrl: './page-breadcrumb.component.html',
  styles: ``,
})
export class PageBreadcrumbComponent {
  @Input() pageTitle = '';
  /** Si se define, sustituye el patrón título + "Home" por una ruta personalizada. */
  @Input() segments: BreadcrumbSegment[] | null = null;
  @Input() homeLink = '/';
  @Input() homeLabel = 'Inicio';
}
