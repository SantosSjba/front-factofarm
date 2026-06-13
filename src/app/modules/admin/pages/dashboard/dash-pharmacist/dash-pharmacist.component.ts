import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../../core/http/http-error-message';
import { BreadcrumbInlineComponent } from '../../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../../shared/components/common/component-card/component-card.component';
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
    ComponentCardComponent,
    PageStateComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Dashboard' }, { label: 'Farmacéutico' }]" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-title-sm font-semibold">Panel farmacéutico</h1>
    </app-page-toolbar>
    <app-page-state [loading]="query.isPending()" [error]="error()" (retry)="query.refetch()">
      @if (query.data(); as d) {
        <div class="mt-4 grid gap-4 md:grid-cols-3">
          <app-component-card title="Recetas pendientes">
            <p class="text-2xl font-semibold">{{ d.recetasPendientes }}</p>
          </app-component-card>
          <app-component-card title="Anulaciones pendientes">
            <p class="text-2xl font-semibold text-amber-600">{{ d.anulacionesPendientes }}</p>
          </app-component-card>
          <app-component-card title="Controlados activos">
            <p class="text-2xl font-semibold">{{ d.productosControladosActivos }}</p>
          </app-component-card>
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
