import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type { PurchaseOrderDetailDto, PurchaseOrderItemDto } from '../../models/directory.models';

type ReceiptLine = {
  purchaseOrderItemId: string;
  producto: string;
  manejaLotes: boolean;
  pendiente: number;
  quantity: number;
  lotCode: string;
  expirationDate: string;
};

@Component({
  selector: 'app-recepcion-mercaderia',
  standalone: true,
  imports: [
    QueryPageStatePipe,
    CommonModule,
    CurrencyPipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    ButtonComponent,
    FormSelectComponent,
    InputFieldComponent,
  ],
  templateUrl: './recepcion-mercaderia.component.html',
})
export class RecepcionMercaderiaComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [
    { label: 'Compras' },
    { label: 'Recepción mercadería' },
  ];

  protected readonly selectedOrderId = signal('');
  protected readonly referenciaDoc = signal('');
  protected readonly comentario = signal('');
  protected readonly receiptLines = signal<ReceiptLine[]>([]);

  protected readonly pendingOrdersQuery = injectQuery(() => ({
    queryKey: ['purchase-orders', 'pending-receipt'] as const,
    queryFn: async () => {
      const [sent, partial] = await Promise.all([
        firstValueFrom(this.api.listPurchaseOrders({ page: 1, pageSize: 50, estado: 'ENVIADA' })),
        firstValueFrom(
          this.api.listPurchaseOrders({ page: 1, pageSize: 50, estado: 'PARCIALMENTE_RECIBIDA' }),
        ),
      ]);
      return [...sent.items, ...partial.items];
    },
  }));

  protected readonly orderOptions = computed(() => [
    { value: '', label: 'Seleccione orden de compra' },
    ...(this.pendingOrdersQuery.data() ?? []).map((o) => ({
      value: o.id,
      label: `${o.numero ?? o.id.slice(0, 8)} · ${o.supplier.razonSocial} · ${o.estado}`,
    })),
  ]);

  protected readonly detailQuery = injectQuery(() => ({
    queryKey: ['purchase-order', 'receipt', this.selectedOrderId()] as const,
    queryFn: () => firstValueFrom(this.api.getPurchaseOrder(this.selectedOrderId()!)),
    enabled: !!this.selectedOrderId(),
  }));

  protected onOrderChange(id: string) {
    this.selectedOrderId.set(id);
    this.receiptLines.set([]);
  }

  protected initLines(po: PurchaseOrderDetailDto) {
    const lines: ReceiptLine[] = po.items
      .filter((i) => Number.parseFloat(i.cantidadPendiente) > 0)
      .map((i) => this.toReceiptLine(i));
    this.receiptLines.set(lines);
  }

  protected updateLine(id: string, patch: Partial<ReceiptLine>) {
    this.receiptLines.update((rows) => rows.map((l) => (l.purchaseOrderItemId === id ? { ...l, ...patch } : l)));
  }

  protected parseNum(value: unknown): number {
    return Number(value) || 0;
  }

  protected detailErrorMessage(): string {
    return httpErrorMessage(this.detailQuery.error(), 'No se pudo cargar el detalle de la orden.');
  }

  protected readonly receiveMutation = injectMutation(() => ({
    mutationFn: () => {
      const items = this.receiptLines()
        .filter((l) => l.quantity > 0)
        .map((l) => ({
          purchaseOrderItemId: l.purchaseOrderItemId,
          quantity: l.quantity,
          lotCode: l.lotCode.trim() || undefined,
          expirationDate: l.expirationDate || undefined,
        }));
      if (items.length === 0) throw new Error('Indique cantidades a recibir');
      return firstValueFrom(
        this.api.receivePurchaseOrder(this.selectedOrderId(), {
          items,
          referenciaDoc: this.referenciaDoc().trim() || undefined,
          comentario: this.comentario().trim() || undefined,
        }),
      );
    },
    onSuccess: () => {
      this.notify.success('Recepción registrada e inventario actualizado');
      this.selectedOrderId.set('');
      this.receiptLines.set([]);
      void this.queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      void this.queryClient.invalidateQueries({ queryKey: ['accounts-payable'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar la recepción')),
  }));

  private toReceiptLine(item: PurchaseOrderItemDto): ReceiptLine {
    return {
      purchaseOrderItemId: item.id,
      producto: item.producto,
      manejaLotes: item.manejaLotes,
      pendiente: Number.parseFloat(item.cantidadPendiente),
      quantity: Number.parseFloat(item.cantidadPendiente),
      lotCode: '',
      expirationDate: '',
    };
  }
}
