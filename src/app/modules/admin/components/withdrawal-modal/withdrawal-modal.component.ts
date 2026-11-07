import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { inventoryMovementQueryKeys } from '../../../../core/query/inventory-movement-query.keys';
import { NotifyService } from '../../../../core/services/notify.service';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { TextAreaComponent } from '../../../../shared/components/form/input/text-area.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { FormSectionComponent } from '../../../../shared/components/form/form-section/form-section.component';
import { SearchSelectComponent } from '../../../../shared/components/form/search-select/search-select.component';
import { SuggestInputComponent } from '../../../../shared/components/form/suggest-input/suggest-input.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { BadgeComponent } from '../../../../shared/components/ui/badge/badge.component';
import { QuickCreateComponent } from '../quick-create/quick-create.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type { WithdrawalProductOptionDto } from '../../models/directory.models';

/** Lo que llega precargado al abrir: el almacén y, si se conoce, el producto. */
export interface WithdrawalPreset {
  warehouseId?: string;
  productId?: string;
  /** Texto para encontrar el producto cuando no se trae su stock (nombre o código). */
  productSearch?: string;
  /** Si viene el producto completo (con stock), no hace falta buscarlo. */
  product?: WithdrawalProductOptionDto;
}

/**
 * Registro de salidas que no son ventas (devoluciones, retiros, mermas, destrucción, donaciones…).
 * Lo usan Devolución-retiro y el botón «−» de Movimientos, para que haya una sola forma de hacerlo.
 */
@Component({
  selector: 'app-withdrawal-modal',
  standalone: true,
  imports: [
    InputFieldComponent,
    TextAreaComponent,
    FormSelectComponent,
    FormSectionComponent,
    SearchSelectComponent,
    SuggestInputComponent,
    ButtonComponent,
    ModalComponent,
    BadgeComponent,
    QuickCreateComponent,
  ],
  templateUrl: './withdrawal-modal.component.html',
})
export class WithdrawalModalComponent implements OnChanges {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  @Input() open = false;
  @Input() preset: WithdrawalPreset | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  /** Copia interna de `open`, para que las consultas reaccionen. */
  protected readonly isOpen = signal(false);
  protected readonly warehouseId = signal('');
  protected readonly product = signal<WithdrawalProductOptionDto | null>(null);
  protected readonly productLoading = signal(false);
  protected readonly pickerTerm = signal('');
  protected readonly pickerReset = signal(0);
  protected readonly quantity = signal<number>(1);
  protected readonly lotCode = signal('');
  protected readonly lotSearch = signal('');
  protected readonly reasonId = signal('');
  protected readonly registeredAt = signal(this.nowForDatetimeLocal());
  protected readonly reference = signal('');
  protected readonly comment = signal('');
  private keepOpen = false;

  protected readonly warehousesQuery = injectQuery(() => ({
    queryKey: [...inventoryMovementQueryKeys.all, 'catalog', 'warehouses'],
    enabled: this.isOpen(),
    queryFn: () => firstValueFrom(this.api.listInventoryMovementWarehouses()),
  }));
  protected readonly reasonsQuery = injectQuery(() => ({
    queryKey: [...inventoryMovementQueryKeys.all, 'catalog', 'withdrawal-reasons'],
    enabled: this.isOpen(),
    queryFn: () => firstValueFrom(this.api.listWithdrawalReasons()),
  }));
  protected readonly warehouseOptions = computed(() =>
    (this.warehousesQuery.data() ?? []).map((w) => ({ value: w.id, label: `${w.nombre} · ${w.establishment.nombre}` })),
  );
  protected readonly reasonOptions = computed(() =>
    (this.reasonsQuery.data() ?? []).map((r) => ({ value: r.id, label: r.nombre })),
  );

  protected readonly pickerQuery = injectQuery(() => {
    const warehouseId = this.warehouseId();
    const term = this.pickerTerm().trim();
    return {
      queryKey: [...inventoryMovementQueryKeys.all, 'withdrawal-products', warehouseId, term],
      enabled: this.isOpen() && !!warehouseId && !this.product() && !this.productLoading(),
      queryFn: () => firstValueFrom(this.api.searchWithdrawalProducts(warehouseId, term || undefined)),
    };
  });
  protected readonly pickerOptions = computed(() =>
    (this.pickerQuery.data() ?? []).map((p) => ({
      value: p.productId,
      label: p.producto,
      meta: [p.codigoInterno ? `Cód. ${p.codigoInterno}` : '', `Stock: ${this.formatQty(p.stock)}`]
        .filter(Boolean)
        .join(' · '),
    })),
  );

