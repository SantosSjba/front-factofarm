import { CommonModule } from '@angular/common';
import { Component, inject, signal, computed } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import { LocaleService } from '../../../../core/services/locale.service';
import type { SummaryChip } from '../../../../shared/components/ui/summary-chips/summary-chips.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { AlertComponent } from '../../../../shared/components/ui/alert/alert.component';

@Component({
  selector: 'app-sire-compras',
  standalone: true,
  imports: [
    CommonModule,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    PageStateComponent,
    InputFieldComponent,
    ButtonComponent,
    ListFiltersComponent,
    HelpPanelComponent,
    AlertComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Contabilidad' }, { label: 'SIRE compras' }]" />

    <app-page-toolbar [excel]="false">
      <h1 data-toolbar-title class="text-lg font-semibold text-gray-800 dark:text-white/90">SIRE — Registro de compras</h1>
      <div data-toolbar-actions class="flex flex-wrap items-center gap-2">
        <app-button size="sm" variant="outline" startIconName="mdi:file-export-outline" tooltip="Descarga el archivo PLE 8.1 del mes para cargarlo en el portal SIRE de SUNAT." [loading]="exporting()" [disabled]="exporting()" (btnClick)="exportPle()">Exportar PLE 8.1</app-button>
      </div>
    </app-page-toolbar>

    <app-help-panel title="¿Para qué sirve esta pantalla?" storageKey="sire-compras">
      <ol class="list-decimal space-y-1 ps-5 text-sm text-gray-500 dark:text-gray-400">
        <li>Resume las compras del mes que van al registro de compras del SIRE de SUNAT.</li>
        <li>Pulsa «Exportar PLE 8.1» para descargar el archivo y valídalo antes de cargarlo en el portal SIRE.</li>
      </ol>
    </app-help-panel>

    <app-list-filters compact [showSearch]="false" [showSelect]="false" [showClear]="false" [summaryChips]="summaryChips()" summaryLabel="Resumen del mes" summaryStorageKey="sire-compras">
      <div data-filters class="contents">
        <app-input-field compact class="min-w-0 flex-[2] basis-48 sm:max-w-64" icon="mdi:calendar-month" label="Periodo" type="month" [value]="period()" (valueChange)="period.set($event + '')" />
      </div>
    </app-list-filters>

    <app-page-state [loading]="summaryQuery.isPending()" [error]="summaryError()" skeleton="table" (retry)="summaryQuery.refetch()">
      @if (summaryQuery.data(); as s) {
        <app-alert variant="info" title="Antes de cargarlo en SUNAT" message="Exporta el PLE 8.1 y valídalo antes de subirlo al portal SIRE: deben estar registradas todas las facturas de proveedores del mes." />
      }
    </app-page-state>
  `,
})
export class SireComprasComponent {
  private readonly pen = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
  protected readonly summaryChips = computed<SummaryChip[]>(() => {
    const c = this.summaryQuery.data()?.compras;
    if (!c) return [];
    return [
      { id: 'count', label: 'Compras registradas', count: c.count, icon: 'mdi:truck-check-outline', clickable: false },
      { id: 'total', label: 'Total compras', count: this.pen.format(Number(c.total) || 0), tone: 'brand', clickable: false },
    ];
  });

  private readonly locale = inject(LocaleService);
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);

  protected readonly period = signal(this.locale.currentYearMonth());
  protected readonly exporting = signal(false);

  protected readonly summaryQuery = injectQuery(() => ({
    queryKey: ['sire', 'compras', this.period()] as const,
    queryFn: () => firstValueFrom(this.api.getAccountantSummary(this.period())),
  }));

  protected summaryError() {
    const err = this.summaryQuery.error();
    return err ? httpErrorMessage(err, 'No se pudo cargar el resumen') : null;
  }

  protected async exportPle() {
    const period = this.period().trim();
    if (!/^\d{4}-\d{2}$/.test(period)) {
      this.notify.warning('Periodo inválido');
      return;
    }
    this.exporting.set(true);
    try {
      const payload = await firstValueFrom(this.api.getPleExport('8.1', period));
      const blob = new Blob([payload.content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = payload.filename;
      a.click();
      URL.revokeObjectURL(url);
      this.notify.success(`PLE 8.1 exportado (${payload.rowCount} registros)`);
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo exportar'));
    } finally {
      this.exporting.set(false);
    }
  }
}
