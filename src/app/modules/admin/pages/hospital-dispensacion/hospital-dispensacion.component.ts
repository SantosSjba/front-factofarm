import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import {  injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type { StatusTone } from '../../../../shared/components/ui/badge/status-badge.component';
import { ConfirmDialogComponent } from '../../../../shared/components/common/confirm-dialog/confirm-dialog.component';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import type { HospitalConsumptionListItemDto } from '../../models/directory.models';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { StatusBadgeComponent } from '../../../../shared/components/ui/badge/status-badge.component';

const AREA_LABELS: Record<string, string> = {
  PABELLON: 'Pabellón',
  SERVICIO: 'Servicio',
  CARRO_PARO: 'Carro de paro',
  BOTIQUIN: 'Botiquín',
};

const STATUS: Record<string, { label: string; tone: StatusTone }> = {
  SOLICITADO: { label: 'Por dispensar', tone: 'warning' },
  DISPENSADO: { label: 'Dispensado', tone: 'success' },
  CANCELADO: { label: 'Cancelado', tone: 'neutral' },
};

@Component({
  selector: 'app-hospital-dispensacion',
  standalone: true,
  imports: [
    CommonModule,
    AppDatePipe,
    ConfirmDialogComponent,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    PaginationComponent,
    ButtonComponent,
    PageStateComponent,
    HelpPanelComponent,
    StatusBadgeComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="breadcrumb" />

    <app-page-toolbar [excel]="false">
      <h1 data-toolbar-title class="text-lg font-semibold text-gray-800 dark:text-white/90">Dispensación hospitalaria</h1>
    </app-page-toolbar>

    <app-help-panel title="¿Para qué sirve esta pantalla?" storageKey="hospital-dispensacion">
      <ol class="list-decimal space-y-1 ps-5 text-sm text-gray-500 dark:text-gray-400">
        <li>Aquí llegan los pedidos de medicamentos de las áreas del hospital: pabellones, servicios, carros de paro y botiquines.</li>
        <li>Al pulsar «Dispensar» se entregan los productos y se descuentan del stock.</li>
      </ol>
    </app-help-panel>

    <!-- Tabla directa (sin tarjeta): el título ya está en la barra de la página. -->
    <app-page-state
      [loading]="listQuery.isPending()"
      [error]="listError()"
      [empty]="listQuery.isSuccess() && !listQuery.data().items.length"
      emptyTitle="No hay solicitudes de las áreas"
      emptyHint="Cuando un área pida medicamentos, la solicitud aparecerá aquí."
      skeleton="table"
      (retry)="listQuery.refetch()"
    >
      <div class="ff-table-frame overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="max-w-full overflow-x-auto">
          <table class="min-w-full text-start text-gray-700 dark:text-gray-300">
            <caption class="sr-only">Solicitudes de dispensación de las áreas del hospital</caption>
            <thead class="border-b border-gray-100 dark:border-white/[0.05]">
              <tr>
                <th class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Solicitud</th>
                <th data-card-role="title" class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Área</th>
                <th data-card-wide class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Productos</th>
                <th class="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Estado</th>
                <th class="px-5 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-white/[0.05]">
              @for (row of listQuery.data()?.items ?? []; track row.id) {
                <tr [attr.data-row-tone]="row.estado === 'CANCELADO' ? 'muted' : null">
                  <td class="px-5 py-3 text-theme-sm whitespace-nowrap">
                    {{ row.createdAt | appDate: 'dd/MM/yyyy HH:mm' }}
                    <span class="block text-theme-xs text-gray-500 dark:text-gray-400">{{ row.solicitadoPor.nombre }}</span>
                  </td>
                  <td class="px-5 py-3 text-theme-sm">
                    <span class="block font-medium text-gray-800 dark:text-white/90">{{ row.hospitalArea.nombre }}</span>
                    <span class="text-theme-xs text-gray-500 dark:text-gray-400">{{ areaLabel(row.hospitalArea.tipo) }}</span>
                  </td>
                  <td data-card-wide class="px-5 py-3 text-theme-sm">
                    {{ itemsLabel(row) }}
                    @if (row.motivo) {
                      <span class="block text-theme-xs text-gray-500 dark:text-gray-400">{{ row.motivo }}</span>
                    }
                  </td>
                  <td class="px-5 py-3 text-theme-sm">
                    <app-status-badge [status]="row.estado" [tone]="statusTone(row.estado)" [label]="statusLabel(row.estado)" />
                    @if (row.dispensadoAt) {
                      <span class="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">{{ row.dispensadoAt | appDate: 'dd/MM/yyyy HH:mm' }}</span>
                    }
                  </td>
                  <td class="px-5 py-3 text-end">
                    @if (row.estado === 'SOLICITADO') {
                      <app-button size="sm" startIconName="mdi:pill" (btnClick)="toDispense.set(row)">Dispensar</app-button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </app-page-state>

    <app-pagination [totalItems]="listQuery.data()?.total ?? 0" [currentPage]="page()" [pageSize]="20" (currentPageChange)="page.set($event)" />

    <app-confirm-dialog
      [open]="!!toDispense()"
      title="Dispensar solicitud"
      [message]="toDispense() ? '¿Entregar a ' + toDispense()!.hospitalArea.nombre + ': ' + itemsLabel(toDispense()!) + '? Se descuenta del stock.' : ''"
      confirmLabel="Dispensar"
      (cancelled)="toDispense.set(null)"
      (confirmed)="confirmDispense()"
    />
  `,
})
export class HospitalDispensacionComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Fármacos' }, { label: 'Dispensación hospitalaria' }];
  protected readonly page = signal(1);
  protected readonly toDispense = signal<HospitalConsumptionListItemDto | null>(null);

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['hospital-consumptions', this.page()] as const,
    queryFn: () => firstValueFrom(this.api.listHospitalConsumptions({ page: this.page(), pageSize: 20 })),
  }));

  protected listError() {
    const err = this.listQuery.error();
    return err ? httpErrorMessage(err, 'No se pudo cargar solicitudes') : null;
  }

  protected areaLabel(tipo: string): string {
    return AREA_LABELS[tipo] ?? tipo;
  }

  protected statusLabel(estado: string): string {
    return STATUS[estado]?.label ?? estado;
  }

  protected statusTone(estado: string): StatusTone {
    return STATUS[estado]?.tone ?? 'neutral';
  }

  protected itemsLabel(row: HospitalConsumptionListItemDto): string {
    return row.items.map((i) => `${+i.cantidad} × ${i.product.nombre}`).join(', ') || 'Sin productos';
  }

  protected confirmDispense() {
    const row = this.toDispense();
    this.toDispense.set(null);
    if (row) this.dispense(row.id);
  }

  protected dispense(id: string) {
    firstValueFrom(this.api.dispenseHospitalConsumption(id))
      .then(() => {
        this.notify.success('Consumo dispensado');
        void this.queryClient.invalidateQueries({ queryKey: ['hospital-consumptions'] });
      })
      .catch((err) => this.notify.error(httpErrorMessage(err, 'No se pudo dispensar')));
  }
}
