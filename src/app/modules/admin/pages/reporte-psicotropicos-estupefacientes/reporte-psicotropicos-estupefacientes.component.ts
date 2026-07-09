import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { DirectoryApiService } from '../../services/directory-api.service';

type Tab = 'ledger' | 'monthly';

@Component({
  selector: 'app-reporte-psicotropicos-estupefacientes',
  standalone: true,
  imports: [
    QueryPageStatePipe,
    CommonModule,
    DatePipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    ButtonComponent,
    InputFieldComponent,
  ],
  templateUrl: './reporte-psicotropicos-estupefacientes.component.html',
})
export class ReportePsicotropicosEstupefacientesComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);

  protected readonly breadcrumb: BreadcrumbSegment[] = [
    { label: 'Fármacos' },
    { label: 'Psicotrópicos y estupefacientes' },
  ];

  protected readonly activeTab = signal<Tab>('ledger');
  protected readonly dateFrom = signal('');
  protected readonly dateTo = signal('');
  protected readonly reportYear = signal(new Date().getFullYear());
  protected readonly reportMonth = signal(new Date().getMonth() + 1);
  protected readonly exporting = signal(false);
  protected readonly helpOpen = signal(false);

  protected readonly ledgerQuery = injectQuery(() => ({
    queryKey: ['pharma', 'controlled-ledger', this.dateFrom(), this.dateTo()] as const,
    enabled: this.activeTab() === 'ledger',
    queryFn: () =>
      firstValueFrom(
        this.api.getControlledLedger({
          from: this.dateFrom() || undefined,
          to: this.dateTo() || undefined,
        }),
      ),
  }));

  protected readonly monthlyQuery = injectQuery(() => ({
    queryKey: ['pharma', 'controlled-monthly', this.reportYear(), this.reportMonth()] as const,
    enabled: this.activeTab() === 'monthly',
    queryFn: () =>
      firstValueFrom(this.api.getControlledMonthlyReport(this.reportYear(), this.reportMonth())),
  }));

  protected readonly ledgerRows = computed(() => this.ledgerQuery.data() ?? []);
  protected readonly monthlySummary = computed(() => this.monthlyQuery.data()?.summary ?? []);

  protected setTab(tab: Tab) {
    this.activeTab.set(tab);
  }

  protected onReportYearChange(value: string | number) {
    const parsed = Number(value);
    this.reportYear.set(Number.isFinite(parsed) && parsed > 0 ? parsed : new Date().getFullYear());
  }

  protected onReportMonthChange(value: string | number) {
    const parsed = Number(value);
    this.reportMonth.set(Number.isFinite(parsed) && parsed >= 1 && parsed <= 12 ? parsed : 1);
  }

  protected async exportLedger() {
    this.exporting.set(true);
    try {
      const blob = await firstValueFrom(
        this.api.exportControlledLedger(this.dateFrom() || undefined, this.dateTo() || undefined),
      );
      this.downloadBlob(blob, 'libro-controlados-digemid.xlsx');
      this.notify.success('Exportación generada');
    } catch (err) {
      this.notify.error(httpErrorMessage(err, 'No se pudo exportar el libro'));
    } finally {
      this.exporting.set(false);
    }
  }

  private downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
