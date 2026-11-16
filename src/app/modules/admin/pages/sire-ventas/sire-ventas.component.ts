import { CommonModule, CurrencyPipe } from '@angular/common';
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
import { documentTypeLabel } from '../../utils/sale-labels';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { SectionHeadingComponent } from '../../../../shared/components/common/section-heading/section-heading.component';

@Component({
  selector: 'app-sire-ventas',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    PageStateComponent,
    InputFieldComponent,
    ButtonComponent,
    ListFiltersComponent,
    HelpPanelComponent,
    SectionHeadingComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Contabilidad' }, { label: 'SIRE ventas' }]" />

    <app-page-toolbar [excel]="false">
      <h1 data-toolbar-title class="text-lg font-semibold text-gray-800 dark:text-white/90">SIRE — Registro de ventas</h1>
      <div data-toolbar-actions class="flex flex-wrap items-center gap-2">
        <app-button size="sm" variant="outline" startIconName="mdi:file-export-outline" tooltip="Descarga el archivo PLE 14.1 del mes para cargarlo en el portal SIRE de SUNAT." [loading]="exporting()" [disabled]="exporting()" (btnClick)="exportPle()">Exportar PLE 14.1</app-button>
      </div>
    </app-page-toolbar>

    <app-help-panel title="¿Para qué sirve esta pantalla?" storageKey="sire-ventas">
      <ol class="list-decimal space-y-1 ps-5 text-sm text-gray-500 dark:text-gray-400">
        <li>Resume las ventas del mes como las pide SUNAT en el SIRE: cantidad de comprobantes, subtotal, IGV y total.</li>
        <li>Pulsa «Exportar PLE 14.1» para descargar el archivo y valídalo antes de cargarlo en el portal SIRE.</li>
      </ol>
    </app-help-panel>

    <app-list-filters compact [showSearch]="false" [showSelect]="false" [showClear]="false" [summaryChips]="summaryChips()" summaryLabel="Resumen del mes" summaryStorageKey="sire-ventas">
      <div data-filters class="contents">
        <app-input-field compact class="min-w-0 flex-[2] basis-48 sm:max-w-64" icon="mdi:calendar-month" label="Periodo" type="month" [value]="period()" (valueChange)="period.set($event + '')" />
      </div>
    </app-list-filters>

    <app-page-state [loading]="summaryQuery.isPending()" [error]="summaryError()" skeleton="table" (retry)="summaryQuery.refetch()">
      @if (summaryQuery.data(); as s) {
        @if (s.comprobantesElectronicos.length) {
          <app-section-heading compact title="Comprobantes electrónicos del mes" icon="mdi:file-certificate-outline" />
          <div class="ff-table-frame overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div class="max-w-full overflow-x-auto">
              <table class="min-w-full text-start text-gray-700 dark:text-gray-300">
                <caption class="sr-only">Comprobantes electrónicos por tipo</caption>
                <thead class="border-b border-gray-100 dark:border-white/[0.05]">
                  <tr>
                    <th data-card-role="title" class="px-5 py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400 text-start">Tipo</th>
                    <th class="px-5 py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400 text-end">Cantidad</th>
                    <th class="px-5 py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400 text-end">Total</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  @for (row of s.comprobantesElectronicos; track row.tipo) {
                    <tr>
                      <td class="px-5 py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ docLabel(row.tipo) }}</td>
                      <td class="px-5 py-3 text-end text-theme-sm tabular-nums">{{ row.count }}</td>
                      <td class="px-5 py-3 text-end text-theme-sm font-semibold tabular-nums">{{ row.total | currency: 'PEN' : 'symbol' : '1.2-2' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        } @else {
          <app-page-state [empty]="true" emptyTitle="Sin comprobantes electrónicos en el mes" emptyHint="Elige otro periodo." />
        }
      }
    </app-page-state>
  `,
})
export class SireVentasComponent {
  private readonly pen = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
  protected readonly docLabel = documentTypeLabel;
  protected readonly summaryChips = computed<SummaryChip[]>(() => {
    const v = this.summaryQuery.data()?.ventas;
    if (!v) return [];
    return [
      { id: 'count', label: 'Comprobantes', count: v.count, icon: 'mdi:receipt-text-outline', clickable: false },
      { id: 'sub', label: 'Subtotal', count: this.pen.format(Number(v.subtotal) || 0), clickable: false },
      { id: 'igv', label: 'IGV', count: this.pen.format(Number(v.igv) || 0), clickable: false },
      { id: 'total', label: 'Total ventas', count: this.pen.format(Number(v.total) || 0), tone: 'brand', clickable: false },
    ];
  });

  private readonly locale = inject(LocaleService);
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);

  protected readonly period = signal(this.locale.currentYearMonth());
  protected readonly exporting = signal(false);

  protected readonly summaryQuery = injectQuery(() => ({
    queryKey: ['sire', 'ventas', this.period()] as const,
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
      const payload = await firstValueFrom(this.api.getPleExport('14.1', period));
      const blob = new Blob([payload.content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = payload.filename;
      a.click();
      URL.revokeObjectURL(url);
      this.notify.success(`PLE 14.1 exportado (${payload.rowCount} registros)`);
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo exportar'));
    } finally {
      this.exporting.set(false);
    }
  }
}
