import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { TableDropdownComponent } from '../../../../shared/components/common/table-dropdown/table-dropdown.component';
import { FormSectionComponent } from '../../../../shared/components/form/form-section/form-section.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { TextAreaComponent } from '../../../../shared/components/form/input/text-area.component';
import { QuantityStepperComponent } from '../../../../shared/components/form/quantity-stepper/quantity-stepper.component';
import { SearchSelectComponent } from '../../../../shared/components/form/search-select/search-select.component';
import { StatusBadgeComponent } from '../../../../shared/components/ui/badge/status-badge.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { HelpHintComponent } from '../../../../shared/components/ui/help-hint/help-hint.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { MenuItemComponent } from '../../../../shared/components/ui/menu-item/menu-item.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { QuickCreateComponent } from '../../components/quick-create/quick-create.component';
import type { ProductListItemDto, PurchaseOrderDraft, PurchaseOrderListItemDto, PurchaseOrderStatus } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';
import {
  PURCHASE_ORDER_STATUS_OPTIONS,
  canApprovePurchaseOrder,
  canCancelPurchaseOrder,
  canReceivePurchaseOrder,
  canSendPurchaseOrder,
  purchaseOrderStatusLabel,
} from '../../utils/purchase-order-status';

/** Línea de la orden. `priceFromSupplier`: el costo vino de «Productos que vende» del proveedor. */
type OrderLine = {
  productId: string;
  nombre: string;
  codigoInterno: string | null;
  quantity: number;
  unitPrice: number | null;
  /** Costo general del producto, para volver a él si el proveedor no tiene precio. */
  basePrice: number | null;
  priceFromSupplier: boolean;
  /** El usuario escribió el costo: no se reemplaza al cambiar de proveedor. */
  priceEdited: boolean;
};

type OrderAction = 'approve' | 'send' | 'cancel';

const ACTION_COPY: Record<OrderAction, { title: string; button: string; icon: string; done: string }> = {
  approve: { title: 'Aprobar orden', button: 'Aprobar', icon: 'mdi:check-decagram-outline', done: 'Orden aprobada' },
  send: { title: 'Marcar como enviada', button: 'Marcar como enviada', icon: 'mdi:send-outline', done: 'Orden marcada como enviada' },
  cancel: { title: 'Anular orden', button: 'Anular', icon: 'mdi:cancel', done: 'Orden anulada' },
};

