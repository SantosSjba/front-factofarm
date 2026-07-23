import { CommonModule, CurrencyPipe } from '@angular/common';
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
  selector: 'app-dash-accountant',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    RouterLink,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    PageStateComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Dashboard' }, { label: 'Contabilidad' }]" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-title-sm font-semibold">Panel contabilidad</h1>
    </app-page-toolbar>
    <app-page-state [loading]="query.isPending()" [error]="error()" (retry)="query.refetch()">
      @if (query.data(); as d) {
        <div class="mt-4 grid gap-4 md:grid-cols-3">
          <app-component-card title="CPE pendientes / enviando">
            <p class="text-2xl font-semibold text-amber-600">{{ d.cpePendientes }}</p>
          </app-component-card>
          <app-component-card title="CPE observados">
            <p class="text-2xl font-semibold">{{ d.cpeObservados }}</p>
          </app-component-card>
          <app-component-card title="CPE rechazados">
            <p class="text-2xl font-semibold text-red-600">{{ d.cpeRechazados }}</p>
          </app-component-card>
        </div>
        <div class="mt-4 grid gap-4 md:grid-cols-2">
          <app-component-card title="Jobs facturación fallidos">
            <p class="text-2xl font-semibold text-red-600">{{ d.jobsFallidos }}</p>
          </app-component-card>
          <app-component-card title="Jobs en cola">
            <p class="text-2xl font-semibold">{{ d.jobsPendientes }}</p>
          </app-component-card>
        </div>
        <div class="mt-4 grid gap-4 md:grid-cols-2">
          <a routerLink="/cuentas-pagar" class="block transition hover:opacity-90">
            <app-component-card title="Cuentas por pagar">
              <p class="text-2xl font-semibold">{{ d.cxpSaldo | currency: 'PEN' }}</p>
              <p class="text-sm text-gray-500">
                {{ d.cxpAbiertas }} abiertas · {{ d.cxpVencidas }} vencidas
              </p>
            </app-component-card>
          </a>
          <a routerLink="/cuentas-cobrar" class="block transition hover:opacity-90">
            <app-component-card title="Cuentas por cobrar">
              <p class="text-2xl font-semibold">{{ d.cxcSaldo | currency: 'PEN' }}</p>
              <p class="text-sm text-gray-500">
                {{ d.cxcAbiertas }} abiertas · {{ d.cxcVencidas }} vencidas
              </p>
            </app-component-card>
          </a>
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
