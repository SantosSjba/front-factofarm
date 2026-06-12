import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { LabelComponent } from '../../../../shared/components/form/label/label.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type { PaymentMethod } from '../../models/directory.models';

@Component({
  selector: 'app-caja-chica-pos',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    DatePipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    ButtonComponent,
    FormSelectComponent,
    InputFieldComponent,
    LabelComponent,
    PageStateComponent,
  ],
  templateUrl: './caja-chica-pos.component.html',
})
export class CajaChicaPosComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Ventas' }, { label: 'Caja POS' }];

  protected readonly cashRegisterId = signal('');
  protected readonly montoApertura = signal(0);
  protected readonly montoCierre = signal(0);
  protected readonly notasCierre = signal('');
  protected readonly movTipo = signal<'INGRESO' | 'EGRESO'>('INGRESO');
  protected readonly movMonto = signal(0);
  protected readonly movComentario = signal('');

  protected readonly registersQuery = injectQuery(() => ({
    queryKey: ['cash', 'registers'] as const,
    queryFn: () => firstValueFrom(this.api.listCashRegisters()),
  }));

  protected readonly sessionQuery = injectQuery(() => ({
    queryKey: ['cash', 'active-session'] as const,
    queryFn: () => firstValueFrom(this.api.getActiveCashSession()),
  }));

  protected readonly summaryQuery = injectQuery(() => ({
    queryKey: ['cash', 'summary', this.sessionQuery.data()?.id] as const,
    enabled: !!this.sessionQuery.data()?.id,
    queryFn: () => firstValueFrom(this.api.getCashSessionSummary(this.sessionQuery.data()!.id)),
  }));

  protected readonly registerOptions = computed(() => [
    { value: '', label: 'Seleccionar caja' },
    ...(this.registersQuery.data() ?? []).map((r) => ({ value: r.id, label: r.nombre })),
  ]);

  protected readonly session = computed(() => this.sessionQuery.data());
  protected readonly summary = computed(() => this.summaryQuery.data());

  protected posInitError(): string | null {
    if (this.registersQuery.isError()) {
      return httpErrorMessage(this.registersQuery.error(), 'No se pudieron cargar las cajas.');
    }
    if (this.sessionQuery.isError()) {
      return httpErrorMessage(this.sessionQuery.error(), 'No se pudo cargar la sesión activa.');
    }
    return null;
  }

  protected refetchPosInit() {
    void this.registersQuery.refetch();
    void this.sessionQuery.refetch();
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
      void this.queryClient.invalidateQueries({ queryKey: ['cash'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo abrir la caja')),
  }));

  protected readonly closeMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.closeCashSession(this.session()!.id, {
          montoCierreFisico: this.montoCierre(),
          notasCierre: this.notasCierre().trim() || undefined,
        }),
      ),
    onSuccess: (res) => {
      this.notify.success(`Caja cerrada. Diferencia: S/ ${res.diferenciaArqueo}`);
      void this.queryClient.invalidateQueries({ queryKey: ['cash'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo cerrar la caja')),
  }));

  protected readonly movementMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.addCashMovement(this.session()!.id, {
          tipo: this.movTipo(),
          monto: this.movMonto(),
          metodoPago: 'EFECTIVO' as PaymentMethod,
          comentario: this.movComentario().trim() || undefined,
        }),
      ),
    onSuccess: () => {
      this.notify.success('Movimiento registrado');
      this.movMonto.set(0);
      this.movComentario.set('');
      void this.queryClient.invalidateQueries({ queryKey: ['cash'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar el movimiento')),
  }));
}
