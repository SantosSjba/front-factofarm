import { CommonModule, CurrencyPipe } from '@angular/common';
import {
  Component,
  HostListener,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  viewChild,
  ElementRef,
} from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { FormFieldComponent } from '../../../../shared/components/form/form-field/form-field.component';
import { FormRowComponent } from '../../../../shared/components/form/form-row/form-row.component';
import { FormStackComponent } from '../../../../shared/components/form/form-stack/form-stack.component';
import { LabelComponent } from '../../../../shared/components/form/label/label.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type {
  CustomerItemDto,
  PaymentMethod,
  PosCatalogItemDto,
  CreateSaleRequest,
  SaleBillingStatusDto,
  SaleDetailDto,
  SaleDocumentType,
  SaleInteractionAlertDto,
  SaleLotAllocationMode,
  PrescriptionSummaryDto,
  PosSubstituteItemDto,
  PharmaApproverDto,
  CreateSaleSubstitutionRequest,
  SunatDocumentStatus,
} from '../../models/directory.models';
import {
  createPaymentLine,
  paymentRequiresReference,
  POS_PAYMENT_OPTIONS,
  type PosPaymentLine,
} from '../../utils/pos-payment.util';
import { PosPrintService } from '../../services/pos/pos-print.service';
import { PosBarcodeWedgeService } from '../../services/pos/pos-barcode-wedge.service';
import { PosOfflineQueueService } from '../../services/pos/pos-offline-queue.service';
import { PosRealtimeService } from '../../services/pos/pos-realtime.service';
import { PosCustomerDisplayService } from '../../services/pos/pos-customer-display.service';

type SaleMutationResult = SaleDetailDto | { offlineQueued: true; offlineLocalId: string };

const IGV_RATE = 0.18;

type CartLine = {
  productId: string;
  nombre: string;
  codigoInterno: string | null;
  precio: number;
  quantity: number;
  necesitaRecetaMedica: boolean;
  esControlado: boolean;
  manejaLotes: boolean;
  lotMode: SaleLotAllocationMode;
  manualLots: { lotCode: string; quantity: number }[];
  substitutedFromProductId?: string;
  substitutedFromNombre?: string;
};

const DOC_OPTIONS: { value: SaleDocumentType; label: string }[] = [
  { value: 'BOLETA', label: 'Boleta' },
  { value: 'FACTURA', label: 'Factura' },
  { value: 'NOTA_VENTA', label: 'Nota de venta' },
  { value: 'TICKET', label: 'Ticket' },
];

@Component({
  selector: 'app-punto-venta',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    ButtonComponent,
    FormSelectComponent,
    FormFieldComponent,
    FormRowComponent,
    FormStackComponent,
    LabelComponent,
    InputFieldComponent,
    ModalComponent,
    PageStateComponent,
  ],
  templateUrl: './punto-venta.component.html',
})
export class PuntoVentaComponent implements OnDestroy {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();
  private readonly posPrint = inject(PosPrintService);
  private readonly barcodeWedge = inject(PosBarcodeWedgeService);
  private readonly offlineQueue = inject(PosOfflineQueueService);
  private readonly posRealtime = inject(PosRealtimeService);
  private readonly customerDisplay = inject(PosCustomerDisplayService);
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private readonly onOnline = () => {
    this.isOnline.set(true);
    void this.syncOfflineQueue();
  };
  private readonly onOffline = () => this.isOnline.set(false);

  protected readonly docOptions = DOC_OPTIONS;
  protected readonly paymentOptions = POS_PAYMENT_OPTIONS;

