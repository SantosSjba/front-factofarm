import { CommonModule } from '@angular/common';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
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
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { LabelComponent } from '../../../../shared/components/form/label/label.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { IconComponent } from '../../../../shared/components/ui/icon/icon.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import type {
  CreateInventoryAdjustmentRequest,
  InventoryCreateInboundRequest,
  InventoryCreateOutboundRequest,
  InventoryImportMode,
  InventoryMovementListFiltersRequest,
  InventoryMovementListItemDto,
  InventoryPendingAdjustmentDto,
} from '../../models/directory.models';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { DirectoryApiService } from '../../services/directory-api.service';
import { LocaleService } from '../../../../core/services/locale.service';

@Component({
  selector: 'app-inventario-movimientos',
  standalone: true,
  imports: [
    QueryPageStatePipe,
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
    InputFieldComponent,
    LabelComponent,
    FormSelectComponent,
    HasPermissionDirective,
  ],
  templateUrl: './inventario-movimientos.component.html',
})
export class InventarioMovimientosComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly locale = inject(LocaleService);
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
  protected readonly transferReasonsQuery = injectQuery(() => ({
    queryKey: [...inventoryMovementQueryKeys.all, 'transfer-reasons'],
    queryFn: () => firstValueFrom(this.api.listInventoryMovementTransferReasons()),
  }));
  protected readonly outputReasonsQuery = injectQuery(() => ({
    queryKey: [...inventoryMovementQueryKeys.all, 'output-reasons'],
    queryFn: () => firstValueFrom(this.api.listInventoryMovementOutputReasons()),
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
  protected readonly transferReasonOptions = computed(() => [
    { value: '', label: 'Seleccionar' },
    ...(this.transferReasonsQuery.data() ?? []).map((row) => ({
      value: row.id,
      label: row.nombre,
    })),
  ]);
  protected readonly outputReasonOptions = computed(() => [
    { value: '', label: 'Seleccionar' },
    ...(this.outputReasonsQuery.data() ?? []).map((row) => ({
      value: row.id,
      label: row.nombre,
    })),
  ]);

  protected readonly importOpen = signal(false);
  protected readonly importMode = signal<InventoryImportMode>('LOTES');
  protected readonly importWarehouseId = signal('');
  protected readonly importFile = signal<File | null>(null);
  protected readonly inboundOpen = signal(false);
  protected readonly inboundProduct = signal<InventoryMovementListItemDto | null>(null);
  protected readonly inboundWarehouseId = signal('');
  protected readonly inboundQuantity = signal<number>(1);
  protected readonly inboundLotCode = signal('');
  protected readonly inboundLotSearch = signal('');
  protected readonly inboundLotDropdownOpen = signal(false);
  protected readonly inboundExpirationDate = signal('');
  protected readonly inboundRegisteredAt = signal(this.nowForDatetimeLocal());
  protected readonly inboundTransferReasonId = signal('');
  protected readonly inboundComment = signal('');
  protected readonly outboundOpen = signal(false);
  protected readonly outboundProduct = signal<InventoryMovementListItemDto | null>(null);
  protected readonly outboundWarehouseId = signal('');
  protected readonly outboundQuantity = signal<number>(1);
  protected readonly outboundLotCode = signal('');
  protected readonly outboundLotSearch = signal('');
  protected readonly outboundLotDropdownOpen = signal(false);
  protected readonly outboundRegisteredAt = signal(this.nowForDatetimeLocal());
  protected readonly outboundTransferReasonId = signal('');
  protected readonly outboundComment = signal('');
  protected readonly adjustmentOpen = signal(false);
  protected readonly adjustmentProduct = signal<InventoryMovementListItemDto | null>(null);
  protected readonly adjustmentWarehouseId = signal('');
  protected readonly adjustmentCountedQty = signal<number>(0);
  protected readonly adjustmentLotCode = signal('');
  protected readonly adjustmentReason = signal('');
  protected readonly pendingOpen = signal(false);

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
  protected readonly inboundLotCodesQuery = injectQuery(() => {
    const product = this.inboundProduct();
    const warehouseId = this.inboundWarehouseId();
    const search = this.inboundLotSearch().trim();
    return {
      queryKey: [...inventoryMovementQueryKeys.all, 'lot-codes', 'inbound', product?.productId ?? '', warehouseId, search],
      queryFn: () =>
        product && warehouseId && search.length >= 1
          ? firstValueFrom(
              this.api.searchInventoryLotCodes({
                productId: product.productId,
                warehouseId,
                search,
                mode: 'INBOUND',
              }),
            )
          : Promise.resolve([]),
    };
  });
  protected readonly outboundLotCodesQuery = injectQuery(() => {
    const product = this.outboundProduct();
    const warehouseId = this.outboundWarehouseId();
    const search = this.outboundLotSearch().trim();
    return {
      queryKey: [...inventoryMovementQueryKeys.all, 'lot-codes', 'outbound', product?.productId ?? '', warehouseId, search],
      queryFn: () =>
        product && warehouseId && search.length >= 1
          ? firstValueFrom(
              this.api.searchInventoryLotCodes({
                productId: product.productId,
                warehouseId,
                search,
                mode: 'OUTBOUND',
              }),
            )
          : Promise.resolve([]),
    };
  });
  protected readonly inboundLotOptions = computed(() => this.inboundLotCodesQuery.data() ?? []);
  protected readonly outboundLotOptions = computed(() => this.outboundLotCodesQuery.data() ?? []);
  protected readonly inboundMutation = injectMutation(() => ({
    mutationFn: (body: InventoryCreateInboundRequest) =>
      firstValueFrom(this.api.createInventoryInboundMovement(body)),
    onSuccess: () => {
      this.notify.success('Ingreso registrado correctamente.');
      this.closeInboundModal(true);
      void this.queryClient.invalidateQueries({ queryKey: inventoryMovementQueryKeys.all });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar el ingreso')),
  }));
  protected readonly inboundPending = computed(() => this.inboundMutation.isPending());
  protected readonly outboundMutation = injectMutation(() => ({
    mutationFn: (body: InventoryCreateOutboundRequest) =>
      firstValueFrom(this.api.createInventoryOutboundMovement(body)),
    onSuccess: () => {
      this.notify.success('Salida registrada correctamente.');
      this.closeOutboundModal(true);
      void this.queryClient.invalidateQueries({ queryKey: inventoryMovementQueryKeys.all });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar la salida')),
  }));
  protected readonly outboundPending = computed(() => this.outboundMutation.isPending());

  protected readonly adjustmentMutation = injectMutation(() => ({
    mutationFn: (body: CreateInventoryAdjustmentRequest) =>
      firstValueFrom(this.api.createInventoryAdjustment(body)),
    onSuccess: (result) => {
      this.notify.success(result.message);
      this.closeAdjustmentModal(true);
      void this.queryClient.invalidateQueries({ queryKey: inventoryMovementQueryKeys.all });
      void this.queryClient.invalidateQueries({ queryKey: ['inventory', 'adjustments', 'pending'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar el ajuste')),
  }));
  protected readonly adjustmentPending = computed(() => this.adjustmentMutation.isPending());

  protected readonly pendingAdjustmentsQuery = injectQuery(() => ({
    queryKey: ['inventory', 'adjustments', 'pending'] as const,
    enabled: this.pendingOpen(),
    queryFn: () => firstValueFrom(this.api.listPendingInventoryAdjustments()),
  }));

  protected readonly approveAdjustmentMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.approveInventoryAdjustment(id)),
    onSuccess: (res) => {
      this.notify.success(res.message);
      void this.queryClient.invalidateQueries({ queryKey: ['inventory', 'adjustments', 'pending'] });
      void this.queryClient.invalidateQueries({ queryKey: inventoryMovementQueryKeys.all });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo aprobar')),
  }));

  protected readonly rejectAdjustmentMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.rejectInventoryAdjustment(id)),
    onSuccess: (res) => {
      this.notify.success(res.message);
      void this.queryClient.invalidateQueries({ queryKey: ['inventory', 'adjustments', 'pending'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo rechazar')),
  }));

  protected readonly pendingRows = computed(() => this.pendingAdjustmentsQuery.data() ?? []);

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

  protected openInboundModal(row: InventoryMovementListItemDto) {
    this.inboundProduct.set(row);
    this.inboundWarehouseId.set(this.findWarehouseIdByName(row.almacen));
    this.inboundQuantity.set(1);
    this.inboundLotCode.set('');
    this.inboundLotSearch.set('');
    this.inboundLotDropdownOpen.set(false);
    this.inboundExpirationDate.set('');
    this.inboundRegisteredAt.set(this.nowForDatetimeLocal());
    this.inboundTransferReasonId.set('');
    this.inboundComment.set('');
    this.inboundOpen.set(true);
  }

  protected closeInboundModal(force = false) {
    if (!force && this.inboundPending()) return;
    this.inboundOpen.set(false);
    this.inboundProduct.set(null);
  }

  protected processInbound() {
    const product = this.inboundProduct();
    const quantity = this.inboundQuantity();
    const warehouseId = this.inboundWarehouseId();
    const transferReasonId = this.inboundTransferReasonId();
    if (!product) {
      this.notify.warning('Seleccione un producto.');
      return;
    }
    if (!warehouseId) {
      this.notify.warning('Seleccione un almacén.');
      return;
    }
    if (!transferReasonId) {
      this.notify.warning('Seleccione un motivo de traslado.');
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      this.notify.warning('La cantidad debe ser mayor a cero.');
      return;
    }
    const body: InventoryCreateInboundRequest = {
      productId: product.productId,
      warehouseId,
      transferReasonId,
      quantity,
      lotCode: this.inboundLotCode().trim() || undefined,
      expirationDate: this.inboundExpirationDate() || undefined,
      registeredAt: this.inboundRegisteredAt() ? new Date(this.inboundRegisteredAt()).toISOString() : undefined,
      comment: this.inboundComment().trim() || undefined,
    };
    this.inboundMutation.mutate(body);
  }

  protected onInboundCommentInput(event: Event) {
    const target = event.target as HTMLTextAreaElement | null;
    this.inboundComment.set(target?.value ?? '');
  }

  protected openOutboundModal(row: InventoryMovementListItemDto) {
    this.outboundProduct.set(row);
    this.outboundWarehouseId.set(this.findWarehouseIdByName(row.almacen));
    this.outboundQuantity.set(1);
    this.outboundLotCode.set('');
    this.outboundLotSearch.set('');
    this.outboundLotDropdownOpen.set(false);
    this.outboundRegisteredAt.set(this.nowForDatetimeLocal());
    this.outboundTransferReasonId.set('');
    this.outboundComment.set('');
    this.outboundOpen.set(true);
  }

  protected closeOutboundModal(force = false) {
    if (!force && this.outboundPending()) return;
    this.outboundOpen.set(false);
    this.outboundProduct.set(null);
  }

  protected processOutbound() {
    const product = this.outboundProduct();
    const quantity = this.outboundQuantity();
    const warehouseId = this.outboundWarehouseId();
    const transferReasonId = this.outboundTransferReasonId();
    if (!product) {
      this.notify.warning('Seleccione un producto.');
      return;
    }
    if (!warehouseId) {
      this.notify.warning('Seleccione un almacén.');
      return;
    }
    if (!transferReasonId) {
      this.notify.warning('Seleccione un motivo de salida.');
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      this.notify.warning('La cantidad debe ser mayor a cero.');
      return;
    }
    const body: InventoryCreateOutboundRequest = {
      productId: product.productId,
      warehouseId,
      transferReasonId,
      quantity,
      lotCode: this.outboundLotCode().trim() || undefined,
      registeredAt: this.outboundRegisteredAt() ? new Date(this.outboundRegisteredAt()).toISOString() : undefined,
      comment: this.outboundComment().trim() || undefined,
    };
    this.outboundMutation.mutate(body);
  }

  protected onOutboundCommentInput(event: Event) {
    const target = event.target as HTMLTextAreaElement | null;
    this.outboundComment.set(target?.value ?? '');
  }

  protected onInboundLotInput(value: string | number) {
    const text = String(value ?? '');
    this.inboundLotCode.set(text);
    this.inboundLotSearch.set(text);
    this.inboundLotDropdownOpen.set(true);
  }

  protected onOutboundLotInput(value: string | number) {
    const text = String(value ?? '');
    this.outboundLotCode.set(text);
    this.outboundLotSearch.set(text);
    this.outboundLotDropdownOpen.set(true);
  }

  protected onInboundLotFocus() {
    this.inboundLotDropdownOpen.set(true);
  }

  protected onOutboundLotFocus() {
    this.outboundLotDropdownOpen.set(true);
  }

  protected onInboundLotBlur() {
    window.setTimeout(() => this.inboundLotDropdownOpen.set(false), 150);
  }

  protected onOutboundLotBlur() {
    window.setTimeout(() => this.outboundLotDropdownOpen.set(false), 150);
  }

  protected selectInboundLot(code: string, expirationDate: string | null) {
    this.inboundLotCode.set(code);
    this.inboundLotSearch.set(code);
    if (expirationDate) {
      this.inboundExpirationDate.set(expirationDate.slice(0, 10));
    }
    this.inboundLotDropdownOpen.set(false);
  }

  protected selectOutboundLot(code: string) {
    this.outboundLotCode.set(code);
    this.outboundLotSearch.set(code);
    this.outboundLotDropdownOpen.set(false);
  }

  protected formatLotStock(value: string) {
    const parsed = Number.parseFloat(value || '0');
    if (!Number.isFinite(parsed)) return '0';
    return parsed.toLocaleString('es-PE', { maximumFractionDigits: 2 });
  }

  protected openAdjustmentModal(row: InventoryMovementListItemDto) {
    this.adjustmentProduct.set(row);
    this.adjustmentWarehouseId.set(this.findWarehouseIdByName(row.almacen));
    this.adjustmentCountedQty.set(Number.parseFloat(row.stock) || 0);
    this.adjustmentLotCode.set('');
    this.adjustmentReason.set('');
    this.adjustmentOpen.set(true);
  }

  protected closeAdjustmentModal(force = false) {
    if (!force && this.adjustmentPending()) return;
    this.adjustmentOpen.set(false);
    this.adjustmentProduct.set(null);
  }

  protected processAdjustment() {
    const product = this.adjustmentProduct();
    const warehouseId = this.adjustmentWarehouseId();
    const countedQuantity = this.adjustmentCountedQty();
    const reason = this.adjustmentReason().trim();
    if (!product) {
      this.notify.warning('Seleccione un producto.');
      return;
    }
    if (!warehouseId) {
      this.notify.warning('Seleccione un almacén.');
      return;
    }
    if (!reason) {
      this.notify.warning('Indique el motivo del ajuste.');
      return;
    }
    if (!Number.isFinite(countedQuantity) || countedQuantity < 0) {
      this.notify.warning('La cantidad contada debe ser válida.');
      return;
    }
    this.adjustmentMutation.mutate({
      productId: product.productId,
      warehouseId,
      countedQuantity,
      lotCode: this.adjustmentLotCode().trim() || undefined,
      reason,
    });
  }

  protected onAdjustmentReasonInput(event: Event) {
    const target = event.target as HTMLTextAreaElement | null;
    this.adjustmentReason.set(target?.value ?? '');
  }

  protected openPendingAdjustmentsModal() {
    this.pendingOpen.set(true);
    void this.pendingAdjustmentsQuery.refetch();
  }

  protected closePendingAdjustmentsModal() {
    this.pendingOpen.set(false);
  }

  protected approvePending(row: InventoryPendingAdjustmentDto) {
    this.approveAdjustmentMutation.mutate(row.id);
  }

  protected rejectPending(row: InventoryPendingAdjustmentDto) {
    this.rejectAdjustmentMutation.mutate(row.id);
  }

  protected formatAdjustmentQty(value: string) {
    const parsed = Number.parseFloat(value || '0');
    if (!Number.isFinite(parsed)) return value;
    const sign = parsed > 0 ? '+' : '';
    return `${sign}${parsed.toLocaleString('es-PE', { maximumFractionDigits: 4 })}`;
  }

  private findWarehouseIdByName(name: string): string {
    const warehouses = this.warehousesQuery.data() ?? [];
    const normalized = name.trim().toLowerCase();
    const byWarehouse = warehouses.find((w) => w.nombre.trim().toLowerCase() === normalized);
    if (byWarehouse) return byWarehouse.id;
    const byEstablishment = warehouses.find((w) => w.establishment.nombre.trim().toLowerCase() === normalized);
    return byEstablishment?.id ?? '';
  }

  private nowForDatetimeLocal() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.locale.timeZone(),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date());
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value ?? '00';
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
  }
}
