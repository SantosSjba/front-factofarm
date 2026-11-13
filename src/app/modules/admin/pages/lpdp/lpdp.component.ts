import { Component, computed, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { AuthService } from '../../../../core/services/auth.service';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import type { SummaryChip } from '../../../../shared/components/ui/summary-chips/summary-chips.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { TableDropdownComponent } from '../../../../shared/components/common/table-dropdown/table-dropdown.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { TextAreaComponent } from '../../../../shared/components/form/input/text-area.component';
import { SearchSelectComponent, type SearchSelectOption } from '../../../../shared/components/form/search-select/search-select.component';
import { StatusBadgeComponent, type StatusTone } from '../../../../shared/components/ui/badge/status-badge.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { MenuItemComponent } from '../../../../shared/components/ui/menu-item/menu-item.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { TabStripComponent, type TabStripItem } from '../../../../shared/components/ui/tab-strip/tab-strip.component';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { downloadBlob } from '../../components/cash/cash-files';
import type { ArcoRequestDto, ArcoRequestStatus, ArcoRequestType } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

type Tab = 'arco' | 'tratamiento' | 'conservacion';

const ARCO_TYPES: Record<ArcoRequestType, { label: string; hint: string; days: number }> = {
  ACCESO: { label: 'Acceso', hint: 'El cliente quiere saber qué datos suyos tenemos.', days: 20 },
  RECTIFICACION: { label: 'Rectificación', hint: 'El cliente pide corregir un dato.', days: 10 },
  CANCELACION: { label: 'Cancelación', hint: 'El cliente pide borrar sus datos. Al completarla se da de baja al cliente.', days: 10 },
  OPOSICION: { label: 'Oposición', hint: 'El cliente no quiere que usemos sus datos para algo (p. ej. publicidad).', days: 10 },
};
const ARCO_STATUS: Record<ArcoRequestStatus, { label: string; tone: StatusTone }> = {
  PENDIENTE: { label: 'Pendiente', tone: 'warning' },
  EN_PROCESO: { label: 'En proceso', tone: 'info' },
  COMPLETADA: { label: 'Atendida', tone: 'success' },
  RECHAZADA: { label: 'Rechazada', tone: 'error' },
};

/** Días hábiles (lunes a viernes) desde una fecha hasta hoy. */
function businessDaysSince(iso: string): number {
  const d = new Date(iso);
  const today = new Date();
  let n = 0;
  for (const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); x <= today; x.setDate(x.getDate() + 1)) {
    if (x.getDay() !== 0 && x.getDay() !== 6) n++;
  }
  return n;
}

