import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
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
  selector: 'app-hospital-dispensacion',
  standalone: true,
  imports: [
    CommonModule,
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
      <h1 data-toolbar-title class="text-title-sm font-semibold">Dispensación hospitalaria</h1>
    </app-page-toolbar>
    <app-page-state [loading]="listQuery.isPending()" [error]="listError()" (retry)="listQuery.refetch()">
      <app-component-card className="mt-4">
        @if (listQuery.data(); as list) {
          <table class="min-w-full text-sm">
            <thead>
              <tr class="border-b text-gray-500">
                <th class="py-2">Área</th>
                <th class="py-2">Estado</th>
                <th class="py-2">Solicitante</th>
                <th class="py-2">Items</th>
                <th class="py-2"></th>
              </tr>
            </thead>
            <tbody>
              @for (row of list.items; track row.id) {
                <tr class="border-b border-gray-100">
                  <td class="py-2">{{ row.hospitalArea.nombre }} ({{ row.hospitalArea.tipo }})</td>
                  <td class="py-2">{{ row.estado }}</td>
                  <td class="py-2">{{ row.solicitadoPor.nombre }}</td>
                  <td class="py-2">{{ row.items.length }}</td>
                  <td class="py-2">
                    @if (row.estado === 'SOLICITADO') {
                      <app-button variant="outline" (btnClick)="dispense(row.id)">Dispensar</app-button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <app-pagination class="mt-4" [totalItems]="list.total" [currentPage]="page()" [pageSize]="20" (currentPageChange)="page.set($event)" />
        }
      </app-component-card>
    </app-page-state>
  `,
})
export class HospitalDispensacionComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Fármacos' }, { label: 'Dispensación hospitalaria' }];
  protected readonly page = signal(1);

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['hospital-consumptions', this.page()] as const,
    queryFn: () => firstValueFrom(this.api.listHospitalConsumptions({ page: this.page(), pageSize: 20 })),
  }));

  protected listError() {
    const err = this.listQuery.error();
    return err ? httpErrorMessage(err, 'No se pudo cargar solicitudes') : null;
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
