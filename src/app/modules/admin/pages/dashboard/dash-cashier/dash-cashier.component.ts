import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../../core/http/http-error-message';
import { BreadcrumbInlineComponent } from '../../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { KpiTileComponent } from '../../../../../shared/components/common/dashboard/kpi-tile.component';
import { DashPanelComponent } from '../../../../../shared/components/common/dashboard/dash-panel.component';
import { BarListComponent, type BarListRow } from '../../../../../shared/components/common/dashboard/bar-list.component';
import type { DashboardBreakdownDto } from '../../../models/directory.models';
import { PageToolbarComponent } from '../../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { ButtonComponent } from '../../../../../shared/components/ui/button/button.component';
import { PageStateComponent } from '../../../../../shared/components/common/page-state/page-state.component';
import { DirectoryApiService } from '../../../services/directory-api.service';
import { LocaleService } from '../../../../../core/services/locale.service';

@Component({
  selector: 'app-dash-cashier',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    RouterLink,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    KpiTileComponent,
    DashPanelComponent,
    BarListComponent,
    ButtonComponent,
    PageStateComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Dashboard' }, { label: 'Cajero' }]" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-lg font-semibold">Panel cajero</h1>
      <div data-toolbar-actions class="flex flex-wrap gap-2">
        <a routerLink="/caja-chica-pos"><app-button size="sm" startIconName="mdi:cash-register" variant="outline">Ir a caja</app-button></a>
        <a routerLink="/punto-venta"><app-button size="sm" startIconName="mdi:point-of-sale" variant="primary">Ir al POS</app-button></a>
      </div>
    </app-page-toolbar>
    <app-page-state [loading]="query.isPending()" [error]="error()" skeleton="kpi-grid" [skeletonCount]="4" (retry)="query.refetch()">
      @if (query.data(); as d) {
        <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          <app-kpi-tile label="Mis ventas hoy" icon="lucide:shopping-cart" [value]="(d.ventasHoy | currency: 'PEN') ?? ''" [sub]="d.ventasHoyCount + (d.ventasHoyCount === 1 ? ' venta' : ' ventas')" />
          <app-kpi-tile label="Ticket promedio" icon="lucide:receipt" tone="info" [value]="(d.ticketPromedio | currency: 'PEN') ?? ''" sub="por venta hoy" />
          <app-kpi-tile
            label="Efectivo en gaveta"
            icon="lucide:wallet"
            tone="warning"
            [value]="d.sesionCaja ? ((d.sesionCaja.efectivoEsperado | currency: 'PEN') ?? '') : '—'"
            [sub]="d.sesionCaja ? d.sesionCaja.caja + ' · apertura ' + (d.sesionCaja.montoApertura | currency: 'PEN') : 'Sin caja abierta: ábrela para vender'"
            hint="Apertura + ventas en efectivo + ingresos − egresos. Compáralo con lo que cuentas al cerrar."
            link="/caja-chica-pos"
          />
          <app-kpi-tile label="Anuladas hoy" icon="lucide:ban" tone="error" [value]="'' + d.anuladasHoy" sub="ventas anuladas" link="/notas-venta" />
        </div>
        <app-dash-panel class="mt-3 block" title="Mis cobros de hoy por medio de pago" hint="Úsalo para cuadrar tu caja: el efectivo va a la gaveta; Yape, tarjeta y transferencias se revisan en su app o voucher.">
          <app-bar-list [rows]="payRows(d.pagosHoy)" ariaLabel="Mis cobros por medio de pago" emptyText="Aún no registras cobros hoy." />
        </app-dash-panel>
      }
    </app-page-state>
  `,
})
export class DashCashierComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly locale = inject(LocaleService);

  protected readonly query = injectQuery(() => ({
    queryKey: ['dashboard', 'cashier'] as const,
    queryFn: () => firstValueFrom(this.api.getCashierDashboard()),
  }));

  protected payRows(list: DashboardBreakdownDto[]): BarListRow[] {
    return list.map((r) => ({
      key: r.key,
      label: r.label,
      value: Number(r.total),
      valueText: this.locale.formatCurrency(Number(r.total)),
      sub: `${r.count} ${r.count === 1 ? 'cobro' : 'cobros'}`,
    }));
  }

  protected error() {
    const err = this.query.error();
    return err ? httpErrorMessage(err, 'No se pudo cargar el panel') : null;
  }
}
