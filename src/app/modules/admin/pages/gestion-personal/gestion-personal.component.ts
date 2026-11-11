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
import { KpiTileComponent } from '../../../../shared/components/common/dashboard/kpi-tile.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { TableDropdownComponent } from '../../../../shared/components/common/table-dropdown/table-dropdown.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { CheckboxComponent } from '../../../../shared/components/form/input/checkbox.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { TextAreaComponent } from '../../../../shared/components/form/input/text-area.component';
import { StatusBadgeComponent, type StatusTone } from '../../../../shared/components/ui/badge/status-badge.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { MenuItemComponent } from '../../../../shared/components/ui/menu-item/menu-item.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { TabStripComponent, type TabStripItem } from '../../../../shared/components/ui/tab-strip/tab-strip.component';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { PeriodFilterComponent, type Period } from '../../components/period-filter/period-filter.component';
import type { StaffAttendanceItemDto, StaffLeaveItemDto, StaffLeaveStatusDto, StaffLeaveTypeDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';
import { soles } from '../../utils/finance-labels';
import { hasChainScope } from '../../utils/user-policy';

type Tab = 'asistencia' | 'licencias' | 'horarios' | 'productividad';
type ScheduleRow = { dayOfWeek: number; startTime: string; endTime: string; activo: boolean };

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const LEAVE_TYPES: Record<StaffLeaveTypeDto, string> = {
  VACACIONES: 'Vacaciones',
  LICENCIA_MEDICA: 'Descanso médico',
  PERMISO: 'Permiso',
  OTRO: 'Otro',
};
const LEAVE_STATUS: Record<StaffLeaveStatusDto, { label: string; tone: StatusTone }> = {
  SOLICITADO: { label: 'Por aprobar', tone: 'warning' },
  APROBADO: { label: 'Aprobado', tone: 'success' },
  RECHAZADO: { label: 'Rechazado', tone: 'error' },
  CANCELADO: { label: 'Cancelado', tone: 'neutral' },
};

/** Personal: asistencia, licencias, horarios, comisiones y productividad. */
@Component({
  selector: 'app-gestion-personal',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    AppDatePipe,
    QueryPageStatePipe,
    BreadcrumbInlineComponent,
    ButtonComponent,
    CheckboxComponent,
    ComponentCardComponent,
    FormSelectComponent,
    HelpPanelComponent,
    InputFieldComponent,
    KpiTileComponent,
    MenuItemComponent,
    ModalComponent,
    PageToolbarComponent,
    PaginationComponent,
    PeriodFilterComponent,
    StatusBadgeComponent,
    TabStripComponent,
    TableDropdownComponent,
    TextAreaComponent,
  ],
  templateUrl: './gestion-personal.component.html',
})
export class GestionPersonalComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly auth = inject(AuthService);
  private readonly locale = inject(LocaleService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Usuarios y establecimientos' }, { label: 'Gestión de personal' }];
  protected readonly tabs: TabStripItem[] = [
    { id: 'asistencia', label: 'Asistencia' },
    { id: 'licencias', label: 'Licencias y vacaciones' },
    { id: 'horarios', label: 'Horario y comisión' },
    { id: 'productividad', label: 'Productividad' },
  ];
  protected readonly tab = signal<Tab>('asistencia');
  protected readonly days = DAYS;
  protected readonly money = soles;
  private readonly myId = this.auth.user()?.id ?? '';
  private readonly isChain = hasChainScope(this.auth.user()?.role);

  // ---------- Empleados ----------
  protected readonly usersQuery = injectQuery(() => ({
    queryKey: ['staff', 'users'] as const,
    queryFn: () => firstValueFrom(this.api.listUsers({ pageSize: 100 })),
  }));
  protected readonly employeeOptions = computed(() =>
    (this.usersQuery.data()?.items ?? []).map((u) => ({ value: u.id, label: u.nombre })),
  );
  protected readonly employeeFilterOptions = computed(() => [{ value: '', label: 'Todo el personal' }, ...this.employeeOptions()]);

  // ---------- Asistencia ----------
  protected readonly attendanceUser = signal('');
  protected readonly attendancePage = signal(1);
  protected readonly attendanceQuery = injectQuery(() => ({
    queryKey: ['staff', 'attendance', this.attendanceUser(), this.attendancePage()] as const,
    queryFn: () => firstValueFrom(this.api.listStaffAttendance({ page: this.attendancePage(), pageSize: 20, userId: this.attendanceUser() || undefined })),
  }));
  protected readonly attendanceRows = computed(() => this.attendanceQuery.data()?.items ?? []);
  protected readonly attendanceTotal = computed(() => this.attendanceQuery.data()?.total ?? 0);
  protected readonly openNow = computed(() => this.attendanceRows().filter((r) => !r.checkOutAt).length);

  protected hours(row: StaffAttendanceItemDto): string {
    const end = row.checkOutAt ? new Date(row.checkOutAt).getTime() : Date.now();
    const mins = Math.max(0, Math.round((end - new Date(row.checkInAt).getTime()) / 60000));
    return `${Math.floor(mins / 60)} h ${String(mins % 60).padStart(2, '0')} min`;
  }

  protected readonly punchMutation = injectMutation(() => ({
    mutationFn: async (args: { userId: string; kind: 'in' | 'out' }): Promise<{ id: string }> =>
      args.kind === 'in' ? firstValueFrom(this.api.staffCheckIn(args.userId)) : firstValueFrom(this.api.staffCheckOut(args.userId)),
    onSuccess: (_r, args) => {
      this.notify.success(args.kind === 'in' ? 'Entrada registrada' : 'Salida registrada');
      void this.queryClient.invalidateQueries({ queryKey: ['staff', 'attendance'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar la asistencia')),
  }));
  protected punch(kind: 'in' | 'out') {
    const userId = this.attendanceUser();
    if (!userId) {
      this.notify.warning('Elige primero a la persona en «Empleado».');
      return;
    }
    this.punchMutation.mutate({ userId, kind });
  }

  // ---------- Licencias ----------
  protected readonly leaveStatusFilter = signal<'' | StaffLeaveStatusDto>('SOLICITADO');
  protected readonly leaveStatusOptions = [
    { value: 'SOLICITADO', label: 'Por aprobar' },
    { value: 'APROBADO', label: 'Aprobadas' },
    { value: 'RECHAZADO', label: 'Rechazadas' },
    { value: '', label: 'Todas' },
  ];
  protected readonly leavesQuery = injectQuery(() => ({
    queryKey: ['staff', 'leaves'] as const,
    queryFn: () => firstValueFrom(this.api.listStaffLeaves()),
  }));
  protected readonly leaves = computed(() => {
    const f = this.leaveStatusFilter();
    return (this.leavesQuery.data() ?? []).filter((l) => !f || l.estado === f);
  });
  protected readonly pendingLeaves = computed(() => (this.leavesQuery.data() ?? []).filter((l) => l.estado === 'SOLICITADO').length);
  protected leaveTypeLabel(t: StaffLeaveTypeDto) {
    return LEAVE_TYPES[t] ?? t;
  }
  protected leaveLabel(s: StaffLeaveStatusDto) {
    return LEAVE_STATUS[s].label;
  }
  protected leaveTone(s: StaffLeaveStatusDto) {
    return LEAVE_STATUS[s].tone;
  }
  protected leaveDays(l: StaffLeaveItemDto) {
    return Math.round((new Date(l.toDate).getTime() - new Date(l.fromDate).getTime()) / 86_400_000) + 1;
  }
  /** La API no deja aprobar la licencia propia (salvo administradores). */
  protected canDecide(l: StaffLeaveItemDto) {
    return l.estado === 'SOLICITADO' && (this.isChain || l.user.id !== this.myId);
  }

  protected readonly leaveOpen = signal(false);
  protected readonly leaveUser = signal('');
  protected readonly leaveTipo = signal<StaffLeaveTypeDto>('VACACIONES');
  protected readonly leaveFrom = signal('');
  protected readonly leaveTo = signal('');
  protected readonly leaveNotes = signal('');
  protected readonly leaveErrors = signal<{ user?: string; from?: string; to?: string }>({});
  protected readonly leaveTypeOptions = (Object.keys(LEAVE_TYPES) as StaffLeaveTypeDto[]).map((value) => ({ value, label: LEAVE_TYPES[value] }));

  protected openLeave() {
    this.leaveUser.set(this.attendanceUser());
    this.leaveTipo.set('VACACIONES');
    this.leaveFrom.set('');
    this.leaveTo.set('');
    this.leaveNotes.set('');
    this.leaveErrors.set({});
    this.leaveOpen.set(true);
  }
  protected submitLeave() {
    const e: { user?: string; from?: string; to?: string } = {};
    if (!this.leaveUser()) e.user = 'Elige a la persona.';
    if (!this.leaveFrom()) e.from = 'Elige la fecha de inicio.';
    if (!this.leaveTo()) e.to = 'Elige la fecha de fin.';
    else if (this.leaveFrom() && this.leaveTo() < this.leaveFrom()) e.to = 'No puede ser antes del inicio.';
    this.leaveErrors.set(e);
    if (Object.keys(e).length) return;
    this.leaveMutation.mutate();
  }
  protected readonly leaveMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.createStaffLeave(this.leaveUser(), {
          tipo: this.leaveTipo(),
          fromDate: this.leaveFrom(),
          toDate: this.leaveTo(),
          notas: this.leaveNotes().trim() || undefined,
        }),
      ),
    onSuccess: () => {
      this.notify.success('Solicitud registrada: queda por aprobar.');
      this.leaveOpen.set(false);
      void this.queryClient.invalidateQueries({ queryKey: ['staff', 'leaves'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar la licencia')),
  }));

  protected readonly decide = signal<{ leave: StaffLeaveItemDto; estado: StaffLeaveStatusDto } | null>(null);
  protected readonly decideMutation = injectMutation(() => ({
    mutationFn: (args: { id: string; estado: StaffLeaveStatusDto }) => firstValueFrom(this.api.updateStaffLeaveStatus(args.id, args.estado)),
    onSuccess: (_r, args) => {
      this.notify.success(args.estado === 'APROBADO' ? 'Licencia aprobada' : args.estado === 'RECHAZADO' ? 'Licencia rechazada' : 'Licencia cancelada');
      this.decide.set(null);
      void this.queryClient.invalidateQueries({ queryKey: ['staff', 'leaves'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo actualizar la licencia')),
  }));

  // ---------- Horario y comisión ----------
  protected readonly scheduleUser = signal('');
  protected readonly schedule = signal<ScheduleRow[]>(this.defaultSchedule());
  protected readonly scheduleError = signal('');
  protected readonly commission = signal<number | null>(null);
  protected readonly commissionError = signal('');
  protected readonly isSelf = computed(() => !this.isChain && this.scheduleUser() === this.myId);

  private defaultSchedule(): ScheduleRow[] {
    return Array.from({ length: 7 }, (_, d) => ({ dayOfWeek: d, startTime: '09:00', endTime: '18:00', activo: d !== 0 }));
  }

  protected async pickScheduleUser(userId: string) {
    this.scheduleUser.set(userId);
    this.schedule.set(this.defaultSchedule());
    this.scheduleError.set('');
    this.commission.set(null);
    if (!userId) return;
    try {
      const rows = await firstValueFrom(this.api.getStaffWorkSchedule(userId));
      if (rows.length) {
        this.schedule.set(
          this.defaultSchedule().map((d) => {
            const r = rows.find((x) => x.dayOfWeek === d.dayOfWeek);
            return r ? { dayOfWeek: d.dayOfWeek, startTime: r.startTime, endTime: r.endTime, activo: r.activo } : { ...d, activo: false };
          }),
        );
      }
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo cargar el horario'));
    }
    const emp = this.productivityQuery.data()?.employees.find((e) => e.userId === userId);
    if (emp) this.commission.set(Number(emp.commissionPercent));
  }
  protected patchDay(day: number, patch: Partial<ScheduleRow>) {
    this.schedule.update((rows) => rows.map((r) => (r.dayOfWeek === day ? { ...r, ...patch } : r)));
    this.scheduleError.set('');
  }
  protected readonly scheduleMutation = injectMutation(() => ({
    mutationFn: () => firstValueFrom(this.api.upsertStaffWorkSchedule(this.scheduleUser(), this.schedule())),
    onSuccess: () => this.notify.success('Horario guardado'),
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo guardar el horario')),
  }));
  protected saveSchedule() {
    const bad = this.schedule().find((r) => r.activo && r.startTime >= r.endTime);
    if (bad) {
      this.scheduleError.set(`El ${DAYS[bad.dayOfWeek].toLowerCase()} la salida debe ser después de la entrada.`);
      return;
    }
    this.scheduleMutation.mutate();
  }
  protected readonly commissionMutation = injectMutation(() => ({
    mutationFn: () => firstValueFrom(this.api.upsertStaffCommissionRule(this.scheduleUser(), Number(this.commission()))),
    onSuccess: () => {
      this.notify.success('Comisión guardada');
      void this.queryClient.invalidateQueries({ queryKey: ['staff', 'productivity'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo guardar la comisión')),
  }));
  protected saveCommission() {
    const pct = Number(this.commission());
    if (this.commission() == null || !Number.isFinite(pct) || pct < 0 || pct > 100) {
      this.commissionError.set('Escribe un porcentaje entre 0 y 100.');
      return;
    }
    this.commissionError.set('');
    this.commissionMutation.mutate();
  }

  // ---------- Productividad ----------
  protected readonly period = signal<Period>({ from: this.locale.monthStartYmd(), to: this.locale.todayYmd() });
  protected readonly productivityQuery = injectQuery(() => ({
    queryKey: ['staff', 'productivity', this.period().from, this.period().to] as const,
    queryFn: () => firstValueFrom(this.api.getStaffProductivityReport(this.period().from, this.period().to)),
  }));
  protected readonly employees = computed(() =>
    [...(this.productivityQuery.data()?.employees ?? [])].sort((a, b) => Number(b.ventasTotal) - Number(a.ventasTotal)),
  );
  protected readonly productivityKpis = computed(() => {
    const e = this.employees();
    const total = e.reduce((a, x) => a + Number(x.ventasTotal), 0);
    return {
      ventas: `${e.reduce((a, x) => a + x.ventasCount, 0)}`,
      total: soles(total),
      comision: soles(e.reduce((a, x) => a + Number(x.comisionEstimada), 0)),
      top: e[0]?.ventasCount ? e[0].nombre : '—',
    };
  });
}
