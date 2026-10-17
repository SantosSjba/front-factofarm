import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { FormFieldComponent } from '../../../../shared/components/form/form-field/form-field.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import { QuickCreateComponent } from '../quick-create/quick-create.component';

/** Apertura de caja (caja + monto inicial). Marca las cajas que ya están abiertas por alguien. */
@Component({
  selector: 'app-cash-open-form',
  standalone: true,
  imports: [CommonModule, FormFieldComponent, FormSelectComponent, InputFieldComponent, ButtonComponent, QuickCreateComponent],
  template: `
    <div class="grid gap-4" [ngClass]="stacked ? 'grid-cols-1' : 'sm:grid-cols-2 lg:max-w-xl'">
      <app-form-field label="Caja" required>
        <div class="flex items-center gap-2">
          <app-form-select
            className="flex-1"
            placeholder="Seleccionar caja"
            [options]="registerOptions()"
            [value]="cashRegisterId()"
            (valueChange)="cashRegisterId.set($event)"
          />
          @if (allowCreate) {
            <app-quick-create entity="cashRegister" [iconOnly]="true" (created)="cashRegisterId.set($event.id)" />
          }
        </div>
      </app-form-field>
      <app-form-field label="Monto inicial (S/)">
        <app-input-field
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          [value]="montoApertura()"
          (valueChange)="montoApertura.set(+$event)"
        />
      </app-form-field>
      @if (busyBy(); as who) {
        <p class="text-sm text-amber-700 dark:text-amber-400" [ngClass]="stacked ? '' : 'sm:col-span-2'">
          Esta caja está abierta por {{ who }}. Debe cerrarla ese usuario o un supervisor.
        </p>
      }
      <div [ngClass]="stacked ? '' : 'sm:col-span-2'">
        <app-button
          startIconName="mdi:cash-register"
          variant="primary"
          [disabled]="!cashRegisterId() || openMutation.isPending()"
          [loading]="openMutation.isPending()"
          (btnClick)="submit()"
        >
          Abrir caja
        </app-button>
      </div>
    </div>
  `,
})
export class CashOpenFormComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  /** Permite crear una caja nueva desde el selector. */
  @Input() allowCreate = true;
  /** Campos en una columna (dentro de un modal). */
  @Input() stacked = false;
  @Output() opened = new EventEmitter<void>();

  protected readonly cashRegisterId = signal('');
  protected readonly montoApertura = signal(0);

  protected readonly registersQuery = injectQuery(() => ({
    queryKey: ['cash', 'registers'] as const,
    queryFn: () => firstValueFrom(this.api.listCashRegisters()),
  }));

  protected readonly openSessionsQuery = injectQuery(() => ({
    queryKey: ['cash', 'open-sessions'] as const,
    queryFn: () => firstValueFrom(this.api.listOpenCashSessions()),
  }));

  private readonly busyByRegister = computed(
    () => new Map((this.openSessionsQuery.data() ?? []).map((s) => [s.cashRegister.id, s.user.nombre])),
  );

  protected readonly registerOptions = computed(() => [
    { value: '', label: 'Seleccionar caja' },
    ...(this.registersQuery.data() ?? []).map((r) => {
      const who = this.busyByRegister().get(r.id);
      return { value: r.id, label: who ? `${r.nombre} — abierta por ${who}` : r.nombre };
    }),
  ]);

  protected readonly busyBy = computed(() => this.busyByRegister().get(this.cashRegisterId()) ?? null);

  protected submit(): void {
    if (!this.cashRegisterId()) {
      this.notify.warning('Seleccione la caja que desea abrir.');
      return;
    }
    if (!Number.isFinite(this.montoApertura()) || this.montoApertura() < 0) {
      this.notify.warning('El monto inicial debe ser un número mayor o igual a 0.');
      return;
    }
    this.openMutation.mutate();
  }

  protected readonly openMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.openCashSession({
          cashRegisterId: this.cashRegisterId(),
          montoApertura: this.montoApertura(),
        }),
      ),
    onSuccess: () => {
      this.notify.success('Caja abierta');
      this.cashRegisterId.set('');
      this.montoApertura.set(0);
      void this.queryClient.invalidateQueries({ queryKey: ['cash'] });
      this.opened.emit();
    },
    onError: (err) => {
      this.notify.error(httpErrorMessage(err, 'No se pudo abrir la caja'));
      void this.queryClient.invalidateQueries({ queryKey: ['cash', 'open-sessions'] });
    },
  }));
}
