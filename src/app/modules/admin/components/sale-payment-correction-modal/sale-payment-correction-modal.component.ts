import { CurrencyPipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { TextAreaComponent } from '../../../../shared/components/form/input/text-area.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import type { PaymentMethod } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';
import {
  CONFIGURABLE_REFERENCE_METHODS,
  createPaymentLine,
  paymentRequiresReference,
  POS_PAYMENT_OPTIONS,
  type PosPaymentLine,
} from '../../utils/pos-payment.util';
import { documentNumber, documentTypeLabel, paymentMethodLabel } from '../../utils/sale-labels';

/** Venta a corregir: lo que trae el listado de ventas. */
export type SalePaymentCorrectionTarget = {
  id: string;
  documentType: string;
  serie: string | null;
  numero: string | null;
  total: string;
  customer?: { nombre: string } | null;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Corrige cómo se cobró una venta (p. ej. se marcó efectivo y fue Yape) sin anularla:
 * no toca stock ni SUNAT; si cambia el efectivo, la API ajusta la caja (que debe seguir abierta).
 */
@Component({
  selector: 'app-sale-payment-correction-modal',
  standalone: true,
  imports: [CurrencyPipe, ButtonComponent, ModalComponent, TextAreaComponent, FormSelectComponent, InputFieldComponent],
  template: `
    <app-modal compact [isOpen]="!!sale()" (closed)="close()" className="w-full max-w-xl shadow-theme-lg">
      <div data-modal-header class="shrink-0 border-b border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-6 sm:py-5">
        <h3 class="pe-12 text-xl font-semibold text-gray-800 dark:text-white/90">Corregir método de pago</h3>
        @if (sale(); as s) {
          <p class="mt-1 pe-12 text-sm text-gray-500 dark:text-gray-400">
            {{ typeLabel(s.documentType) }} {{ number(s) }} · {{ s.total | currency: 'PEN' : 'symbol' : '1.2-2' }}{{ s.customer ? ' · ' + s.customer.nombre : '' }}
          </p>
        }
      </div>
      <div data-modal-body class="space-y-4 px-4 py-4 text-sm text-gray-700 dark:text-gray-300 sm:px-6">
        @if (detailQuery.isPending()) {
          <p class="text-gray-500 dark:text-gray-400">Cargando pagos de la venta…</p>
        } @else if (detailQuery.isError()) {
          <p class="text-error-600 dark:text-error-400">{{ loadError() }}</p>
        } @else {
          <div>
            <p class="text-xs text-gray-500 dark:text-gray-400">Registrado ahora</p>
            <p class="mt-0.5 text-gray-800 dark:text-white/90">{{ currentLabel() }}</p>
          </div>

          <ul class="list-disc space-y-1 ps-5">
            <li>La venta, el stock y el comprobante no cambian.</li>
            <li>Si cambia lo cobrado en efectivo, se ajusta el efectivo esperado de la caja de la venta. Esa caja debe seguir abierta.</li>
          </ul>

          <div class="space-y-3">
            @for (line of lines(); track line.localId; let i = $index) {
              <div class="grid grid-cols-1 gap-3 rounded-lg border border-gray-100 p-3 dark:border-gray-800 sm:grid-cols-[1fr_8rem_auto] sm:items-start">
                <app-form-select
                  label="Medio de pago"
                  [required]="true"
                  [showPlaceholder]="false"
                  [value]="line.metodo"
                  [options]="methodOptions"
                  [disabled]="mutation.isPending()"
                  (valueChange)="patch(line.localId, { metodo: $any($event) })"
                />
                <app-input-field
                  label="Monto"
                  [isRequired]="true"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  [value]="line.monto"
                  [disabled]="mutation.isPending() || lines().length === 1"
                  (valueChange)="patch(line.localId, { monto: +$event || 0 })"
                />
                <div class="flex sm:pt-7">
                  <app-button
                    variant="outline"
                    size="sm"
                    [iconOnly]="true"
                    startIconName="mdi:trash-can-outline"
                    [tooltip]="canRemove() ? 'Quitar este medio de pago' : 'Los pagos ya registrados no se borran: cambia su medio o su monto'"
                    [disabled]="mutation.isPending() || !canRemove()"
                    (btnClick)="remove(line.localId)"
                  />
                </div>
                @if (needsReference(line.metodo)) {
                  <app-input-field
                    class="sm:col-span-3"
                    label="Código o N° de operación"
                    [isRequired]="true"
                    placeholder="Ej. 12345678"
                    [maxLength]="120"
                    [value]="line.referencia"
                    [disabled]="mutation.isPending()"
                    (valueChange)="patch(line.localId, { referencia: $event + '' })"
                  />
                }
              </div>
            }
            <div class="flex flex-wrap items-center justify-between gap-2">
              <app-button variant="link" size="sm" startIconName="mdi:plus" [disabled]="mutation.isPending()" (btnClick)="add()">Agregar otro medio de pago</app-button>
              <span class="text-xs tabular-nums" [class.text-error-600]="!sumMatches()" [class.text-gray-500]="sumMatches()">
                Suma {{ linesTotal() | currency: 'PEN' : 'symbol' : '1.2-2' }} de {{ target() | currency: 'PEN' : 'symbol' : '1.2-2' }}
              </span>
            </div>
          </div>

          <app-text-area
            label="Motivo"
            [required]="true"
            helpText="Queda registrado en la auditoría de la venta."
            placeholder="Ej. Se cobró con Yape y se marcó efectivo"
            [maxLength]="500"
            [rows]="2"
            [value]="reason()"
            [error]="!!error()"
            [hint]="error()"
            (valueChange)="reason.set($event); error.set('')"
          />
        }
      </div>
      <div data-modal-footer class="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-6">
        <app-button variant="outline" [disabled]="mutation.isPending()" (btnClick)="close()">Cancelar</app-button>
        <app-button
          startIconName="mdi:cash-sync"
          [disabled]="!detailQuery.isSuccess() || mutation.isPending()"
          [loading]="mutation.isPending()"
          (btnClick)="submit()"
        >Guardar corrección</app-button>
      </div>
    </app-modal>
  `,
})
export class SalePaymentCorrectionModalComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  readonly sale = input<SalePaymentCorrectionTarget | null>(null);
  readonly closed = output<void>();

  protected readonly typeLabel = documentTypeLabel;
  protected readonly number = documentNumber;
  protected readonly methodOptions = POS_PAYMENT_OPTIONS;

  protected readonly lines = signal<PosPaymentLine[]>([]);
  protected readonly reason = signal('');
  protected readonly error = signal('');

  protected readonly detailQuery = injectQuery(() => ({
    queryKey: ['sales', 'detail', this.sale()?.id] as const,
    enabled: !!this.sale(),
    queryFn: () => firstValueFrom(this.api.getSale(this.sale()!.id)),
  }));

  private readonly settingsQuery = injectQuery(() => ({
    queryKey: ['establishments', 'pos-payment-settings'] as const,
    enabled: !!this.sale(),
    queryFn: () => firstValueFrom(this.api.getPosPaymentSettings()),
  }));

  private readonly referenceMethods = computed<readonly PaymentMethod[]>(
    () => this.settingsQuery.data()?.posPaymentReferenceMethods ?? CONFIGURABLE_REFERENCE_METHODS,
  );

  /** Lo cobrado al cliente: la suma de los pagos actuales (puede ser menor al total si hay convenio). */
  protected readonly target = computed(() =>
    round2((this.detailQuery.data()?.payments ?? []).reduce((acc, p) => acc + Number(p.monto), 0)),
  );
  /** Payment es registro fiscal: se pueden cambiar los pagos existentes, no quitarlos. */
  private readonly originalCount = computed(() => this.detailQuery.data()?.payments.length ?? 1);
  protected readonly canRemove = computed(() => this.lines().length > Math.max(1, this.originalCount()));

  protected readonly linesTotal = computed(() => round2(this.lines().reduce((acc, l) => acc + (l.monto || 0), 0)));
  protected readonly sumMatches = computed(() => this.linesTotal() === this.target());

  protected readonly currentLabel = computed(() =>
    (this.detailQuery.data()?.payments ?? [])
      .map((p) => `${paymentMethodLabel(p.metodo)} ${Number(p.monto).toFixed(2)}${p.referencia ? ` (op. ${p.referencia})` : ''}`)
      .join(' + ') || '—',
  );

  protected readonly loadError = computed(() => httpErrorMessage(this.detailQuery.error(), 'No se pudo cargar la venta'));

  protected readonly mutation = injectMutation(() => ({
    mutationFn: (args: { id: string; payments: { metodo: PaymentMethod; monto: number; referencia?: string }[]; reason: string }) =>
      firstValueFrom(this.api.correctSalePayments(args.id, { payments: args.payments, reason: args.reason })),
    onSuccess: (res) => {
      this.notify.success(res.message ?? 'Pago corregido.');
      for (const key of ['sales', 'cash', 'dashboard']) {
        void this.queryClient.invalidateQueries({ queryKey: [key] });
      }
      this.close(true);
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo corregir el pago')),
  }));

  constructor() {
    effect(() => {
      if (this.sale()) {
        this.reason.set('');
        this.error.set('');
        this.lines.set([]);
      }
    });
    // Propone el medio contrario al actual: lo habitual es cambiar efectivo ↔ Yape.
    effect(() => {
      const detail = this.detailQuery.data();
      if (!detail || this.lines().length) return;
      const current = detail.payments.filter((p) => p.metodo !== 'CREDITO');
      const single = current.length === 1 ? current[0] : null;
      const suggested: PaymentMethod = single?.metodo === 'EFECTIVO' ? 'YAPE' : 'EFECTIVO';
      this.lines.set(
        single
          ? [createPaymentLine(suggested, round2(Number(single.monto)))]
          : current.map((p) => ({ ...createPaymentLine(p.metodo, round2(Number(p.monto))), referencia: p.referencia ?? '' })),
      );
    });
  }

  protected needsReference(metodo: PaymentMethod): boolean {
    return paymentRequiresReference(metodo, this.referenceMethods());
  }

  protected patch(localId: string, change: Partial<PosPaymentLine>) {
    this.lines.update((rows) => rows.map((l) => (l.localId === localId ? { ...l, ...change } : l)));
    this.error.set('');
  }

  protected add() {
    const remaining = round2(this.target() - this.linesTotal());
    this.lines.update((rows) => [...rows, createPaymentLine('EFECTIVO', remaining > 0 ? remaining : 0)]);
  }

  protected remove(localId: string) {
    if (!this.canRemove()) return;
    this.lines.update((rows) => rows.filter((l) => l.localId !== localId));
  }

  protected submit() {
    const s = this.sale();
    if (!s) return;
    const lines = this.lines();
    if (lines.some((l) => !(l.monto > 0))) {
      this.notify.error('Cada medio de pago debe tener un monto mayor a cero.');
      return;
    }
    if (!this.sumMatches()) {
      this.notify.error(`Los montos deben sumar ${this.target().toFixed(2)}: ahora suman ${this.linesTotal().toFixed(2)}.`);
      return;
    }
    const missingRef = lines.find((l) => this.needsReference(l.metodo) && !l.referencia.trim());
    if (missingRef) {
      this.notify.error(`Ingresa el código o N° de operación del pago con ${paymentMethodLabel(missingRef.metodo)}.`);
      return;
    }
    const reason = this.reason().trim();
    if (reason.length < 5) {
      this.error.set('Explica el motivo (mínimo 5 caracteres).');
      return;
    }
    this.mutation.mutate({
      id: s.id,
      reason,
      payments: lines.map((l) => ({
        metodo: l.metodo,
        monto: l.monto,
        ...(l.referencia.trim() ? { referencia: l.referencia.trim() } : {}),
      })),
    });
  }

  protected close(force = false) {
    if (this.mutation.isPending() && !force) return;
    this.closed.emit();
  }
}
