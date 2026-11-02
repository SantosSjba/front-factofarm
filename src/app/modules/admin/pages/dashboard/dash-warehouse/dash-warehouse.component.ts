import { CommonModule } from '@angular/common';
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
  selector: 'app-dash-warehouse',
  standalone: true,
  imports: [
    CommonModule,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    KpiTileComponent,
    PageStateComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Dashboard' }, { label: 'Almacén' }]" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-lg font-semibold">Panel almacén</h1>
    </app-page-toolbar>
    <app-page-state [loading]="query.isPending()" [error]="error()" skeleton="kpi-grid" [skeletonCount]="8" (retry)="query.refetch()">
      @if (query.data(); as d) {
        <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          <app-kpi-tile label="Stock bajo mínimo" icon="lucide:trending-down" tone="warning" [value]="'' + d.stockBajo" sub="productos" link="/productos" />
          <app-kpi-tile label="Lotes vencidos" icon="lucide:calendar-x" tone="error" [value]="'' + d.lotesVencidos" sub="con stock" link="/lotes" [queryParams]="{ expiry: 'expired' }" />
          <app-kpi-tile label="Vencen en 30 días" icon="lucide:calendar-clock" tone="warning" [value]="'' + d.porVencer30" sub="lotes" link="/lotes" [queryParams]="{ expiry: '30' }" />
          <app-kpi-tile label="Ajustes pendientes" icon="lucide:scale" tone="warning" [value]="'' + d.ajustesPendientes" sub="por aprobar" link="/inventario-movimientos" />
          <app-kpi-tile label="Traslados en tránsito" icon="lucide:truck" tone="info" [value]="'' + d.transferenciasEnTransito" sub="entre sedes" link="/traslados" />
          <app-kpi-tile label="OC por recibir" icon="lucide:clipboard-list" tone="info" [value]="'' + d.ordenesPendientesRecepcion" sub="órdenes de compra" link="/ordenes-compra" />
          <app-kpi-tile label="Recepciones hoy" icon="lucide:package-check" tone="success" [value]="'' + d.recepcionesHoy" sub="mercadería" link="/recepcion-mercaderia" />
          <app-kpi-tile label="Zonas frío sin registro" icon="lucide:thermometer-snowflake" tone="info" [value]="'' + d.zonasFrioSinLogHoy" sub="registrar temperatura hoy" link="/cadena-frio" />
        </div>
      }
    </app-page-state>
  `,
})
export class DashWarehouseComponent {
  private readonly api = inject(DirectoryApiService);

  protected readonly query = injectQuery(() => ({
    queryKey: ['dashboard', 'warehouse'] as const,
    queryFn: () => firstValueFrom(this.api.getWarehouseDashboard()),
  }));

  protected error() {
    const err = this.query.error();
    return err ? httpErrorMessage(err, 'No se pudo cargar el panel de almacén') : null;
  }
}
