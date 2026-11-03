import { Component, DestroyRef, ElementRef, afterNextRender, inject, input, signal } from '@angular/core';
import { TableExcelExportService } from '../../../services/table-excel-export.service';
import { ExcelExportButtonComponent } from '../excel-export/excel-export-button.component';

/**
 * Fila título (slot) + acciones (slot) bajo las migas de pan.
 * Si la pantalla tiene un listado, agrega "Excel" para descargarlo (todas las páginas).
 * Las pantallas con exportación propia lo desactivan con `[excel]="false"`.
 */
@Component({
  selector: 'app-page-toolbar',
  standalone: true,
  imports: [ExcelExportButtonComponent],
  templateUrl: './page-toolbar.component.html',
})
export class PageToolbarComponent {
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly exporter = inject(TableExcelExportService);

  readonly excel = input(true);

  protected readonly showExcel = signal(false);
  protected readonly scope = signal<HTMLElement | null>(null);
  protected readonly fileName = signal('Listado');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      // La pantalla es el componente que contiene esta barra.
      const scope = this.host.nativeElement.parentElement ?? document.body;
      this.scope.set(scope);
      const title = this.host.nativeElement.querySelector('[data-toolbar-title]')?.textContent?.trim();
      this.fileName.set(title || document.title.replace(/^FactoFarm\s*\|\s*/, '') || 'Listado');
      // El listado aparece cuando llegan los datos: se revisa al cambiar el DOM.
      let frame = 0;
      const check = () => {
        frame = 0;
        this.showExcel.set(this.excel() && this.exporter.hasExportableTable(scope));
      };
      const observer = new MutationObserver(() => {
        if (!frame) frame = requestAnimationFrame(check);
      });
      observer.observe(scope, { childList: true, subtree: true });
      check();
      destroyRef.onDestroy(() => {
        observer.disconnect();
        if (frame) cancelAnimationFrame(frame);
      });
    });
  }
}
