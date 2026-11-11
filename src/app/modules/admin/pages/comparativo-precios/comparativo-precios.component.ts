import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
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
    ComponentCardComponent,
    FormSelectComponent,
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
  protected readonly scopeOptions = [
    { value: 'multi', label: 'Con 2 o más proveedores' },
    { value: 'all', label: 'Todos' },
  ];

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
