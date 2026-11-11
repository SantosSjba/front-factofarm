import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { LocaleService } from '../../../../core/services/locale.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { KpiTileComponent } from '../../../../shared/components/common/dashboard/kpi-tile.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { PeriodFilterComponent, type Period } from '../../components/period-filter/period-filter.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import { soles } from '../../utils/finance-labels';

/** Flujo de caja: lo que entró y salió de dinero en el periodo. */
@Component({
  selector: 'app-finanzas-movimientos',
  standalone: true,
  imports: [RouterLink, BreadcrumbInlineComponent, ComponentCardComponent, HelpPanelComponent, KpiTileComponent, PageStateComponent, PageToolbarComponent, PeriodFilterComponent],
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

    <app-period-filter [value]="period()" (change)="period.set($event)" />

    <app-page-state [loading]="query.isPending()" [error]="error()" (retry)="query.refetch()">
      @if (view(); as v) {
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <app-kpi-tile label="Entró" [value]="v.entro" icon="mdi:arrow-down-bold-circle-outline" tone="success" sub="Ventas cobradas + cobros" />
          <app-kpi-tile label="Salió" [value]="v.salio" icon="mdi:arrow-up-bold-circle-outline" tone="error" sub="Pagos + devoluciones" />
          <app-kpi-tile label="Flujo neto" [value]="v.neto" icon="mdi:scale-balance" [tone]="v.netoNegativo ? 'warning' : 'brand'" sub="Entró − salió" />
          <app-kpi-tile label="Compras del periodo" [value]="v.compras" icon="mdi:cart-outline" tone="gray" [sub]="v.comprasCount + ' compra(s) · pagadas o no'" hint="Informativo: lo comprado en el periodo, se haya pagado o no." />
        </div>

        <div class="mt-4 grid gap-4 lg:grid-cols-2">
          <app-component-card title="Entradas de dinero">
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Ventas cobradas ({{ v.ventasCount }})</dt><dd class="tabular-nums">{{ v.ventas }}</dd></div>
              <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Cobros a clientes ({{ v.cobrosCount }})</dt><dd class="tabular-nums">{{ v.cobros }}</dd></div>
              <div class="flex justify-between border-t border-gray-200 pt-2 font-semibold text-gray-800 dark:border-gray-700 dark:text-white/90"><dt>Total</dt><dd class="tabular-nums">{{ v.entro }}</dd></div>
            </dl>
          </app-component-card>
          <app-component-card title="Salidas de dinero">
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
