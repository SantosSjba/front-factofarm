import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import type { SummaryChip } from '../../../../shared/components/ui/summary-chips/summary-chips.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { CheckboxComponent } from '../../../../shared/components/form/input/checkbox.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { AlertComponent } from '../../../../shared/components/ui/alert/alert.component';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { StatusBadgeComponent, type StatusTone } from '../../../../shared/components/ui/badge/status-badge.component';
import { HelpHintComponent } from '../../../../shared/components/ui/help-hint/help-hint.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import type { PurchaseOrderDraft, ReplenishmentSuggestionDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

type AbcClass = ReplenishmentSuggestionDto['claseAbc'];

const ABC_TONE: Record<AbcClass, StatusTone> = { A: 'success', B: 'warning', C: 'neutral' };

@Component({
  selector: 'app-reporte-compras-sugerido',
  standalone: true,
  imports: [
    CommonModule,
    AppDatePipe,
    QueryPageStatePipe,
    AlertComponent,
    BreadcrumbInlineComponent,
    ButtonComponent,
    CheckboxComponent,
    PageStateComponent,
    HasPermissionDirective,
    FormSelectComponent,
    HelpHintComponent,
    HelpPanelComponent,
    ListFiltersComponent,
    PageToolbarComponent,
    PaginationComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './reporte-compras-sugerido.component.html',
})
export class ReporteComprasSugeridoComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly router = inject(Router);

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Compras' }, { label: 'Sugerido de compras' }];
  protected readonly pageSize = 10;
  protected readonly page = signal(1);
  protected readonly search = signal('');
  protected readonly warehouseId = signal('');
  protected readonly abc = signal('');
  protected readonly activeFilterCount = computed(() => [this.warehouseId(), this.abc()].filter(Boolean).length);

  protected readonly warehousesQuery = injectQuery(() => ({
    queryKey: ['inventory', 'warehouses'] as const,
    queryFn: () => firstValueFrom(this.api.listInventoryMovementWarehouses()),
  }));
  protected readonly warehouseOptions = computed(() => [
    { value: '', label: 'Todos los almacenes' },
    ...(this.warehousesQuery.data() ?? []).map((w) => ({ value: w.id, label: `${w.nombre} · ${w.establishment.nombre}` })),
  ]);

  protected readonly reportQuery = injectQuery(() => ({
    queryKey: ['purchases', 'replenishment', this.warehouseId()] as const,
    queryFn: () => firstValueFrom(this.api.getReplenishmentReport(this.warehouseId() || undefined)),
  }));

  /** Filtro de texto y clase en el navegador: el reporte llega completo. */
  protected readonly filtered = computed(() => {
    const term = this.normalize(this.search());
    const abc = this.abc();
    return (this.reportQuery.data()?.items ?? []).filter(
      (r) =>
        (!abc || r.claseAbc === abc) &&
        (!term ||
          this.normalize(r.producto).includes(term) ||
          this.normalize(r.codigoInterno ?? '').includes(term) ||
          this.normalize(r.proveedorSugerido ?? '').includes(term)),
    );
  });
  protected readonly pageRows = computed(() =>
    this.filtered().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize),
  );
  protected readonly estimatedTotal = computed(() =>
    this.filtered().reduce((acc, r) => acc + this.lineTotal(r), 0),
  );
  protected readonly withoutPrice = computed(() => this.filtered().filter((r) => !r.precioSugerido).length);

  private readonly pen = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

  /** Resumen del reporte completo (todas las páginas). Las clases filtran; costo y «sin precio» son de lo filtrado. */
  protected readonly summaryChips = computed<SummaryChip[]>(() => {
    const data = this.reportQuery.data();
    if (!data) return [];
    const items = data.items;
    const count = (c: string) => items.filter((r) => r.claseAbc === c).length;
    const abc = this.abc();
    const chips: SummaryChip[] = [
      { id: 'all', label: 'Por reponer', count: items.length, icon: 'mdi:package-variant-remove', tone: 'neutral', clickable: true, active: !abc, tooltip: 'Productos por debajo de su stock mínimo.', group: 'Clase' },
      { id: 'A', label: 'A', count: count('A'), icon: 'mdi:star', tone: 'success', clickable: true, active: abc === 'A', tooltip: 'Los que más venden (80 % de tus ventas en 90 días).', group: 'Clase' },
      { id: 'B', label: 'B', count: count('B'), icon: 'mdi:star-half-full', tone: 'warning', clickable: true, active: abc === 'B', tooltip: 'Venta media (el siguiente 15 %).', group: 'Clase' },
      { id: 'C', label: 'C', count: count('C'), icon: 'mdi:star-outline', tone: 'neutral', clickable: true, active: abc === 'C', tooltip: 'Venta baja o sin ventas.', group: 'Clase' },
      { id: 'costo', label: 'Costo estimado', count: this.pen.format(this.estimatedTotal()), icon: 'mdi:cash', tone: 'info', tooltip: 'Cantidad sugerida por el precio del proveedor más barato, de lo que se muestra con los filtros.', group: 'Totales' },
    ];
    if (this.withoutPrice()) {
      chips.push({ id: 'sinPrecio', label: 'Sin precio de proveedor', count: this.withoutPrice(), icon: 'mdi:alert-outline', tone: 'warning', tooltip: 'No suman al costo estimado. Regístralos en Proveedores → Productos que vende.', group: 'Totales' });
    }
    return chips;
  });

  protected onSummaryChip(chip: SummaryChip) {
    if (!['all', 'A', 'B', 'C'].includes(chip.id)) return;
    const next = chip.id === 'all' ? '' : chip.id;
    this.setAbc(this.abc() === next ? '' : next);
  }

  // ---------- Selección para crear una orden ----------
  /** Filas elegidas, por `productId|warehouseId`. */
  protected readonly selected = signal<ReadonlySet<string>>(new Set());
  protected readonly selectedRows = computed(() =>
    (this.reportQuery.data()?.items ?? []).filter((r) => this.selected().has(this.key(r))),
  );
  /** Una orden llega a un solo almacén: la selección debe ser de uno. */
  protected readonly selectedWarehouses = computed(() => new Set(this.selectedRows().map((r) => r.warehouseId)));
  protected readonly selectedSuppliers = computed(
    () => new Set(this.selectedRows().map((r) => r.proveedorSugeridoId ?? '')),
  );
  protected readonly selectionProblem = computed(() =>
    this.selectedWarehouses().size > 1
      ? 'Elegiste productos de varios almacenes. Una orden llega a un solo almacén: deja solo los de uno.'
      : '',
  );
  protected readonly pageAllSelected = computed(
    () => this.pageRows().length > 0 && this.pageRows().every((r) => this.selected().has(this.key(r))),
  );

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

  protected setWarehouse(value: string) {
    this.warehouseId.set(value);
    this.page.set(1);
  }

  protected setAbc(value: string) {
    this.abc.set(value);
    this.page.set(1);
  }

  protected clearFilters() {
    this.search.set('');
    this.warehouseId.set('');
    this.abc.set('');
    this.page.set(1);
  }

  protected key(r: ReplenishmentSuggestionDto): string {
    return `${r.productId}|${r.warehouseId}`;
  }

  protected toggleRow(r: ReplenishmentSuggestionDto, checked: boolean) {
    this.selected.update((set) => {
      const next = new Set(set);
      if (checked) next.add(this.key(r));
      else next.delete(this.key(r));
      return next;
    });
  }

  protected togglePage(checked: boolean) {
    this.selected.update((set) => {
      const next = new Set(set);
      for (const r of this.pageRows()) {
        if (checked) next.add(this.key(r));
        else next.delete(this.key(r));
      }
      return next;
    });
  }

  /** Elige todos los sugeridos al mismo proveedor y almacén que esta fila. */
  protected selectSameSupplier(r: ReplenishmentSuggestionDto) {
    const keys = this.filtered()
      .filter((x) => x.warehouseId === r.warehouseId && x.proveedorSugeridoId === r.proveedorSugeridoId)
      .map((x) => this.key(x));
    this.selected.set(new Set(keys));
  }

  protected clearSelection() {
    this.selected.set(new Set());
  }

  /** Abre «Nueva orden» en Órdenes de compra con estos productos y cantidades. */
  protected createOrder() {
    const rows = this.selectedRows();
    if (!rows.length || this.selectionProblem()) return;
    const suppliers = [...this.selectedSuppliers()];
    const draft: PurchaseOrderDraft = {
      supplierId: suppliers.length === 1 && suppliers[0] ? suppliers[0] : null,
      warehouseId: rows[0].warehouseId,
      items: rows.map((r) => ({
        productId: r.productId,
        nombre: r.producto,
        codigoInterno: r.codigoInterno,
        quantity: r.cantidadSugerida,
      })),
    };
    void this.router.navigate(['/ordenes-compra'], { state: { purchaseOrderDraft: draft } });
  }

  protected abcTone(c: AbcClass): StatusTone {
    return ABC_TONE[c];
  }

  protected num(value: string | number | null | undefined): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  protected lineTotal(r: ReplenishmentSuggestionDto): number {
    return r.precioSugerido ? r.cantidadSugerida * this.num(r.precioSugerido) : 0;
  }

  private normalize(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }
}
