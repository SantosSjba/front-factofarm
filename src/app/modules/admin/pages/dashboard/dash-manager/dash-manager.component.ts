import { CommonModule, CurrencyPipe } from '@angular/common';
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
  selector: 'app-dash-manager',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    PageStateComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Dashboard' }, { label: 'Gerente' }]" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-title-sm font-semibold">Panel gerente</h1>
    </app-page-toolbar>
    <app-page-state [loading]="query.isPending()" [error]="error()" (retry)="query.refetch()">
      @if (query.data(); as d) {
        <div class="mt-4 grid gap-4 md:grid-cols-3">
          <app-component-card title="Ventas hoy">
            <p class="text-2xl font-semibold">{{ d.ventasHoy | currency: 'PEN' }}</p>
            <p class="text-sm text-gray-500">{{ d.ventasHoyCount }} tickets</p>
          </app-component-card>
          <app-component-card title="Ventas 7 días">
            <p class="text-2xl font-semibold">{{ d.ventasSemana | currency: 'PEN' }}</p>
          </app-component-card>
          <app-component-card title="Anulaciones pendientes">
            <p class="text-2xl font-semibold text-amber-600">{{ d.anulacionesPendientes }}</p>
          </app-component-card>
        </div>
        <div class="mt-4 grid gap-4 md:grid-cols-2">
          <app-component-card title="Cajas abiertas">{{ d.cajasAbiertas }}</app-component-card>
          <app-component-card title="Personal presente">{{ d.personalPresente }}</app-component-card>
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
