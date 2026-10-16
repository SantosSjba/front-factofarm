import { CommonModule, CurrencyPipe } from '@angular/common';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { Component, computed, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { FormFieldComponent } from '../../../../shared/components/form/form-field/form-field.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import type { StaffLeaveStatusDto, StaffLeaveTypeDto, UserListItemDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';
import { LocaleService } from '../../../../core/services/locale.service';

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

@Component({
  selector: 'app-gestion-personal',
  standalone: true,
  imports: [
    CommonModule,
    AppDatePipe,
    CurrencyPipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    PageStateComponent,
    FormSelectComponent,
    InputFieldComponent,
    FormFieldComponent,
    ButtonComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="breadcrumb" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-title-sm font-semibold">Gestión de personal</h1>
    </app-page-toolbar>

    <div class="mt-4 flex flex-wrap items-end gap-3">
      <app-form-field label="Empleado" required className="w-full sm:w-64">
        <app-form-select
          placeholder="Seleccione un empleado"
          [options]="userOptions()"
          [value]="selectedUserId()"
          (valueChange)="onUserChange($event)"
        />
      </app-form-field>
      @if (selectedUserId()) {
        <app-button startIconName="mdi:login-variant" variant="outline" (btnClick)="checkIn()">Check-in</app-button>
        <app-button startIconName="mdi:logout-variant" variant="outline" (btnClick)="checkOut()">Check-out</app-button>
      }
    </div>

    @if (selectedUserId()) {
      <app-component-card title="Horario semanal" className="mt-4">
        <div class="space-y-2">
          @for (row of scheduleRows(); track row.dayOfWeek) {
            <div class="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 py-1">
              <span class="w-10 text-sm font-medium">{{ dayLabel(row.dayOfWeek) }}</span>
              <app-input-field class="min-w-0" type="time" [ariaLabel]="dayLabel(row.dayOfWeek) + ' hora de entrada'" [value]="row.startTime" (valueChange)="updateScheduleRow(row.dayOfWeek, 'startTime', '' + $event)" />
              <app-input-field class="min-w-0" type="time" [ariaLabel]="dayLabel(row.dayOfWeek) + ' hora de salida'" [value]="row.endTime" (valueChange)="updateScheduleRow(row.dayOfWeek, 'endTime', '' + $event)" />
            </div>
          }
        </div>
        <div class="mt-3">
          <app-button startIconName="mdi:content-save-outline" variant="primary" (btnClick)="saveSchedule()">Guardar horario</app-button>
        </div>
      </app-component-card>

      <app-component-card title="Comisión por ventas" className="mt-4">
        <div class="flex flex-wrap items-end gap-3">
          <app-form-field label="% de comisión" required>
            <app-input-field
              type="number"
              min="0"
              max="100"
              placeholder="0 – 100"
              [value]="commissionPercent()"
              (valueChange)="setCommissionPercent($event)"
            />
          </app-form-field>
          <app-button startIconName="mdi:content-save-outline" variant="primary" (btnClick)="saveCommission()">Guardar comisión</app-button>
        </div>
      </app-component-card>
    }

    <app-component-card title="Asistencia reciente" className="mt-4">
      <app-page-state [loading]="attendanceQuery.isPending()" [error]="attendanceError()" (retry)="attendanceQuery.refetch()">
        @if (attendanceQuery.data(); as data) {
          <table class="min-w-full text-sm">
            <thead>
              <tr class="text-left text-gray-500">
                <th class="py-2">Empleado</th>
                <th>Entrada</th>
                <th>Salida</th>
              </tr>
            </thead>
            <tbody>
              @for (row of data.items; track row.id) {
                <tr class="border-t border-gray-100 dark:border-gray-800">
                  <td class="py-2">{{ row.user.nombre }}</td>
                  <td>{{ row.checkInAt | appDate: 'short' }}</td>
                  <td>{{ row.checkOutAt ? (row.checkOutAt | appDate: 'short') : '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </app-page-state>
    </app-component-card>

    <app-component-card title="Productividad" className="mt-4">
      <div class="mb-3 flex flex-wrap items-end gap-3">
        <app-form-field label="Desde" required>
          <app-input-field type="date" ariaLabel="Productividad desde" [value]="prodFrom()" (valueChange)="prodFrom.set('' + $event)" />
        </app-form-field>
        <app-form-field label="Hasta" required>
          <app-input-field type="date" ariaLabel="Productividad hasta" [value]="prodTo()" (valueChange)="prodTo.set('' + $event)" />
        </app-form-field>
        <app-button startIconName="mdi:magnify" variant="primary" (btnClick)="consultProductivity()">Consultar</app-button>
      </div>
      <app-page-state [loading]="productivityQuery.isPending()" [error]="productivityError()" (retry)="productivityQuery.refetch()">
        @if (productivityQuery.data(); as report) {
          <table class="min-w-full text-sm">
            <thead>
              <tr class="text-left text-gray-500">
                <th class="py-2">Empleado</th>
                <th>Ventas</th>
                <th>Total</th>
                <th>% comisión</th>
                <th>Comisión est.</th>
              </tr>
            </thead>
            <tbody>
              @for (emp of report.employees; track emp.userId) {
                <tr class="border-t border-gray-100 dark:border-gray-800">
                  <td class="py-2">{{ emp.nombre }}</td>
                  <td>{{ emp.ventasCount }}</td>
                  <td>{{ emp.ventasTotal | currency: 'PEN' }}</td>
                  <td>{{ emp.commissionPercent }}%</td>
                  <td>{{ emp.comisionEstimada | currency: 'PEN' }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </app-page-state>
    </app-component-card>

    <app-component-card title="Licencias y vacaciones" className="mt-4">
      @if (selectedUserId()) {
        <div class="mb-4 flex flex-wrap items-end gap-3">
          <app-form-field label="Tipo" required>
            <app-form-select
              placeholder="Tipo"
              [options]="leaveTypeOptions"
              [value]="leaveTipo()"
              (valueChange)="onLeaveTipoChange($event)"
            />
          </app-form-field>
          <app-form-field label="Desde" required>
            <app-input-field type="date" ariaLabel="Licencia desde" [value]="leaveFrom()" (valueChange)="leaveFrom.set('' + $event)" />
          </app-form-field>
          <app-form-field label="Hasta" required>
            <app-input-field type="date" ariaLabel="Licencia hasta" [value]="leaveTo()" (valueChange)="leaveTo.set('' + $event)" />
          </app-form-field>
          <app-button startIconName="mdi:send-outline" variant="primary" (btnClick)="createLeave()">Solicitar</app-button>
        </div>
      }
      <app-page-state [loading]="leavesQuery.isPending()" [error]="leavesError()" (retry)="leavesQuery.refetch()">
        @if (leavesQuery.data(); as leaves) {
          <table class="min-w-full text-sm">
            <thead>
              <tr class="text-left text-gray-500">
                <th class="py-2">Empleado</th>
                <th>Tipo</th>
                <th>Periodo</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (leave of leaves; track leave.id) {
                <tr class="border-t border-gray-100 dark:border-gray-800">
                  <td class="py-2">{{ leave.user.nombre }}</td>
                  <td>{{ leave.tipo }}</td>
                  <td>{{ leave.fromDate | appDate: 'shortDate' }} – {{ leave.toDate | appDate: 'shortDate' }}</td>
                  <td>{{ leave.estado }}</td>
                  <td>
                    @if (leave.estado === 'SOLICITADO') {
                      <div class="flex flex-wrap items-center justify-end gap-1.5">
                        <app-button
                          size="sm"
                          [iconOnly]="true"
                          startIconName="mdi:check-circle-outline"
                          tooltip="Aprobar"
                          (btnClick)="updateLeave(leave.id, 'APROBADO')"
                        />
                        <app-button
                          size="sm"
                          variant="danger"
                          [iconOnly]="true"
                          startIconName="mdi:close-circle-outline"
                          tooltip="Rechazar"
                          (btnClick)="updateLeave(leave.id, 'RECHAZADO')"
                        />
                      </div>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </app-page-state>
    </app-component-card>
  ` })
export class GestionPersonalComponent {
  private readonly locale = inject(LocaleService);
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [
    { label: 'Usuarios & Establecimientos' },
    { label: 'Gestión personal' },
  ];

  protected readonly leaveTypeOptions = [
    { value: 'VACACIONES', label: 'Vacaciones' },
    { value: 'LICENCIA_MEDICA', label: 'Licencia médica' },
    { value: 'PERMISO', label: 'Permiso' },
    { value: 'OTRO', label: 'Otro' },
  ];

  protected readonly selectedUserId = signal('');
  protected readonly commissionPercent = signal(0);
  protected readonly scheduleRows = signal(
    Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      startTime: '09:00',
      endTime: '18:00' })),
  );
  protected readonly prodFrom = signal(
    this.locale.monthStartYmd(),
  );
  protected readonly prodTo = signal(this.locale.todayYmd());
  protected readonly leaveTipo = signal<StaffLeaveTypeDto>('VACACIONES');
  protected readonly leaveFrom = signal('');
  protected readonly leaveTo = signal('');

  protected readonly usersQuery = injectQuery(() => ({
    queryKey: ['staff', 'users'] as const,
    queryFn: () => firstValueFrom(this.api.listUsers({ pageSize: 200 })) }));

  protected readonly userOptions = computed(() =>
    (this.usersQuery.data()?.items ?? []).map((u: UserListItemDto) => ({
      value: u.id,
      label: u.nombre })),
  );

  protected readonly attendanceQuery = injectQuery(() => ({
    queryKey: ['staff', 'attendance', this.selectedUserId()] as const,
    queryFn: () =>
      firstValueFrom(
        this.api.listStaffAttendance({
          page: 1,
          pageSize: 20,
          userId: this.selectedUserId() || undefined }),
      ) }));

  protected readonly productivityQuery = injectQuery(() => ({
    queryKey: ['staff', 'productivity', this.prodFrom(), this.prodTo()] as const,
    enabled: !!this.prodFrom() && !!this.prodTo() && this.prodFrom() <= this.prodTo(),
    queryFn: () => firstValueFrom(this.api.getStaffProductivityReport(this.prodFrom(), this.prodTo())) }));

  protected readonly leavesQuery = injectQuery(() => ({
    queryKey: ['staff', 'leaves'] as const,
    queryFn: () => firstValueFrom(this.api.listStaffLeaves()) }));

  protected dayLabel(dayOfWeek: number): string {
    return DAY_LABELS[dayOfWeek] ?? String(dayOfWeek);
  }

  protected onUserChange(value: string) {
    this.selectedUserId.set(value);
    if (!value) return;
    void this.loadSchedule(value);
  }

  protected onLeaveTipoChange(value: string) {
    this.leaveTipo.set(value as StaffLeaveTypeDto);
  }

  protected setCommissionPercent(value: string | number) {
    this.commissionPercent.set(Number(value) || 0);
  }

  private async loadSchedule(userId: string) {
    try {
      const rows = await firstValueFrom(this.api.getStaffWorkSchedule(userId));
      if (rows.length === 0) return;
      this.scheduleRows.set(
        Array.from({ length: 7 }, (_, dayOfWeek) => {
          const found = rows.find((r) => r.dayOfWeek === dayOfWeek);
          return {
            dayOfWeek,
            startTime: found?.startTime ?? '09:00',
            endTime: found?.endTime ?? '18:00' };
        }),
      );
    } catch {
      // mantener valores por defecto
    }
  }

  protected updateScheduleRow(dayOfWeek: number, field: 'startTime' | 'endTime', value: string) {
    this.scheduleRows.update((rows) =>
      rows.map((row) => (row.dayOfWeek === dayOfWeek ? { ...row, [field]: value } : row)),
    );
  }

  protected attendanceError() {
    const err = this.attendanceQuery.error();
    return err ? httpErrorMessage(err, 'No se pudo cargar asistencia') : null;
  }

  protected productivityError() {
    const err = this.productivityQuery.error();
    return err ? httpErrorMessage(err, 'No se pudo cargar productividad') : null;
  }

  protected leavesError() {
    const err = this.leavesQuery.error();
    return err ? httpErrorMessage(err, 'No se pudieron cargar licencias') : null;
  }

  private readonly checkInMutation = injectMutation(() => ({
    mutationFn: (userId: string) => firstValueFrom(this.api.staffCheckIn(userId)),
    onSuccess: () => {
      this.notify.success('Check-in registrado');
      void this.queryClient.invalidateQueries({ queryKey: ['staff', 'attendance'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar check-in')) }));

  private readonly checkOutMutation = injectMutation(() => ({
    mutationFn: (userId: string) => firstValueFrom(this.api.staffCheckOut(userId)),
    onSuccess: () => {
      this.notify.success('Check-out registrado');
      void this.queryClient.invalidateQueries({ queryKey: ['staff', 'attendance'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar check-out')) }));

  protected checkIn() {
    const userId = this.selectedUserId();
    if (!userId) return;
    this.checkInMutation.mutate(userId);
  }

  protected checkOut() {
    const userId = this.selectedUserId();
    if (!userId) return;
    this.checkOutMutation.mutate(userId);
  }

  protected consultProductivity() {
    if (!this.prodFrom() || !this.prodTo()) {
      this.notify.warning('Indique las fechas desde y hasta.');
      return;
    }
    if (this.prodFrom() > this.prodTo()) {
      this.notify.warning('La fecha "desde" no puede ser posterior a "hasta".');
      return;
    }
    void this.productivityQuery.refetch();
  }

  protected saveSchedule() {
    const userId = this.selectedUserId();
    if (!userId) return;
    const bad = this.scheduleRows().find((r) => r.startTime && r.endTime && r.startTime >= r.endTime);
    if (bad) {
      this.notify.warning(`En ${this.dayLabel(bad.dayOfWeek)}, la hora de salida debe ser posterior a la de entrada.`);
      return;
    }
    firstValueFrom(this.api.upsertStaffWorkSchedule(userId, this.scheduleRows()))
      .then(() => {
        this.notify.success('Horario guardado');
      })
      .catch((err) => this.notify.error(httpErrorMessage(err, 'No se pudo guardar horario')));
  }

  protected saveCommission() {
    const userId = this.selectedUserId();
    if (!userId) return;
    const pct = this.commissionPercent();
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      this.notify.warning('El porcentaje de comisión debe estar entre 0 y 100.');
      return;
    }
    firstValueFrom(this.api.upsertStaffCommissionRule(userId, this.commissionPercent()))
      .then(() => {
        this.notify.success('Comisión actualizada');
        void this.productivityQuery.refetch();
      })
      .catch((err) => this.notify.error(httpErrorMessage(err, 'No se pudo guardar comisión')));
  }

  protected createLeave() {
    const userId = this.selectedUserId();
    if (!userId || !this.leaveFrom() || !this.leaveTo()) {
      this.notify.warning('Seleccione empleado y fechas');
      return;
    }
    if (this.leaveFrom() > this.leaveTo()) {
      this.notify.warning('La fecha "desde" no puede ser posterior a "hasta".');
      return;
    }
    firstValueFrom(
      this.api.createStaffLeave(userId, {
        tipo: this.leaveTipo(),
        fromDate: this.leaveFrom(),
        toDate: this.leaveTo() }),
    )
      .then(() => {
        this.notify.success('Licencia registrada');
        void this.leavesQuery.refetch();
      })
      .catch((err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar licencia')));
  }

  protected updateLeave(leaveId: string, estado: StaffLeaveStatusDto) {
    firstValueFrom(this.api.updateStaffLeaveStatus(leaveId, estado))
      .then(() => {
        this.notify.success('Estado actualizado');
        void this.leavesQuery.refetch();
      })
      .catch((err) => this.notify.error(httpErrorMessage(err, 'No se pudo actualizar licencia')));
  }
}
