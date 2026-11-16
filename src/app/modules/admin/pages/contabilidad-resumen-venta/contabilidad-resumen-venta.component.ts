import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject, signal, computed } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import { LocaleService } from '../../../../core/services/locale.service';
import type { SummaryChip } from '../../../../shared/components/ui/summary-chips/summary-chips.component';
import { PeriodFilterComponent, type Period } from '../../components/period-filter/period-filter.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';

@Component({
  selector: 'app-contabilidad-resumen-venta',
  standalone: true,
  imports: [
    PeriodFilterComponent,
    CommonModule,
    CurrencyPipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    PageStateComponent,
    HelpPanelComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="breadcrumb" />

    <app-page-toolbar [excel]="false">
      <h1 data-toolbar-title class="text-lg font-semibold text-gray-800 dark:text-white/90">Resumen de venta</h1>
    </app-page-toolbar>

    <app-help-panel title="¿Para qué sirve esta pantalla?" storageKey="contabilidad-resumen-venta">
      <ol class="list-decimal space-y-1 ps-5 text-sm text-gray-500 dark:text-gray-400">
        <li>Compara lo vendido en el periodo con lo que costó esa mercadería: la diferencia es el margen.</li>
        <li>Abajo están los productos que más vendiste. El análisis completo está en Finanzas → Balance y margen.</li>
      </ol>
    </app-help-panel>

    <app-period-filter compact [value]="period()" [summaryChips]="summaryChips()" (periodChange)="from.set($event.from); to.set($event.to)" />

    @let m = marginQuery.data();
    <app-page-state
      [loading]="marginQuery.isPending()"
      [error]="marginError()"
      [empty]="marginQuery.isSuccess() && !m?.topProducts?.length"
      emptyTitle="Sin ventas en el periodo"
      emptyHint="Prueba con otro rango de fechas."
      skeleton="table"
      (retry)="marginQuery.refetch()"
    >
      <div class="ff-table-frame overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="max-w-full overflow-x-auto">
          <table class="min-w-full text-start text-gray-700 dark:text-gray-300">
            <caption class="sr-only">Productos más vendidos del periodo</caption>
            <thead class="border-b border-gray-100 dark:border-white/[0.05]">
              <tr>
                <th data-card-role="title" class="px-5 py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400 text-start">Producto</th>
                <th class="px-5 py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400 text-end">Venta</th>
                <th class="px-5 py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400 text-end">Margen</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-white/[0.05]">
              @for (p of m?.topProducts ?? []; track p.productId) {
                <tr>
                  <td class="px-5 py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ p.nombre }}</td>
                  <td class="px-5 py-3 text-end text-theme-sm tabular-nums">{{ p.venta | currency: 'PEN' : 'symbol' : '1.2-2' }}</td>
                  <td class="px-5 py-3 text-end text-theme-sm font-semibold tabular-nums" [class.text-error-600]="+p.margen < 0">{{ p.margen | currency: 'PEN' : 'symbol' : '1.2-2' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </app-page-state>
  `,
})
export class ContabilidadResumenVentaComponent {
  protected readonly period = computed<Period>(() => ({ from: this.from(), to: this.to() }));
  private readonly pen = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
  protected readonly summaryChips = computed<SummaryChip[]>(() => {
    const m = this.marginQuery.data();
    if (!m) return [];
    return [
      { id: 'venta', label: 'Venta total', count: this.pen.format(Number(m.ventaTotal) || 0), tone: 'brand', clickable: false },
      { id: 'costo', label: 'Costo', count: this.pen.format(Number(m.costoTotal) || 0), clickable: false },
      { id: 'margen', label: 'Margen', count: this.pen.format(Number(m.margen) || 0), tone: Number(m.margen) < 0 ? 'error' : 'success', clickable: false },
      { id: 'pct', label: 'Margen %', count: m.margenPorcentaje + ' %', tone: 'info', clickable: false },
    ];
  });

  private readonly locale = inject(LocaleService);
  private readonly api = inject(DirectoryApiService);

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Contabilidad' }, { label: 'Resumen venta' }];
  protected readonly from = signal(this.locale.monthStartYmd());
  protected readonly to = signal(this.locale.todayYmd());

  protected readonly marginQuery = injectQuery(() => ({
    queryKey: ['margin-report', 'contabilidad', this.from(), this.to()] as const,
    queryFn: () => firstValueFrom(this.api.getMarginReport(this.from(), this.to())),
  }));

  protected marginError() {
    const err = this.marginQuery.error();
    return err ? httpErrorMessage(err, 'No se pudo cargar el resumen') : null;
  }
}
