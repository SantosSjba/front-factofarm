import { Component, computed, inject } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { LocaleService } from '../../../../core/services/locale.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import { KpiTileComponent } from '../../../../shared/components/common/dashboard/kpi-tile.component';
import { DashPanelComponent } from '../../../../shared/components/common/dashboard/dash-panel.component';
import { BarListComponent, type BarListRow } from '../../../../shared/components/common/dashboard/bar-list.component';
import { StatusBadgeComponent } from '../../../../shared/components/ui/badge/status-badge.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type { DashboardBreakdownDto } from '../../models/directory.models';
import { DashboardSalesChartComponent } from '../dashboard/dash-admin/dashboard-sales-chart.component';

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activo', TRIAL: 'Prueba', PENDING: 'Pendiente', SUSPENDED: 'Suspendido',
};

@Component({
  selector: 'app-platform-dashboard',
  standalone: true,
  imports: [
    BreadcrumbInlineComponent,
    PageStateComponent,
    KpiTileComponent,
    DashPanelComponent,
    BarListComponent,
    StatusBadgeComponent,
    DashboardSalesChartComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Plataforma' }, { label: 'Dashboard' }]" />
    <div class="mb-3">
      <h1 class="text-lg font-semibold text-gray-900 dark:text-white/90">Dashboard plataforma</h1>
      <p class="text-theme-xs text-gray-500 dark:text-gray-400">
        Actividad de las farmacias clientes · últimos 30 días
        @if (query.data(); as d) {
          <span class="hidden sm:inline"> · {{ num(d.establecimientosActivos) }} sedes · {{ num(d.usuariosCliente) }} usuarios</span>
        }
      </p>
    </div>

    <app-page-state
      [loading]="query.isPending() || overview.isPending()"
      [error]="error()"
      skeleton="kpi-grid"
      [skeletonCount]="6"
      (retry)="query.refetch(); overview.refetch()"
    >
      @if (query.data(); as d) {
        @if (overview.data(); as o) {
          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              <app-kpi-tile label="Ventas de hoy" icon="lucide:shopping-cart" [value]="money(o.sales.todayTotal)" [sub]="ventas(o.sales.todayCount) + ' · todos los clientes'" />
              <app-kpi-tile
                label="Vendido 30 días"
                icon="lucide:trending-up"
                [value]="money(o.sales.total30d)"
                [sub]="ventas(o.sales.count30d) + ' · ticket ' + money(o.sales.avgTicket30d)"
                hint="Monto vendido por todas las farmacias (sin anuladas)."
              />
              <app-kpi-tile
                label="Clientes activos"
                icon="lucide:building-2"
                tone="success"
                [value]="num(d.tenants.active)"
                [sub]="num(d.tenants.trial) + ' prueba · ' + num(d.tenants.pending) + ' pend. · ' + num(d.tenants.suspended) + ' susp.'"
                link="/platform/clientes"
              />
              <app-kpi-tile
                label="Con ventas 30d"
                icon="lucide:activity"
                tone="info"
                [value]="num(o.sales.activeTenants30d) + ' / ' + num(d.tenants.active)"
                [sub]="num(d.tenantsActivados30d) + ' activados en 30 días'"
                hint="Clientes que registraron al menos una venta en 30 días: indica uso real del sistema."
              />
              <app-kpi-tile label="Leads nuevos" icon="lucide:user-plus" tone="warning" [value]="num(d.leadsNuevos)" sub="por contactar" link="/platform/leads" />
              <app-kpi-tile
                label="Reclamaciones"
                icon="lucide:message-square-warning"
                tone="error"
                [value]="num(d.reclamacionesAbiertas)"
                [sub]="'abiertas · ' + num(d.reclamaciones7d) + ' nuevas en 7 días'"
                link="/platform/reclamaciones"
              />
            </div>

            <div class="grid gap-3 lg:grid-cols-3">
              <app-dash-panel class="lg:col-span-2" title="Ventas por día · todos los clientes">
                <app-dashboard-sales-chart [points]="o.trend" [height]="200" />
              </app-dash-panel>
              <div class="grid gap-3">
                <app-dash-panel title="Medios de pago" hint="Cobros de todas las farmacias en 30 días.">
                  <app-bar-list [rows]="moneyRows(o.payments, 'pago')" ariaLabel="Cobros por medio de pago" />
                </app-dash-panel>
                <app-dash-panel title="Clientes por plan">
                  <app-bar-list [rows]="countRows(o.plans, 'cliente')" ariaLabel="Clientes por plan" />
                </app-dash-panel>
              </div>
            </div>

            <app-dash-panel title="Actividad por cliente" link="/platform/clientes" linkText="Gestionar" hint="Uso de cupos y ventas de cada farmacia. Un cliente activo sin ventas recientes puede necesitar soporte.">
              <div class="-mx-3 overflow-x-auto">
                <table class="min-w-full text-left text-theme-xs">
                  <caption class="sr-only">Actividad de cada cliente SaaS en los últimos 30 días</caption>
                  <thead class="text-gray-500">
                    <tr class="border-b border-gray-100 dark:border-white/[0.05]">
                      <th class="px-3 py-1.5 font-medium">Cliente</th>
                      <th class="px-3 py-1.5 font-medium">Estado</th>
                      <th class="px-3 py-1.5 text-right font-medium">Usuarios</th>
                      <th class="px-3 py-1.5 text-right font-medium">Sedes</th>
                      <th class="px-3 py-1.5 text-right font-medium">Productos</th>
                      <th class="px-3 py-1.5 text-right font-medium">Ventas 30d</th>
                      <th class="px-3 py-1.5 text-right font-medium">Vendido 30d</th>
                      <th class="px-3 py-1.5 font-medium">Última venta</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    @for (t of o.tenantActivity; track t.id) {
                      <tr>
                        <td class="px-3 py-1.5">
                          <p class="font-medium text-gray-800 dark:text-white/90">{{ t.nombre }}</p>
                          <p class="text-[11px] text-gray-400">{{ t.slug }} · {{ t.plan }}</p>
                        </td>
                        <td class="px-3 py-1.5"><app-status-badge [status]="t.status" [label]="statusLabel(t.status)" /></td>
                        <td class="px-3 py-1.5 text-right tabular-nums" [class.text-warning-600]="t.users >= t.maxUsers">{{ t.users }}/{{ t.maxUsers }}</td>
                        <td class="px-3 py-1.5 text-right tabular-nums">{{ t.establishments }}/{{ t.maxEstablishments }}</td>
                        <td class="px-3 py-1.5 text-right tabular-nums">{{ num(t.products) }}</td>
                        <td class="px-3 py-1.5 text-right tabular-nums">{{ num(t.sales30d) }}</td>
                        <td class="px-3 py-1.5 text-right font-medium tabular-nums text-gray-800 dark:text-white/90">{{ money(t.total30d) }}</td>
                        <td class="px-3 py-1.5 whitespace-nowrap" [class.text-error-600]="isStale(t.lastSaleAt, t.status)">{{ lastSale(t.lastSaleAt) }}</td>
                      </tr>
                    } @empty {
                      <tr><td colspan="8" class="px-3 py-4 text-center text-gray-500">Aún no hay clientes.</td></tr>
                    }
                  </tbody>
                </table>
              </div>
            </app-dash-panel>

            <div class="grid gap-3 md:grid-cols-2">
              <app-dash-panel title="Embudo de leads" link="/platform/leads" linkText="Leads">
                <app-bar-list [rows]="countRows(o.leads, 'lead')" ariaLabel="Leads por estado" emptyText="Sin leads registrados." />
              </app-dash-panel>
              <app-dash-panel title="Clientes recientes" link="/platform/clientes" linkText="Ver todos">
                <ul class="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  @for (r of d.recentTenants; track r.id) {
                    <li class="flex items-center justify-between gap-2 py-1.5 text-theme-xs">
                      <div class="min-w-0">
                        <p class="truncate font-medium text-gray-800 dark:text-white/90">{{ r.nombre }}</p>
                        <p class="truncate text-gray-400">{{ r.plan }} · alta {{ locale.formatDate(r.createdAt) }}</p>
                      </div>
                      <app-status-badge [status]="r.status" [label]="statusLabel(r.status)" />
                    </li>
                  }
                </ul>
              </app-dash-panel>
            </div>
          </div>
        }
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

  protected readonly overview = injectQuery(() => ({
    queryKey: ['dashboard', 'platform', 'overview'] as const,
    queryFn: () => firstValueFrom(this.api.getPlatformOverview()),
  }));

  protected readonly money = (v: number | string | null | undefined) => this.locale.formatCurrency(Number(v ?? 0));
  protected readonly num = (v: number | string | null | undefined) => this.locale.formatNumber(Number(v ?? 0));
  protected readonly ventas = (n: number) => `${this.num(n)} ${n === 1 ? 'venta' : 'ventas'}`;
  /** Se recalcula con cada carga del resumen (antigüedad de la última venta). */
  private readonly now = computed(() => (this.overview.dataUpdatedAt() || Date.now()));

  protected moneyRows(list: DashboardBreakdownDto[], unit: string): BarListRow[] {
    return list.map((r) => ({
      key: r.key,
      label: r.label,
      value: Number(r.total),
      valueText: this.money(r.total),
      sub: `${this.num(r.count)} ${r.count === 1 ? unit : unit + 's'}`,
    }));
  }

  protected countRows(list: DashboardBreakdownDto[], unit: string): BarListRow[] {
    return list.map((r) => ({
      key: r.key,
      label: r.label,
      value: r.count,
      valueText: `${this.num(r.count)} ${r.count === 1 ? unit : unit + 's'}`,
    }));
  }

  protected statusLabel(status: string): string {
    return STATUS_LABELS[status] ?? status;
  }

  protected lastSale(iso: string | null): string {
    if (!iso) return 'Sin ventas';
    const days = Math.floor((this.now() - new Date(iso).getTime()) / 86_400_000);
    if (days <= 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    return `Hace ${days} días`;
  }

  /** Cliente activo que lleva más de 7 días sin vender. */
  protected isStale(iso: string | null, status: string): boolean {
    if (status !== 'ACTIVE') return false;
    return !iso || this.now() - new Date(iso).getTime() > 7 * 86_400_000;
  }

  protected error() {
    const err = this.query.error() ?? this.overview.error();
    return err ? httpErrorMessage(err, 'No se pudo cargar el dashboard de plataforma') : null;
  }
}
