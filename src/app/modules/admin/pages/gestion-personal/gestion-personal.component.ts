import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
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
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import type { StaffLeaveStatusDto, StaffLeaveTypeDto, UserListItemDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

@Component({
  selector: 'app-gestion-personal',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    DatePipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    PageStateComponent,
    FormSelectComponent,
    InputFieldComponent,
    ButtonComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="breadcrumb" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-title-sm font-semibold">Gestión de personal</h1>
    </app-page-toolbar>

    <div class="mt-4 flex flex-wrap items-end gap-3">
      <div class="min-w-[220px]">
        <app-form-select
          placeholder="Empleado"
          [options]="userOptions()"
          [value]="selectedUserId()"
          (valueChange)="onUserChange($event)"
        />
      </div>
      @if (selectedUserId()) {
        <app-button variant="outline" (btnClick)="checkIn()">Check-in</app-button>
        <app-button variant="outline" (btnClick)="checkOut()">Check-out</app-button>
      }
    </div>

    @if (selectedUserId()) {
      <app-component-card title="Horario semanal" className="mt-4">
        <div class="space-y-2">
          @for (row of scheduleRows(); track row.dayOfWeek) {
            <div class="flex flex-wrap items-center gap-2 py-1">
              <span class="w-10 text-sm font-medium">{{ dayLabel(row.dayOfWeek) }}</span>
              <app-input-field type="time" [value]="row.startTime" (valueChange)="updateScheduleRow(row.dayOfWeek, 'startTime', '' + $event)" />
              <app-input-field type="time" [value]="row.endTime" (valueChange)="updateScheduleRow(row.dayOfWeek, 'endTime', '' + $event)" />
            </div>
          }
        </div>
        <div class="mt-3">
          <app-button variant="primary" (btnClick)="saveSchedule()">Guardar horario</app-button>
        </div>
      </app-component-card>

      <app-component-card title="Comisión por ventas" className="mt-4">
        <div class="flex flex-wrap items-end gap-3">
          <app-input-field
            type="number"
            placeholder="% comisión"
            [value]="commissionPercent()"
            (valueChange)="setCommissionPercent($event)"
          />
          <app-button variant="primary" (btnClick)="saveCommission()">Guardar comisión</app-button>
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
                <tr class="border-t border-gray-100">
                  <td class="py-2">{{ row.user.nombre }}</td>
                  <td>{{ row.checkInAt | date: 'short' }}</td>
                  <td>{{ row.checkOutAt ? (row.checkOutAt | date: 'short') : '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </app-page-state>
    </app-component-card>

    <app-component-card title="Productividad" className="mt-4">
      <div class="mb-3 flex flex-wrap gap-3">
        <app-input-field type="date" [value]="prodFrom()" (valueChange)="prodFrom.set('' + $event)" />
        <app-input-field type="date" [value]="prodTo()" (valueChange)="prodTo.set('' + $event)" />
        <app-button variant="primary" (btnClick)="productivityQuery.refetch()">Consultar</app-button>
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
                <tr class="border-t border-gray-100">
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
          <app-form-select
            placeholder="Tipo"
            [options]="leaveTypeOptions"
            [value]="leaveTipo()"
            (valueChange)="onLeaveTipoChange($event)"
          />
          <app-input-field type="date" placeholder="Desde" [value]="leaveFrom()" (valueChange)="leaveFrom.set('' + $event)" />
          <app-input-field type="date" placeholder="Hasta" [value]="leaveTo()" (valueChange)="leaveTo.set('' + $event)" />
          <app-button variant="primary" (btnClick)="createLeave()">Solicitar</app-button>
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
                <tr class="border-t border-gray-100">
                  <td class="py-2">{{ leave.user.nombre }}</td>
                  <td>{{ leave.tipo }}</td>
                  <td>{{ leave.fromDate | date: 'shortDate' }} – {{ leave.toDate | date: 'shortDate' }}</td>
                  <td>{{ leave.estado }}</td>
                  <td class="space-x-2">
                    @if (leave.estado === 'SOLICITADO') {
                      <button type="button" class="text-brand-600" (click)="updateLeave(leave.id, 'APROBADO')">Aprobar</button>
                      <button type="button" class="text-error-500" (click)="updateLeave(leave.id, 'RECHAZADO')">Rechazar</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </app-page-state>
    </app-component-card>
  `,
})
export class GestionPersonalComponent {
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
      endTime: '18:00',
    })),
  );
  protected readonly prodFrom = signal(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
  );
  protected readonly prodTo = signal(new Date().toISOString().slice(0, 10));
  protected readonly leaveTipo = signal<StaffLeaveTypeDto>('VACACIONES');
  protected readonly leaveFrom = signal('');
  protected readonly leaveTo = signal('');

  protected readonly usersQuery = injectQuery(() => ({
    queryKey: ['staff', 'users'] as const,
    queryFn: () => firstValueFrom(this.api.listUsers({ pageSize: 200 })),
  }));

  protected readonly userOptions = computed(() =>
    (this.usersQuery.data()?.items ?? []).map((u: UserListItemDto) => ({
      value: u.id,
      label: u.nombre,
    })),
  );

  protected readonly attendanceQuery = injectQuery(() => ({
    queryKey: ['staff', 'attendance', this.selectedUserId()] as const,
    queryFn: () =>
      firstValueFrom(
        this.api.listStaffAttendance({
          page: 1,
          pageSize: 20,
          userId: this.selectedUserId() || undefined,
        }),
      ),
  }));

  protected readonly productivityQuery = injectQuery(() => ({
    queryKey: ['staff', 'productivity', this.prodFrom(), this.prodTo()] as const,
    queryFn: () => firstValueFrom(this.api.getStaffProductivityReport(this.prodFrom(), this.prodTo())),
  }));

  protected readonly leavesQuery = injectQuery(() => ({
    queryKey: ['staff', 'leaves'] as const,
    queryFn: () => firstValueFrom(this.api.listStaffLeaves()),
  }));

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
            endTime: found?.endTime ?? '18:00',
          };
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
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar check-in')),
  }));

  private readonly checkOutMutation = injectMutation(() => ({
    mutationFn: (userId: string) => firstValueFrom(this.api.staffCheckOut(userId)),
    onSuccess: () => {
      this.notify.success('Check-out registrado');
      void this.queryClient.invalidateQueries({ queryKey: ['staff', 'attendance'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar check-out')),
  }));

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

  protected saveSchedule() {
    const userId = this.selectedUserId();
    if (!userId) return;
    firstValueFrom(this.api.upsertStaffWorkSchedule(userId, this.scheduleRows()))
      .then(() => {
        this.notify.success('Horario guardado');
      })
      .catch((err) => this.notify.error(httpErrorMessage(err, 'No se pudo guardar horario')));
  }

  protected saveCommission() {
    const userId = this.selectedUserId();
    if (!userId) return;
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
    firstValueFrom(
      this.api.createStaffLeave(userId, {
        tipo: this.leaveTipo(),
        fromDate: this.leaveFrom(),
        toDate: this.leaveTo(),
      }),
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