  protected readonly lotsQuery = injectQuery(() => {
    const product = this.product();
    const warehouseId = this.warehouseId();
    const search = this.lotSearch().trim();
    return {
      queryKey: [...inventoryMovementQueryKeys.all, 'lot-codes', 'OUTBOUND', product?.productId, warehouseId, search],
      enabled: this.isOpen() && !!product?.manejaLotes && !!warehouseId,
      queryFn: () =>
        firstValueFrom(
          this.api.searchInventoryLotCodes({ productId: product!.productId, warehouseId, search, mode: 'OUTBOUND' }),
        ),
    };
  });
  protected readonly lotOptions = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (this.lotsQuery.data() ?? []).map((lot) => {
      const expiry = lot.fechaVencimiento?.slice(0, 10) ?? '';
      const expired = !!expiry && expiry < today;
      return {
        value: lot.codigoLote,
        label: lot.codigoLote,
        meta: [`Stock: ${this.formatQty(lot.stock)}`, expiry ? `${expired ? 'Vencido' : 'Vence'} ${this.formatDate(expiry)}` : '']
          .filter(Boolean)
          .join(' · '),
      };
    });
  });
  private readonly selectedLotStock = computed(() => {
    const code = this.lotCode().trim();
    if (!code) return null;
    const lot = (this.lotsQuery.data() ?? []).find((l) => l.codigoLote === code);
    return lot ? Number.parseFloat(lot.stock) || 0 : null;
  });
  protected readonly availableStock = computed(() => {
    const lotStock = this.selectedLotStock();
    if (lotStock !== null) return lotStock;
    const product = this.product();
    return product ? Number.parseFloat(product.stock) || 0 : 0;
  });
  protected readonly quantityError = computed(() => {
    const qty = this.quantity();
    if (!this.product()) return '';
    if (!Number.isFinite(qty) || qty <= 0) return 'La cantidad debe ser mayor a cero.';
    if (qty > this.availableStock()) {
      return `Solo hay ${this.formatQty(this.availableStock())} ${this.selectedLotStock() !== null ? 'en este lote' : 'en este almacén'}.`;
    }
    return '';
  });
  protected readonly quantityHint = computed(() => {
    if (!this.product()) return '';
    const left = this.availableStock() - (this.quantity() || 0);
    return `Disponible: ${this.formatQty(this.availableStock())}${this.selectedLotStock() !== null ? ' en el lote' : ''} · Quedará: ${this.formatQty(Math.max(left, 0))}`;
  });

  protected readonly saveMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.createWithdrawal({
          productId: this.product()!.productId,
          warehouseId: this.warehouseId(),
          transferReasonId: this.reasonId(),
          quantity: this.quantity(),
          lotCode: this.product()!.manejaLotes ? this.lotCode().trim() || undefined : undefined,
          registeredAt: this.registeredAt() ? new Date(this.registeredAt()).toISOString() : undefined,
          reference: this.reference().trim() || undefined,
          comment: this.comment().trim() || undefined,
        }),
      ),
    onSuccess: (res) => {
      const lots =
        res.asignacionAutomatica && res.lotes?.length
          ? ` Lotes usados: ${res.lotes.map((l) => `${l.codigoLote} (${this.formatQty(l.cantidad)})`).join(', ')}.`
          : '';
      this.notify.success(`${res.message}.${lots}`);
      void this.queryClient.invalidateQueries({ queryKey: inventoryMovementQueryKeys.all });
      this.saved.emit();
      if (this.keepOpen) this.prepareNext();
      else this.close(true);
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar la salida')),
  }));
  protected readonly saving = computed(() => this.saveMutation.isPending());

  ngOnChanges(changes: SimpleChanges) {
    if (!changes['open']) return;
    this.isOpen.set(this.open);
    if (this.open && !changes['open'].previousValue) this.start();
  }

  private start() {
    this.resetForm();
    const preset = this.preset;
    const warehouses = this.warehousesQuery.data() ?? [];
    this.warehouseId.set(preset?.warehouseId || (warehouses.length === 1 ? warehouses[0].id : ''));
    if (preset?.product) {
      this.product.set(preset.product);
    } else if (preset?.productId && preset.warehouseId) {
      void this.loadPresetProduct(preset.warehouseId, preset.productId, preset.productSearch ?? '');
    }
  }

  /** Trae el stock actual del producto en ese almacén; sin stock no hay nada que retirar. */
  private async loadPresetProduct(warehouseId: string, productId: string, search: string) {
    this.productLoading.set(true);
    try {
      const items = await firstValueFrom(this.api.searchWithdrawalProducts(warehouseId, search || undefined));
      const match = items.find((p) => p.productId === productId);
      if (match) this.product.set(match);
      else this.notify.warning('Este producto ya no tiene stock en ese almacén. Elige otro.');
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo cargar el producto'));
    } finally {
      this.productLoading.set(false);
    }
  }

  protected close(force = false) {
    if (!force && this.saving()) return;
    this.isOpen.set(false);
    this.closed.emit();
  }

  protected onWarehouseChange(id: string) {
    this.warehouseId.set(id);
    this.clearProduct();
  }

  protected selectProduct(productId: string) {
    const product = (this.pickerQuery.data() ?? []).find((p) => p.productId === productId);
    if (product) this.product.set(product);
  }

  protected clearProduct() {
    this.product.set(null);
    this.pickerTerm.set('');
    this.pickerReset.update((n) => n + 1);
    this.quantity.set(1);
    this.lotCode.set('');
    this.lotSearch.set('');
  }

  protected save(keepOpen = false) {
    if (!this.warehouseId()) {
      this.notify.warning('Selecciona el almacén de donde sale la mercadería.');
      return;
    }
    if (!this.product()) {
      this.notify.warning('Selecciona el producto.');
      return;
    }
    if (this.quantityError()) {
      this.notify.warning(this.quantityError());
      return;
    }
    if (!this.reasonId()) {
      this.notify.warning('Selecciona el motivo.');
      return;
    }
    this.keepOpen = keepOpen;
    this.saveMutation.mutate();
  }

  private resetForm() {
    this.clearProduct();
    this.reasonId.set('');
    this.registeredAt.set(this.nowForDatetimeLocal());
    this.reference.set('');
    this.comment.set('');
  }

  /** Mantiene almacén, motivo, fecha y documento: suelen repetirse en una misma devolución. */
  private prepareNext() {
    this.clearProduct();
    this.comment.set('');
  }

  protected formatQty(value: string | number) {
    const n = typeof value === 'number' ? value : Number.parseFloat(value || '0');
    return Number.isFinite(n) ? n.toLocaleString('es-PE', { maximumFractionDigits: 2 }) : '0';
  }

  private formatDate(ymd: string) {
    return ymd.slice(0, 10).split('-').reverse().join('/');
  }

  private nowForDatetimeLocal() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }
}
