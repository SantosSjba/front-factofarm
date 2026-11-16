import { CommonModule } from '@angular/common';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { Component,  inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
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
import { transferStatusLabel, transferStatusTone } from '../../utils/transfer-status';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { StatusBadgeComponent } from '../../../../shared/components/ui/badge/status-badge.component';

@Component({
  selector: 'app-gr-remitente',
  standalone: true,
  imports: [
    CommonModule,
    AppDatePipe,
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
      <h1 data-toolbar-title class="text-lg font-semibold text-gray-800 dark:text-white/90">Guía de remisión remitente</h1>
    </app-page-toolbar>

    <app-help-panel title="¿Para qué sirve esta pantalla?" storageKey="gr-remitente">
      <ol class="list-decimal space-y-1 ps-5 text-sm text-gray-500 dark:text-gray-400">
        <li>Emite la guía de remisión electrónica de los traslados entre tus almacenes.</li>
        <li>Solo los traslados <strong>en tránsito</strong> pueden emitir guía: despáchalos primero en Inventario → Traslados.</li>
      </ol>
    </app-help-panel>

    @let list = listQuery.data();
    <!-- Tabla directa (sin tarjeta): el título ya está en la barra de la página. -->
    <app-page-state
      [loading]="listQuery.isPending()"
      [error]="listError()"
      [empty]="listQuery.isSuccess() && !list?.items?.length"
      emptyTitle="No hay traslados"
      emptyHint="Crea y despacha un traslado en Inventario → Traslados."
      skeleton="table"
      (retry)="listQuery.refetch()"
    >
      <div class="ff-table-frame overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="max-w-full overflow-x-auto">
          <table class="min-w-full text-start text-gray-700 dark:text-gray-300">
            <caption class="sr-only">Traslados y sus guías de remisión</caption>
            <thead class="border-b border-gray-100 dark:border-white/[0.05]">
              <tr>
                <th data-card-role="title" class="px-5 py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400 text-start">Origen → Destino</th>
                <th class="px-5 py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400 text-start">Estado</th>
                <th class="px-5 py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400 text-end">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-white/[0.05]">
              @for (row of list?.items ?? []; track row.id) {
                <tr>
                  <td class="px-5 py-3 text-theme-sm">
                    <span class="block font-medium text-gray-800 dark:text-white/90">{{ row.fromWarehouse.nombre }} → {{ row.toWarehouse.nombre }}</span>
                    <span class="text-theme-xs text-gray-500 dark:text-gray-400">{{ row.createdAt | appDate: 'dd/MM/yyyy HH:mm' }}</span>
                  </td>
                  <td class="px-5 py-3 text-theme-sm">
                    <app-status-badge [status]="row.estado" [tone]="statusTone(row.estado)" [label]="statusLabel(row.estado)" />
                    <span class="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">{{ row.guiaNumero ? 'Guía ' + row.guiaNumero : 'Sin guía' }}</span>
                  </td>
                  <td class="px-5 py-3 text-end">
                    @if (row.estado === 'EN_TRANSITO') {
                      <app-button size="sm" startIconName="mdi:file-certificate-outline" [disabled]="emitGuiaMutation.isPending()" [loading]="emitGuiaMutation.isPending() && emitGuiaMutation.variables() === row.id" (btnClick)="emitGuiaMutation.mutate(row.id)">Emitir guía</app-button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </app-page-state>

    <app-pagination [totalItems]="list?.total ?? 0" [currentPage]="page()" [pageSize]="15" (currentPageChange)="page.set($event)" />
  ` })
export class GrRemitenteComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Guías de remisión' }, { label: 'G.R. Remitente' }];
  protected readonly page = signal(1);

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['inventory', 'transfers', 'gr-remitente', this.page()] as const,
    queryFn: () => firstValueFrom(this.api.listInventoryTransfers({ page: this.page(), pageSize: 15 })) }));

  protected readonly emitGuiaMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.emitGuiaFromTransfer(id)),
    onSuccess: () => {
      this.notify.success('Guía de remisión programada');
      void this.queryClient.invalidateQueries({ queryKey: ['inventory', 'transfers'] });
      void this.queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo emitir la guía')) }));

  protected readonly statusLabel = transferStatusLabel;
  protected readonly statusTone = transferStatusTone;

  protected listError() {
    const err = this.listQuery.error();
    return err ? httpErrorMessage(err, 'No se pudo cargar traslados') : null;
  }
}
