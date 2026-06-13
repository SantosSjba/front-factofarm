import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
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
import { LabelComponent } from '../../../../shared/components/form/label/label.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type {
  DeliveryOrderDetailDto,
  DeliveryOrderStatus,
  PosCatalogItemDto,
} from '../../models/directory.models';

type OrderLine = { productId: string; nombre: string; quantity: number; precio: number };

const STATUS_LABELS: Record<DeliveryOrderStatus, string> = {
  RECIBIDO: 'Recibido',
  PREPARANDO: 'Preparando',
  EN_CAMINO: 'En camino',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
};

const NEXT_STATUS: Partial<Record<DeliveryOrderStatus, DeliveryOrderStatus>> = {
  RECIBIDO: 'PREPARANDO',
  PREPARANDO: 'EN_CAMINO',
  EN_CAMINO: 'ENTREGADO',
};

@Component({
  selector: 'app-ordenes-pedido',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    DatePipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    PaginationComponent,
    ButtonComponent,
    FormSelectComponent,
    InputFieldComponent,
    LabelComponent,
    ModalComponent,
    PageStateComponent,
  ],
  templateUrl: './ordenes-pedido.component.html',
})
export class OrdenesPedidoComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [
    { label: 'Comprobantes' },
    { label: 'Órdenes de pedido (delivery)' },
  ];
  protected readonly statusLabels = STATUS_LABELS;

  protected readonly page = signal(1);
  protected readonly estadoFilter = signal('');
  protected readonly search = signal('');
  protected readonly createOpen = signal(false);
  protected readonly detailId = signal<string | null>(null);
  protected readonly cancelReason = signal('');

  protected readonly warehouseId = signal('');
  protected readonly clienteNombre = signal('');
  protected readonly clienteTelefono = signal('');
  protected readonly clienteEmail = signal('');
  protected readonly direccionEntrega = signal('');
  protected readonly distritoEntrega = signal('');
  protected readonly referenciaDireccion = signal('');
  protected readonly costoDelivery = signal(0);
  protected readonly notasCliente = signal('');
  protected readonly productSearch = signal('');
  protected readonly catalog = signal<PosCatalogItemDto[]>([]);
  protected readonly lines = signal<OrderLine[]>([]);
  protected readonly assignUserId = signal('');

  protected readonly estadoOptions = [
    { value: '', label: 'Todos los estados' },
    ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
  ];

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['delivery-orders', this.page(), this.estadoFilter(), this.search()] as const,
    queryFn: () =>
      firstValueFrom(
        this.api.listDeliveryOrders(
          this.page(),
          15,
          this.estadoFilter() || undefined,
          this.search(),
        ),
      ),
  }));

  protected readonly detailQuery = injectQuery(() => ({
    queryKey: ['delivery-orders', 'detail', this.detailId()] as const,
    enabled: !!this.detailId(),
    queryFn: () => firstValueFrom(this.api.getDeliveryOrder(this.detailId()!)),
  }));

  protected readonly warehousesQuery = injectQuery(() => ({
    queryKey: ['inventory', 'warehouses'] as const,
    queryFn: () => firstValueFrom(this.api.listInventoryMovementWarehouses()),
  }));

  protected readonly usersQuery = injectQuery(() => ({
    queryKey: ['users', 'assign'] as const,
    queryFn: () => firstValueFrom(this.api.listUsers({ page: 1, pageSize: 50 })),
  }));

  protected readonly warehouseOptions = computed(() => [
    { value: '', label: 'Almacén' },
    ...(this.warehousesQuery.data() ?? []).map((w) => ({
      value: w.id,
      label: `${w.nombre} · ${w.establishment.nombre}`,
    })),
  ]);

  protected readonly userOptions = computed(() => [
    { value: '', label: 'Sin asignar' },
    ...(this.usersQuery.data()?.items ?? []).map((u) => ({ value: u.id, label: u.nombre })),
  ]);

  protected readonly orderTotal = computed(() =>
    this.lines().reduce((acc, l) => acc + l.precio * l.quantity, 0) + this.costoDelivery(),
  );

  protected readonly detail = computed(() => this.detailQuery.data());
  protected readonly nextStatus = computed(() => {
    const d = this.detail();
    return d ? NEXT_STATUS[d.estado] : null;
  });

  protected listError(): string | null {
    if (this.listQuery.isError()) {
      return httpErrorMessage(this.listQuery.error(), 'No se pudieron cargar los pedidos.');
    }
    return null;
  }

  protected openDetail(id: string) {
    this.detailId.set(id);
    this.cancelReason.set('');
  }

  protected closeDetail() {
    this.detailId.set(null);
  }

  protected async searchProducts() {
    if (!this.warehouseId()) return;
    try {
      const rows = await firstValueFrom(
        this.api.getPosCatalog(this.warehouseId(), this.productSearch()),
      );
      this.catalog.set(rows);
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'Error al buscar productos'));
    }
  }

  protected addLine(item: PosCatalogItemDto) {
    const existing = this.lines().find((l) => l.productId === item.id);
    if (existing) {
      this.lines.update((rows) =>
        rows.map((l) =>
          l.productId === item.id ? { ...l, quantity: l.quantity + 1 } : l,
        ),
      );
    } else {
      this.lines.update((rows) => [
        ...rows,
        {
          productId: item.id,
          nombre: item.nombre,
          quantity: 1,
          precio: Number.parseFloat(item.precio),
        },
      ]);
    }
    this.productSearch.set('');
    this.catalog.set([]);
  }

  protected readonly createMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.createDeliveryOrder({
          warehouseId: this.warehouseId(),
          clienteNombre: this.clienteNombre().trim(),
          clienteTelefono: this.clienteTelefono().trim(),
          clienteEmail: this.clienteEmail().trim() || undefined,
          direccionEntrega: this.direccionEntrega().trim(),
          referenciaDireccion: this.referenciaDireccion().trim() || undefined,
          distritoEntrega: this.distritoEntrega().trim() || undefined,
          costoDelivery: this.costoDelivery() || undefined,
          notasCliente: this.notasCliente().trim() || undefined,
          items: this.lines().map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: l.precio,
          })),
        }),
      ),
    onSuccess: () => {
      this.notify.success('Pedido delivery creado');
      this.createOpen.set(false);
      this.lines.set([]);
      void this.queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo crear el pedido')),
  }));

  protected async advanceStatus(order: DeliveryOrderDetailDto) {
    const next = NEXT_STATUS[order.estado];
    if (!next) return;
    try {
      const res = await firstValueFrom(
        this.api.updateDeliveryOrderStatus(order.id, { estado: next }),
      );
      if (res.whatsappLink) {
        this.notify.info('Enlace WhatsApp generado para el cliente');
      }
      void this.queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
      if (this.detailId() === order.id) void this.detailQuery.refetch();
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo actualizar el estado'));
    }
  }

  protected async cancelOrder(order: DeliveryOrderDetailDto) {
    const reason = this.cancelReason().trim();
    if (!reason) {
      this.notify.warning('Indique el motivo de cancelación');
      return;
    }
    try {
      await firstValueFrom(
        this.api.updateDeliveryOrderStatus(order.id, {
          estado: 'CANCELADO',
          cancelReason: reason,
        }),
      );
      this.notify.success('Pedido cancelado');
      void this.queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
      void this.detailQuery.refetch();
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo cancelar'));
    }
  }

  protected async assignOrder(order: DeliveryOrderDetailDto) {
    try {
      await firstValueFrom(
        this.api.assignDeliveryOrder(order.id, this.assignUserId() || undefined),
      );
      this.notify.success('Repartidor actualizado');
      void this.detailQuery.refetch();
      void this.queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo asignar'));
    }
  }

  protected async completeSale(order: DeliveryOrderDetailDto) {
    const total = Number.parseFloat(order.total);
    try {
      await firstValueFrom(
        this.api.completeDeliverySale(order.id, {
          payments: [{ metodo: 'EFECTIVO', monto: total }],
        }),
      );
      this.notify.success('Venta registrada y pedido entregado');
      void this.queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
      void this.queryClient.invalidateQueries({ queryKey: ['sales'] });
      void this.detailQuery.refetch();
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo completar la venta'));
    }
  }

  protected statusClass(estado: DeliveryOrderStatus): string {
    if (estado === 'ENTREGADO') return 'bg-emerald-100 text-emerald-800';
    if (estado === 'CANCELADO') return 'bg-red-100 text-red-800';
    if (estado === 'EN_CAMINO') return 'bg-sky-100 text-sky-800';
    if (estado === 'PREPARANDO') return 'bg-amber-100 text-amber-800';
    return 'bg-gray-100 text-gray-800';
  }
}
