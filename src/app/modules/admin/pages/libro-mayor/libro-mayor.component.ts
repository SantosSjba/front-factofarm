import { CommonModule, CurrencyPipe } from '@angular/common';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { Component, inject, signal, computed } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import { LocaleService } from '../../../../core/services/locale.service';
import type { SummaryChip } from '../../../../shared/components/ui/summary-chips/summary-chips.component';
import { PeriodFilterComponent, type Period } from '../../components/period-filter/period-filter.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';

@Component({
  selector: 'app-libro-mayor',
  standalone: true,
  imports: [
    PeriodFilterComponent,
    CommonModule,
    AppDatePipe,
    CurrencyPipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    PaginationComponent,
    PageStateComponent,
    HelpPanelComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="breadcrumb" />

    <app-page-toolbar [excel]="false">
      <h1 data-toolbar-title class="text-lg font-semibold text-gray-800 dark:text-white/90">Libro mayor</h1>
    </app-page-toolbar>

    <app-help-panel title="¿Para qué sirve esta pantalla?" storageKey="libro-mayor">
      <ol class="list-decimal space-y-1 ps-5 text-sm text-gray-500 dark:text-gray-400">
        <li>Muestra los asientos contables del periodo, cuenta por cuenta, con su debe y su haber.</li>
        <li>Los asientos se generan solos a partir de las ventas, compras y pagos. Sirve para revisarlos con tu contador.</li>
      </ol>
    </app-help-panel>

    <app-period-filter compact [value]="period()" [summaryChips]="summaryChips()" (periodChange)="from.set($event.from); to.set($event.to); page.set(1)" />

    @let r = ledgerQuery.data();
    <app-page-state
      [loading]="ledgerQuery.isPending()"
      [error]="ledgerError()"
      [empty]="ledgerQuery.isSuccess() && !r?.items?.length"
      emptyTitle="Sin asientos en el periodo"
      emptyHint="Prueba con otro rango de fechas."
      skeleton="table"
      (retry)="ledgerQuery.refetch()"
    >
      <div class="ff-table-frame overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="max-w-full overflow-x-auto">
          <table class="min-w-full text-start text-gray-700 dark:text-gray-300">
            <caption class="sr-only">Asientos contables del periodo</caption>
            <thead class="border-b border-gray-100 dark:border-white/[0.05]">
              <tr>
                <th class="px-5 py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400 text-start">Fecha</th>
                <th data-card-role="title" class="px-5 py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400 text-start">Cuenta</th>
                <th data-card-wide class="px-5 py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400 text-start">Descripción</th>
                <th class="px-5 py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400 text-end">Debe</th>
                <th class="px-5 py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400 text-end">Haber</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-white/[0.05]">
              @for (row of r?.items ?? []; track row.id) {
                <tr>
                  <td class="px-5 py-3 text-theme-sm whitespace-nowrap">
                    {{ row.fecha | appDate: 'dd/MM/yyyy' }}
                    <span class="block text-theme-xs text-gray-500 dark:text-gray-400">{{ row.origen }}</span>
                  </td>
                  <td class="px-5 py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ row.cuenta }}</td>
                  <td data-card-wide class="px-5 py-3 text-theme-sm">{{ row.descripcion }}</td>
                  <td class="px-5 py-3 text-end text-theme-sm tabular-nums">{{ +row.debe ? (row.debe | currency: 'PEN' : 'symbol' : '1.2-2') : '—' }}</td>
                  <td class="px-5 py-3 text-end text-theme-sm tabular-nums">{{ +row.haber ? (row.haber | currency: 'PEN' : 'symbol' : '1.2-2') : '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </app-page-state>

    <app-pagination [totalItems]="r?.total ?? 0" [currentPage]="page()" [pageSize]="30" (currentPageChange)="page.set($event)" />
  ` })
export class LibroMayorComponent {
  protected readonly period = computed<Period>(() => ({ from: this.from(), to: this.to() }));
  private readonly pen = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
  protected readonly summaryChips = computed<SummaryChip[]>(() => {
    const r = this.ledgerQuery.data();
    if (!r) return [];
    return [
      { id: 'debe', label: 'Total debe', count: this.pen.format(Number(r.totalDebe) || 0), clickable: false },
      { id: 'haber', label: 'Total haber', count: this.pen.format(Number(r.totalHaber) || 0), clickable: false },
    ];
  });

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
