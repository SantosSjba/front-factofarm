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
  selector: 'app-contabilidad-reporte-resumido',
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
      <h1 data-toolbar-title class="text-title-sm font-semibold">Reporte resumido</h1>
    </app-page-toolbar>
    <div class="mt-4 flex flex-wrap gap-3">
      <app-input-field type="date" [value]="from()" (valueChange)="from.set('' + $event)" />
      <app-input-field type="date" [value]="to()" (valueChange)="to.set('' + $event)" />
      <app-button variant="primary" (btnClick)="reportQuery.refetch()">Consultar</app-button>
    </div>
    <app-page-state [loading]="reportQuery.isPending()" [error]="reportError()" (retry)="reportQuery.refetch()">
      @if (reportQuery.data(); as r) {
        <div class="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <app-component-card title="Ingresos ventas">
            <p class="text-xl font-semibold">{{ r.ingresos.ventas | currency: 'PEN' }}</p>
            <p class="text-sm text-gray-500">{{ r.ingresos.ventasCount }} ventas</p>
          </app-component-card>
          <app-component-card title="Cobros clientes">
            <p class="text-xl font-semibold">{{ r.ingresos.cobrosClientes | currency: 'PEN' }}</p>
          </app-component-card>
          <app-component-card title="Egresos compras">
            <p class="text-xl font-semibold">{{ r.egresos.compras | currency: 'PEN' }}</p>
          </app-component-card>
          <app-component-card title="Flujo neto">
            <p class="text-xl font-semibold text-brand-600">{{ r.flujoNeto | currency: 'PEN' }}</p>
          </app-component-card>
        </div>
        <app-component-card title="Detalle egresos" className="mt-4">
          <p>Pagos proveedores: {{ r.egresos.pagosProveedores | currency: 'PEN' }}</p>
          <p class="mt-2">Movimientos caja: {{ r.caja.movimientosTotal | currency: 'PEN' }} ({{ r.caja.movimientosCount }})</p>
        </app-component-card>
      }
    </app-page-state>
  `,
})
export class ContabilidadReporteResumidoComponent {
  private readonly locale = inject(LocaleService);
  private readonly api = inject(DirectoryApiService);

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Contabilidad' }, { label: 'Reporte resumido' }];
  protected readonly from = signal(this.locale.monthStartYmd());
  protected readonly to = signal(this.locale.todayYmd());

  protected readonly reportQuery = injectQuery(() => ({
    queryKey: ['cash-flow', 'contabilidad', this.from(), this.to()] as const,
    queryFn: () => firstValueFrom(this.api.getCashFlow(this.from(), this.to())),
  }));

  protected reportError() {
    const err = this.reportQuery.error();
    return err ? httpErrorMessage(err, 'No se pudo cargar el reporte') : null;
  }
}
