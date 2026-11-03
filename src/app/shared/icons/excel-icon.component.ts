import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { EXCEL_ICON } from './excel-icon';

/** Icono de Microsoft Excel para acciones de descargar / importar Excel. */
@Component({
  selector: 'app-excel-icon',
  standalone: true,
  template: `<span class="inline-flex shrink-0" [style.width.px]="size()" [style.height.px]="size()" [innerHTML]="svg()"></span>`,
  host: { class: 'inline-flex', 'aria-hidden': 'true' },
})
export class ExcelIconComponent {
  private readonly sanitizer = inject(DomSanitizer);
  readonly size = input(16);
  // SVG estático propio (no viene del usuario): seguro de insertar.
  protected readonly svg = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(
      EXCEL_ICON.replace('width="16" height="16"', `width="${this.size()}" height="${this.size()}"`),
    ),
  );
}
