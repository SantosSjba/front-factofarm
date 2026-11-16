import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { HelpHintComponent } from '../../../../shared/components/ui/help-hint/help-hint.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import type { SummaryChip } from '../../../../shared/components/ui/summary-chips/summary-chips.component';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { DirectoryApiService } from '../../services/directory-api.service';

const METHOD_HELP: Record<'PEPS' | 'PROMEDIO_PONDERADO', string> = {
  PEPS: 'Método PEPS: el costo de lo que entró primero.',
  PROMEDIO_PONDERADO: 'Método promedio ponderado: el costo promedio de lo que entró.',
};

/** Inventario valorizado: stock actual por producto y almacén, multiplicado por su costo. */
@Component({
  selector: 'app-kardex-valorizado',
  standalone: true,
  imports: [
    CommonModule,
    QueryPageStatePipe,
    BreadcrumbInlineComponent,
    FormSelectComponent,
    HelpHintComponent,
    HelpPanelComponent,
    ListFiltersComponent,
    PageStateComponent,
    PageToolbarComponent,
    PaginationComponent,
  ],
  templateUrl: './kardex-valorizado.component.html',
})
export class KardexValorizadoComponent {
  private readonly api = inject(DirectoryApiService);

  protected readonly breadcrumbSegments: BreadcrumbSegment[] = [{ label: 'Inventario' }, { label: 'Inventario valorizado' }];
  protected readonly itemsPerPage = 20;
  protected readonly search = signal('');
  protected readonly warehouseId = signal('');
  protected readonly sinCosto = signal(false);
  protected readonly currentPage = signal(1);

  protected readonly warehousesQuery = injectQuery(() => ({
    queryKey: ['inventory', 'warehouses'] as const,
    queryFn: () => firstValueFrom(this.api.listInventoryMovementWarehouses()),
  }));
  protected readonly warehouseOptions = computed(() => [
    { value: '', label: 'Todos los almacenes' },
    ...(this.warehousesQuery.data() ?? []).map((w) => ({ value: w.id, label: `${w.nombre} · ${w.establishment.nombre}` })),
  ]);
  /** Con un solo almacén la columna repetiría el mismo nombre en todas las filas. */
  protected readonly multiWarehouse = computed(() => this.warehouseOptions().length > 2 && !this.warehouseId());

  protected readonly valuationQuery = injectQuery(() => {
    const filters = {
      search: this.search().trim() || undefined,
      warehouseId: this.warehouseId() || undefined,
      sinCosto: this.sinCosto() || undefined,
      page: this.currentPage(),
      pageSize: this.itemsPerPage,
    };
    return {
      queryKey: ['inventory', 'kardex-valorizado', filters] as const,
      queryFn: () => firstValueFrom(this.api.getInventoryValuationReport(filters)),
    };
  });
  protected readonly rows = computed(() => this.valuationQuery.data()?.items ?? []);
  protected readonly totalRows = computed(() => this.valuationQuery.data()?.total ?? 0);
  private readonly pen = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
  private readonly qtyFmt = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 });

  protected readonly methodHelp = computed(() => {
    const methods = this.valuationQuery.data()?.metodos ?? [];
    return methods.length === 1
      ? METHOD_HELP[methods[0]]
      : 'Cada establecimiento usa su método: PEPS (lo que entró primero) o promedio ponderado.';
  });

  /** Totales de todo el filtro (la API valoriza todas las filas, no solo la página). */
  protected readonly summaryChips = computed<SummaryChip[]>(() => {
    const d = this.valuationQuery.data();
    if (!d) return [];
    const sinCosto = d.sinCosto ?? 0;
    return [
      { id: 'valor', label: 'Valor del inventario', count: this.pen.format(Number(d.valorTotal ?? d.valorTotalPagina ?? 0)), icon: 'mdi:cash-multiple', tone: 'success', clickable: false, tooltip: 'Suma de todo lo filtrado, no solo de esta página.' },
      { id: 'unidades', label: 'Unidades', count: this.qtyFmt.format(Number(d.unidadesTotal ?? 0)), icon: 'mdi:package-variant-closed', clickable: false },
      { id: 'all', label: 'Productos con stock', count: d.filas ?? d.total, icon: 'mdi:pill', active: !this.sinCosto(), tooltip: 'Filas de producto y almacén con stock.' },
      { id: 'sin-costo', label: 'Sin costo', count: sinCosto, tone: sinCosto ? 'warning' : 'neutral', active: this.sinCosto(), tooltip: 'Se valorizan en S/ 0. Regístrales el costo en Productos o en sus ingresos.' },
    ];
  });

  constructor() {
    effect(() => {
      const totalPages = Math.max(1, this.valuationQuery.data()?.totalPages ?? 1);
      if (this.currentPage() > totalPages) this.currentPage.set(totalPages);
    });
  }

  protected onSummaryChip(chip: SummaryChip) {
    if (chip.id === 'all') this.sinCosto.set(false);
    else if (chip.id === 'sin-costo') this.sinCosto.update((v) => !v);
    else return;
    this.currentPage.set(1);
  }

  protected setSearch(value: string) {
    this.search.set(value);
    this.currentPage.set(1);
  }

  protected setWarehouse(value: string) {
    this.warehouseId.set(value);
    this.currentPage.set(1);
  }

  protected clearFilters() {
    this.search.set('');
    this.warehouseId.set('');
    this.sinCosto.set(false);
    this.currentPage.set(1);
  }

  protected num(value: string | number | null | undefined): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
}
