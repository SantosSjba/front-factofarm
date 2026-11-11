import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { LocaleService } from '../../../../core/services/locale.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { KpiTileComponent } from '../../../../shared/components/common/dashboard/kpi-tile.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { StatusBadgeComponent } from '../../../../shared/components/ui/badge/status-badge.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { PeriodFilterComponent, type Period } from '../../components/period-filter/period-filter.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import { DEBT_PAYMENT_METHODS, financeMethodLabel, paymentTypeLabel, paymentTypeSign, paymentTypeTone, soles } from '../../utils/finance-labels';

/** Pagos y cobros: cada movimiento de dinero (ventas, cobros a clientes y pagos a proveedores). */
@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [
    CurrencyPipe,
    AppDatePipe,
    QueryPageStatePipe,
    BreadcrumbInlineComponent,
    ComponentCardComponent,
    FormSelectComponent,
    HelpPanelComponent,
    KpiTileComponent,
    PageToolbarComponent,
    PaginationComponent,
    PeriodFilterComponent,
    StatusBadgeComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="breadcrumb" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-lg font-semibold text-gray-800 dark:text-white/90">Pagos y cobros</h1>
    </app-page-toolbar>

    <app-help-panel title="¿Para qué sirve esta pantalla?" storageKey="pagos">
      <ol class="list-decimal space-y-1 ps-5 text-sm text-gray-500 dark:text-gray-400">
        <li>Lista cada pago: lo cobrado en ventas, los cobros a clientes con deuda y los pagos a proveedores, del más reciente al más antiguo.</li>
        <li>Filtra por tipo o medio de pago para cuadrar, por ejemplo, todos los Yape del mes. Los totales suman todo lo filtrado.</li>
      </ol>
    </app-help-panel>

    <app-period-filter [value]="period()" (change)="period.set($event); page.set(1)">
      <div class="mt-3 grid gap-3 border-t border-gray-100 pt-3 sm:grid-cols-2 lg:grid-cols-4 dark:border-gray-800">
        <app-form-select label="Tipo" [showPlaceholder]="false" [options]="tipoOptions" [value]="tipo()" (valueChange)="tipo.set($event); page.set(1)" />
        <app-form-select label="Medio de pago" [showPlaceholder]="false" [options]="metodoOptions" [value]="metodo()" (valueChange)="metodo.set($event); page.set(1)" />
      </div>
    </app-period-filter>

    @if (kpis(); as k) {
      <div class="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <app-kpi-tile label="Cobrado en ventas" [value]="k.ventas" icon="mdi:cart-check" tone="success" />
        <app-kpi-tile label="Cobros a clientes" [value]="k.cobros" icon="mdi:account-cash-outline" tone="info" />
        <app-kpi-tile label="Pagos a proveedores" [value]="k.pagos" icon="mdi:truck-outline" tone="warning" />
        <app-kpi-tile label="Neto" [value]="k.neto" icon="mdi:scale-balance" [tone]="k.netoNegativo ? 'error' : 'brand'" sub="Cobrado − pagado" />
      </div>
    }

    @let state = query | queryPageState: total();
    <app-component-card
      title="Movimientos"
      [desc]="total() ? total() + ' en total' : ''"
      className="overflow-hidden"
      [bodyClass]="'p-0 sm:p-0'"
      [loading]="state.loading"
      [error]="state.error"
      [empty]="state.empty"
      emptyTitle="Sin pagos en el periodo"
      emptyHint="Prueba con otras fechas o filtros."
      (retry)="query.refetch()"
    >
      <div class="overflow-hidden rounded-xl border border-gray-100 dark:border-white/[0.05]">
        <div class="max-w-full overflow-x-auto">
          <table class="min-w-full text-start text-gray-700 dark:text-gray-300">
            <thead class="border-b border-gray-100 dark:border-white/[0.05]">
              <tr>
                <th class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Fecha</th>
                <th class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Tipo</th>
                <th class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Detalle</th>
                <th class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Medio</th>
                <th class="px-5 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400">Monto</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-white/[0.05]">
              @for (row of rows(); track row.tipo + row.id) {
                <tr>
                  <td class="px-5 py-4 text-theme-sm whitespace-nowrap">{{ row.fecha | appDate: 'dd/MM/yyyy HH:mm' }}</td>
                  <td class="px-5 py-4 text-theme-sm"><app-status-badge [status]="row.tipo" [tone]="typeTone(row.tipo)" [label]="typeLabel(row.tipo)" /></td>
                  <td class="px-5 py-4 text-theme-sm">
                    <span class="block text-gray-800 dark:text-white/90">{{ row.descripcion }}</span>
                    <span class="text-theme-xs text-gray-500 dark:text-gray-400">{{ row.contraparte ?? '' }}{{ row.referencia ? (row.contraparte ? ' · ' : '') + 'Op. ' + row.referencia : '' }}</span>
                  </td>
                  <td class="px-5 py-4 text-theme-sm">{{ methodLabel(row.metodo) }}</td>
                  <td class="px-5 py-4 text-end text-theme-sm font-medium tabular-nums" [class]="sign(row.tipo) < 0 ? 'text-error-600 dark:text-error-400' : 'text-success-600 dark:text-success-400'">
                    {{ sign(row.tipo) * +row.monto | currency: 'PEN' : 'symbol' : '1.2-2' }}
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="99" class="px-5 py-4 text-center text-theme-sm text-gray-500">Sin coincidencias.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </app-component-card>
    <app-pagination [currentPage]="page()" [totalItems]="total()" [pageSize]="pageSize" (currentPageChange)="page.set($event)" />
  `,
})
export class PagosComponent {
  private readonly locale = inject(LocaleService);
  private readonly api = inject(DirectoryApiService);

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Finanzas' }, { label: 'Pagos y cobros' }];
  protected readonly pageSize = 20;
  protected readonly page = signal(1);
  protected readonly period = signal<Period>({ from: this.locale.monthStartYmd(), to: this.locale.todayYmd() });
  protected readonly tipo = signal('');
  protected readonly metodo = signal('');
  protected readonly tipoOptions = [
    { value: '', label: 'Todos' },
    { value: 'VENTA', label: 'Cobros de ventas' },
    { value: 'COBRO_CLIENTE', label: 'Cobros a clientes' },
    { value: 'PAGO_PROVEEDOR', label: 'Pagos a proveedores' },
  ];
  protected readonly metodoOptions = [{ value: '', label: 'Todos los medios' }, ...DEBT_PAYMENT_METHODS];
  protected readonly typeLabel = paymentTypeLabel;
  protected readonly typeTone = paymentTypeTone;
  protected readonly sign = paymentTypeSign;
  protected readonly methodLabel = financeMethodLabel;

  protected readonly query = injectQuery(() => ({
    queryKey: ['recent-payments', this.page(), this.period().from, this.period().to, this.tipo(), this.metodo()] as const,
    queryFn: () =>
      firstValueFrom(
        this.api.listRecentPayments({
          page: this.page(),
          pageSize: this.pageSize,
          from: this.period().from,
          to: this.period().to,
          tipo: this.tipo() || undefined,
          metodo: this.metodo() || undefined,
        }),
      ),
  }));
  protected readonly rows = computed(() => this.query.data()?.items ?? []);
  protected readonly total = computed(() => this.query.data()?.total ?? 0);
  protected readonly kpis = computed(() => {
    const t = this.query.data()?.totales;
    if (!t) return null;
    return {
      ventas: soles(t.cobrosVentas),
      cobros: soles(t.cobrosClientes),
      pagos: soles(t.pagosProveedores),
      neto: soles(t.neto),
      netoNegativo: Number(t.neto) < 0,
    };
  });
}
