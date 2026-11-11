import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
import { FormSectionComponent } from '../../../../shared/components/form/form-section/form-section.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { TextAreaComponent } from '../../../../shared/components/form/input/text-area.component';
import { SuggestInputComponent } from '../../../../shared/components/form/suggest-input/suggest-input.component';
import { StatusBadgeComponent } from '../../../../shared/components/ui/badge/status-badge.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { HelpHintComponent } from '../../../../shared/components/ui/help-hint/help-hint.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import type { PurchaseOrderDetailDto, PurchaseOrderItemDto, PurchaseOrderListItemDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';
import { purchaseOrderStatusLabel } from '../../utils/purchase-order-status';

type ReceiptLine = {
  purchaseOrderItemId: string;
  productId: string;
  producto: string;
  codigoInterno: string | null;
  manejaLotes: boolean;
  pedido: number;
  pendiente: number;
  quantity: number;
  /** Costo de la orden; si la factura trae otro, se cambia aquí. */
  costoOrden: number;
  unitCost: number;
  lotCode: string;
  expirationDate: string;
  /** El lote ya existe: su vencimiento es fijo (un lote del fabricante tiene una sola fecha). */
  expiryLocked: boolean;
  error: string;
};

@Component({
  selector: 'app-recepcion-mercaderia',
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
    HasPermissionDirective,
    HelpHintComponent,
    HelpPanelComponent,
    InputFieldComponent,
    ListFiltersComponent,
    ModalComponent,
    PageToolbarComponent,
    StatusBadgeComponent,
    SuggestInputComponent,
    TextAreaComponent,
  ],
  templateUrl: './recepcion-mercaderia.component.html',
})
export class RecepcionMercaderiaComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Compras' }, { label: 'Recepción de mercadería' }];
  protected readonly statusLabel = purchaseOrderStatusLabel;
  protected readonly today = new Date().toISOString().slice(0, 10);

  // ---------- Órdenes por recibir ----------
  protected readonly search = signal('');
  protected readonly pendingOrdersQuery = injectQuery(() => ({
    queryKey: ['purchase-orders', 'pending-receipt', this.search().trim()] as const,
    queryFn: async () => {
      const search = this.search().trim() || undefined;
      const [sent, partial] = await Promise.all([
        firstValueFrom(this.api.listPurchaseOrders({ page: 1, pageSize: 50, estado: 'ENVIADA', search })),
        firstValueFrom(this.api.listPurchaseOrders({ page: 1, pageSize: 50, estado: 'PARCIALMENTE_RECIBIDA', search })),
      ]);
      // Primero las más antiguas: son las que más tiempo llevan esperando.
      return [...sent.items, ...partial.items].sort((a, b) => a.fechaEmision.localeCompare(b.fechaEmision));
    },
  }));
  protected readonly pendingOrders = computed(() => this.pendingOrdersQuery.data() ?? []);

  // ---------- Orden elegida ----------
  protected readonly selectedOrderId = signal('');
  protected readonly detailQuery = injectQuery(() => ({
    queryKey: ['purchase-order', 'receipt', this.selectedOrderId()] as const,
    queryFn: () => firstValueFrom(this.api.getPurchaseOrder(this.selectedOrderId())),
    enabled: !!this.selectedOrderId(),
  }));
  protected readonly lines = signal<ReceiptLine[]>([]);
  protected readonly referenciaDoc = signal('');
  protected readonly comentario = signal('');
  private initializedFor = '';

  protected readonly linesToReceive = computed(() => this.lines().filter((l) => l.quantity > 0));
  protected readonly receiptTotal = computed(() =>
    this.linesToReceive().reduce((acc, l) => acc + l.quantity * l.unitCost, 0),
  );
  protected readonly unitsTotal = computed(() => this.linesToReceive().reduce((acc, l) => acc + l.quantity, 0));

  // ---------- Sugerencias de lote (de la fila que se está editando) ----------
  protected readonly lotSearch = signal<{ lineId: string; productId: string; term: string } | null>(null);
  protected readonly lotQuery = injectQuery(() => {
    const active = this.lotSearch();
    const warehouseId = this.detailQuery.data()?.warehouse.id ?? '';
    return {
      queryKey: ['inventory-movements', 'lot-codes', 'INBOUND', active?.productId ?? '', warehouseId, active?.term ?? ''],
      enabled: !!active && !!warehouseId,
      queryFn: () =>
        firstValueFrom(
          this.api.searchInventoryLotCodes({ productId: active!.productId, warehouseId, search: active!.term, mode: 'INBOUND' }),
        ),
    };
  });

  protected readonly confirmOpen = signal(false);

  protected readonly receiveMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.receivePurchaseOrder(this.selectedOrderId(), {
          items: this.linesToReceive().map((l) => ({
            purchaseOrderItemId: l.purchaseOrderItemId,
            quantity: l.quantity,
            // Solo se envía si cambió: así el API usa el de la orden.
            unitCost: l.unitCost !== l.costoOrden ? l.unitCost : undefined,
            lotCode: l.manejaLotes ? l.lotCode.trim() : undefined,
            expirationDate: l.manejaLotes ? l.expirationDate : undefined,
          })),
          referenciaDoc: this.referenciaDoc().trim() || undefined,
          comentario: this.comentario().trim() || undefined,
        }),
      ),
    onSuccess: () => {
      this.notify.success('Recepción registrada: el stock se actualizó y se creó la cuenta por pagar.');
      this.confirmOpen.set(false);
      this.closeOrder();
      for (const key of ['purchase-orders', 'purchase-order', 'accounts-payable', 'inventory', 'inventory-movements', 'products', 'dashboard']) {
        void this.queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar la recepción')),
  }));

  constructor() {
    // `?orden=<id>`: llega desde Órdenes de compra → «Recibir mercadería».
    const fromUrl = this.route.snapshot.queryParamMap.get('orden');
    if (fromUrl) {
      this.selectedOrderId.set(fromUrl);
      void this.router.navigate([], { relativeTo: this.route, queryParams: { orden: null }, queryParamsHandling: 'merge', replaceUrl: true });
    }
    effect(() => {
      const po = this.detailQuery.data();
      if (!po || po.id !== this.selectedOrderId() || this.initializedFor === po.id) return;
      this.initializedFor = po.id;
      this.lines.set(po.items.filter((i) => Number(i.cantidadPendiente) > 0).map((i) => this.toLine(i)));
    });
  }

  protected onSearchChange(value: string) {
    this.search.set(value);
  }

  protected selectOrder(row: PurchaseOrderListItemDto) {
    this.resetForm();
    this.selectedOrderId.set(row.id);
  }

  protected closeOrder() {
    this.resetForm();
    this.selectedOrderId.set('');
  }

  protected canReceive(po: PurchaseOrderDetailDto): boolean {
    return po.estado === 'ENVIADA' || po.estado === 'PARCIALMENTE_RECIBIDA';
  }

  protected num(value: string | number | null | undefined): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  // ---------- Líneas ----------
  protected patch(id: string, patch: Partial<ReceiptLine>) {
    this.lines.update((rows) => rows.map((l) => (l.purchaseOrderItemId === id ? { ...l, ...patch, error: '' } : l)));
  }

  protected setQuantity(line: ReceiptLine, raw: string | number) {
    const n = Number(raw);
    this.patch(line.purchaseOrderItemId, { quantity: Number.isFinite(n) ? n : 0 });
  }

  protected setCost(line: ReceiptLine, raw: string | number) {
    const n = raw === '' ? line.costoOrden : Number(raw);
    this.patch(line.purchaseOrderItemId, { unitCost: Number.isFinite(n) ? n : line.costoOrden });
  }

  protected receiveAll() {
    this.lines.update((rows) => rows.map((l) => ({ ...l, quantity: l.pendiente, error: '' })));
  }

  protected receiveNone() {
    this.lines.update((rows) => rows.map((l) => ({ ...l, quantity: 0, error: '' })));
  }

  protected onLotInput(line: ReceiptLine, value: string) {
    // Si cambia el código, deja de ser el lote existente: el vencimiento vuelve a ser editable.
    this.patch(line.purchaseOrderItemId, { lotCode: value, expiryLocked: false, expirationDate: line.expiryLocked ? '' : line.expirationDate });
  }

  protected onLotSearch(line: ReceiptLine, term: string) {
    this.lotSearch.set({ lineId: line.purchaseOrderItemId, productId: line.productId, term });
  }

  protected lotOptions(line: ReceiptLine) {
    if (this.lotSearch()?.lineId !== line.purchaseOrderItemId) return [];
    return (this.lotQuery.data() ?? []).map((lot) => ({
      value: lot.codigoLote,
      label: lot.codigoLote,
      meta: `Stock: ${lot.stock}${lot.fechaVencimiento ? ` · Vence ${lot.fechaVencimiento.slice(0, 10).split('-').reverse().join('/')}` : ''}`,
    }));
  }

  protected selectLot(line: ReceiptLine, code: string) {
    const lot = (this.lotQuery.data() ?? []).find((l) => l.codigoLote === code);
    const expiry = lot?.fechaVencimiento?.slice(0, 10) ?? '';
    this.patch(line.purchaseOrderItemId, { lotCode: code, expirationDate: expiry || line.expirationDate, expiryLocked: !!expiry });
  }

  // ---------- Confirmar ----------
  protected review() {
    let firstError = '';
    this.lines.update((rows) =>
      rows.map((l) => {
        const error = this.validate(l);
        if (error && !firstError) firstError = error;
        return { ...l, error };
      }),
    );
    if (firstError) {
      this.notify.warning('Revisa las filas marcadas en rojo.');
      return;
    }
    if (!this.linesToReceive().length) {
      this.notify.warning('Indica la cantidad que llegó de al menos un producto.');
      return;
    }
    this.confirmOpen.set(true);
  }

  private validate(l: ReceiptLine): string {
    if (!Number.isFinite(l.quantity) || l.quantity < 0) return 'La cantidad no puede ser negativa.';
    if (l.quantity > l.pendiente) return `Solo quedan ${l.pendiente} por recibir.`;
    if (l.quantity === 0) return '';
    if (!Number.isFinite(l.unitCost) || l.unitCost < 0) return 'El costo no puede ser negativo.';
    if (!l.manejaLotes) return '';
    if (!l.lotCode.trim()) return 'Indica el código de lote.';
    if (!l.expirationDate) return 'Indica la fecha de vencimiento del lote.';
    if (l.expirationDate <= this.today) return 'El lote está vencido: no se puede ingresar mercadería vencida.';
    return '';
  }

  private resetForm() {
    this.initializedFor = '';
    this.lines.set([]);
    this.referenciaDoc.set('');
    this.comentario.set('');
    this.lotSearch.set(null);
  }

  private toLine(item: PurchaseOrderItemDto): ReceiptLine {
    const pendiente = Number(item.cantidadPendiente);
    const costo = Number(item.precioUnitario) || 0;
    return {
      purchaseOrderItemId: item.id,
      productId: item.productId,
      producto: item.producto,
      codigoInterno: item.codigoInterno,
      manejaLotes: item.manejaLotes,
      pedido: Number(item.cantidadPedida),
      pendiente,
      quantity: pendiente,
      costoOrden: costo,
      unitCost: costo,
      lotCode: '',
      expirationDate: '',
      expiryLocked: false,
      error: '',
    };
  }
}
