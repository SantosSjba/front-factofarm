import { CommonModule } from '@angular/common';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
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
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { AlertComponent } from '../../../../shared/components/ui/alert/alert.component';
import { BadgeComponent } from '../../../../shared/components/ui/badge/badge.component';
import { ColorLegendComponent, type LegendItem, type LegendTone } from '../../../../shared/components/ui/color-legend/color-legend.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { CheckboxComponent } from '../../../../shared/components/form/input/checkbox.component';
import { FormSectionComponent } from '../../../../shared/components/form/form-section/form-section.component';
import { SearchSelectComponent } from '../../../../shared/components/form/search-select/search-select.component';
import { SuggestInputComponent } from '../../../../shared/components/form/suggest-input/suggest-input.component';
import { STOCK_LEVEL_LABELS, stockLevel, type StockLevel } from '../../../../core/utils/stock-level';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import type {
  CreateInventoryAdjustmentRequest,
  InventoryCreateInboundRequest,
  InventoryInboundPricingDto,
  InventoryCreateOutboundRequest,
  InventoryImportMode,
  InventoryMovementListFiltersRequest,
  InventoryMovementListItemDto,
  InventoryLotCodeOptionDto,
  InventoryPendingAdjustmentDto,
  ProductImportResultDto,
} from '../../models/directory.models';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { DirectoryApiService } from '../../services/directory-api.service';
import { LocaleService } from '../../../../core/services/locale.service';
import { MenuItemComponent } from '../../../../shared/components/ui/menu-item/menu-item.component';
import { FileInputComponent } from '../../../../shared/components/form/input/file-input.component';
import { TextAreaComponent } from '../../../../shared/components/form/input/text-area.component';

import { QuickCreateComponent } from '../../components/quick-create/quick-create.component';
import { ExcelIconComponent } from '../../../../shared/icons/excel-icon.component';

type InventoryColumnKey = 'codigoInterno' | 'marca' | 'almacen';

/** Producto sobre el que se registra el movimiento: desde una fila o desde el buscador. */
type StockTarget = Pick<InventoryMovementListItemDto, 'productId' | 'producto' | 'codigoInterno'> &
  Partial<Pick<InventoryMovementListItemDto, 'warehouseId' | 'stock' | 'manejaLotes'>>;

const STOCK_TONES: Record<StockLevel, LegendTone | null> = {
  normal: null,
  bajo: 'warning',
  critico: 'error-light',
  agotado: 'error',
};

const STOCK_TEXT_CLASSES: Record<StockLevel, string> = {
  normal: 'text-success-600 dark:text-success-500',
  bajo: 'text-warning-700 dark:text-warning-400',
  critico: 'text-error-600 dark:text-error-400',
  agotado: 'text-error-700 dark:text-error-400',
};

