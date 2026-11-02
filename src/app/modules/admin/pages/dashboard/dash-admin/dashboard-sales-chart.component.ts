import { Component, computed, inject, input } from '@angular/core';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  NgApexchartsModule,
} from 'ng-apexcharts';
import { LocaleService } from '../../../../../core/services/locale.service';
import type { DashboardSalesTrendPointDto } from '../../../models/directory.models';

/**
 * Ventas diarias (S/). Una sola serie y un solo eje: la cantidad de ventas
 * va en el tooltip para no mezclar escalas.
 */
@Component({
  selector: 'app-dashboard-sales-chart',
  standalone: true,
  imports: [NgApexchartsModule],
  template: `
    @if (hasData()) {
      <apx-chart
        [series]="series()"
        [chart]="chart()"
        [colors]="colors"
        [stroke]="stroke"
        [fill]="fill"
        [dataLabels]="dataLabels"
        [grid]="grid"
        [tooltip]="tooltip"
        [xaxis]="xaxis()"
        [yaxis]="yaxis"
      />
    } @else {
      <p class="py-8 text-center text-theme-xs text-gray-500">Sin ventas en el periodo seleccionado.</p>
    }
  `,
})
export class DashboardSalesChartComponent {
  private readonly locale = inject(LocaleService);

  readonly points = input.required<DashboardSalesTrendPointDto[] | undefined>();
  readonly height = input(220);

  protected readonly hasData = computed(() => (this.points() ?? []).some((p) => Number(p.total) > 0));

  protected readonly series = computed((): ApexAxisChartSeries => [
    { name: 'Ventas', data: (this.points() ?? []).map((p) => Number(p.total)) },
  ]);

  protected readonly chart = computed(
    (): ApexChart => ({
      fontFamily: 'Outfit, sans-serif',
      height: this.height(),
      type: 'area',
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: false },
    }),
  );

  protected readonly colors = ['#30A038'];
  protected readonly stroke: ApexStroke = { curve: 'smooth', width: 2 };
  protected readonly fill: ApexFill = {
    type: 'gradient',
    gradient: { shadeIntensity: 1, opacityFrom: 0.25, opacityTo: 0.02, stops: [0, 100] },
  };
  protected readonly dataLabels: ApexDataLabels = { enabled: false };
  protected readonly grid: ApexGrid = {
    borderColor: 'rgba(148,163,184,0.18)',
    strokeDashArray: 3,
    padding: { left: 4, right: 4, top: -10, bottom: 0 },
    xaxis: { lines: { show: false } },
    yaxis: { lines: { show: true } },
  };

  protected readonly tooltip: ApexTooltip = {
    enabled: true,
    x: { show: true },
    y: {
      formatter: (value, opts) => {
        const count = (this.points() ?? [])[opts?.dataPointIndex ?? -1]?.count ?? 0;
        return `${this.locale.formatCurrency(value)} · ${count} ${count === 1 ? 'venta' : 'ventas'}`;
      },
      title: { formatter: () => '' },
    },
  };

  protected readonly xaxis = computed(
    (): ApexXAxis => {
      const labels = (this.points() ?? []).map((p) => p.label);
      return {
        type: 'category',
        categories: labels,
        tickAmount: Math.max(1, Math.min(labels.length - 1, 6)),
        labels: { rotate: 0, hideOverlappingLabels: true, style: { fontSize: '10px', colors: '#98A2B3' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
        tooltip: { enabled: false },
      };
    },
  );

  protected readonly yaxis: ApexYAxis = {
    min: 0,
    forceNiceScale: true,
    labels: {
      style: { fontSize: '10px', colors: ['#98A2B3'] },
      formatter: (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)),
    },
  };
}
