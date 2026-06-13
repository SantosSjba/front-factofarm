import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { DirectoryApiService } from '../../services/directory-api.service';

@Component({
  selector: 'app-transacciones',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    DatePipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    PaginationComponent,
    PageStateComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="breadcrumb" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-title-sm font-semibold">Transacciones bancarias</h1>
    </app-page-toolbar>
    <app-page-state [loading]="listQuery.isPending()" [error]="listError()" (retry)="listQuery.refetch()">
      <app-component-card className="mt-4">
        @if (listQuery.data(); as list) {
          <table class="min-w-full text-sm">
            <thead>
              <tr class="border-b text-gray-500">
                <th class="py-2 text-left">Cuenta</th>
                <th class="py-2 text-left">Fecha</th>
                <th class="py-2 text-left">Tipo</th>
                <th class="py-2 text-left">Referencia</th>
                <th class="py-2 text-right">Monto</th>
                <th class="py-2 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (row of list.items; track row.id) {
                <tr class="border-b border-gray-100">
                  <td class="py-2">{{ row.bankAccount.nombre }}</td>
                  <td class="py-2">{{ row.movimientoAt | date: 'short' }}</td>
                  <td class="py-2">{{ row.tipo }}</td>
                  <td class="py-2">{{ row.referencia ?? row.descripcion ?? '—' }}</td>
                  <td class="py-2 text-right">{{ row.monto | currency: 'PEN' }}</td>
                  <td class="py-2">{{ row.conciliado ? 'Conciliado' : 'Pendiente' }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="py-6 text-center text-gray-500">Sin movimientos registrados.</td>
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
export class TransaccionesComponent {
  private readonly api = inject(DirectoryApiService);

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Finanzas' }, { label: 'Transacciones' }];
  protected readonly page = signal(1);

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['bank-movements', 'transacciones', this.page()] as const,
    queryFn: () => firstValueFrom(this.api.listBankMovements({ page: this.page(), pageSize: 20 })),
  }));

  protected listError() {
    const err = this.listQuery.error();
    return err ? httpErrorMessage(err, 'No se pudo cargar transacciones') : null;
  }
}
