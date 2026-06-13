import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { DirectoryApiService } from '../../services/directory-api.service';

@Component({
  selector: 'app-sire-ventas',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    PageStateComponent,
    InputFieldComponent,
    ButtonComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Contabilidad' }, { label: 'SIRE ventas' }]" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-title-sm font-semibold">SIRE — Registro de ventas</h1>
    </app-page-toolbar>
    <app-component-card className="mt-4" title="Periodo">
      <div class="flex flex-wrap items-end gap-3">
        <app-input-field placeholder="YYYY-MM" [value]="period()" (valueChange)="period.set($event + '')" />
        <app-button variant="primary" (btnClick)="summaryQuery.refetch()">Consultar</app-button>
        <app-button variant="outline" [disabled]="exporting()" (btnClick)="exportPle()">Exportar PLE 14.1</app-button>
      </div>
    </app-component-card>
    <app-page-state [loading]="summaryQuery.isPending()" [error]="summaryError()" (retry)="summaryQuery.refetch()">
      @if (summaryQuery.data(); as s) {
        <div class="mt-4 grid gap-4 md:grid-cols-4">
          <app-component-card title="Comprobantes"><p class="text-2xl font-semibold">{{ s.ventas.count }}</p></app-component-card>
          <app-component-card title="Subtotal"><p class="text-2xl font-semibold">{{ s.ventas.subtotal | currency: 'PEN' }}</p></app-component-card>
          <app-component-card title="IGV"><p class="text-2xl font-semibold">{{ s.ventas.igv | currency: 'PEN' }}</p></app-component-card>
          <app-component-card title="Total ventas"><p class="text-2xl font-semibold text-brand-600">{{ s.ventas.total | currency: 'PEN' }}</p></app-component-card>
        </div>
        @if (s.comprobantesElectronicos.length) {
          <app-component-card title="Comprobantes electrónicos" className="mt-4">
            <table class="min-w-full text-sm">
              <thead><tr class="border-b text-gray-500"><th class="py-2 text-left">Tipo</th><th class="py-2 text-right">Cantidad</th><th class="py-2 text-right">Total</th></tr></thead>
              <tbody>
                @for (row of s.comprobantesElectronicos; track row.tipo) {
                  <tr class="border-b border-gray-100"><td class="py-2">{{ row.tipo }}</td><td class="py-2 text-right">{{ row.count }}</td><td class="py-2 text-right">{{ row.total | currency: 'PEN' }}</td></tr>
                }
              </tbody>
            </table>
          </app-component-card>
        }
      }
    </app-page-state>
  `,
})
export class SireVentasComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);

  protected readonly period = signal(new Date().toISOString().slice(0, 7));
  protected readonly exporting = signal(false);

  protected readonly summaryQuery = injectQuery(() => ({
    queryKey: ['sire', 'ventas', this.period()] as const,
    queryFn: () => firstValueFrom(this.api.getAccountantSummary(this.period())),
  }));

  protected summaryError() {
    const err = this.summaryQuery.error();
    return err ? httpErrorMessage(err, 'No se pudo cargar el resumen') : null;
  }

  protected async exportPle() {
    const period = this.period().trim();
    if (!/^\d{4}-\d{2}$/.test(period)) {
      this.notify.warning('Periodo inválido');
      return;
    }
    this.exporting.set(true);
    try {
      const payload = await firstValueFrom(this.api.getPleExport('14.1', period));
      const blob = new Blob([payload.content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = payload.filename;
      a.click();
      URL.revokeObjectURL(url);
      this.notify.success(`PLE 14.1 exportado (${payload.rowCount} registros)`);
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo exportar'));
    } finally {
      this.exporting.set(false);
    }
  }
}
