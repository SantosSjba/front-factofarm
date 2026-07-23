import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { DirectoryApiService } from '../../services/directory-api.service';

@Component({
  selector: 'app-gr-remitente',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    PaginationComponent,
    ButtonComponent,
    PageStateComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="breadcrumb" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-title-sm font-semibold">Guía de remisión remitente</h1>
    </app-page-toolbar>
    <p class="mt-2 text-sm text-gray-500">
      Emite guías electrónicas desde traslados en tránsito entre almacenes.
    </p>
    <app-page-state [loading]="listQuery.isPending()" [error]="listError()" (retry)="listQuery.refetch()">
      <app-component-card className="mt-4">
        @if (listQuery.data(); as list) {
          <table class="min-w-full text-sm">
            <thead>
              <tr class="border-b text-gray-500">
                <th class="py-2 text-left">Origen → Destino</th>
                <th class="py-2 text-left">Estado</th>
                <th class="py-2 text-left">Guía</th>
                <th class="py-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              @for (row of list.items; track row.id) {
                <tr class="border-b border-gray-100">
                  <td class="py-2">
                    {{ row.fromWarehouse.nombre }} → {{ row.toWarehouse.nombre }}
                    <div class="text-xs text-gray-500">{{ row.createdAt | date: 'short' }}</div>
                  </td>
                  <td class="py-2">{{ row.estado }}</td>
                  <td class="py-2">{{ row.guiaNumero || '—' }}</td>
                  <td class="py-2 text-right">
                    @if (row.estado === 'EN_TRANSITO') {
                      <app-button
                        size="sm"
                        [iconOnly]="true"
                        startIconName="mdi:file-certificate-outline"
                        tooltip="Emitir guía"
                        (btnClick)="emitGuiaMutation.mutate(row.id)"
                        [disabled]="emitGuiaMutation.isPending()"
                      />
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="4" class="py-6 text-center text-gray-500">Sin traslados disponibles.</td></tr>
              }
            </tbody>
          </table>
          <app-pagination class="mt-4" [totalItems]="list.total" [currentPage]="page()" [pageSize]="15" (currentPageChange)="page.set($event)" />
        }
      </app-component-card>
    </app-page-state>
  `,
})
export class GrRemitenteComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Guías' }, { label: 'GR remitente' }];
  protected readonly page = signal(1);

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['inventory', 'transfers', 'gr-remitente', this.page()] as const,
    queryFn: () => firstValueFrom(this.api.listInventoryTransfers({ page: this.page(), pageSize: 15 })),
  }));

  protected readonly emitGuiaMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.emitGuiaFromTransfer(id)),
    onSuccess: () => {
      this.notify.success('Guía de remisión programada');
      void this.queryClient.invalidateQueries({ queryKey: ['inventory', 'transfers'] });
      void this.queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo emitir la guía')),
  }));

  protected listError() {
    const err = this.listQuery.error();
    return err ? httpErrorMessage(err, 'No se pudo cargar traslados') : null;
  }
}
