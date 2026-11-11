import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { LocaleService } from '../../../../core/services/locale.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { KpiTileComponent } from '../../../../shared/components/common/dashboard/kpi-tile.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { PeriodFilterComponent, type Period } from '../../components/period-filter/period-filter.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import { soles } from '../../utils/finance-labels';

/** Balance y margen: cuánto se ganó sobre lo vendido en el periodo. */
@Component({
  selector: 'app-balance',
  standalone: true,
  imports: [CurrencyPipe, BreadcrumbInlineComponent, ComponentCardComponent, HelpPanelComponent, KpiTileComponent, PageStateComponent, PageToolbarComponent, PeriodFilterComponent],
  template: `
    <app-breadcrumb-inline [segments]="breadcrumb" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-lg font-semibold text-gray-800 dark:text-white/90">Balance y margen</h1>
    </app-page-toolbar>

    <app-help-panel title="¿Para qué sirve esta pantalla?" storageKey="balance">
      <ol class="list-decimal space-y-1 ps-5 text-sm text-gray-500 dark:text-gray-400">
        <li>Compara lo que vendiste con lo que te costó esa mercadería: la diferencia es tu margen (ganancia bruta).</li>
        <li>El costo sale del costo registrado de cada producto. Si un producto no tiene costo, su margen sale igual a su venta.</li>
        <li>Abajo están los 20 productos que más ganancia dejaron en el periodo.</li>
      </ol>
    </app-help-panel>

    <app-period-filter [value]="period()" (change)="period.set($event)" />

    <app-page-state [loading]="query.isPending()" [error]="error()" (retry)="query.refetch()">
      @if (query.data(); as m) {
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <app-kpi-tile label="Vendido" [value]="money(m.ventaTotal)" icon="mdi:cash-multiple" tone="brand" />
          <app-kpi-tile label="Costo de lo vendido" [value]="money(m.costoTotal)" icon="mdi:cart-outline" tone="gray" />
          <app-kpi-tile label="Margen" [value]="money(m.margen)" icon="mdi:trending-up" [tone]="+m.margen < 0 ? 'error' : 'success'" sub="Vendido − costo" />
          <app-kpi-tile label="Margen %" [value]="m.margenPorcentaje + ' %'" icon="mdi:percent-outline" tone="info" sub="Margen ÷ vendido" />
        </div>

        <app-component-card title="Productos que más ganancia dejaron" desc="Los 20 primeros del periodo." className="mt-4 overflow-hidden" [bodyClass]="'p-0 sm:p-0'">
          <div class="overflow-hidden rounded-xl border border-gray-100 dark:border-white/[0.05]">
            <div class="max-w-full overflow-x-auto">
              <table class="min-w-full text-start text-gray-700 dark:text-gray-300">
                <thead class="border-b border-gray-100 dark:border-white/[0.05]">
                  <tr>
                    <th class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">#</th>
                    <th class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Producto</th>
                    <th class="px-5 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400">Vendido</th>
                    <th class="px-5 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400">Costo</th>
                    <th class="px-5 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400">Margen</th>
                    <th class="px-5 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400">Margen %</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  @for (p of m.topProducts; track p.productId; let i = $index) {
                    <tr [attr.data-row-tone]="+p.margen < 0 ? 'error-light' : null">
                      <td class="px-5 py-3 text-theme-sm text-gray-500">{{ i + 1 }}</td>
                      <td class="px-5 py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ p.nombre }}</td>
                      <td class="px-5 py-3 text-end text-theme-sm tabular-nums">{{ p.venta | currency: 'PEN' : 'symbol' : '1.2-2' }}</td>
                      <td class="px-5 py-3 text-end text-theme-sm tabular-nums">{{ p.costo | currency: 'PEN' : 'symbol' : '1.2-2' }}</td>
                      <td class="px-5 py-3 text-end text-theme-sm font-semibold tabular-nums" [class.text-error-600]="+p.margen < 0">{{ p.margen | currency: 'PEN' : 'symbol' : '1.2-2' }}</td>
                      <td class="px-5 py-3 text-end text-theme-sm tabular-nums">{{ pct(p) }}</td>
                    </tr>
                  } @empty {
                    <tr><td colspan="99" class="px-5 py-4 text-center text-theme-sm text-gray-500">Sin ventas en el periodo.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </app-component-card>
      }
    </app-page-state>
  `,
})
export class BalanceComponent {
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
