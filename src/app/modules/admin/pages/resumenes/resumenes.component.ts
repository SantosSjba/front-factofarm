import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { LocaleService } from '../../../../core/services/locale.service';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { KpiTileComponent } from '../../../../shared/components/common/dashboard/kpi-tile.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { StatusBadgeComponent } from '../../../../shared/components/ui/badge/status-badge.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { DirectoryApiService } from '../../services/directory-api.service';
import { documentNumber, sunatStatusLabel, sunatStatusTone } from '../../utils/sale-labels';

/** Resumen diario de boletas (RC): se envía por día y queda en la bandeja de comprobantes. */
@Component({
  selector: 'app-resumenes',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    RouterLink,
    AppDatePipe,
    QueryPageStatePipe,
    BreadcrumbInlineComponent,
    ButtonComponent,
    ComponentCardComponent,
    HasPermissionDirective,
    HelpPanelComponent,
    InputFieldComponent,
    KpiTileComponent,
    ModalComponent,
    PageToolbarComponent,
    PaginationComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './resumenes.component.html',
})
export class ResumenesComponent {
  private readonly locale = inject(LocaleService);
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Ventas' }, { label: 'Resúmenes' }];
  protected readonly number = documentNumber;
  protected readonly sunatLabel = sunatStatusLabel;
  protected readonly sunatTone = sunatStatusTone;
  protected readonly today = this.locale.todayYmd();
  protected readonly fecha = signal(this.locale.todayYmd());
  protected readonly fechaError = signal('');
  protected readonly confirmOpen = signal(false);
  protected readonly page = signal(1);
  protected readonly pageSize = 10;

  protected readonly configQuery = injectQuery(() => ({
    queryKey: ['billing', 'config'] as const,
    queryFn: () => firstValueFrom(this.api.getBillingConfig()),
  }));
  protected readonly blockedMessage = computed(() => {
    const cfg = this.configQuery.data();
    if (!cfg) return null;
    if ((cfg.provider ?? 'MOCK') === 'MOCK') return 'No hay proveedor de facturación configurado: sin boletas electrónicas no hay resumen que enviar.';
    if (cfg.capabilities && !cfg.capabilities.supportsDailySummary) {
      return cfg.capabilities.notes.join(' ') || 'Tu proveedor de facturación no permite enviar el resumen diario desde FactoFarm.';
    }
    return null;
  });

  /** Boletas del día elegido, por estado, para saber qué entra en el resumen. */
  private boletas(status?: 'ACEPTADO' | 'PENDIENTE' | 'RECHAZADO') {
    return injectQuery(() => ({
      queryKey: ['billing', 'documents', 'boletas-dia', this.fecha(), status ?? 'all'] as const,
      enabled: !!this.fecha(),
      queryFn: () =>
        firstValueFrom(
          this.api.listElectronicDocuments({ page: 1, pageSize: 1, documentType: 'BOLETA', from: this.fecha(), to: this.fecha(), sunatStatus: status }),
        ),
    }));
  }
  protected readonly boletasDia = this.boletas();
  protected readonly boletasAceptadas = this.boletas('ACEPTADO');
  protected readonly boletasPendientes = this.boletas('PENDIENTE');
  protected readonly boletasRechazadas = this.boletas('RECHAZADO');

  protected readonly historyQuery = injectQuery(() => ({
    queryKey: ['billing', 'documents', 'resumenes', this.page()] as const,
    queryFn: () => firstValueFrom(this.api.listElectronicDocuments({ page: this.page(), pageSize: this.pageSize, documentType: 'RESUMEN_BOLETAS' })),
  }));
  protected readonly history = computed(() => this.historyQuery.data()?.items ?? []);
  protected readonly historyTotal = computed(() => this.historyQuery.data()?.total ?? 0);

  protected readonly summaryMutation = injectMutation(() => ({
    mutationFn: (fecha: string) => firstValueFrom(this.api.sendDailyBillingSummary(fecha)),
    onSuccess: () => {
      this.notify.success('Resumen diario enviado a SUNAT');
      this.confirmOpen.set(false);
      void this.queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo enviar el resumen')),
  }));

  protected askSend() {
    const f = this.fecha();
    if (!f) {
      this.fechaError.set('Elige el día del resumen.');
      return;
    }
    if (f > this.today) {
      this.fechaError.set('No se puede enviar el resumen de un día que aún no termina.');
      return;
    }
    this.fechaError.set('');
    this.confirmOpen.set(true);
  }
}
