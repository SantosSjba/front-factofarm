import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import type { SummaryChip } from '../../../../shared/components/ui/summary-chips/summary-chips.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/ui/badge/status-badge.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import type { PriceComparisonItemDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

type ComparisonRow = PriceComparisonItemDto & {
  mejor: number;
  peor: number;
  /** Lo que ahorras por unidad comprando al más barato en vez de al más caro. */
  ahorro: number;
  ahorroPct: number;
};

@Component({
  selector: 'app-comparativo-precios',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    QueryPageStatePipe,
    BreadcrumbInlineComponent,
    PageStateComponent,
    HelpPanelComponent,
    ListFiltersComponent,
    PageToolbarComponent,
    PaginationComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './comparativo-precios.component.html',
})
export class ComparativoPreciosComponent {
  private readonly api = inject(DirectoryApiService);

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Compras' }, { label: 'Comparativo de precios' }];
  protected readonly pageSize = 10;
  protected readonly page = signal(1);
  protected readonly search = signal('');
  protected readonly scope = signal<'all' | 'multi'>('multi');

  protected readonly reportQuery = injectQuery(() => ({
    queryKey: ['purchases', 'price-comparison'] as const,
    queryFn: () => firstValueFrom(this.api.getPriceComparisonReport()),
  }));

  private readonly rows = computed<ComparisonRow[]>(() =>
    (this.reportQuery.data()?.items ?? []).map((item) => {
      // El API ya los ordena del más barato al más caro.
      const prices = item.proveedores.map((p) => Number(p.precioCompra)).filter((n) => Number.isFinite(n));
      const mejor = prices.length ? Math.min(...prices) : 0;
      const peor = prices.length ? Math.max(...prices) : 0;
      const ahorro = peor - mejor;
      return { ...item, mejor, peor, ahorro, ahorroPct: peor > 0 ? (ahorro / peor) * 100 : 0 };
    }),
  );

  protected readonly filtered = computed(() => {
    const term = this.normalize(this.search());
    return this.rows()
      .filter((r) => this.scope() === 'all' || r.proveedores.length > 1)
      .filter(
        (r) =>
          !term ||
          this.normalize(r.producto).includes(term) ||
          this.normalize(r.codigoInterno ?? '').includes(term) ||
          r.proveedores.some((p) => this.normalize(p.razonSocial).includes(term) || p.numeroDocumento.includes(term)),
      )
      // Primero donde más se ahorra eligiendo bien al proveedor.
      .sort((a, b) => b.ahorroPct - a.ahorroPct);
  });
  protected readonly pageRows = computed(() =>
    this.filtered().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize),
  );
  protected readonly multiCount = computed(() => this.rows().filter((r) => r.proveedores.length > 1).length);

  /** Resumen del reporte completo; «Varios proveedores» y «Todos» cambian lo que se muestra. */
  protected readonly summaryChips = computed<SummaryChip[]>(() => {
    if (!this.reportQuery.data()) return [];
    const rows = this.rows();
    const scope = this.scope();
    return [
      { id: 'multi', label: 'Con varios proveedores', count: this.multiCount(), icon: 'mdi:scale-balance', tone: 'info', clickable: true, active: scope === 'multi', tooltip: 'Productos con precio de 2 o más proveedores: aquí sí se puede comparar.' },
      { id: 'all', label: 'Todos con precio', count: rows.length, icon: 'mdi:tag-multiple-outline', tone: 'neutral', clickable: true, active: scope === 'all', tooltip: 'Incluye los que tienen un solo proveedor.' },
      { id: 'ahorro', label: 'Con ahorro', count: rows.filter((r) => r.ahorro > 0).length, icon: 'mdi:piggy-bank-outline', tone: 'success', tooltip: 'Productos donde elegir al proveedor más barato te ahorra dinero.' },
    ];
  });

  protected onSummaryChip(chip: SummaryChip) {
    if (chip.id === 'multi' || chip.id === 'all') this.setScope(chip.id);
  }

  constructor() {
    effect(() => {
      const totalPages = Math.max(1, Math.ceil(this.filtered().length / this.pageSize));
      if (this.page() > totalPages) this.page.set(totalPages);
    });
  }

  protected setSearch(value: string) {
    this.search.set(value);
    this.page.set(1);
  }

  protected setScope(value: string) {
    this.scope.set(value === 'all' ? 'all' : 'multi');
    this.page.set(1);
  }

  protected clearFilters() {
    this.search.set('');
    this.scope.set('multi');
    this.page.set(1);
  }

  protected num(value: string | number | null | undefined): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  private normalize(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }
}
