import { CommonModule, CurrencyPipe } from '@angular/common';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
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
  selector: 'app-conciliacion-bancaria',
  standalone: true,
  imports: [
    CommonModule,
    AppDatePipe,
    CurrencyPipe,
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
      <h1 data-toolbar-title class="text-title-sm font-semibold">Conciliación bancaria</h1>
      <app-button variant="primary" [disabled]="!selectedIds().length || reconcileMutation.isPending()" [loading]="reconcileMutation.isPending()" (btnClick)="reconcileMutation.mutate()">
        Conciliar seleccionados
      </app-button>
    </app-page-toolbar>
    <app-page-state [loading]="listQuery.isPending()" [error]="listError()" (retry)="listQuery.refetch()">
      <app-component-card className="mt-4">
        @if (listQuery.data(); as list) {
          <table class="min-w-full text-sm">
            <thead>
              <tr class="border-b text-gray-500">
                <th class="py-2"></th>
                <th class="py-2">Cuenta</th>
                <th class="py-2">Fecha</th>
                <th class="py-2">Tipo</th>
                <th class="py-2">Monto</th>
                <th class="py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (row of list.items; track row.id) {
                <tr class="border-b border-gray-100">
                  <td class="py-2">
                    @if (!row.conciliado) {
                      <input type="checkbox" [checked]="selectedIds().includes(row.id)" (change)="toggle(row.id)" />
                    }
                  </td>
                  <td class="py-2">{{ row.bankAccount.nombre }}</td>
                  <td class="py-2">{{ row.movimientoAt | appDate: 'short' }}</td>
                  <td class="py-2">{{ row.tipo }}</td>
                  <td class="py-2">{{ row.monto | currency: 'PEN' }}</td>
                  <td class="py-2">{{ row.conciliado ? 'Conciliado' : 'Pendiente' }}</td>
                </tr>
              }
            </tbody>
          </table>
          <app-pagination class="mt-4" [totalItems]="list.total" [currentPage]="page()" [pageSize]="20" (currentPageChange)="page.set($event)" />
        }
      </app-component-card>
    </app-page-state>
  ` })
export class ConciliacionBancariaComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Finanzas' }, { label: 'Conciliación' }];
  protected readonly page = signal(1);
  protected readonly selectedIds = signal<string[]>([]);

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['bank-movements', this.page()] as const,
    queryFn: () => firstValueFrom(this.api.listBankMovements({ page: this.page(), pageSize: 20 })) }));

  protected listError() {
    const err = this.listQuery.error();
    return err ? httpErrorMessage(err, 'No se pudo cargar movimientos') : null;
  }

  protected toggle(id: string) {
    const set = new Set(this.selectedIds());
    if (set.has(id)) set.delete(id);
    else set.add(id);
    this.selectedIds.set([...set]);
  }

  protected readonly reconcileMutation = injectMutation(() => ({
    mutationFn: () => firstValueFrom(this.api.reconcileBankMovements(this.selectedIds())),
    onSuccess: (r) => {
      this.notify.success(`${r.reconciled} movimientos conciliados`);
      this.selectedIds.set([]);
      void this.queryClient.invalidateQueries({ queryKey: ['bank-movements'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo conciliar')) }));
}
