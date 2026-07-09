import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../../core/http/http-error-message';
import { LocaleService } from '../../../../../core/services/locale.service';
import { DirectoryApiService } from '../../../services/directory-api.service';
import { ComponentCardComponent } from '../../../../../shared/components/common/component-card/component-card.component';
import { IconComponent } from '../../../../../shared/components/ui/icon/icon.component';
import { PageStateComponent } from '../../../../../shared/components/common/page-state/page-state.component';
import { OnboardingBannerComponent } from '../../../../../shared/components/common/onboarding-banner/onboarding-banner.component';
import { DashboardSalesChartComponent } from './dashboard-sales-chart.component';

@Component({
  selector: 'app-dash-admin',
  imports: [
    ComponentCardComponent,
    IconComponent,
    RouterLink,
    PageStateComponent,
    OnboardingBannerComponent,
    DashboardSalesChartComponent,
  ],
  templateUrl: './dash-admin.component.html',
})
export class DashAdminComponent {
  private readonly api = inject(DirectoryApiService);
  protected readonly locale = inject(LocaleService);

  protected readonly statsQuery = injectQuery(() => ({
    queryKey: ['dashboard', 'stats'] as const,
    queryFn: () => firstValueFrom(this.api.getDashboardStats()),
  }));

  protected readonly chainQuery = injectQuery(() => ({
    queryKey: ['dashboard', 'chain-summary'] as const,
    queryFn: () => firstValueFrom(this.api.getDashboardChainSummary()),
  }));

  protected readonly salesTrendQuery = injectQuery(() => ({
    queryKey: ['dashboard', 'sales-trend'] as const,
    queryFn: () => firstValueFrom(this.api.getDashboardSalesTrend()),
  }));

  protected formatCount(value: number | undefined): string {
    return this.locale.formatNumber(value ?? 0);
  }

  protected formatMoney(value: string | undefined): string {
    return this.locale.formatCurrency(Number(value ?? 0));
  }

  protected parseCount(value: string | undefined): number {
    return Number(value ?? 0);
  }

  protected statsErrorMessage(): string | null {
    return this.statsQuery.isError()
      ? httpErrorMessage(this.statsQuery.error(), 'No se pudieron cargar los indicadores.')
      : null;
  }

  protected chainErrorMessage(): string | null {
    return this.chainQuery.isError()
      ? httpErrorMessage(this.chainQuery.error(), 'No se pudo cargar el consolidado de sucursales.')
      : null;
  }

  protected salesTrendErrorMessage(): string | null {
    return this.salesTrendQuery.isError()
      ? httpErrorMessage(this.salesTrendQuery.error(), 'No se pudo cargar la tendencia de ventas.')
      : null;
  }
}
