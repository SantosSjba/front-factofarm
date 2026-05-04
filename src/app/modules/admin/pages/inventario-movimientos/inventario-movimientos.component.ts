import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { inventoryMovementQueryKeys } from '../../../../core/query/inventory-movement-query.keys';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { TableDropdownComponent } from '../../../../shared/components/common/table-dropdown/table-dropdown.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { IconComponent } from '../../../../shared/components/ui/icon/icon.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import type { InventoryImportMode, InventoryMovementListFiltersRequest } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

@Component({
  selector: 'app-inventario-movimientos',
  standalone: true,
  imports: [
    CommonModule,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    ListFiltersComponent,
    PaginationComponent,
    TableDropdownComponent,
    ModalComponent,
    ButtonComponent,
    IconComponent,
    FormSelectComponent,
  ],
  templateUrl: './inventario-movimientos.component.html',
})
export class InventarioMovimientosComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumbSegments: BreadcrumbSegment[] = [
    { label: 'Inventario' },
    { label: 'Inventario' },
  ];
  protected readonly itemsPerPage = 10;
  protected readonly searchTerm = signal('');
  protected readonly filterField = signal<NonNullable<InventoryMovementListFiltersRequest['field']>>('producto');
  protected readonly currentPage = signal(1);
  protected readonly fieldFilterOptions = [
    { value: 'producto', label: 'Producto' },
    { value: 'marca', label: 'Marca' },
    { value: 'almacen', label: 'Almacén' },
    { value: 'all', label: 'Todos' },
  ];

  protected readonly listQuery = injectQuery(() => {
    const filters: InventoryMovementListFiltersRequest = {
      search: this.searchTerm().trim() || undefined,
      field: this.filterField(),
      page: this.currentPage(),
      pageSize: this.itemsPerPage,
    };
    return {
      queryKey: inventoryMovementQueryKeys.list(filters),
      queryFn: () => firstValueFrom(this.api.listInventoryMovements(filters)),
    };
  });

  protected readonly warehousesQuery = injectQuery(() => ({
    queryKey: [...inventoryMovementQueryKeys.all, 'warehouses'],
    queryFn: () => firstValueFrom(this.api.listInventoryMovementWarehouses()),
  }));

  protected readonly rows = computed(() => this.listQuery.data()?.items ?? []);
  protected readonly totalRows = computed(() => this.listQuery.data()?.total ?? 0);
  protected readonly warehouseOptions = computed(() => [
    { value: '', label: 'Seleccionar' },
    ...(this.warehousesQuery.data() ?? []).map((w) => ({
      value: w.id,
      label: `${w.nombre} · ${w.establishment.nombre}`,
    })),
  ]);

  protected readonly importOpen = signal(false);
  protected readonly importMode = signal<InventoryImportMode>('LOTES');
  protected readonly importWarehouseId = signal('');
  protected readonly importFile = signal<File | null>(null);

  protected readonly importLotsMutation = injectMutation(() => ({
    mutationFn: ({ warehouseId, file }: { warehouseId: string; file: File }) =>
      firstValueFrom(this.api.importInventoryLots(warehouseId, file)),
    onSuccess: (result) => {
      this.notify.success(
        `Importación finalizada. Creados: ${result.created}, actualizados: ${result.updated}, errores: ${result.errors.length}`,
      );
      this.closeImportModal(true);
      void this.queryClient.invalidateQueries({ queryKey: inventoryMovementQueryKeys.all });
    },
    onError: (err) =>
      this.notify.error(httpErrorMessage(err, 'No se pudo importar productos con lotes')),
  }));

  protected readonly importSeriesMutation = injectMutation(() => ({
    mutationFn: ({ warehouseId, file }: { warehouseId: string; file: File }) =>
      firstValueFrom(this.api.importInventorySeries(warehouseId, file)),
    onSuccess: (result) => {
      this.notify.success(
        `Importación finalizada. Creados: ${result.created}, actualizados: ${result.updated}, errores: ${result.errors.length}`,
      );
      this.closeImportModal(true);
      void this.queryClient.invalidateQueries({ queryKey: inventoryMovementQueryKeys.all });
    },
    onError: (err) =>
      this.notify.error(httpErrorMessage(err, 'No se pudo importar productos con series')),
  }));

  protected readonly importPending = computed(
    () => this.importLotsMutation.isPending() || this.importSeriesMutation.isPending(),
  );

  protected refetchRows() {
    void this.listQuery.refetch();
  }

  protected onSearchChange(v: string) {
    this.searchTerm.set(v);
    this.currentPage.set(1);
  }

  protected onFieldChange(v: string) {
    this.filterField.set((v || 'producto') as NonNullable<InventoryMovementListFiltersRequest['field']>);
    this.currentPage.set(1);
  }

  protected clearFilters() {
    this.searchTerm.set('');
    this.filterField.set('producto');
    this.currentPage.set(1);
  }

  protected onPageChange(page: number) {
    this.currentPage.set(page);
  }

  protected formatStock(v: string) {
    const parsed = Number.parseFloat(v || '0');
    if (!Number.isFinite(parsed)) return '0';
    return parsed.toLocaleString('es-PE', { maximumFractionDigits: 2 });
  }

  protected openImportModal(mode: InventoryImportMode) {
    this.importMode.set(mode);
    this.importWarehouseId.set('');
    this.importFile.set(null);
    this.importOpen.set(true);
  }

  protected closeImportModal(force = false) {
    if (!force && this.importPending()) return;
    this.importOpen.set(false);
    this.importWarehouseId.set('');
    this.importFile.set(null);
  }

  protected onImportFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.importFile.set(input.files?.[0] ?? null);
  }

  protected importTitle() {
    return this.importMode() === 'SERIES' ? 'Importar productos con series' : 'Importar productos con lotes';
  }

  protected async downloadImportTemplate() {
    const mode = this.importMode();
    try {
      const blob = await firstValueFrom(this.api.downloadInventoryImportTemplate(mode));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = mode === 'SERIES' ? 'movement_item_lots.xlsx' : 'movement_item_lots_group.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo descargar formato de importación'));
    }
  }

  protected processImport() {
    const warehouseId = this.importWarehouseId();
    const file = this.importFile();
    if (!warehouseId) {
      this.notify.warning('Seleccione un almacén.');
      return;
    }
    if (!file) {
      this.notify.warning('Seleccione un archivo .xlsx');
      return;
    }
    if (this.importMode() === 'SERIES') {
      this.importSeriesMutation.mutate({ warehouseId, file });
    } else {
      this.importLotsMutation.mutate({ warehouseId, file });
    }
  }

  protected onDevAction(message: string) {
    this.notify.info(`${message}: En desarrollo`);
  }
}
