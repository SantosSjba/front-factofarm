import { CommonModule, CurrencyPipe } from '@angular/common';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { FormFieldComponent } from '../../../../shared/components/form/form-field/form-field.component';
import { FormStackComponent } from '../../../../shared/components/form/form-stack/form-stack.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type { PaymentMethod, PosPrinterPaperWidth } from '../../models/directory.models';
import { CheckboxComponent } from '../../../../shared/components/form/input/checkbox.component';

import { AuthService } from '../../../../core/services/auth.service';
import { LocaleService } from '../../../../core/services/locale.service';
import { RouterLink } from '@angular/router';
import { StatusBadgeComponent } from '../../../../shared/components/ui/badge/status-badge.component';
import { CashCloseModalComponent } from '../../components/cash/cash-close-modal.component';
import { CashOpenFormComponent } from '../../components/cash/cash-open-form.component';
import { CashOpenSessionsBannerComponent } from '../../components/cash/cash-open-sessions-banner.component';
import { openPdfBlob } from '../../components/cash/cash-files';
@Component({
  selector: 'app-caja-chica-pos',
  standalone: true,
  imports: [
    RouterLink,
    StatusBadgeComponent,
    CashCloseModalComponent,
    CashOpenFormComponent,
    CashOpenSessionsBannerComponent,
    CheckboxComponent,
    CommonModule,
    AppDatePipe,
    CurrencyPipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    ButtonComponent,
    FormFieldComponent,
    FormStackComponent,
    FormSelectComponent,
    InputFieldComponent,
    PageStateComponent,
  ],
  templateUrl: './caja-chica-pos.component.html' })
export class CajaChicaPosComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly auth = inject(AuthService);
  private readonly locale = inject(LocaleService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Ventas' }, { label: 'Caja POS' }];

  /** Sesión a cerrar en el modal de arqueo. */
  protected readonly closeId = signal<string | null>(null);
  protected readonly movTipo = signal<'INGRESO' | 'EGRESO'>('INGRESO');
  protected readonly movMonto = signal(0);
  protected readonly movComentario = signal('');

  protected readonly hardwarePaperWidth = signal<PosPrinterPaperWidth>('MM_80');
  protected readonly hardwareAutoPrint = signal(true);
  protected readonly hardwareOpenDrawer = signal(true);
  protected readonly hardwareWedge = signal(true);
  protected readonly hardwareCustomerDisplay = signal(false);
  protected readonly hardwarePrinterName = signal('');

  protected readonly registersQuery = injectQuery(() => ({
    queryKey: ['cash', 'registers'] as const,
    queryFn: () => firstValueFrom(this.api.listCashRegisters()) }));

  protected readonly sessionQuery = injectQuery(() => ({
    queryKey: ['cash', 'active-session'] as const,
    queryFn: () => firstValueFrom(this.api.getActiveCashSession()) }));

  protected readonly canSeeHistory = this.auth.hasPermission('nav.historial_cajas');

  protected readonly recentQuery = injectQuery(() => ({
    queryKey: ['cash', 'sessions', 'recent'] as const,
    queryFn: () => firstValueFrom(this.api.listCashSessions({ page: 1, pageSize: 5 })),
  }));

  protected readonly summaryQuery = injectQuery(() => ({
    queryKey: ['cash', 'summary', this.sessionQuery.data()?.id] as const,
    enabled: !!this.sessionQuery.data()?.id,
    queryFn: () => firstValueFrom(this.api.getCashSessionSummary(this.sessionQuery.data()!.id)) }));

  protected readonly session = computed(() => this.sessionQuery.data());
  protected readonly summary = computed(() => this.summaryQuery.data());

  constructor() {
    effect(() => {
      if (this.session()?.cashRegister) this.loadHardwareFromSession();
    });
  }

  protected readonly paperWidthOptions = [
    { value: 'MM_80', label: '80 mm (ticket estándar)' },
    { value: 'MM_58', label: '58 mm (ticket compacto)' },
  ];

  protected loadHardwareFromSession() {
    const reg = this.session()?.cashRegister;
    if (!reg) return;
    this.hardwarePaperWidth.set(reg.printerPaperWidth);
    this.hardwareAutoPrint.set(reg.printerAutoPrint);
    this.hardwareOpenDrawer.set(reg.openCashDrawerOnPrint);
    this.hardwareWedge.set(reg.barcodeWedgeEnabled);
    this.hardwareCustomerDisplay.set(reg.customerDisplayEnabled);
    this.hardwarePrinterName.set(reg.escposPrinterName ?? '');
  }

  protected posInitError(): string | null {
    if (this.registersQuery.isError()) {
      return httpErrorMessage(this.registersQuery.error(), 'No se pudieron cargar las cajas.');
    }
    if (this.sessionQuery.isError()) {
      return httpErrorMessage(this.sessionQuery.error(), 'No se pudo cargar la sesión activa.');
    }
    return null;
  }

  /** La sesión activa viene de un día anterior: hay que cerrarla con su arqueo. */
  protected readonly sessionFromPreviousDay = computed(() => {
    const s = this.session();
    return !!s && this.locale.todayYmd(new Date(s.openedAt)) !== this.locale.todayYmd();
  });

  protected printReport(sessionId: string, format: 'a4' | 'ticket') {
    this.api.getCashSessionReport(sessionId, format).subscribe({
      next: (blob) => openPdfBlob(blob),
      error: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo generar el reporte de arqueo')),
    });
  }

  protected refetchPosInit() {
    void this.registersQuery.refetch();
    void this.sessionQuery.refetch();
  }

  protected submitMovement() {
    if (!Number.isFinite(this.movMonto()) || this.movMonto() <= 0) {
      this.notify.warning('El monto del movimiento debe ser mayor a 0.');
      return;
    }
    this.movementMutation.mutate();
  }

  protected readonly movementMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.addCashMovement(this.session()!.id, {
          tipo: this.movTipo(),
          monto: this.movMonto(),
          metodoPago: 'EFECTIVO' as PaymentMethod,
          comentario: this.movComentario().trim() || undefined }),
      ),
    onSuccess: () => {
      this.notify.success('Movimiento registrado');
      this.movMonto.set(0);
      this.movComentario.set('');
      void this.queryClient.invalidateQueries({ queryKey: ['cash'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar el movimiento')) }));

  protected readonly hardwareMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.updateCashRegisterHardware(this.session()!.cashRegister.id, {
          printerPaperWidth: this.hardwarePaperWidth(),
          printerAutoPrint: this.hardwareAutoPrint(),
          openCashDrawerOnPrint: this.hardwareOpenDrawer(),
          barcodeWedgeEnabled: this.hardwareWedge(),
          customerDisplayEnabled: this.hardwareCustomerDisplay(),
          escposPrinterName: this.hardwarePrinterName().trim() || undefined }),
      ),
    onSuccess: () => {
      this.notify.success('Hardware POS actualizado');
      void this.queryClient.invalidateQueries({ queryKey: ['cash'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo guardar la configuración')) }));
}
