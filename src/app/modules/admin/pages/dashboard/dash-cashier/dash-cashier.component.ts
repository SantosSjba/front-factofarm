import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../../core/http/http-error-message';
import { BreadcrumbInlineComponent } from '../../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { ButtonComponent } from '../../../../../shared/components/ui/button/button.component';
import { PageStateComponent } from '../../../../../shared/components/common/page-state/page-state.component';
import { DirectoryApiService } from '../../../services/directory-api.service';

@Component({
  selector: 'app-dash-cashier',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    RouterLink,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    ButtonComponent,
    PageStateComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Dashboard' }, { label: 'Cajero' }]" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-title-sm font-semibold">Panel cajero</h1>
      <a routerLink="/punto-venta"><app-button variant="primary">Ir al POS</app-button></a>
    </app-page-toolbar>
    <app-page-state [loading]="query.isPending()" [error]="error()" (retry)="query.refetch()">
      @if (query.data(); as d) {
        <div class="mt-4 grid gap-4 md:grid-cols-2">
          <app-component-card title="Mis ventas hoy">
            <p class="text-2xl font-semibold">{{ d.ventasHoy | currency: 'PEN' }}</p>
            <p class="text-sm text-gray-500">{{ d.ventasHoyCount }} ventas</p>
          </app-component-card>
          <app-component-card title="Caja">
            <p class="text-lg">{{ d.cajaAbierta ? 'Sesión abierta' : 'Sin caja abierta' }}</p>
            @if (d.sesionCaja; as s) {
              <p class="text-sm text-gray-500">Apertura: {{ s.montoApertura | currency: 'PEN' }}</p>
            }
          </app-component-card>
        </div>
      }
    </app-page-state>
  `,
})
export class DashCashierComponent {
  private readonly api = inject(DirectoryApiService);

  protected readonly query = injectQuery(() => ({
    queryKey: ['dashboard', 'cashier'] as const,
    queryFn: () => firstValueFrom(this.api.getCashierDashboard()),
  }));

  protected error() {
    const err = this.query.error();
    return err ? httpErrorMessage(err, 'No se pudo cargar el panel') : null;
  }
}
