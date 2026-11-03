import { Component, inject, input, signal } from '@angular/core';
import { NotifyService } from '../../../../core/services/notify.service';
import { EXCEL_ICON } from '../../../icons/excel-icon';
import { TableExcelExportService } from '../../../services/table-excel-export.service';
import { ButtonComponent } from '../../ui/button/button.component';

/** "Excel": descarga el listado de la pantalla (todas las páginas, con los filtros aplicados). */
@Component({
  selector: 'app-excel-export-button',
  standalone: true,
  imports: [ButtonComponent],
  template: `
    <app-button
      size="sm"
      variant="outline"
      [startIcon]="icon"
      [loading]="busy()"
      [disabled]="busy()"
      tooltip="Descargar el listado en Excel (todas las páginas, con los filtros aplicados)"
      (btnClick)="export()"
    >
      {{ busy() ? progress() : 'Excel' }}
    </app-button>
  `,
  host: { class: 'inline-flex' },
})
export class ExcelExportButtonComponent {
  private readonly exporter = inject(TableExcelExportService);
  private readonly notify = inject(NotifyService);

  /** Contenedor de la pantalla donde buscar el listado. */
  readonly scope = input.required<HTMLElement>();
  readonly fileName = input('Listado');

  protected readonly icon = EXCEL_ICON;
  protected readonly busy = signal(false);
  protected readonly progress = signal('Exportando…');

  protected async export() {
    if (this.busy()) return;
    this.busy.set(true);
    this.progress.set('Exportando…');
    try {
      const rows = await this.exporter.exportScope(this.scope(), this.fileName(), (page, total) => {
        this.progress.set(total > 1 ? `Exportando ${page}/${total}…` : 'Exportando…');
      });
      this.notify.success(rows ? `Excel descargado: ${rows} ${rows === 1 ? 'fila' : 'filas'}.` : 'El listado está vacío: se descargó solo la cabecera.');
    } catch (error) {
      this.notify.error(error instanceof Error ? error.message : 'No se pudo generar el Excel.');
    } finally {
      this.busy.set(false);
    }
  }
}
