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
  selector: 'app-dash-manager',
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
    <app-breadcrumb-inline [segments]="[{ label: 'Dashboard' }, { label: 'Gerente' }]" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-lg font-semibold">Panel gerente</h1>
    </app-page-toolbar>
    <app-page-state [loading]="query.isPending()" [error]="error()" skeleton="kpi-grid" [skeletonCount]="5" (retry)="query.refetch()">
      @if (query.data(); as d) {
        <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          <app-kpi-tile label="Ventas hoy" icon="lucide:shopping-cart" [value]="(d.ventasHoy | currency: 'PEN') ?? ''" [sub]="d.ventasHoyCount + ' tickets'" />
          <app-kpi-tile label="Ventas 7 días" icon="lucide:trending-up" [value]="(d.ventasSemana | currency: 'PEN') ?? ''" [sub]="d.ventasSemanaCount + ' tickets'" />
          <app-kpi-tile label="Anulaciones pendientes" icon="lucide:ban" tone="warning" [value]="'' + d.anulacionesPendientes" sub="por aprobar" link="/anulaciones" />
          <app-kpi-tile label="Cajas abiertas" icon="lucide:wallet" tone="info" [value]="'' + d.cajasAbiertas" sub="en la sucursal" link="/historial-cajas" />
          <app-kpi-tile label="Personal presente" icon="lucide:users" tone="success" [value]="'' + d.personalPresente" sub="con asistencia hoy" link="/gestion-personal" />
        </div>
      }
    </app-page-state>
  `,
})
export class DashManagerComponent {
  private readonly api = inject(DirectoryApiService);

  protected readonly query = injectQuery(() => ({
    queryKey: ['dashboard', 'manager'] as const,
    queryFn: () => firstValueFrom(this.api.getManagerDashboard()),
  }));

  protected error() {
    const err = this.query.error();
    return err ? httpErrorMessage(err, 'No se pudo cargar el panel') : null;
  }
}
