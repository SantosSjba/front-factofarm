import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { AuthService } from '../../../../core/services/auth.service';
import { LocaleService } from '../../../../core/services/locale.service';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { TableDropdownComponent } from '../../../../shared/components/common/table-dropdown/table-dropdown.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { StatusBadgeComponent, type StatusTone } from '../../../../shared/components/ui/badge/status-badge.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { MenuItemComponent } from '../../../../shared/components/ui/menu-item/menu-item.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { CashCloseModalComponent } from '../../components/cash/cash-close-modal.component';
import { downloadBlob, formatHoursOpen, openPdfBlob } from '../../components/cash/cash-files';
import { CashOpenSessionsBannerComponent } from '../../components/cash/cash-open-sessions-banner.component';
import type {
  CashDifferenceFilter,
  CashSessionFiltersRequest,
  CashSessionListItemDto,
  CashSessionStatus,
} from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

const CHAIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN_CADENA', 'ADMINISTRADOR']);

const MOVEMENT_LABELS: Record<string, string> = {
  APERTURA: 'Apertura',
  INGRESO: 'Ingreso',
  EGRESO: 'Egreso',
  VENTA: 'Venta',
  ANULACION: 'Anulación',
  CIERRE: 'Cierre',
};

/** Historial y supervisión de sesiones de caja: KPIs, filtros, detalle, cierre forzado y exportación. */
@Component({
  selector: 'app-historial-cajas',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    AppDatePipe,
    QueryPageStatePipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    PaginationComponent,
    TableDropdownComponent,
    FormSelectComponent,
    InputFieldComponent,
    StatusBadgeComponent,
    ButtonComponent,
    MenuItemComponent,
    ModalComponent,
    CashCloseModalComponent,
    CashOpenSessionsBannerComponent,
  ],
  templateUrl: './historial-cajas.component.html',
})
export class HistorialCajasComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly auth = inject(AuthService);
  private readonly locale = inject(LocaleService);
  private readonly notify = inject(NotifyService);

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Ventas y caja' }, { label: 'Historial de cajas' }];
  protected readonly formatHours = formatHoursOpen;
  protected readonly abs = (value: string) => Math.abs(Number(value));
  protected readonly movementLabel = (tipo: string) => MOVEMENT_LABELS[tipo] ?? tipo;
  protected readonly isChain = CHAIN_ROLES.has(this.auth.user()?.role ?? '');

  protected readonly page = signal(1);
  protected readonly pageSize = signal(15);
  protected readonly dateFrom = signal(this.locale.monthStartYmd());
  protected readonly dateTo = signal(this.locale.todayYmd());
  protected readonly establishmentId = signal('');
  protected readonly userId = signal('');
  protected readonly cashRegisterId = signal('');
  protected readonly estado = signal<'' | CashSessionStatus>('');
  protected readonly diferencia = signal<'' | CashDifferenceFilter>('');
  protected readonly forzado = signal<'' | 'true'>('');

  protected readonly detailId = signal<string | null>(null);
  protected readonly closeId = signal<string | null>(null);
  protected readonly exporting = signal<'xlsx' | 'pdf' | null>(null);

  protected readonly estadoOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'ABIERTA', label: 'Abiertas' },
    { value: 'CERRADA', label: 'Cerradas' },
  ];
  protected readonly diferenciaOptions = [
    { value: '', label: 'Con o sin diferencia' },
    { value: 'CON_DIFERENCIA', label: 'Con diferencia' },
    { value: 'FALTANTE', label: 'Solo faltantes' },
    { value: 'SOBRANTE', label: 'Solo sobrantes' },
    { value: 'SIN_DIFERENCIA', label: 'Arqueo cuadrado' },
  ];
  protected readonly forzadoOptions = [
    { value: '', label: 'Todos los cierres' },
    { value: 'true', label: 'Solo cierres forzados' },
  ];

  protected readonly filters = computed<CashSessionFiltersRequest>(() => ({
    from: this.dateFrom() || undefined,
    to: this.dateTo() || undefined,
    establishmentId: this.establishmentId() || undefined,
    userId: this.userId() || undefined,
    cashRegisterId: this.cashRegisterId() || undefined,
    estado: this.estado() || undefined,
    diferencia: this.diferencia() || undefined,
    forzado: this.forzado() || undefined,
  }));

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['cash', 'sessions', 'list', this.filters(), this.page(), this.pageSize()] as const,
    queryFn: () =>
      firstValueFrom(this.api.listCashSessions({ ...this.filters(), page: this.page(), pageSize: this.pageSize() })),
  }));

  protected readonly kpisQuery = injectQuery(() => ({
    queryKey: ['cash', 'sessions', 'kpis', this.filters()] as const,
    queryFn: () => firstValueFrom(this.api.getCashSessionKpis(this.filters())),
  }));

  protected readonly cashiersQuery = injectQuery(() => ({
    queryKey: ['cash', 'sessions', 'cashiers', this.establishmentId()] as const,
    queryFn: () => firstValueFrom(this.api.listCashSessionCashiers(this.establishmentId() || undefined)),
  }));

  protected readonly registersQuery = injectQuery(() => ({
    queryKey: ['cash', 'registers'] as const,
    queryFn: () => firstValueFrom(this.api.listCashRegisters()),
  }));

  protected readonly establishmentsQuery = injectQuery(() => ({
    queryKey: ['establishments', 'all-for-cash'] as const,
    enabled: this.isChain,
    queryFn: () => firstValueFrom(this.api.listEstablishmentsAll()),
  }));

  protected readonly detailQuery = injectQuery(() => ({
    queryKey: ['cash', 'summary', this.detailId()] as const,
    enabled: !!this.detailId(),
    queryFn: () => firstValueFrom(this.api.getCashSessionSummary(this.detailId()!)),
  }));

  protected readonly supervisor = computed(() => this.listQuery.data()?.supervisor ?? false);

  protected readonly establishmentOptions = computed(() => [
    { value: '', label: 'Mi establecimiento' },
    { value: 'ALL', label: 'Todas las sucursales' },
    ...(this.establishmentsQuery.data() ?? []).map((e) => ({ value: e.id, label: e.nombre })),
  ]);
  protected readonly cashierOptions = computed(() => [
    { value: '', label: 'Todos los cajeros' },
    ...(this.cashiersQuery.data() ?? []).map((u) => ({ value: u.id, label: u.nombre })),
  ]);
  protected readonly registerOptions = computed(() => [
    { value: '', label: 'Todas las cajas' },
    ...(this.registersQuery.data() ?? []).map((r) => ({ value: r.id, label: r.nombre })),
  ]);

  protected readonly kpisError = computed(() =>
    this.kpisQuery.isError() ? httpErrorMessage(this.kpisQuery.error(), 'No se pudieron cargar los indicadores.') : null,
  );
  protected readonly detailError = computed(() =>
    httpErrorMessage(this.detailQuery.error(), 'No se pudo cargar el detalle de la sesión.'),
  );

  protected onFilterChange(): void {
    this.page.set(1);
  }

  protected setEstablishment(value: string): void {
    this.establishmentId.set(value);
    // Cajas y cajeros dependen de la sucursal.
    this.cashRegisterId.set('');
    this.userId.set('');
    this.onFilterChange();
  }

  protected clearFilters(): void {
    this.dateFrom.set(this.locale.monthStartYmd());
    this.dateTo.set(this.locale.todayYmd());
    this.establishmentId.set('');
    this.userId.set('');
    this.cashRegisterId.set('');
    this.estado.set('');
    this.diferencia.set('');
    this.forzado.set('');
    this.onFilterChange();
  }

  /** Atajos de los KPI: filtran la tabla. */
  protected showOpen(onlyStale: boolean): void {
    this.estado.set('ABIERTA');
    this.diferencia.set('');
    this.forzado.set('');
    // Las abiertas no dependen del rango: limpiar fechas para no ocultar las de días anteriores.
    this.dateFrom.set('');
    this.dateTo.set(onlyStale ? this.yesterdayYmd() : '');
    this.onFilterChange();
  }

  protected showDifferences(): void {
    this.estado.set('CERRADA');
    this.diferencia.set('CON_DIFERENCIA');
    this.onFilterChange();
  }

  private yesterdayYmd(): string {
    return this.locale.todayYmd(new Date(Date.now() - 24 * 3600 * 1000));
  }

  protected statusTone(row: Pick<CashSessionListItemDto, 'estado' | 'pendiente' | 'cierreForzado'>): StatusTone {
    if (row.estado === 'ABIERTA') return row.pendiente ? 'warning' : 'success';
    return row.cierreForzado ? 'purple' : 'neutral';
  }

  protected statusLabel(row: Pick<CashSessionListItemDto, 'estado' | 'pendiente' | 'cierreForzado' | 'horasAbierta'>): string {
    if (row.estado === 'ABIERTA') return row.pendiente ? `Abierta · ${formatHoursOpen(row.horasAbierta)}` : 'Abierta';
    return row.cierreForzado ? 'Cierre forzado' : 'Cerrada';
  }

  protected exportList(format: 'xlsx' | 'pdf'): void {
    this.exporting.set(format);
    this.api.exportCashSessions(this.filters(), format).subscribe({
      next: (blob) => {
        downloadBlob(blob, `historial-cajas-${this.locale.todayYmd()}.${format}`);
        this.exporting.set(null);
        this.notify.success('Exportación generada');
      },
      error: (err) => {
        this.exporting.set(null);
        this.notify.error(httpErrorMessage(err, 'No se pudo exportar el historial de cajas'));
      },
    });
  }

  protected printReport(sessionId: string, format: 'a4' | 'ticket'): void {
    this.api.getCashSessionReport(sessionId, format).subscribe({
      next: (blob) => openPdfBlob(blob),
      error: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo generar el reporte de arqueo')),
    });
  }

  protected openClose(sessionId: string): void {
    this.detailId.set(null);
    this.closeId.set(sessionId);
  }

  protected diffClass(value: string | null | undefined): Record<string, boolean> {
    const n = Number(value ?? 0);
    return { 'text-rose-600 dark:text-rose-400': n < 0, 'text-emerald-600 dark:text-emerald-400': n > 0 };
  }
}
