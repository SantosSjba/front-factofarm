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
import { LocaleService } from '../../../../core/services/locale.service';

@Component({
  selector: 'app-contabilidad-resumen-venta',
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
      <h1 data-toolbar-title class="text-title-sm font-semibold">Resumen de venta</h1>
    </app-page-toolbar>
    <div class="mt-4 flex flex-wrap gap-3">
      <app-input-field type="date" [value]="from()" (valueChange)="from.set('' + $event)" />
      <app-input-field type="date" [value]="to()" (valueChange)="to.set('' + $event)" />
      <app-button variant="primary" (btnClick)="marginQuery.refetch()">Consultar</app-button>
    </div>
    <app-page-state [loading]="marginQuery.isPending()" [error]="marginError()" (retry)="marginQuery.refetch()">
      @if (marginQuery.data(); as m) {
        <div class="mt-4 grid gap-4 md:grid-cols-4">
          <app-component-card title="Venta total"><p class="text-xl font-semibold">{{ m.ventaTotal | currency: 'PEN' }}</p></app-component-card>
          <app-component-card title="Costo"><p class="text-xl font-semibold">{{ m.costoTotal | currency: 'PEN' }}</p></app-component-card>
          <app-component-card title="Margen"><p class="text-xl font-semibold text-emerald-600">{{ m.margen | currency: 'PEN' }}</p></app-component-card>
          <app-component-card title="Margen %"><p class="text-xl font-semibold">{{ m.margenPorcentaje }}%</p></app-component-card>
        </div>
        <app-component-card title="Top productos" className="mt-4">
          <table class="min-w-full text-sm">
            <thead><tr class="border-b text-gray-500"><th class="py-2 text-left">Producto</th><th class="py-2 text-right">Venta</th><th class="py-2 text-right">Margen</th></tr></thead>
            <tbody>
              @for (p of m.topProducts; track p.productId) {
                <tr class="border-b border-gray-100">
                  <td class="py-2">{{ p.nombre }}</td>
                  <td class="py-2 text-right">{{ p.venta | currency: 'PEN' }}</td>
                  <td class="py-2 text-right">{{ p.margen | currency: 'PEN' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </app-component-card>
      }
    </app-page-state>
  `,
})
export class ContabilidadResumenVentaComponent {
  private readonly locale = inject(LocaleService);
  private readonly api = inject(DirectoryApiService);

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Contabilidad' }, { label: 'Resumen venta' }];
  protected readonly from = signal(this.locale.monthStartYmd());
  protected readonly to = signal(this.locale.todayYmd());

  protected readonly marginQuery = injectQuery(() => ({
    queryKey: ['margin-report', 'contabilidad', this.from(), this.to()] as const,
    queryFn: () => firstValueFrom(this.api.getMarginReport(this.from(), this.to())),
  }));

  protected marginError() {
    const err = this.marginQuery.error();
    return err ? httpErrorMessage(err, 'No se pudo cargar el resumen') : null;
  }
}
