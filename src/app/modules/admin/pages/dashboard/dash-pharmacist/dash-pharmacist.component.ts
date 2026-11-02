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
  selector: 'app-dash-pharmacist',
  standalone: true,
  imports: [
    CommonModule,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    KpiTileComponent,
    PageStateComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Dashboard' }, { label: 'Farmacéutico' }]" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-lg font-semibold">Panel farmacéutico</h1>
    </app-page-toolbar>
    <app-page-state [loading]="query.isPending()" [error]="error()" skeleton="kpi-grid" [skeletonCount]="3" (retry)="query.refetch()">
      @if (query.data(); as d) {
        <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <app-kpi-tile label="Recetas pendientes" icon="lucide:file-text" [value]="'' + d.recetasPendientes" sub="activas o parciales" link="/recetas" />
          <app-kpi-tile label="Anulaciones pendientes" icon="lucide:ban" tone="warning" [value]="'' + d.anulacionesPendientes" sub="por revisar" link="/anulaciones" />
          <app-kpi-tile label="Controlados activos" icon="lucide:shield-alert" tone="error" [value]="'' + d.productosControladosActivos" sub="psicotrópicos / estupefacientes" link="/reporte-psicotropicos-estupefacientes" />
        </div>
      }
    </app-page-state>
  `,
})
export class DashPharmacistComponent {
  private readonly api = inject(DirectoryApiService);

  protected readonly query = injectQuery(() => ({
    queryKey: ['dashboard', 'pharmacist'] as const,
    queryFn: () => firstValueFrom(this.api.getPharmacistDashboard()),
  }));

  protected error() {
    const err = this.query.error();
    return err ? httpErrorMessage(err, 'No se pudo cargar el panel') : null;
  }
}
