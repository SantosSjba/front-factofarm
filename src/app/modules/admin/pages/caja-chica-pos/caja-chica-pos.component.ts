import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { AuthService } from '../../../../core/services/auth.service';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { KpiTileComponent } from '../../../../shared/components/common/dashboard/kpi-tile.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { TableDropdownComponent } from '../../../../shared/components/common/table-dropdown/table-dropdown.component';
import { FormSectionComponent } from '../../../../shared/components/form/form-section/form-section.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { CheckboxComponent } from '../../../../shared/components/form/input/checkbox.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { TextAreaComponent } from '../../../../shared/components/form/input/text-area.component';
import { StatusBadgeComponent, type StatusTone } from '../../../../shared/components/ui/badge/status-badge.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { IconComponent } from '../../../../shared/components/ui/icon/icon.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { MenuItemComponent } from '../../../../shared/components/ui/menu-item/menu-item.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { CashCloseModalComponent } from '../../components/cash/cash-close-modal.component';
import { openPdfBlob } from '../../components/cash/cash-files';
import { CashOpenFormComponent } from '../../components/cash/cash-open-form.component';
import { CashOpenSessionsBannerComponent } from '../../components/cash/cash-open-sessions-banner.component';
import { CashSessionSummaryComponent } from '../../components/cash/cash-session-summary.component';
import type { CashSessionListItemDto, PaymentMethod, PosPrinterPaperWidth } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

