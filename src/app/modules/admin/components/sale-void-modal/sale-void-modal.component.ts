import { CurrencyPipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { injectMutation, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { AuthService } from '../../../../core/services/auth.service';
import { NotifyService } from '../../../../core/services/notify.service';
import { TextAreaComponent } from '../../../../shared/components/form/input/text-area.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import { documentNumber, documentTypeLabel } from '../../utils/sale-labels';

/** Venta a anular: basta con lo que trae cualquier listado de ventas o comprobantes. */
export type SaleVoidTarget = {
  id: string;
  documentType: string;
  serie: string | null;
  numero: string | null;
  total: string;
  customer?: { nombre: string } | null;
  seller?: { id: string; nombre: string } | null;
  sunatStatus?: string | null;
};

/** Mismos roles que `DIRECT_SALE_VOID_ROLES` en la API: el resto deja una solicitud. */
const DIRECT_VOID_ROLES = new Set([
  'SUPER_ADMIN',
  'ADMIN_CADENA',
  'ADMINISTRADOR',
  'GERENTE_SUCURSAL',
  'FARMACEUTICO_TITULAR',
  'FARMACEUTICO',
]);

const SUNAT_VOIDABLE = new Set(['ACEPTADO', 'OBSERVADO', 'CONTINGENCIA']);

/**
 * Anula una venta (o pide la anulación) explicando qué pasa con el stock, la caja y SUNAT.
 * Usa `void-request`: la API anula en el acto si el rol puede y, si no, deja la solicitud.
 */
@Component({
  selector: 'app-sale-void-modal',
  standalone: true,
  imports: [CurrencyPipe, ButtonComponent, ModalComponent, TextAreaComponent],
  template: `
    <app-modal compact [isOpen]="!!sale()" (closed)="close()" className="w-full max-w-lg shadow-theme-lg">
      <div data-modal-header class="shrink-0 border-b border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-6 sm:py-5">
        <h3 class="pe-12 text-xl font-semibold text-gray-800 dark:text-white/90">{{ direct() ? 'Anular venta' : 'Solicitar anulación' }}</h3>
        @if (sale(); as s) {
          <p class="mt-1 pe-12 text-sm text-gray-500 dark:text-gray-400">
            {{ typeLabel(s.documentType) }} {{ number(s) }} · {{ s.total | currency: 'PEN' : 'symbol' : '1.2-2' }}{{ s.customer ? ' · ' + s.customer.nombre : '' }}
          </p>
        }
      </div>
      <div data-modal-body class="space-y-4 px-4 py-4 text-sm text-gray-700 dark:text-gray-300 sm:px-6">
        @if (ownSale()) {
          <p class="rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-400">
            Esta venta la registraste tú: otro usuario autorizado debe anularla.
          </p>
        } @else if (direct()) {
          <ul class="list-disc space-y-1 ps-5">
            <li>Los productos vuelven al stock, con sus mismos lotes.</li>
            <li>Lo cobrado en efectivo sale de la caja en que se vendió. Si esa caja ya se cerró, sale de <strong>tu caja abierta</strong> (ábrela antes si no lo está).</li>
            @if (sunatVoid()) {
              <li>Se comunica la baja del comprobante a SUNAT.</li>
            }
            <li>No se puede deshacer.</li>
          </ul>
        } @else {
          <p>No tienes permiso para anular directamente: la solicitud queda pendiente hasta que un farmacéutico, gerente o administrador la apruebe en <strong>Anulaciones</strong>.</p>
        }
        <app-text-area
          label="Motivo"
          [required]="true"
          helpText="Queda registrado en la venta y, si aplica, en la baja de SUNAT."
          placeholder="Ej. Error al cobrar, el cliente desistió…"
          [maxLength]="500"
          [rows]="3"
          [value]="reason()"
          [error]="!!error()"
          [hint]="error()"
          [disabled]="ownSale()"
          (valueChange)="reason.set($event); error.set('')"
        />
      </div>
      <div data-modal-footer class="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-6">
        <app-button variant="outline" [disabled]="mutation.isPending()" (btnClick)="close()">Cancelar</app-button>
        <app-button
          [variant]="direct() ? 'danger' : 'primary'"
          [startIconName]="direct() ? 'mdi:cancel' : 'mdi:send-outline'"
          [disabled]="ownSale() || mutation.isPending()"
          [loading]="mutation.isPending()"
          (btnClick)="submit()"
        >{{ direct() ? 'Anular venta' : 'Enviar solicitud' }}</app-button>
      </div>
    </app-modal>
  `,
})
export class SaleVoidModalComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  readonly sale = input<SaleVoidTarget | null>(null);
  readonly closed = output<void>();
  /** `true` si se anuló; `false` si quedó como solicitud. */
  readonly done = output<boolean>();

  protected readonly reason = signal('');
  protected readonly error = signal('');
  protected readonly typeLabel = documentTypeLabel;
  protected readonly number = documentNumber;

  protected readonly direct = computed(() => DIRECT_VOID_ROLES.has(this.auth.user()?.role ?? ''));
  protected readonly ownSale = computed(() => {
    const s = this.sale();
    return this.direct() && !!s?.seller && s.seller.id === this.auth.user()?.id;
  });
  protected readonly sunatVoid = computed(() => SUNAT_VOIDABLE.has(this.sale()?.sunatStatus ?? ''));

  protected readonly mutation = injectMutation(() => ({
    mutationFn: (args: { id: string; reason: string }) => firstValueFrom(this.api.requestVoidSale(args.id, args.reason)),
    onSuccess: (res) => {
      const voided = !res.requestId;
      this.notify.success(voided ? 'Venta anulada: el stock y el efectivo se revirtieron.' : 'Solicitud enviada: queda pendiente de aprobación.');
      for (const key of ['sales', 'billing', 'inventory', 'cash', 'dashboard']) {
        void this.queryClient.invalidateQueries({ queryKey: [key] });
      }
      this.done.emit(voided);
      this.close();
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo anular la venta')),
  }));

  constructor() {
    effect(() => {
      if (this.sale()) {
        this.reason.set('');
        this.error.set('');
      }
    });
  }

  protected submit() {
    const s = this.sale();
    const reason = this.reason().trim();
    if (!s) return;
    if (reason.length < 5) {
      this.error.set('Explica el motivo (mínimo 5 caracteres).');
      return;
    }
    this.mutation.mutate({ id: s.id, reason });
  }

  protected close() {
    if (this.mutation.isPending()) return;
    this.closed.emit();
  }
}
