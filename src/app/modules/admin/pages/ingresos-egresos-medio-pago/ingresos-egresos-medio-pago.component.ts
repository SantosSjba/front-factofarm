import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { DirectoryApiService } from '../../services/directory-api.service';

@Component({
  selector: 'app-ingresos-egresos-medio-pago',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    InputFieldComponent,
    ButtonComponent,
    PageStateComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="breadcrumb" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-title-sm font-semibold">Ingresos y egresos por medio de pago</h1>
    </app-page-toolbar>
    <div class="mt-4 flex flex-wrap gap-3">
      <app-input-field type="date" [value]="from()" (valueChange)="from.set('' + $event)" />
      <app-input-field type="date" [value]="to()" (valueChange)="to.set('' + $event)" />
      <app-button variant="primary" (btnClick)="reportQuery.refetch()">Consultar</app-button>
    </div>
    <app-page-state [loading]="reportQuery.isPending()" [error]="reportError()" (retry)="reportQuery.refetch()">
      @if (reportQuery.data(); as r) {
        <div class="mt-4 grid gap-4 md:grid-cols-3">
          <app-component-card title="Total ingresos">
            <p class="text-2xl font-semibold text-emerald-600">{{ r.totalIngresos | currency: 'PEN' }}</p>
          </app-component-card>
          <app-component-card title="Total egresos">
            <p class="text-2xl font-semibold text-red-600">{{ r.totalEgresos | currency: 'PEN' }}</p>
          </app-component-card>
          <app-component-card title="Neto">
            <p class="text-2xl font-semibold">{{ r.neto | currency: 'PEN' }}</p>
          </app-component-card>
        </div>
        <app-component-card title="Detalle por método" className="mt-4">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="border-b text-gray-500">
                <th class="py-2 text-left">Método</th>
                <th class="py-2 text-right">Ingresos</th>
                <th class="py-2 text-right">Egresos</th>
                <th class="py-2 text-right">Neto</th>
                <th class="py-2 text-right">Transacciones</th>
              </tr>
            </thead>
            <tbody>
              @for (row of r.methods; track row.metodo) {
                <tr class="border-b border-gray-100">
                  <td class="py-2">{{ row.metodo }}</td>
                  <td class="py-2 text-right">{{ row.ingresos | currency: 'PEN' }}</td>
                  <td class="py-2 text-right">{{ row.egresos | currency: 'PEN' }}</td>
                  <td class="py-2 text-right">{{ row.neto | currency: 'PEN' }}</td>
                  <td class="py-2 text-right">{{ row.transacciones }}</td>
                </tr>
              }
            </tbody>
          </table>
        </app-component-card>
      }
    </app-page-state>
  `,
})
export class IngresosEgresosMedioPagoComponent {
  private readonly api = inject(DirectoryApiService);

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Finanzas' }, { label: 'Por medio de pago' }];
  protected readonly from = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  protected readonly to = signal(new Date().toISOString().slice(0, 10));

  protected readonly reportQuery = injectQuery(() => ({
    queryKey: ['payments-by-method', this.from(), this.to()] as const,
    queryFn: () => firstValueFrom(this.api.getPaymentsByMethod(this.from(), this.to())),
  }));

  protected reportError() {
    const err = this.reportQuery.error();
    return err ? httpErrorMessage(err, 'No se pudo cargar el reporte') : null;
  }
}
