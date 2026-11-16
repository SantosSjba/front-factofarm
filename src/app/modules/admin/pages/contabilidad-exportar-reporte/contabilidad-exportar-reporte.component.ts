import { Component, inject, signal, computed } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { NotifyService } from '../../../../core/services/notify.service';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import { LocaleService } from '../../../../core/services/locale.service';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';

import { PeriodFilterComponent, type Period } from '../../components/period-filter/period-filter.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';

@Component({
  selector: 'app-contabilidad-exportar-reporte',
  standalone: true,
  imports: [
    PeriodFilterComponent,
    PageToolbarComponent,
    BreadcrumbInlineComponent,
    ComponentCardComponent,
    ButtonComponent,
    HelpPanelComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Contabilidad' }, { label: 'Exportar reporte' }]" />

    <app-page-toolbar [excel]="false">
      <h1 data-toolbar-title class="text-lg font-semibold text-gray-800 dark:text-white/90">Exportar reporte contable</h1>
    </app-page-toolbar>

    <app-help-panel title="¿Para qué sirve esta pantalla?" storageKey="contabilidad-exportar-reporte">
      <ol class="list-decimal space-y-1 ps-5 text-sm text-gray-500 dark:text-gray-400">
        <li>Descarga las ventas y compras del periodo en el formato que usa el sistema contable de tu contador.</li>
        <li>Elige el periodo y pulsa el formato: Contasis, SISCONT o Excel.</li>
      </ol>
    </app-help-panel>

    <app-period-filter compact [value]="period()" (periodChange)="from.set($event.from); to.set($event.to)" />

    <app-component-card compact icon="mdi:file-export-outline" title="Elige el formato" desc="Ventas y compras del periodo, listas para importar.">
      <div class="grid gap-2 sm:grid-cols-3">
        @for (f of formats; track f.id) {
          <div class="flex flex-col gap-2 rounded-xl border border-gray-200 p-3 dark:border-gray-800">
            <p class="text-sm font-medium text-gray-800 dark:text-white/90">{{ f.label }}</p>
            <p class="text-theme-xs text-gray-500 dark:text-gray-400">{{ f.desc }}</p>
            <app-button size="sm" variant="outline" className="mt-auto w-full" [startIconName]="f.icon" [disabled]="!!exporting()" [loading]="exporting() === f.id" (btnClick)="export(f.id)">Descargar</app-button>
          </div>
        }
      </div>
    </app-component-card>
  `,
})
export class ContabilidadExportarReporteComponent {
  private readonly locale = inject(LocaleService);
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);

  protected readonly from = signal(this.locale.monthStartYmd());
  protected readonly to = signal(this.locale.todayYmd());
  protected readonly exporting = signal<false | 'contasis' | 'siscont' | 'excel'>(false);
  protected readonly period = computed<Period>(() => ({ from: this.from(), to: this.to() }));
  protected readonly formats = [
    { id: 'contasis' as const, label: 'Contasis', desc: 'Archivo para importar en Contasis.', icon: 'mdi:file-export-outline' },
    { id: 'siscont' as const, label: 'SISCONT', desc: 'Archivo para importar en SISCONT.', icon: 'mdi:file-export-outline' },
    { id: 'excel' as const, label: 'Excel (CSV)', desc: 'Para revisar o importar en otro sistema.', icon: 'mdi:microsoft-excel' },
  ];

  protected async export(format: 'contasis' | 'siscont' | 'excel') {
    this.exporting.set(format);
    try {
      const payload = await firstValueFrom(this.api.getAccountingExport(this.from(), this.to(), format));
      const blob = new Blob([payload.content], { type: payload.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = payload.filename;
      a.click();
      URL.revokeObjectURL(url);
      this.notify.success('Reporte exportado');
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo exportar'));
    } finally {
      this.exporting.set(false);
    }
  }
}
