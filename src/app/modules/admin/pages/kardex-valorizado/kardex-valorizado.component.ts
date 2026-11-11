import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { KpiTileComponent } from '../../../../shared/components/common/dashboard/kpi-tile.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { StatusBadgeComponent } from '../../../../shared/components/ui/badge/status-badge.component';
import { HelpHintComponent } from '../../../../shared/components/ui/help-hint/help-hint.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import type { InventoryValuationRowDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

/** Inventario valorizado: stock actual por producto y almacén, multiplicado por su costo. */
@Component({
  selector: 'app-kardex-valorizado',
  standalone: true,
  imports: [
    KpiTileComponent,
    CommonModule,
    QueryPageStatePipe,
    BreadcrumbInlineComponent,
    ComponentCardComponent,
    FormSelectComponent,
    HelpHintComponent,
    HelpPanelComponent,
    ListFiltersComponent,
    PageToolbarComponent,
    PaginationComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './kardex-valorizado.component.html',
})
export class KardexValorizadoComponent {
  private readonly api = inject(DirectoryApiService);

  protected readonly breadcrumbSegments: BreadcrumbSegment[] = [{ label: 'Inventario' }, { label: 'Inventario valorizado' }];
  protected readonly itemsPerPage = 20;
  protected readonly warehouseId = signal('');
  protected readonly currentPage = signal(1);

  protected readonly warehousesQuery = injectQuery(() => ({
    queryKey: ['inventory', 'warehouses'] as const,
    queryFn: () => firstValueFrom(this.api.listInventoryMovementWarehouses()),
  }));
  protected readonly warehouseOptions = computed(() => [
    { value: '', label: 'Todos los almacenes' },
    ...(this.warehousesQuery.data() ?? []).map((w) => ({ value: w.id, label: `${w.nombre} · ${w.establishment.nombre}` })),
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
  private readonly pen = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
  private readonly qtyFmt = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 });
  /** Total de todo el filtro (la API valoriza todas las filas, no solo la página). */
  protected readonly grandTotal = computed(() => Number(this.valuationQuery.data()?.valorTotal ?? this.valuationQuery.data()?.valorTotalPagina ?? 0));
  protected readonly kpis = computed(() => {
    const d = this.valuationQuery.data();
    if (!d) return null;
    return {
      valor: this.pen.format(this.grandTotal()),
      unidades: this.qtyFmt.format(Number(d.unidadesTotal ?? 0)),
      productos: `${d.total}`,
      sinCosto: d.sinCosto ?? 0,
    };
  });

  constructor() {
    effect(() => {
      const totalPages = Math.max(1, this.valuationQuery.data()?.totalPages ?? 1);
      if (this.currentPage() > totalPages) this.currentPage.set(totalPages);
    });
  }

  protected setWarehouse(value: string) {
    this.warehouseId.set(value);
    this.currentPage.set(1);
  }

  protected methodLabel(row: InventoryValuationRowDto): string {
    return row.metodoValoracion === 'PEPS' ? 'PEPS' : 'Promedio';
  }

  protected num(value: string | number | null | undefined): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
}
