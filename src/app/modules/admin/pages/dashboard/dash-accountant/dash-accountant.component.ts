import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../../core/http/http-error-message';
import { BreadcrumbInlineComponent } from '../../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { KpiTileComponent } from '../../../../../shared/components/common/dashboard/kpi-tile.component';
import { PageToolbarComponent } from '../../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PageStateComponent } from '../../../../../shared/components/common/page-state/page-state.component';
import { DirectoryApiService } from '../../../services/directory-api.service';

@Component({
  selector: 'app-dash-accountant',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    KpiTileComponent,
    PageStateComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Dashboard' }, { label: 'Contabilidad' }]" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-lg font-semibold">Panel contabilidad</h1>
    </app-page-toolbar>
    <app-page-state [loading]="query.isPending()" [error]="error()" skeleton="kpi-grid" [skeletonCount]="6" (retry)="query.refetch()">
      @if (query.data(); as d) {
        <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <app-kpi-tile label="CPE por enviar" icon="lucide:send" tone="warning" [value]="'' + d.cpePendientes" sub="pendientes / enviando" link="/comprobante-electronico" />
          <app-kpi-tile label="CPE observados" icon="lucide:eye" tone="warning" [value]="'' + d.cpeObservados" sub="revisar con SUNAT" link="/comprobante-electronico" />
          <app-kpi-tile label="CPE rechazados" icon="lucide:x-circle" tone="error" [value]="'' + d.cpeRechazados" sub="corregir y reemitir" link="/comprobante-electronico" />
          <app-kpi-tile label="Envíos fallidos" icon="lucide:alert-triangle" tone="error" [value]="'' + d.jobsFallidos" [sub]="d.jobsPendientes + ' en cola'" />
          <app-kpi-tile label="Por pagar" icon="lucide:landmark" tone="gray" [value]="(d.cxpSaldo | currency: 'PEN') ?? ''" [sub]="d.cxpAbiertas + ' abiertas · ' + d.cxpVencidas + ' vencidas'" link="/cuentas-pagar" />
          <app-kpi-tile label="Por cobrar" icon="lucide:hand-coins" [value]="(d.cxcSaldo | currency: 'PEN') ?? ''" [sub]="d.cxcAbiertas + ' abiertas · ' + d.cxcVencidas + ' vencidas'" link="/cuentas-cobrar" />
        </div>
      }
    </app-page-state>
  `,
})
export class DashAccountantComponent {
  private readonly api = inject(DirectoryApiService);

  protected readonly query = injectQuery(() => ({
    queryKey: ['dashboard', 'accountant'] as const,
    queryFn: () => firstValueFrom(this.api.getAccountantDashboard()),
  }));

  protected error() {
    const err = this.query.error();
    return err ? httpErrorMessage(err, 'No se pudo cargar el panel contable') : null;
  }
}
