import { CommonModule, CurrencyPipe } from '@angular/common';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
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
import { LocaleService } from '../../../../core/services/locale.service';

@Component({
  selector: 'app-libro-mayor',
  standalone: true,
  imports: [
    CommonModule,
    AppDatePipe,
    CurrencyPipe,
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
      <h1 data-toolbar-title class="text-title-sm font-semibold">Libro mayor</h1>
    </app-page-toolbar>
    <div class="mt-4 flex flex-wrap gap-3">
      <app-input-field type="date" [value]="from()" (valueChange)="from.set('' + $event)" />
      <app-input-field type="date" [value]="to()" (valueChange)="to.set('' + $event)" />
      <app-button variant="primary" (btnClick)="page.set(1); ledgerQuery.refetch()">Consultar</app-button>
    </div>
    <app-page-state [loading]="ledgerQuery.isPending()" [error]="ledgerError()" (retry)="ledgerQuery.refetch()">
      @if (ledgerQuery.data(); as r) {
        <div class="mt-4 grid gap-4 md:grid-cols-2">
          <app-component-card title="Total debe"><p class="text-xl font-semibold">{{ r.totalDebe | currency: 'PEN' }}</p></app-component-card>
          <app-component-card title="Total haber"><p class="text-xl font-semibold">{{ r.totalHaber | currency: 'PEN' }}</p></app-component-card>
        </div>
        <app-component-card title="Movimientos" className="mt-4">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="border-b text-gray-500">
                <th class="py-2 text-left">Fecha</th>
                <th class="py-2 text-left">Cuenta</th>
                <th class="py-2 text-left">Descripción</th>
                <th class="py-2 text-left">Origen</th>
                <th class="py-2 text-right">Debe</th>
                <th class="py-2 text-right">Haber</th>
              </tr>
            </thead>
            <tbody>
              @for (row of r.items; track row.id) {
                <tr class="border-b border-gray-100">
                  <td class="py-2">{{ row.fecha | appDate: 'shortDate' }}</td>
                  <td class="py-2">{{ row.cuenta }}</td>
                  <td class="py-2">{{ row.descripcion }}</td>
                  <td class="py-2">{{ row.origen }}</td>
                  <td class="py-2 text-right">{{ row.debe | currency: 'PEN' }}</td>
                  <td class="py-2 text-right">{{ row.haber | currency: 'PEN' }}</td>
                </tr>
              }
            </tbody>
          </table>
          <app-pagination class="mt-4" [totalItems]="r.total" [currentPage]="page()" [pageSize]="30" (currentPageChange)="page.set($event)" />
        </app-component-card>
      }
    </app-page-state>
  ` })
export class LibroMayorComponent {
  private readonly locale = inject(LocaleService);
  private readonly api = inject(DirectoryApiService);

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Contabilidad' }, { label: 'Libro mayor' }];
  protected readonly page = signal(1);
  protected readonly from = signal(this.locale.monthStartYmd());
  protected readonly to = signal(this.locale.todayYmd());

  protected readonly ledgerQuery = injectQuery(() => ({
    queryKey: ['general-ledger', this.from(), this.to(), this.page()] as const,
    queryFn: () => firstValueFrom(this.api.getGeneralLedger(this.from(), this.to(), this.page(), 30)) }));

  protected ledgerError() {
    const err = this.ledgerQuery.error();
    return err ? httpErrorMessage(err, 'No se pudo cargar el libro mayor') : null;
  }
}
