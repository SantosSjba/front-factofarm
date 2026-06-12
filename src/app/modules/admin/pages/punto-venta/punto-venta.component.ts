import { CommonModule, CurrencyPipe } from '@angular/common';
import {
  Component,
  HostListener,
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
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type {
  CustomerItemDto,
  PaymentMethod,
  PosCatalogItemDto,
  SaleBillingStatusDto,
  SaleDetailDto,
  SaleDocumentType,
  SaleInteractionAlertDto,
  SaleLotAllocationMode,
  SunatDocumentStatus,
} from '../../models/directory.models';

const IGV_RATE = 0.18;

type CartLine = {
  productId: string;
  nombre: string;
  codigoInterno: string | null;
  precio: number;
  quantity: number;
  necesitaRecetaMedica: boolean;
  manejaLotes: boolean;
  lotMode: SaleLotAllocationMode;
  manualLots: { lotCode: string; quantity: number }[];
};

const DOC_OPTIONS: { value: SaleDocumentType; label: string }[] = [
  { value: 'BOLETA', label: 'Boleta' },
  { value: 'FACTURA', label: 'Factura' },
  { value: 'NOTA_VENTA', label: 'Nota de venta' },
  { value: 'TICKET', label: 'Ticket' },
];

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TARJETA', label: 'Tarjeta' },
  { value: 'YAPE', label: 'Yape' },
  { value: 'PLIN', label: 'Plin' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
];

@Component({
  selector: 'app-punto-venta',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    ButtonComponent,
    FormSelectComponent,
    InputFieldComponent,
    ModalComponent,
  ],
  templateUrl: './punto-venta.component.html',
})
export class PuntoVentaComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  protected readonly docOptions = DOC_OPTIONS;
  protected readonly paymentOptions = PAYMENT_OPTIONS;

  protected readonly warehouseId = signal('');
  protected readonly documentType = signal<SaleDocumentType>('BOLETA');
  protected readonly serie = signal('');
  protected readonly customerId = signal('');
  protected readonly customerLabel = signal('');
  protected readonly customerSearch = signal('');
  protected readonly customerOptions = signal<CustomerItemDto[]>([]);
  protected readonly search = signal('');
  protected readonly catalog = signal<PosCatalogItemDto[]>([]);
  protected readonly cart = signal<CartLine[]>([]);
  protected readonly prescriptionValidated = signal(false);
  protected readonly prescriptionNote = signal('');
  protected readonly promotionCode = signal('');
  protected readonly comentario = signal('');
  protected readonly payModalOpen = signal(false);
  protected readonly lotModalProductId = signal<string | null>(null);
  protected readonly lotPreviewLoading = signal(false);
  protected readonly lotPreviewRows = signal<{ codigoLote: string; cantidad: string }[]>([]);
  protected readonly manualLotCode = signal('');
  protected readonly manualLotQty = signal(1);
  protected readonly paymentMethod = signal<PaymentMethod>('EFECTIVO');
  protected readonly paymentAmount = signal(0);
  protected readonly lastSale = signal<SaleDetailDto | null>(null);
  protected readonly lastSunatStatus = signal<SaleBillingStatusDto | null>(null);
  protected readonly interactionAlerts = signal<SaleInteractionAlertDto[]>([]);
  protected readonly interactionsAcknowledged = signal(false);
  protected readonly interactionsLoading = signal(false);

  private interactionTimer: ReturnType<typeof setTimeout> | null = null;
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
  protected readonly requiresRx = computed(() => this.cart().some((l) => l.necesitaRecetaMedica));
  protected readonly hasGraveInteractions = computed(() =>
    this.interactionAlerts().some((a) => a.severidad === 'GRAVE'),
  );
  protected readonly cashSession = computed(() => this.cashSessionQuery.data());
  protected readonly lotModalLine = computed(() =>
    this.cart().find((l) => l.productId === this.lotModalProductId()) ?? null,
  );

  constructor() {
    effect(() => {
      if (this.payModalOpen()) {
        this.paymentAmount.set(Math.round(this.cartTotal() * 100) / 100);
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

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (event.key === 'F1') {
      event.preventDefault();
      this.searchInput()?.nativeElement.focus();
    }
    if (event.key === 'F2' && this.cart().length > 0) {
      event.preventDefault();
      this.openPayModal();
    }
    if (event.key === 'F4') {
      event.preventDefault();
      this.clearCart();
      this.notify.info('Carrito vaciado');
    }
  }

  protected async runSearch() {
    const wh = this.warehouseId();
    if (!wh) {
      this.notify.warning('Seleccione un almacén');
      return;
    }
    try {
      const rows = await firstValueFrom(this.api.getPosCatalog(wh, this.search()));
      this.catalog.set(rows);
      if (rows.length === 0) this.notify.info('Sin resultados');
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'Error al buscar productos'));
    }
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
  }

  protected clearCustomer() {
    this.customerId.set('');
    this.customerLabel.set('');
  }

  protected addToCart(item: PosCatalogItemDto) {
    const price = Number.parseFloat(item.precio);
    const stock = Number.parseFloat(item.stock);
    const existing = this.cart().find((l) => l.productId === item.id);
    const nextQty = (existing?.quantity ?? 0) + 1;
    if (nextQty > stock) {
      this.notify.warning(`Stock insuficiente (${item.stock})`);
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
          manejaLotes: item.manejaLotes,
          lotMode: 'AUTO',
          manualLots: [],
        },
      ]);
    }
    this.search.set('');
    this.catalog.set([]);
    this.searchInput()?.nativeElement.focus();
  }

  protected updateQty(productId: string, delta: number) {
    this.cart.update((lines) =>
      lines
        .map((l) =>
          l.productId === productId ? { ...l, quantity: Math.max(0, l.quantity + delta) } : l,
        )
        .filter((l) => l.quantity > 0),
    );
  }

  protected removeLine(productId: string) {
    this.cart.update((lines) => lines.filter((l) => l.productId !== productId));
  }

  protected clearCart() {
    this.cart.set([]);
    this.prescriptionValidated.set(false);
    this.prescriptionNote.set('');
    this.promotionCode.set('');
    this.comentario.set('');
    this.interactionAlerts.set([]);
    this.interactionsAcknowledged.set(false);
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

  protected openPayModal() {
    if (!this.warehouseId()) {
      this.notify.warning('Seleccione almacén');
      return;
    }
    if (this.cart().length === 0) return;
    if (this.requiresRx() && !this.prescriptionValidated()) {
      this.notify.warning('Valide la receta médica antes de cobrar');
      return;
    }
    if (this.interactionAlerts().length > 0 && !this.interactionsAcknowledged()) {
      this.notify.warning('Confirme las alertas de interacción medicamentosa antes de cobrar');
      return;
    }
    this.paymentAmount.set(this.cartTotal());
    this.payModalOpen.set(true);
  }

  protected readonly saleMutation = injectMutation(() => ({
    mutationFn: () => {
      const total = this.cartTotal();
      const amount = this.paymentAmount();
      if (Math.abs(amount - total) > 0.02) {
        throw new Error('El monto de pago debe coincidir con el total');
      }
      return firstValueFrom(
        this.api.createSale(
          {
            warehouseId: this.warehouseId(),
            cashSessionId: this.cashSession()?.id,
            customerId: this.customerId() || undefined,
            documentType: this.documentType(),
            serie: this.serie().trim() || undefined,
            prescriptionValidated: this.prescriptionValidated(),
            prescriptionNote: this.prescriptionNote().trim() || undefined,
            promotionCode: this.promotionCode().trim() || undefined,
            comentario: this.comentario().trim() || undefined,
            items: this.cart().map((l) => ({
              productId: l.productId,
              quantity: l.quantity,
              unitPrice: l.precio,
              lotAllocationMode: l.manejaLotes ? l.lotMode : undefined,
              manualLots: l.lotMode === 'MANUAL' ? l.manualLots : undefined,
            })),
            payments: [{ metodo: this.paymentMethod(), monto: amount }],
          },
          crypto.randomUUID(),
        ),
      );
    },
    onSuccess: (sale) => {
      this.notify.success(`Venta ${sale.serie ?? ''}-${sale.numero ?? ''} registrada`);
      this.lastSale.set(sale);
      this.lastSunatStatus.set(null);
      if (sale.documentType === 'BOLETA' || sale.documentType === 'FACTURA') {
        this.pollSunatStatus(sale.id);
      }
      this.payModalOpen.set(false);
      this.clearCart();
      this.printTicket(sale);
      void this.queryClient.invalidateQueries({ queryKey: ['sales'] });
      void this.queryClient.invalidateQueries({ queryKey: ['cash'] });
      void this.queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar la venta')),
  }));

  protected confirmSale() {
    this.saleMutation.mutate();
  }

  protected reprintLast() {
    const sale = this.lastSale();
    if (sale) this.printTicket(sale);
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

  protected printTicket(sale: SaleDetailDto) {
    const lines = sale.items
      .map(
        (i) =>
          `<tr><td>${i.producto}</td><td align="right">${i.cantidad}</td><td align="right">${i.totalLinea}</td></tr>`,
      )
      .join('');
    const lotInfo = sale.items
      .flatMap((i) => i.lotes.map((l) => `${i.producto}: ${l.codigoLote} × ${l.cantidad}`))
      .join('<br/>');
    const html = `<!DOCTYPE html><html><head><title>Ticket ${sale.serie}-${sale.numero}</title>
      <style>body{font-family:monospace;font-size:12px;max-width:280px;margin:0 auto;padding:8px}
      table{width:100%;border-collapse:collapse}td{padding:2px 0}.totals{margin-top:8px;border-top:1px dashed #000;padding-top:4px}</style></head>
      <body onload="window.print();window.close()">
      <h3 style="text-align:center;margin:0">FactoFarm</h3>
      <p style="text-align:center;margin:4px 0">${sale.documentType} ${sale.serie ?? ''}-${sale.numero ?? ''}</p>
      <p style="font-size:10px">${new Date(sale.createdAt).toLocaleString('es-PE')}</p>
      ${sale.customer ? `<p>Cliente: ${sale.customer.nombre}</p>` : ''}
      <table>${lines}</table>
      <div class="totals">
        <div>Subtotal: S/ ${sale.subtotal}</div>
        <div>IGV: S/ ${sale.igvTotal}</div>
        <div><strong>Total: S/ ${sale.total}</strong></div>
      </div>
      ${lotInfo ? `<p style="font-size:10px;margin-top:8px">Lotes:<br/>${lotInfo}</p>` : ''}
      <p style="text-align:center;margin-top:12px;font-size:10px">Gracias por su compra</p>
      </body></html>`;
    const w = window.open('', '_blank', 'width=320,height=600');
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  }
}
