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
import { FormSelectComponent } from '../../../../../shared/components/form/form-select/form-select.component';
import { RouterLink } from '@angular/router';
import { InputFieldComponent } from '../../../../../shared/components/form/input/input-field.component';

const PERIODS = [
  { id: '1', label: 'Hoy' },
  { id: '7', label: '7 días' },
  { id: '30', label: '30 días' },
  { id: 'mes', label: 'Este mes' },
  { id: 'dia', label: 'Día' },
  { id: 'rango', label: 'Rango' },
];

/** Valor de «Todos» en el selector de usuario. */
const ALL_USERS = 'all';

/** Fecha local del navegador en AAAA-MM-DD. */
function todayYmd(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

/** «2026-11-05» → «05/11/2026». */
function dmy(ymd: string): string {
  return ymd.split('-').reverse().join('/');
}

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
    FormSelectComponent,
    RouterLink,
    InputFieldComponent,
    AppDatePipe,
  ],
  templateUrl: './dash-admin.component.html',
})
export class DashAdminComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly auth = inject(AuthService);
  protected readonly locale = inject(LocaleService);

  protected readonly periods = PERIODS;
  protected readonly today = todayYmd();
  /** Opción elegida en el selector de periodo: '1', '7', '30', 'mes', 'dia' o 'rango'. */
  protected readonly periodOption = signal('7');
  protected readonly day = signal(this.today);
  protected readonly rangeFrom = signal(this.today.slice(0, 8) + '01');
  protected readonly rangeTo = signal(this.today);
  protected readonly userId = signal(ALL_USERS);

  /** Error de las fechas elegidas; mientras haya uno no se consulta. */
  protected readonly dateError = computed(() => {
    const option = this.periodOption();
    if (option === 'dia') {
      if (!this.day()) return 'Elige un día.';
      if (this.day() > this.today) return 'Elige un día hasta hoy.';
    }
    if (option === 'rango') {
      const from = this.rangeFrom();
      const to = this.rangeTo();
      if (!from || !to) return 'Elige las dos fechas.';
      if (from > to) return '«Desde» no puede ser posterior a «Hasta».';
      if (to > this.today) return '«Hasta» no puede ser posterior a hoy.';
      if ((Date.parse(to) - Date.parse(from)) / 86_400_000 + 1 > 366) return 'El rango puede ser de hasta 366 días.';
    }
    return '';
  });

  /** Lo que se pide al API: atajo de días, este mes, un día o un rango; y el usuario. */
  private readonly filters = computed(() => {
    const userId = this.userId() === ALL_USERS ? undefined : this.userId();
    switch (this.periodOption()) {
      case 'mes':
        return { from: this.today.slice(0, 8) + '01', to: this.today, userId };
      case 'dia':
        return { from: this.day(), userId };
      case 'rango':
        return { from: this.rangeFrom(), to: this.rangeTo(), userId };
      default:
        return { days: Number(this.periodOption()), userId };
    }
  });

  /** Días del periodo mostrado (los datos traen el valor real del API). */
  protected readonly days = computed(() => this.overviewQuery.data()?.days ?? 7);
  protected readonly isSingleDay = computed(() => this.days() === 1);

  protected readonly periodLabel = computed(() => {
    const d = this.overviewQuery.data();
    if (!d) return '';
    if (d.from === d.to) return d.from === this.today ? 'hoy' : `el ${dmy(d.from)}`;
    if (this.periodOption() === 'mes') return 'este mes';
    if (!d.custom) return `últimos ${d.days} días`;
    return `del ${dmy(d.from)} al ${dmy(d.to)}`;
  });
  /** «01/11/2026 – 07/11/2026», siempre con las fechas reales. */
  protected readonly periodDates = computed(() => {
    const d = this.overviewQuery.data();
    if (!d) return '';
    return d.from === d.to ? dmy(d.from) : `${dmy(d.from)} – ${dmy(d.to)}`;
  });
  protected readonly viewLabel = computed(() => this.overviewQuery.data()?.userName ?? 'Toda la empresa');

  protected readonly userOptions = computed(() => [
    { value: ALL_USERS, label: 'Todos los usuarios' },
    ...(this.overviewQuery.data()?.users ?? []).map((u) => ({ value: u.id, label: u.nombre })),
  ]);

  protected readonly profitPct = computed(() => {
    const p = this.overviewQuery.data()?.period;
    const sales = Number(p?.total ?? 0);
    return sales ? ((Number(p?.profit ?? 0) / sales) * 100).toFixed(1) : null;
  });
  protected readonly netNegative = computed(() => Number(this.overviewQuery.data()?.period.net ?? 0) < 0);
  protected readonly suspects = computed(() => this.overviewQuery.data()?.costAboveSalePrice ?? []);
  protected readonly suspectsExcess = computed(() => this.suspects().reduce((a, p) => a + Number(p.exceso), 0));

  protected setPeriod(id: string) {
    this.periodOption.set(id);
  }

  protected readonly isChainAdmin = computed(() => this.auth.user()?.role === 'ADMIN_CADENA');

  protected readonly overviewQuery = injectQuery(() => ({
    queryKey: ['dashboard', 'overview', this.filters()] as const,
    enabled: !this.dateError(),
    queryFn: () => firstValueFrom(this.api.getDashboardOverview(this.filters())),
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


  protected errorMessage(): string | null {
    return this.overviewQuery.isError()
      ? httpErrorMessage(this.overviewQuery.error(), 'No se pudo cargar el resumen del dashboard.')
      : null;
  }
}
