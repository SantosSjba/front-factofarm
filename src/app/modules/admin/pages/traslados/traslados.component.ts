import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
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
import { SearchSelectComponent } from '../../../../shared/components/form/search-select/search-select.component';
import { SuggestInputComponent } from '../../../../shared/components/form/suggest-input/suggest-input.component';
import { StatusBadgeComponent, type StatusTone } from '../../../../shared/components/ui/badge/status-badge.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { MenuItemComponent } from '../../../../shared/components/ui/menu-item/menu-item.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { QuickCreateComponent } from '../../components/quick-create/quick-create.component';
import type { InventoryTransferDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

type TransferStatus = InventoryTransferDto['estado'];
type TransferAction = 'dispatch' | 'receive' | 'cancel' | 'guia';

interface DraftLine {
  productId: string;
  nombre: string;
  codigoInterno: string | null;
  manejaLotes: boolean;
  codigoLote: string;
  cantidad: number;
}

const STATUS: Record<TransferStatus, { label: string; tone: StatusTone }> = {
  BORRADOR: { label: 'Borrador', tone: 'neutral' },
  EN_TRANSITO: { label: 'En tránsito', tone: 'info' },
  RECIBIDO: { label: 'Recibido', tone: 'success' },
  ANULADO: { label: 'Anulado', tone: 'error' },
};

const ACTION_COPY: Record<TransferAction, { title: string; button: string; icon: string }> = {
  dispatch: { title: 'Despachar traslado', button: 'Despachar', icon: 'mdi:truck-delivery-outline' },
  receive: { title: 'Recibir traslado', button: 'Recibir', icon: 'mdi:package-down' },
  cancel: { title: 'Anular traslado', button: 'Anular', icon: 'mdi:cancel' },
  guia: { title: 'Emitir guía de remisión', button: 'Emitir guía', icon: 'mdi:file-certificate-outline' },
};

@Component({
  selector: 'app-traslados',
  standalone: true,
  imports: [
    CommonModule,
    AppDatePipe,
    QueryPageStatePipe,
    BreadcrumbInlineComponent,
    ButtonComponent,
    ComponentCardComponent,
    FormSectionComponent,
    FormSelectComponent,
    HasPermissionDirective,
    HelpPanelComponent,
    InputFieldComponent,
    ListFiltersComponent,
    MenuItemComponent,
    ModalComponent,
    PageToolbarComponent,
    PaginationComponent,
    QuickCreateComponent,
    SearchSelectComponent,
    StatusBadgeComponent,
    SuggestInputComponent,
    TableDropdownComponent,
    TextAreaComponent,
  ],
  templateUrl: './traslados.component.html',
})
export class TrasladosComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumbSegments: BreadcrumbSegment[] = [{ label: 'Inventario' }, { label: 'Traslados' }];

  // ---------- Listado ----------
  protected readonly itemsPerPage = 10;
  protected readonly currentPage = signal(1);
  protected readonly estadoFilter = signal('');
  protected readonly warehouseFilter = signal('');
  protected readonly estadoOptions = [
    { value: '', label: 'Todos los estados' },
    ...(Object.keys(STATUS) as TransferStatus[]).map((value) => ({ value, label: STATUS[value].label })),
  ];
  protected readonly activeFilterCount = computed(() => [this.estadoFilter(), this.warehouseFilter()].filter(Boolean).length);

  protected readonly transfersQuery = injectQuery(() => ({
    queryKey: ['inventory', 'transfers', { estado: this.estadoFilter(), warehouse: this.warehouseFilter(), page: this.currentPage() }] as const,
    queryFn: () =>
      firstValueFrom(
        this.api.listInventoryTransfers({
          estado: (this.estadoFilter() || undefined) as TransferStatus | undefined,
          warehouseId: this.warehouseFilter() || undefined,
          page: this.currentPage(),
          pageSize: this.itemsPerPage,
        }),
      ),
  }));
  protected readonly rows = computed(() => this.transfersQuery.data()?.items ?? []);
  protected readonly totalRows = computed(() => this.transfersQuery.data()?.total ?? 0);

  protected readonly warehousesQuery = injectQuery(() => ({
    queryKey: ['inventory', 'warehouses'] as const,
    queryFn: () => firstValueFrom(this.api.listInventoryMovementWarehouses()),
  }));
  protected readonly warehouseOptions = computed(() =>
    (this.warehousesQuery.data() ?? []).map((w) => ({ value: w.id, label: `${w.nombre} · ${w.establishment.nombre}` })),
  );
  protected readonly warehouseFilterOptions = computed(() => [{ value: '', label: 'Todos los almacenes' }, ...this.warehouseOptions()]);

  // ---------- Detalle y acciones ----------
  protected readonly detail = signal<InventoryTransferDto | null>(null);
  protected readonly pendingAction = signal<{ row: InventoryTransferDto; action: TransferAction } | null>(null);
  protected readonly actionCopy = computed(() => {
    const p = this.pendingAction();
    return p ? ACTION_COPY[p.action] : null;
  });

  protected readonly actionMutation = injectMutation(() => ({
    mutationFn: ({ row, action }: { row: InventoryTransferDto; action: TransferAction }) => {
      if (action === 'dispatch') return firstValueFrom(this.api.dispatchInventoryTransfer(row.id));
      if (action === 'receive') return firstValueFrom(this.api.receiveInventoryTransfer(row.id));
      if (action === 'cancel') return firstValueFrom(this.api.cancelInventoryTransfer(row.id));
      return firstValueFrom(this.api.emitGuiaFromTransfer(row.id)).then(() => ({ message: 'Guía de remisión programada para su envío a SUNAT.' }));
    },
    onSuccess: (res: { message?: string }) => {
      this.notify.success(res?.message || 'Traslado actualizado');
      this.pendingAction.set(null);
      this.detail.set(null);
      for (const key of [['inventory'], ['inventory-movements'], ['products'], ['billing']]) {
        void this.queryClient.invalidateQueries({ queryKey: key });
      }
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo actualizar el traslado')),
  }));

  // ---------- Nuevo traslado ----------
  protected readonly createOpen = signal(false);
  protected readonly fromWarehouseId = signal('');
  protected readonly toWarehouseId = signal('');
  protected readonly guiaNumero = signal('');
  protected readonly comentario = signal('');
  protected readonly lines = signal<DraftLine[]>([]);
  protected readonly createErrors = signal<{ from?: string; to?: string; lines?: string }>({});

  protected readonly pickerTerm = signal('');
  protected readonly pickerReset = signal(0);
  protected readonly draft = signal<DraftLine | null>(null);
  protected readonly draftLotSearch = signal('');
  protected readonly draftError = signal('');

  protected readonly pickerQuery = injectQuery(() => {
    const search = this.pickerTerm();
    return {
      queryKey: ['products', 'transfer-picker', search],
      enabled: this.createOpen() && !this.draft(),
      queryFn: () => firstValueFrom(this.api.listProducts({ search: search || undefined, field: 'all', page: 1, pageSize: 20 })),
    };
  });
  protected readonly pickerOptions = computed(() =>
    (this.pickerQuery.data()?.items ?? []).map((p) => ({
      value: p.id,
      label: p.nombre,
      meta: [p.codigoInterno ? `Cód. ${p.codigoInterno}` : '', p.manejaLotes ? 'Maneja lotes' : ''].filter(Boolean).join(' · '),
    })),
  );

  /** Lotes con stock del almacén origen, para el producto que se está agregando. */
  protected readonly lotsQuery = injectQuery(() => {
    const draft = this.draft();
    const warehouseId = this.fromWarehouseId();
    const search = this.draftLotSearch().trim();
    return {
      queryKey: ['inventory-movements', 'lot-codes', 'OUTBOUND', draft?.productId ?? '', warehouseId, search],
      enabled: !!draft?.manejaLotes && !!warehouseId,
      queryFn: () =>
        firstValueFrom(this.api.searchInventoryLotCodes({ productId: draft!.productId, warehouseId, search, mode: 'OUTBOUND' })),
    };
  });
  protected readonly lotOptions = computed(() =>
    (this.lotsQuery.data() ?? []).map((lot) => ({
      value: lot.codigoLote,
      label: lot.codigoLote,
      meta: `Stock: ${Number(lot.stock)}${lot.fechaVencimiento ? ` · Vence ${lot.fechaVencimiento.slice(0, 10).split('-').reverse().join('/')}` : ''}`,
    })),
  );

  protected readonly createMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.createInventoryTransfer({
          fromWarehouseId: this.fromWarehouseId(),
          toWarehouseId: this.toWarehouseId(),
          guiaNumero: this.guiaNumero().trim() || undefined,
          comentario: this.comentario().trim() || undefined,
          items: this.lines().map((l) => ({ productId: l.productId, codigoLote: l.codigoLote || undefined, cantidad: l.cantidad })),
        }),
      ),
    onSuccess: () => {
      this.notify.success('Traslado guardado como borrador. Despáchalo cuando salga la mercadería.');
      this.createOpen.set(false);
      void this.queryClient.invalidateQueries({ queryKey: ['inventory', 'transfers'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo crear el traslado')),
  }));

  constructor() {
    effect(() => {
      const totalPages = Math.max(1, this.transfersQuery.data()?.totalPages ?? 1);
      if (this.currentPage() > totalPages) this.currentPage.set(totalPages);
    });
  }

  // ---------- Listado ----------
  protected statusLabel(estado: TransferStatus) {
    return STATUS[estado].label;
  }

  protected statusTone(estado: TransferStatus): StatusTone {
    return STATUS[estado].tone;
  }

  protected units(row: InventoryTransferDto): number {
    return row.items.reduce((acc, i) => acc + (Number(i.cantidad) || 0), 0);
  }

  protected setEstado(value: string) {
    this.estadoFilter.set(value);
    this.currentPage.set(1);
  }

  protected setWarehouse(value: string) {
    this.warehouseFilter.set(value);
    this.currentPage.set(1);
  }

  protected clearFilters() {
    this.estadoFilter.set('');
    this.warehouseFilter.set('');
    this.currentPage.set(1);
  }

  // ---------- Acciones ----------
  protected ask(row: InventoryTransferDto, action: TransferAction) {
    this.pendingAction.set({ row, action });
  }

  protected closeAction() {
    if (this.actionMutation.isPending()) return;
    this.pendingAction.set(null);
  }

  protected runAction() {
    const p = this.pendingAction();
    if (p) this.actionMutation.mutate(p);
  }

  // ---------- Nuevo traslado ----------
  protected openCreate() {
    const warehouses = this.warehousesQuery.data() ?? [];
    this.fromWarehouseId.set(warehouses.length === 1 ? warehouses[0].id : '');
    this.toWarehouseId.set('');
    this.guiaNumero.set('');
    this.comentario.set('');
    this.lines.set([]);
    this.createErrors.set({});
    this.cancelDraft();
    this.createOpen.set(true);
  }

  protected closeCreate() {
    if (this.createMutation.isPending()) return;
    this.createOpen.set(false);
  }

  protected setFrom(id: string) {
    // Los lotes dependen del origen: si cambia, las líneas ya no valen.
    if (id !== this.fromWarehouseId() && this.lines().length) {
      this.lines.set([]);
      this.notify.info('Cambiaste el almacén de origen: vuelve a agregar los productos.');
    }
    this.fromWarehouseId.set(id);
    this.createErrors.update(({ from: _, ...rest }) => rest);
  }

  protected setTo(id: string) {
    this.toWarehouseId.set(id);
    this.createErrors.update(({ to: _, ...rest }) => rest);
  }

  protected pickProduct(productId: string) {
    const p = this.pickerQuery.data()?.items.find((x) => x.id === productId);
    if (!p) return;
    this.draft.set({ productId: p.id, nombre: p.nombre, codigoInterno: p.codigoInterno, manejaLotes: !!p.manejaLotes, codigoLote: '', cantidad: 1 });
    this.draftLotSearch.set('');
    this.draftError.set('');
  }

  protected patchDraft(patch: Partial<DraftLine>) {
    this.draft.update((d) => (d ? { ...d, ...patch } : d));
    this.draftError.set('');
  }

  protected cancelDraft() {
    this.draft.set(null);
    this.draftError.set('');
    this.pickerTerm.set('');
    this.pickerReset.update((n) => n + 1);
  }

  protected addDraft() {
    const d = this.draft();
    if (!d) return;
    if (!this.fromWarehouseId()) {
      this.draftError.set('Primero elige el almacén de origen.');
      return;
    }
    if (!Number.isFinite(d.cantidad) || d.cantidad <= 0) {
      this.draftError.set('La cantidad debe ser mayor a 0.');
      return;
    }
    if (d.manejaLotes && !d.codigoLote.trim()) {
      this.draftError.set('Este producto maneja lotes: elige de qué lote sale.');
      return;
    }
    const lot = d.codigoLote.trim();
    this.lines.update((rows) => {
      const same = rows.find((r) => r.productId === d.productId && r.codigoLote === lot);
      return same
        ? rows.map((r) => (r === same ? { ...r, cantidad: r.cantidad + d.cantidad } : r))
        : [...rows, { ...d, codigoLote: lot }];
    });
    this.createErrors.update(({ lines: _, ...rest }) => rest);
    this.cancelDraft();
  }

  protected removeLine(index: number) {
    this.lines.update((rows) => rows.filter((_, i) => i !== index));
  }

  protected submitCreate() {
    const errors: { from?: string; to?: string; lines?: string } = {};
    if (!this.fromWarehouseId()) errors.from = 'Elige de qué almacén sale.';
    if (!this.toWarehouseId()) errors.to = 'Elige a qué almacén llega.';
    else if (this.toWarehouseId() === this.fromWarehouseId()) errors.to = 'Debe ser distinto del almacén de origen.';
    if (!this.lines().length) errors.lines = 'Agrega al menos un producto.';
    this.createErrors.set(errors);
    if (Object.keys(errors).length) return;
    this.createMutation.mutate();
  }

  protected warehouseName(id: string): string {
    return this.warehousesQuery.data()?.find((w) => w.id === id)?.nombre ?? '';
  }
}
