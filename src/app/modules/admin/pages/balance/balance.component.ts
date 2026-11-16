import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { LocaleService } from '../../../../core/services/locale.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { PeriodFilterComponent, type Period } from '../../components/period-filter/period-filter.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import { soles } from '../../utils/finance-labels';
import type { SummaryChip } from '../../../../shared/components/ui/summary-chips/summary-chips.component';
import { SectionHeadingComponent } from '../../../../shared/components/common/section-heading/section-heading.component';

/** Balance y margen: cuánto se ganó sobre lo vendido en el periodo. */
@Component({
  selector: 'app-balance',
  standalone: true,
  imports: [
    CurrencyPipe,
    BreadcrumbInlineComponent,
    HelpPanelComponent,
    PageStateComponent,
    PageToolbarComponent,
    PeriodFilterComponent,
    SectionHeadingComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="breadcrumb" />
    <app-page-toolbar [excel]="false">
      <h1 data-toolbar-title class="text-lg font-semibold text-gray-800 dark:text-white/90">Balance y margen</h1>
    </app-page-toolbar>

    <app-help-panel title="¿Para qué sirve esta pantalla?" storageKey="balance">
      <ol class="list-decimal space-y-1 ps-5 text-sm text-gray-500 dark:text-gray-400">
        <li>Compara lo que vendiste con lo que te costó esa mercadería: la diferencia es tu margen (ganancia bruta).</li>
        <li>El costo sale del costo registrado de cada producto. Si un producto no tiene costo, su margen sale igual a su venta.</li>
        <li>Abajo están los 20 productos que más ganancia dejaron en el periodo.</li>
      </ol>
    </app-help-panel>

    <app-period-filter compact [value]="period()" [summaryChips]="summaryChips()" (periodChange)="period.set($event)" />

    <app-page-state [loading]="query.isPending()" [error]="error()" skeleton="table" (retry)="query.refetch()">
      @if (query.data(); as m) {


        <app-section-heading compact title="Productos que más ganancia dejaron" description="Los 20 primeros del periodo." icon="mdi:trophy-outline" />
        <div class="ff-table-frame overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div class="max-w-full overflow-x-auto">
              <table class="min-w-full text-start text-gray-700 dark:text-gray-300">
                <caption class="sr-only">Productos con más margen</caption>
                <thead class="border-b border-gray-100 dark:border-white/[0.05]">
                  <tr>
                    <th data-card-role="title" class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Producto</th>
                    <th class="px-5 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400">Vendido</th>
                    <th class="px-5 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400">Costo</th>
                    <th class="px-5 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400">Margen</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  @for (p of m.topProducts; track p.productId) {
                    <tr [attr.data-row-tone]="+p.margen < 0 ? 'error-light' : null">
                      <td class="px-5 py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ p.nombre }}</td>
                      <td class="px-5 py-3 text-end text-theme-sm tabular-nums">{{ p.venta | currency: 'PEN' : 'symbol' : '1.2-2' }}</td>
                      <td class="px-5 py-3 text-end text-theme-sm tabular-nums">{{ p.costo | currency: 'PEN' : 'symbol' : '1.2-2' }}</td>
                      <td class="px-5 py-3 text-end text-theme-sm tabular-nums whitespace-nowrap">
                        <span class="font-semibold" [class.text-error-600]="+p.margen < 0">{{ p.margen | currency: 'PEN' : 'symbol' : '1.2-2' }}</span>
                        <span class="block text-theme-xs text-gray-500 dark:text-gray-400">{{ pct(p) }}</span>
                      </td>
                    </tr>
                  } @empty {
                    <tr><td colspan="99" class="px-5 py-4 text-center text-theme-sm text-gray-500">Sin ventas en el periodo.</td></tr>
                  }
                </tbody>
              </table>
            </div>
        </div>
      }
    </app-page-state>
  `,
})
export class BalanceComponent {
  /** Totales del periodo en chips sobre la tabla. */
  protected readonly summaryChips = computed<SummaryChip[]>(() => {
    const m = this.query.data();
    if (!m) return [];
    return [
      { id: 'venta', label: 'Vendido', count: this.money(m.ventaTotal), icon: 'mdi:cash-multiple', tone: 'brand', clickable: false },
      { id: 'costo', label: 'Costo de lo vendido', count: this.money(m.costoTotal), clickable: false },
      { id: 'margen', label: 'Margen', count: this.money(m.margen), tone: +m.margen < 0 ? 'error' : 'success', clickable: false, tooltip: 'Vendido menos costo.' },
      { id: 'pct', label: 'Margen %', count: m.margenPorcentaje + ' %', tone: 'info', clickable: false, tooltip: 'Margen dividido entre lo vendido.' },
    ];
  });

  private readonly locale = inject(LocaleService);
  private readonly api = inject(DirectoryApiService);

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Finanzas' }, { label: 'Balance y margen' }];
  protected readonly period = signal<Period>({ from: this.locale.monthStartYmd(), to: this.locale.todayYmd() });
  protected readonly money = soles;

  protected readonly query = injectQuery(() => ({
    queryKey: ['margin-report', this.period().from, this.period().to] as const,
    queryFn: () => firstValueFrom(this.api.getMarginReport(this.period().from, this.period().to)),
  }));
  protected readonly error = computed(() => (this.query.isError() ? httpErrorMessage(this.query.error(), 'No se pudo cargar el margen') : null));

  protected pct(p: { venta: string; margen: string }): string {
    const v = Number(p.venta);
    return v > 0 ? `${((Number(p.margen) / v) * 100).toFixed(1)} %` : '—';
  }
}
