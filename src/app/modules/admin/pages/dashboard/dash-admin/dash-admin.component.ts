import { Component, computed, inject, signal } from '@angular/core';
import { injectQuery, keepPreviousData } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../../core/http/http-error-message';
import { AuthService } from '../../../../../core/services/auth.service';
import { LocaleService } from '../../../../../core/services/locale.service';
import { DirectoryApiService } from '../../../services/directory-api.service';
import type { DashboardBreakdownDto } from '../../../models/directory.models';
import { PageStateComponent } from '../../../../../shared/components/common/page-state/page-state.component';
import { OnboardingBannerComponent } from '../../../../../shared/components/common/onboarding-banner/onboarding-banner.component';
import { ChartTabComponent } from '../../../../../shared/components/common/chart-tab/chart-tab.component';
import { KpiTileComponent } from '../../../../../shared/components/common/dashboard/kpi-tile.component';
import { DashPanelComponent } from '../../../../../shared/components/common/dashboard/dash-panel.component';
import { BarListComponent, type BarListRow } from '../../../../../shared/components/common/dashboard/bar-list.component';
import { HourColumnsComponent } from '../../../../../shared/components/common/dashboard/hour-columns.component';
import { AppDatePipe } from '../../../../../shared/pipes/app-date.pipe';
import { DashboardSalesChartComponent } from './dashboard-sales-chart.component';

const PERIODS = [
  { id: '1', label: 'Hoy' },
  { id: '7', label: '7 días' },
  { id: '30', label: '30 días' },
  { id: '90', label: '90 días' },
];

@Component({
  selector: 'app-dash-admin',
  imports: [
    PageStateComponent,
    OnboardingBannerComponent,
    ChartTabComponent,
    KpiTileComponent,
    DashPanelComponent,
    BarListComponent,
    HourColumnsComponent,
    DashboardSalesChartComponent,
    AppDatePipe,
  ],
  templateUrl: './dash-admin.component.html',
})
export class DashAdminComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly auth = inject(AuthService);
  protected readonly locale = inject(LocaleService);

  protected readonly periods = PERIODS;
  protected readonly days = signal(7);
  protected readonly periodLabel = computed(() => (this.days() === 1 ? 'hoy' : `últimos ${this.days()} días`));

  protected readonly isChainAdmin = computed(() => this.auth.user()?.role === 'ADMIN_CADENA');

  protected readonly overviewQuery = injectQuery(() => ({
    queryKey: ['dashboard', 'overview', this.days()] as const,
    queryFn: () => firstValueFrom(this.api.getDashboardOverview(this.days())),
    // Al cambiar de periodo se mantienen los datos anteriores mientras carga.
    placeholderData: keepPreviousData,
  }));

  protected readonly statsQuery = injectQuery(() => ({
    queryKey: ['dashboard', 'stats'] as const,
    queryFn: () => firstValueFrom(this.api.getDashboardStats()),
  }));

  protected readonly chainQuery = injectQuery(() => ({
    queryKey: ['dashboard', 'chain-summary'] as const,
    queryFn: () => firstValueFrom(this.api.getDashboardChainSummary()),
  }));

  protected readonly data = computed(() => this.overviewQuery.data());

  protected readonly money = (v: number | string | null | undefined) => this.locale.formatCurrency(Number(v ?? 0));
  protected readonly num = (v: number | string | null | undefined) => this.locale.formatNumber(Number(v ?? 0));
  protected readonly moneyFn = (v: number) => this.money(v);
  protected readonly ventas = (n: number) => `${this.num(n)} ${n === 1 ? 'venta' : 'ventas'}`;

  /** % de cambio; null si no hay base de comparación. */
  protected delta(current: string | undefined, previous: string | undefined): number | null {
    const c = Number(current ?? 0);
    const p = Number(previous ?? 0);
    if (!p) return null;
    return ((c - p) / p) * 100;
  }

  protected rows(list: DashboardBreakdownDto[] | undefined, unit: 'venta' | 'pago' = 'venta'): BarListRow[] {
    return (list ?? []).map((r) => ({
      key: r.key,
      label: r.label,
      value: Number(r.total),
      valueText: this.money(r.total),
      sub: `${this.num(r.count)} ${r.count === 1 ? unit : unit + 's'}`,
    }));
  }

  protected readonly productRows = computed((): BarListRow[] =>
    (this.data()?.topProducts ?? []).map((p) => ({
      key: p.id,
      label: p.nombre,
      value: Number(p.total),
      valueText: this.money(p.total),
      sub: `${this.num(p.cantidad)} und`,
    })),
  );

  protected readonly systemLine = computed(() => {
    const s = this.statsQuery.data();
    if (!s) return '';
    return [
      `${this.num(s.usersActive)} usuarios`,
      `${this.num(s.establishmentsActive)} ${s.establishmentsActive === 1 ? 'sede' : 'sedes'}`,
      `${this.num(s.customersActive)} clientes`,
      `${this.num(s.productsActive)} productos`,
    ].join(' · ');
  });

  protected readonly showChain = computed(() => (this.chainQuery.data()?.establishments?.length ?? 0) > 1);

  protected setDays(id: string) {
    this.days.set(Number(id));
  }

  protected errorMessage(): string | null {
    return this.overviewQuery.isError()
      ? httpErrorMessage(this.overviewQuery.error(), 'No se pudo cargar el resumen del dashboard.')
      : null;
  }
}
