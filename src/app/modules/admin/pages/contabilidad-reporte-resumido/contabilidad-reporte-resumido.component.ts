import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject, signal, computed } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import { LocaleService } from '../../../../core/services/locale.service';
import { PeriodFilterComponent, type Period } from '../../components/period-filter/period-filter.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';

@Component({
  selector: 'app-contabilidad-reporte-resumido',
  standalone: true,
  imports: [
    PeriodFilterComponent,
    CommonModule,
    CurrencyPipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    PageStateComponent,
    HelpPanelComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="breadcrumb" />

    <app-page-toolbar [excel]="false">
      <h1 data-toolbar-title class="text-lg font-semibold text-gray-800 dark:text-white/90">Reporte resumido</h1>
    </app-page-toolbar>

    <app-help-panel title="¿Para qué sirve esta pantalla?" storageKey="contabilidad-reporte-resumido">
      <ol class="list-decimal space-y-1 ps-5 text-sm text-gray-500 dark:text-gray-400">
        <li>Resume en una vista el dinero del periodo: lo que entró por ventas y cobros, y lo que salió por compras y pagos.</li>
        <li>Para el detalle de cada operación, usa Finanzas → Pagos y cobros.</li>
      </ol>
    </app-help-panel>

    <app-period-filter compact [value]="period()" (change)="from.set($event.from); to.set($event.to)" />

    <app-page-state [loading]="reportQuery.isPending()" [error]="reportError()" skeleton="card" (retry)="reportQuery.refetch()">
      @if (reportQuery.data(); as r) {
        <div class="grid gap-x-4 lg:grid-cols-2">
          <app-component-card compact icon="mdi:arrow-down-bold-circle-outline" title="Ingresos">
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between gap-3"><dt class="text-gray-500 dark:text-gray-400">Ventas ({{ r.ingresos.ventasCount }})</dt><dd class="tabular-nums">{{ r.ingresos.ventas | currency: 'PEN' : 'symbol' : '1.2-2' }}</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-gray-500 dark:text-gray-400">Cobros a clientes</dt><dd class="tabular-nums">{{ r.ingresos.cobrosClientes | currency: 'PEN' : 'symbol' : '1.2-2' }}</dd></div>
            </dl>
          </app-component-card>
          <app-component-card compact icon="mdi:arrow-up-bold-circle-outline" title="Egresos">
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between gap-3"><dt class="text-gray-500 dark:text-gray-400">Compras</dt><dd class="tabular-nums">{{ r.egresos.compras | currency: 'PEN' : 'symbol' : '1.2-2' }}</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-gray-500 dark:text-gray-400">Pagos a proveedores</dt><dd class="tabular-nums">{{ r.egresos.pagosProveedores | currency: 'PEN' : 'symbol' : '1.2-2' }}</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-gray-500 dark:text-gray-400">Movimientos de caja ({{ r.caja.movimientosCount }})</dt><dd class="tabular-nums">{{ r.caja.movimientosTotal | currency: 'PEN' : 'symbol' : '1.2-2' }}</dd></div>
            </dl>
          </app-component-card>
        </div>
        <app-component-card compact icon="mdi:scale-balance" title="Flujo neto" desc="Lo que entró menos lo que salió en el periodo.">
          <p class="text-2xl font-semibold tabular-nums" [class.text-brand-600]="+r.flujoNeto >= 0" [class.text-error-600]="+r.flujoNeto < 0">{{ r.flujoNeto | currency: 'PEN' : 'symbol' : '1.2-2' }}</p>
        </app-component-card>
      }
    </app-page-state>
  `,
})
export class ContabilidadReporteResumidoComponent {
  protected readonly period = computed<Period>(() => ({ from: this.from(), to: this.to() }));

  private readonly locale = inject(LocaleService);
  private readonly api = inject(DirectoryApiService);

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Contabilidad' }, { label: 'Reporte resumido' }];
  protected readonly from = signal(this.locale.monthStartYmd());
  protected readonly to = signal(this.locale.todayYmd());

  protected readonly reportQuery = injectQuery(() => ({
    queryKey: ['cash-flow', 'contabilidad', this.from(), this.to()] as const,
    queryFn: () => firstValueFrom(this.api.getCashFlow(this.from(), this.to())),
  }));

  protected reportError() {
    const err = this.reportQuery.error();
    return err ? httpErrorMessage(err, 'No se pudo cargar el reporte') : null;
  }
}
