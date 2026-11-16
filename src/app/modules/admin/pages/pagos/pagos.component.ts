import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { LocaleService } from '../../../../core/services/locale.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
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
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import type { SummaryChip } from '../../../../shared/components/ui/summary-chips/summary-chips.component';

/** Pagos y cobros: cada movimiento de dinero (ventas, cobros a clientes y pagos a proveedores). */
@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [
    PageStateComponent,
    CurrencyPipe,
    AppDatePipe,
    QueryPageStatePipe,
    BreadcrumbInlineComponent,
    FormSelectComponent,
    HelpPanelComponent,
    PageToolbarComponent,
    PaginationComponent,
    PeriodFilterComponent,
    StatusBadgeComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="breadcrumb" />
    <app-page-toolbar [excel]="false">
      <h1 data-toolbar-title class="text-lg font-semibold text-gray-800 dark:text-white/90">Pagos y cobros</h1>
    </app-page-toolbar>

    <app-help-panel title="¿Para qué sirve esta pantalla?" storageKey="pagos">
      <ol class="list-decimal space-y-1 ps-5 text-sm text-gray-500 dark:text-gray-400">
        <li>Lista cada pago: lo cobrado en ventas, los cobros a clientes con deuda y los pagos a proveedores, del más reciente al más antiguo.</li>
        <li>Filtra por tipo o medio de pago para cuadrar, por ejemplo, todos los Yape del mes. Los totales suman todo lo filtrado.</li>
      </ol>
    </app-help-panel>

    <app-period-filter compact [value]="period()" [summaryChips]="summaryChips()" summaryLabel="Totales del periodo" (summaryChipClick)="onSummaryChip($event)" (change)="period.set($event); page.set(1)">
      <div class="mt-2.5 grid gap-2 border-t border-gray-100 pt-2.5 sm:grid-cols-2 lg:grid-cols-4 dark:border-gray-800">
        <app-form-select compact label="Tipo" [showPlaceholder]="false" [options]="tipoOptions" [value]="tipo()" (valueChange)="tipo.set($event); page.set(1)" />
        <app-form-select compact label="Medio de pago" [showPlaceholder]="false" [options]="metodoOptions" [value]="metodo()" (valueChange)="metodo.set($event); page.set(1)" />
      </div>
    </app-period-filter>


    @let state = query | queryPageState: total();
    <!-- Tabla directa (sin tarjeta): el título ya está en la barra de la página. -->
    <app-page-state
      [loading]="state.loading"
      [error]="state.error"
      [empty]="state.empty"
      emptyTitle="Sin pagos en el periodo"
      emptyHint="Prueba con otras fechas o filtros."
      (retry)="query.refetch()"
      skeleton="table"
    >
      <div class="ff-table-frame overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="max-w-full overflow-x-auto">
          <table class="min-w-full text-start text-gray-700 dark:text-gray-300">
            <caption class="sr-only">Pagos y cobros del periodo</caption>
            <thead class="border-b border-gray-100 dark:border-white/[0.05]">
              <tr>
                <th class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Fecha</th>
                <th class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Tipo</th>
                <th data-card-role="title" class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Detalle</th>
                <th class="px-5 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400">Monto</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-white/[0.05]">
              @for (row of rows(); track row.tipo + row.id) {
                <tr>
                  <td class="px-5 py-3 text-theme-sm whitespace-nowrap">{{ row.fecha | appDate: 'dd/MM/yyyy HH:mm' }}</td>
                  <td class="px-5 py-3 text-theme-sm">
                    <app-status-badge [status]="row.tipo" [tone]="typeTone(row.tipo)" [label]="typeLabel(row.tipo)" />
                    <span class="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">{{ methodLabel(row.metodo) }}</span>
                  </td>
                  <td class="px-5 py-3 text-theme-sm">
                    <span class="block text-gray-800 dark:text-white/90">{{ row.descripcion }}</span>
                    <span class="text-theme-xs text-gray-500 dark:text-gray-400">{{ row.contraparte ?? '' }}{{ row.referencia ? (row.contraparte ? ' · ' : '') + 'Op. ' + row.referencia : '' }}</span>
                  </td>
                  <td class="px-5 py-3 text-end text-theme-sm font-medium tabular-nums" [class]="sign(row.tipo) < 0 ? 'text-error-600 dark:text-error-400' : 'text-success-600 dark:text-success-400'">
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
    </app-page-state>
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
  /** Totales del periodo; los de tipo filtran la lista al pulsarlos. */
  protected readonly summaryChips = computed<SummaryChip[]>(() => {
    const t = this.query.data()?.totales;
    if (!t) return [];
    const tipo = this.tipo();
    return [
      { id: 'VENTA', label: 'Cobrado en ventas', count: soles(t.cobrosVentas), icon: 'mdi:cart-check', tone: 'success', active: tipo === 'VENTA' },
      { id: 'COBRO_CLIENTE', label: 'Cobros a clientes', count: soles(t.cobrosClientes), tone: 'info', active: tipo === 'COBRO_CLIENTE' },
      { id: 'PAGO_PROVEEDOR', label: 'Pagos a proveedores', count: soles(t.pagosProveedores), tone: 'warning', active: tipo === 'PAGO_PROVEEDOR' },
      { id: 'neto', label: 'Neto', count: soles(t.neto), tone: Number(t.neto) < 0 ? 'error' : 'brand', clickable: false, tooltip: 'Lo cobrado menos lo pagado.' },
    ];
  });

  protected onSummaryChip(chip: SummaryChip) {
    this.tipo.set(this.tipo() === chip.id ? '' : chip.id);
    this.page.set(1);
  }
}