/** Protección de datos personales (Ley 29733): derechos ARCO, tratamiento y conservación. */
@Component({
  selector: 'app-lpdp',
  standalone: true,
  imports: [
    AppDatePipe,
    QueryPageStatePipe,
    BreadcrumbInlineComponent,
    ButtonComponent,
    FormSelectComponent,
    HelpPanelComponent,
    ListFiltersComponent,
    PageStateComponent,
    MenuItemComponent,
    ModalComponent,
    PageToolbarComponent,
    SearchSelectComponent,
    StatusBadgeComponent,
    TabStripComponent,
    TableDropdownComponent,
    TextAreaComponent,
  ],
  templateUrl: './lpdp.component.html',
})
export class LpdpComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Usuarios y establecimientos' }, { label: 'Datos personales (LPDP)' }];
  protected readonly tabs: TabStripItem[] = [
    { id: 'arco', label: 'Solicitudes ARCO' },
    { id: 'tratamiento', label: 'Qué datos usamos' },
    { id: 'conservacion', label: 'Conservación' },
  ];
  protected readonly tab = signal<Tab>('arco');
  protected readonly canWrite = ['compliance.write', 'nav.lpdp'].some((p) => this.auth.hasPermission(p));

  // ---------- ARCO ----------
  protected readonly statusFilter = signal<'' | ArcoRequestStatus>('');
  protected readonly typeFilter = signal<'' | ArcoRequestType>('');
  /** Solo abiertas que pasaron su plazo legal (desde el chip «Fuera de plazo»). */
  protected readonly overdueOnly = signal(false);
  protected readonly search = signal('');
  protected readonly statusOptions = [
    { value: '', label: 'Todos los estados' },
    ...(Object.keys(ARCO_STATUS) as ArcoRequestStatus[]).map((value) => ({ value, label: ARCO_STATUS[value].label })),
  ];
  protected readonly arcoQuery = injectQuery(() => ({
    queryKey: ['compliance', 'arco'] as const,
    queryFn: () => firstValueFrom(this.api.listArcoRequests()),
  }));
  protected readonly requests = computed(() => {
    const f = this.statusFilter();
    const t = this.typeFilter();
    const late = this.overdueOnly();
    const q = this.search().trim().toLowerCase();
    return (this.arcoQuery.data() ?? []).filter(
      (r) =>
        (!f || r.status === f) &&
        (!t || r.requestType === t) &&
        (!late || this.overdue(r)) &&
        (!q || `${r.customer?.nombre ?? ''} ${r.customer?.numeroDocumento ?? ''}`.toLowerCase().includes(q)),
    );
  });
  protected readonly hasFilters = computed(() => !!(this.statusFilter() || this.typeFilter() || this.overdueOnly() || this.search().trim()));

  /** Chips: total, fuera de plazo, por estado y por derecho (conteos sobre todas las solicitudes). */
  protected readonly summaryChips = computed<SummaryChip[]>(() => {
    const all = this.arcoQuery.data();
    if (!all) return [];
    const f = this.statusFilter();
    const t = this.typeFilter();
    const late = all.filter((r) => this.overdue(r)).length;
    return [
      { id: 'all', label: 'Total', count: all.length, icon: 'lucide:file-text', group: 'General', active: !f && !t && !this.overdueOnly(), tooltip: 'Todas las solicitudes. Clic para quitar los filtros de estado, derecho y plazo.' },
      { id: 'late', label: 'Fuera de plazo', count: late, tone: late ? 'error' : 'neutral', group: 'General', active: this.overdueOnly(), tooltip: 'Abiertas que pasaron su plazo legal (20 días hábiles para acceso, 10 para las demás). Clic para ver solo esas.' },
      ...(Object.keys(ARCO_STATUS) as ArcoRequestStatus[]).map((s) => ({
        id: 'status:' + s,
        label: ARCO_STATUS[s].label,
        count: all.filter((r) => r.status === s).length,
        tone: ARCO_STATUS[s].tone,
        group: 'Estado',
        active: f === s,
        tooltip: `Ver solo solicitudes «${ARCO_STATUS[s].label.toLowerCase()}» (clic de nuevo para quitar).`,
      })),
      ...(Object.keys(ARCO_TYPES) as ArcoRequestType[]).map((tp) => ({
        id: 'type:' + tp,
        label: ARCO_TYPES[tp].label,
        count: all.filter((r) => r.requestType === tp).length,
        icon: 'lucide:scale',
        group: 'Derecho',
        active: t === tp,
        tooltip: `${ARCO_TYPES[tp].hint} Clic para ver solo estas.`,
      })),
    ];
  });

  protected onSummaryChip(chip: SummaryChip) {
    if (chip.id === 'all') {
      this.statusFilter.set('');
      this.typeFilter.set('');
      this.overdueOnly.set(false);
    } else if (chip.id === 'late') {
      this.overdueOnly.set(!this.overdueOnly());
    } else if (chip.id.startsWith('status:')) {
      const s = chip.id.slice(7) as ArcoRequestStatus;
      this.statusFilter.set(this.statusFilter() === s ? '' : s);
    } else if (chip.id.startsWith('type:')) {
      const tp = chip.id.slice(5) as ArcoRequestType;
      this.typeFilter.set(this.typeFilter() === tp ? '' : tp);
    }
  }

  protected clearFilters() {
    this.statusFilter.set('');
    this.typeFilter.set('');
    this.overdueOnly.set(false);
    this.search.set('');
  }

  protected typeLabel(t: ArcoRequestType) {
    return ARCO_TYPES[t]?.label ?? t;
  }
  protected typeHint(t: ArcoRequestType) {
    return ARCO_TYPES[t]?.hint ?? '';
  }
  protected statusLabel(s: ArcoRequestStatus) {
    return ARCO_STATUS[s]?.label ?? s;
  }
  protected statusTone(s: ArcoRequestStatus) {
    return ARCO_STATUS[s]?.tone ?? 'neutral';
  }
  protected isOpen(r: ArcoRequestDto) {
    return r.status === 'PENDIENTE' || r.status === 'EN_PROCESO';
  }
  protected elapsed(r: ArcoRequestDto) {
    return businessDaysSince(r.createdAt);
  }
  protected limit(r: ArcoRequestDto) {
    return ARCO_TYPES[r.requestType]?.days ?? 10;
  }
  /** Plazo legal: 20 días hábiles para acceso, 10 para el resto. */
  protected overdue(r: ArcoRequestDto) {
    return this.isOpen(r) && this.elapsed(r) > this.limit(r);
  }

  // ---------- Nueva solicitud ----------
  protected readonly newOpen = signal(false);
  protected readonly customerTerm = signal('');
  protected readonly customer = signal<SearchSelectOption | null>(null);
  protected readonly newType = signal<ArcoRequestType>('ACCESO');
  protected readonly newDetails = signal('');
  protected readonly newError = signal('');
  protected readonly typeOptions = (Object.keys(ARCO_TYPES) as ArcoRequestType[]).map((value) => ({ value, label: ARCO_TYPES[value].label }));
  protected readonly customersQuery = injectQuery(() => ({
    queryKey: ['compliance', 'arco-customers', this.customerTerm()] as const,
    enabled: this.newOpen() && this.customerTerm().trim().length >= 2,
    queryFn: () => firstValueFrom(this.api.listCustomers({ search: this.customerTerm(), pageSize: 10 })),
  }));
  protected readonly customerOptions = computed<SearchSelectOption[]>(() =>
    (this.customersQuery.data()?.items ?? []).map((c) => ({ value: c.id, label: c.nombre, meta: c.numeroDocumento ?? '' })),
  );
  protected openNew() {
    this.customer.set(null);
    this.customerTerm.set('');
    this.newType.set('ACCESO');
    this.newDetails.set('');
    this.newError.set('');
    this.newOpen.set(true);
  }
  protected submitNew() {
    if (!this.customer()) {
      this.newError.set('Busca y elige al cliente que hace la solicitud.');
      return;
    }
    this.createMutation.mutate();
  }
  protected readonly createMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.createArcoRequest({ customerId: this.customer()!.value, requestType: this.newType(), details: this.newDetails().trim() || undefined }),
      ),
    onSuccess: () => {
      this.notify.success('Solicitud registrada');
      this.newOpen.set(false);
      void this.queryClient.invalidateQueries({ queryKey: ['compliance', 'arco'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar la solicitud')),
  }));

  // ---------- Atender ----------
  protected readonly processing = signal<ArcoRequestDto | null>(null);
  protected readonly processStatus = signal<ArcoRequestStatus>('EN_PROCESO');
  protected readonly processNotes = signal('');
  protected readonly processError = signal('');
  protected readonly processOptions = [
    { value: 'EN_PROCESO', label: 'En proceso' },
    { value: 'COMPLETADA', label: 'Atendida' },
    { value: 'RECHAZADA', label: 'Rechazada' },
  ];
  protected openProcess(r: ArcoRequestDto) {
    this.processStatus.set(r.status === 'PENDIENTE' ? 'EN_PROCESO' : 'COMPLETADA');
    this.processNotes.set(r.responseNotes ?? '');
    this.processError.set('');
    this.processing.set(r);
  }
  protected submitProcess() {
    if (this.processStatus() === 'RECHAZADA' && !this.processNotes().trim()) {
      this.processError.set('Explica al cliente por qué se rechaza.');
      return;
    }
    this.processMutation.mutate();
  }
  protected readonly processMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(this.api.processArcoRequest(this.processing()!.id, { status: this.processStatus(), responseNotes: this.processNotes().trim() || undefined })),
    onSuccess: () => {
      this.notify.success('Solicitud actualizada');
      this.processing.set(null);
      void this.queryClient.invalidateQueries({ queryKey: ['compliance', 'arco'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo actualizar la solicitud')),
  }));

  /** Derecho de acceso: descarga todo lo que tenemos del cliente. */
  protected exportData(r: ArcoRequestDto) {
    if (!r.customer) return;
    this.api.exportCustomerPersonalData(r.customer.id).subscribe({
      next: (data) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `datos-${r.customer!.numeroDocumento || r.customer!.id}.json`);
      },
      error: (err) => this.notify.error(httpErrorMessage(err, 'No se pudieron exportar los datos')),
    });
  }

  // ---------- Tratamiento y conservación ----------
  protected readonly matrixQuery = injectQuery(() => ({
    queryKey: ['compliance', 'lpdp-matrix'] as const,
    enabled: this.tab() === 'tratamiento',
    queryFn: () => firstValueFrom(this.api.getLpdpTreatmentMatrix()),
  }));
  protected readonly retentionQuery = injectQuery(() => ({
    queryKey: ['compliance', 'retention'] as const,
    enabled: this.tab() === 'conservacion',
    queryFn: () => firstValueFrom(this.api.getLpdpRetentionCandidates()),
  }));
}