  protected readonly warehouseId = signal('');
  protected readonly documentType = signal<SaleDocumentType>('BOLETA');
  protected readonly serie = signal('');
  protected readonly customerId = signal('');
  protected readonly customerLabel = signal('');
  protected readonly customerSearch = signal('');
  protected readonly customerOptions = signal<CustomerItemDto[]>([]);
  protected readonly search = signal('');
  protected readonly catalog = signal<PosCatalogItemDto[]>([]);
  protected readonly catalogLoading = signal(false);
  protected readonly cart = signal<CartLine[]>([]);
  protected readonly prescriptionValidated = signal(false);
  protected readonly prescriptionId = signal('');
  protected readonly prescriptionNote = signal('');
  protected readonly patientPrescriptions = signal<PrescriptionSummaryDto[]>([]);
  protected readonly promotionCode = signal('');
  protected readonly comentario = signal('');
  protected readonly payModalOpen = signal(false);
  protected readonly lotModalProductId = signal<string | null>(null);
  protected readonly lotPreviewLoading = signal(false);
  protected readonly lotPreviewRows = signal<{ codigoLote: string; cantidad: string }[]>([]);
  protected readonly manualLotCode = signal('');
  protected readonly manualLotQty = signal(1);
  protected readonly paymentLines = signal<PosPaymentLine[]>([createPaymentLine()]);
  protected readonly lastSale = signal<SaleDetailDto | null>(null);
  protected readonly lastSunatStatus = signal<SaleBillingStatusDto | null>(null);
  protected readonly interactionAlerts = signal<SaleInteractionAlertDto[]>([]);
  protected readonly interactionsAcknowledged = signal(false);
  protected readonly interactionsLoading = signal(false);
  protected readonly controlledApprovedById = signal('');
  protected readonly pharmaApprovers = signal<PharmaApproverDto[]>([]);
  protected readonly substituteModalProductId = signal<string | null>(null);
  protected readonly substituteOptions = signal<PosSubstituteItemDto[]>([]);
  protected readonly substituteLoading = signal(false);
  protected readonly isOnline = signal(typeof navigator !== 'undefined' ? navigator.onLine : true);
  protected readonly offlinePending = computed(() => this.offlineQueue.pendingCount());

  private interactionTimer: ReturnType<typeof setTimeout> | null = null;
  private catalogLoadTimer: ReturnType<typeof setTimeout> | null = null;
  private sunatPollTimer: ReturnType<typeof setInterval> | null = null;

  protected readonly warehousesQuery = injectQuery(() => ({
    queryKey: ['inventory', 'warehouses'] as const,
    queryFn: () => firstValueFrom(this.api.listInventoryMovementWarehouses()),
  }));

  protected readonly cashSessionQuery = injectQuery(() => ({
    queryKey: ['cash', 'active-session'] as const,
    queryFn: () => firstValueFrom(this.api.getActiveCashSession()),
    refetchInterval: 60_000,
  }));

  protected readonly posPaymentSettingsQuery = injectQuery(() => ({
    queryKey: ['establishments', 'pos-payment-settings'] as const,
    queryFn: () => firstValueFrom(this.api.getPosPaymentSettings()),
    staleTime: 5 * 60_000,
  }));

  protected readonly warehouseOptions = computed(() => [
    { value: '', label: 'Almacén de venta' },
    ...(this.warehousesQuery.data() ?? []).map((w) => ({
      value: w.id,
      label: `${w.nombre} · ${w.establishment.nombre}`,
    })),
  ]);

  protected readonly cartTotal = computed(() =>
    this.cart().reduce((acc, line) => acc + line.precio * line.quantity, 0),
  );

  protected readonly cartSubtotal = computed(() => this.cartTotal() / (1 + IGV_RATE));
  protected readonly cartIgv = computed(() => this.cartTotal() - this.cartSubtotal());
  protected readonly paymentPaidTotal = computed(() =>
    this.paymentLines().reduce((acc, line) => acc + (Number(line.monto) || 0), 0),
  );
  protected readonly paymentRemaining = computed(
    () => Math.round((this.cartTotal() - this.paymentPaidTotal()) * 100) / 100,
  );
  protected readonly requiresRx = computed(() => this.cart().some((l) => l.necesitaRecetaMedica));
  protected readonly requiresControlled = computed(() => this.cart().some((l) => l.esControlado));
  protected readonly approverOptions = computed(() => [
    { value: '', label: 'Farmacéutico autorizador…' },
    ...this.pharmaApprovers().map((u) => ({ value: u.id, label: u.nombre })),
  ]);
  protected readonly prescriptionOptions = computed(() =>
    this.patientPrescriptions().map((rx) => ({
      value: rx.id,
      label: `${rx.numero} · ${rx.estado} · ${rx.medicoNombre ?? 'Sin médico'}`,
    })),
  );
  protected readonly hasGraveInteractions = computed(() =>
    this.interactionAlerts().some((a) => a.severidad === 'GRAVE'),
  );
  protected readonly cashSession = computed(() => this.cashSessionQuery.data());
  protected readonly posPaymentHints = computed(() => this.posPaymentSettingsQuery.data());
  protected readonly hasPosPaymentHints = computed(
    () => this.posPaymentHints()?.posYapeNumero || this.posPaymentHints()?.posPlinNumero,
  );
  protected readonly lotModalLine = computed(() =>
    this.cart().find((l) => l.productId === this.lotModalProductId()) ?? null,
  );