@Component({
  selector: 'app-caja-chica-pos',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    RouterLink,
    AppDatePipe,
    BreadcrumbInlineComponent,
    ButtonComponent,
    CashCloseModalComponent,
    CashOpenFormComponent,
    CashOpenSessionsBannerComponent,
    CashSessionSummaryComponent,
    CheckboxComponent,
    ComponentCardComponent,
    FormSectionComponent,
    FormSelectComponent,
    HelpPanelComponent,
    IconComponent,
    InputFieldComponent,
    KpiTileComponent,
    MenuItemComponent,
    ModalComponent,
    PageStateComponent,
    PageToolbarComponent,
    StatusBadgeComponent,
    TableDropdownComponent,
    TextAreaComponent,
  ],
  templateUrl: './caja-chica-pos.component.html',
})
export class CajaChicaPosComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly auth = inject(AuthService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Ventas' }, { label: 'Caja' }];
  protected readonly canSeeHistory = this.auth.hasPermission('nav.historial_cajas');
  private readonly pen = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
  protected money(value: string | number): string {
    return this.pen.format(Number(value) || 0);
  }

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
  protected readonly recentQuery = injectQuery(() => ({
    queryKey: ['cash', 'sessions', 'recent'] as const,
    queryFn: () => firstValueFrom(this.api.listCashSessions({ page: 1, pageSize: 5 })),
  }));

  protected readonly session = computed(() => this.sessionQuery.data());
  protected readonly summary = computed(() => this.summaryQuery.data());
  protected readonly movimientosManuales = computed(() => {
    const r = this.summary()?.resumenEfectivo;
    return r ? Number(r.ingresos) + Number(r.egresos) : 0;
  });

  protected readonly initError = computed(() => {
    if (this.registersQuery.isError()) return httpErrorMessage(this.registersQuery.error(), 'No se pudieron cargar las cajas.');
    if (this.sessionQuery.isError()) return httpErrorMessage(this.sessionQuery.error(), 'No se pudo cargar tu caja abierta.');
    return null;
  });
  protected refetchInit() {
    void this.registersQuery.refetch();
    void this.sessionQuery.refetch();
  }

  // ---------- Cierre / reportes ----------
  protected readonly closeId = signal<string | null>(null);
  protected printReport(sessionId: string, format: 'a4' | 'ticket') {
    this.api.getCashSessionReport(sessionId, format).subscribe({
      next: (blob) => openPdfBlob(blob),
      error: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo generar el reporte de caja')),
    });
  }

  protected statusTone(row: CashSessionListItemDto): StatusTone {
    if (row.estado === 'ABIERTA') return row.pendiente ? 'warning' : 'success';
    return row.cierreForzado ? 'purple' : 'neutral';
  }
  protected statusLabel(row: CashSessionListItemDto): string {
    if (row.estado === 'ABIERTA') return row.pendiente ? 'Abierta +24 h' : 'Abierta';
    return row.cierreForzado ? 'Cierre forzado' : 'Cerrada';
  }
  protected diffClass(value: string | null): string {
    const n = Number(value ?? 0);
    if (n < 0) return 'text-error-600 dark:text-error-400';
    if (n > 0) return 'text-success-600 dark:text-success-400';
    return '';
  }

  // ---------- Ingreso / egreso ----------
  protected readonly movOpen = signal(false);
  protected readonly movTipo = signal<'INGRESO' | 'EGRESO'>('EGRESO');
  protected readonly movMonto = signal<number | null>(null);
  protected readonly movComentario = signal('');
  protected readonly movErrors = signal<{ monto?: string; comentario?: string }>({});
  protected readonly movTipoOptions = [
    { value: 'EGRESO', label: 'Egreso: sale efectivo' },
    { value: 'INGRESO', label: 'Ingreso: entra efectivo' },
  ];

  protected openMovement(tipo: 'INGRESO' | 'EGRESO') {
    this.movTipo.set(tipo);
    this.movMonto.set(null);
    this.movComentario.set('');
    this.movErrors.set({});
    this.movOpen.set(true);
  }

  protected submitMovement() {
    const errors: { monto?: string; comentario?: string } = {};
    const monto = Number(this.movMonto());
    if (!(monto > 0)) errors.monto = 'El monto debe ser mayor a 0.';
    else if (this.movTipo() === 'EGRESO' && this.summary() && monto > Number(this.summary()!.saldoActual)) {
      errors.monto = `Solo hay ${Number(this.summary()!.saldoActual).toFixed(2)} en efectivo en la caja.`;
    }
    if (!this.movComentario().trim()) errors.comentario = 'Escribe el motivo: queda en el reporte de caja.';
    this.movErrors.set(errors);
    if (Object.keys(errors).length) return;
    this.movementMutation.mutate();
  }

  protected readonly movementMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.addCashMovement(this.session()!.id, {
          tipo: this.movTipo(),
          monto: Number(this.movMonto()),
          metodoPago: 'EFECTIVO' as PaymentMethod,
          comentario: this.movComentario().trim(),
        }),
      ),
    onSuccess: () => {
      this.notify.success(this.movTipo() === 'EGRESO' ? 'Egreso registrado' : 'Ingreso registrado');
      this.movOpen.set(false);
      void this.queryClient.invalidateQueries({ queryKey: ['cash'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar el movimiento')),
  }));

  // ---------- Impresora y periféricos ----------
  protected readonly hardwareOpen = signal(false);
  protected readonly hardwarePaperWidth = signal<PosPrinterPaperWidth>('MM_80');
  protected readonly hardwareAutoPrint = signal(true);
  protected readonly hardwareOpenDrawer = signal(true);
  protected readonly hardwareWedge = signal(true);
  protected readonly hardwareCustomerDisplay = signal(false);
  protected readonly hardwarePrinterName = signal('');
  protected readonly paperWidthOptions = [
    { value: 'MM_80', label: '80 mm (ticket estándar)' },
    { value: 'MM_58', label: '58 mm (ticket angosto)' },
  ];

  protected openHardware() {
    const reg = this.session()?.cashRegister;
    if (!reg) return;
    this.hardwarePaperWidth.set(reg.printerPaperWidth);
    this.hardwareAutoPrint.set(reg.printerAutoPrint);
    this.hardwareOpenDrawer.set(reg.openCashDrawerOnPrint);
    this.hardwareWedge.set(reg.barcodeWedgeEnabled);
    this.hardwareCustomerDisplay.set(reg.customerDisplayEnabled);
    this.hardwarePrinterName.set(reg.escposPrinterName ?? '');
    this.hardwareOpen.set(true);
  }

  protected readonly hardwareMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.updateCashRegisterHardware(this.session()!.cashRegister.id, {
          printerPaperWidth: this.hardwarePaperWidth(),
          printerAutoPrint: this.hardwareAutoPrint(),
          openCashDrawerOnPrint: this.hardwareOpenDrawer(),
          barcodeWedgeEnabled: this.hardwareWedge(),
          customerDisplayEnabled: this.hardwareCustomerDisplay(),
          escposPrinterName: this.hardwarePrinterName().trim() || undefined,
        }),
      ),
    onSuccess: () => {
      this.notify.success('Configuración de la caja guardada');
      this.hardwareOpen.set(false);
      void this.queryClient.invalidateQueries({ queryKey: ['cash'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo guardar la configuración')),
  }));
}
