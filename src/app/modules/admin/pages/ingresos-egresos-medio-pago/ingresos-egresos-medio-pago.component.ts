import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
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
import { financeMethodLabel, soles } from '../../utils/finance-labels';

const METHOD_ICON: Record<string, string> = {
  EFECTIVO: 'mdi:cash',
  YAPE: 'mdi:cellphone',
  PLIN: 'mdi:cellphone',
  TARJETA: 'mdi:credit-card-outline',
  TRANSFERENCIA: 'mdi:bank-transfer',
  CREDITO: 'mdi:account-clock-outline',
};

/** Ingresos y egresos por medio de pago: cuánto entró y salió por efectivo, Yape, tarjeta… */
@Component({
  selector: 'app-ingresos-egresos-medio-pago',
  standalone: true,
  imports: [CurrencyPipe, RouterLink, BreadcrumbInlineComponent, ComponentCardComponent, HelpPanelComponent, KpiTileComponent, PageStateComponent, PageToolbarComponent, PeriodFilterComponent],
  template: `
    <app-breadcrumb-inline [segments]="breadcrumb" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-lg font-semibold text-gray-800 dark:text-white/90">Ingresos y egresos por medio de pago</h1>
    </app-page-toolbar>

    <app-help-panel title="¿Para qué sirve esta pantalla?" storageKey="ingresos-egresos-medio-pago">
      <ol class="list-decimal space-y-1 ps-5 text-sm text-gray-500 dark:text-gray-400">
        <li>Te dice cuánto dinero entró y salió por cada medio: efectivo, Yape, Plin, tarjeta o transferencia.</li>
        <li>Sirve para cuadrar con tu estado de cuenta, Yape o el voucher del POS. El detalle de cada operación está en <a routerLink="/pagos" class="text-brand-600 underline dark:text-brand-400">Pagos y cobros</a>.</li>
      </ol>
    </app-help-panel>

    <app-period-filter [value]="period()" (change)="period.set($event)" />

    <app-page-state [loading]="query.isPending()" [error]="error()" (retry)="query.refetch()">
      @if (query.data(); as r) {
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <app-kpi-tile label="Ingresos" [value]="money(r.totalIngresos)" icon="mdi:arrow-down-bold-circle-outline" tone="success" />
          <app-kpi-tile label="Egresos" [value]="money(r.totalEgresos)" icon="mdi:arrow-up-bold-circle-outline" tone="error" />
          <app-kpi-tile class="col-span-2 lg:col-span-1" label="Neto" [value]="money(r.neto)" icon="mdi:scale-balance" [tone]="+r.neto < 0 ? 'warning' : 'brand'" sub="Ingresos − egresos" />
        </div>

        @if (r.methods.length) {
          <div class="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
            @for (m of r.methods; track m.metodo) {
              <app-kpi-tile [label]="methodLabel(m.metodo)" [value]="money(m.neto)" [icon]="icon(m.metodo)" tone="gray" [sub]="m.transacciones + ' operaciones'" />
            }
          </div>
        }

        <app-component-card title="Detalle por medio de pago" className="mt-4 overflow-hidden" [bodyClass]="'p-0 sm:p-0'">
          <div class="overflow-hidden rounded-xl border border-gray-100 dark:border-white/[0.05]">
            <div class="max-w-full overflow-x-auto">
              <table class="min-w-full text-start text-gray-700 dark:text-gray-300">
                <thead class="border-b border-gray-100 dark:border-white/[0.05]">
                  <tr>
                    <th class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Medio</th>
                    <th class="px-5 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400">Ingresos</th>
                    <th class="px-5 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400">Egresos</th>
                    <th class="px-5 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400">Neto</th>
                    <th class="px-5 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400">Operaciones</th>
                    <th class="px-5 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400">% de ingresos</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  @for (m of r.methods; track m.metodo) {
                    <tr>
                      <td class="px-5 py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ methodLabel(m.metodo) }}</td>
                      <td class="px-5 py-3 text-end text-theme-sm tabular-nums text-success-600 dark:text-success-400">{{ m.ingresos | currency: 'PEN' : 'symbol' : '1.2-2' }}</td>
                      <td class="px-5 py-3 text-end text-theme-sm tabular-nums text-error-600 dark:text-error-400">{{ m.egresos | currency: 'PEN' : 'symbol' : '1.2-2' }}</td>
                      <td class="px-5 py-3 text-end text-theme-sm font-semibold tabular-nums">{{ m.neto | currency: 'PEN' : 'symbol' : '1.2-2' }}</td>
                      <td class="px-5 py-3 text-end text-theme-sm tabular-nums">{{ m.transacciones }}</td>
                      <td class="px-5 py-3 text-end text-theme-sm tabular-nums">{{ share(m.ingresos, r.totalIngresos) }}</td>
                    </tr>
                  } @empty {
                    <tr><td colspan="99" class="px-5 py-4 text-center text-theme-sm text-gray-500">Sin movimientos en el periodo.</td></tr>
                  }
                </tbody>
                @if (r.methods.length) {
                  <tfoot class="border-t border-gray-200 text-theme-sm font-semibold text-gray-800 dark:border-gray-800 dark:text-white/90">
                    <tr>
                      <td class="px-5 py-3">Total</td>
                      <td class="px-5 py-3 text-end tabular-nums">{{ r.totalIngresos | currency: 'PEN' : 'symbol' : '1.2-2' }}</td>
                      <td class="px-5 py-3 text-end tabular-nums">{{ r.totalEgresos | currency: 'PEN' : 'symbol' : '1.2-2' }}</td>
                      <td class="px-5 py-3 text-end tabular-nums">{{ r.neto | currency: 'PEN' : 'symbol' : '1.2-2' }}</td>
                      <td colspan="2"></td>
                    </tr>
                  </tfoot>
                }
              </table>
            </div>
          </div>
        </app-component-card>
      }
    </app-page-state>
  `,
})
export class IngresosEgresosMedioPagoComponent {
  private readonly locale = inject(LocaleService);
  private readonly api = inject(DirectoryApiService);

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Finanzas' }, { label: 'Por medio de pago' }];
  protected readonly period = signal<Period>({ from: this.locale.monthStartYmd(), to: this.locale.todayYmd() });
  protected readonly money = soles;
  protected readonly methodLabel = financeMethodLabel;

  protected readonly query = injectQuery(() => ({
    queryKey: ['payments-by-method', this.period().from, this.period().to] as const,
    queryFn: () => firstValueFrom(this.api.getPaymentsByMethod(this.period().from, this.period().to)),
  }));
  protected readonly error = computed(() => (this.query.isError() ? httpErrorMessage(this.query.error(), 'No se pudo cargar el reporte') : null));

  protected icon(method: string): string {
    return METHOD_ICON[method] ?? 'mdi:cash-multiple';
  }
  protected share(part: string, total: string): string {
    const t = Number(total);
    return t > 0 ? `${((Number(part) / t) * 100).toFixed(1)} %` : '—';
  }
}
