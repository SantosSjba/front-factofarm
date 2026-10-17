import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, computed, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { FormFieldComponent } from '../../../../shared/components/form/form-field/form-field.component';
import { FormStackComponent } from '../../../../shared/components/form/form-stack/form-stack.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { TextAreaComponent } from '../../../../shared/components/form/input/text-area.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { IconComponent } from '../../../../shared/components/ui/icon/icon.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import type { CloseCashSessionResponse } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';
import { formatHoursOpen, openPdfBlob } from './cash-files';

/**
 * Cierre de caja con arqueo (efectivo contado vs. esperado). Si la caja la abrió otro
 * usuario, es un cierre forzado: el backend exige permiso de supervisión y un motivo.
 */
@Component({
  selector: 'app-cash-close-modal',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    AppDatePipe,
    ModalComponent,
    ButtonComponent,
    FormFieldComponent,
    FormStackComponent,
    InputFieldComponent,
    TextAreaComponent,
    IconComponent,
  ],
  templateUrl: './cash-close-modal.component.html',
})
export class CashCloseModalComponent implements OnChanges {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  @Input() sessionId: string | null = null;
  @Output() closed = new EventEmitter<void>();
  /** Emite tras cerrar la caja con éxito. */
  @Output() done = new EventEmitter<CloseCashSessionResponse>();

  private readonly id = signal<string | null>(null);
  protected readonly montoContado = signal<string>('');
  protected readonly notas = signal('');
  protected readonly motivo = signal('');
  protected readonly result = signal<CloseCashSessionResponse | null>(null);
  protected readonly printing = signal(false);
  protected readonly formatHours = formatHoursOpen;
  protected readonly abs = (value: string) => Math.abs(Number(value));
  protected readonly summaryError = computed(() =>
    httpErrorMessage(this.summaryQuery.error(), 'No se pudo cargar la sesión de caja.'),
  );

  protected readonly summaryQuery = injectQuery(() => ({
    queryKey: ['cash', 'summary', this.id()] as const,
    enabled: !!this.id(),
    queryFn: () => firstValueFrom(this.api.getCashSessionSummary(this.id()!)),
  }));

  protected readonly summary = computed(() => this.summaryQuery.data());
  protected readonly forced = computed(() => !!this.summary() && !this.summary()!.isMine);

  protected readonly contado = computed(() => {
    const raw = this.montoContado().trim();
    if (raw === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  });

  protected readonly diferencia = computed(() => {
    const s = this.summary();
    const c = this.contado();
    if (!s || c === null) return null;
    return Math.round((c - Number(s.efectivoEsperado)) * 100) / 100;
  });

  protected readonly notasRequired = computed(() => (this.diferencia() ?? 0) !== 0);

  ngOnChanges(): void {
    if (this.sessionId !== this.id()) {
      this.id.set(this.sessionId);
      this.montoContado.set('');
      this.notas.set('');
      this.motivo.set('');
      this.result.set(null);
    }
  }

  protected close(): void {
    this.closed.emit();
  }

  protected submit(): void {
    const c = this.contado();
    if (c === null || c < 0) {
      this.notify.warning('Ingrese el efectivo contado (número mayor o igual a 0).');
      return;
    }
    if (this.notasRequired() && !this.notas().trim()) {
      this.notify.warning('El arqueo tiene diferencia: explique la diferencia en las observaciones.');
      return;
    }
    if (this.forced() && !this.motivo().trim()) {
      this.notify.warning('Indique el motivo del cierre forzado.');
      return;
    }
    this.closeMutation.mutate();
  }

  protected readonly closeMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.closeCashSession(this.id()!, {
          montoCierreFisico: this.contado()!,
          notasCierre: this.notas().trim() || undefined,
          motivoCierreForzado: this.forced() ? this.motivo().trim() : undefined,
        }),
      ),
    onSuccess: (res) => {
      this.result.set(res);
      const dif = Number(res.diferenciaArqueo);
      this.notify.success(
        res.cierreForzado ? 'Cierre forzado registrado' : 'Caja cerrada',
        dif === 0 ? 'Arqueo cuadrado' : `${dif < 0 ? 'Faltante' : 'Sobrante'} de S/ ${Math.abs(dif).toFixed(2)}`,
      );
      void this.queryClient.invalidateQueries({ queryKey: ['cash'] });
      this.done.emit(res);
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo cerrar la caja')),
  }));

  protected print(format: 'a4' | 'ticket'): void {
    const id = this.id();
    if (!id) return;
    this.printing.set(true);
    this.api.getCashSessionReport(id, format).subscribe({
      next: (blob) => {
        openPdfBlob(blob);
        this.printing.set(false);
      },
      error: (err) => {
        this.printing.set(false);
        this.notify.error(httpErrorMessage(err, 'No se pudo generar el reporte de arqueo'));
      },
    });
  }
}
