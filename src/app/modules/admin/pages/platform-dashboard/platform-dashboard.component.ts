import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { LocaleService } from '../../../../core/services/locale.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import { DirectoryApiService } from '../../services/directory-api.service';

@Component({
  selector: 'app-platform-dashboard',
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
    <app-breadcrumb-inline [segments]="[{ label: 'Plataforma' }, { label: 'Dashboard' }]" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-title-sm font-semibold">Dashboard plataforma</h1>
    </app-page-toolbar>
    <app-page-state [loading]="query.isPending()" [error]="error()" (retry)="query.refetch()">
      @if (query.data(); as d) {
        <div class="mt-4 grid gap-4 md:grid-cols-4">
          <a routerLink="/platform/clientes" [queryParams]="{ status: 'ACTIVE' }" class="block transition hover:opacity-90">
            <app-component-card title="Clientes activos">
              <p class="text-2xl font-semibold text-emerald-600">{{ d.tenants.active }}</p>
            </app-component-card>
          </a>
          <a routerLink="/platform/clientes" [queryParams]="{ status: 'TRIAL' }" class="block transition hover:opacity-90">
            <app-component-card title="En prueba">
              <p class="text-2xl font-semibold">{{ d.tenants.trial }}</p>
            </app-component-card>
          </a>
          <a routerLink="/platform/clientes" [queryParams]="{ status: 'PENDING' }" class="block transition hover:opacity-90">
            <app-component-card title="Pendientes">
              <p class="text-2xl font-semibold text-amber-600">{{ d.tenants.pending }}</p>
            </app-component-card>
          </a>
          <a routerLink="/platform/clientes" [queryParams]="{ status: 'SUSPENDED' }" class="block transition hover:opacity-90">
            <app-component-card title="Suspendidos">
              <p class="text-2xl font-semibold text-red-600">{{ d.tenants.suspended }}</p>
            </app-component-card>
          </a>
        </div>

        <div class="mt-4 grid gap-4 md:grid-cols-3">
          <a routerLink="/platform/leads" class="block transition hover:opacity-90">
            <app-component-card title="Leads nuevos">
              <p class="text-2xl font-semibold text-amber-600">{{ d.leadsNuevos }}</p>
            </app-component-card>
          </a>
          <a routerLink="/platform/reclamaciones" class="block transition hover:opacity-90">
            <app-component-card title="Reclamaciones abiertas">
              <p class="text-2xl font-semibold">{{ d.reclamacionesAbiertas }}</p>
              <p class="text-sm text-gray-500">{{ d.reclamaciones7d }} nuevas (7d)</p>
            </app-component-card>
          </a>
          <app-component-card title="Activados (30 días)">
            <p class="text-2xl font-semibold">{{ d.tenantsActivados30d }}</p>
          </app-component-card>
        </div>

        <div class="mt-4 grid gap-4 md:grid-cols-2">
          <app-component-card title="Sucursales activas (todas)">
            <p class="text-2xl font-semibold">{{ d.establecimientosActivos }}</p>
          </app-component-card>
          <app-component-card title="Usuarios de clientes">
            <p class="text-2xl font-semibold">{{ d.usuariosCliente }}</p>
          </app-component-card>
        </div>

        <div class="mt-8 mb-4">
          <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90">Clientes recientes</h2>
        </div>
        <app-component-card className="overflow-hidden" [bodyClass]="'p-0 sm:p-0'">
          <div class="overflow-x-auto">
            <table class="min-w-full text-left">
              <thead class="border-b border-gray-100 dark:border-white/[0.05]">
                <tr>
                  <th class="px-5 py-3 text-theme-xs font-medium text-gray-500">Cliente</th>
                  <th class="px-5 py-3 text-theme-xs font-medium text-gray-500">Plan</th>
                  <th class="px-5 py-3 text-theme-xs font-medium text-gray-500">Estado</th>
                  <th class="px-5 py-3 text-theme-xs font-medium text-gray-500">Alta</th>
                </tr>
              </thead>
              <tbody>
                @for (row of d.recentTenants; track row.id) {
                  <tr class="border-b border-gray-50 dark:border-white/[0.03]">
                    <td class="px-5 py-3 text-theme-sm font-medium text-gray-800 dark:text-white">
                      {{ row.nombre }}
                      <span class="block text-theme-xs text-gray-400">{{ row.slug }}</span>
                    </td>
                    <td class="px-5 py-3 text-theme-sm text-gray-600">{{ row.plan }}</td>
                    <td class="px-5 py-3 text-theme-sm text-gray-600">{{ row.status }}</td>
                    <td class="px-5 py-3 text-theme-sm text-gray-600">
                      {{ locale.formatDate(row.createdAt) }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </app-component-card>
      }
    </app-page-state>
  `,
})
export class PlatformDashboardComponent {
  private readonly api = inject(DirectoryApiService);
  protected readonly locale = inject(LocaleService);

  protected readonly query = injectQuery(() => ({
    queryKey: ['dashboard', 'platform'] as const,
    queryFn: () => firstValueFrom(this.api.getPlatformDashboard()),
  }));

  protected error() {
    const err = this.query.error();
    return err ? httpErrorMessage(err, 'No se pudo cargar el dashboard de plataforma') : null;
  }
}
