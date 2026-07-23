import { Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { NotifyService } from '../../../../core/services/notify.service';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import { LocaleService } from '../../../../core/services/locale.service';

@Component({
  selector: 'app-contabilidad-exportar-reporte',
  standalone: true,
  imports: [BreadcrumbInlineComponent, ComponentCardComponent, ButtonComponent, InputFieldComponent],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Contabilidad' }, { label: 'Exportar reporte' }]" />
    <app-component-card title="Exportación contable (Contasis / SISCONT / Excel)" className="mt-4">
      <div class="mb-4 flex flex-wrap items-end gap-4">
        <app-input-field type="date" [value]="from()" (valueChange)="from.set('' + $event)" />
        <app-input-field type="date" [value]="to()" (valueChange)="to.set('' + $event)" />
      </div>
      <div class="flex flex-wrap gap-3">
        <app-button variant="outline" [disabled]="exporting()" (btnClick)="export('contasis')">Contasis</app-button>
        <app-button variant="outline" [disabled]="exporting()" (btnClick)="export('siscont')">SISCONT</app-button>
        <app-button variant="outline" [disabled]="exporting()" (btnClick)="export('excel')">Excel (CSV)</app-button>
      </div>
      <p class="mt-4 text-sm text-gray-500">
        Exporta ventas y compras del periodo en formato tabular para importar en su sistema contable.
      </p>
    </app-component-card>
  `,
})
export class ContabilidadExportarReporteComponent {
  private readonly locale = inject(LocaleService);
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);

  protected readonly from = signal(this.locale.monthStartYmd());
  protected readonly to = signal(this.locale.todayYmd());
  protected readonly exporting = signal(false);

  protected async export(format: 'contasis' | 'siscont' | 'excel') {
    this.exporting.set(true);
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
