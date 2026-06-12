import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { LabelComponent } from '../../../../shared/components/form/label/label.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { DirectoryApiService } from '../../services/directory-api.service';
import type {
  CreateInventoryTransferRequest,
  InventoryTransferDto,
  ProductListItemDto,
} from '../../models/directory.models';

interface TransferDraftItem {
  productId: string;
  productLabel: string;
  codigoLote: string;
  cantidad: number;
}

@Component({
  selector: 'app-traslados',
  standalone: true,
  imports: [
    CommonModule,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    PaginationComponent,
    ButtonComponent,
    ModalComponent,
    InputFieldComponent,
    LabelComponent,
    FormSelectComponent,
    HasPermissionDirective,
  ],
  templateUrl: './traslados.component.html',
})
export class TrasladosComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumbSegments: BreadcrumbSegment[] = [
    { label: 'Inventario' },
    { label: 'Traslados' },
  ];

  protected readonly estadoFilter = signal<string>('');
  protected readonly currentPage = signal(1);
  protected readonly itemsPerPage = 10;

  protected readonly createOpen = signal(false);
  protected readonly fromWarehouseId = signal('');
  protected readonly toWarehouseId = signal('');
  protected readonly guiaNumero = signal('');
  protected readonly comentario = signal('');
  protected readonly productSearch = signal('');
  protected readonly productOptions = signal<ProductListItemDto[]>([]);
  protected readonly draftItems = signal<TransferDraftItem[]>([]);
  protected readonly draftProductId = signal('');
  protected readonly draftProductLabel = signal('');
  protected readonly draftLotCode = signal('');
  protected readonly draftQuantity = signal(1);

  protected readonly transfersQuery = injectQuery(() => ({
    queryKey: ['inventory', 'transfers', { estado: this.estadoFilter(), page: this.currentPage() }] as const,
    queryFn: () =>
      firstValueFrom(
        this.api.listInventoryTransfers({
          estado: (this.estadoFilter() || undefined) as InventoryTransferDto['estado'] | undefined,
          page: this.currentPage(),
          pageSize: this.itemsPerPage,
        }),
      ),
  }));

  protected readonly warehousesQuery = injectQuery(() => ({
    queryKey: ['inventory', 'warehouses'] as const,
    queryFn: () => firstValueFrom(this.api.listInventoryMovementWarehouses()),
  }));

  protected readonly warehouseOptions = computed(() => [
    { value: '', label: 'Seleccionar' },
    ...(this.warehousesQuery.data() ?? []).map((w) => ({
      value: w.id,
      label: `${w.nombre} · ${w.establishment.nombre}`,
    })),
  ]);

  protected readonly dispatchMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.dispatchInventoryTransfer(id)),
    onSuccess: (res) => {
      this.notify.success(res.message);
      void this.queryClient.invalidateQueries({ queryKey: ['inventory', 'transfers'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo despachar')),
  }));

  protected readonly emitGuiaMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.emitGuiaFromTransfer(id)),
    onSuccess: () => {
      this.notify.success('Guía de remisión programada');
      void this.queryClient.invalidateQueries({ queryKey: ['inventory', 'transfers'] });
      void this.queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo emitir la guía')),
  }));

  protected readonly receiveMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.receiveInventoryTransfer(id)),
    onSuccess: (res) => {
      this.notify.success(res.message);
      void this.queryClient.invalidateQueries({ queryKey: ['inventory', 'transfers'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo recibir')),
  }));

  protected readonly cancelMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.cancelInventoryTransfer(id)),
    onSuccess: (res) => {
      this.notify.success(res.message);
      void this.queryClient.invalidateQueries({ queryKey: ['inventory', 'transfers'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo anular')),
  }));

  protected readonly createMutation = injectMutation(() => ({
    mutationFn: (body: CreateInventoryTransferRequest) =>
      firstValueFrom(this.api.createInventoryTransfer(body)),
    onSuccess: () => {
      this.notify.success('Transferencia creada en borrador.');
      this.closeCreateModal(true);
      void this.queryClient.invalidateQueries({ queryKey: ['inventory', 'transfers'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo crear la transferencia')),
  }));

  protected readonly rows = computed(() => this.transfersQuery.data()?.items ?? []);
  protected readonly totalRows = computed(() => this.transfersQuery.data()?.total ?? 0);
  protected readonly createPending = computed(() => this.createMutation.isPending());

  protected onEstadoChange(value: string) {
    this.estadoFilter.set(value);
    this.currentPage.set(1);
  }

  protected onPageChange(page: number) {
    this.currentPage.set(page);
  }

  protected dispatch(row: InventoryTransferDto) {
    this.dispatchMutation.mutate(row.id);
  }

  protected receive(row: InventoryTransferDto) {
    this.receiveMutation.mutate(row.id);
  }

  protected emitGuia(row: InventoryTransferDto) {
    this.emitGuiaMutation.mutate(row.id);
  }

  protected cancel(row: InventoryTransferDto) {
    this.cancelMutation.mutate(row.id);
  }

  protected openCreateModal() {
    this.fromWarehouseId.set('');
    this.toWarehouseId.set('');
    this.guiaNumero.set('');
    this.comentario.set('');
    this.draftItems.set([]);
    this.resetDraftLine();
    this.createOpen.set(true);
  }

  protected closeCreateModal(force = false) {
    if (!force && this.createPending()) return;
    this.createOpen.set(false);
  }

  protected async searchProducts() {
    const search = this.productSearch().trim();
    if (!search) {
      this.productOptions.set([]);
      return;
    }
    const result = await firstValueFrom(
      this.api.listProducts({ search, field: 'nombre', page: 1, pageSize: 8 }),
    );
    this.productOptions.set('items' in result ? result.items : result);
  }

  protected selectProduct(product: ProductListItemDto) {
    this.draftProductId.set(product.id);
    this.draftProductLabel.set(`${product.nombre} (${product.codigoInterno ?? 'sin código'})`);
    this.productOptions.set([]);
    this.productSearch.set('');
  }

  protected addDraftItem() {
    const productId = this.draftProductId();
    const cantidad = this.draftQuantity();
    if (!productId) {
      this.notify.warning('Seleccione un producto.');
      return;
    }
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      this.notify.warning('Cantidad inválida.');
      return;
    }
    this.draftItems.update((items) => [
      ...items,
      {
        productId,
        productLabel: this.draftProductLabel(),
        codigoLote: this.draftLotCode().trim(),
        cantidad,
      },
    ]);
    this.resetDraftLine();
  }

  protected removeDraftItem(index: number) {
    this.draftItems.update((items) => items.filter((_, i) => i !== index));
  }

  protected processCreate() {
    const fromWarehouseId = this.fromWarehouseId();
    const toWarehouseId = this.toWarehouseId();
    const items = this.draftItems();
    if (!fromWarehouseId || !toWarehouseId) {
      this.notify.warning('Seleccione almacén origen y destino.');
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      this.notify.warning('Origen y destino deben ser distintos.');
      return;
    }
    if (items.length === 0) {
      this.notify.warning('Agregue al menos un ítem.');
      return;
    }
    this.createMutation.mutate({
      fromWarehouseId,
      toWarehouseId,
      guiaNumero: this.guiaNumero().trim() || undefined,
      comentario: this.comentario().trim() || undefined,
      items: items.map((item) => ({
        productId: item.productId,
        codigoLote: item.codigoLote || undefined,
        cantidad: item.cantidad,
      })),
    });
  }

  protected onComentarioInput(event: Event) {
    const target = event.target as HTMLTextAreaElement | null;
    this.comentario.set(target?.value ?? '');
  }

  private resetDraftLine() {
    this.draftProductId.set('');
    this.draftProductLabel.set('');
    this.draftLotCode.set('');
    this.draftQuantity.set(1);
    this.productSearch.set('');
    this.productOptions.set([]);
  }
}
