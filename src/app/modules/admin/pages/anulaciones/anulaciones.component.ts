import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { AuthService } from '../../../../core/services/auth.service';
import { LocaleService } from '../../../../core/services/locale.service';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { TextAreaComponent } from '../../../../shared/components/form/input/text-area.component';
import { StatusBadgeComponent, type StatusTone } from '../../../../shared/components/ui/badge/status-badge.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { TabStripComponent, type TabStripItem } from '../../../../shared/components/ui/tab-strip/tab-strip.component';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { SaleVoidModalComponent, type SaleVoidTarget } from '../../components/sale-void-modal/sale-void-modal.component';
import type { SaleListItemDto, SaleVoidRequestDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';
import { documentNumber, documentTypeLabel } from '../../utils/sale-labels';

type Tab = 'solicitudes' | 'ventas' | 'anuladas';
type RequestFilter = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | '';

/** Mismos roles que `DIRECT_SALE_VOID_ROLES` en la API. */
const APPROVER_ROLES = new Set(['SUPER_ADMIN', 'ADMIN_CADENA', 'ADMINISTRADOR', 'GERENTE_SUCURSAL', 'FARMACEUTICO_TITULAR', 'FARMACEUTICO']);

const REQUEST_STATUS: Record<SaleVoidRequestDto['status'], { label: string; tone: StatusTone }> = {
  PENDIENTE: { label: 'Pendiente', tone: 'warning' },
  APROBADA: { label: 'Aprobada', tone: 'success' },
  RECHAZADA: { label: 'Rechazada', tone: 'error' },
};

@Component({
  selector: 'app-anulaciones',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    AppDatePipe,
    QueryPageStatePipe,
    BreadcrumbInlineComponent,
    ButtonComponent,
    ComponentCardComponent,
    FormSelectComponent,
    HelpPanelComponent,
    InputFieldComponent,
    ListFiltersComponent,
    ModalComponent,
    PageToolbarComponent,
    PaginationComponent,
    SaleVoidModalComponent,
    StatusBadgeComponent,
    TabStripComponent,
    TextAreaComponent,
  ],
  templateUrl: './anulaciones.component.html',
})
export class AnulacionesComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly auth = inject(AuthService);
  private readonly locale = inject(LocaleService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Ventas' }, { label: 'Anulaciones' }];
  protected readonly typeLabel = documentTypeLabel;
  protected readonly number = documentNumber;
  protected readonly pageSize = 15;
  protected readonly canApprove = APPROVER_ROLES.has(this.auth.user()?.role ?? '');
  protected readonly myId = this.auth.user()?.id ?? '';

  // ---------- Solicitudes ----------
  protected readonly requestFilter = signal<RequestFilter>('PENDIENTE');
  protected readonly requestFilterOptions = [
    { value: 'PENDIENTE', label: 'Pendientes' },
    { value: 'APROBADA', label: 'Aprobadas' },
    { value: 'RECHAZADA', label: 'Rechazadas' },
    { value: '', label: 'Todas' },
  ];
  protected readonly requestsQuery = injectQuery(() => ({
    queryKey: ['sales', 'void-requests', this.requestFilter()] as const,
    queryFn: () => firstValueFrom(this.api.listVoidRequests(this.requestFilter() || undefined)),
  }));
  protected readonly pendingQuery = injectQuery(() => ({
    queryKey: ['sales', 'void-requests', 'PENDIENTE'] as const,
    queryFn: () => firstValueFrom(this.api.listVoidRequests('PENDIENTE')),
  }));
  protected readonly pendingCount = computed(() => this.pendingQuery.data()?.length ?? 0);
  protected readonly requests = computed(() => this.requestsQuery.data() ?? []);

  protected requestLabel(s: SaleVoidRequestDto['status']) {
    return REQUEST_STATUS[s].label;
  }
  protected requestTone(s: SaleVoidRequestDto['status']) {
    return REQUEST_STATUS[s].tone;
  }
  /** La API no deja que el vendedor apruebe la anulación de su propia venta. */
  protected isOwnSale(r: SaleVoidRequestDto): boolean {
    return r.sale.sellerId === this.myId;
  }

  protected readonly approveTarget = signal<SaleVoidRequestDto | null>(null);
  protected readonly approveMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.approveVoidRequest(id)),
    onSuccess: () => {
      this.notify.success('Anulación aprobada: la venta quedó anulada y el stock y el efectivo se revirtieron.');
      this.approveTarget.set(null);
      this.invalidate();
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo aprobar la anulación')),
  }));

  protected readonly rejectTarget = signal<SaleVoidRequestDto | null>(null);
  protected readonly rejectReason = signal('');
  protected readonly rejectError = signal('');
  protected openReject(r: SaleVoidRequestDto) {
    this.rejectReason.set('');
    this.rejectError.set('');
    this.rejectTarget.set(r);
  }
  protected readonly rejectMutation = injectMutation(() => ({
    mutationFn: (args: { id: string; reason: string }) => firstValueFrom(this.api.rejectVoidRequest(args.id, args.reason)),
    onSuccess: () => {
      this.notify.success('Solicitud rechazada: la venta sigue vigente.');
      this.rejectTarget.set(null);
      this.invalidate();
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo rechazar la solicitud')),
  }));
  protected submitReject() {
    const t = this.rejectTarget();
    const reason = this.rejectReason().trim();
    if (!t) return;
    if (reason.length < 5) {
      this.rejectError.set('Explica por qué se rechaza (mínimo 5 caracteres).');
      return;
    }
    this.rejectMutation.mutate({ id: t.id, reason });
  }

  // ---------- Pestañas ----------
  protected readonly tab = signal<Tab>(this.canApprove ? 'solicitudes' : 'ventas');
  protected readonly tabs = computed<TabStripItem[]>(() => [
    { id: 'solicitudes', label: this.pendingCount() ? `Solicitudes (${this.pendingCount()})` : 'Solicitudes' },
    { id: 'ventas', label: 'Ventas para anular' },
    { id: 'anuladas', label: 'Anuladas' },
  ]);
  protected setTab(id: string) {
    this.tab.set(id as Tab);
    this.page.set(1);
  }

  // ---------- Ventas (por anular / anuladas) ----------
  protected readonly page = signal(1);
  protected readonly search = signal('');
  protected readonly dateFrom = signal(this.locale.monthStartYmd());
  protected readonly dateTo = signal(this.locale.todayYmd());
  protected readonly activeFilterCount = computed(() =>
    this.dateFrom() !== this.locale.monthStartYmd() || this.dateTo() !== this.locale.todayYmd() ? 1 : 0,
  );

  protected readonly salesQuery = injectQuery(() => ({
    queryKey: ['sales', 'anulaciones', this.tab(), this.page(), this.search(), this.dateFrom(), this.dateTo()] as const,
    enabled: this.tab() !== 'solicitudes',
    queryFn: () =>
      firstValueFrom(
        this.api.listSales({
          page: this.page(),
          pageSize: this.pageSize,
          estado: this.tab() === 'anuladas' ? 'ANULADA' : 'COMPLETADA',
          search: this.search(),
          from: this.dateFrom() || undefined,
          to: this.dateTo() || undefined,
        }),
      ),
  }));
  protected readonly sales = computed(() => this.salesQuery.data()?.items ?? []);
  protected readonly salesTotal = computed(() => this.salesQuery.data()?.total ?? 0);

  protected setSearch(v: string) {
    this.search.set(v);
    this.page.set(1);
  }
  protected setDate(which: 'dateFrom' | 'dateTo', v: string | number) {
    this[which].set(String(v ?? ''));
    this.page.set(1);
  }
  protected clearFilters() {
    this.search.set('');
    this.dateFrom.set(this.locale.monthStartYmd());
    this.dateTo.set(this.locale.todayYmd());
    this.page.set(1);
  }

  protected readonly voidTarget = signal<SaleVoidTarget | null>(null);
  protected canVoid(row: SaleListItemDto): boolean {
    return row.canVoid === true && !row.pendingVoidRequestId;
  }

  private invalidate() {
    for (const key of ['sales', 'billing', 'inventory', 'cash', 'dashboard']) {
      void this.queryClient.invalidateQueries({ queryKey: [key] });
    }
  }
}
