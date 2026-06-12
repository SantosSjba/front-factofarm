import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { Component, computed, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { LocaleService } from '../../../../core/services/locale.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { DirectoryApiService } from '../../services/directory-api.service';

@Component({
  selector: 'app-lotes',
  standalone: true,
  imports: [
    CommonModule,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    ListFiltersComponent,
    PaginationComponent,
    RouterLink,
    FormSelectComponent,
  ],
  templateUrl: './lotes.component.html',
})
export class LotesComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly route = inject(ActivatedRoute);
  protected readonly locale = inject(LocaleService);

  constructor() {
    const expiry = this.route.snapshot.queryParamMap.get('expiry');
    if (expiry === 'expired' || expiry === '30' || expiry === '60' || expiry === '90') {
      this.expiryFilter.set(expiry);
    }
  }

  protected readonly breadcrumbSegments: BreadcrumbSegment[] = [
    { label: 'Inventario' },
    { label: 'Lotes' },
  ];

  protected readonly searchTerm = signal('');
  protected readonly filterField = signal<'all' | 'producto' | 'lote' | 'almacen'>('producto');
  protected readonly warehouseId = signal('');
  protected readonly expiryFilter = signal<'all' | 'expired' | '30' | '60' | '90'>('all');
  protected readonly currentPage = signal(1);
  protected readonly itemsPerPage = 10;

  protected readonly fieldFilterOptions = [
    { value: 'producto', label: 'Producto' },
    { value: 'lote', label: 'Lote' },
    { value: 'almacen', label: 'Almacén' },
    { value: 'all', label: 'Todos' },
  ];

  protected readonly expiryOptions = [
    { value: 'all', label: 'Todos los vencimientos' },
    { value: 'expired', label: 'Vencidos' },
    { value: '30', label: 'Por vencer 30 días' },
    { value: '60', label: 'Por vencer 60 días' },
    { value: '90', label: 'Por vencer 90 días' },
  ];

  protected readonly warehousesQuery = injectQuery(() => ({
    queryKey: ['inventory', 'warehouses'] as const,
    queryFn: () => firstValueFrom(this.api.listInventoryMovementWarehouses()),
  }));

  protected readonly warehouseOptions = computed(() => [
    { value: '', label: 'Todos los almacenes' },
    ...(this.warehousesQuery.data() ?? []).map((w) => ({
      value: w.id,
      label: `${w.nombre} · ${w.establishment.nombre}`,
    })),
  ]);

  protected readonly lotsQuery = injectQuery(() => ({
    queryKey: [
      'inventory',
      'lots',
      {
        search: this.searchTerm().trim(),
        field: this.filterField(),
        warehouseId: this.warehouseId(),
        expiry: this.expiryFilter(),
        page: this.currentPage(),
      },
    ] as const,
    queryFn: () =>
      firstValueFrom(
        this.api.listInventoryLots({
          search: this.searchTerm(),
          field: this.filterField(),
          warehouseId: this.warehouseId() || undefined,
          expiryFilter: this.expiryFilter(),
          page: this.currentPage(),
          pageSize: this.itemsPerPage,
        }),
      ),
  }));

  protected readonly rows = computed(() => this.lotsQuery.data()?.items ?? []);
  protected readonly totalRows = computed(() => this.lotsQuery.data()?.total ?? 0);
  protected readonly pageStart = computed(() => (this.currentPage() - 1) * this.itemsPerPage);

  protected onSearchChange(value: string) {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  protected onFilterFieldChange(value: string) {
    this.filterField.set(value as 'all' | 'producto' | 'lote' | 'almacen');
    this.currentPage.set(1);
  }

  protected onExpiryChange(value: string) {
    this.expiryFilter.set(value as 'all' | 'expired' | '30' | '60' | '90');
    this.currentPage.set(1);
  }

  protected onWarehouseChange(value: string) {
    this.warehouseId.set(value);
    this.currentPage.set(1);
  }

  protected clearFilters() {
    this.searchTerm.set('');
    this.filterField.set('producto');
    this.expiryFilter.set('all');
    this.currentPage.set(1);
  }

  protected onPageChange(page: number) {
    this.currentPage.set(page);
  }

  protected refetchRows() {
    void this.lotsQuery.refetch();
  }

  protected isExpired(dateIso: string | null): boolean {
    if (!dateIso) return false;
    return new Date(dateIso).getTime() < Date.now();
  }
}
