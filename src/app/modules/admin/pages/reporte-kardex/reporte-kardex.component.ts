import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type { ProductListItemDto } from '../../models/directory.models';

@Component({
  selector: 'app-reporte-kardex',
  standalone: true,
  imports: [
    CommonModule,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    PaginationComponent,
    ButtonComponent,
  ],
  templateUrl: './reporte-kardex.component.html',
})
export class ReporteKardexComponent {
  private readonly api = inject(DirectoryApiService);

  protected readonly breadcrumbSegments: BreadcrumbSegment[] = [
    { label: 'Inventario' },
    { label: 'Reporte Kardex' },
  ];

  protected readonly productSearch = signal('');
  protected readonly selectedProductId = signal<string | null>(null);
  protected readonly selectedProductLabel = signal('');
  protected readonly warehouseId = signal('');
  protected readonly currentPage = signal(1);
  protected readonly itemsPerPage = 50;
  protected readonly productOptions = signal<ProductListItemDto[]>([]);

  protected readonly warehousesQuery = injectQuery(() => ({
    queryKey: ['inventory', 'warehouses'] as const,
    queryFn: () => firstValueFrom(this.api.listInventoryMovementWarehouses()),
  }));

  protected readonly kardexQuery = injectQuery(() => ({
    queryKey: [
      'inventory',
      'kardex',
      {
        productId: this.selectedProductId(),
        warehouseId: this.warehouseId(),
        page: this.currentPage(),
      },
    ] as const,
    enabled: !!this.selectedProductId(),
    queryFn: () =>
      firstValueFrom(
        this.api.getInventoryKardex({
          productId: this.selectedProductId()!,
          warehouseId: this.warehouseId() || undefined,
          page: this.currentPage(),
          pageSize: this.itemsPerPage,
        }),
      ),
  }));

  protected readonly rows = computed(() => this.kardexQuery.data()?.items ?? []);
  protected readonly totalRows = computed(() => this.kardexQuery.data()?.total ?? 0);

  protected async searchProducts() {
    const search = this.productSearch().trim();
    if (!search) {
      this.productOptions.set([]);
      return;
    }
    const result = await firstValueFrom(
      this.api.listProducts({ search, field: 'nombre', page: 1, pageSize: 10 }),
    );
    this.productOptions.set('items' in result ? result.items : result);
  }

  protected selectProduct(product: ProductListItemDto) {
    this.selectedProductId.set(product.id);
    this.selectedProductLabel.set(`${product.nombre} (${product.codigoInterno ?? 'sin código'})`);
    this.productOptions.set([]);
    this.productSearch.set('');
    this.currentPage.set(1);
  }

  protected onWarehouseChange(value: string) {
    this.warehouseId.set(value);
    this.currentPage.set(1);
  }

  protected onPageChange(page: number) {
    this.currentPage.set(page);
  }
}
