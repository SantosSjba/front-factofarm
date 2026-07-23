import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../../core/http/http-error-message';
import { BreadcrumbInlineComponent } from '../../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PageStateComponent } from '../../../../../shared/components/common/page-state/page-state.component';
import { DirectoryApiService } from '../../../services/directory-api.service';

@Component({
  selector: 'app-dash-warehouse',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    PageStateComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Dashboard' }, { label: 'Almacén' }]" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-title-sm font-semibold">Panel almacén</h1>
    </app-page-toolbar>
    <app-page-state [loading]="query.isPending()" [error]="error()" (retry)="query.refetch()">
      @if (query.data(); as d) {
        <div class="mt-4 grid gap-4 md:grid-cols-3">
          <a routerLink="/productos" class="block transition hover:opacity-90">
            <app-component-card title="Stock bajo mínimo">
              <p class="text-2xl font-semibold text-amber-600">{{ d.stockBajo }}</p>
            </app-component-card>
          </a>
          <a routerLink="/lotes" [queryParams]="{ expiry: 'expired' }" class="block transition hover:opacity-90">
            <app-component-card title="Lotes vencidos">
              <p class="text-2xl font-semibold text-red-600">{{ d.lotesVencidos }}</p>
            </app-component-card>
          </a>
          <a routerLink="/lotes" [queryParams]="{ expiry: '30' }" class="block transition hover:opacity-90">
            <app-component-card title="Por vencer (30 días)">
              <p class="text-2xl font-semibold">{{ d.porVencer30 }}</p>
            </app-component-card>
          </a>
        </div>
        <div class="mt-4 grid gap-4 md:grid-cols-3">
          <a routerLink="/inventario-movimientos" class="block transition hover:opacity-90">
            <app-component-card title="Ajustes pendientes">
              <p class="text-2xl font-semibold text-amber-600">{{ d.ajustesPendientes }}</p>
            </app-component-card>
          </a>
          <a routerLink="/traslados" class="block transition hover:opacity-90">
            <app-component-card title="Traslados en tránsito">
              <p class="text-2xl font-semibold">{{ d.transferenciasEnTransito }}</p>
            </app-component-card>
          </a>
          <a routerLink="/ordenes-compra" class="block transition hover:opacity-90">
            <app-component-card title="OC por recibir">
              <p class="text-2xl font-semibold">{{ d.ordenesPendientesRecepcion }}</p>
            </app-component-card>
          </a>
        </div>
        <div class="mt-4 grid gap-4 md:grid-cols-2">
          <a routerLink="/recepcion-mercaderia" class="block transition hover:opacity-90">
            <app-component-card title="Recepciones hoy">
              <p class="text-2xl font-semibold">{{ d.recepcionesHoy }}</p>
            </app-component-card>
          </a>
          <a routerLink="/cadena-frio" class="block transition hover:opacity-90">
            <app-component-card title="Zonas frío sin log hoy">
              <p class="text-2xl font-semibold text-blue-600">{{ d.zonasFrioSinLogHoy }}</p>
            </app-component-card>
          </a>
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