  protected posBootstrapError(): string | null {
    if (this.warehousesQuery.isError()) {
      return httpErrorMessage(this.warehousesQuery.error(), 'No se pudieron cargar los almacenes.');
    }
    if (this.cashSessionQuery.isError()) {
      return httpErrorMessage(this.cashSessionQuery.error(), 'No se pudo verificar la caja activa.');
    }
    return null;
  }

  protected refetchPosBootstrap() {
    void this.warehousesQuery.refetch();
    void this.cashSessionQuery.refetch();
  }

  constructor() {
    this.posRealtime.connect({
      onStockUpdated: (payload) => {
        const wh = this.warehouseId();
        if (wh && payload.warehouseId === wh) {
          void this.loadCatalog(false);
        }
      },
      onSaleCompleted: () => {
        void this.loadCatalog(false);
      },
      onBillingStatus: (payload) => {
        const last = this.lastSale();
        if (last?.id === payload.saleId) {
          this.lastSunatStatus.set({
            electronicDocumentId: '',
            sunatStatus: payload.sunatStatus,
            sunatCodigo: payload.sunatCodigo ?? null,
            sunatDescripcion: payload.sunatDescripcion ?? null,
            serie: last.serie ?? '',
            numero: last.numero ?? '',
          });
        }
      },
    });
    this.barcodeWedge.onScan((code) => {
      this.search.set(code);
      void this.runSearch();
    });
    void this.offlineQueue.refreshCount();
    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOffline);

    effect(() => {
      const warehouses = this.warehousesQuery.data();
      if (!warehouses?.length || this.warehouseId()) return;
      this.warehouseId.set(warehouses[0]!.id);
    });

    effect((onCleanup) => {
      const wh = this.warehouseId();
      const term = this.search().trim();
      if (!wh) {
        this.catalog.set([]);
        return;
      }
      if (this.catalogLoadTimer) clearTimeout(this.catalogLoadTimer);
      this.catalogLoadTimer = setTimeout(() => {
        void this.loadCatalog(false);
      }, term ? 350 : 0);
      onCleanup(() => {
        if (this.catalogLoadTimer) {
          clearTimeout(this.catalogLoadTimer);
          this.catalogLoadTimer = null;
        }
      });
    });

    effect(() => {
      const session = this.cashSession();
      this.barcodeWedge.setEnabled(session?.cashRegister?.barcodeWedgeEnabled ?? false);
    });

    effect(() => {
      const session = this.cashSession();
      if (!session?.cashRegister?.customerDisplayEnabled) return;
      const cart = this.cart();
      if (!cart.length) {
        this.customerDisplay.publish({ type: 'clear' });
        return;
      }
      this.customerDisplay.publish({
        type: 'cart',
        total: this.cartTotal(),
        lines: cart.map((l) => ({
          nombre: l.nombre,
          quantity: l.quantity,
          precio: l.precio,
        })),
      });
    });

    effect(() => {
      if (this.payModalOpen()) {
        const total = Math.round(this.cartTotal() * 100) / 100;
        this.paymentLines.set([createPaymentLine('EFECTIVO', total)]);
      }
    });

