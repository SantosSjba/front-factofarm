import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { LabelComponent } from '../../../../shared/components/form/label/label.component';
import { DirectoryApiService } from '../../services/directory-api.service';

@Component({
  selector: 'app-kardex-valorizado',
  standalone: true,
  imports: [
    QueryPageStatePipe,
    CommonModule,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    PaginationComponent,
    FormSelectComponent,
    LabelComponent,
  ],
  templateUrl: './kardex-valorizado.component.html',
})
export class KardexValorizadoComponent {
  private readonly api = inject(DirectoryApiService);

  protected readonly breadcrumbSegments: BreadcrumbSegment[] = [
    { label: 'Inventario' },
    { label: 'Kardex valorizado' },
  ];

  protected readonly warehouseId = signal('');
  protected readonly currentPage = signal(1);
  protected readonly itemsPerPage = 25;

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

  protected readonly valuationQuery = injectQuery(() => ({
    queryKey: ['inventory', 'kardex-valorizado', { warehouseId: this.warehouseId(), page: this.currentPage() }] as const,
    queryFn: () =>
      firstValueFrom(
        this.api.getInventoryValuationReport({
          warehouseId: this.warehouseId() || undefined,
          page: this.currentPage(),
          pageSize: this.itemsPerPage,
        }),
      ),
  }));

  protected readonly rows = computed(() => this.valuationQuery.data()?.items ?? []);
  protected readonly totalRows = computed(() => this.valuationQuery.data()?.total ?? 0);
  protected readonly valorTotalPagina = computed(() => this.valuationQuery.data()?.valorTotalPagina ?? '0');

  protected onWarehouseChange(value: string) {
    this.warehouseId.set(value);
    this.currentPage.set(1);
  }

  protected onPageChange(page: number) {
    this.currentPage.set(page);
  }

  protected formatMoney(value: string) {
    const parsed = Number.parseFloat(value || '0');
    if (!Number.isFinite(parsed)) return value;
    return parsed.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' });
  }

  protected formatQty(value: string) {
    const parsed = Number.parseFloat(value || '0');
    if (!Number.isFinite(parsed)) return value;
    return parsed.toLocaleString('es-PE', { maximumFractionDigits: 4 });
  }
}
