import { CommonModule, CurrencyPipe } from '@angular/common';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type {
  PosCatalogItemDto,
  PurchaseOrderStatus,
  SupplierOptionDto } from '../../models/directory.models';

type OrderLine = { productId: string; nombre: string; quantity: number; unitPrice?: number };

@Component({
  selector: 'app-ordenes-compra',
  standalone: true,
  imports: [
    QueryPageStatePipe,
    CommonModule,
    AppDatePipe,
    CurrencyPipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    PaginationComponent,
    ButtonComponent,
    FormSelectComponent,
    InputFieldComponent,
    ModalComponent,
  ],
  templateUrl: './ordenes-compra.component.html' })
export class OrdenesCompraComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Compras' }, { label: 'Órdenes de compra' }];
  protected readonly page = signal(1);
  protected readonly estado = signal('');
  protected readonly createOpen = signal(false);
  protected readonly detailId = signal<string | null>(null);

  protected readonly supplierId = signal('');
  protected readonly warehouseId = signal('');
  protected readonly search = signal('');
  protected readonly catalog = signal<PosCatalogItemDto[]>([]);
  protected readonly lines = signal<OrderLine[]>([]);
  protected readonly comentario = signal('');
  protected readonly condicionesPago = signal('');

  protected readonly estadoOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'BORRADOR', label: 'Borrador' },
    { value: 'APROBADA', label: 'Aprobada' },
    { value: 'ENVIADA', label: 'Enviada' },
    { value: 'PARCIALMENTE_RECIBIDA', label: 'Parcialmente recibida' },
    { value: 'RECIBIDA', label: 'Recibida' },
    { value: 'ANULADA', label: 'Anulada' },
  ];

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['purchase-orders', this.page(), this.estado()] as const,
    queryFn: () =>
      firstValueFrom(
        this.api.listPurchaseOrders({
          page: this.page(),
          pageSize: 15,
          estado: (this.estado() || undefined) as PurchaseOrderStatus | undefined }),
      ) }));

  protected readonly detailQuery = injectQuery(() => ({
    queryKey: ['purchase-order', this.detailId()] as const,
    queryFn: () => firstValueFrom(this.api.getPurchaseOrder(this.detailId()!)),
    enabled: !!this.detailId() }));

  protected readonly suppliersQuery = injectQuery(() => ({
    queryKey: ['suppliers', 'options'] as const,
    queryFn: () => firstValueFrom(this.api.listSupplierOptions()) }));

  protected readonly warehousesQuery = injectQuery(() => ({
    queryKey: ['inventory', 'warehouses'] as const,
    queryFn: () => firstValueFrom(this.api.listInventoryMovementWarehouses()) }));

  protected readonly supplierOptions = computed(() => [
    { value: '', label: 'Seleccione proveedor' },
    ...(this.suppliersQuery.data() ?? []).map((s: SupplierOptionDto) => ({
      value: s.id,
      label: s.razonSocial })),
  ]);

  protected readonly warehouseOptions = computed(() => [
    { value: '', label: 'Almacén destino' },
    ...(this.warehousesQuery.data() ?? []).map((w) => ({
      value: w.id,
      label: `${w.nombre} · ${w.establishment.nombre}` })),
  ]);

  protected readonly orderTotal = computed(() =>
    this.lines().reduce((acc, l) => acc + (l.unitPrice ?? 0) * l.quantity, 0),
  );

  constructor() {
    effect((onCleanup) => {
      if (!this.createOpen() || !this.warehouseId()) return;
      const term = this.search().trim();
      const timer = setTimeout(() => void this.searchProducts(), term ? 350 : 0);
      onCleanup(() => clearTimeout(timer));
    });
  }

  protected async searchProducts() {
    if (!this.warehouseId()) return;
    try {
      const term = this.search().trim();
      const rows = await firstValueFrom(this.api.getPosCatalog(this.warehouseId(), term || undefined));
      this.catalog.set(rows);
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'Error al buscar productos'));
    }
  }

  protected addLine(item: PosCatalogItemDto) {
    const price = Number.parseFloat(item.precio);
    const existing = this.lines().find((l) => l.productId === item.id);
    if (existing) {
      this.lines.update((rows) =>
        rows.map((l) => (l.productId === item.id ? { ...l, quantity: l.quantity + 1 } : l)),
      );
    } else {
      this.lines.update((rows) => [
        ...rows,
        { productId: item.id, nombre: item.nombre, quantity: 1, unitPrice: price },
      ]);
    }
    this.search.set('');
    void this.searchProducts();
  }

  protected openDetail(id: string) {
    this.detailId.set(id);
  }

  protected closeDetail() {
    this.detailId.set(null);
  }

  protected readonly createMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.createPurchaseOrder({
          supplierId: this.supplierId(),
          warehouseId: this.warehouseId(),
          comentario: this.comentario().trim() || undefined,
          condicionesPago: this.condicionesPago().trim() || undefined,
          items: this.lines().map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: l.unitPrice })) }),
      ),
    onSuccess: () => {
      this.notify.success('Orden de compra creada');
      this.createOpen.set(false);
      this.lines.set([]);
      void this.queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo crear la OC')) }));

  protected actionMutation = injectMutation(() => ({
    mutationFn: (payload: { id: string; action: 'approve' | 'send' | 'cancel' }) => {
      const { id, action } = payload;
      if (action === 'approve') return firstValueFrom(this.api.approvePurchaseOrder(id));
      if (action === 'send') return firstValueFrom(this.api.sendPurchaseOrder(id));
      return firstValueFrom(this.api.cancelPurchaseOrder(id));
    },
    onSuccess: () => {
      this.notify.success('Orden actualizada');
      void this.queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      void this.queryClient.invalidateQueries({ queryKey: ['purchase-order'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo actualizar la OC')) }));
}