    effect(() => {
      const cart = this.cart();
      if (this.interactionTimer) clearTimeout(this.interactionTimer);
      this.interactionsAcknowledged.set(false);
      if (cart.length < 2) {
        this.interactionAlerts.set([]);
        return;
      }
      this.interactionTimer = setTimeout(() => {
        void this.refreshInteractions();
      }, 400);
    });
  }

  ngOnDestroy() {
    this.posRealtime.disconnect();
    this.barcodeWedge.setEnabled(false);
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('offline', this.onOffline);
    if (this.interactionTimer) clearTimeout(this.interactionTimer);
    if (this.catalogLoadTimer) clearTimeout(this.catalogLoadTimer);
    if (this.sunatPollTimer) clearInterval(this.sunatPollTimer);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (event.key === 'F1') {
      event.preventDefault();
      this.searchInput()?.nativeElement.focus();
    }
    if (event.key === 'F2' && this.cart().length > 0) {
      event.preventDefault();
      void this.openPayModal();
    }
    if (event.key === 'F4') {
      event.preventDefault();
      this.clearCart();
      this.notify.info('Carrito vaciado');
    }
  }

  protected async loadCatalog(explicit = false) {
    const wh = this.warehouseId();
    if (!wh) {
      if (explicit) this.notify.warning('Seleccione un almacén');
      return;
    }
    this.catalogLoading.set(true);
    try {
      const term = this.search().trim();
      const rows = await firstValueFrom(this.api.getPosCatalog(wh, term || undefined));
      const wedgeEnabled = this.cashSession()?.cashRegister?.barcodeWedgeEnabled ?? false;
      if (explicit && wedgeEnabled && term) {
        const normalized = term.toLowerCase();
        const exact = rows.filter(
          (r) =>
            r.codigoBarra?.toLowerCase() === normalized ||
            r.codigoInterno?.toLowerCase() === normalized,
        );
        if (exact.length === 1) {
          this.addToCart(exact[0]);
          return;
        }
      }
      this.catalog.set(rows);
      if (explicit && rows.length === 0) this.notify.info('Sin resultados');
    } catch (err) {
      this.catalog.set([]);
      this.notify.error(httpErrorMessage(err, 'Error al cargar productos'));
    } finally {
      this.catalogLoading.set(false);
    }
  }

  protected runSearch() {
    void this.loadCatalog(true);
  }

  protected async searchCustomers() {
    const term = this.customerSearch().trim();
    if (!term) return;
    const res = await firstValueFrom(this.api.listCustomers({ search: term, page: 1, pageSize: 8 }));
    this.customerOptions.set(res.items);
  }

  protected selectCustomer(c: CustomerItemDto) {
    this.customerId.set(c.id);
    this.customerLabel.set(c.nombre);
    this.customerOptions.set([]);
    this.customerSearch.set('');
    this.prescriptionId.set('');
    this.prescriptionValidated.set(false);
    void this.loadPatientPrescriptions(c.id);
  }

  protected async loadPatientPrescriptions(customerId: string) {
    try {
      const rows = await firstValueFrom(this.api.listPrescriptionsByCustomer(customerId));
      this.patientPrescriptions.set(rows);
    } catch {
      this.patientPrescriptions.set([]);
    }
  }

  protected onPrescriptionSelected(id: string) {
    this.prescriptionId.set(id);
    this.prescriptionValidated.set(!!id);
  }

  protected clearCustomer() {
    this.customerId.set('');
    this.customerLabel.set('');
  }

  protected addToCart(item: PosCatalogItemDto) {
    const price = Number.parseFloat(item.precio);
    const stock = Number.parseFloat(item.stock);
    if (stock <= 0) {
      this.notify.warning(
        item.manejaLotes
          ? 'Sin stock vendible en lotes elegibles (revise vencimientos o lotes registrados)'
          : 'Sin stock disponible',
      );
      return;
    }
    const existing = this.cart().find((l) => l.productId === item.id);
    const nextQty = (existing?.quantity ?? 0) + 1;
    if (nextQty > stock) {
      this.notify.warning(`Stock insuficiente (disponible: ${stock})`);
      return;
    }
    if (existing) {
      this.cart.update((lines) =>
        lines.map((l) => (l.productId === item.id ? { ...l, quantity: nextQty } : l)),
      );
    } else {
      this.cart.update((lines) => [
        ...lines,
        {
          productId: item.id,
          nombre: item.nombre,
          codigoInterno: item.codigoInterno,
          precio: price,
          quantity: 1,
          necesitaRecetaMedica: item.necesitaRecetaMedica,
          esControlado: item.esControlado,
          manejaLotes: item.manejaLotes,
          lotMode: 'AUTO',
          manualLots: [],
        },
      ]);
    }
    this.search.set('');
    this.searchInput()?.nativeElement.focus();
    void this.loadCatalog(false);
  }

  protected updateQty(productId: string, delta: number) {
    const catalogItem = this.catalog().find((p) => p.id === productId);
    const maxStock = catalogItem ? Number.parseFloat(catalogItem.stock) : Number.POSITIVE_INFINITY;
    this.cart.update((lines) =>
      lines
        .map((l) => {
          if (l.productId !== productId) return l;
          const nextQty = Math.max(0, l.quantity + delta);
          if (nextQty > maxStock) {
            this.notify.warning(`Stock insuficiente (${catalogItem?.stock ?? '?'})`);
            return l;
          }
          return { ...l, quantity: nextQty };
        })
        .filter((l) => l.quantity > 0),
    );
  }

  protected removeLine(productId: string) {
    this.cart.update((lines) => lines.filter((l) => l.productId !== productId));
  }

  protected clearCart() {
    this.cart.set([]);
    this.prescriptionValidated.set(false);
    this.prescriptionId.set('');
    this.prescriptionNote.set('');
    this.controlledApprovedById.set('');
    this.promotionCode.set('');
    this.comentario.set('');
    this.interactionAlerts.set([]);
    this.interactionsAcknowledged.set(false);
    void this.loadCatalog(false);
  }

  protected stockForProduct(productId: string): number | null {
    const item = this.catalog().find((p) => p.id === productId);
    return item ? Number.parseFloat(item.stock) : null;
  }

  protected cartQtyForProduct(productId: string): number {
    return this.cart().find((l) => l.productId === productId)?.quantity ?? 0;
  }

  protected validateCartStock(showNotify = true): boolean {
    for (const line of this.cart()) {
      const stock = this.stockForProduct(line.productId);
      if (stock === null) {
        if (showNotify) {
          this.notify.warning(`${line.nombre}: ya no tiene stock en este almacén`);
        }
        return false;
      }
      if (line.quantity > stock) {
        if (showNotify) {
          this.notify.warning(`${line.nombre}: stock disponible ${stock}`);
        }
        return false;
      }
    }
    return true;
  }

  protected acknowledgeInteractions() {
    this.interactionsAcknowledged.set(true);
    this.notify.info('Alertas de interacción confirmadas por el farmacéutico');
  }

  private async refreshInteractions() {
    const ids = this.cart().map((l) => l.productId);
    if (ids.length < 2) {
      this.interactionAlerts.set([]);
      return;
    }
    this.interactionsLoading.set(true);
    try {
      const res = await firstValueFrom(this.api.checkSaleInteractions(ids));
      this.interactionAlerts.set(res.alerts);
      if (res.hasAlerts && res.alerts.some((a) => a.severidad === 'GRAVE')) {
        this.notify.warning('Interacción medicamentosa grave detectada en el carrito');
      }
    } catch {
      this.interactionAlerts.set([]);
    } finally {
      this.interactionsLoading.set(false);
    }
  }

  protected async openLotModal(productId: string) {
    this.lotModalProductId.set(productId);
    await this.refreshLotPreview();
  }

  protected closeLotModal() {
    this.lotModalProductId.set(null);
    this.lotPreviewRows.set([]);
  }

  protected setLotMode(mode: SaleLotAllocationMode) {
    const id = this.lotModalProductId();
    if (!id) return;
    this.cart.update((lines) =>
      lines.map((l) =>
        l.productId === id ? { ...l, lotMode: mode, manualLots: mode === 'AUTO' ? [] : l.manualLots } : l,
      ),
    );
    void this.refreshLotPreview();
  }

  protected addManualLot() {
    const id = this.lotModalProductId();
    const code = this.manualLotCode().trim();
    const qty = this.manualLotQty();
    if (!id || !code || qty <= 0) return;
    this.cart.update((lines) =>
      lines.map((l) =>
        l.productId === id
          ? { ...l, lotMode: 'MANUAL' as const, manualLots: [...l.manualLots, { lotCode: code, quantity: qty }] }
          : l,
      ),
    );
    this.manualLotCode.set('');
    this.manualLotQty.set(1);
    void this.refreshLotPreview();
  }

  protected async refreshLotPreview() {
    const line = this.lotModalLine();
    const wh = this.warehouseId();
    if (!line || !wh) return;
    this.lotPreviewLoading.set(true);
    try {
      const res = await firstValueFrom(
        this.api.previewSaleLotAllocation({
          productId: line.productId,
          warehouseId: wh,
          quantity: line.quantity,
          mode: line.lotMode,
          manualLots: line.lotMode === 'MANUAL' ? line.manualLots : undefined,
        }),
      );
      this.lotPreviewRows.set(res.asignacion ?? []);
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo previsualizar lotes'));
    } finally {
      this.lotPreviewLoading.set(false);
    }
  }

  protected async openPayModal() {
    if (!this.warehouseId()) {
      this.notify.warning('Seleccione almacén');
      return;
    }
    if (this.cart().length === 0) return;
    await this.loadCatalog(false);
    if (!this.validateCartStock()) return;
    if (this.requiresRx() && !this.prescriptionValidated() && !this.prescriptionId()) {
      this.notify.warning('Seleccione una receta o valide manualmente antes de cobrar');
      return;
    }
    if (this.interactionAlerts().length > 0 && !this.interactionsAcknowledged()) {
      this.notify.warning('Confirme las alertas de interacción medicamentosa antes de cobrar');
      return;
    }
    if (this.requiresControlled()) {
      void this.loadApprovers();
    }
    this.payModalOpen.set(true);
  }

  protected readonly requiresPaymentReference = paymentRequiresReference;

  protected get paymentLineRows(): PosPaymentLine[] {
    return this.paymentLines();
  }

  protected updatePaymentLine(
    localId: string,
    patch: Partial<Pick<PosPaymentLine, 'metodo' | 'monto' | 'referencia'>>,
  ) {
    this.paymentLines.update((lines) =>
      lines.map((line) => (line.localId === localId ? { ...line, ...patch } : line)),
    );
  }

  protected addPaymentLine() {
    const remaining = Math.max(0, this.paymentRemaining());
    this.paymentLines.update((lines) => [...lines, createPaymentLine('YAPE', remaining)]);
  }

  protected removePaymentLine(localId: string) {
    this.paymentLines.update((lines) =>
      lines.length <= 1 ? lines : lines.filter((line) => line.localId !== localId),
    );
  }

  protected fillRemaining(localId: string) {
    const remaining = this.paymentRemaining();
    if (remaining <= 0) return;
    const line = this.paymentLines().find((item) => item.localId === localId);
    if (!line) return;
    this.updatePaymentLine(localId, {
      monto: Math.round((line.monto + remaining) * 100) / 100,
    });
  }

  protected async loadApprovers() {
    try {
      const rows = await firstValueFrom(this.api.listPharmaApprovers(true));
      this.pharmaApprovers.set(rows);
    } catch {
      this.pharmaApprovers.set([]);
    }
  }

  protected async openSubstituteModal(productId: string) {
    const wh = this.warehouseId();
    if (!wh) {
      this.notify.warning('Seleccione almacén');
      return;
    }
    this.substituteModalProductId.set(productId);
    this.substituteLoading.set(true);
    try {
      const rows = await firstValueFrom(this.api.getPosSubstitutes(productId, wh));
      this.substituteOptions.set(rows);
      if (rows.length === 0) this.notify.info('No hay genéricos/bioequivalentes con stock');
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudieron cargar sustitutos'));
      this.substituteOptions.set([]);
    } finally {
      this.substituteLoading.set(false);
    }
  }

  protected closeSubstituteModal() {
    this.substituteModalProductId.set(null);
    this.substituteOptions.set([]);
  }

  protected applySubstitute(sub: PosSubstituteItemDto) {
    const originalId = this.substituteModalProductId();
    if (!originalId) return;
    const original = this.cart().find(
      (l) => l.productId === originalId || l.substitutedFromProductId === originalId,
    );
    if (!original) return;

    const price = Number.parseFloat(sub.precio);
    const stock = Number.parseFloat(sub.stock);
    if (original.quantity > stock) {
      this.notify.warning(`Stock insuficiente del sustituto (${sub.stock})`);
      return;
    }

    this.cart.update((lines) =>
      lines.map((l) =>
        l.productId === original!.productId
          ? {
              ...l,
              productId: sub.id,
              nombre: sub.nombre,
              codigoInterno: sub.codigoInterno,
              precio: price,
              substitutedFromProductId: original!.substitutedFromProductId ?? originalId,
              substitutedFromNombre: original!.substitutedFromNombre ?? original!.nombre,
            }
          : l,
      ),
    );
    this.notify.success(`Sustituido por ${sub.nombre}`);
    this.closeSubstituteModal();
  }

  protected buildSubstitutions(): CreateSaleSubstitutionRequest[] {
    return this.cart()
      .filter((l) => l.substitutedFromProductId)
      .map((l) => ({
        originalProductId: l.substitutedFromProductId!,
        substituteProductId: l.productId,
        motivo: 'Sustitución genérica/bioequivalente en POS',
      }));
  }

  protected buildSaleRequest(): CreateSaleRequest {
    const substitutions = this.buildSubstitutions();
    return {
      warehouseId: this.warehouseId(),
      cashSessionId: this.cashSession()?.id,
      customerId: this.customerId() || undefined,
      documentType: this.documentType(),
      serie: this.serie().trim() || undefined,
      prescriptionValidated: this.prescriptionValidated() || !!this.prescriptionId(),
      prescriptionId: this.prescriptionId() || undefined,
      controlledApprovedById: this.controlledApprovedById() || undefined,
      prescriptionNote: this.prescriptionNote().trim() || undefined,
      promotionCode: this.promotionCode().trim() || undefined,
      comentario: this.comentario().trim() || undefined,
      substitutions: substitutions.length ? substitutions : undefined,
      items: this.cart().map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: l.precio,
        lotAllocationMode: l.manejaLotes ? l.lotMode : undefined,
        manualLots: l.lotMode === 'MANUAL' ? l.manualLots : undefined,
      })),
      payments: this.paymentLines().map((line) => ({
        metodo: line.metodo,
        monto: line.monto,
        referencia: line.referencia.trim() || undefined,
      })),
    };
  }

  protected readonly saleMutation = injectMutation(() => ({
    mutationFn: async (): Promise<SaleMutationResult> => {
      const total = this.cartTotal();
      const paid = this.paymentPaidTotal();
      if (Math.abs(paid - total) > 0.02) {
        throw new Error('La suma de los pagos debe coincidir con el total');
      }
      for (const line of this.paymentLines()) {
        if (line.monto <= 0) {
          throw new Error('Cada pago debe tener un monto mayor a cero');
        }
        if (paymentRequiresReference(line.metodo) && !line.referencia.trim()) {
          throw new Error(`Ingrese el código de operación para ${line.metodo}`);
        }
      }
      if (this.requiresControlled() && !this.controlledApprovedById()) {
        throw new Error('Seleccione el farmacéutico que autoriza la dispensación de controlados');
      }
      const body = this.buildSaleRequest();
      try {
        return await firstValueFrom(this.api.createSale(body, crypto.randomUUID()));
      } catch (err) {
        if (this.shouldQueueOffline(err)) {
          const offlineLocalId = crypto.randomUUID();
          await this.offlineQueue.enqueue(offlineLocalId, body);
          return { offlineQueued: true, offlineLocalId };
        }
        throw err;
      }
    },
    onSuccess: (result) => {
      if ('offlineQueued' in result) {
        this.notify.warning('Venta guardada localmente. Se sincronizará al reconectar.');
        this.payModalOpen.set(false);
        this.clearCart();
        return;
      }
      const sale = result;
      this.notify.success(`Venta ${sale.serie ?? ''}-${sale.numero ?? ''} registrada`);
      this.lastSale.set(sale);
      this.lastSunatStatus.set(null);
      if (sale.documentType === 'BOLETA' || sale.documentType === 'FACTURA') {
        this.posRealtime.joinSale(sale.id);
        this.pollSunatStatus(sale.id);
      }
      this.payModalOpen.set(false);
      this.clearCart();
      void this.loadCatalog(false);
      const hw = this.cashSession()?.cashRegister;
      if (this.posPrint.shouldAutoPrint(hw)) {
        this.posPrint.printTicket(sale, hw);
      }
      if (hw?.customerDisplayEnabled) {
        this.customerDisplay.publish({
          type: 'sale',
          documentType: sale.documentType,
          serie: sale.serie,
          numero: sale.numero,
          total: sale.total,
        });
      }
      void this.queryClient.invalidateQueries({ queryKey: ['sales'] });
      void this.queryClient.invalidateQueries({ queryKey: ['cash'] });
      void this.queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar la venta')),
  }));

  protected async confirmSale() {
    await this.loadCatalog(false);
    if (!this.validateCartStock()) return;
    this.saleMutation.mutate();
  }

  protected reprintLast() {
    const sale = this.lastSale();
    if (sale) this.posPrint.printTicket(sale, this.cashSession()?.cashRegister);
  }

  private shouldQueueOffline(err: unknown): boolean {
    if (!navigator.onLine) return true;
    if (err && typeof err === 'object' && 'status' in err) {
      const status = (err as { status?: number }).status;
      return status === 0 || status === 502 || status === 503 || status === 504;
    }
    return false;
  }

  private async syncOfflineQueue() {
    const pending = await this.offlineQueue.list();
    if (!pending.length) return;
    try {
      const res = await firstValueFrom(
        this.api.syncSales({
          sales: pending.map((row) => ({
            offlineLocalId: row.offlineLocalId,
            sale: row.sale,
          })),
        }),
      );
      for (const row of res.results) {
        if (row.ok) await this.offlineQueue.remove(row.offlineLocalId);
      }
      if (res.synced > 0) {
        this.notify.success(`${res.synced} venta(s) offline sincronizada(s)`);
        void this.queryClient.invalidateQueries({ queryKey: ['sales'] });
        void this.queryClient.invalidateQueries({ queryKey: ['cash'] });
      }
      if (res.failed > 0) {
        this.notify.warning(`${res.failed} venta(s) no se pudieron sincronizar`);
      }
    } catch {
      /* reintento al siguiente evento online */
    }
  }

  protected sunatStatusClass(status: SunatDocumentStatus): string {
    if (status === 'ACEPTADO') return 'bg-emerald-100 text-emerald-800';
    if (status === 'RECHAZADO') return 'bg-red-100 text-red-800';
    if (status === 'PENDIENTE' || status === 'ENVIANDO') return 'bg-amber-100 text-amber-800';
    if (status === 'CONTINGENCIA') return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  }

  private pollSunatStatus(saleId: string) {
    if (this.sunatPollTimer) clearInterval(this.sunatPollTimer);
    let attempts = 0;
    const poll = async () => {
      try {
        const status = await firstValueFrom(this.api.getSaleBillingStatus(saleId));
        if (status) {
          this.lastSunatStatus.set(status);
          if (['ACEPTADO', 'OBSERVADO', 'RECHAZADO', 'ANULADO'].includes(status.sunatStatus)) {
            if (this.sunatPollTimer) clearInterval(this.sunatPollTimer);
            this.sunatPollTimer = null;
          }
        }
      } catch {
        /* polling opcional */
      }
      attempts += 1;
      if (attempts >= 15 && this.sunatPollTimer) {
        clearInterval(this.sunatPollTimer);
        this.sunatPollTimer = null;
      }
    };
    void poll();
    this.sunatPollTimer = setInterval(() => void poll(), 2000);
  }
}
