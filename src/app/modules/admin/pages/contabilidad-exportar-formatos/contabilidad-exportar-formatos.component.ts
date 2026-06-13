import { Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { NotifyService } from '../../../../core/services/notify.service';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { DirectoryApiService } from '../../services/directory-api.service';

@Component({
  selector: 'app-contabilidad-exportar-formatos',
  standalone: true,
  imports: [
    BreadcrumbInlineComponent,
    ComponentCardComponent,
    ButtonComponent,
    InputFieldComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Contabilidad' }, { label: 'Exportar formatos PLE' }]" />
    <app-component-card title="Libros electrónicos SUNAT (TXT)">
      <div class="mb-4 flex flex-wrap items-end gap-4">
        <app-input-field placeholder="Periodo YYYY-MM" [value]="period()" (valueChange)="period.set($event + '')" />
      </div>
      <div class="flex flex-wrap gap-3">
        <app-button variant="outline" [disabled]="exporting()" (btnClick)="exportPle('14.1')">PLE 14.1 Ventas</app-button>
        <app-button variant="outline" [disabled]="exporting()" (btnClick)="exportPle('8.1')">PLE 8.1 Compras</app-button>
        <app-button variant="outline" [disabled]="exporting()" (btnClick)="exportPle('13.1')">PLE 13.1 Inventario</app-button>
      </div>
      <p class="mt-4 text-sm text-gray-500">Formato tabular TXT para carga/revisión contable. Valide contra el PLE oficial SUNAT antes de presentar.</p>
    </app-component-card>

    <app-component-card class="mt-6" title="Libros SUNAT (Excel RVIE)">
      <div class="mb-4 flex flex-wrap items-end gap-4">
        <app-input-field placeholder="Periodo YYYY-MM" [value]="period()" (valueChange)="period.set($event + '')" />
      </div>
      <div class="flex flex-wrap gap-3">
        <app-button variant="outline" [disabled]="exporting()" (btnClick)="exportSunatBook('sales')">
          Libro de ventas (Excel)
        </app-button>
        <app-button variant="outline" [disabled]="exporting()" (btnClick)="exportSunatBook('inventory')">
          Registro de inventarios (Excel)
        </app-button>
      </div>
      <p class="mt-4 text-sm text-gray-500">
        Exportación Excel para revisión contable y RVIE. Valide columnas contra el formato vigente SUNAT.
      </p>
    </app-component-card>
  `,
})
export class ContabilidadExportarFormatosComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);

  protected readonly period = signal(new Date().toISOString().slice(0, 7));
  protected readonly exporting = signal(false);

  protected async exportPle(book: '14.1' | '8.1' | '13.1') {
    const period = this.period().trim();
    if (!/^\d{4}-\d{2}$/.test(period)) {
      this.notify.warning('Periodo inválido');
      return;
    }
    this.exporting.set(true);
    try {
      const payload = await firstValueFrom(this.api.getPleExport(book, period));
      const blob = new Blob([payload.content], { type: 'text/plain;charset=utf-8' });
      this.downloadBlob(blob, payload.filename);
      this.notify.success(`Exportado ${payload.rowCount} registros`);
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo exportar PLE'));
    } finally {
      this.exporting.set(false);
    }
  }

  protected async exportSunatBook(kind: 'sales' | 'inventory') {
    const period = this.period().trim();
    if (!/^\d{4}-\d{2}$/.test(period)) {
      this.notify.warning('Periodo inválido');
      return;
    }
    this.exporting.set(true);
    try {
      const blob = await firstValueFrom(
        kind === 'sales'
          ? this.api.downloadSunatSalesRegister(period)
          : this.api.downloadSunatInventoryRegister(period),
      );
      const suffix = kind === 'sales' ? 'ventas' : 'inventario';
      this.downloadBlob(blob, `sunat-${suffix}-${period}.xlsx`);
      this.notify.success('Exportación Excel generada');
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo exportar libro SUNAT'));
    } finally {
      this.exporting.set(false);
    }
  }

  private downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
