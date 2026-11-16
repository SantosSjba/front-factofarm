import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { LocaleService } from '../../../../core/services/locale.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { PeriodFilterComponent, type Period } from '../../components/period-filter/period-filter.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import { soles } from '../../utils/finance-labels';
import type { SummaryChip } from '../../../../shared/components/ui/summary-chips/summary-chips.component';

/** Flujo de caja: lo que entró y salió de dinero en el periodo. */
@Component({
  selector: 'app-finanzas-movimientos',
  standalone: true,
  imports: [
    RouterLink,
    BreadcrumbInlineComponent,
    ComponentCardComponent,
    HelpPanelComponent,
    PageStateComponent,
    PageToolbarComponent,
    PeriodFilterComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="breadcrumb" />
    <app-page-toolbar [excel]="false">
      <h1 data-toolbar-title class="text-lg font-semibold text-gray-800 dark:text-white/90">Flujo de caja</h1>
    </app-page-toolbar>

    <app-help-panel title="¿Para qué sirve esta pantalla?" storageKey="finanzas-movimientos">
      <ol class="list-decimal space-y-1 ps-5 text-sm text-gray-500 dark:text-gray-400">
        <li>Muestra el dinero que realmente entró (ventas cobradas y cobros a clientes) y el que salió (pagos a proveedores y devoluciones) en el periodo.</li>
        <li>Las ventas al crédito no cuentan hasta que se cobran; las compras sin pagar tampoco salen hasta que se pagan.</li>
        <li>El detalle de cada pago está en <a routerLink="/pagos" class="text-brand-600 underline dark:text-brand-400">Pagos y cobros</a>.</li>
      </ol>
    </app-help-panel>

    <app-period-filter compact [value]="period()" [summaryChips]="summaryChips()" (periodChange)="period.set($event)" />

    <app-page-state [loading]="query.isPending()" [error]="error()" (retry)="query.refetch()">
      @if (view(); as v) {
        <div class="grid gap-x-4 lg:grid-cols-2">
          <app-component-card compact icon="mdi:arrow-down-bold-circle-outline" title="Entradas de dinero">
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Ventas cobradas ({{ v.ventasCount }})</dt><dd class="tabular-nums">{{ v.ventas }}</dd></div>
              <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Cobros a clientes ({{ v.cobrosCount }})</dt><dd class="tabular-nums">{{ v.cobros }}</dd></div>
              <div class="flex justify-between border-t border-gray-200 pt-2 font-semibold text-gray-800 dark:border-gray-700 dark:text-white/90"><dt>Total</dt><dd class="tabular-nums">{{ v.entro }}</dd></div>
            </dl>
          </app-component-card>
          <app-component-card compact icon="mdi:arrow-up-bold-circle-outline" title="Salidas de dinero">
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Pagos a proveedores ({{ v.pagosCount }})</dt><dd class="tabular-nums">{{ v.pagos }}</dd></div>
              <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Devoluciones a clientes</dt><dd class="tabular-nums">{{ v.devoluciones }}</dd></div>
              <div class="flex justify-between border-t border-gray-200 pt-2 font-semibold text-gray-800 dark:border-gray-700 dark:text-white/90"><dt>Total</dt><dd class="tabular-nums">{{ v.salio }}</dd></div>
            </dl>
            <p class="mt-3 text-xs text-gray-500 dark:text-gray-400">Ingresos y egresos manuales de caja en el periodo: {{ v.caja }} ({{ v.cajaCount }} movimientos).</p>
          </app-component-card>
        </div>
      }
    </app-page-state>
  `,
})
export class FinanzasMovimientosComponent {
  /** Totales del periodo en chips; «Compras» es informativo (pagadas o no). */
  protected readonly summaryChips = computed<SummaryChip[]>(() => {
    const v = this.view();
    if (!v) return [];
    return [
      { id: 'in', label: 'Entró', count: v.entro, tone: 'success', clickable: false, tooltip: 'Ventas cobradas y cobros a clientes.' },
      { id: 'out', label: 'Salió', count: v.salio, tone: 'error', clickable: false, tooltip: 'Pagos a proveedores y devoluciones.' },
      { id: 'neto', label: 'Flujo neto', count: v.neto, tone: v.netoNegativo ? 'warning' : 'brand', clickable: false },
      { id: 'compras', label: 'Compras del periodo', count: v.compras, icon: 'mdi:cart-outline', clickable: false, tooltip: v.comprasCount + ' compra(s), pagadas o no. Es informativo.' },
    ];
  });

  private readonly locale = inject(LocaleService);
  private readonly api = inject(DirectoryApiService);

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Finanzas' }, { label: 'Flujo de caja' }];
  protected readonly period = signal<Period>({ from: this.locale.monthStartYmd(), to: this.locale.todayYmd() });

  protected readonly query = injectQuery(() => ({
    queryKey: ['cash-flow', this.period().from, this.period().to] as const,
    queryFn: () => firstValueFrom(this.api.getCashFlow(this.period().from, this.period().to)),
  }));
  protected readonly error = computed(() => (this.query.isError() ? httpErrorMessage(this.query.error(), 'No se pudo cargar el flujo de caja') : null));

  protected readonly view = computed(() => {
    const r = this.query.data();
    if (!r) return null;
    const entro = Number(r.ingresos.ventas) + Number(r.ingresos.cobrosClientes);
    const salio = Number(r.egresos.pagosProveedores) + Number(r.egresos.devoluciones);
    return {
      entro: soles(entro),
      salio: soles(salio),
      neto: soles(r.flujoNeto),
      netoNegativo: Number(r.flujoNeto) < 0,
      ventas: soles(r.ingresos.ventas),
      ventasCount: r.ingresos.ventasCount,
      cobros: soles(r.ingresos.cobrosClientes),
      cobrosCount: r.ingresos.cobrosCount,
      pagos: soles(r.egresos.pagosProveedores),
      pagosCount: r.egresos.pagosProveedoresCount,
      devoluciones: soles(r.egresos.devoluciones),
      compras: soles(r.egresos.compras),
      comprasCount: r.egresos.comprasCount,
      caja: soles(r.caja.movimientosTotal),
      cajaCount: r.caja.movimientosCount,
    };
  });
}