@Component({
  selector: 'app-inventario-movimientos',
  standalone: true,
  imports: [
    AlertComponent,
    BadgeComponent,
    CheckboxComponent,
    ColorLegendComponent,
    ExcelIconComponent,
    FormSectionComponent,
    HelpPanelComponent,
    QuickCreateComponent,
    SearchSelectComponent,
    SuggestInputComponent,
    TextAreaComponent,
    FileInputComponent,
    MenuItemComponent,
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
    InputFieldComponent,
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
  protected readonly stockLegend: LegendItem[] = [
    { label: STOCK_LEVEL_LABELS.normal, tone: 'success' },
    { label: STOCK_LEVEL_LABELS.bajo, tone: 'warning' },
    { label: STOCK_LEVEL_LABELS.critico, tone: 'error-light' },
    { label: STOCK_LEVEL_LABELS.agotado, tone: 'error' },
  ];
  protected readonly columns: { key: InventoryColumnKey; label: string }[] = [
    { key: 'codigoInterno', label: 'Cód. Interno' },
    { key: 'marca', label: 'Marca' },
    { key: 'almacen', label: 'Almacén' },
  ];
  protected readonly visibleColumns = signal<Record<InventoryColumnKey, boolean>>({
    codigoInterno: true,
    marca: true,
    almacen: true,
  });

  protected readonly itemsPerPage = 10;
  protected readonly exporting = signal(false);
  protected readonly searchTerm = signal('');
  protected readonly filterField = signal<NonNullable<InventoryMovementListFiltersRequest['field']>>('all');
  protected readonly filterCategoryId = signal('');
  protected readonly filterWarehouseId = signal('');
  protected readonly currentPage = signal(1);
  protected readonly fieldFilterOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'producto', label: 'Producto o código' },
    { value: 'marca', label: 'Marca' },
    { value: 'almacen', label: 'Almacén' },
  ];

  private readonly activeFilters = computed<InventoryMovementListFiltersRequest>(() => ({
    search: this.searchTerm().trim() || undefined,
    field: this.filterField(),
    categoryId: this.filterCategoryId() || undefined,
    warehouseId: this.filterWarehouseId() || undefined,
  }));
  protected readonly activeFilterCount = computed(
    () =>
      [this.filterField() !== 'all', !!this.filterCategoryId(), !!this.filterWarehouseId()].filter(Boolean)
        .length,
  );

  protected readonly listQuery = injectQuery(() => {
    const filters: InventoryMovementListFiltersRequest = {
      ...this.activeFilters(),
      page: this.currentPage(),
      pageSize: this.itemsPerPage,
    };
    return {
      queryKey: inventoryMovementQueryKeys.list(filters),
      queryFn: () => firstValueFrom(this.api.listInventoryMovements(filters)),
    };
  });

  protected readonly categoriesQuery = injectQuery(() => ({
    queryKey: ['categories', 'list', '', 'all'],
    queryFn: () => firstValueFrom(this.api.listCategories({ field: 'nombre' })),
  }));
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
  protected readonly categoryFilterOptions = computed(() =>
    (this.categoriesQuery.data() ?? []).map((row) => ({ value: row.id, label: row.nombre })),
  );
  protected readonly warehouseOptions = computed(() =>
    (this.warehousesQuery.data() ?? []).map((w) => ({
      value: w.id,
      label: `${w.nombre} · ${w.establishment.nombre}`,
    })),
  );
  protected readonly transferReasonOptions = computed(() =>
    (this.transferReasonsQuery.data() ?? []).map((row) => ({ value: row.id, label: row.nombre })),
  );
  protected readonly outputReasonOptions = computed(() =>
    (this.outputReasonsQuery.data() ?? []).map((row) => ({ value: row.id, label: row.nombre })),
  );

  protected readonly importOpen = signal(false);
  protected readonly importMode = signal<InventoryImportMode>('LOTES');
  protected readonly importWarehouseId = signal('');
  protected readonly importFile = signal<File | null>(null);
  protected readonly importResult = signal<ProductImportResultDto | null>(null);

  protected readonly inboundOpen = signal(false);
  /** Abierto desde «Registrar ingreso»: el producto se elige con el buscador. */
  protected readonly inboundFromSearch = signal(false);
  protected readonly inboundProduct = signal<StockTarget | null>(null);
  protected readonly inboundPickerTerm = signal('');
  protected readonly inboundPickerReset = signal(0);
  protected readonly inboundWarehouseId = signal('');
  protected readonly inboundQuantity = signal<number>(1);
  /** Precio de compra: valoriza este ingreso y, si cambió, actualiza el del producto. */
  protected readonly inboundPurchasePrice = signal('');
  protected readonly inboundSalePrice = signal('');
  protected readonly inboundLotCode = signal('');
  protected readonly inboundLotSearch = signal('');
  protected readonly inboundExpirationDate = signal('');
  /** El lote elegido ya existe: su vencimiento no se puede cambiar desde aquí. */
  protected readonly inboundExpiryLocked = signal(false);
  protected readonly inboundRegisteredAt = signal(this.nowForDatetimeLocal());
  protected readonly inboundTransferReasonId = signal('');
  protected readonly inboundReference = signal('');
  protected readonly inboundComment = signal('');
  private inboundKeepOpen = false;

  protected readonly outboundOpen = signal(false);
  protected readonly outboundProduct = signal<StockTarget | null>(null);
  protected readonly outboundWarehouseId = signal('');
  protected readonly outboundQuantity = signal<number>(1);
  protected readonly outboundLotCode = signal('');
  protected readonly outboundLotSearch = signal('');
  protected readonly outboundRegisteredAt = signal(this.nowForDatetimeLocal());
  protected readonly outboundTransferReasonId = signal('');
  protected readonly outboundComment = signal('');

  protected readonly adjustmentOpen = signal(false);
  protected readonly adjustmentProduct = signal<StockTarget | null>(null);
  protected readonly adjustmentWarehouseId = signal('');
  protected readonly adjustmentCountedQty = signal<number>(0);
  protected readonly adjustmentLotCode = signal('');
  protected readonly adjustmentLotSearch = signal('');
  /** Stock del lote elegido; con un lote, el conteo se compara contra él y no contra el total. */
  protected readonly adjustmentLotStock = signal<string | null>(null);
  protected readonly adjustmentReason = signal('');
  protected readonly pendingOpen = signal(false);

  protected readonly inboundPickerQuery = injectQuery(() => {
    const search = this.inboundPickerTerm();
    return {
      queryKey: ['products', 'inbound-picker', search],
      enabled: this.inboundOpen() && !this.inboundProduct(),
      queryFn: () =>
        firstValueFrom(
          this.api.listProducts({ search: search || undefined, field: 'all', page: 1, pageSize: 20 }),
        ),
    };
  });
  protected readonly inboundPickerOptions = computed(() =>
    (this.inboundPickerQuery.data()?.items ?? []).map((x) => ({
      value: x.id,
      label: x.nombre,
      meta: x.codigoInterno ? `Cód. ${x.codigoInterno}` : '',
    })),
  );

  protected readonly inboundLotsQuery = this.lotCodesQuery(
    'INBOUND',
    this.inboundProduct,
    this.inboundWarehouseId,
    this.inboundLotSearch,
  );
  protected readonly outboundLotsQuery = this.lotCodesQuery(
    'OUTBOUND',
    this.outboundProduct,
    this.outboundWarehouseId,
    this.outboundLotSearch,
  );
  // INBOUND incluye los lotes en cero: también se puede ajustar un lote que figura sin stock.
  protected readonly adjustmentLotsQuery = this.lotCodesQuery(
    'INBOUND',
    this.adjustmentProduct,
    this.adjustmentWarehouseId,
    this.adjustmentLotSearch,
  );
  protected readonly inboundLotOptions = computed(() => this.lotOptions(this.inboundLotsQuery.data()));
  protected readonly outboundLotOptions = computed(() => this.lotOptions(this.outboundLotsQuery.data()));
  protected readonly adjustmentLotOptions = computed(() => this.lotOptions(this.adjustmentLotsQuery.data()));

  protected readonly minExpirationDate = computed(() => {
    const today = this.nowForDatetimeLocal().slice(0, 10);
    const next = new Date(`${today}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    return next.toISOString().slice(0, 10);
  });
  /** Precios vigentes del producto en el almacén elegido; se recargan al cambiar de almacén. */
  protected readonly inboundPricingQuery = injectQuery(() => {
    const productId = this.inboundProduct()?.productId ?? '';
    const warehouseId = this.inboundWarehouseId();
    return {
      queryKey: ['inventory-movements', 'inbound-pricing', productId, warehouseId],
      enabled: this.inboundOpen() && !!productId && !!warehouseId,
      queryFn: () => firstValueFrom(this.api.getInventoryInboundPricing(productId, warehouseId)),
      staleTime: 0,
    };
  });
  protected readonly inboundPricing = computed<InventoryInboundPricingDto | null>(() =>
    this.inboundPricingQuery.data() ?? null,
  );
  protected readonly canEditInboundPrices = computed(() => !!this.inboundPricing()?.puedeEditarPrecios);
  /** Precio de venta sobre el máximo DIGEMID vigente, o null si no aplica. */
  protected readonly inboundSaleOverMax = computed(() => {
    const max = this.priceNumber(this.inboundPricing()?.precioMaximoDigemid ?? '');
    const sale = this.priceNumber(this.inboundSalePrice());
    return max !== null && sale !== null && sale > max ? max : null;
  });
  protected readonly inboundSaleBlocked = computed(
    () => this.inboundSaleOverMax() !== null && !!this.inboundPricing()?.bloqueaSobreMaximo,
  );
  protected readonly inboundSaleHint = computed(() => {
    const pricing = this.inboundPricing();
    if (!pricing) return '';
    const over = this.inboundSaleOverMax();
    if (over !== null) {
      return pricing.bloqueaSobreMaximo
        ? `Supera el máximo DIGEMID de S/ ${this.formatPrice(over)}. Tu sede bloquea precios sobre el máximo.`
        : `Supera el máximo DIGEMID de S/ ${this.formatPrice(over)}. Se guardará igual, pero revisa el precio.`;
    }
    const parts: string[] = [];
    const margin = this.inboundMargin();
    if (margin) parts.push(margin);
    if (pricing.precioMaximoDigemid) parts.push(`Máximo DIGEMID: S/ ${this.formatPrice(Number(pricing.precioMaximoDigemid))}`);
    if (pricing.precioVentaOrigen === 'ALMACEN') parts.push('Precio propio de este almacén');
    return parts.join(' · ');
  });
  protected readonly inboundPurchaseHint = computed(() => {
    const pricing = this.inboundPricing();
    if (!pricing) return '';
    const previous = this.priceNumber(pricing.precioCompra ?? '');
    const current = this.priceNumber(this.inboundPurchasePrice());
    if (previous !== null && current !== null && current !== previous) {
      return `Antes: S/ ${this.formatPrice(previous)}`;
    }
    return '';
  });
  private readonly inboundMargin = computed(() => {
    const purchase = this.priceNumber(this.inboundPurchasePrice());
    const sale = this.priceNumber(this.inboundSalePrice());
    if (purchase === null || sale === null || purchase <= 0) return '';
    const pct = ((sale - purchase) / purchase) * 100;
    return `Ganancia: S/ ${this.formatPrice(sale - purchase)} (${pct.toFixed(1)}%)`;
  });
  /** Al llegar los precios de otro producto o almacén, el formulario parte de los vigentes. */
  private readonly syncInboundPrices = effect(() => {
    const pricing = this.inboundPricing();
    if (!pricing) return;
    untracked(() => {
      this.inboundPurchasePrice.set(pricing.precioCompra != null ? this.trimPrice(pricing.precioCompra) : '');
      this.inboundSalePrice.set(this.trimPrice(pricing.precioVenta));
    });
  });

  protected readonly inboundStockHint = computed(() => {
    const product = this.inboundProduct();
    if (product?.stock == null || product.warehouseId !== this.inboundWarehouseId()) return '';
    const current = Number.parseFloat(product.stock) || 0;
    return `Stock actual: ${this.formatStock(current)} · Quedará: ${this.formatStock(current + (this.inboundQuantity() || 0))}`;
  });
  protected readonly outboundStockHint = computed(() => {
    const product = this.outboundProduct();
    if (product?.stock == null || product.warehouseId !== this.outboundWarehouseId()) return '';
    return `Disponible: ${this.formatStock(product.stock)}`;
  });
  protected readonly adjustmentSystemStock = computed(
    () => this.adjustmentLotStock() ?? this.adjustmentProduct()?.stock ?? '0',
  );
  protected readonly adjustmentDifferenceHint = computed(() => {
    if (this.adjustmentProduct()?.manejaLotes && this.adjustmentLotStock() === null) return '';
    const difference = this.adjustmentCountedQty() - (Number.parseFloat(this.adjustmentSystemStock()) || 0);
    return `Diferencia: ${this.formatAdjustmentQty(String(difference))}`;
  });

  protected readonly importLotsMutation = injectMutation(() => ({
    mutationFn: ({ warehouseId, file }: { warehouseId: string; file: File }) =>
      firstValueFrom(this.api.importInventoryLots(warehouseId, file)),
    onSuccess: (result) => this.onImported(result),
    onError: (err) =>
      this.notify.error(httpErrorMessage(err, 'No se pudo importar productos con lotes')),
  }));

  protected readonly importSeriesMutation = injectMutation(() => ({
    mutationFn: ({ warehouseId, file }: { warehouseId: string; file: File }) =>
      firstValueFrom(this.api.importInventorySeries(warehouseId, file)),
    onSuccess: (result) => this.onImported(result),
    onError: (err) =>
      this.notify.error(httpErrorMessage(err, 'No se pudo importar productos con series')),
  }));

  protected readonly importPending = computed(
    () => this.importLotsMutation.isPending() || this.importSeriesMutation.isPending(),
  );
  protected readonly inboundMutation = injectMutation(() => ({
    mutationFn: (body: InventoryCreateInboundRequest) =>
      firstValueFrom(this.api.createInventoryInboundMovement(body)),
    onSuccess: (result) => {
      this.notify.success(`${result.message}.`);
      if (result.warning) this.notify.warning(result.warning);
      void this.queryClient.invalidateQueries({ queryKey: inventoryMovementQueryKeys.all });
      void this.queryClient.invalidateQueries({ queryKey: ['inventory-movements', 'inbound-pricing'] });
      void this.queryClient.invalidateQueries({ queryKey: ['products'] });
      if (this.inboundKeepOpen) this.prepareNextInbound();
      else this.closeInboundModal(true);
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

  protected isVisible(key: InventoryColumnKey) {
    return !!this.visibleColumns()[key];
  }

  protected toggleColumn(key: InventoryColumnKey) {
    this.visibleColumns.update((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  protected onSearchChange(v: string) {
    this.searchTerm.set(v);
    this.currentPage.set(1);
  }

  protected onFieldChange(v: string) {
    this.filterField.set((v || 'all') as NonNullable<InventoryMovementListFiltersRequest['field']>);
    this.currentPage.set(1);
  }

  protected clearFilters() {
    this.searchTerm.set('');
    this.filterField.set('all');
    this.filterCategoryId.set('');
    this.filterWarehouseId.set('');
    this.currentPage.set(1);
  }

  protected onPageChange(page: number) {
    this.currentPage.set(page);
  }

  protected formatStock(v: string | number) {
    const parsed = typeof v === 'number' ? v : Number.parseFloat(v || '0');
    if (!Number.isFinite(parsed)) return '0';
    return parsed.toLocaleString('es-PE', { maximumFractionDigits: 2 });
  }

  private stockLevelOf(row: InventoryMovementListItemDto) {
    return stockLevel(row.stock, row.stockMinimo);
  }

  protected rowTone(row: InventoryMovementListItemDto): LegendTone | null {
    return STOCK_TONES[this.stockLevelOf(row)];
  }

  protected stockTextClass(row: InventoryMovementListItemDto): string {
    return STOCK_TEXT_CLASSES[this.stockLevelOf(row)];
  }

  protected stockLabel(row: InventoryMovementListItemDto): string {
    return STOCK_LEVEL_LABELS[this.stockLevelOf(row)];
  }

  protected async exportRows() {
    if (this.exporting()) return;
    this.exporting.set(true);
    try {
      const blob = await firstValueFrom(this.api.exportInventory(this.activeFilters()));
      this.downloadBlob(blob, 'inventario-export.xlsx');
      this.notify.success('Exportación descargada');
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo exportar el inventario'));
    } finally {
      this.exporting.set(false);
    }
  }

  protected openImportModal(mode: InventoryImportMode) {
    this.importMode.set(mode);
    this.importWarehouseId.set(this.defaultWarehouseId());
    this.importFile.set(null);
    this.importResult.set(null);
    this.importOpen.set(true);
  }

  protected closeImportModal(force = false) {
    if (!force && this.importPending()) return;
    this.importOpen.set(false);
    this.importWarehouseId.set('');
    this.importFile.set(null);
    this.importResult.set(null);
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
      this.downloadBlob(blob, mode === 'SERIES' ? 'movement_item_lots.xlsx' : 'movement_item_lots_group.xlsx');
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

  private onImported(result: ProductImportResultDto) {
    this.importResult.set(result);
    this.notify.success(
      `Importación finalizada. Creados: ${result.created}, actualizados: ${result.updated}, errores: ${result.errors.length}`,
    );
    // Queda abierto con el resultado, para poder leer las filas con errores.
    if (!result.errors.length) this.closeImportModal(true);
    this.importFile.set(null);
    void this.queryClient.invalidateQueries({ queryKey: inventoryMovementQueryKeys.all });
  }

  private priceNumber(text: string): number | null {
    const value = Number.parseFloat(String(text).trim());
    return Number.isFinite(value) ? value : null;
  }

  private priceChanged(next: number | undefined, previous: string | null): boolean {
    if (next === undefined) return false;
    const before = previous == null ? null : Number(previous);
    return before === null || Math.abs(next - before) > 0.00005;
  }

  /** «12.5000» → «12.50»: el API guarda 4 decimales, el formulario muestra lo justo. */
  private trimPrice(value: string): string {
    const n = Number(value);
    if (!Number.isFinite(n)) return '';
    const fixed = n.toFixed(4).replace(/0+$/, '');
    const [int, dec = ''] = fixed.split('.');
    return `${int}.${dec.padEnd(2, '0')}`;
  }

  protected formatPrice(value: number): string {
    return value.toFixed(2);
  }

  /** «Registrar ingreso»: el producto se busca dentro del modal. */
  protected openNewInboundModal() {
    this.resetInboundForm();
    this.inboundFromSearch.set(true);
    this.inboundProduct.set(null);
    this.inboundWarehouseId.set(this.defaultWarehouseId());
    this.inboundOpen.set(true);
  }

  protected openInboundModal(row: InventoryMovementListItemDto) {
    this.resetInboundForm();
    this.inboundFromSearch.set(false);
    this.inboundProduct.set(row);
    this.inboundWarehouseId.set(row.warehouseId);
    this.inboundOpen.set(true);
  }

  private resetInboundForm() {
    this.inboundPickerTerm.set('');
    this.inboundPickerReset.update((n) => n + 1);
    this.resetInboundProductFields();
    this.inboundRegisteredAt.set(this.nowForDatetimeLocal());
    this.inboundTransferReasonId.set(
      this.transferReasonsQuery.data()?.find((row) => row.codigo === 'COMPRA_NACIONAL')?.id ?? '',
    );
    this.inboundReference.set('');
    this.inboundComment.set('');
  }

  private resetInboundProductFields() {
    this.inboundQuantity.set(1);
    this.inboundPurchasePrice.set('');
    this.inboundSalePrice.set('');
    this.inboundLotCode.set('');
    this.inboundLotSearch.set('');
    this.inboundExpirationDate.set('');
    this.inboundExpiryLocked.set(false);
  }

  /** Mantiene almacén, motivo, fecha y documento: suelen repetirse en una misma recepción. */
  private prepareNextInbound() {
    this.inboundFromSearch.set(true);
    this.clearInboundProduct();
  }

  protected selectInboundProduct(productId: string) {
    const product = this.inboundPickerQuery.data()?.items.find((x) => x.id === productId);
    if (!product) return;
    this.inboundProduct.set({
      productId: product.id,
      producto: product.nombre,
      codigoInterno: product.codigoInterno ?? null,
      manejaLotes: product.manejaLotes,
    });
  }

  protected clearInboundProduct() {
    this.inboundProduct.set(null);
    this.inboundPickerTerm.set('');
    this.inboundPickerReset.update((n) => n + 1);
    this.resetInboundProductFields();
  }

  protected closeInboundModal(force = false) {
    if (!force && this.inboundPending()) return;
    this.inboundOpen.set(false);
    this.inboundProduct.set(null);
  }

  protected processInbound(keepOpen = false) {
    const product = this.inboundProduct();
    const quantity = this.inboundQuantity();
    const warehouseId = this.inboundWarehouseId();
    const transferReasonId = this.inboundTransferReasonId();
    const lotCode = this.inboundLotCode().trim();
    const expirationDate = this.inboundExpirationDate();
    const pricing = this.inboundPricing();
    const purchaseText = this.inboundPurchasePrice().trim();
    const unitCost = purchaseText ? Number(purchaseText) : undefined;
    const saleText = this.inboundSalePrice().trim();
    const salePrice = saleText ? Number(saleText) : undefined;
    if (!product) {
      this.notify.warning('Seleccione un producto.');
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      this.notify.warning('La cantidad debe ser mayor a cero.');
      return;
    }
    if (unitCost !== undefined && (!Number.isFinite(unitCost) || unitCost < 0)) {
      this.notify.warning('El precio de compra no puede ser negativo.');
      return;
    }
    if (pricing?.puedeEditarPrecios && (salePrice === undefined || !Number.isFinite(salePrice) || salePrice <= 0)) {
      this.notify.warning('El precio de venta debe ser mayor a cero.');
      return;
    }
    if (this.inboundSaleBlocked()) {
      this.notify.warning(
        `El precio de venta supera el máximo DIGEMID de S/ ${this.formatPrice(this.inboundSaleOverMax() ?? 0)} y tu sede bloquea precios sobre el máximo.`,
      );
      return;
    }
    if (!warehouseId) {
      this.notify.warning('Seleccione un almacén.');
      return;
    }
    if (product.manejaLotes && !lotCode) {
      this.notify.warning('Este producto maneja lotes: indique el código de lote.');
      return;
    }
    if (product.manejaLotes && !expirationDate) {
      this.notify.warning('Este producto maneja lotes: indique la fecha de vencimiento.');
      return;
    }
    if (expirationDate && expirationDate < this.minExpirationDate()) {
      this.notify.warning('La fecha de vencimiento debe ser posterior a hoy: no se ingresa mercadería vencida.');
      return;
    }
    if (!transferReasonId) {
      this.notify.warning('Seleccione un motivo.');
      return;
    }
    this.inboundKeepOpen = keepOpen;
    const body: InventoryCreateInboundRequest = {
      productId: product.productId,
      warehouseId,
      transferReasonId,
      quantity,
      unitCost,
      lotCode: lotCode || undefined,
      expirationDate: expirationDate || undefined,
      registeredAt: this.inboundRegisteredAt() ? new Date(this.inboundRegisteredAt()).toISOString() : undefined,
      reference: this.inboundReference().trim() || undefined,
      comment: this.inboundComment().trim() || undefined,
      // Solo viajan los precios que cambiaron, para no ensuciar el historial de precios.
      purchasePrice:
        pricing?.puedeEditarPrecios && this.priceChanged(unitCost, pricing.precioCompra) ? unitCost : undefined,
      salePrice:
        pricing?.puedeEditarPrecios && this.priceChanged(salePrice, pricing.precioVenta) ? salePrice : undefined,
    };
    this.inboundMutation.mutate(body);
  }

  protected openOutboundModal(row: InventoryMovementListItemDto) {
    this.outboundProduct.set(row);
    this.outboundWarehouseId.set(row.warehouseId);
    this.outboundQuantity.set(1);
    this.outboundLotCode.set('');
    this.outboundLotSearch.set('');
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
    if (!Number.isFinite(quantity) || quantity <= 0) {
      this.notify.warning('La cantidad debe ser mayor a cero.');
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

  protected onInboundLotInput(value: string) {
    this.inboundLotCode.set(value);
    if (this.inboundExpiryLocked()) {
      this.inboundExpiryLocked.set(false);
      this.inboundExpirationDate.set('');
    }
  }

  protected selectInboundLot(code: string) {
    const lot = this.inboundLotsQuery.data()?.find((row) => row.codigoLote === code);
    if (!lot?.fechaVencimiento) return;
    this.inboundExpirationDate.set(lot.fechaVencimiento.slice(0, 10));
    this.inboundExpiryLocked.set(true);
  }

  protected openAdjustmentModal(row: InventoryMovementListItemDto) {
    this.adjustmentProduct.set(row);
    this.adjustmentWarehouseId.set(row.warehouseId);
    this.adjustmentCountedQty.set(Number.parseFloat(row.stock) || 0);
    this.adjustmentLotCode.set('');
    this.adjustmentLotSearch.set('');
    this.adjustmentLotStock.set(null);
    this.adjustmentReason.set('');
    this.adjustmentOpen.set(true);
  }

  protected onAdjustmentLotInput(value: string) {
    this.adjustmentLotCode.set(value);
    this.adjustmentLotStock.set(null);
  }

  protected selectAdjustmentLot(code: string) {
    const lot = this.adjustmentLotsQuery.data()?.find((row) => row.codigoLote === code);
    if (!lot) return;
    this.adjustmentLotStock.set(lot.stock);
    this.adjustmentCountedQty.set(Number.parseFloat(lot.stock) || 0);
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
    const lotCode = this.adjustmentLotCode().trim();
    const reason = this.adjustmentReason().trim();
    if (!product) {
      this.notify.warning('Seleccione un producto.');
      return;
    }
    if (!warehouseId) {
      this.notify.warning('Seleccione un almacén.');
      return;
    }
    if (product.manejaLotes && !lotCode) {
      this.notify.warning('Este producto maneja lotes: indique el lote a ajustar.');
      return;
    }
    if (!Number.isFinite(countedQuantity) || countedQuantity < 0) {
      this.notify.warning('La cantidad contada debe ser válida.');
      return;
    }
    if (!reason) {
      this.notify.warning('Indique el motivo del ajuste.');
      return;
    }
    this.adjustmentMutation.mutate({
      productId: product.productId,
      warehouseId,
      countedQuantity,
      lotCode: lotCode || undefined,
      reason,
    });
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

  private lotCodesQuery(
    mode: 'INBOUND' | 'OUTBOUND',
    product: () => StockTarget | null,
    warehouseId: () => string,
    search: () => string,
  ) {
    return injectQuery(() => {
      const productId = product()?.productId ?? '';
      const warehouse = warehouseId();
      const term = search().trim();
      return {
        queryKey: [...inventoryMovementQueryKeys.all, 'lot-codes', mode, productId, warehouse, term],
        enabled: !!productId && !!warehouse && product()?.manejaLotes !== false,
        queryFn: () =>
          firstValueFrom(
            this.api.searchInventoryLotCodes({ productId, warehouseId: warehouse, search: term, mode }),
          ),
      };
    });
  }

  private lotOptions(lots: InventoryLotCodeOptionDto[] | undefined) {
    return (lots ?? []).map((lot) => ({
      value: lot.codigoLote,
      label: lot.codigoLote,
      meta: `Stock: ${this.formatStock(lot.stock)}${lot.fechaVencimiento ? ` · Vence ${lot.fechaVencimiento.slice(0, 10).split('-').reverse().join('/')}` : ''}`,
    }));
  }

  /** Con un solo almacén no hay nada que elegir. */
  private defaultWarehouseId() {
    const warehouses = this.warehousesQuery.data() ?? [];
    return warehouses.length === 1 ? warehouses[0].id : '';
  }

  private downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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
