import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { DirectoryApiService } from '../../services/directory-api.service';

@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    DatePipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    PaginationComponent,
    InputFieldComponent,
    ButtonComponent,
    PageStateComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="breadcrumb" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-title-sm font-semibold">Pagos y cobros</h1>
    </app-page-toolbar>
    <div class="mt-4 flex flex-wrap gap-3">
      <app-input-field type="date" [value]="from()" (valueChange)="from.set('' + $event)" />
      <app-input-field type="date" [value]="to()" (valueChange)="to.set('' + $event)" />
      <app-button variant="primary" (btnClick)="page.set(1); listQuery.refetch()">Filtrar</app-button>
    </div>
    <app-page-state [loading]="listQuery.isPending()" [error]="listError()" (retry)="listQuery.refetch()">
      <app-component-card className="mt-4">
        @if (listQuery.data(); as list) {
          <table class="min-w-full text-sm">
            <thead>
              <tr class="border-b text-gray-500">
                <th class="py-2 text-left">Fecha</th>
                <th class="py-2 text-left">Tipo</th>
                <th class="py-2 text-left">Descripción</th>
                <th class="py-2 text-left">Método</th>
                <th class="py-2 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              @for (row of list.items; track row.id) {
                <tr class="border-b border-gray-100">
                  <td class="py-2">{{ row.fecha | date: 'short' }}</td>
                  <td class="py-2">{{ row.tipo }}</td>
                  <td class="py-2">{{ row.descripcion }}</td>
                  <td class="py-2">{{ row.metodo }}</td>
                  <td class="py-2 text-right">{{ row.monto | currency: 'PEN' }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="py-6 text-center text-gray-500">Sin pagos en el periodo.</td>
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
export class PagosComponent {
  private readonly api = inject(DirectoryApiService);

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Finanzas' }, { label: 'Pagos' }];
  protected readonly page = signal(1);
  protected readonly from = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  protected readonly to = signal(new Date().toISOString().slice(0, 10));

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['recent-payments', this.page(), this.from(), this.to()] as const,
    queryFn: () =>
      firstValueFrom(
        this.api.listRecentPayments({ page: this.page(), pageSize: 20, from: this.from(), to: this.to() }),
      ),
  }));

  protected listError() {
    const err = this.listQuery.error();
    return err ? httpErrorMessage(err, 'No se pudo cargar pagos') : null;
  }
}
