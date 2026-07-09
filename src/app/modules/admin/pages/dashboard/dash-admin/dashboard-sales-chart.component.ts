import { Component, computed, input } from '@angular/core';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexGrid,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  NgApexchartsModule,
} from 'ng-apexcharts';
import type { DashboardSalesTrendDto } from '../../../models/directory.models';

@Component({
  selector: 'app-dashboard-sales-chart',
  standalone: true,
  imports: [NgApexchartsModule],
  template: `
  @if (series().length > 0) {
    <apx-chart
      [series]="series()"
      [chart]="chart"
      [colors]="colors"
      [stroke]="stroke"
      [dataLabels]="dataLabels"
      [grid]="grid"
      [tooltip]="tooltip"
      [xaxis]="xaxis()"
      [yaxis]="yaxis"
    />
  } @else {
    <p class="py-8 text-center text-sm text-gray-500">Sin ventas en el periodo seleccionado.</p>
  }
  `,
})
export class DashboardSalesChartComponent {
  readonly trend = input.required<DashboardSalesTrendDto | undefined>();

  protected readonly series = computed((): ApexAxisChartSeries => {
    const points = this.trend()?.points ?? [];
    if (!points.length) return [];
    return [
      {
        name: 'Ventas (S/)',
        data: points.map((p) => Number(p.total)),
      },
      {
        name: 'Transacciones',
        data: points.map((p) => p.count),
      },
    ];
  });

  protected readonly chart: ApexChart = {
    fontFamily: 'Outfit, sans-serif',
    height: 300,
    type: 'area',
    toolbar: { show: false },
  };

  protected readonly colors = ['#465FFF', '#9CB9FF'];

  protected readonly stroke: ApexStroke = {
    curve: 'smooth',
    width: [2, 2],
  };

  protected readonly dataLabels: ApexDataLabels = { enabled: false };

  protected readonly grid: ApexGrid = {
    xaxis: { lines: { show: false } },
    yaxis: { lines: { show: true } },
  };

  protected readonly tooltip: ApexTooltip = { enabled: true };

  protected readonly xaxis = computed(
    (): ApexXAxis => ({
      type: 'category',
      categories: (this.trend()?.points ?? []).map((p) => p.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
    }),
  );

  protected readonly yaxis: ApexYAxis = {
    labels: {
      style: { fontSize: '12px', colors: ['#6B7280'] },
    },
  };
}
