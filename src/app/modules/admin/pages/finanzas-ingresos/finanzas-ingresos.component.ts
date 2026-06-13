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
  selector: 'app-finanzas-ingresos',
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
      <h1 data-toolbar-title class="text-title-sm font-semibold">Presupuesto vs compras</h1>
    </app-page-toolbar>
    <div class="mt-4 flex gap-3">
      <app-input-field type="number" [value]="anio()" (valueChange)="anio.set(parseNum($event))" placeholder="Año" />
      <app-button variant="primary" (btnClick)="budgetQuery.refetch()">Consultar</app-button>
    </div>
    <app-page-state [loading]="budgetQuery.isPending()" [error]="budgetError()" (retry)="budgetQuery.refetch()">
      @if (budgetQuery.data(); as data) {
        <app-component-card title="Comparativo {{ data.anio }}" className="mt-4">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="border-b text-gray-500">
                <th class="py-2">Mes</th>
                <th class="py-2">Presupuesto</th>
                <th class="py-2">Real</th>
                <th class="py-2">Variación</th>
              </tr>
            </thead>
            <tbody>
              @for (row of data.months; track row.mes) {
                <tr class="border-b border-gray-100">
                  <td class="py-2">{{ row.mes }}</td>
                  <td class="py-2">{{ row.presupuesto | currency: 'PEN' }}</td>
                  <td class="py-2">{{ row.actual | currency: 'PEN' }}</td>
                  <td class="py-2">{{ row.variacion | currency: 'PEN' }} ({{ row.variacionPorcentaje }}%)</td>
                </tr>
              }
            </tbody>
          </table>
        </app-component-card>
      }
    </app-page-state>
  `,
})
export class FinanzasIngresosComponent {
  private readonly api = inject(DirectoryApiService);

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Finanzas' }, { label: 'Presupuesto compras' }];
  protected readonly anio = signal(new Date().getFullYear());

  protected parseNum(v: unknown) {
    return Number(v) || new Date().getFullYear();
  }

  protected readonly budgetQuery = injectQuery(() => ({
    queryKey: ['purchase-budget', this.anio()] as const,
    queryFn: () => firstValueFrom(this.api.getPurchaseBudgetVsActual(this.anio())),
  }));

  protected budgetError() {
    const err = this.budgetQuery.error();
    return err ? httpErrorMessage(err, 'No se pudo cargar presupuesto') : null;
  }
}
