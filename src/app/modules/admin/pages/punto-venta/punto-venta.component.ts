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
import { LabelComponent } from '../../../../shared/components/form/label/label.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type {
  PaymentMethod,
  PosCatalogItemDto,
  SaleDocumentType,
} from '../../models/directory.models';

type CartLine = {
  productId: string;
  nombre: string;
  codigoInterno: string | null;
  precio: number;
  quantity: number;
  necesitaRecetaMedica: boolean;
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
    LabelComponent,
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
  protected readonly search = signal('');
  protected readonly catalog = signal<PosCatalogItemDto[]>([]);
  protected readonly cart = signal<CartLine[]>([]);
  protected readonly prescriptionValidated = signal(false);
  protected readonly prescriptionNote = signal('');
  protected readonly promotionCode = signal('');
  protected readonly comentario = signal('');
  protected readonly payModalOpen = signal(false);
  protected readonly paymentMethod = signal<PaymentMethod>('EFECTIVO');
  protected readonly paymentAmount = signal(0);
  protected readonly lastSale = signal<{ serie: string | null; numero: string | null; total: string } | null>(
    null,
  );

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

  protected readonly cartSubtotal = computed(() =>
    this.cart().reduce((acc, line) => acc + line.precio * line.quantity, 0),
  );

  protected readonly requiresRx = computed(() => this.cart().some((l) => l.necesitaRecetaMedica));

  protected readonly cashSession = computed(() => this.cashSessionQuery.data());

  constructor() {
    effect(() => {
      const total = this.cartSubtotal();
      if (this.payModalOpen()) {
        this.paymentAmount.set(Math.round(total * 100) / 100);
      }
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
    this.paymentAmount.set(this.cartSubtotal());
    this.payModalOpen.set(true);
  }

  protected readonly saleMutation = injectMutation(() => ({
    mutationFn: () => {
      const total = this.cartSubtotal();
      const amount = this.paymentAmount();
      if (Math.abs(amount - total) > 0.02) {
        throw new Error('El monto de pago debe coincidir con el total');
      }
      return firstValueFrom(
        this.api.createSale(
          {
            warehouseId: this.warehouseId(),
            cashSessionId: this.cashSession()?.id,
            documentType: this.documentType(),
            prescriptionValidated: this.prescriptionValidated(),
            prescriptionNote: this.prescriptionNote().trim() || undefined,
            promotionCode: this.promotionCode().trim() || undefined,
            comentario: this.comentario().trim() || undefined,
            items: this.cart().map((l) => ({
              productId: l.productId,
              quantity: l.quantity,
              unitPrice: l.precio,
            })),
            payments: [
              {
                metodo: this.paymentMethod(),
                monto: amount,
              },
            ],
          },
          crypto.randomUUID(),
        ),
      );
    },
    onSuccess: (sale) => {
      this.notify.success(`Venta ${sale.serie ?? ''}-${sale.numero ?? ''} registrada`);
      this.lastSale.set({ serie: sale.serie, numero: sale.numero, total: sale.total });
      this.payModalOpen.set(false);
      this.clearCart();
      void this.queryClient.invalidateQueries({ queryKey: ['sales'] });
      void this.queryClient.invalidateQueries({ queryKey: ['cash'] });
      void this.queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar la venta')),
  }));

  protected confirmSale() {
    this.saleMutation.mutate();
  }
}