@Component({
  selector: 'app-ordenes-compra',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    AppDatePipe,
    QueryPageStatePipe,
    BreadcrumbInlineComponent,
    ButtonComponent,
    ComponentCardComponent,
    FormSectionComponent,
    FormSelectComponent,
    HasPermissionDirective,
    HelpHintComponent,
    HelpPanelComponent,
    InputFieldComponent,
    ListFiltersComponent,
    MenuItemComponent,
    ModalComponent,
    PageToolbarComponent,
    PaginationComponent,
    QuantityStepperComponent,
    QuickCreateComponent,
    SearchSelectComponent,
    StatusBadgeComponent,
    TableDropdownComponent,
    TextAreaComponent,
  ],
  templateUrl: './ordenes-compra.component.html',
})
export class OrdenesCompraComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly router = inject(Router);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Compras' }, { label: 'Órdenes de compra' }];
  protected readonly statusLabel = purchaseOrderStatusLabel;
  protected readonly canApprove = canApprovePurchaseOrder;
  protected readonly canSend = canSendPurchaseOrder;
  protected readonly canCancel = canCancelPurchaseOrder;
  protected readonly canReceive = canReceivePurchaseOrder;

  // ---------- Listado ----------
  protected readonly pageSize = 10;
  protected readonly page = signal(1);
  protected readonly search = signal('');
  protected readonly estado = signal('');
  protected readonly filterSupplierId = signal('');
  protected readonly estadoOptions = [{ value: '', label: 'Todos los estados' }, ...PURCHASE_ORDER_STATUS_OPTIONS];
  protected readonly activeFilterCount = computed(() => [this.estado(), this.filterSupplierId()].filter(Boolean).length);

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['purchase-orders', this.page(), this.estado(), this.filterSupplierId(), this.search().trim()] as const,
    queryFn: () =>
      firstValueFrom(
        this.api.listPurchaseOrders({
          page: this.page(),
          pageSize: this.pageSize,
          estado: (this.estado() || undefined) as PurchaseOrderStatus | undefined,
          supplierId: this.filterSupplierId() || undefined,
          search: this.search().trim() || undefined,
        }),
      ),
  }));
  protected readonly rows = computed(() => this.listQuery.data()?.items ?? []);
  protected readonly totalRows = computed(() => this.listQuery.data()?.total ?? 0);

  protected readonly suppliersQuery = injectQuery(() => ({
    queryKey: ['suppliers', 'options'] as const,
    queryFn: () => firstValueFrom(this.api.listSupplierOptions()),
  }));
  protected readonly supplierOptions = computed(() =>
    (this.suppliersQuery.data() ?? []).map((s) => ({ value: s.id, label: s.razonSocial })),
  );
  protected readonly supplierFilterOptions = computed(() => [{ value: '', label: 'Todos los proveedores' }, ...this.supplierOptions()]);

  protected readonly warehousesQuery = injectQuery(() => ({
    queryKey: ['inventory', 'warehouses'] as const,
    queryFn: () => firstValueFrom(this.api.listInventoryMovementWarehouses()),
  }));
  protected readonly warehouseOptions = computed(() =>
    (this.warehousesQuery.data() ?? []).map((w) => ({ value: w.id, label: `${w.nombre} · ${w.establishment.nombre}` })),
  );

  // ---------- Detalle ----------
  protected readonly detailId = signal<string | null>(null);
  protected readonly detailQuery = injectQuery(() => ({
    queryKey: ['purchase-order', this.detailId()] as const,
    queryFn: () => firstValueFrom(this.api.getPurchaseOrder(this.detailId()!)),
    enabled: !!this.detailId(),
  }));

  // ---------- Confirmación de acciones ----------
  protected readonly pendingAction = signal<{ id: string; numero: string | null; action: OrderAction } | null>(null);
  protected readonly actionCopy = computed(() => {
    const p = this.pendingAction();
    return p ? ACTION_COPY[p.action] : null;
  });

  // ---------- Nueva orden ----------
  protected readonly createOpen = signal(false);
  /** La orden en edición viene del Sugerido de compras. */
  protected readonly fromSuggestion = signal(false);
  protected readonly supplierId = signal('');
  protected readonly warehouseId = signal('');
  protected readonly fechaEntrega = signal('');
  protected readonly condicionesPago = signal('');
  protected readonly comentario = signal('');
  protected readonly lines = signal<OrderLine[]>([]);
  protected readonly createErrors = signal<{ supplierId?: string; warehouseId?: string; lines?: string }>({});
  protected readonly pickerTerm = signal('');
  protected readonly pickerReset = signal(0);

  protected readonly pickerQuery = injectQuery(() => {
    const search = this.pickerTerm();
    return {
      queryKey: ['products', 'po-picker', search],
      enabled: this.createOpen(),
      // Catálogo completo de productos habilitados: se compra también lo que no tiene stock.
      queryFn: () =>
        firstValueFrom(this.api.listProducts({ search: search || undefined, field: 'all', habilitado: true, page: 1, pageSize: 20 })),
    };
  });
  protected readonly pickerOptions = computed(() =>
    (this.pickerQuery.data()?.items ?? []).map((p) => ({
      value: p.id,
      label: p.nombre,
      meta: [p.codigoInterno ? `Cód. ${p.codigoInterno}` : '', this.supplierPrices().has(p.id) ? 'Precio del proveedor' : '']
        .filter(Boolean)
        .join(' · '),
    })),
  );

  /** Precios de «Productos que vende» del proveedor elegido: tienen prioridad sobre el costo general. */
  protected readonly supplierProductsQuery = injectQuery(() => ({
    queryKey: ['suppliers', 'products', this.supplierId()] as const,
    queryFn: () => firstValueFrom(this.api.listSupplierProducts(this.supplierId())),
    enabled: this.createOpen() && !!this.supplierId(),
  }));
  protected readonly supplierPrices = computed(() => {
    const map = new Map<string, number>();
    for (const link of this.supplierProductsQuery.data() ?? []) {
      const price = Number(link.precioCompra);
      if (link.precioCompra != null && Number.isFinite(price)) map.set(link.productId, price);
    }
    return map;
  });

  protected readonly orderTotal = computed(() => this.lines().reduce((acc, l) => acc + (l.unitPrice ?? 0) * l.quantity, 0));

  protected readonly createMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.createPurchaseOrder({
          supplierId: this.supplierId(),
          warehouseId: this.warehouseId(),
          fechaEntregaEstimada: this.fechaEntrega() || undefined,
          comentario: this.comentario().trim() || undefined,
          condicionesPago: this.condicionesPago().trim() || undefined,
          items: this.lines().map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: l.unitPrice ?? undefined,
          })),
        }),
      ),
    onSuccess: (po) => {
      this.notify.success(`Orden ${po.numero ?? ''} guardada como borrador. Revísala y apruébala.`.replace('  ', ' '));
      this.createOpen.set(false);
      void this.queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      this.detailId.set(po.id);
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo crear la orden de compra')),
  }));

  protected readonly actionMutation = injectMutation(() => ({
    mutationFn: ({ id, action }: { id: string; action: OrderAction }) => {
      if (action === 'approve') return firstValueFrom(this.api.approvePurchaseOrder(id));
      if (action === 'send') return firstValueFrom(this.api.sendPurchaseOrder(id));
      return firstValueFrom(this.api.cancelPurchaseOrder(id));
    },
    onSuccess: (_res, { action }) => {
      this.notify.success(ACTION_COPY[action].done);
      this.pendingAction.set(null);
      void this.queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      void this.queryClient.invalidateQueries({ queryKey: ['purchase-order'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo actualizar la orden de compra')),
  }));

  constructor() {
    // Viene del Sugerido de compras con productos elegidos: abre «Nueva orden» ya llena.
    const draft = (this.router.getCurrentNavigation()?.extras.state?.['purchaseOrderDraft'] ??
      history.state?.purchaseOrderDraft) as PurchaseOrderDraft | undefined;
    if (draft?.items?.length) {
      this.openFromDraft(draft);
      // Que al recargar la página no se vuelva a abrir.
      history.replaceState({ ...history.state, purchaseOrderDraft: undefined }, '');
    }
    effect(() => {
      const totalPages = Math.max(1, this.listQuery.data()?.totalPages ?? 1);
      if (this.page() > totalPages) this.page.set(totalPages);
    });
    // Al cambiar de proveedor (o llegar sus precios), las líneas toman su precio si lo tiene.
    effect(() => {
      const prices = this.supplierPrices();
      untracked(() =>
        this.lines.update((rows) => rows.map((l) => (l.priceEdited ? l : this.priced(l, prices)))),
      );
    });
  }

  // ---------- Listado ----------
  protected onSearchChange(value: string) {
    this.search.set(value);
    this.page.set(1);
  }

  protected setEstado(value: string) {
    this.estado.set(value);
    this.page.set(1);
  }

  protected setSupplierFilter(value: string) {
    this.filterSupplierId.set(value);
    this.page.set(1);
  }

  protected clearFilters() {
    this.search.set('');
    this.estado.set('');
    this.filterSupplierId.set('');
    this.page.set(1);
  }

  // ---------- Detalle y acciones ----------
  protected openDetail(row: PurchaseOrderListItemDto) {
    this.detailId.set(row.id);
  }

  protected askAction(id: string, numero: string | null, action: OrderAction) {
    this.pendingAction.set({ id, numero, action });
  }

  protected closeAction() {
    if (this.actionMutation.isPending()) return;
    this.pendingAction.set(null);
  }

  protected runAction() {
    const p = this.pendingAction();
    if (p) this.actionMutation.mutate({ id: p.id, action: p.action });
  }

  protected goToReceipt(id: string) {
    this.detailId.set(null);
    void this.router.navigate(['/recepcion-mercaderia'], { queryParams: { orden: id } });
  }

  protected num(value: string | number | null | undefined): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  // ---------- Nueva orden ----------
  protected openCreate() {
    this.supplierId.set('');
    const warehouses = this.warehousesQuery.data() ?? [];
    this.warehouseId.set(warehouses.length === 1 ? warehouses[0].id : '');
    this.fechaEntrega.set('');
    this.condicionesPago.set('');
    this.comentario.set('');
    this.lines.set([]);
    this.createErrors.set({});
    this.pickerTerm.set('');
    this.pickerReset.update((n) => n + 1);
    this.fromSuggestion.set(false);
    this.createOpen.set(true);
  }

  private openFromDraft(draft: PurchaseOrderDraft) {
    this.openCreate();
    this.supplierId.set(draft.supplierId ?? '');
    this.warehouseId.set(draft.warehouseId);
    this.lines.set(
      draft.items.map((i) => ({
        productId: i.productId,
        nombre: i.nombre,
        codigoInterno: i.codigoInterno,
        quantity: Math.max(1, Math.ceil(i.quantity)),
        // Sin costo: el precio del proveedor (si lo tiene) lo pone el efecto de precios; si no, el API usa el del producto.
        unitPrice: null,
        basePrice: null,
        priceFromSupplier: false,
        priceEdited: false,
      })),
    );
    this.fromSuggestion.set(true);
  }

  protected closeCreate() {
    if (this.createMutation.isPending()) return;
    this.createOpen.set(false);
  }

  protected onSupplierChange(id: string) {
    this.supplierId.set(id);
    this.createErrors.update(({ supplierId: _, ...rest }) => rest);
  }

  protected onWarehouseChange(id: string) {
    this.warehouseId.set(id);
    this.createErrors.update(({ warehouseId: _, ...rest }) => rest);
  }

  protected addLine(productId: string) {
    const item = this.pickerQuery.data()?.items.find((p) => p.id === productId);
    if (!item) return;
    this.lines.update((rows) =>
      rows.some((l) => l.productId === item.id)
        ? rows.map((l) => (l.productId === item.id ? { ...l, quantity: l.quantity + 1 } : l))
        : [...rows, this.priced(this.newLine(item), this.supplierPrices())],
    );
    this.createErrors.update(({ lines: _, ...rest }) => rest);
    this.pickerTerm.set('');
    this.pickerReset.update((n) => n + 1);
  }

  protected setQuantity(productId: string, quantity: number) {
    this.lines.update((rows) => rows.map((l) => (l.productId === productId ? { ...l, quantity } : l)));
  }

  protected setPrice(productId: string, raw: string) {
    const parsed = raw === '' ? null : Number(raw);
    this.lines.update((rows) =>
      rows.map((l) =>
        l.productId === productId ? { ...l, unitPrice: parsed, priceEdited: true, priceFromSupplier: false } : l,
      ),
    );
  }

  protected removeLine(productId: string) {
    this.lines.update((rows) => rows.filter((l) => l.productId !== productId));
  }

  protected submitCreate() {
    const errors: { supplierId?: string; warehouseId?: string; lines?: string } = {};
    if (!this.supplierId()) errors.supplierId = 'Elige el proveedor.';
    if (!this.warehouseId()) errors.warehouseId = 'Elige el almacén donde llegará la mercadería.';
    if (!this.lines().length) errors.lines = 'Agrega al menos un producto.';
    this.createErrors.set(errors);
    if (Object.keys(errors).length) return;
    const badPrice = this.lines().find((l) => l.unitPrice != null && (!Number.isFinite(l.unitPrice) || l.unitPrice < 0));
    if (badPrice) {
      this.notify.warning(`El costo de ${badPrice.nombre} no puede ser negativo.`);
      return;
    }
    this.createMutation.mutate();
  }

  private newLine(item: ProductListItemDto): OrderLine {
    const base = Number.parseFloat(item.precioUnitarioCompra ?? '');
    return {
      productId: item.id,
      nombre: item.nombre,
      codigoInterno: item.codigoInterno,
      quantity: 1,
      unitPrice: Number.isFinite(base) ? base : null,
      basePrice: Number.isFinite(base) ? base : null,
      priceFromSupplier: false,
      priceEdited: false,
    };
  }

  private priced(line: OrderLine, prices: Map<string, number>): OrderLine {
    const supplierPrice = prices.get(line.productId);
    return supplierPrice != null
      ? { ...line, unitPrice: supplierPrice, priceFromSupplier: true }
      : { ...line, unitPrice: line.basePrice, priceFromSupplier: false };
  }
}
