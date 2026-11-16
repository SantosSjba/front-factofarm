import { Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { NotifyService } from '../../../../core/services/notify.service';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import { LocaleService } from '../../../../core/services/locale.service';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';

@Component({
  selector: 'app-contabilidad-exportar-formatos',
  standalone: true,
  imports: [
    PageToolbarComponent,
    BreadcrumbInlineComponent,
    ComponentCardComponent,
    ButtonComponent,
    InputFieldComponent,
    ListFiltersComponent,
    HelpPanelComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Contabilidad' }, { label: 'Exportar formatos PLE' }]" />

    <app-page-toolbar [excel]="false">
      <h1 data-toolbar-title class="text-lg font-semibold text-gray-800 dark:text-white/90">Libros electrónicos SUNAT</h1>
    </app-page-toolbar>

    <app-help-panel title="¿Para qué sirve esta pantalla?" storageKey="contabilidad-exportar-formatos">
      <ol class="list-decimal space-y-1 ps-5 text-sm text-gray-500 dark:text-gray-400">
        <li>Descarga los libros electrónicos del mes: los PLE en TXT y los libros en Excel para el RVIE.</li>
        <li>Revísalos con tu contador y valídalos con el formato vigente de SUNAT antes de presentarlos.</li>
      </ol>
    </app-help-panel>

    <app-list-filters compact [showSearch]="false" [showSelect]="false" [showClear]="false">
      <div data-filters class="contents">
        <app-input-field compact class="min-w-0 flex-[2] basis-48 sm:max-w-64" icon="mdi:calendar-month" label="Periodo" type="month" [value]="period()" (valueChange)="period.set($event + '')" />
      </div>
    </app-list-filters>

    <div class="grid gap-x-4 lg:grid-cols-2">
      <app-component-card compact icon="mdi:file-document-outline" title="PLE (TXT)" desc="Formato de texto para cargar o revisar.">
        <div class="flex flex-wrap gap-2">
          <app-button size="sm" variant="outline" startIconName="mdi:download" [disabled]="exporting()" (btnClick)="exportPle('14.1')">14.1 Ventas</app-button>
          <app-button size="sm" variant="outline" startIconName="mdi:download" [disabled]="exporting()" (btnClick)="exportPle('8.1')">8.1 Compras</app-button>
          <app-button size="sm" variant="outline" startIconName="mdi:download" [disabled]="exporting()" (btnClick)="exportPle('13.1')">13.1 Inventario</app-button>
        </div>
      </app-component-card>
      <app-component-card compact icon="mdi:microsoft-excel" title="Libros en Excel (RVIE)" desc="Para revisión contable y el RVIE.">
        <div class="flex flex-wrap gap-2">
          <app-button size="sm" variant="outline" startIconName="mdi:download" [disabled]="exporting()" (btnClick)="exportSunatBook('sales')">Libro de ventas</app-button>
          <app-button size="sm" variant="outline" startIconName="mdi:download" [disabled]="exporting()" (btnClick)="exportSunatBook('inventory')">Registro de inventarios</app-button>
        </div>
      </app-component-card>
    </div>
  `,
})
export class ContabilidadExportarFormatosComponent {
  private readonly locale = inject(LocaleService);
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);

  protected readonly period = signal(this.locale.currentYearMonth());
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
